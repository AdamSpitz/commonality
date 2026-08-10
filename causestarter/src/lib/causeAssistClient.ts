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

export interface PlankSuggestion {
  text: string
  rationale: string
}

export interface AtomizeResponse {
  planks: PlankSuggestion[]
  source: 'llm' | 'fallback'
}

export interface SharpenPlankResponse {
  plank: string
  rationale: string
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

export async function atomizeCause(input: {
  description: string
  existingPlanks?: string[]
  count?: number
}): Promise<AtomizeResponse> {
  return postJson<AtomizeResponse>('/atomize', input)
}

export async function sharpenPlank(input: {
  plank: string
  causeDescription?: string
}): Promise<SharpenPlankResponse> {
  return postJson<SharpenPlankResponse>('/sharpen-plank', input)
}

export async function checkSafety(items: Array<{ text: string; fieldLabel?: string }>): Promise<SafetyCheckResponse> {
  return postJson<SafetyCheckResponse>('/safety-check', { items })
}

export async function checkImplications(input: {
  mainStatement: string
  supportingStatements: string[]
}): Promise<CheckImplicationsResponse> {
  return postJson<CheckImplicationsResponse>('/check-implications', input)
}

export interface CoherenceVerdict {
  coherent: boolean
  reasoning: string
  attesterId: string
  rosterCid: string
  source: 'llm' | 'heuristic'
}

/** Construction-only roster check (separate prompt/config from generation). */
export async function checkCoherence(input: {
  rosterCid: string
  title: string
  summary: string
  planks: string[]
  mediatorBlurb?: string
}): Promise<CoherenceVerdict> {
  return postJson<CoherenceVerdict>('/check-coherence', input)
}
