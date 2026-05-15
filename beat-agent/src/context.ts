import type { BeatAgentEvaluationContext, BeatAgentLocalContextCitation } from './types.js';
import { retrieveRelevantObservations } from './memory.js';
import type { BeatMemoryObservation } from './memory.js';

interface PlatformContentItemLike {
  canonicalId?: string;
  contentCanonicalId?: string;
  relationship?: string;
  text?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  url?: string;
  createdAt?: string;
}

interface LocalContentContextLike {
  parentPosts?: PlatformContentItemLike[];
  quotedPosts?: PlatformContentItemLike[];
  thread?: PlatformContentItemLike[];
  replies?: PlatformContentItemLike[];
  authorRecentPosts?: PlatformContentItemLike[];
}

export interface BuildBeatAgentEvaluationContextParams {
  beatId: string;
  contentCanonicalId: string;
  contentText: string;
  contentUrl?: string;
  memoryFilePath?: string;
  platformApiUrl?: string;
  now?: Date;
  fetch?: typeof fetch;
}

export async function buildBeatAgentEvaluationContext(
  params: BuildBeatAgentEvaluationContextParams,
): Promise<BeatAgentEvaluationContext> {
  const [localContextUsed, relevantObservations] = await Promise.all([
    fetchLocalContextCitations(params),
    params.memoryFilePath
      ? retrieveRelevantObservations({
        beatId: params.beatId,
        memoryFilePath: params.memoryFilePath,
        queryText: params.contentText,
        contentCanonicalId: params.contentCanonicalId,
        now: params.now,
      })
      : Promise.resolve([]),
  ]);

  return {
    localContextUsed,
    ambientContextUsed: relevantObservations.map(observationToAmbientCitation),
  };
}

async function fetchLocalContextCitations(
  params: BuildBeatAgentEvaluationContextParams,
): Promise<BeatAgentLocalContextCitation[]> {
  if (!params.platformApiUrl || !params.contentUrl) {
    return [];
  }

  const fetchImpl = params.fetch ?? fetch;
  const response = await fetchImpl(`${params.platformApiUrl.replace(/\/$/, '')}/context/local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: params.contentUrl }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch local content context: ${response.status} ${response.statusText}`);
  }

  const context = await response.json() as LocalContentContextLike;
  return [
    ...(context.parentPosts ?? []).map((item) => itemToCitation('parent_post', item)),
    ...(context.quotedPosts ?? []).map((item) => itemToCitation('quote', item)),
    ...(context.thread ?? []).map((item) => itemToCitation('thread', item)),
    ...(context.replies ?? []).map((item) => itemToCitation('reply', item)),
    ...(context.authorRecentPosts ?? []).map((item) => itemToCitation('author_recent_post', item)),
  ].filter((citation): citation is BeatAgentLocalContextCitation => citation !== null);
}

function itemToCitation(
  type: BeatAgentLocalContextCitation['type'],
  item: PlatformContentItemLike,
): BeatAgentLocalContextCitation | null {
  const contentCanonicalId = item.canonicalId ?? item.contentCanonicalId;
  if (!contentCanonicalId) {
    return null;
  }

  const author = item.authorHandle ?? item.authorDisplayName;
  const prefix = author ? `${author}: ` : '';
  const text = item.text?.trim() || item.url || '(no text available)';
  return {
    type,
    contentCanonicalId,
    summary: `${prefix}${text}`.slice(0, 500),
  };
}

function observationToAmbientCitation(observation: BeatMemoryObservation) {
  const observedAt = observation.observedAtStart === observation.observedAtEnd
    ? observation.observedAtStart
    : `${observation.observedAtStart}/${observation.observedAtEnd}`;

  return {
    observation: observation.observation,
    observedAt,
    confidence: observation.confidence,
    supportingExamples: observation.supportingContentIds,
  };
}
