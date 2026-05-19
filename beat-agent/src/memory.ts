import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BeatAgentConfidence, BeatAgentPurpose } from './types.js';
import type { BeatDefinition, BeatIngestedItem, BeatSource } from './ingestion.js';
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
  /** Plain-text tags/entities/phrases used for model-portable lexical retrieval. */
  tags?: string[];
  purposes?: BeatAgentPurpose[];
  createdAt: string;
  supersedesObservationIds?: string[];
  /** ISO timestamp of the last time new ingested items with overlapping keywords reinforced this observation's topic. Defaults to observedAtEnd when absent. */
  lastActiveAt?: string;
}

export interface BeatPurposeSummarySnapshot {
  id: string;
  beatId: string;
  purpose: BeatAgentPurpose;
  generatedAt: string;
  observedAtStart: string;
  observedAtEnd: string;
  summary: string;
  liveTopics: string[];
  factions: string[];
  phraseMeanings: string[];
  uncertainties: string[];
  recurringGaps: string[];
  usefulContext: string[];
  sourceCoverageNotes: string[];
  sourceObservationIds: string[];
  recentMetrics?: {
    ingestion?: unknown;
    memory?: unknown;
    extraction?: unknown;
    compaction?: unknown;
    evaluation?: unknown;
    finder?: unknown;
  };
}

export type BeatSourceManagementActionType = 'add' | 'remove' | 'downweight' | 'upweight' | 'split_beat' | 'narrow_query' | 'broaden_query' | 'ask_manager';

export interface BeatSourceManagementProposedUpdate {
  action: BeatSourceManagementActionType;
  sourceId?: string;
  source?: BeatSource;
  rationale: string;
  evidence: string[];
  confidence: BeatAgentConfidence;
  expectedEffect: string;
}

export interface BeatSourceManagementHealthFlags {
  overloaded: boolean;
  underloaded: boolean;
  underCovered: boolean;
  overBroad: boolean;
  factionallySkewed: boolean;
  blockedByApiLimits: boolean;
  unsureAboutBeatBoundaries: boolean;
}

export interface BeatSourceManagementReport {
  id: string;
  beatId: string;
  generatedAt: string;
  summary: string;
  health: BeatSourceManagementHealthFlags;
  proposedUpdates: BeatSourceManagementProposedUpdate[];
  managerNotes: string[];
  effectiveSourceList: BeatSource[];
  sourceManagementObservationIds: string[];
}

export interface BeatContextMemoryState {
  schemaVersion: 1;
  observations: BeatMemoryObservation[];
  purposeSummarySnapshots?: BeatPurposeSummarySnapshot[];
  sourceManagementReports?: BeatSourceManagementReport[];
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
  /** Plain-text tags/entities/phrases used for model-portable lexical retrieval. */
  tags?: string[];
  purposes?: BeatAgentPurpose[];
}

export interface ExtractionRetryOptions {
  /** Maximum number of attempts (including the first). Default 3. */
  maxAttempts?: number;
  /** Initial delay in ms before the first retry. Default 1000. */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries. Default 30000. */
  maxDelayMs?: number;
  /** Exponential backoff multiplier. Default 2. */
  backoffFactor?: number;
}

export interface ExtractObservationsFromItemsParams {
  beatId: string;
  items: BeatIngestedItem[];
  memoryFilePath: string;
  extractor?: BeatObservationExtractor;
  now?: Date;
  /** Retry/backoff options for transient extractor failures. Defaults: maxAttempts=3, initialDelayMs=1000, maxDelayMs=30000, backoffFactor=2. */
  retryOptions?: ExtractionRetryOptions;
  purposes?: BeatAgentPurpose[];
}

export interface ExtractObservationsSummary {
  itemCount: number;
  observationCount: number;
  duplicateObservationCount: number;
  failedItemCount: number;
  failedItems: ExtractObservationsFailedItem[];
  /** Number of items that ultimately succeeded after one or more retries. */
  retriedItemCount: number;
  /** Total retry attempts across all items (not counting the initial attempt). */
  totalRetryCount: number;
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
  sourceWeightOptions?: ObservationSourceWeightOptions;
  purposes?: BeatAgentPurpose[];
}

export interface ObservationSourceWeightOptions {
  /** Operator-configured multipliers by source author/account ID. Values <= 0 quarantine a source; values > 1 upweight trusted sources. */
  sourceAuthorWeights?: Record<string, number>;
  /** Weight used when an observation has authors but none are configured. Default 1. */
  defaultSourceAuthorWeight?: number;
}

export interface ObservationDiversityOptions {
  minAuthorsForFullWeight?: number;
  minHoursForFullWeight?: number;
  neutralFloor?: number;
}

export interface BeatMemoryCompactor {
  createSummary: (beatId: string, observations: BeatMemoryObservation[]) => Promise<string>;
}

export interface CompactBeatMemoryParams {
  beatId: string;
  memoryFilePath: string;
  olderThan: Date;
  now?: Date;
  minObservationsToCompact?: number;
  compactor?: BeatMemoryCompactor;
}

export interface CompactBeatMemorySummary {
  compactedObservationCount: number;
  createdSummaryCount: number;
}

export interface BeatPurposeSummarySnapshotDraft {
  summary: string;
  liveTopics?: string[];
  factions?: string[];
  phraseMeanings?: string[];
  uncertainties?: string[];
  recurringGaps?: string[];
  usefulContext?: string[];
  sourceCoverageNotes?: string[];
}

export interface BeatPurposeSummarySnapshotGeneratorParams {
  beatId: string;
  purpose: BeatAgentPurpose;
  recentObservations: BeatMemoryObservation[];
  compactedObservations: BeatMemoryObservation[];
  previousSnapshot?: BeatPurposeSummarySnapshot;
  now: Date;
  recentMetrics?: BeatPurposeSummarySnapshot['recentMetrics'];
}

