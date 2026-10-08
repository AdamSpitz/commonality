export interface StatementSuggestion {
  text: string
  rationale: string
  role?: string
  implication?: {
    implies: boolean
    confidence: 'high' | 'medium' | 'low'
    reasoning: string
    keyDifference?: string
  }
}

export interface SuggestStatementsResponse {
  suggestions: StatementSuggestion[]
  source: 'llm' | 'fallback'
}

export interface SharpenPlankResponse {
  plank: string
  rationale: string
  warnings?: string[]
  source: 'llm' | 'fallback'
}

export interface ImplicationPairResult {
  supportingStatement: string
  implies: boolean
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  keyDifference?: string
  source: 'llm' | 'heuristic'
}

export interface CheckImplicationsResponse {
  results: ImplicationPairResult[]
  source: 'llm' | 'heuristic' | 'mixed'
}

export type SafetyCategory =
  | 'ok'
  | 'illegal_activity'
  | 'sanctions_or_terror'
  | 'fraud_or_scam'
  | 'hate_or_harassment'
  | 'doxxing_or_pii'
  | 'political_campaign_funding'
  | 'misrepresentation'
  | 'other_policy'

export interface SafetyVerdict {
  text: string
  fieldLabel?: string
  allowed: boolean
  category: SafetyCategory
  explanation: string
}

export interface SafetyCheckResponse {
  results: SafetyVerdict[]
  source: 'llm' | 'heuristic' | 'mixed'
}

function assistBaseUrl(): string {
  const configured = import.meta.env.VITE_CAUSE_ASSIST_URL as string | undefined
  if (configured?.trim()) return configured.replace(/\/$/, '')
  return '/api/cause-assist'
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${assistBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      'Could not reach cause-assist. For local Vite, start it with: docker compose up -d cause-assist',
    )
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string; error?: string }
    const serverMessage = err.message || err.error
    if (serverMessage) throw new Error(serverMessage)
    if (response.status === 500 || response.status === 502 || response.status === 503) {
      throw new Error(
        `Cause-assist is unavailable (${response.status}). Is it running on port 3002? `
        + 'Try: docker compose up -d cause-assist',
      )
    }
    throw new Error(`Cause assist request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

/** Suggest belief statements that support a goal. */
export async function suggestBeliefs(input: {
  goal: string
  existingStatements?: string[]
  count?: number
}): Promise<SuggestStatementsResponse> {
  return postJson<SuggestStatementsResponse>('/suggest-statements', input)
}

export async function sharpenStatement(input: {
  plank: string
  causeDescription?: string
}): Promise<SharpenPlankResponse> {
  return postJson<SharpenPlankResponse>('/sharpen-plank', input)
}

export async function checkSafety(items: Array<{ text: string; fieldLabel?: string }>): Promise<SafetyCheckResponse> {
  return postJson<SafetyCheckResponse>('/safety-check', { items })
}

/** Check whether beliefs reasonably support the goal (Issue #116: non-sequiturs allowed but flagged). */
export async function checkBeliefsSupportGoal(input: {
  mainStatement: string
  supportingStatements: string[]
}): Promise<CheckImplicationsResponse> {
  return postJson<CheckImplicationsResponse>('/check-implications', input)
}
