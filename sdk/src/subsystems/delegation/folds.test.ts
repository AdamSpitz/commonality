import assert from 'assert';
import { keccak256, encodePacked } from 'viem';
import {
  foldDelegationState,
  foldNote,
  foldNoteIntentAttestations,
  uniqueNotes,
} from './folds.js';
import type { DelegationEvent } from './folds.js';
import type {
  NoteCreatedEvent,
  NoteDelegatedEvent,
  ChainSplitEvent,
  NoteRevokedEvent,
  FundsReclaimedEvent,
  NoteConsumedEvent,
  ERC1155PurchasedEvent,
  RefundedIntoNoteEvent,
  NoteIntentAttestedEvent,
} from './events.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';

// ============================================================================
// Constants
// ============================================================================

const ALICE = '0x1111111111111111111111111111111111111111' as const;
const BOB = '0x2222222222222222222222222222222222222222' as const;
const CAROL = '0x3333333333333333333333333333333333333333' as const;
const _ERC20_TOKEN = '0x4444444444444444444444444444444444444444' as const;
const ERC1155_TOKEN = '0x5555555555555555555555555555555555555555' as const;
const NOTE_CONTRACT = '0x6666666666666666666666666666666666666666' as const;
const NOTE_CONTRACT_2 = '0x7777777777777777777777777777777777777777' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TX_HASH_2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const _TX_HASH_3 = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as const;

const STATEMENT_CID = fakeIpfsCidV1('statement-1');
const STATEMENT_CID_2 = fakeIpfsCidV1('statement-2');

// ============================================================================
// makeEvent helpers
// ============================================================================

function makeNoteCreated(overrides: Partial<NoteCreatedEvent> = {}): NoteCreatedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    noteId: 1n,
    owner: ALICE,
    amount: 100n,
    token: ZERO_ADDRESS,
    tokenType: 0,
    tokenId: 0n,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeNoteDelegated(overrides: Partial<NoteDelegatedEvent> = {}): NoteDelegatedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    parentNoteId: 1n,
    childNoteId: 1n,
    delegate: BOB,
    amount: 100n,
    blockNumber: 101n,
    blockTimestamp: 1700000100n,
    transactionHash: TX_HASH,
    logIndex: 1,
    ...overrides,
  };
}

function makeChainSplit(overrides: Partial<ChainSplitEvent> = {}): ChainSplitEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    originalLeafId: 1n,
    splitLeafId: 2n,
    remainderLeafId: 1n,
    splitAmount: 40n,
    blockNumber: 101n,
    blockTimestamp: 1700000100n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeNoteRevoked(overrides: Partial<NoteRevokedEvent> = {}): NoteRevokedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    noteId: 1n,
    revoker: ALICE,
    blockNumber: 102n,
    blockTimestamp: 1700000200n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeFundsReclaimed(overrides: Partial<FundsReclaimedEvent> = {}): FundsReclaimedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    noteId: 1n,
    owner: ALICE,
    amount: 100n,
    blockNumber: 102n,
    blockTimestamp: 1700000200n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeNoteConsumed(overrides: Partial<NoteConsumedEvent> = {}): NoteConsumedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    noteId: 1n,
    amountConsumed: 100n,
    remainingAmount: 0n,
    deleted: true,
    blockNumber: 102n,
    blockTimestamp: 1700000200n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeERC1155Purchased(
  overrides: Partial<ERC1155PurchasedEvent> = {},
): ERC1155PurchasedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    buyer: ALICE,
    erc1155Contract: ERC1155_TOKEN,
    tokenIds: [1n],
    counts: [10n],
    totalCost: 100n,
    inputNoteIds: [1n],
    outputNoteIds: [2n],
    blockNumber: 103n,
    blockTimestamp: 1700000300n,
    transactionHash: TX_HASH_2,
    logIndex: 2,
    ...overrides,
  };
}