export interface BeatPurposeSummarySnapshotGenerator {
  createSnapshot: (params: BeatPurposeSummarySnapshotGeneratorParams) => Promise<BeatPurposeSummarySnapshotDraft>;
}

export interface GeneratePurposeSummarySnapshotsParams {
  beatId: string;
  memoryFilePath: string;
  purposes: BeatAgentPurpose[];
  now?: Date;
  maxObservationsPerPurpose?: number;
  maxSnapshotsPerPurpose?: number;
  recentMetrics?: BeatPurposeSummarySnapshot['recentMetrics'];
  snapshotGenerator?: BeatPurposeSummarySnapshotGenerator;
}

export interface GeneratePurposeSummarySnapshotsSummary {
  generatedSnapshotCount: number;
}

export interface GenerateSourceManagementObservationsParams {
  beatId: string;
  memoryFilePath: string;
  now?: Date;
  /** Current effective source identifiers/descriptions, used as evidence in the generated observation. */
  currentSources?: string[];
  /** Recent coverage-gap or evaluation-demand summaries, usually mined from evaluation logs. */
  coverageGapNotes?: string[];
  /** Recent finder/evaluation outcome notes that indicate source quality or off-beat noise. */
  outcomeNotes?: string[];
}

export interface GenerateSourceManagementObservationsSummary {
  observationCount: number;
  duplicateObservationCount: number;
}

export interface BeatSourceManagementReportDraft {
  summary: string;
  health: BeatSourceManagementHealthFlags;
  proposedUpdates?: BeatSourceManagementProposedUpdate[];
  managerNotes?: string[];
}

export interface BeatSourceManagementReportGeneratorParams {
  beatDefinition: BeatDefinition;
  sourceManagementObservations: BeatMemoryObservation[];
  purposeSummarySnapshots: BeatPurposeSummarySnapshot[];
  recentMetrics?: BeatPurposeSummarySnapshot['recentMetrics'];
  coverageGapNotes?: string[];
  outcomeNotes?: string[];
  now: Date;
}

export interface BeatSourceManagementReportGenerator {
  createReport: (params: BeatSourceManagementReportGeneratorParams) => Promise<BeatSourceManagementReportDraft>;
}

export interface GenerateSourceManagementReportParams {
  beatDefinition: BeatDefinition;
  memoryFilePath: string;
  now?: Date;
  recentMetrics?: BeatPurposeSummarySnapshot['recentMetrics'];
  coverageGapNotes?: string[];
  outcomeNotes?: string[];
  reportGenerator?: BeatSourceManagementReportGenerator;
  maxReports?: number;
  maxSourceManagementObservations?: number;
}

export interface GenerateSourceManagementReportSummary {
  generatedReportCount: number;
  proposedUpdateCount: number;
}

const emptyMemoryState: BeatContextMemoryState = {
  schemaVersion: 1,
  observations: [],
  purposeSummarySnapshots: [],
  sourceManagementReports: [],
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
        purposes: ['civility_attestation'],
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
      purposeSummarySnapshots: Array.isArray(parsed.purposeSummarySnapshots)
        ? parsed.purposeSummarySnapshots.map(normalizeLoadedPurposeSummarySnapshot)
        : [],
      sourceManagementReports: Array.isArray(parsed.sourceManagementReports)
        ? parsed.sourceManagementReports.map(normalizeLoadedSourceManagementReport)
        : [],
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
  const retryOpts: Required<ExtractionRetryOptions> = {
    maxAttempts: params.retryOptions?.maxAttempts ?? 3,
    initialDelayMs: params.retryOptions?.initialDelayMs ?? 1000,
    maxDelayMs: params.retryOptions?.maxDelayMs ?? 30_000,
    backoffFactor: params.retryOptions?.backoffFactor ?? 2,
  };
  const summary: ExtractObservationsSummary = {
    itemCount: params.items.length,
    observationCount: 0,
    duplicateObservationCount: 0,
    failedItemCount: 0,
    failedItems: [],
    retriedItemCount: 0,
    totalRetryCount: 0,
  };

  for (const item of params.items) {
    let extracted: ExtractedBeatObservation[];
    try {
      const { value, retryCount } = await retryWithBackoff(
        () => extractor.extractObservations(item),
        retryOpts,
      );
      extracted = value;
      if (retryCount > 0) {
        summary.retriedItemCount += 1;
        summary.totalRetryCount += retryCount;
      }
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
        tags: uniqueTags(observation.tags),
        purposes: normalizeObservationPurposes(observation.purposes, params.purposes),
        createdAt: nowIso,
      });
      summary.observationCount += 1;
    }
  }

  reinforceObservationsFromItems(state.observations, params.items, nowIso);

  await saveBeatContextMemoryState(params.memoryFilePath, state);
  return summary;
}

