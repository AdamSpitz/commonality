import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadBeatIngestionState,
  runBeatIngestionOnce,
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
