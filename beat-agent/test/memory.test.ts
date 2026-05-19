import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  calculateObservationDiversityMultiplier,
  compactBeatMemory,
  detectContestedObservations,
  extractObservationsFromItems,
  generatePurposeSummarySnapshots,
  generateSourceManagementObservations,
  generateSourceManagementReport,
  getObservationStaleDays,
  loadBeatContextMemoryState,
  retrieveRelevantObservations,
  saveBeatContextMemoryState,
  type BeatIngestedItem,
  type BeatMemoryCompactor,
  type BeatMemoryObservation,
  type BeatObservationExtractor,
  type BeatPurposeSummarySnapshotGenerator,
} from '../src/index.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'beat-agent-memory-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const items: BeatIngestedItem[] = [
  {
    contentCanonicalId: 'twitter:tweet:1',
    sourceId: 'accounts:moderates',
    platform: 'twitter',
    authorHandle: '@river',
    text: 'The border compromise is being discussed as a face-saving deal this week.',
    observedAt: '2026-05-12T10:00:00.000Z',
    ingestedAt: '2026-05-12T10:05:00.000Z',
  },
  {
    contentCanonicalId: 'twitter:tweet:2',
    sourceId: 'accounts:moderates',
    platform: 'twitter',
    authorHandle: '@mesa',
    text: 'People keep using kitchen table coalition to mean cross-partisan local pragmatists.',
    observedAt: '2026-05-13T10:00:00.000Z',
    ingestedAt: '2026-05-13T10:05:00.000Z',
  },
];

