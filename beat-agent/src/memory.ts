import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BeatAgentConfidence } from './types.js';
import type { BeatIngestedItem } from './ingestion.js';
import { sanitizeUntrustedText } from './promptSafety.js';

export type BeatMemoryObservationKind = 'item_observation' | 'compacted_summary';

export interface BeatMemoryObservation {
  id: string;
  beatId: string;
  kind: BeatMemoryObservationKind;
  observation: string;
  observedAtStart: string;
  observedAtEnd: string;
  confidence: BeatAgentConfidence;
  supportingContentIds: string[];
  sourceAuthors: string[];
  keywords: string[];
  createdAt: string;
  supersedesObservationIds?: string[];
}

export interface BeatContextMemoryState {
  schemaVersion: 1;
  observations: BeatMemoryObservation[];
}

export interface BeatObservationExtractor {
  extractObservations: (item: BeatIngestedItem) => Promise<ExtractedBeatObservation[]>;
}

export interface ExtractedBeatObservation {
  observation: string;
  confidence?: BeatAgentConfidence;
  observedAtStart?: string;
  observedAtEnd?: string;
  supportingContentIds?: string[];
  sourceAuthors?: string[];
  keywords?: string[];
}

export interface ExtractObservationsFromItemsParams {
  beatId: string;
  items: BeatIngestedItem[];
  memoryFilePath: string;
  extractor?: BeatObservationExtractor;
  now?: Date;
}

export interface ExtractObservationsSummary {
  itemCount: number;
  observationCount: number;
  duplicateObservationCount: number;
  failedItemCount: number;
  failedItems: ExtractObservationsFailedItem[];
}

export interface ExtractObservationsFailedItem {
  contentCanonicalId: string;
  errorMessage: string;
  errorName?: string;
}

export interface RetrieveRelevantObservationsParams {
  beatId: string;
  memoryFilePath: string;
  queryText: string;
  contentCanonicalId?: string;
  now?: Date;
  maxObservations?: number;
  diversityOptions?: ObservationDiversityOptions;
}

export interface ObservationDiversityOptions {
  minAuthorsForFullWeight?: number;
  minHoursForFullWeight?: number;
  neutralFloor?: number;
}

export interface CompactBeatMemoryParams {
  beatId: string;
  memoryFilePath: string;
  olderThan: Date;
  now?: Date;
  minObservationsToCompact?: number;
}

export interface CompactBeatMemorySummary {
  compactedObservationCount: number;
  createdSummaryCount: number;
}

const emptyMemoryState: BeatContextMemoryState = {
  schemaVersion: 1,
  observations: [],
};

const defaultExtractor: BeatObservationExtractor = {
  extractObservations: async (item) => {
    const text = normalizeWhitespace(item.text);
    if (!text) {
      return [];
    }

    return [
      {
        observation: sanitizeUntrustedText(`${item.authorHandle ? `${item.authorHandle}: ` : ''}${text}`),
        confidence: 'medium',
        observedAtStart: item.observedAt,
        observedAtEnd: item.observedAt,
        supportingContentIds: [item.contentCanonicalId],
        sourceAuthors: getItemSourceAuthors(item),
        keywords: tokenize(`${item.authorHandle ?? ''} ${text}`),
      },
    ];
  },
};

export async function loadBeatContextMemoryState(filePath: string): Promise<BeatContextMemoryState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BeatContextMemoryState>;
    return {
      schemaVersion: 1,
      observations: Array.isArray(parsed.observations) ? parsed.observations.map(normalizeLoadedObservation) : [],
    };
  } catch {
    return { ...emptyMemoryState, observations: [] };
  }
}

