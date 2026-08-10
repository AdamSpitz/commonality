import assert from 'assert';
import { encodeEventTopics, encodeAbiParameters } from 'viem';
import {
  AlignmentAttestationsAbi,
  AssuranceContractAbi,
  ImplicationsAbi,
  NudgePublicationsAbi,
} from '../abis.js';
import type { RawEventFromCache } from './eventCacheClient.js';
import {
  decodeAlignmentRevokedEvent,
  decodeContractMetadataUpdatedEvent,
  decodeImplicationRevokedEvent,
  decodeNudgesPublishedEvent,
  decodeSuccessRevokedEvent,
} from './eventDecoder.js';
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
      }) as readonly `0x${string}`[];

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

  describe('revocation events', () => {
    it('decodes an ImplicationRevoked event identity', () => {
      const fromCid = fakeIpfsCidV1('from');
      const toCid = fakeIpfsCidV1('to');
      const topics = encodeEventTopics({
        abi: ImplicationsAbi,
        eventName: 'ImplicationRevoked',
        args: {
          attester: CONTRACT_ADDR,
          fromStatementCid: cidToBytes32(fromCid),
          toStatementCid: cidToBytes32(toCid),
        },
      }) as readonly `0x${string}`[];
      const raw: RawEventFromCache = {
        id: '3', contractAddress: CONTRACT_ADDR, eventName: 'ImplicationRevoked',
        blockNumber: '102', blockTimestamp: '1700000200', transactionHash: TX_HASH,
        logIndex: 2, topic0: topics[0] ?? null, topic1: topics[1] ?? null,
        topic2: topics[2] ?? null, topic3: topics[3] ?? null, data: '0x',
      };

      const decoded = decodeImplicationRevokedEvent(raw);
      assert.ok(decoded);
      assert.strictEqual(decoded.attester, CONTRACT_ADDR);
      assert.strictEqual(decoded.fromStatementCid, fromCid);
      assert.strictEqual(decoded.toStatementCid, toCid);
      assert.strictEqual(decoded.revoked, true);
    });

    it('decodes a SuccessRevoked event identity and topic', () => {
      const statementCid = fakeIpfsCidV1('success-statement');
      const topicCid = fakeIpfsCidV1('success-topic');
      const subjectId = `0x${'33'.repeat(32)}` as const;
      const topics = encodeEventTopics({
        abi: AlignmentAttestationsAbi,
        eventName: 'SuccessRevoked',
        args: {
          attester: CONTRACT_ADDR,
          subjectId,
          statementId: cidToBytes32(statementCid),
        },
      }) as readonly `0x${string}`[];
      const raw: RawEventFromCache = {
        id: 'success-revoked', contractAddress: CONTRACT_ADDR, eventName: 'SuccessRevoked',
        blockNumber: '103', blockTimestamp: '1700000300', transactionHash: TX_HASH,
        logIndex: 3, topic0: topics[0] ?? null, topic1: topics[1] ?? null,
        topic2: topics[2] ?? null, topic3: topics[3] ?? null,
        data: encodeAbiParameters([{ type: 'bytes32' }], [cidToBytes32(topicCid)]),
      };

      const decoded = decodeSuccessRevokedEvent(raw);
      assert.ok(decoded);
      assert.strictEqual(decoded.subjectId, subjectId);
      assert.strictEqual(decoded.statementId, statementCid);
      assert.strictEqual(decoded.topicStatementId, topicCid);
      assert.strictEqual(decoded.revoked, true);
    });

    it('decodes an AlignmentRevoked event identity and topic', () => {
      const statementCid = fakeIpfsCidV1('statement');
      const topicCid = fakeIpfsCidV1('topic');
      const subjectId = `0x${'22'.repeat(32)}` as const;
      const topics = encodeEventTopics({
        abi: AlignmentAttestationsAbi,
        eventName: 'AlignmentRevoked',
        args: {
          attester: CONTRACT_ADDR,
          subjectId,
          statementId: cidToBytes32(statementCid),
        },
      }) as readonly `0x${string}`[];
      const raw: RawEventFromCache = {
        id: '4', contractAddress: CONTRACT_ADDR, eventName: 'AlignmentRevoked',
        blockNumber: '103', blockTimestamp: '1700000300', transactionHash: TX_HASH,
        logIndex: 3, topic0: topics[0] ?? null, topic1: topics[1] ?? null,
        topic2: topics[2] ?? null, topic3: topics[3] ?? null,
        data: encodeAbiParameters([{ type: 'bytes32' }], [cidToBytes32(topicCid)]),
      };

      const decoded = decodeAlignmentRevokedEvent(raw);
      assert.ok(decoded);
      assert.strictEqual(decoded.subjectId, subjectId);
      assert.strictEqual(decoded.statementId, statementCid);
      assert.strictEqual(decoded.topicStatementId, topicCid);
      assert.strictEqual(decoded.revoked, true);
    });
  });
});