describe('beat context memory', () => {
  it('extracts timestamped observations from ingested items and deduplicates them', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      const summary = await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        memoryFilePath,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.deepEqual(summary, {
        itemCount: 2,
        observationCount: 2,
        duplicateObservationCount: 0,
        failedItemCount: 0,
        failedItems: [],
        retriedItemCount: 0,
        totalRetryCount: 0,
      });
      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.equal(state.observations.length, 2);
      assert.equal(state.observations[0]?.beatId, 'us-political-twitter');
      assert.equal(state.observations[0]?.observedAtStart, '2026-05-12T10:00:00.000Z');
      assert.deepEqual(state.observations[0]?.supportingContentIds, ['twitter:tweet:1']);
      assert.deepEqual(state.observations[0]?.sourceAuthors, ['twitter:handle:river']);

      const duplicateSummary = await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        memoryFilePath,
        now: new Date('2026-05-15T12:30:00.000Z'),
      });

      assert.deepEqual(duplicateSummary, {
        itemCount: 2,
        observationCount: 0,
        duplicateObservationCount: 2,
        failedItemCount: 0,
        failedItems: [],
        retriedItemCount: 0,
        totalRetryCount: 0,
      });
      assert.equal((await loadBeatContextMemoryState(memoryFilePath)).observations.length, 2);
    });
  });

  it('continues extracting later items when one item extraction fails', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      const extractor: BeatObservationExtractor = {
        extractObservations: async (item) => {
          if (item.contentCanonicalId === 'twitter:tweet:1') {
            throw new Error('LLM extraction timeout');
          }

          return [
            {
              observation: `Observed phrase usage: ${item.text}`,
              confidence: 'medium',
              supportingContentIds: [item.contentCanonicalId],
            },
          ];
        },
      };

      const summary = await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        memoryFilePath,
        extractor,
        now: new Date('2026-05-15T12:00:00.000Z'),
        retryOptions: { maxAttempts: 1 },
      });

      assert.deepEqual(summary, {
        itemCount: 2,
        observationCount: 1,
        duplicateObservationCount: 0,
        failedItemCount: 1,
        failedItems: [
          {
            contentCanonicalId: 'twitter:tweet:1',
            errorMessage: 'LLM extraction timeout',
            errorName: 'Error',
          },
        ],
        retriedItemCount: 0,
        totalRetryCount: 0,
      });

      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.deepEqual(state.observations.map((observation) => observation.supportingContentIds), [
        ['twitter:tweet:2'],
      ]);
    });
  });

  describe('retry/backoff for extraction failures', () => {
    it('succeeds after transient failures and reports retriedItemCount/totalRetryCount', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        let callCount = 0;
        const extractor: BeatObservationExtractor = {
          extractObservations: async (item) => {
            callCount += 1;
            if (callCount < 3) {
              throw new Error('Transient LLM error');
            }
            return [{ observation: `Observed: ${item.text}`, confidence: 'medium' }];
          },
        };

        const summary = await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items: [items[0]!],
          memoryFilePath,
          extractor,
          now: new Date('2026-05-15T12:00:00.000Z'),
          retryOptions: { maxAttempts: 3, initialDelayMs: 0 },
        });

        assert.equal(summary.observationCount, 1, 'should succeed on third attempt');
        assert.equal(summary.failedItemCount, 0);
        assert.equal(summary.retriedItemCount, 1, 'item that needed retries should be counted');
        assert.equal(summary.totalRetryCount, 2, 'two retries before success');
        assert.equal(callCount, 3);
      });
    });

    it('marks an item failed after exhausting all retry attempts', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        let callCount = 0;
        const extractor: BeatObservationExtractor = {
          extractObservations: async () => {
            callCount += 1;
            throw new Error('Persistent LLM error');
          },
        };

        const summary = await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items: [items[0]!],
          memoryFilePath,
          extractor,
          now: new Date('2026-05-15T12:00:00.000Z'),
          retryOptions: { maxAttempts: 3, initialDelayMs: 0 },
        });

        assert.equal(summary.failedItemCount, 1);
        assert.equal(summary.failedItems[0]?.errorMessage, 'Persistent LLM error');
        assert.equal(summary.retriedItemCount, 0, 'item that failed all attempts is not counted as retried');
        assert.equal(summary.totalRetryCount, 0);
        assert.equal(callCount, 3, 'should attempt maxAttempts times');
      });
    });

    it('retries only the failing item while processing others normally', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        let firstItemCalls = 0;
        const extractor: BeatObservationExtractor = {
          extractObservations: async (item) => {
            if (item.contentCanonicalId === items[0]!.contentCanonicalId) {
              firstItemCalls += 1;
              if (firstItemCalls < 2) throw new Error('Transient');
            }
            return [{ observation: `Observed: ${item.text}`, confidence: 'medium' }];
          },
        };

        const summary = await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items,
          memoryFilePath,
          extractor,
          now: new Date('2026-05-15T12:00:00.000Z'),
          retryOptions: { maxAttempts: 2, initialDelayMs: 0 },
        });

        assert.equal(summary.observationCount, 2, 'both items should eventually succeed');
        assert.equal(summary.failedItemCount, 0);
        assert.equal(summary.retriedItemCount, 1);
        assert.equal(summary.totalRetryCount, 1);
      });
    });
  });

  it('generates purpose-level summary snapshots above detailed observations', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        purposes: ['civility_attestation', 'bridge_opportunity_detection'],
        memoryFilePath,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      const summary = await generatePurposeSummarySnapshots({
        beatId: 'us-political-twitter',
        memoryFilePath,
        purposes: ['civility_attestation', 'bridge_opportunity_detection'],
        now: new Date('2026-05-16T12:00:00.000Z'),
        recentMetrics: { ingestion: { newItemCount: 2, skippedSourceCount: 0 } },
      });

      assert.deepEqual(summary, { generatedSnapshotCount: 2 });
      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.equal(state.purposeSummarySnapshots?.length, 2);
      assert.deepEqual(
        state.purposeSummarySnapshots?.map((snapshot) => snapshot.purpose).sort(),
        ['bridge_opportunity_detection', 'civility_attestation'],
      );
      assert.match(state.purposeSummarySnapshots?.[0]?.summary ?? '', /Recent .* context/u);
      assert.ok(state.purposeSummarySnapshots?.some((snapshot) => snapshot.sourceObservationIds.length > 0));
      assert.ok(state.purposeSummarySnapshots?.every((snapshot) => snapshot.sourceCoverageNotes.length > 0));
    });
  });

  it('can use a purpose-summary generator with previous snapshot and compacted evidence', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await saveBeatContextMemoryState(memoryFilePath, {
        schemaVersion: 1,
        observations: [
          {
            id: 'recent-1',
            beatId: 'us-political-twitter',
            kind: 'item_observation',
            observation: 'moderates are debating a border compromise',
            observedAtStart: '2026-05-15T00:00:00.000Z',
            observedAtEnd: '2026-05-15T00:00:00.000Z',
            confidence: 'medium',
            supportingContentIds: ['twitter:tweet:1'],
            sourceAuthors: ['author-1'],
            keywords: ['border', 'compromise'],
            purposes: ['civility_attestation'],
            createdAt: '2026-05-15T00:00:00.000Z',
          },
          {
            id: 'old-summary',
            beatId: 'us-political-twitter',
            kind: 'compacted_summary',
            observation: 'older evidence says the same phrase was previously ambiguous',
            observedAtStart: '2026-05-01T00:00:00.000Z',
            observedAtEnd: '2026-05-03T00:00:00.000Z',
            confidence: 'low',
            supportingContentIds: ['twitter:tweet:old'],
            sourceAuthors: ['author-2'],
            keywords: ['border', 'phrase'],
            purposes: ['civility_attestation'],
            createdAt: '2026-05-03T00:00:00.000Z',
          },
        ],
        purposeSummarySnapshots: [
          {
            id: 'previous',
            beatId: 'us-political-twitter',
            purpose: 'civility_attestation',
            generatedAt: '2026-05-14T00:00:00.000Z',
            observedAtStart: '2026-05-10T00:00:00.000Z',
            observedAtEnd: '2026-05-14T00:00:00.000Z',
            summary: 'previous summary',
            liveTopics: [],
            factions: [],
            phraseMeanings: [],
            uncertainties: [],
            recurringGaps: [],
            usefulContext: [],
            sourceCoverageNotes: [],
            sourceObservationIds: [],
          },
        ],
      });

      const generator: BeatPurposeSummarySnapshotGenerator = {
        createSnapshot: async (params) => {
          assert.equal(params.previousSnapshot?.id, 'previous');
          assert.deepEqual(params.recentObservations.map((obs) => obs.id), ['recent-1']);
          assert.deepEqual(params.compactedObservations.map((obs) => obs.id), ['old-summary']);
          return {
            summary: 'LLM-authored semantic snapshot',
            liveTopics: ['border compromise'],
            sourceCoverageNotes: ['two evidence layers reviewed'],
          };
        },
      };

      await generatePurposeSummarySnapshots({
        beatId: 'us-political-twitter',
        memoryFilePath,
        purposes: ['civility_attestation'],
        now: new Date('2026-05-16T12:00:00.000Z'),
        snapshotGenerator: generator,
      });

      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.equal(state.purposeSummarySnapshots?.[0]?.summary, 'LLM-authored semantic snapshot');
      assert.deepEqual(state.purposeSummarySnapshots?.[0]?.liveTopics, ['border compromise']);
      assert.deepEqual(state.purposeSummarySnapshots?.[0]?.sourceObservationIds, ['recent-1']);
    });
  });

  it('generates source-management observations from purpose snapshots and coverage signals', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await saveBeatContextMemoryState(memoryFilePath, {
        schemaVersion: 1,
        observations: [],
        purposeSummarySnapshots: [
          {
            id: 'snapshot-1',
            beatId: 'us-political-twitter',
            purpose: 'civility_attestation',
            generatedAt: '2026-05-16T00:00:00.000Z',
            observedAtStart: '2026-05-15T00:00:00.000Z',
            observedAtEnd: '2026-05-16T00:00:00.000Z',
            summary: 'immigration rhetoric is noisy',
            liveTopics: ['immigration'],
            factions: ['moderate reformers', 'hardline restrictionists'],
            phraseMeanings: [],
            uncertainties: [],
            recurringGaps: ['Repeated abstentions concern authors outside the current source set.'],
            usefulContext: [],
            sourceCoverageNotes: ['Coverage looks limited and factionally skewed toward one camp.'],
            sourceObservationIds: [],
          },
        ],
      });

      const summary = await generateSourceManagementObservations({
        beatId: 'us-political-twitter',
        memoryFilePath,
        now: new Date('2026-05-17T00:00:00.000Z'),
        currentSources: ['twitter-list:seed'],
        coverageGapNotes: ['outside_beat requests mention @newparticipant through quotes'],
        outcomeNotes: ['query source is producing mostly off-beat campaign chatter'],
      });

      assert.equal(summary.duplicateObservationCount, 0);
      assert.ok(summary.observationCount >= 4);
      const state = await loadBeatContextMemoryState(memoryFilePath);
      const sourceManagement = state.observations.filter((observation) => observation.purposes?.includes('source_management'));
      assert.equal(sourceManagement.length, summary.observationCount);
      assert.ok(sourceManagement.some((observation) => /outside_beat requests/u.test(observation.observation)));
      assert.ok(sourceManagement.every((observation) => observation.sourceAuthors.includes('beat-agent-source-management')));
    });
  });

  it('generates advisory source-management reports without applying updates', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await saveBeatContextMemoryState(memoryFilePath, {
        schemaVersion: 1,
        observations: [
          {
            id: 'source-mgmt-1',
            beatId: 'us-political-twitter',
            kind: 'item_observation',
            observation: 'Source-management evaluation-demand signal: repeated outside_beat requests mention a missing labor organizer source.',
            observedAtStart: '2026-05-17T00:00:00.000Z',
            observedAtEnd: '2026-05-17T00:00:00.000Z',
            confidence: 'medium',
            supportingContentIds: ['source-management:2026-05-17'],
            sourceAuthors: ['beat-agent-source-management'],
            keywords: ['outside_beat', 'labor', 'organizer'],
            purposes: ['source_management'],
            createdAt: '2026-05-17T00:00:00.000Z',
          },
        ],
        purposeSummarySnapshots: [],
      });

      const summary = await generateSourceManagementReport({
        beatDefinition: {
          beatId: 'us-political-twitter',
          purposes: ['civility_attestation', 'source_management'],
          sources: [{ id: 'query:seed', type: 'query', locator: 'immigration reform', platform: 'twitter' }],
        },
        memoryFilePath,
        now: new Date('2026-05-17T01:00:00.000Z'),
      });

      assert.equal(summary.generatedReportCount, 1);
      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.equal(state.sourceManagementReports?.length, 1);
      assert.equal(state.sourceManagementReports?.[0]?.health.underCovered, true);
      assert.ok(state.sourceManagementReports?.[0]?.proposedUpdates.some((update) => update.action === 'ask_manager'));
      assert.deepEqual(state.sourceManagementReports?.[0]?.effectiveSourceList.map((source) => source.id), ['query:seed']);
    });
  });

  it('filters retrieved observations by purpose when requested', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await saveBeatContextMemoryState(memoryFilePath, {
        schemaVersion: 1,
        observations: [
          {
            id: 'civility',
            beatId: 'us-political-twitter',
            kind: 'item_observation',
            observation: 'bridge caucus is a civility framing',
            observedAtStart: '2026-05-15T00:00:00.000Z',
            observedAtEnd: '2026-05-15T00:00:00.000Z',
            confidence: 'medium',
            supportingContentIds: ['twitter:tweet:1'],
            sourceAuthors: ['author-1'],
            keywords: ['bridge', 'caucus'],
            purposes: ['civility_attestation'],
            createdAt: '2026-05-15T00:00:00.000Z',
          },
          {
            id: 'bridge',
            beatId: 'us-political-twitter',
            kind: 'item_observation',
            observation: 'bridge caucus is a live bridge opportunity',
            observedAtStart: '2026-05-15T00:00:00.000Z',
            observedAtEnd: '2026-05-15T00:00:00.000Z',
            confidence: 'medium',
            supportingContentIds: ['twitter:tweet:2'],
            sourceAuthors: ['author-2'],
            keywords: ['bridge', 'caucus'],
            purposes: ['bridge_opportunity_detection'],
            createdAt: '2026-05-15T00:00:00.000Z',
          },
        ],
      });

      const observations = await retrieveRelevantObservations({
        beatId: 'us-political-twitter',
        memoryFilePath,
        queryText: 'bridge caucus',
        purposes: ['bridge_opportunity_detection'],
      });

      assert.deepEqual(observations.map((observation) => observation.id), ['bridge']);
    });
  });

  it('supports pluggable extraction and retrieves relevant observations by keyword/recency', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      const extractor: BeatObservationExtractor = {
        extractObservations: async (item) => [
          {
            observation: `Observed phrase usage: ${item.text}`,
            confidence: 'high',
            keywords: item.text.includes('kitchen')
              ? ['kitchen', 'table', 'coalition', 'pragmatists']
              : ['border', 'compromise'],
          },
        ],
      };

      await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        memoryFilePath,
        extractor,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      const relevant = await retrieveRelevantObservations({
        beatId: 'us-political-twitter',
        memoryFilePath,
        queryText: 'Does kitchen table coalition mean local pragmatists here?',
        now: new Date('2026-05-15T12:00:00.000Z'),
        maxObservations: 1,
      });

      assert.equal(relevant.length, 1);
      assert.deepEqual(relevant[0]?.supportingContentIds, ['twitter:tweet:2']);
      assert.equal(relevant[0]?.confidence, 'high');
    });
  });

  it('downweights thinly sourced observations by source diversity and time span', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      const baseObservation = {
        beatId: 'us-political-twitter',
        kind: 'item_observation' as const,
        observation: 'secure borders is being used as good faith compromise language',
        observedAtStart: '2026-05-15T00:00:00.000Z',
        observedAtEnd: '2026-05-15T00:00:00.000Z',
        confidence: 'medium' as const,
        supportingContentIds: ['twitter:tweet:1'],
        keywords: ['secure', 'borders', 'compromise'],
        createdAt: '2026-05-15T12:00:00.000Z',
      };
      const thin: BeatMemoryObservation = {
        ...baseObservation,
        id: 'thin',
        sourceAuthors: ['twitter:uid:1'],
      };
      const diverse: BeatMemoryObservation = {
        ...baseObservation,
        id: 'diverse',
        observedAtEnd: '2026-05-15T06:00:00.000Z',
        supportingContentIds: ['twitter:tweet:2'],
        sourceAuthors: ['twitter:uid:1', 'twitter:uid:2', 'twitter:uid:3'],
      };
      await saveBeatContextMemoryState(memoryFilePath, {
        schemaVersion: 1,
        observations: [thin, diverse],
      });

      assert.equal(calculateObservationDiversityMultiplier(thin), 0.25);
      assert.equal(calculateObservationDiversityMultiplier(diverse), 1);

      const relevant = await retrieveRelevantObservations({
        beatId: 'us-political-twitter',
        memoryFilePath,
        queryText: 'secure borders compromise',
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.equal(relevant[0]?.id, 'diverse');
      assert.equal(relevant[1]?.id, 'thin');
    });
  });

  it('uses plain-text tags to retrieve observations when body keywords are sparse', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await saveBeatContextMemoryState(memoryFilePath, {
        schemaVersion: 1,
        observations: [
          {
            id: 'tagged',
            beatId: 'us-political-twitter',
            kind: 'item_observation',
            observation: 'Participants are using this as a callback to yesterday\'s argument.',
            observedAtStart: '2026-05-15T00:00:00.000Z',
            observedAtEnd: '2026-05-15T06:00:00.000Z',
            confidence: 'medium',
            supportingContentIds: ['twitter:tweet:1'],
            sourceAuthors: ['a', 'b', 'c'],
            keywords: ['callback'],
            tags: ['kitchen table coalition', '@river', '#housing'],
            purposes: ['civility_attestation'],
            createdAt: '2026-05-15T12:00:00.000Z',
          },
        ],
      });

      const relevant = await retrieveRelevantObservations({
        beatId: 'us-political-twitter',
        memoryFilePath,
        queryText: 'Does @river mean the kitchen table coalition argument here?',
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.equal(relevant[0]?.id, 'tagged');
    });
  });

  it('treats backfilled observations without sourceAuthors neutrally', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      const oldObservation = {
        id: 'legacy',
        beatId: 'us-political-twitter',
        kind: 'item_observation',
        observation: 'kitchen table coalition means local pragmatists',
        observedAtStart: '2026-05-15T00:00:00.000Z',
        observedAtEnd: '2026-05-15T00:00:00.000Z',
        confidence: 'medium',
        supportingContentIds: ['twitter:tweet:1'],
        keywords: ['kitchen', 'table', 'coalition'],
        createdAt: '2026-05-15T12:00:00.000Z',
      };
      await import('node:fs/promises').then(({ writeFile }) => writeFile(
        memoryFilePath,
        JSON.stringify({ schemaVersion: 1, observations: [oldObservation] }),
        'utf-8',
      ));

      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.deepEqual(state.observations[0]?.sourceAuthors, []);
      assert.equal(calculateObservationDiversityMultiplier(state.observations[0]!), 1);
    });
  });

  it('preserves keyword/recency ordering when diversity is equal', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      const older: BeatMemoryObservation = {
        id: 'older',
        beatId: 'us-political-twitter',
        kind: 'item_observation',
        observation: 'border compromise language',
        observedAtStart: '2026-05-01T00:00:00.000Z',
        observedAtEnd: '2026-05-01T06:00:00.000Z',
        confidence: 'medium',
        supportingContentIds: ['twitter:tweet:1'],
        sourceAuthors: ['a', 'b', 'c'],
        keywords: ['border', 'compromise'],
        createdAt: '2026-05-15T12:00:00.000Z',
      };
      const newer: BeatMemoryObservation = {
        ...older,
        id: 'newer',
        observedAtStart: '2026-05-14T00:00:00.000Z',
        observedAtEnd: '2026-05-14T06:00:00.000Z',
        supportingContentIds: ['twitter:tweet:2'],
      };
      await saveBeatContextMemoryState(memoryFilePath, { schemaVersion: 1, observations: [older, newer] });

      const relevant = await retrieveRelevantObservations({
        beatId: 'us-political-twitter',
        memoryFilePath,
        queryText: 'border compromise',
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.equal(relevant[0]?.id, 'newer');
      assert.equal(relevant[1]?.id, 'older');
    });
  });

  it('compacts older item observations into a coarse summary', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');
      await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items: [
          ...items,
          {
            contentCanonicalId: 'twitter:tweet:3',
            sourceId: 'accounts:moderates',
            text: 'A third old observation about coalition trust-building.',
            observedAt: '2026-05-14T10:00:00.000Z',
            ingestedAt: '2026-05-14T10:05:00.000Z',
          },
        ],
        memoryFilePath,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      const summary = await compactBeatMemory({
        beatId: 'us-political-twitter',
        memoryFilePath,
        olderThan: new Date('2026-05-15T00:00:00.000Z'),
        now: new Date('2026-05-30T12:00:00.000Z'),
      });

      assert.deepEqual(summary, { compactedObservationCount: 3, createdSummaryCount: 1 });
      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.equal(state.observations.length, 1);
      assert.equal(state.observations[0]?.kind, 'compacted_summary');
      assert.equal(state.observations[0]?.supersedesObservationIds?.length, 3);
      assert.equal(state.observations[0]?.observedAtStart, '2026-05-12T10:00:00.000Z');
      assert.equal(state.observations[0]?.observedAtEnd, '2026-05-14T10:00:00.000Z');
    });
  });

  describe('compactBeatMemory with LLM compactor', () => {
    it('uses compactor summary text when compactor is provided', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items,
          memoryFilePath,
          now: new Date('2026-05-15T12:00:00.000Z'),
        });

        const compactor: BeatMemoryCompactor = {
          createSummary: async () => 'LLM semantic summary of border and coalition discourse.',
        };

        await compactBeatMemory({
          beatId: 'us-political-twitter',
          memoryFilePath,
          olderThan: new Date('2026-05-15T00:00:00.000Z'),
          now: new Date('2026-05-30T12:00:00.000Z'),
          minObservationsToCompact: 2,
          compactor,
        });

        const state = await loadBeatContextMemoryState(memoryFilePath);
        assert.equal(state.observations.length, 1);
        assert.equal(state.observations[0]?.observation, 'LLM semantic summary of border and coalition discourse.');
        assert.ok(state.observations[0]?.keywords.includes('border') || state.observations[0]?.keywords.includes('coalition'),
          'keywords should still be extracted from original observations for retrieval');
      });
    });

    it('falls back to keyword summary when compactor returns empty string', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items,
          memoryFilePath,
          now: new Date('2026-05-15T12:00:00.000Z'),
        });

        const compactor: BeatMemoryCompactor = {
          createSummary: async () => '',
        };

        await compactBeatMemory({
          beatId: 'us-political-twitter',
          memoryFilePath,
          olderThan: new Date('2026-05-15T00:00:00.000Z'),
          now: new Date('2026-05-30T12:00:00.000Z'),
          minObservationsToCompact: 2,
          compactor,
        });

        const state = await loadBeatContextMemoryState(memoryFilePath);
        assert.ok(state.observations[0]?.observation.startsWith('Compacted'),
          'should fall back to keyword summary when compactor returns empty');
      });
    });

    it('falls back to keyword summary when compactor throws', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items,
          memoryFilePath,
          now: new Date('2026-05-15T12:00:00.000Z'),
        });

        const compactor: BeatMemoryCompactor = {
          createSummary: async () => { throw new Error('LLM unavailable'); },
        };

        await compactBeatMemory({
          beatId: 'us-political-twitter',
          memoryFilePath,
          olderThan: new Date('2026-05-15T00:00:00.000Z'),
          now: new Date('2026-05-30T12:00:00.000Z'),
          minObservationsToCompact: 2,
          compactor,
        });

        const state = await loadBeatContextMemoryState(memoryFilePath);
        assert.ok(state.observations[0]?.observation.startsWith('Compacted'),
          'should fall back to keyword summary when compactor throws');
      });
    });
  });

  describe('stale-observation tracking', () => {
    it('sets lastActiveAt on an existing observation when a new item shares keywords', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        const existingObservation: BeatMemoryObservation = {
          id: 'obs-border',
          beatId: 'us-political-twitter',
          kind: 'item_observation',
          observation: 'Border compromise discussed as face-saving deal.',
          observedAtStart: '2026-05-01T00:00:00.000Z',
          observedAtEnd: '2026-05-01T00:00:00.000Z',
          confidence: 'medium',
          supportingContentIds: ['twitter:tweet:old'],
          sourceAuthors: ['twitter:handle:olduser'],
          keywords: ['border', 'compromise', 'deal'],
          createdAt: '2026-05-01T00:00:00.000Z',
        };
        await saveBeatContextMemoryState(memoryFilePath, { schemaVersion: 1, observations: [existingObservation] });

        const newItem: BeatIngestedItem = {
          contentCanonicalId: 'twitter:tweet:99',
          sourceId: 'accounts:moderates',
          platform: 'twitter',
          authorHandle: '@newuser',
          text: 'The border deal is back on the table.',
          observedAt: '2026-05-15T10:00:00.000Z',
          ingestedAt: '2026-05-15T10:05:00.000Z',
        };

        await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items: [newItem],
          memoryFilePath,
          now: new Date('2026-05-15T12:00:00.000Z'),
        });

        const state = await loadBeatContextMemoryState(memoryFilePath);
        const reinforced = state.observations.find((obs) => obs.id === 'obs-border');
        assert.equal(reinforced?.lastActiveAt, '2026-05-15T12:00:00.000Z',
          'existing observation should be reinforced when a new item shares keywords');
      });
    });

    it('does not set lastActiveAt on an observation whose keywords do not overlap with new items', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        const existingObservation: BeatMemoryObservation = {
          id: 'obs-kitchen',
          beatId: 'us-political-twitter',
          kind: 'item_observation',
          observation: 'Kitchen table coalition means local pragmatists.',
          observedAtStart: '2026-05-01T00:00:00.000Z',
          observedAtEnd: '2026-05-01T00:00:00.000Z',
          confidence: 'medium',
          supportingContentIds: ['twitter:tweet:old'],
          sourceAuthors: ['twitter:handle:olduser'],
          keywords: ['kitchen', 'table', 'coalition', 'pragmatists'],
          createdAt: '2026-05-01T00:00:00.000Z',
        };
        await saveBeatContextMemoryState(memoryFilePath, { schemaVersion: 1, observations: [existingObservation] });

        const unrelatedItem: BeatIngestedItem = {
          contentCanonicalId: 'twitter:tweet:99',
          sourceId: 'accounts:moderates',
          platform: 'twitter',
          authorHandle: '@newuser',
          text: 'Totally unrelated topic about fiscal policy.',
          observedAt: '2026-05-15T10:00:00.000Z',
          ingestedAt: '2026-05-15T10:05:00.000Z',
        };

        await extractObservationsFromItems({
          beatId: 'us-political-twitter',
          items: [unrelatedItem],
          memoryFilePath,
          now: new Date('2026-05-15T12:00:00.000Z'),
        });

        const state = await loadBeatContextMemoryState(memoryFilePath);
        const notReinforced = state.observations.find((obs) => obs.id === 'obs-kitchen');
        assert.equal(notReinforced?.lastActiveAt, undefined,
          'observation should not be reinforced when no keywords overlap');
      });
    });

    it('downweights a stale compacted summary relative to a fresh item_observation on the same topic', async () => {
      await withTempDir(async (dir) => {
        const memoryFilePath = join(dir, 'memory.json');
        const staleDate = '2026-04-01T00:00:00.000Z';
        const staleCompactedSummary: BeatMemoryObservation = {
          id: 'summary-old',
          beatId: 'us-political-twitter',
          kind: 'compacted_summary',
          observation: 'Border debates dominated April. Compromise language was key.',
          observedAtStart: staleDate,
          observedAtEnd: staleDate,
          confidence: 'medium',
          supportingContentIds: ['twitter:tweet:old1', 'twitter:tweet:old2', 'twitter:tweet:old3'],
          sourceAuthors: ['a', 'b', 'c'],
          keywords: ['border', 'compromise', 'debates'],
          createdAt: staleDate,
        };
        const recentObservation: BeatMemoryObservation = {
          id: 'obs-recent',
          beatId: 'us-political-twitter',
          kind: 'item_observation',
          observation: 'Border compromise is still being discussed.',
          observedAtStart: '2026-05-14T00:00:00.000Z',
          observedAtEnd: '2026-05-14T00:00:00.000Z',
          confidence: 'medium',
          supportingContentIds: ['twitter:tweet:recent'],
          sourceAuthors: ['a', 'b', 'c'],
          keywords: ['border', 'compromise'],
          createdAt: '2026-05-14T12:00:00.000Z',
        };
        await saveBeatContextMemoryState(memoryFilePath, {
          schemaVersion: 1,
          observations: [staleCompactedSummary, recentObservation],
        });

        const relevant = await retrieveRelevantObservations({
          beatId: 'us-political-twitter',
          memoryFilePath,
          queryText: 'border compromise',
          now: new Date('2026-05-15T12:00:00.000Z'),
        });

        assert.equal(relevant[0]?.id, 'obs-recent',
          'recent item_observation should outrank stale compacted_summary');
      });
    });

    it('getObservationStaleDays uses lastActiveAt when present', () => {
      const now = new Date('2026-05-15T12:00:00.000Z');

      const observation: BeatMemoryObservation = {
        id: 'obs',
        beatId: 'beat',
        kind: 'item_observation',
        observation: 'some observation',
        observedAtStart: '2026-05-01T00:00:00.000Z',
        observedAtEnd: '2026-05-01T00:00:00.000Z',
        confidence: 'medium',
        supportingContentIds: [],
        sourceAuthors: [],
        keywords: [],
        createdAt: '2026-05-01T00:00:00.000Z',
        lastActiveAt: '2026-05-13T12:00:00.000Z',
      };

      const staleDays = getObservationStaleDays(observation, now);
      assert.ok(Math.abs(staleDays - 2) < 0.01,
        `expected ~2 stale days, got ${staleDays}`);
    });

    it('getObservationStaleDays falls back to observedAtEnd when lastActiveAt is absent', () => {
      const now = new Date('2026-05-15T12:00:00.000Z');

      const observation: BeatMemoryObservation = {
        id: 'obs',
        beatId: 'beat',
        kind: 'item_observation',
        observation: 'some observation',
        observedAtStart: '2026-05-01T00:00:00.000Z',
        observedAtEnd: '2026-05-10T12:00:00.000Z',
        confidence: 'medium',
        supportingContentIds: [],
        sourceAuthors: [],
        keywords: [],
        createdAt: '2026-05-01T00:00:00.000Z',
      };

      const staleDays = getObservationStaleDays(observation, now);
      assert.ok(Math.abs(staleDays - 5) < 0.01,
        `expected ~5 stale days, got ${staleDays}`);
    });
  });

  describe('detectContestedObservations', () => {
    const makeObs = (
      id: string,
      keywords: string[],
      sourceAuthors: string[],
      beatId = 'us-political-twitter',
    ): BeatMemoryObservation => ({
      id,
      beatId,
      kind: 'item_observation',
      observation: `Observation about ${keywords.join(', ')}.`,
      observedAtStart: '2026-05-01T00:00:00.000Z',
      observedAtEnd: '2026-05-01T00:00:00.000Z',
      confidence: 'medium',
      supportingContentIds: [`content:${id}`],
      sourceAuthors,
      keywords,
      createdAt: '2026-05-01T00:00:00.000Z',
    });

    it('returns empty array when fewer than two observations', () => {
      const groups = detectContestedObservations([makeObs('obs1', ['border', 'policy'], ['@alice'])]);
      assert.deepEqual(groups, []);
    });

    it('returns empty array when observations share authors', () => {
      const groups = detectContestedObservations([
        makeObs('obs1', ['border', 'policy'], ['@alice', '@bob']),
        makeObs('obs2', ['border', 'policy'], ['@alice', '@carol']),
      ]);
      // @alice is shared — not contested
      assert.deepEqual(groups, []);
    });

    it('returns empty array when observations share fewer than minSharedKeywords', () => {
      const groups = detectContestedObservations([
        makeObs('obs1', ['border', 'policy'], ['@alice']),
        makeObs('obs2', ['border', 'climate'], ['@bob']),
      ], { minSharedKeywords: 2 });
      // Only 'border' is shared — not enough
      assert.deepEqual(groups, []);
    });

    it('returns empty array when an observation has no source authors', () => {
      const obs1 = makeObs('obs1', ['border', 'policy'], []);
      const obs2 = makeObs('obs2', ['border', 'policy'], ['@bob']);
      const groups = detectContestedObservations([obs1, obs2]);
      assert.deepEqual(groups, []);
    });

    it('detects a contested group when observations share keywords but have disjoint author sets', () => {
      const groups = detectContestedObservations([
        makeObs('obs1', ['border', 'policy', 'reform'], ['@alice', '@left-source']),
        makeObs('obs2', ['border', 'policy', 'reform'], ['@bob', '@right-source']),
      ]);
      assert.equal(groups.length, 1);
      assert.ok(groups[0]!.keywords.includes('border'));
      assert.ok(groups[0]!.keywords.includes('policy'));
      assert.equal(groups[0]!.observations.length, 2);
      assert.ok(groups[0]!.description.includes('border') || groups[0]!.description.includes('policy'));
    });

    it('deduplicates groups with the same top-keyword signature', () => {
      // Three observations about the same keywords from three distinct author groups.
      // Should produce at most one group for that keyword cluster.
      const groups = detectContestedObservations([
        makeObs('obs1', ['border', 'policy'], ['@alice']),
        makeObs('obs2', ['border', 'policy'], ['@bob']),
        makeObs('obs3', ['border', 'policy'], ['@carol']),
      ]);
      assert.equal(groups.length, 1, 'same keyword signature should not produce multiple groups');
    });

    it('filters by beatId when provided', () => {
      const groups = detectContestedObservations(
        [
          makeObs('obs1', ['border', 'policy'], ['@alice'], 'beat-a'),
          makeObs('obs2', ['border', 'policy'], ['@bob'], 'beat-b'),
        ],
        { beatId: 'beat-a' },
      );
      // Only one observation survives the beat filter — not enough for a group
      assert.deepEqual(groups, []);
    });

    it('detects multiple contested groups for different keyword clusters', () => {
      const groups = detectContestedObservations([
        makeObs('obs1', ['border', 'wall'], ['@alice']),
        makeObs('obs2', ['border', 'wall'], ['@bob']),
        makeObs('obs3', ['climate', 'tax'], ['@carol']),
        makeObs('obs4', ['climate', 'tax'], ['@dave']),
      ]);
      assert.equal(groups.length, 2, 'should detect two distinct contested keyword clusters');
      const allKeywords = groups.flatMap((g) => g.keywords);
      assert.ok(allKeywords.includes('border') || allKeywords.includes('wall'));
      assert.ok(allKeywords.includes('climate') || allKeywords.includes('tax'));
    });
  });
});