export async function retrieveRelevantObservations(
  params: RetrieveRelevantObservationsParams,
): Promise<BeatMemoryObservation[]> {
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const queryTokens = tokenize(params.queryText);
  const nowMs = (params.now ?? new Date()).getTime();
  const candidates = state.observations
    .filter((observation) => observation.beatId === params.beatId)
    .filter((observation) => observationMatchesPurposes(observation, params.purposes))
    .filter((observation) => !params.contentCanonicalId || !observation.supportingContentIds.includes(params.contentCanonicalId));
  const corpusStats = buildBm25CorpusStats(candidates);
  const scored = candidates
    .map((observation) => ({ observation, score: scoreObservation(observation, queryTokens, nowMs, corpusStats, params.diversityOptions, params.sourceWeightOptions) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.observation.observedAtEnd) - Date.parse(a.observation.observedAtEnd));

  return scored.slice(0, params.maxObservations ?? 8).map(({ observation }) => observation);
}

export async function generatePurposeSummarySnapshots(
  params: GeneratePurposeSummarySnapshotsParams,
): Promise<GeneratePurposeSummarySnapshotsSummary> {
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const nowIso = (params.now ?? new Date()).toISOString();
  const maxObservations = params.maxObservationsPerPurpose ?? 24;
  const maxSnapshotsPerPurpose = params.maxSnapshotsPerPurpose ?? 5;
  let generatedSnapshotCount = 0;

  state.purposeSummarySnapshots ??= [];

  for (const purpose of params.purposes) {
    const purposeObservations = state.observations
      .filter((observation) => observation.beatId === params.beatId)
      .filter((observation) => observationMatchesPurposes(observation, [purpose]));
    const observations = purposeObservations
      .filter((observation) => observation.kind === 'item_observation')
      .sort((a, b) => Date.parse(b.lastActiveAt ?? b.observedAtEnd) - Date.parse(a.lastActiveAt ?? a.observedAtEnd))
      .slice(0, maxObservations);
    const compactedObservations = purposeObservations
      .filter((observation) => observation.kind === 'compacted_summary')
      .sort((a, b) => Date.parse(b.lastActiveAt ?? b.observedAtEnd) - Date.parse(a.lastActiveAt ?? a.observedAtEnd))
      .slice(0, Math.max(4, Math.ceil(maxObservations / 4)));
    const previousSnapshot = state.purposeSummarySnapshots
      .filter((existing) => existing.beatId === params.beatId && existing.purpose === purpose)
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))[0];

    const observedAtStart = observations.length > 0 ? minIso(observations.map((observation) => observation.observedAtStart)) : nowIso;
    const observedAtEnd = observations.length > 0 ? maxIso(observations.map((observation) => observation.observedAtEnd)) : nowIso;
    const draft = params.snapshotGenerator
      ? await params.snapshotGenerator.createSnapshot({ beatId: params.beatId, purpose, recentObservations: observations, compactedObservations, previousSnapshot, now: params.now ?? new Date(), recentMetrics: params.recentMetrics })
      : createHeuristicPurposeSummarySnapshotDraft(params.beatId, purpose, observations, params.recentMetrics);
    const snapshot: BeatPurposeSummarySnapshot = {
      id: `purpose-summary:${params.beatId}:${purpose}:${nowIso}`,
      beatId: params.beatId,
      purpose,
      generatedAt: nowIso,
      observedAtStart,
      observedAtEnd,
      summary: draft.summary,
      liveTopics: draft.liveTopics ?? [],
      factions: draft.factions ?? [],
      phraseMeanings: draft.phraseMeanings ?? [],
      uncertainties: draft.uncertainties ?? [],
      recurringGaps: draft.recurringGaps ?? [],
      usefulContext: draft.usefulContext ?? [],
      sourceCoverageNotes: draft.sourceCoverageNotes ?? [],
      sourceObservationIds: observations.map((observation) => observation.id),
      recentMetrics: params.recentMetrics,
    };

    state.purposeSummarySnapshots = [
      snapshot,
      ...state.purposeSummarySnapshots.filter((existing) => !(existing.beatId === params.beatId && existing.purpose === purpose)),
    ];
    const keptCounts = new Map<BeatAgentPurpose, number>();
    state.purposeSummarySnapshots = state.purposeSummarySnapshots.filter((existing) => {
      if (existing.beatId !== params.beatId) return true;
      const count = keptCounts.get(existing.purpose) ?? 0;
      if (count >= maxSnapshotsPerPurpose) return false;
      keptCounts.set(existing.purpose, count + 1);
      return true;
    });
    generatedSnapshotCount += 1;
  }

  if (generatedSnapshotCount > 0) {
    await saveBeatContextMemoryState(params.memoryFilePath, state);
  }
  return { generatedSnapshotCount };
}

function buildSourceManagementNotes(
  snapshots: BeatPurposeSummarySnapshot[],
  currentSources: string[],
  coverageGapNotes: string[],
  outcomeNotes: string[],
): string[] {
  const notes: string[] = [];
  for (const snapshot of snapshots) {
    const weakCoverage = snapshot.sourceCoverageNotes.filter((note) => /single source|low|gap|skew|limited|blocked|under-covered|over-broad|noise/iu.test(note));
    for (const note of weakCoverage.slice(0, 2)) {
      notes.push(`Source-management signal from ${snapshot.purpose}: ${note}`);
    }
    for (const gap of snapshot.recurringGaps.slice(0, 2)) {
      notes.push(`Source-management coverage gap from ${snapshot.purpose}: ${gap}`);
    }
    if (snapshot.factions.length > 0 && snapshot.sourceCoverageNotes.some((note) => /source author\(s\)|faction|skew|diversity/iu.test(note))) {
      notes.push(`Source-management faction-balance signal from ${snapshot.purpose}: visible factions include ${snapshot.factions.slice(0, 4).join('; ')}.`);
    }
  }

  for (const note of coverageGapNotes.slice(0, 6)) {
    notes.push(`Source-management evaluation-demand signal: ${sanitizeUntrustedText(note)}`);
  }
  for (const note of outcomeNotes.slice(0, 6)) {
    notes.push(`Source-management outcome signal: ${sanitizeUntrustedText(note)}`);
  }
  if (currentSources.length === 0) {
    notes.push('Source-management assignment signal: no current sources were supplied for inspection; manager should verify the effective beat source list is configured and inspectable.');
  } else if (currentSources.length < 3) {
    notes.push(`Source-management assignment signal: current source list is narrow (${currentSources.length} source(s): ${currentSources.slice(0, 5).join(', ')}); watch for factional skew and under-coverage.`);
  }

  return unique(notes.map((note) => normalizeWhitespace(note)).filter(Boolean)).slice(0, 12);
}

