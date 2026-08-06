export interface SuggestStatementsRequest {
  goal: string
  existingStatements?: string[]
  count?: number
}

export interface StatementSuggestion {
  text: string
  /** Short plain-language reason this statement helps explain the goal. */
  rationale: string
  /** Optional role: goal-driver, principle, obstacle, beneficiary, etc. */
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

export interface CauseAssistConfig {
  /** xAI / Grok API key (or compatible provider). */
  apiKey?: string
  /** OpenAI-compatible base URL, e.g. https://api.x.ai/v1 */
  apiBaseUrl: string
  suggestModel: string
  safetyModel: string
  port: number
}
