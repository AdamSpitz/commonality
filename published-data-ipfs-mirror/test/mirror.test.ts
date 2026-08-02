import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { computePublishedDataId, publishedDataIdToCid } from '@commonality/sdk/published-data';
import { addPublishedDataToIpfs, MAX_RAW_BLOCK_BYTES } from '../src/ipfs.js';
import { mirrorPublication } from '../src/mirror.js';

const content = new TextEncoder().encode('{"text":"hello"}');
const dataId = computePublishedDataId(content);
const publisher = '0x0000000000000000000000000000000000000001' as const;
const transactionHash = `0x${'12'.repeat(32)}` as const;

describe('PublishedData IPFS mirror', () => {
  it('adds and pins with the identity-preserving IPFS flags', async () => {
    let requestUrl = '';
    const cid = await addPublishedDataToIpfs('http://ipfs:5001', dataId, content, async (input) => {
      requestUrl = String(input);
      return new Response(JSON.stringify({ Hash: publishedDataIdToCid(dataId) }), { status: 200 });
    });
    const url = new URL(requestUrl);
    assert.equal(url.pathname, '/api/v0/add');
    assert.equal(url.searchParams.get('cid-version'), '1');
    assert.equal(url.searchParams.get('raw-leaves'), 'true');
    assert.equal(url.searchParams.get('pin'), 'true');
    assert.equal(cid, publishedDataIdToCid(dataId));
  });

  it('rejects content above the one-block identity boundary', async () => {
    await assert.rejects(
      addPublishedDataToIpfs('http://ipfs:5001', dataId, new Uint8Array(MAX_RAW_BLOCK_BYTES + 1)),
      /supports at most/,
    );
  });

  it('refuses an unexpected CID from IPFS', async () => {
    await assert.rejects(
      addPublishedDataToIpfs('http://ipfs:5001', dataId, content, async () =>
        new Response(JSON.stringify({ Hash: 'bafywrong' }), { status: 200 })),
      /expected raw CID/,
    );
  });

  it('recovers, verifies, then pins third-party publication bytes', async () => {
    let added: Uint8Array | undefined;
    const cid = await mirrorPublication(
      { publisher, dataId, transactionHash, blockNumber: 3n, logIndex: 1 },
      {
        ipfsApiUrl: 'http://ipfs:5001',
        resolveContent: { resolve: async () => content },
        addToIpfs: async (_url, _dataId, bytes) => {
          added = bytes;
          return publishedDataIdToCid(dataId);
        },
      },
    );
    assert.deepEqual(added, content);
    assert.equal(cid, publishedDataIdToCid(dataId));
  });

  it('does not pin bytes that fail dataId verification', async () => {
    await assert.rejects(
      mirrorPublication(
        { publisher, dataId, transactionHash, blockNumber: 3n, logIndex: 1 },
        {
          ipfsApiUrl: 'http://ipfs:5001',
          resolveContent: { resolve: async () => new TextEncoder().encode('wrong') },
          addToIpfs: async () => { throw new Error('must not add'); },
        },
      ),
      /does not match/,
    );
  });
});
