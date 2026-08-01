import { strict as assert } from 'assert';
import { getAddress, toBytes, type Address } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { createPublishedDataApiCache, createPublishedDataApiCidResolver } from './api-cache.js';
import { ContentUnavailableError } from './content-resolver.js';
import { dataIdOf, fakeContentResolver, failingContentResolver } from './test-support.js';

const publisher = '0x00000000000000000000000000000000000000a1' as Address;
const publishedDataAddress = '0x0000000000000000000000000000000000000c0d' as const;
const txHash = `0x${'ab'.repeat(32)}`;

function machinery() {
  return createSDKMachinery({
    eventCacheUrl: 'http://indexer.test/',
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

/** What the indexer serves for a publication: where it happened, never what it said. */
function pointer(overrides: { publisher?: Address; transactionHash?: string } = {}) {
  return {
    publisher: overrides.publisher ?? publisher,
    transactionHash: overrides.transactionHash ?? txHash,
    blockNumber: '17',
    logIndex: 0,
  };
}

describe('PublishedData API cache', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads active status from the indexer and content from the resolver', async () => {
    const content = toBytes('hello from the api');
    const dataId = dataIdOf(content);
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ status: 'active', publication: pointer() }), { status: 200 });
    }) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery(), { contentResolver: fakeContentResolver([content]) });

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

  it('never receives content bytes from the indexer', async () => {
    // The whole point of the change: even if a caller wanted the indexer to hand over content,
    // the route has none to give, so a response carrying only a pointer must still resolve.
    const content = toBytes('bytes the indexer has never seen');
    const dataId = dataIdOf(content);
    let responseBody = '';
    globalThis.fetch = (async () => {
      responseBody = JSON.stringify({ status: 'active', publisher, dataId, publication: pointer() });
      return new Response(responseBody, { status: 200 });
    }) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery(), { contentResolver: fakeContentResolver([content]) });

    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.ok(!responseBody.includes('"data"'));
    assert.ok(!responseBody.includes('"retractedData"'));
  });

  it('keeps retracted data behind the retracted status', async () => {
    const content = toBytes('retracted but recoverable when explicitly requested');
    const dataId = dataIdOf(content);
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ status: 'retracted', publication: pointer() }),
      { status: 200 },
    )) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery(), { contentResolver: fakeContentResolver([content]) });

    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.equal(await cache.isPublished(publisher, dataId), true);
    assert.equal(await cache.isRetracted(publisher, dataId), true);
  });

  it('maps not-published responses to an empty cache entry', async () => {
    const dataId = dataIdOf(toBytes('never published'));
    globalThis.fetch = (async () => new Response(JSON.stringify({ status: 'not-published' }), { status: 200 })) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery(), { contentResolver: fakeContentResolver([]) });

    assert.equal(await cache.getPublishedData(publisher, dataId), null);
    assert.equal(await cache.isPublished(publisher, dataId), false);
    assert.equal(await cache.isRetracted(publisher, dataId), false);
  });

  it('throws instead of returning null when the content cannot be fetched', async () => {
    const dataId = dataIdOf(toBytes('published but unreachable'));
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ status: 'active', publication: pointer() }),
      { status: 200 },
    )) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery(), { contentResolver: failingContentResolver() });

    await assert.rejects(
      () => cache.getPublishedData(publisher, dataId),
      (error: unknown) => error instanceof ContentUnavailableError,
    );
    // The publication fact itself is unaffected by the content outage.
    assert.equal(await cache.isPublished(publisher, dataId), true);
  });

  it('does not cache not-published publisher reads so freshly indexed data can appear', async () => {
    const content = toBytes('late indexed publisher content');
    const dataId = dataIdOf(content);
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ status: 'not-published' }), { status: 200 })
        : new Response(JSON.stringify({ status: 'active', publication: pointer() }), { status: 200 });
    }) as typeof fetch;

    const cache = createPublishedDataApiCache(machinery(), { contentResolver: fakeContentResolver([content]) });

    assert.equal(await cache.getPublishedData(publisher, dataId), null);
    assert.deepEqual(await cache.getPublishedData(publisher, dataId), content);
    assert.equal(calls, 2);
  });

  it('resolves dataId-first documents through the by-CID endpoint', async () => {
    const content = toBytes('cid-first api content');
    const dataId = dataIdOf(content);
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ status: 'active', livePublishers: [publisher], publications: [pointer()] }), { status: 200 });
    }) as typeof fetch;

    const resolveByCid = createPublishedDataApiCidResolver(machinery(), { contentResolver: fakeContentResolver([content]) });

    assert.deepEqual(await resolveByCid(dataId), { status: 'active', data: content, livePublishers: [getAddress(publisher)] });
    assert.deepEqual(await resolveByCid(dataId), { status: 'active', data: content, livePublishers: [getAddress(publisher)] });
    assert.equal(requests.length, 1, 'resolver should cache by dataId');
    const requestedUrl = new URL(requests[0]!);
    assert.equal(requestedUrl.pathname.toLowerCase(), `/api/published-data/${dataId}`);
    assert.ok(requests[0]?.includes('chainId=31337'));
    assert.ok(requests[0]?.includes(`contractAddress=${publishedDataAddress}`));
  });

  it('falls back to another publication when the first transaction cannot be read', async () => {
    // Every publication of a CID carries identical bytes, so an unreadable transaction is
    // routed around rather than being fatal.
    const content = toBytes('recoverable from the second publisher');
    const dataId = dataIdOf(content);
    const other = '0x00000000000000000000000000000000000000b2' as Address;
    const deadTx = `0x${'cd'.repeat(32)}`;
    globalThis.fetch = (async () => new Response(JSON.stringify({
      status: 'active',
      livePublishers: [publisher, other],
      publications: [pointer({ transactionHash: deadTx }), pointer({ publisher: other })],
    }), { status: 200 })) as typeof fetch;

    const working = fakeContentResolver([content]);
    const resolveByCid = createPublishedDataApiCidResolver(machinery(), {
      contentResolver: {
        async resolve(p) {
          if (p.transactionHash === deadTx) throw new Error('transaction pruned by the RPC provider');
          return working.resolve(p);
        },
      },
    });

    const result = await resolveByCid(dataId);
    assert.equal(result.status, 'active');
    assert.deepEqual((result as { data: Uint8Array }).data, content);
  });

  it('passes honored retractors to the by-CID endpoint and caches policies separately', async () => {
    const content = toBytes('policy aware api content');
    const dataId = dataIdOf(content);
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ status: 'active', livePublishers: [publisher], publications: [pointer()] }), { status: 200 });
    }) as typeof fetch;

    const resolveByCid = createPublishedDataApiCidResolver(machinery(), { contentResolver: fakeContentResolver([content]) });
    const honoredRetractor = '0x00000000000000000000000000000000000000B2' as Address;

    assert.deepEqual(await resolveByCid(dataId), { status: 'active', data: content, livePublishers: [getAddress(publisher)] });
    assert.deepEqual(await resolveByCid(dataId, { honoredRetractors: [honoredRetractor] }), { status: 'active', data: content, livePublishers: [getAddress(publisher)] });
    assert.equal(requests.length, 2, 'different display policies must not share a cached response');
    const policyUrl = new URL(requests[1]!);
    assert.equal(policyUrl.searchParams.get('honoredRetractors'), getAddress(honoredRetractor));
  });

  it('does not cache not-published by-CID reads so freshly indexed documents can appear', async () => {
    const content = toBytes('late indexed cid content');
    const dataId = dataIdOf(content);
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ status: 'not-published' }), { status: 200 })
        : new Response(JSON.stringify({ status: 'active', livePublishers: [publisher], publications: [pointer()] }), { status: 200 });
    }) as typeof fetch;

    const resolveByCid = createPublishedDataApiCidResolver(machinery(), { contentResolver: fakeContentResolver([content]) });

    assert.deepEqual(await resolveByCid(dataId), { status: 'not-published' });
    assert.deepEqual(await resolveByCid(dataId), { status: 'active', data: content, livePublishers: [getAddress(publisher)] });
    assert.equal(calls, 2);
  });

  it('maps by-CID retracted responses to CidResolution', async () => {
    const content = toBytes('all publishers retracted');
    const dataId = dataIdOf(content);
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ status: 'retracted', publications: [pointer()] }),
      { status: 200 },
    )) as typeof fetch;

    const resolveByCid = createPublishedDataApiCidResolver(machinery(), { contentResolver: fakeContentResolver([content]) });

    assert.deepEqual(await resolveByCid(dataId), { status: 'retracted', retractedData: content });
  });
});
