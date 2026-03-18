import { decodeEventLog } from 'viem';
import { bytes32ToCid } from './cid-types.js';
import type { RawEventFromCache } from './eventCacheClient.js';

const BELIEFS_ABI = [
  {
    type: 'event',
    name: 'DirectSupport',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'statementId', type: 'bytes32', indexed: true },
      { name: 'beliefState', type: 'uint8', indexed: false },
    ],
  },
] as const;

const IMPLICATIONS_ABI = [
  {
    type: 'event',
    name: 'ImplicationAttestation',
    inputs: [
      { name: 'attester', type: 'address', indexed: true },
      { name: 'fromStatementCid', type: 'bytes32', indexed: true },
      { name: 'toStatementCid', type: 'bytes32', indexed: true },
      { name: 'explanationCid', type: 'bytes32', indexed: false },
    ],
  },
] as const;

const ASSURANCE_CONTRACT_FACTORY_ABI = [
  {
    type: 'event',
    name: 'PubstarterAssuranceContractCreated',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
    ],
  },
] as const;

const ASSURANCE_CONTRACT_ABI = [
  {
    type: 'event',
    name: 'AssuranceContractInitialized',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'condition', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ContractMetadataUpdated',
    inputs: [
      { name: 'metadataCid', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Offered',
    inputs: [
      { name: 'erc1155Addr', type: 'address', indexed: true },
      { name: 'id', type: 'uint256', indexed: false },
      { name: 'price', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Bought',
    inputs: [
      { name: 'participant', type: 'address', indexed: true },
      { name: 'erc1155Addr', type: 'address', indexed: true },
      { name: 'totalCost', type: 'uint256', indexed: false },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'counts', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Sold',
    inputs: [
      { name: 'participant', type: 'address', indexed: true },
      { name: 'erc1155Addr', type: 'address', indexed: true },
      { name: 'totalCost', type: 'uint256', indexed: false },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'counts', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AssuranceContractWithdrawal',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

const SECONDARY_MARKET_ABI = [
  {
    type: 'event',
    name: 'SaleListingCreated',
    inputs: [
      { name: 'saleListingId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
      { name: 'pricePerToken', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SaleListingFulfilled',
    inputs: [
      { name: 'saleListingId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'count', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SaleListingCancelled',
    inputs: [
      { name: 'saleListingId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'BuyOrderCreated',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
      { name: 'pricePerToken', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BuyOrderFulfilled',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'count', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BuyOrderCancelled',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155SecondaryMarketCreated',
    inputs: [
      { name: 'erc1155', type: 'address', indexed: false },
    ],
  },
] as const;

const PREMINTING_ERC1155_ABI = [
  {
    type: 'event',
    name: 'TransferSingle',
    inputs: [
      { name: 'operator', type: 'address', indexed: false },
      { name: 'from', type: 'address', indexed: false },
      { name: 'to', type: 'address', indexed: false },
      { name: 'id', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TransferBatch',
    inputs: [
      { name: 'operator', type: 'address', indexed: false },
      { name: 'from', type: 'address', indexed: false },
      { name: 'to', type: 'address', indexed: false },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'values', type: 'uint256[]', indexed: false },
    ],
  },
] as const;

const DELEGATABLE_NOTES_ABI = [
  {
    type: 'event',
    name: 'NoteCreated',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
      { name: 'tokenType', type: 'uint8', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NoteDelegated',
    inputs: [
      { name: 'parentNoteId', type: 'uint256', indexed: true },
      { name: 'childNoteId', type: 'uint256', indexed: true },
      { name: 'delegate', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ChainSplit',
    inputs: [
      { name: 'originalLeafId', type: 'uint256', indexed: true },
      { name: 'splitLeafId', type: 'uint256', indexed: true },
      { name: 'remainderLeafId', type: 'uint256', indexed: true },
      { name: 'splitAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NoteRevoked',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: true },
      { name: 'revoker', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'FundsReclaimed',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
      { name: 'tokenType', type: 'uint8', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NoteConsumed',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: true },
      { name: 'amountConsumed', type: 'uint256', indexed: false },
      { name: 'remainingAmount', type: 'uint256', indexed: false },
      { name: 'deleted', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Purchased',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'erc1155Contract', type: 'address', indexed: true },
      { name: 'tokenIds', type: 'uint256[]', indexed: false },
      { name: 'counts', type: 'uint256[]', indexed: false },
      { name: 'totalCost', type: 'uint256', indexed: false },
      { name: 'inputNoteIds', type: 'uint256[]', indexed: false },
      { name: 'outputNoteIds', type: 'uint256[]', indexed: false },
    ],
  },
] as const;

const NOTE_INTENT_ABI = [
  {
    type: 'event',
    name: 'NoteIntentAttested',
    inputs: [
      { name: 'attester', type: 'address', indexed: true },
      { name: 'noteContract', type: 'address', indexed: true },
      { name: 'noteId', type: 'uint256', indexed: true },
      { name: 'intentStatementId', type: 'bytes32', indexed: false },
    ],
  },
] as const;

const ALIGNMENT_ATTESTATIONS_ABI = [
  {
    type: 'event',
    name: 'AlignmentAttestation',
    inputs: [
      { name: 'attester', type: 'address', indexed: true },
      { name: 'subjectAddress', type: 'address', indexed: true },
      { name: 'statementId', type: 'bytes32', indexed: true },
      { name: 'topicStatementId', type: 'bytes32', indexed: false },
    ],
  },
] as const;

const MUTABLE_REF_UPDATER_ABI = [
  {
    type: 'event',
    name: 'RefUpdated',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'refName', type: 'string', indexed: false },
      { name: 'currentRefValue', type: 'string', indexed: false },
    ],
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const ABI_MAP: Record<string, readonly unknown[]> = {
  Beliefs: BELIEFS_ABI,
  Implications: IMPLICATIONS_ABI,
  AssuranceContractFactory: ASSURANCE_CONTRACT_FACTORY_ABI,
  AssuranceContract: ASSURANCE_CONTRACT_ABI,
  SecondaryMarket: SECONDARY_MARKET_ABI,
  PremintingERC1155: PREMINTING_ERC1155_ABI,
  DelegatableNotes: DELEGATABLE_NOTES_ABI,
  NoteIntent: NOTE_INTENT_ABI,
  AlignmentAttestations: ALIGNMENT_ATTESTATIONS_ABI,
  MutableRefUpdater: MUTABLE_REF_UPDATER_ABI,
};

function decodeRawEventLog(rawEvent: RawEventFromCache): AnyRecord | null {
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
    }) as { args: AnyRecord };
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

export interface DecodedPubstarterEvent {
  [key: string]: unknown;
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
    user: args.user,
    statementId: bytes32ToCid(args.statementId),
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
    attester: args.attester,
    fromStatementCid: bytes32ToCid(args.fromStatementCid),
    toStatementCid: bytes32ToCid(args.toStatementCid),
    explanationCid: args.explanationCid ? bytes32ToCid(args.explanationCid) : '',
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeAlignmentAttestationEvent(rawEvent: RawEventFromCache): { attester: `0x${string}`; subjectAddress: `0x${string}`; statementId: string; topicStatementId?: string; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'AlignmentAttestation') return null;
  
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    attester: args.attester,
    subjectAddress: args.subjectAddress,
    statementId: bytes32ToCid(args.statementId),
    topicStatementId: args.topicStatementId ? bytes32ToCid(args.topicStatementId) : undefined,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodePubstarterEvent(rawEvent: RawEventFromCache): DecodedPubstarterEvent | null {
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    ...args,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeDelegationEvent(rawEvent: RawEventFromCache): DecodedPubstarterEvent | null {
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    ...args,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeMutableRefEvent(rawEvent: RawEventFromCache): { owner: `0x${string}`; refName: string; currentRefValue: string; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'RefUpdated') return null;

  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;

  return {
    owner: args.owner,
    refName: args.refName,
    currentRefValue: args.currentRefValue,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// Typed Pubstarter event decoders (for foldProject, foldProjectTokens, etc.)
// ============================================================================

export function decodePubstarterAssuranceContractCreatedEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; creator: `0x${string}`; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'PubstarterAssuranceContractCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    creator: args.creator,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeAssuranceContractInitializedEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; recipient: `0x${string}`; condition: `0x${string}`; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'AssuranceContractInitialized') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    recipient: args.recipient,
    condition: args.condition,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeContractMetadataUpdatedEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; metadataCid: string; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'ContractMetadataUpdated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    metadataCid: bytes32ToCid(args.metadataCid),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155OfferedEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; erc1155Addr: `0x${string}`; tokenId: bigint; price: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'ERC1155Offered') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    erc1155Addr: args.erc1155Addr,
    tokenId: args.tokenId,
    price: args.price,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155BoughtEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; participant: `0x${string}`; erc1155Addr: `0x${string}`; totalCost: bigint; ids: bigint[]; counts: bigint[]; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'ERC1155Bought') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    participant: args.participant,
    erc1155Addr: args.erc1155Addr,
    totalCost: args.totalCost,
    ids: args.ids,
    counts: args.counts,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155SoldEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; participant: `0x${string}`; erc1155Addr: `0x${string}`; totalRefund: bigint; ids: bigint[]; counts: bigint[]; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'ERC1155Sold') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    participant: args.participant,
    erc1155Addr: args.erc1155Addr,
    totalRefund: args.totalRefund,
    ids: args.ids,
    counts: args.counts,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeAssuranceContractWithdrawalEvent(
  rawEvent: RawEventFromCache
): { assuranceContract: `0x${string}`; value: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'AssuranceContractWithdrawal') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract,
    value: args.value,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeSaleListingCreatedEvent(
  rawEvent: RawEventFromCache
): { saleListingId: bigint; seller: `0x${string}`; tokenId: bigint; count: bigint; pricePerToken: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'SaleListingCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    saleListingId: args.saleListingId,
    seller: args.seller,
    tokenId: args.tokenId,
    count: args.count,
    pricePerToken: args.pricePerToken,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeSaleListingFulfilledEvent(
  rawEvent: RawEventFromCache
): { saleListingId: bigint; buyer: `0x${string}`; count: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'SaleListingFulfilled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    saleListingId: args.saleListingId,
    buyer: args.buyer,
    count: args.count,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeSaleListingCancelledEvent(
  rawEvent: RawEventFromCache
): { saleListingId: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'SaleListingCancelled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    saleListingId: args.saleListingId,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeBuyOrderCreatedEvent(
  rawEvent: RawEventFromCache
): { buyOrderId: bigint; buyer: `0x${string}`; tokenId: bigint; count: bigint; pricePerToken: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'BuyOrderCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyOrderId: args.buyOrderId,
    buyer: args.buyer,
    tokenId: args.tokenId,
    count: args.count,
    pricePerToken: args.pricePerToken,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeBuyOrderFulfilledEvent(
  rawEvent: RawEventFromCache
): { buyOrderId: bigint; seller: `0x${string}`; count: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'BuyOrderFulfilled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyOrderId: args.buyOrderId,
    seller: args.seller,
    count: args.count,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeBuyOrderCancelledEvent(
  rawEvent: RawEventFromCache
): { buyOrderId: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'BuyOrderCancelled') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    buyOrderId: args.buyOrderId,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeTransferSingleEvent(
  rawEvent: RawEventFromCache
): { operator: `0x${string}`; from: `0x${string}`; to: `0x${string}`; id: bigint; value: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'TransferSingle') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    operator: args.operator,
    from: args.from,
    to: args.to,
    id: args.id,
    value: args.value,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeTransferBatchEvent(
  rawEvent: RawEventFromCache
): { operator: `0x${string}`; from: `0x${string}`; to: `0x${string}`; ids: bigint[]; values: bigint[]; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'TransferBatch') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    operator: args.operator,
    from: args.from,
    to: args.to,
    ids: args.ids,
    values: args.values,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// Typed DelegatableNotes event decoders
// ============================================================================

export function decodeNoteCreatedEvent(
  rawEvent: RawEventFromCache
): { noteId: bigint; owner: `0x${string}`; amount: bigint; token: `0x${string}`; tokenType: number; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'NoteCreated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId,
    owner: args.creator,
    amount: args.amount,
    token: args.token,
    tokenType: Number(args.tokenType),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNoteDelegatedEvent(
  rawEvent: RawEventFromCache
): { parentNoteId: bigint; childNoteId: bigint; delegate: `0x${string}`; amount: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'NoteDelegated') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    parentNoteId: args.noteId,
    childNoteId: args.noteId,
    delegate: args.delegate,
    amount: args.amount,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeChainSplitEvent(
  rawEvent: RawEventFromCache
): { originalLeafId: bigint; splitLeafId: bigint; remainderLeafId: bigint; splitAmount: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'ChainSplit') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    originalLeafId: args.noteId,
    splitLeafId: args.splitNoteIds[0],
    remainderLeafId: args.splitNoteIds[1],
    splitAmount: args.splitAmount,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNoteRevokedEvent(
  rawEvent: RawEventFromCache
): { noteId: bigint; revoker: `0x${string}`; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'NoteRevoked') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId,
    revoker: args.revoker,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeFundsReclaimedEvent(
  rawEvent: RawEventFromCache
): { noteId: bigint; owner: `0x${string}`; amount: bigint; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'FundsReclaimed') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId,
    owner: args.recipient,
    amount: args.amount,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeNoteConsumedEvent(
  rawEvent: RawEventFromCache
): { noteId: bigint; remainingAmount: bigint; deleted: boolean; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'NoteConsumed') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId,
    remainingAmount: args.spentAmount,
    deleted: args.deleted ?? false,
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

export function decodeERC1155PurchasedEvent(
  rawEvent: RawEventFromCache
): { inputNoteIds: bigint[]; outputNoteIds: bigint[]; tokenIds: bigint[]; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'ERC1155Purchased') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    inputNoteIds: [args.noteId],
    outputNoteIds: [args.noteId],
    tokenIds: [args.tokenId],
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}

// ============================================================================
// Typed NoteIntent event decoder
// ============================================================================

export function decodeNoteIntentAttestedEvent(
  rawEvent: RawEventFromCache
): { noteId: bigint; attester: `0x${string}`; intendedStatementId: string; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'NoteIntentAttested') return null;
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  return {
    noteId: args.noteId,
    attester: args.attester,
    intendedStatementId: bytes32ToCid(args.intentStatementId),
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}