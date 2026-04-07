import type {
  ContentItemRegisteredEvent,
  ContentItemReleasedEvent,
  ChannelVerifiedEvent,
  ChannelControlTakenEvent,
  DepositedEvent,
  WithdrawnEvent,
  CreatorContractCreatedEvent,
} from './events.js';

export interface ContentItem {
  contentId: bigint;
  contractAddress: string;
  canonicalId: string;
  status: 'active' | 'released';
}

export interface ContentRegistryState {
  items: Map<bigint, ContentItem>;
}

export function foldContentRegistry(
  events: (ContentItemRegisteredEvent | ContentItemReleasedEvent)[],
): ContentRegistryState {
  const items = new Map<bigint, ContentItem>();

  for (const event of events) {
    if (event.type === 'ContentItemRegistered') {
      items.set(event.contentId, {
        contentId: event.contentId,
        contractAddress: event.assuranceContract,
        canonicalId: event.canonicalId,
        status: 'active',
      });
    } else if (event.type === 'ContentItemReleased') {
      const existing = items.get(event.contentId);
      if (existing) {
        existing.status = 'released';
      }
    }
  }

  return { items };
}

export type ChannelState = 'unclaimed' | 'verified' | 'creator-controlled';

export interface ChannelInfo {
  channelId: string;
  owner: string | null;
  state: ChannelState;
  controlTakenAt: bigint | null;
}

export interface ChannelRegistryState {
  channels: Map<string, ChannelInfo>;
}

export function foldChannelState(
  events: (ChannelVerifiedEvent | ChannelControlTakenEvent)[],
): ChannelRegistryState {
  const channels = new Map<string, ChannelInfo>();

  for (const event of events) {
    if (event.type === 'ChannelVerified') {
      channels.set(event.channelId, {
        channelId: event.channelId,
        owner: event.owner,
        state: 'verified',
        controlTakenAt: null,
      });
    } else if (event.type === 'ChannelControlTaken') {
      const existing = channels.get(event.channelId);
      if (existing) {
        existing.state = 'creator-controlled';
        existing.owner = event.owner;
        existing.controlTakenAt = event.blockTimestamp;
      }
    }
  }

  return { channels };
}

export interface ChannelEscrowState {
  balances: Map<string, { balance: bigint; totalDeposited: bigint; totalWithdrawn: bigint }>;
}

export function foldChannelEscrow(events: (DepositedEvent | WithdrawnEvent)[]): ChannelEscrowState {
  const balances = new Map<string, { balance: bigint; totalDeposited: bigint; totalWithdrawn: bigint }>();

  for (const event of events) {
    const entry = balances.get(event.channelId) ?? { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n };

    if (event.type === 'Deposited') {
      entry.balance += event.amount;
      entry.totalDeposited += event.amount;
    } else if (event.type === 'Withdrawn') {
      entry.balance -= event.amount;
      entry.totalWithdrawn += event.amount;
    }

    balances.set(event.channelId, entry);
  }

  return { balances };
}

export interface CreatorContractInfo {
  contractAddress: string;
  channelId: string;
  erc1155: string;
  isThirdParty: boolean;
}

export interface CreatorContractsState {
  contracts: Map<string, CreatorContractInfo>;
}

export function foldCreatorContracts(events: CreatorContractCreatedEvent[]): CreatorContractsState {
  const contracts = new Map<string, CreatorContractInfo>();

  for (const event of events) {
    contracts.set(event.contractAddress, {
      contractAddress: event.contractAddress,
      channelId: event.channelId,
      erc1155: event.erc1155,
      isThirdParty: event.isThirdParty,
    });
  }

  return { contracts };
}

export interface ContentFundingState {
  contentRegistry: ContentRegistryState;
  channelRegistry: ChannelRegistryState;
  channelEscrow: ChannelEscrowState;
  creatorContracts: CreatorContractsState;
}

export function foldAllContentFundingEvents(
  contentRegistryEvents: (ContentItemRegisteredEvent | ContentItemReleasedEvent)[],
  channelRegistryEvents: (ChannelVerifiedEvent | ChannelControlTakenEvent)[],
  channelEscrowEvents: (DepositedEvent | WithdrawnEvent)[],
  creatorContractEvents: CreatorContractCreatedEvent[],
): ContentFundingState {
  return {
    contentRegistry: foldContentRegistry(contentRegistryEvents),
    channelRegistry: foldChannelState(channelRegistryEvents),
    channelEscrow: foldChannelEscrow(channelEscrowEvents),
    creatorContracts: foldCreatorContracts(creatorContractEvents),
  };
}