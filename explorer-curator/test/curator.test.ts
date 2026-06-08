import assert from 'node:assert';
import { describe, it } from 'mocha';
import type { SDKMachinery, IpfsCidV1 } from '@commonality/sdk';
import type { OpenRouterJsonRequest } from '@commonality/attester-core';
import type { ExplorerCuratorConfig } from '../src/config.js';
import { ExplorerCurator, type ExplorerCuratorDependencies } from '../src/curator.js';

const MACHINERY = {} as SDKMachinery;

function makeConfig(overrides: Partial<ExplorerCuratorConfig> = {}): ExplorerCuratorConfig {
  return {
    nudgerPrivateKey: ('0x' + 'aa'.repeat(32)) as `0x${string}`,
    ethereumRpcUrl: 'http://localhost:8545',
    indexerUrl: 'http://localhost:3001',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    name: 'Test Explorer',
    description: 'Test',
    sourceType: 'explorer-curator',
    version: '0.1.0',
    nudgePublicationsContractAddress: ('0x' + 'bb'.repeat(20)) as `0x${string}`,
    stream: 'test-stream',
    curatorIntervalMs: 6 * 60 * 60 * 1000,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ExplorerCuratorDependencies> = {}): ExplorerCuratorDependencies {
  return {
    getAllStatements: async () => [],
    getStatementWithContent: async () => null,
    getIndirectSupporterCount: async () => 0,
    requestJsonCompletion: async <T>() => ({}) as T,
    publishCuratedCollection: async () => ({ txHash: '0xdeadbeef', collectionCid: 'bafytest' as any }),
    ...overrides,
  };
}

function makeStatement(cid: string, text: string) {
  return {
    cid: cid as IpfsCidV1,
    believerCount: 1,
    disbelieverCount: 0,
    content: { content: text, format: 'text/plain', assets: {}, references: [], extras: {} },
  } as any;
}

describe('ExplorerCurator.runCuratorCycle', () => {
  it('returns published=false and entryCount=0 when no statements exist', async () => {
    const curator = new ExplorerCurator(makeDeps({ getAllStatements: async () => [] }));
    const result = await curator.runCuratorCycle(MACHINERY, makeConfig());

    assert.strictEqual(result.published, false);
    assert.strictEqual(result.entryCount, 0);
  });

  it('returns published=false when no statements have resolvable content', async () => {
    const curator = new ExplorerCurator(makeDeps({
      getAllStatements: async () => [makeStatement('bafy1', 'S1')],
      getStatementWithContent: async () => null,
    }));

    const result = await curator.runCuratorCycle(MACHINERY, makeConfig());

    assert.strictEqual(result.published, false);
    assert.strictEqual(result.entryCount, 0);
  });

  it('publishes collection on first run when LLM returns entries', async () => {
    const publishedArgs: any[] = [];

    const curator = new ExplorerCurator(makeDeps({
      getAllStatements: async () => [makeStatement('bafy1', 'Fund healthcare')],
      getStatementWithContent: async (_m, cid) => ({
        cid,
        content: { content: 'Fund healthcare', format: 'text/plain', assets: {}, references: [], extras: {} },
      } as any),
      requestJsonCompletion: async <T>() => ({
        entries: [{ cid: 'bafy1', label: 'Healthcare', topicArea: 'Health' }],
        changed: true,
        summary: 'initial collection',
      } as T),
      publishCuratedCollection: async (stream, entries, _config) => {
        publishedArgs.push({ stream, entries });
        return { txHash: '0xabc123', collectionCid: 'bafytest' as any };
      },
    }));

    const result = await curator.runCuratorCycle(MACHINERY, makeConfig());

    assert.strictEqual(result.published, true);
    assert.strictEqual(result.entryCount, 1);
    assert.strictEqual(result.txHash, '0xabc123');
    assert.strictEqual(publishedArgs.length, 1);
    assert.strictEqual(publishedArgs[0].stream, 'test-stream');
    assert.strictEqual(publishedArgs[0].entries[0].label, 'Healthcare');
  });

  it('skips publishing when LLM says collection has not materially changed', async () => {
    let publishCallCount = 0;

    const deps = makeDeps({
      getAllStatements: async () => [makeStatement('bafy1', 'Fund healthcare')],
      getStatementWithContent: async (_m, cid) => ({
        cid,
        content: { content: 'Fund healthcare', format: 'text/plain', assets: {}, references: [], extras: {} },
      } as any),
      requestJsonCompletion: async <T>(_req: OpenRouterJsonRequest) => ({
        entries: [{ cid: 'bafy1', label: 'Healthcare', topicArea: 'Health' }],
        changed: false,
        summary: 'no changes',
      } as T),
      publishCuratedCollection: async () => {
        publishCallCount++;
        return { txHash: '0x1', collectionCid: 'bafytest' as any };
      },
    });

    // First cycle — no previousEntries, so should publish regardless of changed=false
    const curator = new ExplorerCurator(deps);
    const first = await curator.runCuratorCycle(MACHINERY, makeConfig());
    assert.strictEqual(first.published, true);

    // Second cycle — previousEntries now set, changed=false should skip
    const second = await curator.runCuratorCycle(MACHINERY, makeConfig());
    assert.strictEqual(second.published, false);
    assert.strictEqual(publishCallCount, 1);
  });

  it('returns published=false when LLM throws, preserving previous entry count', async () => {
    let callCount = 0;

    const curator = new ExplorerCurator(makeDeps({
      getAllStatements: async () => [makeStatement('bafy1', 'Fund healthcare')],
      getStatementWithContent: async (_m, cid) => ({
        cid,
        content: { content: 'Fund healthcare', format: 'text/plain', assets: {}, references: [], extras: {} },
      } as any),
      requestJsonCompletion: async <T>() => {
        callCount++;
        if (callCount === 1) {
          return {
            entries: [{ cid: 'bafy1', label: 'Healthcare', topicArea: 'Health' }],
            changed: true,
            summary: 'initial',
          } as T;
        }
        throw new Error('LLM unavailable');
      },
      publishCuratedCollection: async () => ({ txHash: '0x1', collectionCid: 'bafytest' as any }),
    }));

    await curator.runCuratorCycle(MACHINERY, makeConfig()); // establishes previousEntries with 1 entry
    const result = await curator.runCuratorCycle(MACHINERY, makeConfig()); // LLM fails

    assert.strictEqual(result.published, false);
    assert.strictEqual(result.entryCount, 1); // falls back to previous count
  });

  it('returns published=false when publishCuratedCollection throws', async () => {
    const curator = new ExplorerCurator(makeDeps({
      getAllStatements: async () => [makeStatement('bafy1', 'Fund healthcare')],
      getStatementWithContent: async (_m, cid) => ({
        cid,
        content: { content: 'Fund healthcare', format: 'text/plain', assets: {}, references: [], extras: {} },
      } as any),
      requestJsonCompletion: async <T>() => ({
        entries: [{ cid: 'bafy1', label: 'Healthcare', topicArea: 'Health' }],
        changed: true,
        summary: 'initial',
      } as T),
      publishCuratedCollection: async () => {
        throw new Error('blockchain error');
      },
    }));

    const result = await curator.runCuratorCycle(MACHINERY, makeConfig());

    assert.strictEqual(result.published, false);
  });

  it('passes direct and indirect support metrics to the curation LLM', async () => {
    let capturedStatements: any[] = [];
    let capturedTrustedAttesters: string[] | undefined;

    const curator = new ExplorerCurator(makeDeps({
      getAllStatements: async () => [makeStatement('bafy1', 'Fund healthcare')],
      getStatementWithContent: async (_m, cid) => ({
        cid,
        content: { content: 'Fund healthcare', format: 'text/plain', assets: {}, references: [], extras: {} },
      } as any),
      getIndirectSupporterCount: async (_m, _cid, trustedAttesters) => {
        capturedTrustedAttesters = trustedAttesters;
        return 7;
      },
      requestJsonCompletion: async <T>(req: OpenRouterJsonRequest) => {
        capturedStatements = JSON.parse(req.userPrompt.split('AVAILABLE STATEMENTS:\n')[1]!);
        assert.match(req.userPrompt, /verified support as a demand signal/);
        return {
          entries: [{ cid: 'bafy1', label: 'Healthcare', topicArea: 'Health' }],
          changed: true,
          summary: 'initial',
        } as T;
      },
      publishCuratedCollection: async () => ({ txHash: '0x1', collectionCid: 'bafytest' as any }),
    }));

    await curator.runCuratorCycle(MACHINERY, makeConfig({
      trustedImplicationAttesters: ['0xtrusted'],
    }));

    assert.deepStrictEqual(capturedTrustedAttesters, ['0xtrusted']);
    assert.strictEqual(capturedStatements[0].directBelievers, 1);
    assert.strictEqual(capturedStatements[0].indirectSupporters, 7);
    assert.strictEqual(capturedStatements[0].totalSupporters, 8);
    assert.strictEqual(capturedStatements[0].directDisbelievers, 0);
  });

  it('skips statements with inaccessible content and only curates resolvable ones', async () => {
    const capturedStatements: any[] = [];

    const curator = new ExplorerCurator(makeDeps({
      getAllStatements: async () => [
        makeStatement('bafy-ok', 'Fund housing'),
        makeStatement('bafy-missing', 'Fund other'),
      ],
      getStatementWithContent: async (_m, cid) => {
        if (cid === 'bafy-ok') {
          return {
            cid,
            content: { content: 'Fund housing', format: 'text/plain', assets: {}, references: [], extras: {} },
          } as any;
        }
        throw new Error('not found');
      },
      requestJsonCompletion: async <T>(req: OpenRouterJsonRequest) => {
        const parsed = JSON.parse(req.userPrompt.split('AVAILABLE STATEMENTS:\n')[1]!);
        capturedStatements.push(...parsed);
        return {
          entries: [{ cid: 'bafy-ok', label: 'Housing', topicArea: 'Housing' }],
          changed: true,
          summary: 'initial',
        } as T;
      },
      publishCuratedCollection: async () => ({ txHash: '0x1', collectionCid: 'bafytest' as any }),
    }));

    const result = await curator.runCuratorCycle(MACHINERY, makeConfig());

    assert.strictEqual(result.published, true);
    assert.strictEqual(capturedStatements.length, 1);
    assert.strictEqual(capturedStatements[0].cid, 'bafy-ok');
  });
});
