import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { toBytes } from 'viem';
import { computePublishedDataId, publishedDataIdToCid } from './id.js';
import { createIpfsContentResolver, type PublishedDataCidFetcher } from './ipfs-resolver.js';
import { ContentUnavailableError, resolvePublishedContent } from './content-resolver.js';
import type { PublicationPointer } from './content-resolver.js';
import type { PublishedDataId } from './types.js';

const PUBLISHER = '0x1111111111111111111111111111111111111111' as const;

function pointer(dataId: PublishedDataId, overrides: Partial<PublicationPointer> = {}): PublicationPointer {
  return { publisher: PUBLISHER, dataId, ...overrides };
}

/** A fetcher backed by a CID -> bytes map, recording what it was asked for. */
function storeFetcher(entries: Record<string, Uint8Array>) {
  const asked: string[] = [];
  const fetchCid: PublishedDataCidFetcher = async (cid) => {
    asked.push(cid);
    return entries[cid] ?? null;
  };
  return { fetchCid, asked };
}

describe('published-data IPFS resolver', () => {
  it('derives the lookup CID from dataId alone, with no extra state', async () => {
    const content = toBytes('durable mirror content');
    const dataId = computePublishedDataId(content);
    const { fetchCid, asked } = storeFetcher({ [publishedDataIdToCid(dataId)]: content });

    const resolved = await createIpfsContentResolver({ fetchCid }).resolve(pointer(dataId));

    assert.deepEqual(resolved, content);
    assert.deepEqual(asked, [publishedDataIdToCid(dataId)]);
  });

  it('ignores publisher and transaction fields, so anyone can heal a missing mirror', async () => {
    // The copier that pinned these bytes need not be whoever published them on-chain. Because the
    // key is the content hash, a pointer with no transaction at all still resolves.
    const content = toBytes('healed by a third party');
    const dataId = computePublishedDataId(content);
    const { fetchCid } = storeFetcher({ [publishedDataIdToCid(dataId)]: content });
    const resolver = createIpfsContentResolver({ fetchCid });

    const viaOtherPublisher = await resolver.resolve(
      pointer(dataId, { publisher: '0x2222222222222222222222222222222222222222' }),
    );
    const withNoTransaction = await resolver.resolve(pointer(dataId));

    assert.deepEqual(viaOtherPublisher, content);
    assert.deepEqual(withNoTransaction, content);
  });

  it('returns null for a mirror that has not been populated yet', async () => {
    // Not an error: an un-copied publication is the expected case while the copier catches up,
    // and createFallbackContentResolver needs to move on quietly.
    const dataId = computePublishedDataId(toBytes('never copied'));
    const { fetchCid } = storeFetcher({});

    assert.equal(await createIpfsContentResolver({ fetchCid }).resolve(pointer(dataId)), null);
  });

  it('discards bytes that do not hash to the published dataId', async () => {
    // A gateway serving the wrong content must be indistinguishable from one serving none. This is
    // what makes an untrusted public gateway a safe backend.
    const dataId = computePublishedDataId(toBytes('the real content'));
    const fetchCid: PublishedDataCidFetcher = async () => toBytes('substituted content');
    const resolver = createIpfsContentResolver({ fetchCid });

    await assert.rejects(
      () => resolvePublishedContent(resolver, dataId, [pointer(dataId)]),
      (error: unknown) => error instanceof ContentUnavailableError
        && /does not hash to the published dataId/.test((error as Error).message),
    );
  });

  it('resolves through the verifying path when the mirror is honest', async () => {
    const content = toBytes('verified end to end');
    const dataId = computePublishedDataId(content);
    const { fetchCid } = storeFetcher({ [publishedDataIdToCid(dataId)]: content });

    const resolved = await resolvePublishedContent(
      createIpfsContentResolver({ fetchCid }),
      dataId,
      [pointer(dataId)],
    );

    assert.deepEqual(resolved, content);
  });
});
