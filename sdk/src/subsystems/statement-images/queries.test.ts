import assert from 'node:assert/strict';
import { encodeEventTopics } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { StatementImagesAbi } from '../../abis.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { loadSignerImageAdoptions, loadStatementImageRecords } from './queries.js';

const signer = '0x1111111111111111111111111111111111111111';
const contractAddress = '0x2222222222222222222222222222222222222222';
const statementId = `0x${'ab'.repeat(32)}` as const;

function adoption(index: number): RawEventFromCache {
  const imageId = `0x${index.toString(16).padStart(64, '0')}` as const;
  const topics = encodeEventTopics({
    abi: StatementImagesAbi,
    eventName: 'ImageAdopted',
    args: { signer, statementId, imageId },
  });
  return {
    id: String(index), contractAddress, eventName: 'ImageAdopted',
    blockNumber: '10', blockTimestamp: '1700000000', logIndex: index,
    transactionHash: `0x${'aa'.repeat(32)}`,
    topic0: topics[0] as string, topic1: topics[1] as string,
    topic2: topics[2] as string, topic3: topics[3] as string, data: '0x',
  };
}

describe('statement image query pagination', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  for (const scope of ['statement', 'signer'] as const) {
    it(`loads every adoption across cursor pages for a ${scope}`, async () => {
      const records = Array.from({ length: 1001 }, (_, i) => adoption(i + 1));
      let followedSecondPage = false;
      globalThis.fetch = (async (input: string | URL | Request) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        assert.equal(url.searchParams.get('contractAddress'), contractAddress);
        assert.equal(url.searchParams.get(scope === 'statement' ? 'topic2' : 'topic1'),
          scope === 'statement' ? statementId : `0x${'0'.repeat(24)}${signer.slice(2)}`);
        const matching = url.searchParams.get('eventName') === 'ImageAdopted';
        const after = url.searchParams.get('after');
        if (matching && after) followedSecondPage = true;
        return Response.json({
          items: !matching ? [] : after ? records.slice(1000) : records.slice(0, 1000),
          truncated: matching && !after,
          nextCursor: matching && !after ? 'second-page' : null,
          checkpoint: '10',
          completeThroughCheckpoint: !matching || Boolean(after),
        });
      }) as typeof fetch;
      const machinery = createSDKMachinery({
        eventCacheUrl: 'http://localhost:42069', defaultChainId: 31337,
        contractAddresses: { statementImages: contractAddress },
      });
      const adoptions = scope === 'statement'
        ? (await loadStatementImageRecords(machinery, statementId)).adoptions
        : await loadSignerImageAdoptions(machinery, signer);
      assert.equal(adoptions.length, 1001);
      assert.equal(followedSecondPage, true);
    });
  }
});