function makeRefundedIntoNote(
  overrides: Partial<RefundedIntoNoteEvent> = {},
): RefundedIntoNoteEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    caller: ALICE,
    primaryMarket: ERC1155_TOKEN,
    erc1155Contract: ERC1155_TOKEN,
    tokenId: 1n,
    refundValue: 100n,
    paymentToken: _ERC20_TOKEN,
    inputNoteId: 2n,
    outputNoteId: 3n,
    blockNumber: 104n,
    blockTimestamp: 1700000400n,
    transactionHash: _TX_HASH_3,
    logIndex: 2,
    ...overrides,
  };
}

function makeNoteIntentAttested(
  overrides: Partial<NoteIntentAttestedEvent> = {},
): NoteIntentAttestedEvent {
  return {
    contractAddress: NOTE_CONTRACT,
    attester: ALICE,
    noteContract: NOTE_CONTRACT,
    noteId: 1n,
    intendedStatementId: STATEMENT_CID,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

// Helper to compute expected chainHash for a chain of addresses (root first).
function expectedChainHash(addresses: string[]): string {
  let hash: `0x${string}` = `0x${'00'.repeat(32)}`;
  for (const addr of addresses) {
    hash = keccak256(encodePacked(['address', 'bytes32'], [addr as `0x${string}`, hash]));
  }
  return hash;
}

// ============================================================================
// Tests: foldDelegationState
// ============================================================================

describe('foldDelegationState', () => {
  it('returns empty maps for empty events', () => {
    const { notes, chains } = foldDelegationState([]);
    assert.strictEqual(notes.size, 0);
    assert.strictEqual(chains.size, 0);
  });

  it('keeps same numeric note IDs from different contract versions separate', () => {
    const result = foldDelegationState([
      { type: 'noteCreated', event: makeNoteCreated({ contractAddress: NOTE_CONTRACT, noteId: 1n, owner: ALICE, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ contractAddress: NOTE_CONTRACT_2, noteId: 1n, owner: BOB, logIndex: 1 }) },
    ]);

    assert.equal(result.notes.get(`${NOTE_CONTRACT}:1`)?.owner, ALICE);
    assert.equal(result.notes.get(`${NOTE_CONTRACT}:1`)?.contractAddress, NOTE_CONTRACT);
    assert.equal(result.notes.get(`${NOTE_CONTRACT_2}:1`)?.owner, BOB);
    assert.equal(result.notes.get(`${NOTE_CONTRACT_2}:1`)?.contractAddress, NOTE_CONTRACT_2);
    assert.equal(result.notes.get('1'), undefined);
  });

  it('can de-duplicate scoped and bare single-contract note aliases for list callers', () => {
    const { notes } = foldDelegationState([
      { type: 'noteCreated', event: makeNoteCreated() },
    ]);

    assert.strictEqual(notes.size, 2);
    assert.strictEqual(uniqueNotes(notes.values()).length, 1);
  });

  it('creates a note from NoteCreated event', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
    ];
    const { notes, chains } = foldDelegationState(events);

    assert.strictEqual(notes.size, 2);
    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.id, '1');
    assert.strictEqual(note.contractAddress, NOTE_CONTRACT);
    assert.strictEqual(note.amount, '100');
    assert.strictEqual(note.token, ZERO_ADDRESS);
    assert.strictEqual(note.tokenType, 0);
    assert.strictEqual(note.tokenId, '0');
    assert.strictEqual(note.owner, ALICE);
    assert.strictEqual(note.rootOwner, ALICE);
    assert.strictEqual(note.active, true);
    assert.strictEqual(note.parentNoteId, undefined);

    // chainHash for a root-only chain: keccak256(alice || bytes32(0))
    assert.strictEqual(note.chainHash, expectedChainHash([ALICE]));

    const chain = chains.get('1');
    assert.ok(chain);
    assert.strictEqual(chain.length, 1);
    assert.strictEqual(chain[0].address, ALICE);
    assert.strictEqual(chain[0].position, 0);
  });

  it('handles full delegation (parentNoteId === childNoteId)', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteDelegated', event: makeNoteDelegated() }, // 1→1 (full)
    ];
    const { notes, chains } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.owner, BOB);       // leaf is now bob
    assert.strictEqual(note.rootOwner, ALICE); // root is still alice

    const chain = chains.get('1');
    assert.ok(chain);
    assert.strictEqual(chain.length, 2);
    assert.strictEqual(chain[0].address, ALICE); // root at position 0
    assert.strictEqual(chain[1].address, BOB);   // leaf at position 1

    // chainHash: keccak256(bob || keccak256(alice || 0))
    assert.strictEqual(note.chainHash, expectedChainHash([ALICE, BOB]));
  });

  it('handles partial delegation (ChainSplit + NoteDelegated)', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ amount: 100n }) },
      // Partial delegation: split off 40 as note 2 (delegated to bob), keep 60 in note 1
      { type: 'chainSplit', event: makeChainSplit({ originalLeafId: 1n, splitLeafId: 2n, remainderLeafId: 1n, splitAmount: 40n }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ parentNoteId: 1n, childNoteId: 2n, delegate: BOB, amount: 40n }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    // Note 1 (remainder): still alice's, reduced amount
    const note1 = notes.get('1');
    assert.ok(note1);
    assert.strictEqual(note1.amount, '60');
    assert.strictEqual(note1.owner, ALICE);
    assert.strictEqual(note1.rootOwner, ALICE);
    assert.strictEqual(note1.parentNoteId, undefined);

    // Note 2 (delegated split): owned by bob, parent is note 1
    const note2 = notes.get('2');
    assert.ok(note2);
    assert.strictEqual(note2.amount, '40');
    assert.strictEqual(note2.owner, BOB);
    assert.strictEqual(note2.rootOwner, ALICE);
    assert.strictEqual(note2.parentNoteId, '1');

    const chain2 = chains.get('2');
    assert.ok(chain2);
    assert.strictEqual(chain2.length, 2);
    assert.strictEqual(chain2[0].address, ALICE);
    assert.strictEqual(chain2[1].address, BOB);
    assert.strictEqual(note2.chainHash, expectedChainHash([ALICE, BOB]));
  });

  it('handles three-level delegation chain', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: BOB }) },  // alice→bob (full)
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: CAROL, blockNumber: 102n, logIndex: 0 }) }, // bob→carol (full)
    ];
    const { notes, chains } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.owner, CAROL);
    assert.strictEqual(note.rootOwner, ALICE);

    const chain = chains.get('1');
    assert.ok(chain);
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0].address, ALICE);
    assert.strictEqual(chain[1].address, BOB);
    assert.strictEqual(chain[2].address, CAROL);

    assert.strictEqual(note.chainHash, expectedChainHash([ALICE, BOB, CAROL]));
  });

  it('handles revocation in a two-link chain (alice revokes from bob)', () => {
    // Chain: alice(root) → bob(leaf). Alice revokes.
    // Contract revoke: owners=[bob, alice], callerIndex=1 (alice)
    // new hash = keccak256(alice, keccak256(bob, 0))
    // New chain (DelegationChainLink): [{bob, 0}, {alice, 1}]
    // New leaf (owner) = alice, new "root" = bob
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: BOB }) },
      { type: 'noteRevoked', event: makeNoteRevoked({ revoker: ALICE }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.owner, ALICE);  // alice is the new leaf (spending authority)
    assert.strictEqual(note.active, true);

    const chain = chains.get('1');
    assert.ok(chain);
    assert.strictEqual(chain.length, 2);
    assert.strictEqual(chain[0].address, BOB);   // bob at position 0
    assert.strictEqual(chain[1].address, ALICE); // alice at position 1 (leaf)

    // chainHash = computeChainHash([bob, alice]) = keccak256(alice, keccak256(bob, 0))
    assert.strictEqual(note.chainHash, expectedChainHash([BOB, ALICE]));
  });

  it('handles revocation in a three-link chain (alice revokes from bob→carol)', () => {
    // Chain: alice(root, pos0) → bob(pos1) → carol(leaf, pos2)
    // Alice revokes (rPos=0, callerIndex=2):
    //   j from owners.length-newChainLength=3-3=0 to 2
    //   j=0: carol, j=1: bob, j=2: alice
    //   new hash = keccak256(alice, keccak256(bob, keccak256(carol, 0)))
    //   new chain = [{carol,0},{bob,1},{alice,2}]
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: BOB }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: CAROL, blockNumber: 102n, logIndex: 0 }) },
      { type: 'noteRevoked', event: makeNoteRevoked({ revoker: ALICE, blockNumber: 103n }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.owner, ALICE); // alice is the new leaf

    const chain = chains.get('1');
    assert.ok(chain);
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0].address, CAROL);
    assert.strictEqual(chain[1].address, BOB);
    assert.strictEqual(chain[2].address, ALICE);

    assert.strictEqual(note.chainHash, expectedChainHash([CAROL, BOB, ALICE]));
  });

  it('handles note consumption (partial — deleted=false)', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ amount: 100n }) },
      { type: 'noteConsumed', event: makeNoteConsumed({ amountConsumed: 60n, remainingAmount: 40n, deleted: false }) },
    ];
    const { notes } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.amount, '40');
    assert.strictEqual(note.active, true);
  });

  it('handles note consumption (full — deleted=true)', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteConsumed', event: makeNoteConsumed({ amountConsumed: 100n, remainingAmount: 0n, deleted: true }) },
    ];
    const { notes } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.amount, '0');
    assert.strictEqual(note.active, false);
    // Consumed notes are retained in the map for chain reference
    assert.strictEqual(notes.has('1'), true);
  });

  it('handles funds reclaim (note becomes inactive)', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'fundsReclaimed', event: makeFundsReclaimed() },
    ];
    const { notes } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.active, false);
    assert.strictEqual(note.amount, '0');
  });

  it('tracks multiple independent notes', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n, owner: ALICE, amount: 100n }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, owner: BOB, amount: 200n, blockNumber: 101n }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    assert.strictEqual(notes.size, 4);
    assert.strictEqual(notes.get('1')?.owner, ALICE);
    assert.strictEqual(notes.get('2')?.owner, BOB);
    assert.strictEqual(chains.get('1')?.length, 1);
    assert.strictEqual(chains.get('2')?.length, 1);
  });

  it('preserves ERC1155 token details on note', () => {
    const events: DelegationEvent[] = [
      {
        type: 'noteCreated',
        event: makeNoteCreated({
          token: ERC1155_TOKEN,
          tokenType: 1,
          tokenId: 42n,
          amount: 10n,
        }),
      },
    ];
    const { notes } = foldDelegationState(events);

    const note = notes.get('1');
    assert.ok(note);
    assert.strictEqual(note.token, ERC1155_TOKEN);
    assert.strictEqual(note.tokenType, 1);
    assert.strictEqual(note.tokenId, '42');
    assert.strictEqual(note.amount, '10');
  });

  it('updates output note chain from ERC1155Purchased when input note has multi-link chain', () => {
    // Setup: alice deposits, delegates to bob. Bob buys ERC1155 (consumes note 1, creates note 2).
    // Note 2 should inherit the [alice, bob] chain from note 1.
    const events: DelegationEvent[] = [
      // Alice deposits → note 1
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n, owner: ALICE, amount: 100n }) },
      // Alice delegates to bob (full)
      { type: 'noteDelegated', event: makeNoteDelegated({ parentNoteId: 1n, childNoteId: 1n, delegate: BOB }) },
      // Bob buys ERC1155: note 1 is consumed, note 2 is created (output)
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 1n, amountConsumed: 100n, remainingAmount: 0n, deleted: true, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 0 }) },
      // Output note created with only bob (leaf) as owner initially
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, owner: BOB, amount: 10n, token: ERC1155_TOKEN, tokenType: 1, tokenId: 1n, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 1 }) },
      // ERC1155Purchased: input=[1], output=[2]
      { type: 'erc1155Purchased', event: makeERC1155Purchased({ inputNoteIds: [1n], outputNoteIds: [2n], tokenIds: [1n] }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    const note2 = notes.get('2');
    assert.ok(note2);
    // Output note should have the full delegation chain from note 1
    assert.strictEqual(note2.owner, BOB);
    assert.strictEqual(note2.rootOwner, ALICE);

    const chain2 = chains.get('2');
    assert.ok(chain2);
    assert.strictEqual(chain2.length, 2);
    assert.strictEqual(chain2[0].address, ALICE);
    assert.strictEqual(chain2[1].address, BOB);
    assert.strictEqual(note2.chainHash, expectedChainHash([ALICE, BOB]));
  });

  it('does not update output note chain if input has single-link chain', () => {
    // If input note has only one owner (not delegated), output note keeps its own chain
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n, owner: ALICE, amount: 100n }) },
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 1n, amountConsumed: 100n, remainingAmount: 0n, deleted: true, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, owner: ALICE, amount: 10n, token: ERC1155_TOKEN, tokenType: 1, tokenId: 1n, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 1 }) },
      { type: 'erc1155Purchased', event: makeERC1155Purchased({ inputNoteIds: [1n], outputNoteIds: [2n] }) },
    ];
    const { chains } = foldDelegationState(events);
    // Input has single-link chain → output keeps its own single-link chain
    assert.strictEqual(chains.get('2')?.length, 1);
  });

  it('refundIntoNote: output ERC20 note inherits the receipt note multi-link chain', () => {
    // alice deposits, delegates to bob, bob buys ERC1155 (receipt note 2 with [alice,bob]).
    // The AC fails; bob refunds note 2 → settlement note 3, which must inherit [alice, bob].
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n, owner: ALICE, amount: 100n }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ parentNoteId: 1n, childNoteId: 1n, delegate: BOB }) },
      // Bob buys ERC1155: note 1 consumed, receipt note 2 created, chain copied via ERC1155Purchased.
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 1n, amountConsumed: 100n, remainingAmount: 0n, deleted: true, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, owner: BOB, amount: 10n, token: ERC1155_TOKEN, tokenType: 1, tokenId: 1n, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 1 }) },
      { type: 'erc1155Purchased', event: makeERC1155Purchased({ inputNoteIds: [1n], outputNoteIds: [2n], tokenIds: [1n] }) },
      // AC fails → bob refunds receipt note 2 into settlement note 3.
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 2n, amountConsumed: 10n, remainingAmount: 0n, deleted: true, blockNumber: 104n, transactionHash: _TX_HASH_3, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 3n, owner: BOB, amount: 100n, token: _ERC20_TOKEN, tokenType: 0, tokenId: 0n, blockNumber: 104n, transactionHash: _TX_HASH_3, logIndex: 1 }) },
      { type: 'refundedIntoNote', event: makeRefundedIntoNote({ inputNoteId: 2n, outputNoteId: 3n }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    // Receipt note 2 is now inactive (consumed).
    assert.strictEqual(notes.get('2')?.active, false);

    // Settlement note 3 is active, ERC20, and carries the full [alice, bob] chain —
    // so revocability survived the round trip (alice can still revoke/reclaim).
    const note3 = notes.get('3');
    assert.ok(note3);
    assert.strictEqual(note3.active, true);
    assert.strictEqual(note3.tokenType, 0);
    assert.strictEqual(note3.token, _ERC20_TOKEN);
    assert.strictEqual(note3.amount, '100');
    assert.strictEqual(note3.owner, BOB);
    assert.strictEqual(note3.rootOwner, ALICE);

    const chain3 = chains.get('3');
    assert.ok(chain3);
    assert.strictEqual(chain3.length, 2);
    assert.strictEqual(chain3[0].address, ALICE);
    assert.strictEqual(chain3[1].address, BOB);
    assert.strictEqual(note3.chainHash, expectedChainHash([ALICE, BOB]));
  });

  it('refundIntoNote: leaves output single-link chain when receipt note was not delegated', () => {
    // alice deposits, buys ERC1155 herself (no delegation), then refunds. Output stays single-link.
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n, owner: ALICE, amount: 100n }) },
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 1n, amountConsumed: 100n, remainingAmount: 0n, deleted: true, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, owner: ALICE, amount: 10n, token: ERC1155_TOKEN, tokenType: 1, tokenId: 1n, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 1 }) },
      { type: 'erc1155Purchased', event: makeERC1155Purchased({ inputNoteIds: [1n], outputNoteIds: [2n] }) },
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 2n, amountConsumed: 10n, remainingAmount: 0n, deleted: true, blockNumber: 104n, transactionHash: _TX_HASH_3, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 3n, owner: ALICE, amount: 100n, token: _ERC20_TOKEN, tokenType: 0, tokenId: 0n, blockNumber: 104n, transactionHash: _TX_HASH_3, logIndex: 1 }) },
      { type: 'refundedIntoNote', event: makeRefundedIntoNote({ caller: ALICE, inputNoteId: 2n, outputNoteId: 3n }) },
    ];
    const { notes, chains } = foldDelegationState(events);

    assert.strictEqual(chains.get('3')?.length, 1);
    assert.strictEqual(notes.get('3')?.rootOwner, ALICE);
    assert.strictEqual(notes.get('3')?.chainHash, expectedChainHash([ALICE]));
  });

  it('refundIntoNote: a reclaim on the refunded note works (chain preserved end-to-end)', () => {
    // After the delegated refund, alice (root) reclaims settlement note 3 — proving the
    // chain is intact and revocability composed across purchase → refund.
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n, owner: ALICE, amount: 100n }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ parentNoteId: 1n, childNoteId: 1n, delegate: BOB }) },
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 1n, amountConsumed: 100n, remainingAmount: 0n, deleted: true, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, owner: BOB, amount: 10n, token: ERC1155_TOKEN, tokenType: 1, tokenId: 1n, blockNumber: 102n, transactionHash: TX_HASH_2, logIndex: 1 }) },
      { type: 'erc1155Purchased', event: makeERC1155Purchased({ inputNoteIds: [1n], outputNoteIds: [2n], tokenIds: [1n] }) },
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 2n, amountConsumed: 10n, remainingAmount: 0n, deleted: true, blockNumber: 104n, transactionHash: _TX_HASH_3, logIndex: 0 }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 3n, owner: BOB, amount: 100n, token: _ERC20_TOKEN, tokenType: 0, tokenId: 0n, blockNumber: 104n, transactionHash: _TX_HASH_3, logIndex: 1 }) },
      { type: 'refundedIntoNote', event: makeRefundedIntoNote({ inputNoteId: 2n, outputNoteId: 3n }) },
      // Alice reclaims note 3 (only possible because she is its root).
      { type: 'fundsReclaimed', event: makeFundsReclaimed({ noteId: 3n, owner: ALICE, amount: 100n, blockNumber: 105n }) },
    ];
    const { notes } = foldDelegationState(events);

    const note3 = notes.get('3');
    assert.ok(note3);
    assert.strictEqual(note3.active, false);
    assert.strictEqual(note3.amount, '0');
  });

  it('handles partial delegation without affecting remainder note chain', () => {
    // After split+delegate, note 1 (remainder) keeps alice's chain
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ amount: 100n }) },
      { type: 'chainSplit', event: makeChainSplit({ splitAmount: 40n }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ parentNoteId: 1n, childNoteId: 2n, delegate: BOB }) },
    ];
    const { chains, notes } = foldDelegationState(events);

    // Note 1 (remainder) should still have only alice in chain
    const chain1 = chains.get('1');
    assert.ok(chain1);
    assert.strictEqual(chain1.length, 1);
    assert.strictEqual(chain1[0].address, ALICE);
    assert.strictEqual(notes.get('1')?.chainHash, expectedChainHash([ALICE]));
  });

  it('ignores NoteConsumed for unknown noteId', () => {
    const events: DelegationEvent[] = [
      { type: 'noteConsumed', event: makeNoteConsumed({ noteId: 99n }) },
    ];
    const { notes } = foldDelegationState(events);
    assert.strictEqual(notes.size, 0);
  });

  it('ignores ChainSplit for unknown originalLeafId', () => {
    const events: DelegationEvent[] = [
      { type: 'chainSplit', event: makeChainSplit({ originalLeafId: 99n }) },
    ];
    const { notes } = foldDelegationState(events);
    assert.strictEqual(notes.size, 0);
  });

  it('ignores NoteRevoked when revoker not found in chain', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteRevoked', event: makeNoteRevoked({ revoker: CAROL }) }, // carol not in chain
    ];
    const { chains } = foldDelegationState(events);
    // Chain unchanged (still just alice)
    assert.strictEqual(chains.get('1')?.length, 1);
  });
});

