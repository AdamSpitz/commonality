import { requestJsonCompletion, type RequestJsonCompletionFn } from '@commonality/attester-core'
import type {
  CauseAssistConfig, MediatorAnchorSuggestion, SuggestMediatorScaffoldRequest,
  SuggestMediatorScaffoldResponse,
} from './types.js'

const SYSTEM_PROMPT = `You help a cause organizer begin configuring a two-sided mediator. Infer useful, neutral names for the two constituencies and draft a few starting bridge-anchor triples from the founding statement.

This is setup assistance, not the mediator's operating strategy. Never write or suggest a strategy prompt. Do not assume conventional political left/right sides unless the founding statement explicitly calls for them.

Each anchor cluster must contain a side-a statement its named constituency could sincerely sign, a side-b statement its named constituency could sincerely sign, and concrete common ground that both statements clearly imply. Treat every result as an editable starting point.

Return JSON only: {"identity":{"name":"...","description":"..."},"labels":{"sideA":"...","sideB":"..."},"anchorClusters":[{"topicTag":"...","sideA":"...","sideB":"...","commonGround":"...","rationale":"..."}]}`

function string(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }

function normalize(value: unknown, requestedName?: string): Omit<SuggestMediatorScaffoldResponse, 'source'> {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const identity = root.identity && typeof root.identity === 'object' ? root.identity as Record<string, unknown> : {}
  const labels = root.labels && typeof root.labels === 'object' ? root.labels as Record<string, unknown> : {}
  const clusters = Array.isArray(root.anchorClusters) ? root.anchorClusters : []
  const anchorClusters: MediatorAnchorSuggestion[] = clusters.flatMap((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const cluster = {
      topicTag: string(record.topicTag), sideA: string(record.sideA), sideB: string(record.sideB),
      commonGround: string(record.commonGround), rationale: string(record.rationale),
    }
    return Object.values(cluster).every(Boolean) ? [cluster] : []
  }).slice(0, 3)
  return {
    identity: {
      name: string(identity.name) || requestedName?.trim() || 'Cause mediator',
      description: string(identity.description) || 'Suggests bridge statements for this cause.',
    },
    labels: { sideA: string(labels.sideA), sideB: string(labels.sideB) },
    anchorClusters,
  }
}

export async function suggestMediatorScaffold(
  request: SuggestMediatorScaffoldRequest,
  config: CauseAssistConfig,
  requestFn: RequestJsonCompletionFn = requestJsonCompletion,
): Promise<SuggestMediatorScaffoldResponse> {
  if (!config.apiKey) return { ...normalize({}, request.name), source: 'fallback' }
  try {
    const result = await requestFn({
      apiKey: config.apiKey, baseUrl: config.apiBaseUrl, model: config.suggestModel,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: JSON.stringify({ foundingStatement: request.foundingStatement, requestedName: request.name ?? null }),
      temperature: 0.35, maxTokens: 1800,
    })
    return { ...normalize(result, request.name), source: 'llm' }
  } catch (error) {
    console.error('Mediator scaffold assistant failed, using blank fallback:', error)
    return { ...normalize({}, request.name), source: 'fallback' }
  }
}
