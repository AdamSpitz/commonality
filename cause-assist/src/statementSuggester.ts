import {
  requestJsonCompletion,
  type LlmJsonRequest,
  type RequestJsonCompletionFn,
} from '@commonality/attester-core'
import type {
  CauseAssistConfig,
  StatementSuggestion,
  SuggestStatementsRequest,
  SuggestStatementsResponse,
} from './types.js'
import { STATEMENT_QUALITY_GUIDANCE } from './statementGuidance.js'
import { checkImplications } from './implicationCheck.js'

const SUGGEST_SYSTEM = `You help people start a public-goods cause by drafting short supporting statements that the main statement already implies.

${STATEMENT_QUALITY_GUIDANCE}

Your job:
- Given a main statement (the cause's founding claim), propose supporting statements that a signer of the main statement is already committed to.
- Every suggestion must pass the Implication Attester bar: main (S1) → supporting (S2).
- Prefer strict subsets, clarifications/rephrasings with the same framing, and safe generalizations already licensed by the main wording.
- Do NOT invent new drivers, principles, beneficiaries, commitments, or next steps unless they are already explicit in the main statement.
- Prefer 1–2 concrete sentences. Diversity of wording is fine; diversity of *new claims* is not.

Return JSON only:
{
  "suggestions": [
    { "text": "...", "rationale": "How the main statement already implies this (name the rule: subset, rephrase, generalization, …).", "role": "subset|rephrase|generalization|clarification|other" }
  ]
}`

function clampCount(count: number | undefined): number {
  if (count == null || Number.isNaN(count)) return 4
  return Math.min(5, Math.max(1, Math.floor(count)))
}

/**
 * Fallback templates only when no LLM is configured.
 * These stay deliberately conservative: rephrase / subset shapes of the main claim.
 */
function fallbackSuggestions(goal: string, count: number, existing: string[]): StatementSuggestion[] {
  const g = goal.trim().replace(/\.$/, '')
  if (!g) return []

  const pool: StatementSuggestion[] = [
    {
      text: `${g}.`,
      rationale: 'Same claim as the main statement (identity / rephrase baseline).',
      role: 'rephrase',
    },
    {
      text: `I believe that ${g.charAt(0).toLowerCase()}${g.slice(1)}.`,
      rationale: 'First-person rephrasing of the same claim without adding scope.',
      role: 'rephrase',
    },
  ]

  const existingLower = new Set(existing.map((s) => s.trim().toLowerCase()))
  return pool
    .filter((s) => !existingLower.has(s.text.toLowerCase()))
    .slice(0, count)
}

export type { RequestJsonCompletionFn }

export async function suggestStatements(
  request: SuggestStatementsRequest,
  config: CauseAssistConfig,
  requestJsonCompletionFn: RequestJsonCompletionFn = requestJsonCompletion,
): Promise<SuggestStatementsResponse> {
  const goal = request.goal?.trim() ?? ''
  const count = clampCount(request.count)
  const existing = (request.existingStatements ?? []).map((s) => s.trim()).filter(Boolean)

  if (!goal) {
    return { suggestions: [], source: 'fallback' }
  }

  if (!config.apiKey) {
    return {
      suggestions: fallbackSuggestions(goal, count, existing),
      source: 'fallback',
    }
  }

  try {
    const llmRequest: LlmJsonRequest = {
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl,
      model: config.suggestModel,
      systemPrompt: SUGGEST_SYSTEM,
      userPrompt: JSON.stringify({
        mainStatement: goal,
        existingStatements: existing,
        desiredCount: count,
        guidance:
          'Generate supporting statements already implied by mainStatement. '
          + 'Avoid duplicating existingStatements. If the main statement is too thin to entail any non-identical support, return fewer items rather than inventing new claims.',
      }),
      temperature: 0.4,
      maxTokens: 1200,
    }

    const result = await requestJsonCompletionFn<{ suggestions?: StatementSuggestion[] }>(llmRequest)

    let suggestions: StatementSuggestion[] = (result.suggestions ?? [])
      .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 0)
      .map((s) => ({
        text: s.text.trim(),
        rationale: typeof s.rationale === 'string' ? s.rationale.trim() : '',
        role: typeof s.role === 'string' ? s.role : undefined,
      }))
      .slice(0, 5)

    // Verify with the Implication Attester prompt; drop low-confidence or non-implying items.
    if (suggestions.length > 0) {
      const check = await checkImplications(
        {
          mainStatement: goal,
          supportingStatements: suggestions.map((s) => s.text),
        },
        config,
        requestJsonCompletionFn,
      )
      const byText = new Map(check.results.map((r) => [r.supportingStatement.trim(), r]))
      suggestions = suggestions
        .map((s): StatementSuggestion => {
          const verdict = byText.get(s.text.trim())
          if (!verdict) return s
          return {
            ...s,
            implication: {
              implies: verdict.implies,
              confidence: verdict.confidence,
              reasoning: verdict.reasoning,
              keyDifference: verdict.keyDifference,
            },
          }
        })
        .filter((s) => {
          const v = s.implication
          if (!v) return true
          // Keep only pairs the attester would accept at medium/high confidence.
          return v.implies && v.confidence !== 'low'
        })
    }

    if (suggestions.length === 0) {
      return {
        suggestions: fallbackSuggestions(goal, count, existing),
        source: 'fallback',
      }
    }

    return { suggestions: suggestions.slice(0, count), source: 'llm' }
  } catch (error) {
    console.error('Statement suggester LLM failed, using fallback:', error)
    return {
      suggestions: fallbackSuggestions(goal, count, existing),
      source: 'fallback',
    }
  }
}
