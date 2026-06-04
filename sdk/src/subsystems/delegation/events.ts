import type { RawEvent } from '../events-common.js';

export interface NoteCreatedEvent extends RawEvent {
  noteId: bigint;
  owner: `0x${string}`;
  amount: bigint;
  token: `0x${string}`;
  tokenType: number;
  tokenId: bigint;
}

export interface NoteDelegatedEvent extends RawEvent {
  parentNoteId: bigint;
  childNoteId: bigint;
  delegate: `0x${string}`;
  amount: bigint;
}

export interface ChainSplitEvent extends RawEvent {
  originalLeafId: bigint;
  splitLeafId: bigint;
  remainderLeafId: bigint;
  splitAmount: bigint;
}

export interface NoteRevokedEvent extends RawEvent {
  noteId: bigint;
  revoker: `0x${string}`;
}

export interface FundsReclaimedEvent extends RawEvent {
  noteId: bigint;
  owner: `0x${string}`;
  amount: bigint;
}

export interface NoteConsumedEvent extends RawEvent {
  noteId: bigint;
  amountConsumed: bigint;
  remainingAmount: bigint;
  deleted: boolean;
}

export interface ERC1155PurchasedEvent extends RawEvent {
  buyer: `0x${string}`;
  erc1155Contract: `0x${string}`;
  tokenIds: bigint[];
  counts: bigint[];
  totalCost: bigint;
  inputNoteIds: bigint[];
  outputNoteIds: bigint[];
}

export interface RefundedIntoNoteEvent extends RawEvent {
  caller: `0x${string}`;
  primaryMarket: `0x${string}`;
  erc1155Contract: `0x${string}`;
  tokenId: bigint;
  refundValue: bigint;
  paymentToken: `0x${string}`;
  inputNoteId: bigint;
  outputNoteId: bigint;
}

export interface NoteIntentAttestedEvent extends RawEvent {
  attester: `0x${string}`;
  noteContract: `0x${string}`;
  noteId: bigint;
  intendedStatementId: string; // CIDv1
}

export interface StandingPledgeCreatedEvent extends RawEvent {
  pledgeId: bigint;
  rootOwner: `0x${string}`;
  delegateTo: `0x${string}`;
  token: `0x${string}`;
  amountPerPeriod: bigint;
  period: bigint;
  causeRef: string;
  backingType: number;
}

export interface StandingPledgeExecutedEvent extends RawEvent {
  pledgeId: bigint;
  noteId: bigint;
  executedAt: bigint;
}

export interface StandingPledgeCancelledEvent extends RawEvent {
  pledgeId: bigint;
  rootOwner: `0x${string}`;
}
