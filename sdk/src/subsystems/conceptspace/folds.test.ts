import assert from 'assert';
import {
  foldStatementBeliefs,
  foldUserBeliefs,
  foldImplications,
  foldAllStatements,
} from './folds.js';
import type { DirectSupportEvent, ImplicationAttestationEvent } from './events.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';

const USER_A = '0x1111111111111111111111111111111111111111' as const;
const USER_B = '0x2222222222222222222222222222222222222222' as const;
const USER_C = '0x3333333333333333333333333333333333333333' as const;
const ATTESTER = '0x4444444444444444444444444444444444444444' as const;
const CONTRACT_ADDRESS = '0x9999999999999999999999999999999999999999' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TX_HASH_2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

const STMT_A = fakeIpfsCidV1('statement-a');
const STMT_B = fakeIpfsCidV1('statement-b');
const STMT_C = fakeIpfsCidV1('statement-c');
const EXPL_1 = fakeIpfsCidV1('explanation-1');
const EXPL_2 = fakeIpfsCidV1('explanation-2');

function makeDirectSupportEvent(overrides: Partial<DirectSupportEvent> = {}): DirectSupportEvent {
  return {
    contractAddress: CONTRACT_ADDRESS,
    user: USER_A,
    statementId: STMT_A,
    beliefState: 1,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeImplicationEvent(overrides: Partial<ImplicationAttestationEvent> = {}): ImplicationAttestationEvent {
  return {
    contractAddress: CONTRACT_ADDRESS,
    attester: ATTESTER,
    fromStatementCid: STMT_A,
    toStatementCid: STMT_B,
    explanationCid: EXPL_1,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

// ============================================================================
// foldStatementBeliefs
// ============================================================================

describe('foldStatementBeliefs', () => {
  it('returns zero counts and empty map for empty events', () => {
    const result = foldStatementBeliefs([]);
    assert.strictEqual(result.believerCount, 0);
    assert.strictEqual(result.disbelieverCount, 0);
    assert.strictEqual(result.beliefs.size, 0);
  });

  it('counts a single believer', () => {
    const result = foldStatementBeliefs([makeDirectSupportEvent({ beliefState: 1 })]);
    assert.strictEqual(result.believerCount, 1);
    assert.strictEqual(result.disbelieverCount, 0);
  });

  it('counts a single disbeliever', () => {
    const result = foldStatementBeliefs([makeDirectSupportEvent({ beliefState: 2 })]);
    assert.strictEqual(result.believerCount, 0);
    assert.strictEqual(result.disbelieverCount, 1);
  });

  it('noOpinion (0) is not counted as believer or disbeliever', () => {
    const result = foldStatementBeliefs([makeDirectSupportEvent({ beliefState: 0 })]);
    assert.strictEqual(result.believerCount, 0);
    assert.strictEqual(result.disbelieverCount, 0);
    assert.strictEqual(result.beliefs.size, 1);
  });

  it('handles multiple users with different beliefs', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, beliefState: 1 }),
      makeDirectSupportEvent({ user: USER_B, beliefState: 2 }),
      makeDirectSupportEvent({ user: USER_C, beliefState: 1, logIndex: 2 }),
    ];
    const result = foldStatementBeliefs(events);
    assert.strictEqual(result.believerCount, 2);
    assert.strictEqual(result.disbelieverCount, 1);
  });

  it('state transition: later event overwrites earlier (believe → disbelieve)', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, beliefState: 1, blockNumber: 100n, transactionHash: TX_HASH }),
      makeDirectSupportEvent({ user: USER_A, beliefState: 2, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldStatementBeliefs(events);
    assert.strictEqual(result.believerCount, 0);
    assert.strictEqual(result.disbelieverCount, 1);
  });

  it('state transition: believe → noOpinion removes from counts', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, beliefState: 1, blockNumber: 100n, transactionHash: TX_HASH }),
      makeDirectSupportEvent({ user: USER_A, beliefState: 0, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldStatementBeliefs(events);
    assert.strictEqual(result.believerCount, 0);
    assert.strictEqual(result.disbelieverCount, 0);
  });

  it('beliefs map uses lowercased address as key', () => {
    const result = foldStatementBeliefs([
      makeDirectSupportEvent({ user: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const, beliefState: 1 }),
    ]);
    assert.ok(result.beliefs.has('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'));
  });

  it('address comparison is case-insensitive for deduplication', () => {
    const events = [
      makeDirectSupportEvent({ user: '0xaaaa000000000000000000000000000000000001' as const, beliefState: 1, blockNumber: 100n }),
      makeDirectSupportEvent({ user: '0xAAAA000000000000000000000000000000000001' as const, beliefState: 2, blockNumber: 200n, logIndex: 1 }),
    ];
    const result = foldStatementBeliefs(events);
    assert.strictEqual(result.beliefs.size, 1);
    assert.strictEqual(result.believerCount, 0);
    assert.strictEqual(result.disbelieverCount, 1);
  });
});

