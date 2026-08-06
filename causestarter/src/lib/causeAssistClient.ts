export interface StatementSuggestion {
  text: string
  rationale: string
  role?: string
}

export interface SuggestStatementsResponse {
  suggestions: StatementSuggestion[]
  source: 'llm' | 'fallback'
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
  // Same-origin proxy in Vite/nginx: /api/cause-assist/*
  return '/api/cause-assist'
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${assistBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message || `Cause assist request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function suggestStatements(input: {
  goal: string
  existingStatements?: string[]
  count?: number
}): Promise<SuggestStatementsResponse> {
  return postJson<SuggestStatementsResponse>('/suggest-statements', input)
}

export async function checkSafety(items: Array<{ text: string; fieldLabel?: string }>): Promise<SafetyCheckResponse> {
  return postJson<SafetyCheckResponse>('/safety-check', { items })
}