function createHeuristicPurposeSummarySnapshotDraft(
  beatId: string,
  purpose: BeatAgentPurpose,
  observations: BeatMemoryObservation[],
  recentMetrics?: BeatPurposeSummarySnapshot['recentMetrics'],
): BeatPurposeSummarySnapshotDraft {
  const keywords = topKeywords(observations.flatMap((observation) => observation.keywords), 12);
  const sourceAuthors = unique(observations.flatMap((observation) => observation.sourceAuthors));
  const recentObservationTexts = observations.slice(0, 6).map((observation) => observation.observation);
  return {
    summary: observations.length > 0
      ? `Recent ${purpose} context for ${beatId}: ${keywords.length ? `recurring topics include ${keywords.slice(0, 8).join(', ')}` : 'no recurring keyword pattern detected'}. Based on ${observations.length} purpose-relevant observations from ${sourceAuthors.length} source author(s).`
      : `Recent ${purpose} context for ${beatId}: no purpose-relevant observations are available yet. Treat this as a coverage gap, not evidence that nothing is happening.`,
    liveTopics: keywords.slice(0, 8),
    factions: extractLinesMatching(recentObservationTexts, /faction|camp|coalition|side|moderate|progressive|conservative|left|right/iu, 4),
    phraseMeanings: extractLinesMatching(recentObservationTexts, /phrase|means|meaning|used|called|reference|dog whistle|ironic/iu, 4),
    uncertainties: extractLinesMatching(recentObservationTexts, /unclear|uncertain|contested|ambiguous|unknown|may|might/iu, 4),
    recurringGaps: buildRecurringGaps(observations, recentMetrics),
    usefulContext: recentObservationTexts.slice(0, 5),
    sourceCoverageNotes: buildSourceCoverageNotes(sourceAuthors.length, observations.length, recentMetrics),
  };
}

export async function generateSourceManagementObservations(
  params: GenerateSourceManagementObservationsParams,
): Promise<GenerateSourceManagementObservationsSummary> {
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const nowIso = (params.now ?? new Date()).toISOString();
  const knownIds = new Set(state.observations.map((observation) => observation.id));
  const snapshots = (state.purposeSummarySnapshots ?? [])
    .filter((snapshot) => snapshot.beatId === params.beatId && snapshot.purpose !== 'source_management')
    .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))
    .slice(0, 8);
  const notes = buildSourceManagementNotes(snapshots, params.currentSources ?? [], params.coverageGapNotes ?? [], params.outcomeNotes ?? []);
  let observationCount = 0;
  let duplicateObservationCount = 0;

  for (const [index, note] of notes.entries()) {
    const id = buildObservationId(params.beatId, [`source-management:${nowIso.slice(0, 10)}`], note, index);
    if (knownIds.has(id)) {
      duplicateObservationCount += 1;
      continue;
    }
    knownIds.add(id);
    state.observations.push({
      id,
      beatId: params.beatId,
      kind: 'item_observation',
      observation: note,
      observedAtStart: nowIso,
      observedAtEnd: nowIso,
      confidence: 'medium',
      supportingContentIds: [`source-management:${nowIso.slice(0, 10)}`],
      sourceAuthors: ['beat-agent-source-management'],
      keywords: uniqueKeywords(tokenize(note)),
      purposes: ['source_management'],
      createdAt: nowIso,
      lastActiveAt: nowIso,
    });
    observationCount += 1;
  }

  if (observationCount > 0) {
    await saveBeatContextMemoryState(params.memoryFilePath, state);
  }
  return { observationCount, duplicateObservationCount };
}

