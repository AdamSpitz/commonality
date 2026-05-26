import { decodeEventLog } from 'viem';
import { bytes32ToCid } from './cid-types.js';
import type { RawEventFromCache } from './eventCacheClient.js';

import {
  BeliefsAbi,
  ImplicationsAbi,
  TrustRegistryAbi,
  AssuranceContractAbi,
  ERC1155SecondaryMarketAbi,
  PremintingERC1155Abi,
  DelegatableNotesAbi,
  NoteIntentAbi,
  AlignmentAttestationsAbi,
  MutableRefUpdaterAbi,
  AssuranceContractFactoryAbi,
  ContentRegistryAbi,
  ChannelRegistryAbi,
  ChannelEscrowAbi,
  CreatorAssuranceContractFactoryAbi,
  NudgePublicationsAbi,
} from '../abis.js';

const ABI_MAP: Record<string, readonly unknown[]> = {
  Beliefs: BeliefsAbi,
  Implications: ImplicationsAbi,
  TrustRegistry: TrustRegistryAbi,
  AssuranceContract: AssuranceContractAbi,
  SecondaryMarket: ERC1155SecondaryMarketAbi,
  PremintingERC1155: PremintingERC1155Abi,
  DelegatableNotes: DelegatableNotesAbi,
  NoteIntent: NoteIntentAbi,
  AlignmentAttestations: AlignmentAttestationsAbi,
  MutableRefUpdater: MutableRefUpdaterAbi,
  AssuranceContractFactory: AssuranceContractFactoryAbi,
  ContentRegistry: ContentRegistryAbi,
  ChannelRegistry: ChannelRegistryAbi,
  ChannelEscrow: ChannelEscrowAbi,
  CreatorAssuranceContractFactory: CreatorAssuranceContractFactoryAbi,
  NudgePublications: NudgePublicationsAbi,
};

function decodeRawEventLog(rawEvent: RawEventFromCache): Record<string, unknown> | null {
  const eventName = rawEvent.eventName;
  
  let abi: readonly unknown[] | undefined;
  for (const [, value] of Object.entries(ABI_MAP)) {
    const abiEntry = value as readonly { name: string }[];
    if (abiEntry.some(e => e.name === eventName)) {
      abi = value;
      break;
    }
  }
  
  if (!abi) {
    console.warn(`No ABI found for event: ${eventName}`);
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi,
      data: rawEvent.data as `0x${string}`,
      topics: [
        rawEvent.topic0 as `0x${string}` | undefined,
        rawEvent.topic1 as `0x${string}` | undefined,
        rawEvent.topic2 as `0x${string}` | undefined,
        rawEvent.topic3 as `0x${string}` | undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ].filter((t): t is `0x${string}` => !!t) as unknown as any,
    }) as { args: Record<string, unknown> };
    return decoded.args;
  } catch (e) {
    console.warn(`Failed to decode event ${eventName}:`, e);
    return null;
  }
}

