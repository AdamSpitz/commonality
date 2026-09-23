import assert from 'node:assert/strict';
import type { SDKMachinery } from '../machinery.js';
import { fetchLazyGivingProjectEvents } from './eventCacheClient.js';
import { resetProjectLogCache } from './projectLogCache.js';

const PROJECT = '0x1111111111111111111111111111111111111111';

describe('unindexed project logs', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetProjectLogCache();
  });

  it('asks the node once and then reuses the cached logs', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    let nodeReads = 0;
    const machinery = {
      eventCacheUrl: 'http://indexer.example',
      defaultChainId: 84532,
      publicClient: {
        getBlockNumber: async () => 100n,
        getLogs: async () => {
          nodeReads += 1;
          return [];
        },
      },
    } as unknown as SDKMachinery;

    const first = await fetchLazyGivingProjectEvents(machinery, PROJECT);
    const second = await fetchLazyGivingProjectEvents(machinery, PROJECT);

    assert.deepEqual(first, []);
    assert.deepEqual(second, []);
    assert.equal(nodeReads, 1);
  });

  it('does not ask the node when the event cache already has the project', async () => {
    const event = {
      id: 'event-1',
      contractAddress: PROJECT,
      eventName: 'ERC1155Bought',
      blockNumber: '123',
      blockTimestamp: '1700000000',
      transactionHash: '0xabc',
      logIndex: 0,
      topic0: null,
      topic1: null,
      topic2: null,
      topic3: null,
      data: '0x',
    };
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const items = url.includes('contractAddress=') ? [event] : [];
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    let nodeReads = 0;
    const machinery = {
      eventCacheUrl: 'http://indexer.example',
      publicClient: {
        getBlockNumber: async () => 100n,
        getLogs: async () => {
          nodeReads += 1;
          return [];
        },
      },
    } as unknown as SDKMachinery;

    const events = await fetchLazyGivingProjectEvents(machinery, PROJECT);
    assert.equal(events.length, 1);
    assert.equal(nodeReads, 0);
  });

  it('does not cache a node read that fails', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    let nodeReads = 0;
    const machinery = {
      eventCacheUrl: 'http://indexer.example',
      defaultChainId: 84532,
      publicClient: {
        getBlockNumber: async () => 100n,
        getLogs: async () => {
          nodeReads += 1;
          throw new Error('query exceeds max block range 2000');
        },
      },
    } as unknown as SDKMachinery;

    await fetchLazyGivingProjectEvents(machinery, PROJECT);
    await fetchLazyGivingProjectEvents(machinery, PROJECT);
    assert.equal(nodeReads, 2);
  });
});