export async function generateSourceManagementReport(
  params: GenerateSourceManagementReportParams,
): Promise<GenerateSourceManagementReportSummary> {
  const state = await loadBeatContextMemoryState(params.memoryFilePath);
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const sourceManagementObservations = state.observations
    .filter((observation) => observation.beatId === params.beatDefinition.beatId)
    .filter((observation) => observationMatchesPurposes(observation, ['source_management']))
    .sort((a, b) => Date.parse(b.lastActiveAt ?? b.observedAtEnd) - Date.parse(a.lastActiveAt ?? a.observedAtEnd))
    .slice(0, params.maxSourceManagementObservations ?? 24);
  const purposeSummarySnapshots = (state.purposeSummarySnapshots ?? [])
    .filter((snapshot) => snapshot.beatId === params.beatDefinition.beatId)
    .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))
    .slice(0, 12);
  const draft = params.reportGenerator
    ? await params.reportGenerator.createReport({
      beatDefinition: params.beatDefinition,
      sourceManagementObservations,
      purposeSummarySnapshots,
      recentMetrics: params.recentMetrics,
      coverageGapNotes: params.coverageGapNotes,
      outcomeNotes: params.outcomeNotes,
      now,
    })
    : createHeuristicSourceManagementReportDraft(params.beatDefinition, sourceManagementObservations, purposeSummarySnapshots, params.recentMetrics);
  const report: BeatSourceManagementReport = {
    id: `source-manager-report:${params.beatDefinition.beatId}:${nowIso}`,
    beatId: params.beatDefinition.beatId,
    generatedAt: nowIso,
    summary: normalizeWhitespace(sanitizeUntrustedText(draft.summary)) || `No source-management report was produced for ${params.beatDefinition.beatId}.`,
    health: normalizeSourceManagementHealth(draft.health),
    proposedUpdates: normalizeProposedSourceUpdates(draft.proposedUpdates ?? [], params.beatDefinition.sources),
    managerNotes: unique((draft.managerNotes ?? []).map((note: string) => normalizeWhitespace(sanitizeUntrustedText(note))).filter(Boolean)).slice(0, 12),
    effectiveSourceList: params.beatDefinition.sources,
    sourceManagementObservationIds: sourceManagementObservations.map((observation) => observation.id),
  };

  state.sourceManagementReports = [
    report,
    ...(state.sourceManagementReports ?? []).filter((existing) => existing.beatId !== params.beatDefinition.beatId),
  ].slice(0, params.maxReports ?? 10);
  await saveBeatContextMemoryState(params.memoryFilePath, state);
  return { generatedReportCount: 1, proposedUpdateCount: report.proposedUpdates.length };
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

  let observationText: string;
  if (params.compactor) {
    try {
      observationText = await params.compactor.createSummary(params.beatId, candidates);
    } catch {
      observationText = '';
    }
  } else {
    observationText = '';
  }
  if (!observationText) {
    observationText = `Compacted ${candidates.length} older observations from ${observedAtStart} to ${observedAtEnd}. Recurring terms: ${keywords.join(', ')}.`;
  }

  const summaryObservation: BeatMemoryObservation = {
    id: summaryId,
    beatId: params.beatId,
    kind: 'compacted_summary',
    observation: observationText,
    observedAtStart,
    observedAtEnd,
    confidence: 'medium',
    supportingContentIds,
    sourceAuthors,
    keywords,
    purposes: mergeObservationPurposes(candidates),
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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: Required<ExtractionRetryOptions>,
): Promise<{ value: T; retryCount: number }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelayMs,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
    try {
      return { value: await fn(), retryCount: attempt };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
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

function normalizeLoadedPurposeSummarySnapshot(snapshot: Partial<BeatPurposeSummarySnapshot>): BeatPurposeSummarySnapshot {
  return {
    id: snapshot.id ?? '',
    beatId: snapshot.beatId ?? '',
    purpose: snapshot.purpose ?? 'civility_attestation',
    generatedAt: snapshot.generatedAt ?? '',
    observedAtStart: snapshot.observedAtStart ?? '',
    observedAtEnd: snapshot.observedAtEnd ?? '',
    summary: typeof snapshot.summary === 'string' ? sanitizeUntrustedText(snapshot.summary) : '',
    liveTopics: Array.isArray(snapshot.liveTopics) ? snapshot.liveTopics.filter((value): value is string => typeof value === 'string') : [],
    factions: Array.isArray(snapshot.factions) ? snapshot.factions.filter((value): value is string => typeof value === 'string') : [],
    phraseMeanings: Array.isArray(snapshot.phraseMeanings) ? snapshot.phraseMeanings.filter((value): value is string => typeof value === 'string') : [],
    uncertainties: Array.isArray(snapshot.uncertainties) ? snapshot.uncertainties.filter((value): value is string => typeof value === 'string') : [],
    recurringGaps: Array.isArray(snapshot.recurringGaps) ? snapshot.recurringGaps.filter((value): value is string => typeof value === 'string') : [],
    usefulContext: Array.isArray(snapshot.usefulContext) ? snapshot.usefulContext.filter((value): value is string => typeof value === 'string') : [],
    sourceCoverageNotes: Array.isArray(snapshot.sourceCoverageNotes) ? snapshot.sourceCoverageNotes.filter((value): value is string => typeof value === 'string') : [],
    sourceObservationIds: Array.isArray(snapshot.sourceObservationIds) ? snapshot.sourceObservationIds.filter((value): value is string => typeof value === 'string') : [],
    recentMetrics: snapshot.recentMetrics,
  };
}

function normalizeLoadedSourceManagementReport(report: Partial<BeatSourceManagementReport>): BeatSourceManagementReport {
  return {
    id: report.id ?? '',
    beatId: report.beatId ?? '',
    generatedAt: report.generatedAt ?? '',
    summary: typeof report.summary === 'string' ? sanitizeUntrustedText(report.summary) : '',
    health: normalizeSourceManagementHealth(report.health),
    proposedUpdates: normalizeProposedSourceUpdates(report.proposedUpdates ?? [], report.effectiveSourceList ?? []),
    managerNotes: Array.isArray(report.managerNotes) ? report.managerNotes.filter((value): value is string => typeof value === 'string').map(sanitizeUntrustedText) : [],
    effectiveSourceList: Array.isArray(report.effectiveSourceList) ? report.effectiveSourceList.map(normalizeBeatSource).filter((source): source is BeatSource => source !== undefined) : [],
    sourceManagementObservationIds: Array.isArray(report.sourceManagementObservationIds) ? report.sourceManagementObservationIds.filter((value): value is string => typeof value === 'string') : [],
  };
}

function normalizeSourceManagementHealth(raw: unknown): BeatSourceManagementHealthFlags {
  const value = (raw && typeof raw === 'object') ? raw as Partial<BeatSourceManagementHealthFlags> : {};
  return {
    overloaded: value.overloaded === true,
    underloaded: value.underloaded === true,
    underCovered: value.underCovered === true,
    overBroad: value.overBroad === true,
    factionallySkewed: value.factionallySkewed === true,
    blockedByApiLimits: value.blockedByApiLimits === true,
    unsureAboutBeatBoundaries: value.unsureAboutBeatBoundaries === true,
  };
}

function normalizeProposedSourceUpdates(updates: BeatSourceManagementProposedUpdate[], currentSources: BeatSource[]): BeatSourceManagementProposedUpdate[] {
  const currentSourceIds = new Set(currentSources.map((source) => source.id));
  return updates
    .filter((update) => isSourceManagementAction(update.action))
    .map((update) => ({
      action: update.action,
      sourceId: typeof update.sourceId === 'string' ? update.sourceId : undefined,
      source: normalizeBeatSource(update.source),
      rationale: normalizeWhitespace(sanitizeUntrustedText(update.rationale ?? '')),
      evidence: Array.isArray(update.evidence) ? update.evidence.filter((value): value is string => typeof value === 'string').map(sanitizeUntrustedText).slice(0, 8) : [],
      confidence: (update.confidence === 'high' || update.confidence === 'low' ? update.confidence : 'medium') as BeatAgentConfidence,
      expectedEffect: normalizeWhitespace(sanitizeUntrustedText(update.expectedEffect ?? '')),
    }))
    .filter((update) => update.rationale && (update.action === 'add' ? update.source !== undefined : update.sourceId === undefined || currentSourceIds.has(update.sourceId) || update.action === 'ask_manager' || update.action === 'split_beat'))
    .slice(0, 8);
}

function isSourceManagementAction(action: unknown): action is BeatSourceManagementActionType {
  return action === 'add' || action === 'remove' || action === 'downweight' || action === 'upweight' || action === 'split_beat' || action === 'narrow_query' || action === 'broaden_query' || action === 'ask_manager';
}

function normalizeBeatSource(raw: unknown): BeatSource | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Partial<BeatSource>;
  if (typeof source.id !== 'string' || typeof source.type !== 'string' || typeof source.locator !== 'string') return undefined;
  if (!(source.type === 'account' || source.type === 'query' || source.type === 'list' || source.type === 'rss')) return undefined;
  return {
    id: source.id,
    type: source.type,
    locator: source.locator,
    platform: typeof source.platform === 'string' ? source.platform : undefined,
    minPollIntervalMs: typeof source.minPollIntervalMs === 'number' ? source.minPollIntervalMs : undefined,
    credentialEnvVar: typeof source.credentialEnvVar === 'string' ? source.credentialEnvVar : undefined,
  };
}

