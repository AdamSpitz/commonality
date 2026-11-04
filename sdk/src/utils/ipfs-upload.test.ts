import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { uploadToIPFS } from './ipfs.js';
import { fetchFromMockIPFS, clearMockIPFS } from './mock-ipfs.js';
import { cidToBytes32, bytes32ToCid } from './cid-types.js';

const originalFetch = globalThis.fetch;

describe('raw JSON IPFS uploads', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearMockIPFS();
  });

  it('stores a raw block and returns a CID that survives a chain-digest round trip', async () => {
    const content = { text: 'hello world' };
    const bytes = new TextEncoder().encode(JSON.stringify(content));
    const expected = CID.createV1(0x55, await sha256.digest(bytes)).toString();
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/api/v0/block/put');
      assert.equal(url.searchParams.get('format'), 'raw');
      assert.equal(url.searchParams.get('mhtype'), 'sha2-256');
      assert.equal(url.searchParams.get('pin'), 'true');
      assert.equal(init?.method, 'POST');
      assert.ok(init?.body instanceof FormData);
      const file = init.body.get('file');
      assert.ok(file instanceof Blob);
      assert.equal(await file.text(), JSON.stringify(content));
      return Response.json({ Key: expected, Size: bytes.length });
    }) as typeof fetch;

    const cid = await uploadToIPFS({ apiUrl: 'http://ipfs.test' }, content);
    assert.equal(cid, expected);
    assert.equal(bytes32ToCid(cidToBytes32(cid)), cid);
    assert.equal(await uploadToIPFS({ shouldUseMock: true }, content), cid);
    assert.deepEqual(fetchFromMockIPFS(cid), content);
  });

  it('rejects a node response with the wrong codec', async () => {
    globalThis.fetch = (async () => Response.json({
      Key: 'bafybeifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m',
    })) as typeof fetch;
    await assert.rejects(uploadToIPFS({ apiUrl: 'http://ipfs.test' }, {}), /raw codec/);
  });

  it('surfaces block upload failures', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;
    await assert.rejects(uploadToIPFS({ apiUrl: 'http://ipfs.test' }, {}), /IPFS upload failed: 500/);
  });
});
