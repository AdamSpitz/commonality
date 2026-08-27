import {
  AssuranceContractAbi,
  AssuranceContractFactoryAbi,
  PremintingERC1155Abi,
  ProjectFactoryAbi,
} from '../../abis.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export function decodeLazyGivingAssuranceContractCreatedEvent(
  rawEvent: RawEventFromCache,
): {
  assuranceContract: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'LazyGivingAssuranceContractCreated') return null;
  const args = decodeRawEventArgs(rawEvent, AssuranceContractFactoryAbi);
  if (!args) return null;
  return {
    assuranceContract: args.assuranceContract as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeProjectCreatedEvent(
  rawEvent: RawEventFromCache,
): {
  creator: `0x${string}`;
  token: `0x${string}`;
  assuranceContract: `0x${string}`;
  condition: `0x${string}`;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ProjectCreated') return null;
  const args = decodeRawEventArgs(rawEvent, ProjectFactoryAbi);
  if (!args) return null;
  return {
    creator: args.creator as `0x${string}`,
    token: args.token as `0x${string}`,
    assuranceContract: args.assuranceContract as `0x${string}`,
    condition: args.condition as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeAssuranceContractInitializedEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    recipient: args.recipient as `0x${string}`,
    condition: args.condition as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeContractMetadataUpdatedEvent(
  rawEvent: RawEventFromCache,
): {
  metadata: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContractMetadataUpdated') return null;
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    metadata: args.metadata as string,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeERC1155OfferedEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    erc1155Addr: args.erc1155Addr as `0x${string}`,
    id: args.id as bigint,
    price: args.price as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeERC1155BoughtEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    participant: args.participant as `0x${string}`,
    erc1155Addr: args.erc1155Addr as `0x${string}`,
    totalCost: args.totalCost as bigint,
    ids: args.ids as bigint[],
    counts: args.counts as bigint[],
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeERC1155SoldEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    participant: args.participant as `0x${string}`,
    erc1155Addr: args.erc1155Addr as `0x${string}`,
    totalCost: args.totalCost as bigint,
    ids: args.ids as bigint[],
    counts: args.counts as bigint[],
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeAssuranceContractWithdrawalEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    recipient: args.recipient as `0x${string}`,
    value: args.value as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

function decodeReimbursementAmountEvent(
  rawEvent: RawEventFromCache,
  eventName: 'RetroactiveDonationReceived' | 'ReimbursementWithdrawn' | 'ReimbursementForgone',
  addressField: 'donor' | 'contributor',
): {
  donor?: `0x${string}`;
  contributor?: `0x${string}`;
  amount: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== eventName) return null;
  const args = decodeRawEventArgs(rawEvent, AssuranceContractAbi);
  if (!args) return null;
  return {
    [addressField]: args[addressField] as `0x${string}`,
    amount: args.amount as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeRetroactiveDonationReceivedEvent(rawEvent: RawEventFromCache) {
  const decoded = decodeReimbursementAmountEvent(rawEvent, 'RetroactiveDonationReceived', 'donor');
  if (!decoded?.donor) return null;
  return { ...decoded, donor: decoded.donor };
}

export function decodeReimbursementWithdrawnEvent(rawEvent: RawEventFromCache) {
  const decoded = decodeReimbursementAmountEvent(rawEvent, 'ReimbursementWithdrawn', 'contributor');
  if (!decoded?.contributor) return null;
  return { ...decoded, contributor: decoded.contributor };
}

export function decodeReimbursementForgoneEvent(rawEvent: RawEventFromCache) {
  const decoded = decodeReimbursementAmountEvent(rawEvent, 'ReimbursementForgone', 'contributor');
  if (!decoded?.contributor) return null;
  return { ...decoded, contributor: decoded.contributor };
}

export function decodeTransferSingleEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, PremintingERC1155Abi);
  if (!args) return null;
  return {
    operator: args.operator as `0x${string}`,
    from: args.from as `0x${string}`,
    to: args.to as `0x${string}`,
    id: args.id as bigint,
    value: args.value as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeTransferBatchEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, PremintingERC1155Abi);
  if (!args) return null;
  return {
    operator: args.operator as `0x${string}`,
    from: args.from as `0x${string}`,
    to: args.to as `0x${string}`,
    ids: args.ids as bigint[],
    values: args.values as bigint[],
    ...decodedLogMeta(rawEvent),
  };
}
