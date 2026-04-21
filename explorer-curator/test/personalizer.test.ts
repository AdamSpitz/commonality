import assert from 'node:assert';
import { describe, it } from 'mocha';
import type { SDKMachinery, IpfsCidV1 } from '@commonality/sdk';
import type { OpenRouterJsonRequest } from '@commonality/attester-core';
import type { ExplorerCuratorConfig } from '../src/config.js';
import { suggestForUser, type PersonalizerDependencies } from '../src/personalizer.js';

const MACHINERY = {} as SDKMachinery;

function makeConfig(): ExplorerCuratorConfig {
  return {
    nudgerPrivateKey: ('0x' + 'aa'.repeat(32)) as `0x${string}`,
    ethereumRpcUrl: 'http://localhost:8545',
    indexerUrl: 'http://localhost:3001',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    port: 3004,
    name: 'Test Explorer',
    description: 'Test',
    sourceType: 'explorer-curator',
    version: '0.1.0',
    nudgePublicationsContractAddress: ('0x' + 'bb'.repeat(20)) as `0x${string}`,
    stream: 'test-stream',
    curatorIntervalMs: 6 * 60 * 60 * 1000,
  };
}

function makeCollection(entries: Array<{ cid: string; label: string; topicArea: string }>) {
  return {
    kind: 'curated-collection' as const,
    schemaVersion: 1,
    nudger: '0xnudger',
    publishedAt: 1700000000,
    stream: 'test-stream',
    publicationCid: 'bafypub' as IpfsCidV1,
    entries: entries.map((e) => ({
      cid: e.cid as IpfsCidV1,
      label: e.label,
      topicArea: e.topicArea,
    })),
  };
}

function makeDeps(overrides: Partial<PersonalizerDependencies> = {}): PersonalizerDependencies {
  return {
    getCuratedCollections: async () => [] as any,
    getStatement: async () => null as any,
    requestJsonCompletion: async <T>() => ([] as unknown) as T,
    ...overrides,
  };
}

function wrapCollection(collection: ReturnType<typeof makeCollection>) {
  return async () => [collection] as any;
}

describe('suggestForUser', () => {
  it('returns empty array when no curated collections exist', async () => {
    const result = await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: [] },
      makeConfig(),
      makeDeps({ getCuratedCollections: async () => [] })
    );

    assert.deepStrictEqual(result, []);
  });

  it('returns empty array when the latest collection has no entries', async () => {
    const result = await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: [] },
      makeConfig(),
      makeDeps({ getCuratedCollections: async () => [makeCollection([])] as any })
    );

    assert.deepStrictEqual(result, []);
  });

  it('returns LLM suggestions filtered to entries in the collection', async () => {
    const collection = makeCollection([
      { cid: 'bafy-housing', label: 'Housing', topicArea: 'Urban' },
      { cid: 'bafy-health', label: 'Healthcare', topicArea: 'Health' },
      { cid: 'bafy-education', label: 'Education', topicArea: 'Education' },
    ]);

    const result = await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: [] },
      makeConfig(),
      makeDeps({
        getCuratedCollections: wrapCollection(collection),
        requestJsonCompletion: async <T>() => ([
          { cid: 'bafy-housing', reason: 'Broad entry point' },
          { cid: 'bafy-health', reason: 'Fits your interests' },
          { cid: 'bafy-unknown', reason: 'Should be filtered out' }, // not in collection
        ] as unknown) as T,
      })
    );

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]!.cid, 'bafy-housing');
    assert.strictEqual(result[1]!.cid, 'bafy-health');
  });

  it('passes signed statement CIDs to the LLM prompt', async () => {
    const capturedRequests: OpenRouterJsonRequest[] = [];
    const collection = makeCollection([
      { cid: 'bafy-housing', label: 'Housing', topicArea: 'Urban' },
    ]);

    await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: ['bafy-signed-1', 'bafy-signed-2'] },
      makeConfig(),
      makeDeps({
        getCuratedCollections: wrapCollection(collection),
        getStatement: async (_m, cid) => ({ cid }) as any,
        requestJsonCompletion: async <T>(req: OpenRouterJsonRequest) => {
          capturedRequests.push(req);
          return ([] as unknown) as T;
        },
      })
    );

    assert.strictEqual(capturedRequests.length, 1);
    assert.ok(capturedRequests[0]!.userPrompt.includes('bafy-signed-1'));
  });

  it('uses fallback suggestions when LLM throws', async () => {
    const collection = makeCollection([
      { cid: 'bafy-1', label: 'Housing', topicArea: 'Urban' },
      { cid: 'bafy-2', label: 'Healthcare', topicArea: 'Health' },
    ]);

    const result = await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: [] },
      makeConfig(),
      makeDeps({
        getCuratedCollections: wrapCollection(collection),
        requestJsonCompletion: async () => { throw new Error('LLM unavailable'); },
      })
    );

    // Fallback returns up to 10 entries with generic reasons
    assert.strictEqual(result.length, 2);
    assert.ok(result[0]!.reason.includes('Housing'));
    assert.ok(result[1]!.reason.includes('Healthcare'));
  });

  it('filters out LLM suggestions with missing cid or reason', async () => {
    const collection = makeCollection([
      { cid: 'bafy-ok', label: 'Housing', topicArea: 'Urban' },
    ]);

    const result = await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: [] },
      makeConfig(),
      makeDeps({
        getCuratedCollections: wrapCollection(collection),
        requestJsonCompletion: async <T>() => ([
          { cid: 'bafy-ok', reason: 'Valid suggestion' },
          { cid: 'bafy-ok' }, // missing reason
          { reason: 'Missing CID' }, // missing cid
        ] as unknown) as T,
      })
    );

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.reason, 'Valid suggestion');
  });

  it('returns first-time-user prompt hint when signedStatementCids is empty', async () => {
    const capturedRequests: OpenRouterJsonRequest[] = [];
    const collection = makeCollection([
      { cid: 'bafy-1', label: 'Housing', topicArea: 'Urban' },
    ]);

    await suggestForUser(
      MACHINERY,
      { stream: 'test-stream', signedStatementCids: [] },
      makeConfig(),
      makeDeps({
        getCuratedCollections: wrapCollection(collection),
        requestJsonCompletion: async <T>(req: OpenRouterJsonRequest) => {
          capturedRequests.push(req);
          return ([] as unknown) as T;
        },
      })
    );

    assert.ok(capturedRequests[0]!.userPrompt.includes('first-time user'));
  });
});