// ============================================================================
// Tests: foldNote
// ============================================================================

describe('foldNote', () => {
  it('returns null for unknown noteId', () => {
    const result = foldNote('99', []);
    assert.strictEqual(result, null);
  });

  it('returns note and chain for known noteId', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, blockNumber: 101n }) },
    ];
    const result = foldNote('1', events);
    assert.ok(result);
    assert.strictEqual(result.note.id, '1');
    assert.strictEqual(result.chain.length, 1);
    assert.strictEqual(result.chain[0].address, ALICE);
  });

  it('returns correct state after delegation', () => {
    const events: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated() },
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: BOB }) },
    ];
    const result = foldNote('1', events);
    assert.ok(result);
    assert.strictEqual(result.note.owner, BOB);
    assert.strictEqual(result.chain.length, 2);
  });

  it('resumable: folding in two halves produces the same result as one full fold', () => {
    const allEvents: DelegationEvent[] = [
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 1n }) },
      { type: 'noteCreated', event: makeNoteCreated({ noteId: 2n, blockNumber: 101n }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ delegate: BOB, blockNumber: 102n }) },
      { type: 'noteDelegated', event: makeNoteDelegated({ parentNoteId: 2n, childNoteId: 2n, delegate: CAROL, blockNumber: 103n }) },
    ];
    const half = Math.floor(allEvents.length / 2);
    const { stateMap } = foldDelegationState(allEvents.slice(0, half));
    const { notes: resumedNotes } = foldDelegationState(allEvents.slice(half), stateMap);
    const { notes: fullNotes } = foldDelegationState(allEvents);
    // Both approaches yield the same owner for note 1
    assert.strictEqual(resumedNotes.get('1')?.owner, fullNotes.get('1')?.owner);
    assert.strictEqual(resumedNotes.get('2')?.owner, fullNotes.get('2')?.owner);
  });
});

