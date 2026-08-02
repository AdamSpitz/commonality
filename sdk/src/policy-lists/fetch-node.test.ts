import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { MockAgent } from 'undici';
import { fetchPolicyArtifact } from './fetch-node.js';

const publicLookup = async () => [{ address: '203.0.113.10', family: 4 as const }];

describe('policy artifact HTTPS fetcher', () => {
  it('streams and decompresses a bounded HTTPS artifact', async () => {
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    dispatcher.get('https://lists.example').intercept({ path: '/starter.json', method: 'GET' }).reply(
      200,
      gzipSync('{"entries":[]}'),
      { headers: { 'content-encoding': 'gzip' } },
    );
    const bytes = await fetchPolicyArtifact('https://lists.example/starter.json', { dispatcher, lookup: publicLookup });
    assert.equal(Buffer.from(bytes).toString(), '{"entries":[]}');
    await dispatcher.close();
  });

  it('rejects non-public DNS results before issuing a request', async () => {
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    await assert.rejects(
      fetchPolicyArtifact('https://lists.example/list.json', {
        dispatcher,
        lookup: async () => [{ address: '127.0.0.1', family: 4 }],
      }),
      /non-public address/,
    );
    await dispatcher.close();
  });

  it('allows an explicit operator egress exception', async () => {
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    dispatcher.get('https://internal.example').intercept({ path: '/list.json', method: 'GET' }).reply(200, '{}');
    const bytes = await fetchPolicyArtifact('https://internal.example/list.json', {
      dispatcher,
      egressAllowlist: ['internal.example'],
      lookup: async () => [{ address: '10.0.0.4', family: 4 }],
    });
    assert.equal(Buffer.from(bytes).toString(), '{}');
    await dispatcher.close();
  });

  it('checks every redirect target and enforces redirect limits', async () => {
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    dispatcher.get('https://lists.example').intercept({ path: '/one', method: 'GET' }).reply(302, '', { headers: { location: '/two' } });
    dispatcher.get('https://lists.example').intercept({ path: '/two', method: 'GET' }).reply(302, '', { headers: { location: '/three' } });
    await assert.rejects(
      fetchPolicyArtifact('https://lists.example/one', { dispatcher, lookup: publicLookup, limits: { maxRedirects: 1 } }),
      /redirect limit/,
    );
    await dispatcher.close();
  });

  it('rejects compressed and decompressed responses beyond their bounds', async () => {
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    dispatcher.get('https://lists.example').intercept({ path: '/large', method: 'GET' }).reply(200, '12345');
    await assert.rejects(
      fetchPolicyArtifact('https://lists.example/large', { dispatcher, lookup: publicLookup, limits: { maxCompressedBytes: 4 } }),
      /compressed-byte limit/,
    );
    dispatcher.get('https://lists.example').intercept({ path: '/bomb', method: 'GET' }).reply(200, gzipSync('x'.repeat(1000)), { headers: { 'content-encoding': 'gzip' } });
    await assert.rejects(
      fetchPolicyArtifact('https://lists.example/bomb', { dispatcher, lookup: publicLookup, limits: { maxCompressionRatio: 2 } }),
      /decompression bounds/,
    );
    await dispatcher.close();
  });
});
