import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectIngestionAnomalies,
  loadBeatIngestionState,
  runBeatIngestionOnce,
  type BeatIngestedItem,
  type BeatSourceAdapter,
} from '../src/index.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'beat-agent-ingestion-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('beat ingestion', () => {
  it('fetches configured sources, persists items, and deduplicates canonical IDs', async () => {
    await withTempDir(async (dir) => {
      const stateFilePath = join(dir, 'nested', 'beat-state.json');
      const adapter: BeatSourceAdapter = {
        fetchSource: async (source, cursor) => ({
          cursor: cursor?.cursor === 'page-1' ? 'page-2' : 'page-1',
          items: [
            {
              contentCanonicalId: 'twitter:tweet:1',
              sourceId: source.id,
              platform: source.platform,
              text: 'First observed post.',
              observedAt: '2026-05-15T10:00:00.000Z',
              ingestedAt: '',
            },
            {
              contentCanonicalId: 'twitter:tweet:1',
              sourceId: source.id,
              platform: source.platform,
              text: 'Duplicate from the same poll.',
              observedAt: '2026-05-15T10:01:00.000Z',
              ingestedAt: '',
            },
          ],
        }),
      };

      const firstSummary = await runBeatIngestionOnce({
        definition: {
          beatId: 'us-political-twitter',
          sources: [{ id: 'accounts:moderates', type: 'account', locator: 'moderates', platform: 'twitter' }],
        },
        stateFilePath,
        adapters: { account: adapter },
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.deepEqual(firstSummary, {
        fetchedSourceIds: ['accounts:moderates'],
        skippedSources: [],
        newItemCount: 1,
        duplicateItemCount: 1,
        anomalies: [],
      });

      const persisted = await loadBeatIngestionState(stateFilePath);
      assert.equal(persisted.items.length, 1);
      assert.equal(persisted.items[0]?.ingestedAt, '2026-05-15T12:00:00.000Z');
      assert.equal(persisted.sourceCursors['accounts:moderates']?.cursor, 'page-1');

      const secondSummary = await runBeatIngestionOnce({
        definition: {
          beatId: 'us-political-twitter',
          sources: [{ id: 'accounts:moderates', type: 'account', locator: 'moderates', platform: 'twitter' }],
        },
        stateFilePath,
        adapters: { account: adapter },
        now: new Date('2026-05-15T12:05:00.000Z'),
      });

      assert.equal(secondSummary.newItemCount, 0);
      assert.equal(secondSummary.duplicateItemCount, 2);
      const raw = await readFile(stateFilePath, 'utf-8');
      assert.equal(JSON.parse(raw).items.length, 1);
    });
  });

  it('continues ingesting other sources when one source fetch fails', async () => {
    await withTempDir(async (dir) => {
      const stateFilePath = join(dir, 'beat-state.json');
      const adapter: BeatSourceAdapter = {
        fetchSource: async (source) => {
          if (source.id === 'rss:failing') {
            throw new Error('upstream RSS timeout');
          }

          return {
            cursor: `cursor:${source.id}`,
            items: [
              {
                contentCanonicalId: `rss:item:${source.id}`,
                sourceId: source.id,
                text: `Item from ${source.id}.`,
                observedAt: '2026-05-15T10:00:00.000Z',
                ingestedAt: '',
              },
            ],
          };
        },
      };

      const summary = await runBeatIngestionOnce({
        definition: {
          beatId: 'mixed-beat',
          sources: [
            { id: 'rss:ok-before', type: 'rss', locator: 'https://example.com/before.xml' },
            { id: 'rss:failing', type: 'rss', locator: 'https://example.com/failing.xml' },
            { id: 'rss:ok-after', type: 'rss', locator: 'https://example.com/after.xml' },
          ],
        },
        stateFilePath,
        adapters: { rss: adapter },
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.deepEqual(summary.fetchedSourceIds, ['rss:ok-before', 'rss:ok-after']);
      assert.deepEqual(summary.skippedSources, [
        {
          sourceId: 'rss:failing',
          reason: 'fetch_failed',
          errorMessage: 'upstream RSS timeout',
          errorName: 'Error',
        },
      ]);
      assert.equal(summary.newItemCount, 2);

      const persisted = await loadBeatIngestionState(stateFilePath);
      assert.deepEqual(
        persisted.items.map((item) => item.contentCanonicalId),
        ['rss:item:rss:ok-before', 'rss:item:rss:ok-after'],
      );
      assert.equal(persisted.sourceCursors['rss:ok-before']?.cursor, 'cursor:rss:ok-before');
      assert.equal(persisted.sourceCursors['rss:failing'], undefined);
      assert.equal(persisted.sourceCursors['rss:ok-after']?.cursor, 'cursor:rss:ok-after');
    });
  });

  it('skips sources when rate-limited, missing credentials, or missing an adapter', async () => {
    await withTempDir(async (dir) => {
      const stateFilePath = join(dir, 'beat-state.json');
      const adapter: BeatSourceAdapter = {
        fetchSource: async (source) => ({
          items: [
            {
              contentCanonicalId: `rss:item:${source.id}`,
              sourceId: source.id,
              text: 'An RSS item.',
              observedAt: '2026-05-15T10:00:00.000Z',
              ingestedAt: '',
            },
          ],
        }),
      };

      await runBeatIngestionOnce({
        definition: {
          beatId: 'mixed-beat',
          sources: [
            { id: 'rss:ok', type: 'rss', locator: 'https://example.com/feed.xml', minPollIntervalMs: 60_000 },
          ],
        },
        stateFilePath,
        adapters: { rss: adapter },
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      const summary = await runBeatIngestionOnce({
        definition: {
          beatId: 'mixed-beat',
          sources: [
            { id: 'rss:ok', type: 'rss', locator: 'https://example.com/feed.xml', minPollIntervalMs: 60_000 },
            { id: 'query:twitter', type: 'query', locator: 'common ground', credentialEnvVar: 'X_API_BEARER_TOKEN' },
            { id: 'list:missing-adapter', type: 'list', locator: '123' },
          ],
        },
        stateFilePath,
        adapters: { rss: adapter, query: adapter },
        env: {},
        now: new Date('2026-05-15T12:00:30.000Z'),
      });

      assert.deepEqual(summary.fetchedSourceIds, []);
      assert.deepEqual(summary.skippedSources, [
        { sourceId: 'rss:ok', reason: 'rate_limited' },
        { sourceId: 'query:twitter', reason: 'missing_credentials' },
        { sourceId: 'list:missing-adapter', reason: 'missing_adapter' },
      ]);
    });
  });
});

describe('detectIngestionAnomalies', () => {
  const makeItem = (id: string, authorHandle: string): BeatIngestedItem => ({
    contentCanonicalId: id,
    sourceId: 'test-source',
    text: 'Some text.',
    observedAt: '2026-05-15T10:00:00.000Z',
    ingestedAt: '2026-05-15T10:05:00.000Z',
    authorHandle,
  });

  it('returns no anomalies for a small diverse batch', () => {
    const items = [
      makeItem('id:1', '@alice'),
      makeItem('id:2', '@bob'),
      makeItem('id:3', '@carol'),
    ];
    const anomalies = detectIngestionAnomalies(items);
    assert.deepEqual(anomalies, []);
  });

  it('returns no anomalies for empty batch', () => {
    assert.deepEqual(detectIngestionAnomalies([]), []);
  });

  it('detects low_source_diversity when many items come from few authors', () => {
    // 10 items all from one author → diversity ratio 0.1 (below 0.25 threshold)
    const items = Array.from({ length: 10 }, (_, i) => makeItem(`id:${i}`, '@spammer'));
    const anomalies = detectIngestionAnomalies(items);
    assert.equal(anomalies.length, 1);
    assert.equal(anomalies[0]!.kind, 'low_source_diversity');
    assert.equal(anomalies[0]!.newItemCount, 10);
    assert.equal(anomalies[0]!.uniqueAuthorCount, 1);
    assert.ok(anomalies[0]!.diversityRatio < 0.25);
  });

  it('does not flag low_source_diversity below minItemsForDiversityCheck', () => {
    // 4 items from one author — below default threshold of 5
    const items = Array.from({ length: 4 }, (_, i) => makeItem(`id:${i}`, '@spammer'));
    const anomalies = detectIngestionAnomalies(items, { minItemsForDiversityCheck: 5 });
    assert.deepEqual(anomalies, []);
  });

  it('detects volume_spike when new item count exceeds threshold', () => {
    // 51 items from 51 different authors — diverse but spike
    const items = Array.from({ length: 51 }, (_, i) => makeItem(`id:${i}`, `@user${i}`));
    const anomalies = detectIngestionAnomalies(items, { volumeSpikeThreshold: 50 });
    assert.equal(anomalies.length, 1);
    assert.equal(anomalies[0]!.kind, 'volume_spike');
    assert.equal(anomalies[0]!.newItemCount, 51);
  });

  it('can detect both anomaly kinds in the same run', () => {
    // 60 items all from one author: low diversity + volume spike
    const items = Array.from({ length: 60 }, (_, i) => makeItem(`id:${i}`, '@botaccount'));
    const anomalies = detectIngestionAnomalies(items);
    assert.equal(anomalies.length, 2);
    assert.ok(anomalies.some((a) => a.kind === 'low_source_diversity'));
    assert.ok(anomalies.some((a) => a.kind === 'volume_spike'));
  });

  it('respects custom thresholds', () => {
    const items = [
      makeItem('id:1', '@alice'),
      makeItem('id:2', '@alice'),
      makeItem('id:3', '@alice'),
      makeItem('id:4', '@alice'),
      makeItem('id:5', '@alice'),
    ];
    // Default thresholds would not flag (5 items is right at min, ratio is 0.2 < 0.25 so it would flag)
    // Let's check with lenient threshold
    const lenient = detectIngestionAnomalies(items, { lowDiversityThreshold: 0.1 });
    assert.deepEqual(lenient, [], 'should not flag when diversity > 0.1 threshold');
    const strict = detectIngestionAnomalies(items, { lowDiversityThreshold: 0.5 });
    assert.equal(strict.length, 1, 'should flag when diversity < 0.5 threshold');
    assert.equal(strict[0]!.kind, 'low_source_diversity');
  });
});
