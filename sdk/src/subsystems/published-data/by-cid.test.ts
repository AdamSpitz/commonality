import { strict as assert } from 'assert';
import { encodeAbiParameters, encodeEventTopics, getAddress, toHex, type Address } from 'viem';
import { PublishedDataAbi } from '../../../abis/PublishedDataAbi.js';
import { createSDKMachinery, type SDKMachinery } from '../../machinery.js';
import { createEventCacheCidResolver } from './by-cid.js';
import type { PublishedDataId } from './types.js';

const dataId = '0x1111111111111111111111111111111111111111111111111111111111111111' as PublishedDataId;
const publishedDataAddress = '0x0000000000000000000000000000000000000c0d' as const;

const alice = '0x00000000000000000000000000000000000000a1' as Address;
const bob = '0x00000000000000000000000000000000000000b2' as Address;
const denylistKeeper = '0x00000000000000000000000000000000000000d3' as Address;

function makeRawEvent(
  eventName: 'DataPublished' | 'DataRetracted',
  publisher: Address,
  logIndex: number,
  content = new Uint8Array(),
) {
  const topics = encodeEventTopics({ abi: PublishedDataAbi, eventName, args: { publisher, dataId } });
  return {
    id: `${eventName}-${publisher}-${logIndex}`,
    chainId: 31337,
    contractAddress: publishedDataAddress,
    eventName,
    blockNumber: '1',
    blockTimestamp: '2',
    transactionHash: `0x${String(logIndex).padStart(64, '0')}`,
    logIndex,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: topics[3] ?? null,
    data: eventName === 'DataPublished' ? encodeAbiParameters([{ type: 'bytes' }], [toHex(content)]) : '0x',
  };
}

function machinery(): SDKMachinery {
  return createSDKMachinery({
    eventCacheUrl: 'http://indexer.test',
    defaultChainId: 31337,
    contractAddresses: {
      beliefs: publishedDataAddress,
      implications: publishedDataAddress,
      assuranceContractFactory: publishedDataAddress,
      erc1155Factory: publishedDataAddress,
      delegatableNotes: publishedDataAddress,
      noteIntent: publishedDataAddress,
      alignmentAttestations: publishedDataAddress,
      mutableRefUpdater: publishedDataAddress,
      trustRegistry: publishedDataAddress,
      publishedData: publishedDataAddress,
    },
  });
}

/** Stub the event cache: DataPublished / DataRetracted rows are chosen per request URL. */
function stubEventCache(rows: { published?: unknown[]; retracted?: unknown[] }, requests: string[] = []) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    const items = url.includes('eventName=DataRetracted') ? rows.retracted ?? [] : rows.published ?? [];
    return new Response(JSON.stringify({ items }), { status: 200 });
  }) as typeof fetch;
  return requests;
}

describe('by-cid resolver', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const content = new TextEncoder().encode('shared bytes');

  it('reports not-published when no publication exists', async () => {
    stubEventCache({});
    const resolve = createEventCacheCidResolver(machinery());
    assert.deepEqual(await resolve(dataId), { status: 'not-published' });
  });

  it('queries by dataId without a publisher filter', async () => {
    const requests = stubEventCache({ published: [makeRawEvent('DataPublished', alice, 1, content)] });
    const resolve = createEventCacheCidResolver(machinery());
    await resolve(dataId);
    assert.ok(requests.length > 0);
    assert.ok(requests.every((url) => url.includes(`topic2=${dataId.toLowerCase()}`)));
    assert.ok(requests.every((url) => !url.includes('topic1=')));
  });

  it('returns active bytes and the set of live publishers', async () => {
    stubEventCache({
      published: [
        makeRawEvent('DataPublished', alice, 1, content),
        makeRawEvent('DataPublished', bob, 2, content),
      ],
    });
    const resolve = createEventCacheCidResolver(machinery());
    const result = await resolve(dataId);
    assert.equal(result.status, 'active');
    assert.deepEqual((result as { data: Uint8Array }).data, content);
    assert.deepEqual((result as { livePublishers: Address[] }).livePublishers, [getAddress(alice), getAddress(bob)]);
  });

  it('stays active by OR when one of several publishers self-retracts', async () => {
    stubEventCache({
      published: [
        makeRawEvent('DataPublished', alice, 1, content),
        makeRawEvent('DataPublished', bob, 2, content),
      ],
      retracted: [makeRawEvent('DataRetracted', alice, 3)],
    });
    const resolve = createEventCacheCidResolver(machinery());
    const result = await resolve(dataId);
    assert.equal(result.status, 'active');
    assert.deepEqual((result as { livePublishers: Address[] }).livePublishers, [getAddress(bob)]);
  });

  it('is retracted only when every publisher has self-retracted', async () => {
    stubEventCache({
      published: [
        makeRawEvent('DataPublished', alice, 1, content),
        makeRawEvent('DataPublished', bob, 2, content),
      ],
      retracted: [makeRawEvent('DataRetracted', alice, 3), makeRawEvent('DataRetracted', bob, 4)],
    });
    const resolve = createEventCacheCidResolver(machinery());
    const result = await resolve(dataId);
    assert.equal(result.status, 'retracted');
    assert.deepEqual((result as { retractedData: Uint8Array }).retractedData, content);
  });

  it('honors a non-publisher retractor by suppressing the whole CID under that policy', async () => {
    const rows = {
      published: [makeRawEvent('DataPublished', alice, 1, content)],
      retracted: [makeRawEvent('DataRetracted', denylistKeeper, 5)],
    };

    // Default policy ignores the denylist keeper: still active.
    stubEventCache(rows);
    const resolve = createEventCacheCidResolver(machinery());
    assert.equal((await resolve(dataId)).status, 'active');

    // Honoring the keeper suppresses it globally.
    stubEventCache(rows);
    const suppressed = await resolve(dataId, { honoredRetractors: [denylistKeeper] });
    assert.equal(suppressed.status, 'retracted');
  });

  it('propagates a transient fetch failure so the caller can map it to unavailable', async () => {
    globalThis.fetch = (async () => new Response('boom', { status: 500 })) as typeof fetch;
    const resolve = createEventCacheCidResolver(machinery());
    await assert.rejects(() => resolve(dataId));
  });
});
