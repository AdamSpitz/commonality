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
      { name: 'creator', type: 'address', indexed: false },
    ],
  },
] as const;

const ASSURANCE_CONTRACT_ABI = [
  {
    type: 'event',
    name: 'AssuranceContractInitialized',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
      { name: 'recipient', type: 'address', indexed: false },
      { name: 'condition', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ContractMetadataUpdated',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
      { name: 'metadataCid', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Offered',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
      { name: 'erc1155Addr', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'price', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Bought',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
      { name: 'participant', type: 'address', indexed: false },
      { name: 'erc1155Addr', type: 'address', indexed: false },
      { name: 'totalCost', type: 'uint256', indexed: false },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'counts', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Sold',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
      { name: 'participant', type: 'address', indexed: false },
      { name: 'erc1155Addr', type: 'address', indexed: false },
      { name: 'totalRefund', type: 'uint256', indexed: false },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'counts', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AssuranceContractWithdrawal',
    inputs: [
      { name: 'assuranceContract', type: 'address', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

const SECONDARY_MARKET_ABI = [
  {
    type: 'event',
    name: 'SaleListingCreated',
    inputs: [
      { name: 'saleListingId', type: 'uint256', indexed: false },
      { name: 'seller', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
      { name: 'pricePerToken', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SaleListingFulfilled',
    inputs: [
      { name: 'saleListingId', type: 'uint256', indexed: false },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SaleListingCancelled',
    inputs: [
      { name: 'saleListingId', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BuyOrderCreated',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: false },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
      { name: 'pricePerToken', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BuyOrderFulfilled',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: false },
      { name: 'seller', type: 'address', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BuyOrderCancelled',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: false },
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
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'creator', type: 'address', indexed: false },
      { name: 'chainHash', type: 'bytes32', indexed: false },
      { name: 'tokenType', type: 'uint8', indexed: false },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NoteDelegated',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'from', type: 'address', indexed: false },
      { name: 'to', type: 'address', indexed: false },
      { name: 'delegate', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ChainSplit',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'splitNoteIds', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NoteRevoked',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'revoker', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FundsReclaimed',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'recipient', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NoteConsumed',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'consumer', type: 'address', indexed: false },
      { name: 'spentAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ERC1155Purchased',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'erc1155Addr', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'count', type: 'uint256', indexed: false },
      { name: 'totalCost', type: 'uint256', indexed: false },
    ],
  },
] as const;

const NOTE_INTENT_ABI = [
  {
    type: 'event',
    name: 'NoteIntentAttested',
    inputs: [
      { name: 'noteId', type: 'uint256', indexed: false },
      { name: 'attester', type: 'address', indexed: false },
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
    ],
  },
] as const;

const MUTABLE_REF_UPDATER_ABI = [
  {
    type: 'event',
    name: 'RefUpdated',
    inputs: [
      { name: 'refName', type: 'string', indexed: false },
      { name: 'refValue', type: 'string', indexed: false },
      { name: 'updater', type: 'address', indexed: false },
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

export function decodeAlignmentAttestationEvent(rawEvent: RawEventFromCache): { attester: `0x${string}`; subjectAddress: `0x${string}`; statementId: string; contractAddress: `0x${string}`; blockNumber: bigint; blockTimestamp: bigint; transactionHash: `0x${string}`; logIndex: number } | null {
  if (rawEvent.eventName !== 'AlignmentAttestation') return null;
  
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    attester: args.attester,
    subjectAddress: args.subjectAddress,
    statementId: bytes32ToCid(args.statementId),
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

export function decodeMutableRefEvent(rawEvent: RawEventFromCache): { refName: string; refValue: string; updater: `0x${string}` } | null {
  if (rawEvent.eventName !== 'RefUpdated') return null;
  
  const args = decodeRawEventLog(rawEvent);
  if (!args) return null;
  
  return {
    refName: args.refName,
    refValue: args.refValue,
    updater: args.updater,
  };
}