// ============================================================================
// foldUserBeliefs
// ============================================================================

describe('foldUserBeliefs', () => {
  it('returns empty array for empty events', () => {
    assert.deepStrictEqual(foldUserBeliefs([]), []);
  });

  it('returns one UserBelief for a single event', () => {
    const result = foldUserBeliefs([makeDirectSupportEvent({ statementId: STMT_A, beliefState: 1 })]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.statementCid, STMT_A);
    assert.strictEqual(result[0]!.beliefState, 1);
  });

  it('last event wins for a given statement (state transition)', () => {
    const events = [
      makeDirectSupportEvent({ statementId: STMT_A, beliefState: 1, blockNumber: 100n, transactionHash: TX_HASH }),
      makeDirectSupportEvent({ statementId: STMT_A, beliefState: 2, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldUserBeliefs(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.beliefState, 2);
  });

  it('different statements produce separate UserBelief records', () => {
    const events = [
      makeDirectSupportEvent({ statementId: STMT_A, beliefState: 1 }),
      makeDirectSupportEvent({ statementId: STMT_B, beliefState: 2, logIndex: 1 }),
      makeDirectSupportEvent({ statementId: STMT_C, beliefState: 0, logIndex: 2 }),
    ];
    const result = foldUserBeliefs(events);
    assert.strictEqual(result.length, 3);
  });

  it('includes noOpinion (0) beliefs', () => {
    const result = foldUserBeliefs([makeDirectSupportEvent({ beliefState: 0 })]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.beliefState, 0);
  });

  it('does not mutate the input array', () => {
    const events = [makeDirectSupportEvent()];
    const copy = [...events];
    foldUserBeliefs(events);
    assert.deepStrictEqual(events, copy);
  });
});

// ============================================================================
// foldImplications
// ============================================================================

describe('foldImplications', () => {
  it('returns empty array for empty events', () => {
    assert.deepStrictEqual(foldImplications([]), []);
  });

  it('returns one Implication for a single event', () => {
    const result = foldImplications([makeImplicationEvent()]);
    assert.strictEqual(result.length, 1);
    const imp = result[0]!;
    assert.strictEqual(imp.attester, ATTESTER);
    assert.strictEqual(imp.fromStatementCid, STMT_A);
    assert.strictEqual(imp.toStatementCid, STMT_B);
    assert.strictEqual(imp.explanationCid, EXPL_1);
    assert.strictEqual(imp.createdAt, '1700000000');
    assert.strictEqual(imp.blockNumber, '100');
  });

  it('re-attestation updates explanationCid', () => {
    const events = [
      makeImplicationEvent({ blockNumber: 100n, explanationCid: EXPL_1, transactionHash: TX_HASH }),
      makeImplicationEvent({ blockNumber: 200n, explanationCid: EXPL_2, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldImplications(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.explanationCid, EXPL_2);
  });

  it('re-attestation preserves original createdAt and blockNumber', () => {
    const events = [
      makeImplicationEvent({ blockNumber: 100n, blockTimestamp: 1700000000n, explanationCid: EXPL_1, transactionHash: TX_HASH }),
      makeImplicationEvent({ blockNumber: 200n, blockTimestamp: 1700001000n, explanationCid: EXPL_2, transactionHash: TX_HASH_2 }),
    ];
    const result = foldImplications(events);
    assert.strictEqual(result[0]!.createdAt, '1700000000');
    assert.strictEqual(result[0]!.blockNumber, '100');
  });

  it('different (attester, from, to) triples create separate records', () => {
    const events = [
      makeImplicationEvent({ fromStatementCid: STMT_A, toStatementCid: STMT_B }),
      makeImplicationEvent({ fromStatementCid: STMT_A, toStatementCid: STMT_C, logIndex: 1 }),
      makeImplicationEvent({ fromStatementCid: STMT_B, toStatementCid: STMT_C, logIndex: 2 }),
    ];
    const result = foldImplications(events);
    assert.strictEqual(result.length, 3);
  });

  it('attester address comparison is case-insensitive for deduplication', () => {
    const lower = makeImplicationEvent({ attester: '0xaaaa000000000000000000000000000000000001' as const });
    const upper = makeImplicationEvent({ attester: '0xAAAA000000000000000000000000000000000001' as const, explanationCid: EXPL_2, blockNumber: 200n });
    const result = foldImplications([lower, upper]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.explanationCid, EXPL_2);
  });

  it('does not mutate the input array', () => {
    const events = [makeImplicationEvent()];
    const copy = [...events];
    foldImplications(events);
    assert.deepStrictEqual(events, copy);
  });
});

// ============================================================================
// foldAllStatements
// ============================================================================

describe('foldAllStatements', () => {
  it('returns empty map for empty events', () => {
    assert.strictEqual(foldAllStatements([]).size, 0);
  });

  it('returns counts for a single believer event', () => {
    const result = foldAllStatements([makeDirectSupportEvent({ statementId: STMT_A, beliefState: 1 })]);
    assert.ok(result.has(STMT_A));
    assert.strictEqual(result.get(STMT_A)!.believerCount, 1);
    assert.strictEqual(result.get(STMT_A)!.disbelieverCount, 0);
  });

  it('counts believers and disbelievers across multiple users', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_A, beliefState: 1 }),
      makeDirectSupportEvent({ user: USER_B, statementId: STMT_A, beliefState: 2, logIndex: 1 }),
      makeDirectSupportEvent({ user: USER_C, statementId: STMT_A, beliefState: 1, logIndex: 2 }),
    ];
    const result = foldAllStatements(events);
    assert.strictEqual(result.get(STMT_A)!.believerCount, 2);
    assert.strictEqual(result.get(STMT_A)!.disbelieverCount, 1);
  });

  it('handles multiple statements independently', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_A, beliefState: 1 }),
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_B, beliefState: 2, logIndex: 1 }),
      makeDirectSupportEvent({ user: USER_B, statementId: STMT_B, beliefState: 1, logIndex: 2 }),
    ];
    const result = foldAllStatements(events);
    assert.strictEqual(result.get(STMT_A)!.believerCount, 1);
    assert.strictEqual(result.get(STMT_A)!.disbelieverCount, 0);
    assert.strictEqual(result.get(STMT_B)!.believerCount, 1);
    assert.strictEqual(result.get(STMT_B)!.disbelieverCount, 1);
  });

  it('state transition: later event overwrites earlier for the same user+statement', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_A, beliefState: 1, blockNumber: 100n, transactionHash: TX_HASH }),
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_A, beliefState: 2, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldAllStatements(events);
    // USER_A switched from believe to disbelieve
    assert.strictEqual(result.get(STMT_A)!.believerCount, 0);
    assert.strictEqual(result.get(STMT_A)!.disbelieverCount, 1);
  });

  it('noOpinion state does not contribute to counts', () => {
    const events = [
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_A, beliefState: 1, blockNumber: 100n, transactionHash: TX_HASH }),
      makeDirectSupportEvent({ user: USER_A, statementId: STMT_A, beliefState: 0, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldAllStatements(events);
    assert.strictEqual(result.get(STMT_A)!.believerCount, 0);
    assert.strictEqual(result.get(STMT_A)!.disbelieverCount, 0);
  });

  it('does not mutate the input array', () => {
    const events = [makeDirectSupportEvent()];
    const copy = [...events];
    foldAllStatements(events);
    assert.deepStrictEqual(events, copy);
  });
});
