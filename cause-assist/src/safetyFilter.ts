import { requestJsonCompletion, type LlmJsonRequest, type RequestJsonCompletionFn } from './llmClient.js'
import { heuristicCheckAll, heuristicCheckItem } from './heuristicSafety.js'
import type {
  CauseAssistConfig,
  SafetyCategory,
  SafetyCheckRequest,
  SafetyCheckResponse,
  SafetyVerdict,
} from './types.js'

const SAFETY_SYSTEM = `You are a safety reviewer for CauseStarter, an operated public-goods coordination UI.

Apply the project's acceptable-use themes (not legal advice — operational policy):
- No money laundering, fraud, stolen instruments, or scam fundraising.
- No sanctions evasion or terrorist financing facilitation.
- No funding, soliciting, or promoting illegal projects or activities.
- No misrepresentation of affiliation, recipient identity, or use of funds.
- No hate, harassment, or calls to violence against people.
- No doxxing / unnecessary third-party personal data (emails, phones, SSNs, home addresses).
- Prefer rejecting election-period campaign contribution solicitations at launch.
- Statements and goals are public and permanent; be conservative when harm is likely.

Be careful not to reject ordinary public-goods advocacy (parks, libraries, clean water, bridge-building media, mutual aid, open source) merely because it is political in a broad sense.

Return JSON only:
{
  "results": [
    {
      "index": 0,
      "allowed": true,
      "category": "ok",
      "explanation": ""
    }
  ]
}

category must be one of:
ok, illegal_activity, sanctions_or_terror, fraud_or_scam, hate_or_harassment,
doxxing_or_pii, political_campaign_funding, misrepresentation, other_policy

When allowed is false, explanation must be plain language suitable to show the user in a popup.`

const CATEGORIES = new Set<SafetyCategory>([
  'ok',
  'illegal_activity',
  'sanctions_or_terror',
  'fraud_or_scam',
  'hate_or_harassment',
  'doxxing_or_pii',
  'political_campaign_funding',
  'misrepresentation',
  'other_policy',
])

export type { RequestJsonCompletionFn }

function normalizeCategory(value: unknown): SafetyCategory {
  if (typeof value === 'string' && CATEGORIES.has(value as SafetyCategory)) {
    return value as SafetyCategory
  }
  return 'other_policy'
}

export async function checkSafety(
  request: SafetyCheckRequest,
  config: CauseAssistConfig,
  requestJsonCompletionFn: RequestJsonCompletionFn = requestJsonCompletion,
): Promise<SafetyCheckResponse> {
  const items = (request.items ?? []).filter((item) => typeof item?.text === 'string')
  if (items.length === 0) {
    return { results: [], source: 'heuristic' }
  }

  // Always run heuristics first; fail closed on obvious hits without calling the model.
  const heuristicResults = heuristicCheckAll(items)
  const needsLlmIndexes = heuristicResults
    .map((verdict, index) => (verdict.allowed && items[index]!.text.trim() ? index : -1))
    .filter((index) => index >= 0)

  if (!config.apiKey || needsLlmIndexes.length === 0) {
    return {
      results: heuristicResults,
      source: 'heuristic',
    }
  }

  try {
    const payload = needsLlmIndexes.map((index) => ({
      index,
      fieldLabel: items[index]!.fieldLabel,
      text: items[index]!.text,
    }))

    const llmRequest: LlmJsonRequest = {
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl,
      model: config.safetyModel,
      systemPrompt: SAFETY_SYSTEM,
      userPrompt: JSON.stringify({ items: payload }),
      temperature: 0.1,
      maxTokens: 1200,
    }

    const llmResult = await requestJsonCompletionFn<{
      results?: Array<{
        index?: number
        allowed?: boolean
        category?: string
        explanation?: string
      }>
    }>(llmRequest)

    const byIndex = new Map<number, SafetyVerdict>()
    for (const row of llmResult.results ?? []) {
      if (typeof row.index !== 'number' || !items[row.index]) continue
      const allowed = row.allowed === true
      byIndex.set(row.index, {
        text: items[row.index]!.text,
        fieldLabel: items[row.index]!.fieldLabel,
        allowed,
        category: allowed ? 'ok' : normalizeCategory(row.category),
        explanation: allowed
          ? ''
          : (typeof row.explanation === 'string' && row.explanation.trim())
            || 'This text does not meet our safety policy for operated surfaces.',
      })
    }

    const results = heuristicResults.map((heuristic, index) => {
      if (!heuristic.allowed) return heuristic
      return byIndex.get(index) ?? heuristic
    })

    return { results, source: 'mixed' }
  } catch (error) {
    console.error('Safety filter LLM failed, using heuristics only:', error)
    return {
      results: items.map((item) => {
        const hit = heuristicCheckItem(item)
        if (hit) return hit
        return {
          text: item.text,
          fieldLabel: item.fieldLabel,
          allowed: true,
          category: 'ok' as const,
          explanation: '',
        }
      }),
      source: 'heuristic',
    }
  }
}
