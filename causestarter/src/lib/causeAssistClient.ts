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
  /** Example rewording — UI must not apply this without an explicit founder action. */
  plank: string
  rationale: string
  /** Concrete problems that could block attestation or public signing. */
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
  // Same-origin proxy in Vite/nginx: /api/cause-assist/*
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
    // Vite's proxy returns a bare 500 when nothing is listening on :3002.
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

export type AttestCoherenceReason =
  | 'attested'
  | 'already_attested'
  | 'not_coherent'
  | 'attester_not_configured'

export interface AttestCoherenceResult {
  attested: boolean
  reason: AttestCoherenceReason
  verdict: CoherenceVerdict
  attesterAddress?: `0x${string}`
  txHash?: `0x${string}`
}

export interface CauseAssistHealth {
  status: string
  service: string
  llmConfigured: boolean
  /** Operator address that writes on-chain coherence badges (null if unset). */
  coherenceAttesterAddress: `0x${string}` | null
  coherenceAttesterConfigured: boolean
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

/**
 * Ask the CauseStarter operator (cause-assist) to re-judge and, if coherent,
 * publish a positive-only on-chain badge. Founder wallets never write this.
 *
 * Server binds structure by recomputing the roster CID from title/summary/
 * plankCids/mediatorBlurb and loads plank *texts* by CID (ignores free-form).
 */
export async function requestCoherenceAttestation(input: {
  rosterCid: string
  title: string
  summary: string
  plankCids: string[]
  mediatorBlurb?: string
}): Promise<AttestCoherenceResult> {
  return postJson<AttestCoherenceResult>('/attest-coherence', input)
}

/** Operator attester address for viewer trust (null when service unreachable or key unset). */
export async function fetchCoherenceAttesterAddress(): Promise<`0x${string}` | null> {
  try {
    const response = await fetch(`${assistBaseUrl()}/health`)
    if (!response.ok) return null
    const body = await response.json() as Partial<CauseAssistHealth>
    const addr = body.coherenceAttesterAddress
    if (typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
      return addr.toLowerCase() as `0x${string}`
    }
    return null
  } catch {
    return null
  }
}
