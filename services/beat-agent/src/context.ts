import type { BeatAgentEvaluationContext, BeatAgentLocalContextCitation } from './types.js';
import { calculateObservationDiversityMultiplier, getObservationTimeSpanHours, loadBeatContextMemoryState, retrieveRelevantObservations } from '@commonality/beat-memory';
import type { BeatMemoryObservation, BeatMemoryPurpose, BeatPurposeSummarySnapshot, ObservationDiversityOptions } from '@commonality/beat-memory';

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
  diversityOptions?: ObservationDiversityOptions;
  purposes?: BeatMemoryPurpose[];
}

export async function buildBeatAgentEvaluationContext(
  params: BuildBeatAgentEvaluationContextParams,
): Promise<BeatAgentEvaluationContext> {
  const [localContextUsed, purposeSummaries, relevantObservations] = await Promise.all([
    fetchLocalContextCitations(params),
    params.memoryFilePath ? loadLatestPurposeSummaries(params) : Promise.resolve([]),
    params.memoryFilePath
      ? retrieveRelevantObservations({
        beatId: params.beatId,
        memoryFilePath: params.memoryFilePath,
        queryText: params.contentText,
        contentCanonicalId: params.contentCanonicalId,
        now: params.now,
        diversityOptions: params.diversityOptions,
        purposes: params.purposes,
      })
      : Promise.resolve([]),
  ]);

  return {
    localContextUsed,
    ambientContextUsed: [
      ...purposeSummaries.map(snapshotToAmbientCitation),
      ...relevantObservations.map((observation) => observationToAmbientCitation(observation, params.diversityOptions)),
    ],
  };
}

async function loadLatestPurposeSummaries(
  params: BuildBeatAgentEvaluationContextParams,
): Promise<BeatPurposeSummarySnapshot[]> {
  if (!params.memoryFilePath) return [];
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const requestedPurposes = params.purposes ?? [];
  const snapshots = (state.purposeSummarySnapshots ?? [])
    .filter((snapshot) => snapshot.beatId === params.beatId)
    .filter((snapshot) => requestedPurposes.length === 0 || requestedPurposes.includes(snapshot.purpose))
    .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));
  const latestByPurpose = new Map<BeatMemoryPurpose, BeatPurposeSummarySnapshot>();
  for (const snapshot of snapshots) {
    if (!latestByPurpose.has(snapshot.purpose)) latestByPurpose.set(snapshot.purpose, snapshot);
  }
  return [...latestByPurpose.values()];
}

async function fetchLocalContextCitations(
  params: BuildBeatAgentEvaluationContextParams,
): Promise<BeatAgentLocalContextCitation[]> {
  if (!params.platformApiUrl) {
    return [];
  }

  const fetchImpl = params.fetch ?? fetch;
  const response = await fetchImpl(`${params.platformApiUrl.replace(/\/$/, '')}/context/local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params.contentUrl ? { url: params.contentUrl } : { canonicalId: params.contentCanonicalId }),
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

function snapshotToAmbientCitation(snapshot: BeatPurposeSummarySnapshot) {
  const observedAt = snapshot.observedAtStart === snapshot.observedAtEnd
    ? snapshot.observedAtStart
    : `${snapshot.observedAtStart}/${snapshot.observedAtEnd}`;
  const details = [
    snapshot.liveTopics.length ? `Live topics: ${snapshot.liveTopics.join(', ')}` : null,
    snapshot.phraseMeanings.length ? `Phrase meanings: ${snapshot.phraseMeanings.join('; ')}` : null,
    snapshot.uncertainties.length ? `Uncertainties: ${snapshot.uncertainties.join('; ')}` : null,
  ].filter(Boolean).join(' ');
  return {
    observation: `[Purpose summary: ${snapshot.purpose}] ${snapshot.summary}${details ? ` ${details}` : ''}`,
    observedAt,
    confidence: 'medium' as const,
    supportingExamples: snapshot.sourceObservationIds,
  };
}

function observationToAmbientCitation(observation: BeatMemoryObservation, diversityOptions?: ObservationDiversityOptions) {
  const observedAt = observation.observedAtStart === observation.observedAtEnd
    ? observation.observedAtStart
    : `${observation.observedAtStart}/${observation.observedAtEnd}`;

  return {
    observation: observation.observation,
    observedAt,
    confidence: observation.confidence,
    supportingExamples: observation.supportingContentIds,
    sourceAuthorCount: observation.sourceAuthors.length,
    timeSpanHours: roundTo(getObservationTimeSpanHours(observation), 1),
    diversityScore: roundTo(calculateObservationDiversityMultiplier(observation, diversityOptions), 2),
  };
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
