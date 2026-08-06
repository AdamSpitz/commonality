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

const SUGGEST_SYSTEM = `You help people start a public-goods cause by drafting short supporting statements.

Context (Commonality / CauseStarter):
- A statement is a plain-English belief or commitment that people can publicly stand behind.
- Statements are public and permanent. Prefer first-person plural or clear collective commitments.
- Supporting statements should explain the goal, its drivers (why it matters), principles, beneficiaries, or concrete next steps — not marketing fluff.
- Do NOT invent illegal, fraudulent, hateful, doxxing, sanctions-evading, or election-campaign-fundraising content.
- Do NOT include personal contact details, street addresses, SSNs, or private phone numbers.
- Prefer 1–2 sentences per statement, concrete and signable.
- Aim for diversity across roles: principle, problem, beneficiary, driver, commitment.

Return JSON only:
{
  "suggestions": [
    { "text": "...", "rationale": "...", "role": "principle|problem|beneficiary|driver|commitment|other" }
  ]
}`

function clampCount(count: number | undefined): number {
  if (count == null || Number.isNaN(count)) return 4
  return Math.min(5, Math.max(1, Math.floor(count)))
}

function fallbackSuggestions(goal: string, count: number, existing: string[]): StatementSuggestion[] {
  const g = goal.trim() || 'this public-goods goal'
  const pool: StatementSuggestion[] = [
    {
      text: `We believe ${g.replace(/\.$/, '').toLowerCase()} is worth coordinated public support, not just private goodwill.`,
      rationale: 'Names the goal as a shared public commitment.',
      role: 'commitment',
    },
    {
      text: 'People closest to the problem should help define what success looks like and how progress is measured.',
      rationale: 'Centers those affected as co-owners of the standard of success.',
      role: 'principle',
    },
    {
      text: 'Transparent funding and public results build trust faster than vague promises.',
      rationale: 'Explains why open accounting is part of the cause design.',
      role: 'driver',
    },
    {
      text: 'Volunteers, donors, and collaborators each play different roles — the cause should make room for all three.',
      rationale: 'Separates enrollment paths without requiring everyone to do everything.',
      role: 'principle',
    },
    {
      text: 'Small visible wins early keep momentum while longer-term work continues.',
      rationale: 'Links near-term delivery to sustained support.',
      role: 'driver',
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
        goal,
        existingStatements: existing,
        desiredCount: count,
        guidance: 'Generate statements that help explain the goal and its drivers. Avoid duplicating existingStatements.',
      }),
      temperature: 0.5,
      maxTokens: 1200,
    }

    const result = await requestJsonCompletionFn<{ suggestions?: StatementSuggestion[] }>(llmRequest)

    const suggestions = (result.suggestions ?? [])
      .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 0)
      .map((s) => ({
        text: s.text.trim(),
        rationale: typeof s.rationale === 'string' ? s.rationale.trim() : '',
        role: typeof s.role === 'string' ? s.role : undefined,
      }))
      .slice(0, 5)

    if (suggestions.length === 0) {
      return {
        suggestions: fallbackSuggestions(goal, count, existing),
        source: 'fallback',
      }
    }

    return { suggestions, source: 'llm' }
  } catch (error) {
    console.error('Statement suggester LLM failed, using fallback:', error)
    return {
      suggestions: fallbackSuggestions(goal, count, existing),
      source: 'fallback',
    }
  }
}
