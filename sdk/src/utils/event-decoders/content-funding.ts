import {
  ChannelEscrowAbi,
  ChannelRegistryAbi,
  ContentRegistryAbi,
  CreatorAssuranceContractFactoryAbi,
  MaterializedContentTokensAbi,
  ProspectiveContentRoundFactoryAbi,
} from '../../abis.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export function decodeContentItemRegisteredEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, ContentRegistryAbi);
  if (!args) return null;
  return {
    contentId: args.contentId as bigint,
    assuranceContract: args.assuranceContract as `0x${string}`,
    canonicalId: args.canonicalId as string,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeContentItemReleasedEvent(
  rawEvent: RawEventFromCache,
): {
  contentId: bigint;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContentItemReleased') return null;
  const args = decodeRawEventArgs(rawEvent, ContentRegistryAbi);
  if (!args) return null;
  return {
    contentId: args.contentId as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeChannelVerifiedEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, ChannelRegistryAbi);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    owner: args.owner as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeChannelControlTakenEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, ChannelRegistryAbi);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    owner: args.owner as `0x${string}`,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeContractVetoedEvent(
  rawEvent: RawEventFromCache,
): {
  channelId: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'ContractVetoed') return null;
  const args = decodeRawEventArgs(rawEvent, ChannelRegistryAbi);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeDepositedEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, ChannelEscrowAbi);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    from: args.from as `0x${string}`,
    amount: args.amount as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeWithdrawnEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, ChannelEscrowAbi);
  if (!args) return null;
  return {
    channelId: args.channelId as string,
    to: args.to as `0x${string}`,
    amount: args.amount as bigint,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeCreatorContractCreatedEvent(
  rawEvent: RawEventFromCache,
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
  const args = decodeRawEventArgs(rawEvent, CreatorAssuranceContractFactoryAbi);
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

const PROSPECTIVE_EVENT_ABIS: Record<string, readonly unknown[]> = {
  ProspectiveRoundCreated: ProspectiveContentRoundFactoryAbi,
  ProspectiveRoundMaterialized: ProspectiveContentRoundFactoryAbi,
  ContentMaterialized: MaterializedContentTokensAbi,
  ContentTokenClaimed: MaterializedContentTokensAbi,
};

export function decodeProspectiveContentEvent(
  rawEvent: RawEventFromCache,
): import('../../subsystems/content-funding/events.js').ProspectiveContentEvent | null {
  const abi = PROSPECTIVE_EVENT_ABIS[rawEvent.eventName];
  if (!abi) return null;
  const args = decodeRawEventArgs(rawEvent, abi);
  if (!args) return null;
  return {
    ...args,
    type: rawEvent.eventName,
    contractAddress: rawEvent.contractAddress,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash,
    logIndex: rawEvent.logIndex,
  } as import('../../subsystems/content-funding/events.js').ProspectiveContentEvent;
}