export interface DecodedDirectSupportEvent {
  user: `0x${string}`;
  statementId: string;
  beliefState: number;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export interface DecodedImplicationAttestationEvent {
  attester: `0x${string}`;
  fromStatementCid: string;
  toStatementCid: string;
  explanationCid: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export interface DecodedNudgesPublishedEvent {
  nudger: `0x${string}`;
  publicationCid: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export function decodeDirectSupportEvent(rawEvent: RawEventFromCache): DecodedDirectSupportEvent | null {
  if (rawEvent.eventName !== 'DirectSupport') return null;
  
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    user: args.user as `0x${string}`,
    statementId: bytes32ToCid(args.statementId as `0x${string}`),
    beliefState: Number(args.beliefState),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeImplicationAttestationEvent(rawEvent: RawEventFromCache): DecodedImplicationAttestationEvent | null {
  if (rawEvent.eventName !== 'ImplicationAttestation') return null;
  
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    attester: args.attester as `0x${string}`,
    fromStatementCid: bytes32ToCid(args.fromStatementCid as `0x${string}`),
    toStatementCid: bytes32ToCid(args.toStatementCid as `0x${string}`),
    explanationCid: args.explanationCid ? bytes32ToCid(args.explanationCid as `0x${string}`) : '',
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNudgesPublishedEvent(rawEvent: RawEventFromCache): DecodedNudgesPublishedEvent | null {
  if (rawEvent.eventName !== 'NudgesPublished') return null;

  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;

  return {
    nudger: args.nudger as `0x${string}`,
    publicationCid: bytes32ToCid(args.batchCid as `0x${string}`),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeAlignmentAttestationEvent(rawEvent: RawEventFromCache): {
  attester: `0x${string}`;
  subjectId: `0x${string}`;
  statementId: string;
  topicStatementId?: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'AlignmentAttestation') return null;

  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;

  return {
    attester: args.attester as `0x${string}`,
    subjectId: args.subjectId as `0x${string}`,
    statementId: bytes32ToCid(args.statementId as `0x${string}`),
    topicStatementId: args.topicStatementId ? bytes32ToCid(args.topicStatementId as `0x${string}`) : undefined,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeTrustSetEvent(rawEvent: RawEventFromCache): {
  truster: `0x${string}`;
  trustee: `0x${string}`;
  score: number;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'TrustSet') return null;

  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;

  return {
    truster: args.truster as `0x${string}`,
    trustee: args.trustee as `0x${string}`,
    score: Number(args.score),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeMutableRefEvent(rawEvent: RawEventFromCache): {
  owner: `0x${string}`;
  refName: string;
  currentRefValue: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'RefUpdated') return null;

  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;

  return {
    owner: args.owner as `0x${string}`,
    refName: args.name as string,
    currentRefValue: args.currentRefValue as string,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// LazyGiving event decoders
// ============================================================================

export function decodeLazyGivingAssuranceContractCreatedEvent(
  rawEvent: RawEventFromCache
): {
  assuranceContract: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'LazyGivingAssuranceContractCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract as `0x${string}`,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeAssuranceContractInitializedEvent(
  rawEvent: RawEventFromCache
): {
  recipient: `0x${string}`;
  condition: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'AssuranceContractInitialized') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    recipient: args.recipient as `0x${string}`,
    condition: args.condition as `0x${string}`,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeContractMetadataUpdatedEvent(
  rawEvent: RawEventFromCache
): {
  metadata: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContractMetadataUpdated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    metadata: args.metadata as string,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155OfferedEvent(
  rawEvent: RawEventFromCache
): {
  erc1155Addr: `0x${string}`;
  id: bigint;
  price: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ERC1155Offered') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    erc1155Addr: args.erc1155Addr as `0x${string}`,
    id: args.id as bigint,
    price: args.price as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155BoughtEvent(
  rawEvent: RawEventFromCache
): {
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalCost: bigint;
  ids: bigint[];
  counts: bigint[];
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ERC1155Bought') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    participant: args.participant as `0x${string}`,
    erc1155Addr: args.erc1155Addr as `0x${string}`,
    totalCost: args.totalCost as bigint,
    ids: args.ids as bigint[],
    counts: args.counts as bigint[],
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155SoldEvent(
  rawEvent: RawEventFromCache
): {
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalCost: bigint;
  ids: bigint[];
  counts: bigint[];
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ERC1155Sold') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    participant: args.participant as `0x${string}`,
    erc1155Addr: args.erc1155Addr as `0x${string}`,
    totalCost: args.totalCost as bigint,
    ids: args.ids as bigint[],
    counts: args.counts as bigint[],
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeAssuranceContractWithdrawalEvent(
  rawEvent: RawEventFromCache
): {
  recipient: `0x${string}`;
  value: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'AssuranceContractWithdrawal') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    recipient: args.recipient as `0x${string}`,
    value: args.value as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// Secondary market decoders

export function decodeSaleListingCreatedEvent(
  rawEvent: RawEventFromCache
): {
  saleListingId: bigint;
  seller: `0x${string}`;
  tokenId: bigint;
  count: bigint;
  pricePerToken: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'SaleListingCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    saleListingId: args.saleListingId as bigint,
    seller: args.seller as `0x${string}`,
    tokenId: args.tokenId as bigint,
    count: args.count as bigint,
    pricePerToken: args.pricePerToken as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeSaleListingFulfilledEvent(
  rawEvent: RawEventFromCache
): {
  saleListingId: bigint;
  buyer: `0x${string}`;
  count: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'SaleListingFulfilled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    saleListingId: args.saleListingId as bigint,
    buyer: args.buyer as `0x${string}`,
    count: args.count as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeSaleListingCancelledEvent(
  rawEvent: RawEventFromCache
): {
  saleListingId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'SaleListingCancelled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    saleListingId: args.saleListingId as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeBuyOrderCreatedEvent(
  rawEvent: RawEventFromCache
): {
  buyOrderId: bigint;
  buyer: `0x${string}`;
  tokenId: bigint;
  count: bigint;
  pricePerToken: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'BuyOrderCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyOrderId: args.buyOrderId as bigint,
    buyer: args.buyer as `0x${string}`,
    tokenId: args.tokenId as bigint,
    count: args.count as bigint,
    pricePerToken: args.pricePerToken as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeBuyOrderFulfilledEvent(
  rawEvent: RawEventFromCache
): {
  buyOrderId: bigint;
  seller: `0x${string}`;
  count: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'BuyOrderFulfilled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyOrderId: args.buyOrderId as bigint,
    seller: args.seller as `0x${string}`,
    count: args.count as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeBuyOrderCancelledEvent(
  rawEvent: RawEventFromCache
): {
  buyOrderId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'BuyOrderCancelled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyOrderId: args.buyOrderId as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// Transfer events (for token burns)

export function decodeTransferSingleEvent(
  rawEvent: RawEventFromCache
): {
  operator: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  id: bigint;
  value: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'TransferSingle') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    operator: args.operator as `0x${string}`,
    from: args.from as `0x${string}`,
    to: args.to as `0x${string}`,
    id: args.id as bigint,
    value: args.value as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeTransferBatchEvent(
  rawEvent: RawEventFromCache
): {
  operator: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  ids: bigint[];
  values: bigint[];
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'TransferBatch') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    operator: args.operator as `0x${string}`,
    from: args.from as `0x${string}`,
    to: args.to as `0x${string}`,
    ids: args.ids as bigint[],
    values: args.values as bigint[],
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// DelegatableNotes event decoders
// ============================================================================

export function decodeNoteCreatedEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    owner: args.owner as `0x${string}`,
    amount: args.amount as bigint,
    token: args.token as `0x${string}`,
    tokenType: Number(args.tokenType),
    tokenId: args.tokenId as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNoteDelegatedEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    parentNoteId: args.parentNoteId as bigint,
    childNoteId: args.childNoteId as bigint,
    delegate: args.delegate as `0x${string}`,
    amount: (args.amount as bigint) ?? 0n,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeChainSplitEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    originalLeafId: args.originalLeafId as bigint,
    splitLeafId: args.splitLeafId as bigint,
    remainderLeafId: args.remainderLeafId as bigint,
    splitAmount: (args.splitAmount as bigint) ?? 0n,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNoteRevokedEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    revoker: args.revoker as `0x${string}`,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeFundsReclaimedEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    owner: args.owner as `0x${string}`,
    amount: args.amount as bigint,
    token: args.token as `0x${string}`,
    tokenType: Number(args.tokenType),
    tokenId: args.tokenId as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNoteConsumedEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId as bigint,
    amountConsumed: args.amountConsumed as bigint,
    remainingAmount: (args.remainingAmount as bigint) ?? 0n,
    deleted: (args.deleted as boolean) ?? false,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155PurchasedEvent(
  rawEvent: RawEventFromCache
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
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyer: args.buyer as `0x${string}`,
    erc1155Contract: args.erc1155Contract as `0x${string}`,
    tokenIds: (args.tokenIds as bigint[]) ?? [],
    counts: (args.counts as bigint[]) ?? [],
    totalCost: (args.totalCost as bigint) ?? 0n,
    inputNoteIds: (args.inputNoteIds as bigint[]) ?? [],
    outputNoteIds: (args.outputNoteIds as bigint[]) ?? [],
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// NoteIntent event decoder
// ============================================================================

export function decodeNoteIntentAttestedEvent(
  rawEvent: RawEventFromCache
): {
  attester: `0x${string}`;
  noteContract: `0x${string}`;
  noteId: bigint;
  intendedStatementId: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'NoteIntentAttested') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    attester: args.attester as `0x${string}`,
    noteContract: args.noteContract as `0x${string}`,
    noteId: args.noteId as bigint,
    intendedStatementId: bytes32ToCid(args.intendedStatementId as `0x${string}`),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// Content-funding event decoders
// ============================================================================

export function decodeContentItemRegisteredEvent(
  rawEvent: RawEventFromCache
): {
  contentId: bigint;
  assuranceContract: `0x${string}`;
  canonicalId: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContentItemRegistered') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    contentId: args.contentId as bigint,
    assuranceContract: args.assuranceContract as `0x${string}`,
    canonicalId: args.canonicalId as string,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeContentItemReleasedEvent(
  rawEvent: RawEventFromCache
): {
  contentId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContentItemReleased') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    contentId: args.contentId as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeChannelVerifiedEvent(
  rawEvent: RawEventFromCache
): {
  channelId: string;
  owner: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ChannelVerified') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    owner: args.owner as `0x${string}`,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeChannelControlTakenEvent(
  rawEvent: RawEventFromCache
): {
  channelId: string;
  owner: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ChannelControlTaken') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    owner: args.owner as `0x${string}`,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeContractVetoedEvent(
  rawEvent: RawEventFromCache
): {
  channelId: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContractVetoed') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeDepositedEvent(
  rawEvent: RawEventFromCache
): {
  channelId: string;
  from: `0x${string}`;
  amount: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'Deposited') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    from: args.from as `0x${string}`,
    amount: args.amount as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeWithdrawnEvent(
  rawEvent: RawEventFromCache
): {
  channelId: string;
  to: `0x${string}`;
  amount: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'Withdrawn') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    to: args.to as `0x${string}`,
    amount: args.amount as bigint,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeCreatorContractCreatedEvent(
  rawEvent: RawEventFromCache
): {
  contractAddress: `0x${string}`;
  channelId: string;
  creator: `0x${string}`;
  isThirdParty: boolean;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'CreatorContractCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    contractAddress: args.contractAddress as `0x${string}`,
    channelId: args.channelId as string,
    creator: args.creator as `0x${string}`,
    isThirdParty: args.isThirdParty as boolean,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}
