import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics, parseAbi } from 'viem';
import type { SDKMachinery } from '../../machinery.js';
import { bytes32ToCid } from '../../utils/cid-types.js';
import { getNoteIntentAttestationsByStatement } from './queries.js';

describe('statement-scoped note intents', () => {
  it('excludes an intent subsequently moved to another statement', async () => {
    const originalFetch = globalThis.fetch;
    const address = '0x1111111111111111111111111111111111111111';
    const first = `0x${'11'.repeat(32)}` as `0x${string}`;
    const second = `0x${'22'.repeat(32)}` as `0x${string}`;
    const abi = parseAbi(['event NoteIntentAttested(address indexed attester, bytes32 indexed intendedStatementId, uint256 indexed noteId, address noteContract)']);
    const rows = [first, second].map((intendedStatementId, index) => {
      const topics = encodeEventTopics({ abi, eventName: 'NoteIntentAttested', args: { attester: address, intendedStatementId, noteId: 1n } });
      return {
        id: String(index), chainId: 31337, contractAddress: address,
        eventName: 'NoteIntentAttested', blockNumber: String(index + 1),
        blockTimestamp: '100', transactionHash: `0x${'33'.repeat(32)}`, logIndex: 0,
        topic0: topics[0], topic1: topics[1], topic2: topics[2], topic3: topics[3],
        data: encodeAbiParameters([{ type: 'address' }], [address]),
      };
    });
    const requests: URL[] = [];
    globalThis.fetch = (async input => {
      const url = new URL(String(input));
      requests.push(url);
      return new Response(JSON.stringify({ items: url.searchParams.has('topic2') ? [rows[0]] : rows }));
    }) as typeof fetch;
    try {
      const result = await getNoteIntentAttestationsByStatement({ eventCacheUrl: 'http://indexer.test' } as SDKMachinery, bytes32ToCid(first));
      assert.deepEqual(result, []);
      assert.equal(requests.length, 2);
      assert.ok(requests[1]!.searchParams.has('topic3_in'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