// ============================================================================
// Tests: foldNoteIntentAttestations
// ============================================================================

describe('foldNoteIntentAttestations', () => {
  it('returns empty array for no events', () => {
    const result = foldNoteIntentAttestations([]);
    assert.strictEqual(result.length, 0);
  });

  it('creates attestation record from single event', () => {
    const result = foldNoteIntentAttestations([makeNoteIntentAttested()]);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].attester, ALICE);
    assert.strictEqual(result[0].noteContract, NOTE_CONTRACT);
    assert.strictEqual(result[0].noteId, '1');
    assert.strictEqual(result[0].intendedStatementId, STATEMENT_CID);
    assert.strictEqual(result[0].blockNumber, '100');
    assert.strictEqual(result[0].createdAt, '1700000000');
  });

  it('multiple attesters for the same note are all kept', () => {
    const events = [
      makeNoteIntentAttested({ attester: ALICE }),
      makeNoteIntentAttested({ attester: BOB, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldNoteIntentAttestations(events);
    assert.strictEqual(result.length, 2);
  });

  it('re-attestation by same attester+noteContract+noteId updates statementId (last-write-wins)', () => {
    const events = [
      makeNoteIntentAttested({ intendedStatementId: STATEMENT_CID }),
      makeNoteIntentAttested({
        intendedStatementId: STATEMENT_CID_2,
        blockNumber: 101n,
        transactionHash: TX_HASH_2,
        logIndex: 0,
      }),
    ];
    const result = foldNoteIntentAttestations(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].intendedStatementId, STATEMENT_CID_2);
  });

  it('different noteIds produce separate attestation records', () => {
    const events = [
      makeNoteIntentAttested({ noteId: 1n }),
      makeNoteIntentAttested({ noteId: 2n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldNoteIntentAttestations(events);
    assert.strictEqual(result.length, 2);
  });

  it('different noteContracts produce separate attestation records', () => {
    const contract2 = '0x9999999999999999999999999999999999999999' as const;
    const events = [
      makeNoteIntentAttested({ noteContract: NOTE_CONTRACT }),
      makeNoteIntentAttested({ noteContract: contract2, transactionHash: TX_HASH_2 }),
    ];
    const result = foldNoteIntentAttestations(events);
    assert.strictEqual(result.length, 2);
  });
});