export async function saveBeatContextMemoryState(
  filePath: string,
  state: BeatContextMemoryState,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

export async function extractObservationsFromItems(
  params: ExtractObservationsFromItemsParams,
): Promise<ExtractObservationsSummary> {
  const nowIso = (params.now ?? new Date()).toISOString();
  const extractor = params.extractor ?? defaultExtractor;
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const knownIds = new Set(state.observations.map((observation) => observation.id));
  const summary: ExtractObservationsSummary = {
    itemCount: params.items.length,
    observationCount: 0,
    duplicateObservationCount: 0,
    failedItemCount: 0,
    failedItems: [],
  };

  for (const item of params.items) {
    let extracted: ExtractedBeatObservation[];
    try {
      extracted = await extractor.extractObservations(item);
    } catch (error) {
      summary.failedItemCount += 1;
      summary.failedItems.push({
        contentCanonicalId: item.contentCanonicalId,
        ...getExtractionErrorMetadata(error),
      });
      continue;
    }

    for (const [index, observation] of extracted.entries()) {
      const supportIds = observation.supportingContentIds?.length
        ? observation.supportingContentIds
        : [item.contentCanonicalId];
      const id = buildObservationId(params.beatId, supportIds, observation.observation, index);
      if (knownIds.has(id)) {
        summary.duplicateObservationCount += 1;
        continue;
      }

      knownIds.add(id);
      state.observations.push({
        id,
        beatId: params.beatId,
        kind: 'item_observation',
        observation: normalizeWhitespace(sanitizeUntrustedText(observation.observation)),
        observedAtStart: observation.observedAtStart ?? item.observedAt,
        observedAtEnd: observation.observedAtEnd ?? item.observedAt,
        confidence: observation.confidence ?? 'medium',
        supportingContentIds: supportIds,
        sourceAuthors: unique(observation.sourceAuthors?.length ? observation.sourceAuthors : getItemSourceAuthors(item)),
        keywords: uniqueKeywords(observation.keywords ?? tokenize(observation.observation)),
        createdAt: nowIso,
      });
      summary.observationCount += 1;
    }
  }

  await saveBeatContextMemoryState(params.memoryFilePath, state);
  return summary;
}

export async function retrieveRelevantObservations(
  params: RetrieveRelevantObservationsParams,
): Promise<BeatMemoryObservation[]> {
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const queryTokens = new Set(tokenize(params.queryText));
  const nowMs = (params.now ?? new Date()).getTime();
  const scored = state.observations
    .filter((observation) => observation.beatId === params.beatId)
    .filter((observation) => !params.contentCanonicalId || !observation.supportingContentIds.includes(params.contentCanonicalId))
    .map((observation) => ({ observation, score: scoreObservation(observation, queryTokens, nowMs, params.diversityOptions) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.observation.observedAtEnd) - Date.parse(a.observation.observedAtEnd));

  return scored.slice(0, params.maxObservations ?? 8).map(({ observation }) => observation);
}

export async function compactBeatMemory(
  params: CompactBeatMemoryParams,
): Promise<CompactBeatMemorySummary> {
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const nowIso = (params.now ?? new Date()).toISOString();
  const minObservations = params.minObservationsToCompact ?? 3;
  const olderThanMs = params.olderThan.getTime();
  const candidates = state.observations.filter(
    (observation) =>
      observation.beatId === params.beatId &&
      observation.kind === 'item_observation' &&
      Date.parse(observation.observedAtEnd) < olderThanMs,
  );

  if (candidates.length < minObservations) {
    return { compactedObservationCount: 0, createdSummaryCount: 0 };
  }

  const observedAtStart = minIso(candidates.map((observation) => observation.observedAtStart));
  const observedAtEnd = maxIso(candidates.map((observation) => observation.observedAtEnd));
  const supportingContentIds = unique(candidates.flatMap((observation) => observation.supportingContentIds));
  const sourceAuthors = unique(candidates.flatMap((observation) => observation.sourceAuthors));
  const keywords = topKeywords(candidates.flatMap((observation) => observation.keywords), 24);
  const summaryId = `summary:${params.beatId}:${observedAtStart}:${observedAtEnd}:${candidates.length}`;
  const summaryObservation: BeatMemoryObservation = {
    id: summaryId,
    beatId: params.beatId,
    kind: 'compacted_summary',
    observation: `Compacted ${candidates.length} older observations from ${observedAtStart} to ${observedAtEnd}. Recurring terms: ${keywords.join(', ')}.`,
    observedAtStart,
    observedAtEnd,
    confidence: 'medium',
    supportingContentIds,
    sourceAuthors,
    keywords,
    createdAt: nowIso,
    supersedesObservationIds: candidates.map((observation) => observation.id),
  };

  const candidateIds = new Set(candidates.map((observation) => observation.id));
  state.observations = [
    ...state.observations.filter((observation) => !candidateIds.has(observation.id)),
    summaryObservation,
  ];
  await saveBeatContextMemoryState(params.memoryFilePath, state);

  return { compactedObservationCount: candidates.length, createdSummaryCount: 1 };
}

function getExtractionErrorMetadata(error: unknown): Omit<ExtractObservationsFailedItem, 'contentCanonicalId'> {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }

  if (typeof error === 'string') {
    return { errorMessage: error };
  }

  return { errorMessage: 'Unknown observation extraction failure' };
}

function normalizeLoadedObservation(observation: Partial<BeatMemoryObservation>): BeatMemoryObservation {
  return {
    id: observation.id ?? '',
    beatId: observation.beatId ?? '',
    kind: observation.kind ?? 'item_observation',
    observation: typeof observation.observation === 'string' ? sanitizeUntrustedText(observation.observation) : '',
    observedAtStart: observation.observedAtStart ?? '',
    observedAtEnd: observation.observedAtEnd ?? '',
    confidence: observation.confidence ?? 'medium',
    supportingContentIds: Array.isArray(observation.supportingContentIds) ? observation.supportingContentIds : [],
    sourceAuthors: Array.isArray(observation.sourceAuthors) ? unique(observation.sourceAuthors) : [],
    keywords: Array.isArray(observation.keywords) ? observation.keywords : [],
    createdAt: observation.createdAt ?? '',
    supersedesObservationIds: observation.supersedesObservationIds,
  };
}

function getItemSourceAuthors(item: BeatIngestedItem): string[] {
  if (item.authorId) {
    return [item.authorId];
  }
  if (item.platform && item.authorHandle) {
    return [`${item.platform}:handle:${item.authorHandle.replace(/^@/u, '').toLowerCase()}`];
  }
  if (item.authorHandle) {
    return [`handle:${item.authorHandle.replace(/^@/u, '').toLowerCase()}`];
  }
  return [];
}

function buildObservationId(beatId: string, supportIds: string[], observation: string, index: number): string {
  return `${beatId}:${supportIds.join('|')}:${index}:${stableHash(normalizeWhitespace(observation))}`;
}

function scoreObservation(
  observation: BeatMemoryObservation,
  queryTokens: Set<string>,
  nowMs: number,
  diversityOptions?: ObservationDiversityOptions,
): number {
  if (queryTokens.size === 0) {
    return 0;
  }

  const keywordMatches = observation.keywords.filter((keyword) => queryTokens.has(keyword)).length;
  const textMatches = tokenize(observation.observation).filter((token) => queryTokens.has(token)).length;
  const directScore = keywordMatches * 3 + textMatches;
  if (directScore === 0) {
    return 0;
  }

  const recencyScore = recencyWeight(Date.parse(observation.observedAtEnd), nowMs);
  const summaryBonus = observation.kind === 'compacted_summary' ? 0.25 : 0;
  const baseScore = directScore + recencyScore + summaryBonus;
  return baseScore * calculateObservationDiversityMultiplier(observation, diversityOptions);
}

export function calculateObservationDiversityMultiplier(
  observation: Pick<BeatMemoryObservation, 'sourceAuthors' | 'observedAtStart' | 'observedAtEnd'>,
  options: ObservationDiversityOptions = {},
): number {
  if (observation.sourceAuthors.length === 0) {
    return 1;
  }

  const minAuthorsForFullWeight = options.minAuthorsForFullWeight ?? 3;
  const minHoursForFullWeight = options.minHoursForFullWeight ?? 6;
  const neutralFloor = clamp(options.neutralFloor ?? 0.25, 0, 1);
  const uniqueAuthors = unique(observation.sourceAuthors).length;
  const spanHours = getObservationTimeSpanHours(observation);
  const authorScore = minAuthorsForFullWeight <= 0 ? 1 : Math.min(uniqueAuthors / minAuthorsForFullWeight, 1);
  const spanScore = minHoursForFullWeight <= 0 ? 1 : Math.min(spanHours / minHoursForFullWeight, 1);
  const diversity = Math.sqrt(authorScore * spanScore);
  return neutralFloor + (1 - neutralFloor) * diversity;
}

export function getObservationTimeSpanHours(
  observation: Pick<BeatMemoryObservation, 'observedAtStart' | 'observedAtEnd'>,
): number {
  const startMs = Date.parse(observation.observedAtStart);
  const endMs = Date.parse(observation.observedAtEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return 0;
  }
  return Math.max(0, (endMs - startMs) / 3_600_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function recencyWeight(observedAtMs: number, nowMs: number): number {
  if (Number.isNaN(observedAtMs)) {
    return 0;
  }

  const ageDays = Math.max(0, (nowMs - observedAtMs) / (24 * 60 * 60 * 1000));
  if (ageDays <= 3) return 2;
  if (ageDays <= 21) return 1;
  return 0.25;
}

const tokenStopWords = new Set([
  'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in', 'is', 'it',
  'me', 'my', 'no', 'of', 'ok', 'on', 'or', 'so', 'to', 'up', 'us', 'we',
]);

function tokenize(text: string): string[] {
  const normalized = normalizeWhitespace(text).toLowerCase();
  const rawTokens = normalized.split(/[^a-z0-9_@#]+/u);
  return uniqueKeywords(
    rawTokens.filter((token) => token.length >= 2 && !tokenStopWords.has(token)),
  );
}

function uniqueKeywords(keywords: string[]): string[] {
  return unique(keywords.map((keyword) => keyword.toLowerCase().trim()).filter(Boolean));
}

function topKeywords(keywords: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const keyword of keywords) {
    counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function minIso(values: string[]): string {
  return values.length > 0
    ? values.reduce((min, value) => (Date.parse(value) < Date.parse(min) ? value : min))
    : '';
}

function maxIso(values: string[]): string {
  return values.length > 0
    ? values.reduce((max, value) => (Date.parse(value) > Date.parse(max) ? value : max))
    : '';
}

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/gu, ' ');
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
