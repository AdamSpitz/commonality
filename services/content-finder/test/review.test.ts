import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runOnce } from '../src/index.js';
import { loadConfigFromEnv } from '../src/config.js';

describe('bounded content review', () => {
  it('deduplicates resolved posts and persists reservations before paid calls', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'content-review-'));
    const originalFetch = globalThis.fetch;
    const stateFilePath = join(directory, 'state.json');
    const submissionsFilePath = join(directory, 'submissions.json');
    let paidCalls = 0;
    try {
      await writeFile(submissionsFilePath, JSON.stringify([
        { contentUrl: 'https://x.com/a/status/1', statementCid: 'bafytest' },
        { contentUrl: 'https://x.com/a/status/1', statementCid: 'bafytest' },
        { contentUrl: 'https://twitter.com/a/status/1', statementCid: 'bafytest' },
      ]));
      globalThis.fetch = async (url, options) => {
        if (String(url).endsWith('/resolve/content')) {
          return Response.json({ canonicalId: 'twitter:uid:1:1', metadata: {
            text: 'Post', contentVersion: '1', authorId: 'twitter:uid:1',
            isReply: false, mediaIsPrimary: false, editableUntil: '2026-01-01T00:00:00Z',
            quotedContent: [{ text: 'Quoted argument', contentVersion: '9' }],
          } });
        }
        paidCalls++;
        const persisted = JSON.parse(await readFile(stateFilePath, 'utf8'));
        assert.equal(persisted.reservedUsd, 1);
        const { evaluations } = JSON.parse(String(options?.body));
        assert.equal(evaluations.length, 1);
        assert.equal(evaluations[0].contentVersion, '1');
        assert.equal(evaluations[0].authorId, 'twitter:uid:1');
        assert.equal(evaluations[0].isReply, false);
        assert.equal(evaluations[0].mediaIsPrimary, false);
        assert.equal(evaluations[0].editableUntil, '2026-01-01T00:00:00Z');
        assert.deepEqual(evaluations[0].quotedContent, [{ text: 'Quoted argument', contentVersion: '9' }]);
        return Response.json({ results: evaluations.map((item: object) => ({ ...item, success: true, decision: 'positive' })) });
      };
      const config = {
        platformApiUrl: 'http://platform', attesterUrl: 'http://attester', attesterFinderKey: 'key',
        pollIntervalMs: 1000, stateFilePath, submissionsFilePath,
        suggestionQueueCapacity: 10, finderQueueCapacity: 10,
        monthlySpendCeilingUsd: 1, estimatedEvaluationUsd: 1,
      };
      await runOnce(config);
      await runOnce(config);
      assert.equal(paidCalls, 1);
      const state = JSON.parse(await readFile(stateFilePath, 'utf8'));
      assert.equal(state.reservedUsd, 0);
      assert.equal(state.settledUsd, 1);
      assert.equal(state.processedSubmissionKeys.length, 2);
      assert.deepEqual(state.queuedKeys, []);
    } finally {
      globalThis.fetch = originalFetch;
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('does not consume the monthly ceiling when the attester defers before a paid call', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'content-review-deferred-'));
    const originalFetch = globalThis.fetch;
    const stateFilePath = join(directory, 'state.json');
    const submissionsFilePath = join(directory, 'submissions.json');
    try {
      await writeFile(submissionsFilePath, JSON.stringify([
        { contentUrl: 'https://x.com/a/status/2', statementCid: 'bafytest' },
      ]));
      globalThis.fetch = async (url) => {
        if (String(url).endsWith('/resolve/content')) {
          return Response.json({ canonicalId: 'twitter:uid:1:2', metadata: { text: 'Post' } });
        }
        return Response.json({ results: [{ contentCanonicalId: 'twitter:uid:1:2', statementCid: 'bafytest', success: true, deferred: true, decision: 'abstain' }] });
      };
      const config = {
        platformApiUrl: 'http://platform', attesterUrl: 'http://attester', attesterFinderKey: 'key',
        pollIntervalMs: 1000, stateFilePath, submissionsFilePath,
        suggestionQueueCapacity: 10, finderQueueCapacity: 10,
        monthlySpendCeilingUsd: 1, estimatedEvaluationUsd: 1,
      };
      await runOnce(config);
      await runOnce(config);
      const state = JSON.parse(await readFile(stateFilePath, 'utf8'));
      assert.equal(state.settledUsd, 0);
      assert.equal(state.reservedUsd, 0);
      assert.equal(state.droppedBudgetCount ?? 0, 0);
      assert.equal(state.queuedKeys.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects invalid spending and queue configuration', () => {
    const env = {
      CONTENT_FINDER_PLATFORM_API_URL: 'http://platform', CONTENT_FINDER_ATTESTER_URL: 'http://attester',
      CONTENT_FINDER_ATTESTER_FINDER_KEY: 'key',
    };
    assert.throws(() => loadConfigFromEnv({ ...env, CONTENT_FINDER_MONTHLY_SPEND_CEILING_USD: '1' }), /positive evaluation cost/);
    assert.throws(() => loadConfigFromEnv({ ...env, CONTENT_FINDER_ESTIMATED_EVALUATION_USD: '-1' }), /non-negative/);
    assert.throws(() => loadConfigFromEnv({ ...env, CONTENT_FINDER_SUGGESTION_QUEUE_CAPACITY: '0.5' }), /integers/);
  });
});
