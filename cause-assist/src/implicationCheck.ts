import {
  requestJsonCompletion,
  type LlmJsonRequest,
  type RequestJsonCompletionFn,
} from '@commonality/attester-core'
import { IMPLICATION_EVALUATOR_SYSTEM_PROMPT } from '@commonality/implication-attester/api'
import type {
  CauseAssistConfig,
  CheckImplicationsRequest,
  CheckImplicationsResponse,
  ImplicationPairResult,
} from './types.js'

const STATIC_USER =
  'You will receive S1 and S2 in the next user message. Apply the system rules exactly and respond only with the required JSON object.'

function buildUserPrompt(s1: string, s2: string): string {
  return `Evaluate whether S1 implies S2, applying the rules and examples in your instructions.

S1 (main statement):
"""
${s1}
"""

S2 (supporting statement):
"""
${s2}
"""

Respond with the JSON object specified in your instructions. Nothing else.`
}

function normalizeConfidence(confidence: unknown): 'high' | 'medium' | 'low' {
  if (typeof confidence === 'number') {
    if (confidence >= 0.8) return 'high'
    if (confidence >= 0.5) return 'medium'
    return 'low'
  }
  const normalized = String(confidence ?? '').toLowerCase().trim()
  if (['high', 'strong', 'certain', 'definite'].includes(normalized)) return 'high'
  if (['medium', 'moderate', 'somewhat', 'partial'].includes(normalized)) return 'medium'
  return 'low'
}

function heuristicPair(main: string, supporting: string): ImplicationPairResult {
  const s1 = main.trim()
  const s2 = supporting.trim()
  if (!s2) {
    return {
      supportingStatement: supporting,
      implies: false,
      confidence: 'high',
      reasoning: 'Empty supporting statement cannot be implied.',
      keyDifference: 'Empty S2',
      source: 'heuristic',
    }
  }
  if (s1.toLowerCase() === s2.toLowerCase()) {
    return {
      supportingStatement: supporting,
      implies: true,
      confidence: 'high',
      reasoning: 'Identical wording — same claim.',
      source: 'heuristic',
    }
  }
  // Without an LLM we cannot reliably judge implication; do not pretend.
  return {
    supportingStatement: supporting,
    implies: true,
    confidence: 'low',
    reasoning:
      'Implication was not LLM-checked (no API key). Review manually: the main statement must already entail this claim with no new policy, framing, or scope.',
    source: 'heuristic',
  }
}

async function evaluatePair(
  main: string,
  supporting: string,
  config: CauseAssistConfig,
  requestJsonCompletionFn: RequestJsonCompletionFn,
): Promise<ImplicationPairResult> {
  if (!config.apiKey) {
    return heuristicPair(main, supporting)
  }

  try {
    const llmRequest: LlmJsonRequest = {
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl,
      model: config.implicationModel,
      systemPrompt: IMPLICATION_EVALUATOR_SYSTEM_PROMPT,
      staticUserPrompt: STATIC_USER,
      userPrompt: buildUserPrompt(main, supporting),
      temperature: 0,
      maxTokens: 800,
      title: 'CauseAssist Implication Check',
      openRouterHeaders: false,
    }

    const result = await requestJsonCompletionFn<{
      implies?: boolean | string
      confidence?: string | number
      reasoning?: string
      explanation?: string
      key_difference?: string
    }>(llmRequest)

    const implies = result.implies === true || result.implies === 'true'
    return {
      supportingStatement: supporting,
      implies,
      confidence: normalizeConfidence(result.confidence),
      reasoning:
        (typeof result.reasoning === 'string' && result.reasoning)
        || (typeof result.explanation === 'string' && result.explanation)
        || 'No reasoning provided',
      keyDifference:
        typeof result.key_difference === 'string' && result.key_difference.trim()
          ? result.key_difference.trim()
          : undefined,
      source: 'llm',
    }
  } catch (error) {
    console.error('Implication check LLM failed, using heuristic:', error)
    return {
      ...heuristicPair(main, supporting),
      reasoning:
        'Implication check failed; could not verify with the attester prompt. Review manually that the main statement entails this claim.',
      confidence: 'low',
      source: 'heuristic',
    }
  }
}

/**
 * Check whether the main statement implies each supporting statement,
 * using the same system prompt as the on-chain Implication Attester.
 */
export async function checkImplications(
  request: CheckImplicationsRequest,
  config: CauseAssistConfig,
  requestJsonCompletionFn: RequestJsonCompletionFn = requestJsonCompletion,
): Promise<CheckImplicationsResponse> {
  const main = request.mainStatement?.trim() ?? ''
  const supporting = (request.supportingStatements ?? [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)

  if (!main) {
    return { results: [], source: 'heuristic' }
  }
  if (supporting.length === 0) {
    return { results: [], source: 'heuristic' }
  }

  const results: ImplicationPairResult[] = []
  for (const s of supporting) {
    results.push(await evaluatePair(main, s, config, requestJsonCompletionFn))
  }

  const sources = new Set(results.map((r) => r.source))
  const source: CheckImplicationsResponse['source'] =
    sources.size === 1
      ? (sources.has('llm') ? 'llm' : 'heuristic')
      : 'mixed'

  return { results, source }
}
