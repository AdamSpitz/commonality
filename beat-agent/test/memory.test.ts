import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  compactBeatMemory,
  extractObservationsFromItems,
  loadBeatContextMemoryState,
  retrieveRelevantObservations,
  type BeatIngestedItem,
  type BeatObservationExtractor,
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

      assert.deepEqual(summary, { itemCount: 2, observationCount: 2, duplicateObservationCount: 0 });
      const state = await loadBeatContextMemoryState(memoryFilePath);
      assert.equal(state.observations.length, 2);
      assert.equal(state.observations[0]?.beatId, 'us-political-twitter');
      assert.equal(state.observations[0]?.observedAtStart, '2026-05-12T10:00:00.000Z');
      assert.deepEqual(state.observations[0]?.supportingContentIds, ['twitter:tweet:1']);

      const duplicateSummary = await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        memoryFilePath,
        now: new Date('2026-05-15T12:30:00.000Z'),
      });

      assert.deepEqual(duplicateSummary, { itemCount: 2, observationCount: 0, duplicateObservationCount: 2 });
      assert.equal((await loadBeatContextMemoryState(memoryFilePath)).observations.length, 2);
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
});
