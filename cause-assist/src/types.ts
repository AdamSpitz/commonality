export interface SuggestStatementsRequest {
  /** Main / founding statement for the cause. */
  goal: string
  existingStatements?: string[]
  count?: number
}

export interface StatementSuggestion {
  text: string
  /** Why this is already implied by the main statement (or how it helps). */
  rationale: string
  /** Optional role: subset, rephrase, generalization, clarification, other. */
  role?: string
  /** Optional implication check vs the main statement (when verified). */
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

export interface AtomizeRequest { description: string; existingPlanks?: string[]; count?: number }
export interface PlankDraft { text: string; rationale: string }
export interface AtomizeResponse { planks: PlankDraft[]; source: 'llm' | 'fallback' }

export interface SharpenPlankRequest { plank: string; causeDescription?: string }
export interface SharpenPlankResponse {
  plank: string
  rationale: string
  warnings: string[]
  source: 'llm' | 'fallback'
}

export interface DraftAnchorRequest { planks: string[] }
export interface DraftAnchorResponse {
  anchor: string
  disjuncts: string[]
  implicationChecks: Array<{ mainStatement: string; supportingStatements: string[] }>
}

export interface SuggestMediatorScaffoldRequest { foundingStatement: string; name?: string }
export interface MediatorAnchorSuggestion {
  topicTag: string
  sideA: string
  sideB: string
  commonGround: string
  rationale: string
}
export interface SuggestMediatorScaffoldResponse {
  identity: { name: string; description: string }
  labels: { sideA: string; sideB: string }
  anchorClusters: MediatorAnchorSuggestion[]
  source: 'llm' | 'fallback'
}

export interface CheckImplicationsRequest {
  mainStatement: string
  supportingStatements: string[]
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

export interface SafetyCheckItem {
  text: string
  fieldLabel?: string
}

export interface SafetyCheckRequest {
  items: SafetyCheckItem[]
}

export interface SafetyVerdict {
  text: string
  fieldLabel?: string
  allowed: boolean
  category: SafetyCategory
  /** User-facing explanation shown in the rejection popup. */
  explanation: string
}

export interface SafetyCheckResponse {
  results: SafetyVerdict[]
  source: 'llm' | 'heuristic' | 'mixed'
}

export interface CoherenceCheckRequest {
  rosterCid: string
  title: string
  summary: string
  planks: string[]
  mediatorBlurb?: string
}

export interface CoherenceVerdict {
  coherent: boolean
  reasoning: string
  attesterId: string
  rosterCid: string
  source: 'llm' | 'heuristic'
}

export interface CauseAssistConfig {
  /** xAI / Grok API key (or compatible provider). */
  apiKey?: string
  /** OpenAI-compatible base URL, e.g. https://api.x.ai/v1 */
  apiBaseUrl: string
  suggestModel: string
  safetyModel: string
  /** Model used for main→supporting implication checks (same prompt as implication attester). */
  implicationModel: string
  /**
   * Model for roster coherence (construction only). Separate config slot from
   * generation so the same call path never silently reuses atomize/sharpen's model
   * unless the operator sets them equal on purpose.
   */
  coherenceModel: string
  port: number
  /**
   * Operator Ethereum private key for on-chain coherence badges.
   * When set (with RPC + AlignmentAttestations address), cause-assist is msg.sender
   * on positive-only attestations — never the founder.
   */
  ethereumPrivateKey?: string
  ethereumRpcUrl?: string
  alignmentAttestationsContractAddress?: string
}
