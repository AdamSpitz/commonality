import assert from 'assert';
import { encodeEventTopics, encodeAbiParameters } from 'viem';
import { AssuranceContractAbi, NudgePublicationsAbi } from '../abis.js';
import type { RawEventFromCache } from './eventCacheClient.js';
import { decodeContractMetadataUpdatedEvent, decodeNudgesPublishedEvent } from './eventDecoder.js';
import { fakeIpfsCidV1 } from './test-helpers.js';
import { cidToBytes32 } from './cid-types.js';

const CONTRACT_ADDR = '0x1111111111111111111111111111111111111111';
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * Encode an event into a RawEventFromCache using viem's encoding functions.
 * This mimics how events arrive from the indexer's event cache.
 */
function encodeToRawEvent(
  abi: readonly unknown[],
  eventName: string,
  nonIndexedParams: { types: readonly { type: string }[]; values: readonly unknown[] },
  overrides: Partial<RawEventFromCache> = {},
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi,
    eventName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as `0x${string}`[];

  const data = encodeAbiParameters(
    nonIndexedParams.types as readonly { type: string; name?: string }[],
    nonIndexedParams.values as readonly unknown[],
  );

  return {
    id: '1',
    contractAddress: CONTRACT_ADDR,
    eventName,
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: TX_HASH,
    logIndex: 0,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: topics[3] ?? null,
    data,
    ...overrides,
  };
}

describe('eventDecoder', () => {
  describe('decodeContractMetadataUpdatedEvent', () => {
    it('roundtrips a ContractMetadataUpdated event', () => {
      const metadataUri = 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const raw = encodeToRawEvent(
        AssuranceContractAbi,
        'ContractMetadataUpdated',
        { types: [{ type: 'string' }], values: [metadataUri] },
      );

      const decoded = decodeContractMetadataUpdatedEvent(raw);

      assert.ok(decoded, 'should decode successfully');
      assert.strictEqual(decoded.metadata, metadataUri);
      assert.strictEqual(decoded.contractAddress, CONTRACT_ADDR);
      assert.strictEqual(decoded.blockNumber, 100n);
      assert.strictEqual(decoded.blockTimestamp, 1700000000n);
      assert.strictEqual(decoded.transactionHash, TX_HASH);
      assert.strictEqual(decoded.logIndex, 0);
    });

    it('returns null for a non-matching event name', () => {
      const raw = encodeToRawEvent(
        AssuranceContractAbi,
        'ContractMetadataUpdated',
        { types: [{ type: 'string' }], values: ['ipfs://test'] },
        { eventName: 'SomeOtherEvent' },
      );

      const decoded = decodeContractMetadataUpdatedEvent(raw);
      assert.strictEqual(decoded, null);
    });
  });

  describe('decodeNudgesPublishedEvent', () => {
    it('roundtrips a NudgesPublished event', () => {
      const publicationCid = fakeIpfsCidV1('publication');
      const topics = encodeEventTopics({
        abi: NudgePublicationsAbi,
        eventName: 'NudgesPublished',
        args: {
          nudger: CONTRACT_ADDR,
          batchCid: cidToBytes32(publicationCid),
        },
      });

      const raw: RawEventFromCache = {
        id: '2',
        contractAddress: CONTRACT_ADDR,
        eventName: 'NudgesPublished',
        blockNumber: '101',
        blockTimestamp: '1700000100',
        transactionHash: TX_HASH,
        logIndex: 1,
        topic0: topics[0] ?? null,
        topic1: topics[1] ?? null,
        topic2: topics[2] ?? null,
        topic3: topics[3] ?? null,
        data: '0x',
      };

      const decoded = decodeNudgesPublishedEvent(raw);

      assert.ok(decoded, 'should decode successfully');
      assert.strictEqual(decoded.nudger, CONTRACT_ADDR);
      assert.strictEqual(decoded.publicationCid, publicationCid);
      assert.strictEqual(decoded.blockNumber, 101n);
      assert.strictEqual(decoded.blockTimestamp, 1700000100n);
      assert.strictEqual(decoded.logIndex, 1);
    });
  });
});
