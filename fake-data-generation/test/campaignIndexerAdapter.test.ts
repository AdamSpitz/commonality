import assert from 'node:assert/strict';
import test from 'node:test';
import { createCampaignIndexerAdapter, CAMPAIGN_ACTION_EVENTS } from '../campaignIndexerAdapter.js';
import type { PlannedAction } from '../campaignPlanner.js';

const TX = `0x${'a'.repeat(64)}` as const;
const OTHER_TX = `0x${'b'.repeat(64)}` as const;
const action: PlannedAction = { id: 'a1', sequence: 1, type: 'fund-project', actorUserId: 'u1', projectId: 'p1', amount: 10, dependsOn: [] };

test('every campaign action has an explicit real indexer event mapping', () => {
  assert.deepEqual(Object.keys(CAMPAIGN_ACTION_EVENTS).sort(), [
    'attest-alignment', 'attest-implication', 'create-cause', 'create-project', 'delegate-note',
    'deposit-note', 'fund-project', 'publish-statement', 'revoke-delegation', 'set-belief',
  ]);
  assert.ok(Object.values(CAMPAIGN_ACTION_EVENTS).every((names) => names.length > 0));
});

test('adapter reads chain/indexer heads and matches only the action transaction', async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = (async (request: string | URL | Request) => {
    const url = String(request); requested.push(url);
    if (url === 'http://indexer.test/status') return new Response(JSON.stringify({ anvil: { block: { number: 41 } } }));
    const eventName = new URL(url).searchParams.get('eventName')!;
    return new Response(JSON.stringify({ items: [
      { id: `${eventName}-wanted`, contractAddress: '0x1', eventName, blockNumber: '40', blockTimestamp: '1', transactionHash: TX, logIndex: 0, topic0: null, topic1: null, topic2: null, topic3: null, data: '0x' },
      { id: `${eventName}-other`, contractAddress: '0x1', eventName, blockNumber: '40', blockTimestamp: '1', transactionHash: OTHER_TX, logIndex: 1, topic0: null, topic1: null, topic2: null, topic3: null, data: '0x' },
    ] }));
  }) as typeof fetch;
  try {
    const adapter = createCampaignIndexerAdapter({
      machinery: { ipfsConfig: {}, twitterApiConfig: {}, testConfig: {}, eventCacheUrl: 'http://indexer.test/api', defaultChainId: 31337, chainStatusKey: 'anvil' },
      publicClient: { getBlockNumber: async () => 43n } as never,
      derivedChecks: { getDerivedChecks: async () => [{ name: 'SDK project funding', expected: 10, actual: 10 }] },
    });
    assert.equal(await adapter.getChainHead(), 43n);
    assert.equal(await adapter.getIndexerHead(), 41n);
    const matches = await adapter.findIndexedAction(action, TX);
    assert.equal(matches.length, 2);
    assert.deepEqual(matches.map((match) => match.eventId).sort(), ['ERC1155Bought:ERC1155Bought-wanted', 'RetroactiveDonationReceived:RetroactiveDonationReceived-wanted']);
    assert.deepEqual(await adapter.getDerivedChecks(action), [{ name: 'SDK project funding', expected: 10, actual: 10 }]);
    assert.ok(requested.some((url) => url.includes('eventName=ERC1155Bought')));
    assert.ok(requested.some((url) => url.includes('eventName=RetroactiveDonationReceived')));
  } finally { globalThis.fetch = originalFetch; }
});

test('adapter fails closed when indexer status omits the configured chain', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({}))) as typeof fetch;
  try {
    const adapter = createCampaignIndexerAdapter({
      machinery: { ipfsConfig: {}, twitterApiConfig: {}, testConfig: {}, eventCacheUrl: 'http://indexer.test/api', chainStatusKey: 'base-sepolia' },
      publicClient: { getBlockNumber: async () => 1n } as never,
      derivedChecks: { getDerivedChecks: async () => [] },
    });
    await assert.rejects(adapter.getIndexerHead(), /no valid base-sepolia block/);
  } finally { globalThis.fetch = originalFetch; }
});
