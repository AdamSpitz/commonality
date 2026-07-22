import { strict as assert } from 'assert';
import { encodeAbiParameters, encodeEventTopics, toHex, type Address } from 'viem';
import { PublishedDataAbi } from '../../../abis/PublishedDataAbi.js';
import { createSDKMachinery } from '../../machinery.js';
import { createEventCachePublishedDataCache } from './event-cache.js';
import type { PublishedDataId } from './types.js';

const publisher = '0x00000000000000000000000000000000000000a1' as Address;
const dataId = '0x1111111111111111111111111111111111111111111111111111111111111111' as PublishedDataId;
const publishedDataAddress = '0x0000000000000000000000000000000000000c0d' as const;

function makeRawEvent(eventName: 'DataPublished' | 'DataRetracted', logIndex: number, content = new Uint8Array()) {
  const topics = eventName === 'DataPublished'
    ? encodeEventTopics({ abi: PublishedDataAbi, eventName, args: { publisher, dataId } })
    : encodeEventTopics({ abi: PublishedDataAbi, eventName, args: { publisher, dataId } });
  const data = eventName === 'DataPublished'
    ? encodeAbiParameters([{ type: 'bytes' }], [toHex(content)])
    : '0x';

  return {
    id: `${eventName}-${logIndex}`,
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
    data,
  };
}

describe('event-cache PublishedData cache', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads event content and retraction status from the indexer event cache', async () => {
    const content = new TextEncoder().encode('hello published data');
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      const items = url.includes('eventName=DataRetracted')
        ? [makeRawEvent('DataRetracted', 2)]
        : [makeRawEvent('DataPublished', 1, content)];
      return new Response(JSON.stringify({ items }), { status: 200 });
    }) as typeof fetch;

    const cache = createEventCachePublishedDataCache(createSDKMachinery({
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
    }));

    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.equal(await cache.isPublished(publisher, dataId), true);
    assert.equal(await cache.isRetracted(publisher, dataId), true);
    assert.ok(requests.every((url) => url.includes(`contractAddress=${publishedDataAddress}`)));
  });
});
