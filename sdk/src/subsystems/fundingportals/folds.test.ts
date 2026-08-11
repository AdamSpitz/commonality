import assert from 'assert';
import {
  foldAlignmentAttestations,
  type DecodedAlignmentRevocation,
} from './folds.js';
import type { AlignmentAttestationEvent } from './events.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';

const ATTESTER = '0x1111111111111111111111111111111111111111' as const;
const SUBJECT = '0x0000000000000000000000002222222222222222222222222222222222222222' as const;
const SUBJECT_2 = '0x0000000000000000000000003333333333333333333333333333333333333333' as const;
const CONTRACT_ADDRESS = '0x9999999999999999999999999999999999999999' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TX_HASH_2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

const STATEMENT_CID = fakeIpfsCidV1('statement-1');
const TOPIC_CID_1 = fakeIpfsCidV1('topic-1');
const TOPIC_CID_2 = fakeIpfsCidV1('topic-2');
const STATEMENT_CID_2 = fakeIpfsCidV1('statement-2');

function makeEvent(overrides: Partial<AlignmentAttestationEvent> = {}): AlignmentAttestationEvent {
  return {
    contractAddress: CONTRACT_ADDRESS,
    attester: ATTESTER,
    subjectId: SUBJECT,
    statementId: STATEMENT_CID,
    topicStatementId: TOPIC_CID_1,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeRevocation(
  overrides: Partial<DecodedAlignmentRevocation> = {},
): DecodedAlignmentRevocation {
  return {
    contractAddress: CONTRACT_ADDRESS,
    attester: ATTESTER,
    subjectId: SUBJECT,
    statementId: STATEMENT_CID,
    topicStatementId: TOPIC_CID_1,
    blockNumber: 200n,
    blockTimestamp: 1700001000n,
    transactionHash: TX_HASH_2,
    logIndex: 0,
    revoked: true,
    ...overrides,
  };
}

// ============================================================================
// foldAlignmentAttestations
// ============================================================================

describe('foldAlignmentAttestations', () => {
  it('returns empty array for empty events', () => {
    assert.deepStrictEqual(foldAlignmentAttestations([]), []);
  });

  it('returns one attestation for a single event', () => {
    const result = foldAlignmentAttestations([makeEvent()]);
    assert.strictEqual(result.length, 1);
    const att = result[0]!;
    assert.strictEqual(att.attester, ATTESTER);
    assert.strictEqual(att.subjectId, SUBJECT);
    assert.strictEqual(att.statementCid, STATEMENT_CID);
    assert.strictEqual(att.topicStatementCid, TOPIC_CID_1);
    assert.strictEqual(att.createdAt, '1700000000');
    assert.strictEqual(att.blockNumber, '100');
  });

  it('keeps alignments for different topics as separate records', () => {
    const events = [
      makeEvent({ blockNumber: 100n, blockTimestamp: 1700000000n, topicStatementId: TOPIC_CID_1, transactionHash: TX_HASH }),
      makeEvent({ blockNumber: 200n, blockTimestamp: 1700001000n, topicStatementId: TOPIC_CID_2, transactionHash: TX_HASH_2, logIndex: 0 }),
    ];
    const result = foldAlignmentAttestations(events);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(
      result.map((attestation) => attestation.topicStatementCid).sort(),
      [TOPIC_CID_1, TOPIC_CID_2].sort(),
    );
  });

  it('re-attestation for the same topic preserves original createdAt and blockNumber', () => {
    const events = [
      makeEvent({ blockNumber: 100n, blockTimestamp: 1700000000n, topicStatementId: TOPIC_CID_1, transactionHash: TX_HASH }),
      makeEvent({ blockNumber: 200n, blockTimestamp: 1700001000n, topicStatementId: TOPIC_CID_1, transactionHash: TX_HASH_2 }),
    ];
    const result = foldAlignmentAttestations(events);
    assert.strictEqual(result[0]!.createdAt, '1700000000');
    assert.strictEqual(result[0]!.blockNumber, '100');
  });

  it('different (attester, subject, statement) triples create separate records', () => {
    const events = [
      makeEvent({ subjectId: SUBJECT, statementId: STATEMENT_CID }),
      makeEvent({ subjectId: SUBJECT_2, statementId: STATEMENT_CID }),
      makeEvent({ subjectId: SUBJECT, statementId: STATEMENT_CID_2 }),
    ];
    const result = foldAlignmentAttestations(events);
    assert.strictEqual(result.length, 3);
  });

  it('address comparison is case-insensitive for deduplication', () => {
    const lower = makeEvent({ attester: '0xaaaa000000000000000000000000000000000001' as const });
    const upper = makeEvent({ attester: '0xAAaa000000000000000000000000000000000001' as const, topicStatementId: TOPIC_CID_1, blockNumber: 200n });
    const result = foldAlignmentAttestations([lower, upper]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.topicStatementCid, TOPIC_CID_1);
  });

  it('removes a revoked alignment regardless of response order', () => {
    const result = foldAlignmentAttestations([
      makeRevocation(),
      makeEvent({ blockNumber: 100n }),
    ]);
    assert.deepStrictEqual(result, []);
  });

  it('revokes only the matching topic-scoped alignment', () => {
    const result = foldAlignmentAttestations([
      makeEvent({ topicStatementId: TOPIC_CID_1 }),
      makeEvent({ topicStatementId: TOPIC_CID_2, logIndex: 1 }),
      makeRevocation({ topicStatementId: TOPIC_CID_1 }),
    ]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.topicStatementCid, TOPIC_CID_2);
  });

  it('restores an alignment re-attested after revocation', () => {
    const result = foldAlignmentAttestations([
      makeRevocation(),
      makeEvent({ blockNumber: 300n, topicStatementId: TOPIC_CID_2 }),
      makeEvent({ blockNumber: 100n }),
    ]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.topicStatementCid, TOPIC_CID_2);
    assert.strictEqual(result[0]!.blockNumber, '300');
  });

  it('does not mutate the input array', () => {
    const events = [makeEvent()];
    const copy = [...events];
    foldAlignmentAttestations(events);
    assert.deepStrictEqual(events, copy);
  });
});
