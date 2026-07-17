import { strict as assert } from 'assert';
import { toBytes, toHex, type Address } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { createPublishedDataApiCache } from './api-cache.js';
import type { PublishedDataId } from './types.js';

const publisher = '0x00000000000000000000000000000000000000a1' as Address;
const dataId = '0x1111111111111111111111111111111111111111111111111111111111111111' as PublishedDataId;
const publishedDataAddress = '0x0000000000000000000000000000000000000c0d' as const;

function machinery() {
  return createSDKMachinery({
    eventCacheUrl: 'http://indexer.test/',
    defaultChainId: 31337,
    contractAddresses: {
      beliefs: publishedDataAddress,
      implications: publishedDataAddress,
      assuranceContractFactory: publishedDataAddress,
      erc1155Factory: publishedDataAddress,
      marketplaceFactory: publishedDataAddress,
      delegatableNotes: publishedDataAddress,
      noteIntent: publishedDataAddress,
      alignmentAttestations: publishedDataAddress,
      mutableRefUpdater: publishedDataAddress,
      trustRegistry: publishedDataAddress,
      publishedData: publishedDataAddress,
    },
  });
}

describe('PublishedData API cache', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads active data from the dedicated indexer endpoint', async () => {
    const content = toBytes('hello from the api');
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ status: 'active', data: toHex(content) }), { status: 200 });
    }) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery());

    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.equal(await cache.isPublished(publisher, dataId), true);
    assert.equal(await cache.isRetracted(publisher, dataId), false);
    assert.equal(requests.length, 1, 'cache should reuse the endpoint result across method calls');
    const requestedUrl = new URL(requests[0]!);
    assert.equal(requestedUrl.origin, 'http://indexer.test');
    assert.equal(requestedUrl.pathname.toLowerCase(), `/api/published-data/${publisher}/${dataId}`);
    assert.ok(requests[0]?.includes('chainId=31337'));
    assert.ok(requests[0]?.includes(`contractAddress=${publishedDataAddress}`));
  });

  it('keeps retracted data behind the retracted status', async () => {
    const content = toBytes('retracted but recoverable when explicitly requested');
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ status: 'retracted', retractedData: toHex(content) }),
      { status: 200 },
    )) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery());

    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.equal(await cache.isPublished(publisher, dataId), true);
    assert.equal(await cache.isRetracted(publisher, dataId), true);
  });

  it('maps not-published responses to an empty cache entry', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ status: 'not-published' }), { status: 200 })) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery());

    assert.equal(await cache.getPublishedData(publisher, dataId), null);
    assert.equal(await cache.isPublished(publisher, dataId), false);
    assert.equal(await cache.isRetracted(publisher, dataId), false);
  });
});
