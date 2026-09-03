import { DelegatableNotesAbi, NoteIntentAbi, RecurringPledgesAbi } from '../../abis.js';
import { bytes32ToCid } from '../cid-types.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export function decodeNoteCreatedEvent(
  rawEvent: RawEventFromCache,
): {
  noteId: bigint;
  owner: `0x${string}`;
  amount: bigint;
  token: `0x${string}`;
  tokenType: number;
  tokenId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'NoteCreated') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    owner: args.owner as `0x${string}`,
    amount: args.amount as bigint,
    token: args.token as `0x${string}`,
    tokenType: Number(args.tokenType),
    tokenId: args.tokenId as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeNoteDelegatedEvent(
  rawEvent: RawEventFromCache,
): {
  parentNoteId: bigint;
  childNoteId: bigint;
  delegate: `0x${string}`;
  amount: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'NoteDelegated') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    parentNoteId: args.parentNoteId as bigint,
    childNoteId: args.childNoteId as bigint,
    delegate: args.delegate as `0x${string}`,
    amount: (args.amount as bigint) ?? 0n,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeChainSplitEvent(
  rawEvent: RawEventFromCache,
): {
  originalLeafId: bigint;
  splitLeafId: bigint;
  remainderLeafId: bigint;
  splitAmount: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ChainSplit') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    originalLeafId: args.originalLeafId as bigint,
    splitLeafId: args.splitLeafId as bigint,
    remainderLeafId: args.remainderLeafId as bigint,
    splitAmount: (args.splitAmount as bigint) ?? 0n,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeNoteRevokedEvent(
  rawEvent: RawEventFromCache,
): {
  noteId: bigint;
  revoker: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'NoteRevoked') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    revoker: args.revoker as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeFundsReclaimedEvent(
  rawEvent: RawEventFromCache,
): {
  noteId: bigint;
  owner: `0x${string}`;
  amount: bigint;
  token: `0x${string}`;
  tokenType: number;
  tokenId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'FundsReclaimed') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    owner: args.owner as `0x${string}`,
    amount: args.amount as bigint,
    token: args.token as `0x${string}`,
    tokenType: Number(args.tokenType),
    tokenId: args.tokenId as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeNoteConsumedEvent(
  rawEvent: RawEventFromCache,
): {
  noteId: bigint;
  amountConsumed: bigint;
  remainingAmount: bigint;
  deleted: boolean;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'NoteConsumed') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    amountConsumed: args.amountConsumed as bigint,
    remainingAmount: (args.remainingAmount as bigint) ?? 0n,
    deleted: (args.deleted as boolean) ?? false,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeERC1155PurchasedEvent(
  rawEvent: RawEventFromCache,
): {
  buyer: `0x${string}`;
  erc1155Contract: `0x${string}`;
  tokenIds: bigint[];
  counts: bigint[];
  totalCost: bigint;
  inputNoteIds: bigint[];
  outputNoteIds: bigint[];
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ERC1155Purchased') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    buyer: args.buyer as `0x${string}`,
    erc1155Contract: args.erc1155Contract as `0x${string}`,
    tokenIds: (args.tokenIds as bigint[]) ?? [],
    counts: (args.counts as bigint[]) ?? [],
    totalCost: (args.totalCost as bigint) ?? 0n,
    inputNoteIds: (args.inputNoteIds as bigint[]) ?? [],
    outputNoteIds: (args.outputNoteIds as bigint[]) ?? [],
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeRefundedIntoNoteEvent(
  rawEvent: RawEventFromCache,
): {
  caller: `0x${string}`;
  primaryMarket: `0x${string}`;
  erc1155Contract: `0x${string}`;
  tokenId: bigint;
  refundValue: bigint;
  paymentToken: `0x${string}`;
  inputNoteId: bigint;
  outputNoteId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'RefundedIntoNote') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    caller: args.caller as `0x${string}`,
    primaryMarket: args.primaryMarket as `0x${string}`,
    erc1155Contract: args.erc1155Contract as `0x${string}`,
    tokenId: (args.tokenId as bigint) ?? 0n,
    refundValue: (args.refundValue as bigint) ?? 0n,
    paymentToken: args.paymentToken as `0x${string}`,
    inputNoteId: args.inputNoteId as bigint,
    outputNoteId: args.outputNoteId as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeReimbursementClaimedIntoNoteEvent(
  rawEvent: RawEventFromCache,
): {
  caller: `0x${string}`;
  primaryMarket: `0x${string}`;
  receiptNoteId: bigint;
  amount: bigint;
  reimbursementNoteId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ReimbursementClaimedIntoNote') return null;
  const args = decodeRawEventArgs(rawEvent, DelegatableNotesAbi);
  if (!args) return null;
  return {
    caller: args.caller as `0x${string}`,
    primaryMarket: args.primaryMarket as `0x${string}`,
    receiptNoteId: args.receiptNoteId as bigint,
    amount: (args.amount as bigint) ?? 0n,
    reimbursementNoteId: args.reimbursementNoteId as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeNoteIntentAttestedEvent(
  rawEvent: RawEventFromCache,
): {
  attester: `0x${string}`;
  noteContract: `0x${string}`;
  noteId: bigint;
  intendedStatementId: string | null;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'NoteIntentAttested') return null;
  const args = decodeRawEventArgs(rawEvent, NoteIntentAbi);
  if (!args) return null;
  return {
    attester: args.attester as `0x${string}`,
    noteContract: args.noteContract as `0x${string}`,
    noteId: args.noteId as bigint,
    intendedStatementId: (args.intendedStatementId as `0x${string}`) === `0x${'00'.repeat(32)}`
      ? null
      : bytes32ToCid(args.intendedStatementId as `0x${string}`),
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeStandingPledgeCreatedEvent(
  rawEvent: RawEventFromCache,
): {
  pledgeId: bigint;
  rootOwner: `0x${string}`;
  delegateTo: `0x${string}`;
  token: `0x${string}`;
  amountPerPeriod: bigint;
  period: bigint;
  causeRef: string;
  backingType: number;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'StandingPledgeCreated') return null;
  const args = decodeRawEventArgs(rawEvent, RecurringPledgesAbi);
  if (!args) return null;
  return {
    pledgeId: args.pledgeId as bigint,
    rootOwner: args.rootOwner as `0x${string}`,
    delegateTo: args.delegateTo as `0x${string}`,
    token: args.token as `0x${string}`,
    amountPerPeriod: args.amountPerPeriod as bigint,
    period: args.period as bigint,
    causeRef: args.causeRef as string,
    backingType: Number(args.backingType),
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeStandingPledgeExecutedEvent(
  rawEvent: RawEventFromCache,
): {
  pledgeId: bigint;
  noteId: bigint;
  executedAt: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'StandingPledgeExecuted') return null;
  const args = decodeRawEventArgs(rawEvent, RecurringPledgesAbi);
  if (!args) return null;
  return {
    pledgeId: args.pledgeId as bigint,
    noteId: args.noteId as bigint,
    executedAt: args.executedAt as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeStandingPledgeCancelledEvent(
  rawEvent: RawEventFromCache,
): {
  pledgeId: bigint;
  rootOwner: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'StandingPledgeCancelled') return null;
  const args = decodeRawEventArgs(rawEvent, RecurringPledgesAbi);
  if (!args) return null;
  return {
    pledgeId: args.pledgeId as bigint,
    rootOwner: args.rootOwner as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}
