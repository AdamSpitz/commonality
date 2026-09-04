import assert from 'assert';
import { foldDonationActivityByRoot } from './queries.js';
import type { DelegationEvent } from './folds.js';
import type { NoteIntentAttestedEvent } from './events.js';
import type { Project } from '../lazy-giving/types.js';

const ROOT = '0x1111111111111111111111111111111111111111' as const;
const DELEGATE = '0x2222222222222222222222222222222222222222' as const;
const NOTES = '0x3333333333333333333333333333333333333333' as const;
const RECEIPTS = '0x4444444444444444444444444444444444444444' as const;
const PROJECT = '0x5555555555555555555555555555555555555555';
const TX = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TOKEN = '0x6666666666666666666666666666666666666666' as const;

const raw = (blockNumber: bigint, logIndex: number) => ({
  contractAddress: NOTES,
  blockNumber,
  blockTimestamp: 1_700_000_000n + blockNumber,
  transactionHash: TX,
  logIndex,
});

const project: Project = {
  id: PROJECT,
  erc1155Address: RECEIPTS,
  marketplaceAddress: null,
  recipient: DELEGATE,
  fundingCurrency: { kind: 'erc20', symbol: 'USDC', decimals: 6, tokenAddress: TOKEN, tokenType: 0 },
  threshold: '1000',
  deadline: '1800000000',
  totalReceived: '250',
  conditionAddress: null,
};

function purchaseEvents(): DelegationEvent[] {
  return [
    { type: 'noteCreated', event: { ...raw(1n, 0), noteId: 1n, owner: ROOT, amount: 250n, token: TOKEN, tokenType: 0, tokenId: 0n } },
    { type: 'noteDelegated', event: { ...raw(2n, 0), parentNoteId: 1n, childNoteId: 1n, delegate: DELEGATE, amount: 250n } },
    { type: 'noteConsumed', event: { ...raw(3n, 0), noteId: 1n, amountConsumed: 250n, remainingAmount: 0n, deleted: true } },
    { type: 'noteCreated', event: { ...raw(3n, 1), noteId: 2n, owner: DELEGATE, amount: 1n, token: RECEIPTS, tokenType: 1, tokenId: 7n } },
    { type: 'erc1155Purchased', event: { ...raw(3n, 2), buyer: DELEGATE, erc1155Contract: RECEIPTS, tokenIds: [7n], counts: [1n], totalCost: 250n, inputNoteIds: [1n], outputNoteIds: [2n] } },
  ];
}

describe('foldDonationActivityByRoot', () => {
  it('attributes a delegated purchase to its root donor and joins its project and intent', () => {
    const intent: NoteIntentAttestedEvent = {
      ...raw(2n, 1),
      attester: ROOT,
      noteContract: NOTES,
      noteId: 1n,
      intendedStatementId: 'bafy-cause',
    };
    const [activity] = foldDonationActivityByRoot(ROOT, purchaseEvents(), [intent], [project]);

    assert.equal(activity.amount, '250');
    assert.equal(activity.directedBy, DELEGATE);
    assert.equal(activity.projectAddress, PROJECT);
    assert.deepEqual(activity.receiptNoteIds, ['2']);
    assert.deepEqual(activity.intendedStatementIds, ['bafy-cause']);
    assert.equal(activity.status, 'receipt active');
  });

  it('folds reimbursement into the purchase instead of creating another activity row', () => {
    const events: DelegationEvent[] = [
      ...purchaseEvents(),
      { type: 'reimbursementClaimedIntoNote', event: { ...raw(4n, 0), caller: DELEGATE, primaryMarket: PROJECT as `0x${string}`, receiptNoteId: 2n, amount: 80n, reimbursementNoteId: 3n } },
    ];
    const activity = foldDonationActivityByRoot(ROOT, events, [], [project]);

    assert.equal(activity.length, 1);
    assert.equal(activity[0].status, 'reimbursed');
    assert.equal(activity[0].reimbursedAmount, '80');
  });

  it('does not expose another root donor’s allocation', () => {
    assert.deepEqual(
      foldDonationActivityByRoot('0x9999999999999999999999999999999999999999', purchaseEvents(), [], [project]),
      [],
    );
  });
});
