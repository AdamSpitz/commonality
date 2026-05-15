import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadBeatFinderState,
  runBeatFinderOnce,
  saveBeatFinderState,
  saveBeatIngestionState,
  type BeatIngestionState,
} from '../src/index.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'beat-agent-finder-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('beat finder', () => {
  it('submits promising unprocessed ingested items and records attester responses', async () => {
    await withTempDir(async (dir) => {
      const ingestionStateFilePath = join(dir, 'ingestion.json');
      const finderStateFilePath = join(dir, 'finder.json');
      const ingestionState: BeatIngestionState = {
        schemaVersion: 1,
        sourceCursors: {},
        items: [
          {
            contentCanonicalId: 'twitter:tweet:1',
            sourceId: 'account:moderate',
            platform: 'twitter',
            contentUrl: 'https://x.example/1',
            text: 'A thoughtful bridge-building post.',
            observedAt: '2026-05-15T10:00:00.000Z',
            ingestedAt: '2026-05-15T10:01:00.000Z',
          },
          {
            contentCanonicalId: 'twitter:tweet:2',
            sourceId: 'account:moderate',
            platform: 'twitter',
            text: '   ',
            observedAt: '2026-05-15T10:02:00.000Z',
            ingestedAt: '2026-05-15T10:03:00.000Z',
          },
        ],
      };
      await saveBeatIngestionState(ingestionStateFilePath, ingestionState);

      const submittedBodies: unknown[] = [];
      const submittedFinderKeys: (string | null)[] = [];
      const fetchImpl: typeof fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        submittedBodies.push(JSON.parse(init?.body as string));
        const headers = new Headers(init?.headers);
        submittedFinderKeys.push(headers.get('x-finder-key'));
        return response({
          alreadyAttested: false,
          decision: 'positive',
          confidence: 'high',
          reasoning: 'Looks aligned.',
          subjectId: '0xsubject',
          explanationCid: 'bafyexplanation',
          transactionHash: '0xtx',
          processingTime: 123,
        });
      };

      const summary = await runBeatFinderOnce({
        ingestionStateFilePath,
        finderStateFilePath,
        targetStatementCid: 'bafystatement',
        attesterEndpoint: 'https://beat.example/evaluate-content',
        trustedFinderKey: 'shared-secret',
        fetchImpl,
        now: new Date('2026-05-15T12:00:00.000Z'),
      });

      assert.deepEqual(summary, {
        scannedItemCount: 2,
        skippedAlreadyProcessedCount: 0,
        notPromisingCount: 1,
        submittedCount: 1,
        failedCandidateIds: [],
      });
      assert.deepEqual(submittedBodies, [
        {
          contentCanonicalId: 'twitter:tweet:1',
          statementCid: 'bafystatement',
          contentText: 'A thoughtful bridge-building post.',
        },
      ]);
      assert.deepEqual(submittedFinderKeys, ['shared-secret']);

      const state = await loadBeatFinderState(finderStateFilePath);
      assert.equal(state.processedItems['twitter:tweet:1']?.status, 'submitted');
      assert.equal(state.processedItems['twitter:tweet:1']?.decision, 'positive');
      assert.equal(state.processedItems['twitter:tweet:1']?.transactionHash, '0xtx');
      assert.equal(state.processedItems['twitter:tweet:2']?.status, 'not_promising');
    });
  });

  it('skips processed items and leaves failed submissions unprocessed for retry', async () => {
    await withTempDir(async (dir) => {
      const ingestionStateFilePath = join(dir, 'ingestion.json');
      const finderStateFilePath = join(dir, 'finder.json');
      await saveBeatIngestionState(ingestionStateFilePath, {
        schemaVersion: 1,
        sourceCursors: {},
        items: [
          {
            contentCanonicalId: 'already-done',
            sourceId: 'rss:local',
            text: 'Already processed.',
            observedAt: '2026-05-15T10:00:00.000Z',
            ingestedAt: '2026-05-15T10:01:00.000Z',
          },
          {
            contentCanonicalId: 'will-fail',
            sourceId: 'rss:local',
            text: 'Submit me.',
            observedAt: '2026-05-15T10:02:00.000Z',
            ingestedAt: '2026-05-15T10:03:00.000Z',
          },
        ],
      });
      await saveBeatFinderState(finderStateFilePath, {
        schemaVersion: 1,
        processedItems: {
          'already-done': {
            processedAt: '2026-05-15T11:00:00.000Z',
            status: 'submitted',
            decision: 'positive',
            confidence: 'high',
          },
        },
      });

      const firstSummary = await runBeatFinderOnce({
        ingestionStateFilePath,
        finderStateFilePath,
        targetStatementCid: 'bafystatement',
        attesterEndpoint: 'https://beat.example/evaluate-content',
        fetchImpl: async () => response({ error: 'bad' }, { status: 500 }),
      });
      assert.equal(firstSummary.skippedAlreadyProcessedCount, 1);
      assert.deepEqual(firstSummary.failedCandidateIds, ['will-fail']);

      const secondSummary = await runBeatFinderOnce({
        ingestionStateFilePath,
        finderStateFilePath,
        targetStatementCid: 'bafystatement',
        attesterEndpoint: 'https://beat.example/evaluate-content',
        fetchImpl: async () => response({
          alreadyAttested: false,
          decision: 'negative',
          confidence: 'medium',
          reasoning: 'Not aligned.',
          subjectId: '0xsubject',
          explanationCid: null,
          transactionHash: null,
          processingTime: 25,
        }),
        now: new Date('2026-05-15T12:05:00.000Z'),
      });

      assert.equal(secondSummary.skippedAlreadyProcessedCount, 1);
      assert.equal(secondSummary.submittedCount, 1);
      const state = await loadBeatFinderState(finderStateFilePath);
      assert.equal(state.processedItems['will-fail']?.status, 'submitted');
      assert.equal(state.processedItems['will-fail']?.decision, 'negative');
    });
  });
});
