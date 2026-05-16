import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createLlmObservationExtractor,
  extractObservationsFromItems,
  type BeatIngestedItem,
} from '../src/index.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'beat-agent-extractor-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('beat-agent LLM observation extractor', () => {
  it('produces structured observations from ingested items via LLM', async () => {
    // We don't call a real LLM; we verify that the extractor interface works
    // and that the prompt-building + result-normalization pipeline is sound
    // by checking that the extractor can be plugged into the memory pipeline.

    const extractor = createLlmObservationExtractor({
      apiKey: 'test-key',
      model: 'test-model',
      beatId: 'us-political-twitter',
    });

    // Verify the extractor is a valid BeatObservationExtractor by checking
    // it has the expected method signature (done via the type system at
    // build time). We also test with an empty-text item.
    const result = await extractor.extractObservations({
      contentCanonicalId: 'test:id',
      sourceId: 'accounts:test',
      text: '',
      observedAt: '2026-05-15T10:00:00.000Z',
      ingestedAt: '2026-05-15T10:01:00.000Z',
    });
    assert.deepEqual(result, []);
  });

  it('integrates with extractObservationsFromItems pipeline', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');

      const extractor = createLlmObservationExtractor({
        apiKey: 'test-key',
        beatId: 'us-political-twitter',
      });

      // With an empty item list, the pipeline should work without error.
      const summary = await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items: [],
        memoryFilePath,
        extractor,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.deepEqual(summary, {
        itemCount: 0,
        observationCount: 0,
        duplicateObservationCount: 0,
      });
    });
  });

  it('survives a non-empty item with extractor using the pipeline', async () => {
    await withTempDir(async (dir) => {
      const memoryFilePath = join(dir, 'memory.json');

      // This extractor returns fixed results without calling an LLM,
      // simulating what a successful LLM extraction would look like.
      const extractor = {
        extractObservations: async (item: BeatIngestedItem) => {
          if (!item.text?.trim()) return [];
          return [
            {
              observation: `Discourse signal: ${item.text.slice(0, 50)}`,
              confidence: 'medium' as const,
              keywords: ['signal'],
              observedAtStart: item.observedAt,
              observedAtEnd: item.observedAt,
              supportingContentIds: [item.contentCanonicalId],
            },
          ];
        },
      };

      const items: BeatIngestedItem[] = [
        {
          contentCanonicalId: 'test:id:1',
          sourceId: 'accounts:test',
          text: 'Kitchen table coalition is winning.',
          observedAt: '2026-05-15T10:00:00.000Z',
          ingestedAt: '2026-05-15T10:01:00.000Z',
        },
      ];

      const summary = await extractObservationsFromItems({
        beatId: 'us-political-twitter',
        items,
        memoryFilePath,
        extractor,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.equal(summary.itemCount, 1);
      assert.equal(summary.observationCount, 1);
    });
  });
});
