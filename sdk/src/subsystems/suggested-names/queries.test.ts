import assert from 'assert';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { SuggestedNamesAbi } from '../../abis/conceptspace.js';
import type { SDKMachinery } from '../../machinery.js';
import { getSuggestedDisplayName } from './queries.js';

const ALICE = '0x1111111111111111111111111111111111111111' as const;
const BOB = '0x2222222222222222222222222222222222222222' as const;

describe('suggested name queries', () => {
  it('keeps self-suggested names eligible beyond the first thousand events', async () => {
    const originalFetch = globalThis.fetch;
    const events = Array.from({ length: 1001 }, (_, index) => {
      const attester = index === 0 ? ALICE : BOB;
      const topics = encodeEventTopics({
        abi: SuggestedNamesAbi, eventName: 'NameSuggested',
        args: { attester, accountBeingNamed: ALICE },
      });
      return {
        id: String(index), contractAddress: BOB, eventName: 'NameSuggested',
        blockNumber: String(index + 1), blockTimestamp: '1',
        transactionHash: `0x${'00'.repeat(32)}`, logIndex: 0,
        topic0: topics[0], topic1: topics[1], topic2: topics[2], topic3: null,
        data: encodeAbiParameters([{ type: 'string' }], [index === 0 ? 'Alice' : 'Other']),
      };
    });
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('topic2'), `0x${'0'.repeat(24)}${ALICE.slice(2)}`);
      const limit = Number(url.searchParams.get('limit'));
      return new Response(JSON.stringify({ items: events.slice(-limit) }));
    };
    try {
      const machinery = {
        eventCacheUrl: 'https://cache.example', defaultChainId: 31337,
        contractAddresses: { suggestedNames: BOB },
      } as unknown as SDKMachinery;
      assert.equal((await getSuggestedDisplayName(machinery, ALICE))?.name, 'Alice');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