function createHeuristicSourceManagementReportDraft(
  beatDefinition: BeatDefinition,
  observations: BeatMemoryObservation[],
  snapshots: BeatPurposeSummarySnapshot[],
  recentMetrics?: BeatPurposeSummarySnapshot['recentMetrics'],
): BeatSourceManagementReportDraft {
  const evidence = observations.slice(0, 8).map((observation) => observation.observation);
  const joined = [...evidence, ...snapshots.flatMap((snapshot) => snapshot.sourceCoverageNotes)].join(' ');
  const skippedSourceCount = typeof recentMetrics?.ingestion === 'object' && recentMetrics.ingestion && 'skippedSourceCount' in recentMetrics.ingestion ? Number((recentMetrics.ingestion as { skippedSourceCount?: unknown }).skippedSourceCount) : 0;
  const health = normalizeSourceManagementHealth({
    underCovered: /under-covered|coverage gap|outside_beat|narrow|limited|no current sources/iu.test(joined),
    overBroad: /over-broad|off-beat|noise|mostly off-beat/iu.test(joined),
    factionallySkewed: /skew|faction/iu.test(joined),
    blockedByApiLimits: skippedSourceCount > 0 || /api limit|rate limit|blocked/iu.test(joined),
    unsureAboutBeatBoundaries: /unsure|unclear|ambiguous|outside_beat/iu.test(joined),
  });
  const proposedUpdates: BeatSourceManagementProposedUpdate[] = [];
  if (health.underCovered) {
    proposedUpdates.push({ action: 'ask_manager', rationale: 'Recent source-management evidence suggests coverage gaps or repeated outside-beat demand that require operator judgment before changing sources.', evidence: evidence.slice(0, 4), confidence: 'medium', expectedEffect: 'Clarifies whether to broaden this beat, add sources, or split demand into another beat.' });
  }
  if (health.overBroad) {
    proposedUpdates.push({ action: 'narrow_query', sourceId: beatDefinition.sources.find((source) => source.type === 'query')?.id, rationale: 'Recent evidence suggests at least one source may be producing noisy or off-beat items.', evidence: evidence.slice(0, 4), confidence: 'medium', expectedEffect: 'Reduces wasted extraction/evaluation work and improves beat focus.' });
  }
  return {
    summary: `Source-management reflection for ${beatDefinition.beatId}: reviewed ${observations.length} source-management observations, ${snapshots.length} purpose snapshots, and ${beatDefinition.sources.length} effective source(s).`,
    health,
    proposedUpdates,
    managerNotes: evidence.length ? evidence.slice(0, 6) : ['No source-management observations are available yet; keep the current source list under manual review.'],
  };
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
    tags: uniqueTags(observation.tags),
    purposes: normalizeObservationPurposes(observation.purposes),
    createdAt: observation.createdAt ?? '',
    supersedesObservationIds: observation.supersedesObservationIds,
    lastActiveAt: typeof observation.lastActiveAt === 'string' ? observation.lastActiveAt : undefined,
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

interface Bm25CorpusStats {
  documentCount: number;
  averageDocumentLength: number;
  documentFrequencies: Map<string, number>;
}

function buildBm25CorpusStats(observations: BeatMemoryObservation[]): Bm25CorpusStats {
  const documentFrequencies = new Map<string, number>();
  let totalLength = 0;
  for (const observation of observations) {
    const tokens = tokenizeObservationForRetrieval(observation);
    totalLength += tokens.length;
    for (const token of new Set(tokens)) {
      documentFrequencies.set(token, (documentFrequencies.get(token) ?? 0) + 1);
    }
  }
  return {
    documentCount: observations.length,
    averageDocumentLength: observations.length === 0 ? 0 : totalLength / observations.length,
    documentFrequencies,
  };
}

function scoreObservation(
  observation: BeatMemoryObservation,
  queryTokens: string[],
  nowMs: number,
  corpusStats: Bm25CorpusStats,
  diversityOptions?: ObservationDiversityOptions,
  sourceWeightOptions?: ObservationSourceWeightOptions,
): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const lexicalScore = scoreObservationBm25(observation, queryTokens, corpusStats);
  const boostScore = scoreObservationExactAndTagBoosts(observation, queryTokens);
  const directScore = lexicalScore + boostScore;
  if (directScore === 0) {
    return 0;
  }

  const recencyScore = recencyWeight(Date.parse(observation.lastActiveAt ?? observation.observedAtEnd), nowMs);
  const summaryBonus = observation.kind === 'compacted_summary' ? 0.25 : 0;
  const baseScore = directScore + recencyScore + summaryBonus;
  return baseScore
    * calculateObservationDiversityMultiplier(observation, diversityOptions)
    * calculateObservationSourceWeightMultiplier(observation, sourceWeightOptions);
}

