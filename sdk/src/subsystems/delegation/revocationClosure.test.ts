import assert from 'node:assert/strict';
import type { DelegationEvent } from './folds.js';
import { revocableNotesFromEvents } from './revocationClosure.js';

const ALICE = '0x0000000000000000000000000000000000000001' as const;
const BOB = '0x0000000000000000000000000000000000000002' as const;
const raw = { contractAddress: '0x00000000000000000000000000000000000000aa' as const, blockNumber: 1n, blockTimestamp: 1n, transactionHash: '0x' as const, logIndex: 0 };

function created(noteId: bigint, owner: `0x${string}`): DelegationEvent {
  return { type: 'noteCreated', event: { ...raw, noteId, owner, amount: 10n, token: ALICE, tokenType: 0, tokenId: 0n } };
}

describe('revocableNotesFromEvents', () => {
  it('includes a receipt and a refund that came out of the note, not a replacement', () => {
    const events: DelegationEvent[] = [
      created(1n, ALICE),
      { type: 'noteDelegated', event: { ...raw, parentNoteId: 1n, childNoteId: 1n, delegate: BOB, amount: 10n } },
      created(2n, BOB),
      { type: 'erc1155Purchased', event: { ...raw, buyer: BOB, erc1155Contract: ALICE, tokenIds: [1n], counts: [1n], totalCost: 10n, inputNoteIds: [1n], outputNoteIds: [2n] } },
      created(3n, BOB),
      { type: 'refundedIntoNote', event: { ...raw, caller: BOB, primaryMarket: ALICE, erc1155Contract: ALICE, tokenId: 1n, refundValue: 10n, paymentToken: ALICE, inputNoteId: 2n, outputNoteId: 3n } },
      created(4n, ALICE),
      { type: 'noteDelegateReplaced', event: { ...raw, fromNoteId: 1n, toNoteId: 4n, newDelegate: BOB, amount: 1n } },
    ];
    const ids = revocableNotesFromEvents(events, 1n).map((note) => note.id);
    assert.ok(ids.includes('3'));
    assert.equal(ids.includes('4'), false);
  });
});
