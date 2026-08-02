import { strict as assert } from 'assert';
import { getAddress, type Address } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { ContentUnavailableError } from './content-resolver.js';
import { createEventCachePublishedDataCache } from './event-cache.js';
import { dataIdOf, fakeContentResolver, failingContentResolver, makeRawEvent } from './test-support.js';
import type { PublicationPointer } from './content-resolver.js';

const publisher = '0x00000000000000000000000000000000000000a1' as Address;
const publishedDataAddress = '0x0000000000000000000000000000000000000c0d' as const;
const content = new TextEncoder().encode('hello published data');
const dataId = dataIdOf(content);

function machinery() {
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

function stubEventCache(options: { published?: boolean; retracted?: boolean } = {}): string[] {
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    const wantsRetractions = url.includes('eventName=DataRetracted');
    const base = { publisher, dataId, contractAddress: publishedDataAddress };
    const items = wantsRetractions
      ? (options.retracted ? [makeRawEvent('DataRetracted', { ...base, logIndex: 1 })] : [])
      : (options.published === false ? [] : [makeRawEvent('DataPublished', { ...base, logIndex: 0 })]);
    return new Response(JSON.stringify({ items }), { status: 200 });
  }) as typeof fetch;
  return requests;
}

describe('event-cache PublishedData cache', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads publication status from the indexer and content from the resolver', async () => {
    const requests = stubEventCache({ retracted: true });
    const pointers: PublicationPointer[] = [];

    const cache = createEventCachePublishedDataCache(machinery(), {
      contentResolver: fakeContentResolver([content], { onResolve: (pointer) => pointers.push(pointer) }),
    });

    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.equal(await cache.isPublished(publisher, dataId), true);
    assert.equal(await cache.isRetracted(publisher, dataId), true);
    assert.ok(requests.every((url) => url.includes(`contractAddress=${publishedDataAddress}`)));

    // The resolver is handed the log's own coordinates, which is all calldata recovery needs.
    assert.equal(pointers.length, 1);
    assert.equal(pointers[0]?.publisher, getAddress(publisher));
    assert.equal(pointers[0]?.dataId, dataId.toLowerCase());
    assert.equal(pointers[0]?.transactionHash, `0x${'1'.padStart(64, '0')}`);
  });

  it('returns null only when nothing was ever published', async () => {
    stubEventCache({ published: false });

    const cache = createEventCachePublishedDataCache(machinery(), {
      contentResolver: fakeContentResolver([content]),
    });

    assert.equal(await cache.getPublishedData(publisher, dataId), null);
    assert.equal(await cache.isPublished(publisher, dataId), false);
  });

  it('throws rather than reporting not-published when content cannot be fetched', async () => {
    // The distinction that matters: an unreachable RPC must not look like content that was never
    // published, or an outage would quietly drop the statement out of aggregate counts.
    stubEventCache();

    const cache = createEventCachePublishedDataCache(machinery(), {
      contentResolver: failingContentResolver(),
    });

    await assert.rejects(
      () => cache.getPublishedData(publisher, dataId),
      (error: unknown) => error instanceof ContentUnavailableError,
    );
  });

  it('rejects content that does not hash to the published dataId', async () => {
    stubEventCache();

    const cache = createEventCachePublishedDataCache(machinery(), {
      contentResolver: fakeContentResolver([new TextEncoder().encode('substituted content')]),
    });

    await assert.rejects(
      () => cache.getPublishedData(publisher, dataId),
      (error: unknown) => error instanceof ContentUnavailableError,
    );
  });
});