function scoreObservationBm25(observation: BeatMemoryObservation, queryTokens: string[], corpusStats: Bm25CorpusStats): number {
  if (corpusStats.documentCount === 0 || corpusStats.averageDocumentLength === 0) return 0;
  const tokens = tokenizeObservationForRetrieval(observation);
  const termCounts = new Map<string, number>();
  for (const token of tokens) termCounts.set(token, (termCounts.get(token) ?? 0) + 1);

  const k1 = 1.2;
  const b = 0.75;
  let score = 0;
  for (const queryToken of new Set(queryTokens)) {
    const frequency = termCounts.get(queryToken) ?? 0;
    if (frequency === 0) continue;
    const documentFrequency = corpusStats.documentFrequencies.get(queryToken) ?? 0;
    const idf = Math.log(1 + (corpusStats.documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
    const lengthNormalization = k1 * (1 - b + b * (tokens.length / corpusStats.averageDocumentLength));
    score += idf * ((frequency * (k1 + 1)) / (frequency + lengthNormalization));
  }
  return score;
}

function scoreObservationExactAndTagBoosts(observation: BeatMemoryObservation, queryTokens: string[]): number {
  const queryTokenSet = new Set(queryTokens);
  const normalizedQuery = ` ${queryTokens.join(' ')} `;
  const tags = uniqueTags(observation.tags) ?? [];
  const keywordMatches = observation.keywords.filter((keyword) => queryTokenSet.has(keyword)).length;
  const tagMatches = tags.filter((tag) => tokenize(tag).some((token) => queryTokenSet.has(token))).length;
  const exactTagMatches = tags.filter((tag) => normalizedQuery.includes(` ${normalizeWhitespace(tag).toLowerCase()} `)).length;
  const handleOrHashtagMatches = [...observation.keywords, ...tags]
    .filter((value) => /^[@#]/u.test(value))
    .filter((value) => queryTokenSet.has(value.toLowerCase())).length;
  return keywordMatches * 0.75 + tagMatches * 1.5 + exactTagMatches * 2 + handleOrHashtagMatches * 2;
}

function tokenizeObservationForRetrieval(observation: BeatMemoryObservation): string[] {
  return [
    ...tokenize(observation.observation),
    ...observation.keywords,
    ...(uniqueTags(observation.tags) ?? []).flatMap((tag) => tokenize(tag)),
    ...(observation.purposes ?? []),
  ];
}

export function calculateObservationSourceWeightMultiplier(
  observation: Pick<BeatMemoryObservation, 'sourceAuthors'>,
  options: ObservationSourceWeightOptions = {},
): number {
  const weights = options.sourceAuthorWeights ?? {};
  if (observation.sourceAuthors.length === 0 || Object.keys(weights).length === 0) {
    return 1;
  }

  const uniqueAuthors = unique(observation.sourceAuthors);
  const defaultWeight = Number.isFinite(options.defaultSourceAuthorWeight) ? options.defaultSourceAuthorWeight! : 1;
  const authorWeights = uniqueAuthors.map((author) => {
    const configured = weights[author];
    const weight = configured === undefined ? defaultWeight : configured;
    return Number.isFinite(weight) ? Math.max(0, weight) : defaultWeight;
  });
  return authorWeights.reduce((sum, weight) => sum + weight, 0) / authorWeights.length;
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

/** A set of observations that share keywords but come from non-overlapping author communities, suggesting the phrase/topic may have divergent meanings across groups. */
export interface ContestedObservationGroup {
  /** Shared keywords that link these observations. */
  keywords: string[];
  /** At least two observations from non-overlapping author sets discussing the same keywords. */
  observations: BeatMemoryObservation[];
  description: string;
}

/**
 * Detects observations that share keywords but originate from completely non-overlapping
 * author communities, which may indicate a phrase/topic has divergent meanings.
 * Only flags pairs where both observations have known source authors.
 */
export function detectContestedObservations(
  observations: BeatMemoryObservation[],
  options: { minSharedKeywords?: number; beatId?: string } = {},
): ContestedObservationGroup[] {
  const minSharedKeywords = options.minSharedKeywords ?? 2;
  const filtered = options.beatId
    ? observations.filter((obs) => obs.beatId === options.beatId)
    : observations;

  if (filtered.length < 2) return [];

  const groups: ContestedObservationGroup[] = [];
  const seenKeywordSignatures = new Set<string>();

  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const obs1 = filtered[i]!;
      const obs2 = filtered[j]!;

      if (obs1.sourceAuthors.length === 0 || obs2.sourceAuthors.length === 0) continue;

      const obs2KeywordSet = new Set(obs2.keywords);
      const sharedKeywords = obs1.keywords.filter((k) => obs2KeywordSet.has(k));
      if (sharedKeywords.length < minSharedKeywords) continue;

      const obs1AuthorSet = new Set(obs1.sourceAuthors);
      const hasSharedAuthors = obs2.sourceAuthors.some((a) => obs1AuthorSet.has(a));
      if (hasSharedAuthors) continue;

      // Deduplicate by the top shared keywords so we don't report the same conceptual contest twice.
      const keywordSignature = sharedKeywords.slice(0, 3).sort().join('|');
      if (seenKeywordSignatures.has(keywordSignature)) continue;
      seenKeywordSignatures.add(keywordSignature);

      groups.push({
        keywords: sharedKeywords,
        observations: [obs1, obs2],
        description: `Different author communities discussing [${sharedKeywords.slice(0, 3).join(', ')}] — phrase or topic may carry divergent meanings across groups`,
      });
    }
  }

  return groups;
}

/** Returns the number of days since the observation's topic was last active (reinforced by new discourse). */
export function getObservationStaleDays(
  observation: Pick<BeatMemoryObservation, 'lastActiveAt' | 'observedAtEnd'>,
  now: Date = new Date(),
): number {
  const lastActive = observation.lastActiveAt ?? observation.observedAtEnd;
  const lastActiveMs = Date.parse(lastActive);
  if (Number.isNaN(lastActiveMs)) {
    return 0;
  }
  return Math.max(0, (now.getTime() - lastActiveMs) / (24 * 60 * 60 * 1000));
}

/**
 * For each existing observation whose keywords overlap significantly with any newly ingested item,
 * update lastActiveAt to now. This prevents compacted summaries about still-active topics from
 * being penalized by recency decay, while summaries whose topic has gone quiet decay naturally.
 */
function reinforceObservationsFromItems(
  observations: BeatMemoryObservation[],
  items: BeatIngestedItem[],
  nowIso: string,
): void {
  if (items.length === 0 || observations.length === 0) {
    return;
  }

  const itemKeywordSets = items.map((item) =>
    new Set(tokenize(`${item.authorHandle ?? ''} ${item.text}`)),
  );

  for (const observation of observations) {
    const observationKeywordSet = new Set(observation.keywords);
    if (observationKeywordSet.size === 0) {
      continue;
    }
    const minOverlap = observationKeywordSet.size < 3 ? 1 : 2;
    const reinforced = itemKeywordSets.some((itemKeywords) => {
      let overlap = 0;
      for (const keyword of itemKeywords) {
        if (observationKeywordSet.has(keyword)) {
          overlap += 1;
          if (overlap >= minOverlap) {
            return true;
          }
        }
      }
      return false;
    });
    if (reinforced) {
      observation.lastActiveAt = nowIso;
    }
  }
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

function uniqueTags(tags: readonly string[] | undefined): string[] | undefined {
  if (!tags || tags.length === 0) return undefined;
  const normalized = unique(tags.map((tag) => normalizeWhitespace(tag).toLowerCase()).filter(Boolean));
  return normalized.length ? normalized : undefined;
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

function normalizeObservationPurposes(
  observationPurposes?: readonly BeatAgentPurpose[],
  fallbackPurposes?: readonly BeatAgentPurpose[],
): BeatAgentPurpose[] {
  const purposes = observationPurposes?.length ? observationPurposes : fallbackPurposes;
  return purposes?.length ? unique([...purposes]) : ['civility_attestation'];
}

function observationMatchesPurposes(
  observation: BeatMemoryObservation,
  requestedPurposes?: readonly BeatAgentPurpose[],
): boolean {
  if (!requestedPurposes || requestedPurposes.length === 0) return true;
  return normalizeObservationPurposes(observation.purposes).some((purpose) => requestedPurposes.includes(purpose));
}

function mergeObservationPurposes(observations: BeatMemoryObservation[]): BeatAgentPurpose[] {
  return normalizeObservationPurposes(observations.flatMap((observation) => observation.purposes ?? []));
}

function extractLinesMatching(lines: string[], pattern: RegExp, limit: number): string[] {
  return lines
    .filter((line) => pattern.test(line))
    .slice(0, limit)
    .map((line) => line.length > 240 ? `${line.slice(0, 237)}...` : line);
}

function buildRecurringGaps(observations: BeatMemoryObservation[], metrics?: BeatPurposeSummarySnapshot['recentMetrics']): string[] {
  const gaps: string[] = [];
  const lowConfidenceCount = observations.filter((observation) => observation.confidence === 'low').length;
  const noAuthorCount = observations.filter((observation) => observation.sourceAuthors.length === 0).length;
  if (lowConfidenceCount > 0) gaps.push(`${lowConfidenceCount} recent observation(s) are low confidence.`);
  if (noAuthorCount > 0) gaps.push(`${noAuthorCount} recent observation(s) lack source-author metadata.`);
  if (metrics?.evaluation && typeof metrics.evaluation === 'object' && 'abstainCount' in metrics.evaluation) {
    gaps.push('Recent evaluation metrics include abstentions; inspect coverage gaps before relying on this purpose summary.');
  }
  return gaps;
}

function buildSourceCoverageNotes(authorCount: number, observationCount: number, metrics?: BeatPurposeSummarySnapshot['recentMetrics']): string[] {
  const notes = [`Snapshot draws on ${observationCount} observation(s) from ${authorCount} source author(s).`];
  if (authorCount > 0 && authorCount < 3) {
    notes.push('Source diversity is thin; treat purpose-level conclusions as tentative.');
  }
  if (metrics?.ingestion && typeof metrics.ingestion === 'object' && 'skippedSourceCount' in metrics.ingestion) {
    notes.push('Recent ingestion metrics are attached; check skipped sources and API limits when reviewing coverage.');
  }
  return notes;
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
