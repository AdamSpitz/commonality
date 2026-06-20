import type {
  ContentItemRegisteredEvent,
  ContentItemReleasedEvent,
  ChannelVerifiedEvent,
  ChannelControlTakenEvent,
  DepositedEvent,
  WithdrawnEvent,
  CreatorContractCreatedEvent,
} from './events.js';

/** A registered content item linked to an assurance contract. */
export interface ContentItem {
  /** Numeric content ID assigned by the ContentRegistry. */
  contentId: bigint;
  /** Address of the ContentRegistry version that assigned contentId. */
  contentRegistryAddress?: string;
  /** Address of the assurance contract this content is registered to. */
  contractAddress: string;
  /** Platform-specific canonical ID (e.g. "twitter:uid:123:456"). */
  canonicalId: string;
  /** 'active' until explicitly released by the contract. */
  status: 'active' | 'released';
}

/** Folded state of the ContentRegistry contract. */
export interface ContentRegistryState {
  /**
   * Map from content item key to ContentItem.
   *
   * Primary keys are `${contentRegistryAddress}:${contentId}` so multiple
   * ContentRegistry versions with restarted auto-increment IDs cannot collide.
   * For backwards-compatible single-registry callers, an unambiguous bare
   * contentId key is also exposed.
   */
  items: Map<string | bigint, ContentItem>;
}

function contractScopedId(contractAddress: `0x${string}`, id: bigint): string {
  return `${contractAddress.toLowerCase()}:${id.toString()}`;
}

export function getContentItemKey(item: ContentItem): string {
  return item.contentRegistryAddress
    ? contractScopedId(item.contentRegistryAddress as `0x${string}`, item.contentId)
    : item.contentId.toString();
}

function exposeUnambiguousBareContentIds(items: Map<string | bigint, ContentItem>): void {
  const bareIdCounts = new Map<bigint, number>();
  const scopedItems = [...items.values()];

  for (const item of scopedItems) {
    bareIdCounts.set(item.contentId, (bareIdCounts.get(item.contentId) ?? 0) + 1);
  }

  for (const item of scopedItems) {
    if (bareIdCounts.get(item.contentId) === 1) {
      items.set(item.contentId, item);
    }
  }
}

/**
 * Fold ContentItemRegistered and ContentItemReleased events into registry state.
 *
 * Each registered event creates an item; each released event marks it inactive.
 */
export function foldContentRegistry(
  events: (ContentItemRegisteredEvent | ContentItemReleasedEvent)[],
): ContentRegistryState {
  const items = new Map<string | bigint, ContentItem>();

  for (const event of events) {
    const key = contractScopedId(event.contractAddress, event.contentId);

    if (event.type === 'ContentItemRegistered') {
      items.set(key, {
        contentId: event.contentId,
        contentRegistryAddress: event.contractAddress,
        contractAddress: event.assuranceContract,
        canonicalId: event.canonicalId,
        status: 'active',
      });
    } else if (event.type === 'ContentItemReleased') {
      const existing = items.get(key);
      if (existing) {
        existing.status = 'released';
      }
    }
  }

  exposeUnambiguousBareContentIds(items);

  return { items };
}

/** Lifecycle state of a channel in the ChannelRegistry. */
export type ChannelState = 'unclaimed' | 'verified' | 'creator-controlled';

/** Current state of a channel (creator account) in the registry. */
export interface ChannelInfo {
  /** Bytes32 keccak256 hash of the channel's canonical ID. */
  channelId: string;
  /** Ethereum address of the verified owner, or null if unclaimed. */
  owner: string | null;
  /** Current lifecycle state. */
  state: ChannelState;
  /** Block timestamp when the owner took control, or null. */
  controlTakenAt: bigint | null;
}

/** Folded state of the ChannelRegistry contract. */
export interface ChannelRegistryState {
  /** Map from channelId (bytes32) to ChannelInfo. */
  channels: Map<string, ChannelInfo>;
}

/**
 * Fold ChannelVerified and ChannelControlTaken events into registry state.
 *
 * Verified events register a channel with an owner. ControlTaken events
 * transition to 'creator-controlled' and record the timestamp.
 */
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

/** Folded state of the ChannelEscrow contract. */
export interface ChannelEscrowState {
  /** Map from channelId (bytes32) to balance tracking. */
  balances: Map<string, { balance: bigint; totalDeposited: bigint; totalWithdrawn: bigint }>;
}

/**
 * Fold Deposited and Withdrawn events into escrow balance state.
 *
 * Deposits increase balance; withdrawals decrease it. Both are tracked
 * cumulatively for reporting.
 */
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

/** Metadata for a content-funding contract created via the factory. */
export interface CreatorContractInfo {
  /** Address of the assurance contract. */
  contractAddress: string;
  /** Bytes32 channel ID this contract is associated with. */
  channelId: string;
  /** Address of the contract creator. */
  creator: string;
  /** Whether created by a third party (not the channel owner). */
  isThirdParty: boolean;
}

/** Folded state of the CreatorAssuranceContractFactory. */
export interface CreatorContractsState {
  /** Map from contract address (lowercased) to CreatorContractInfo. */
  contracts: Map<string, CreatorContractInfo>;
}

/**
 * Fold CreatorContractCreated events into a map of known contracts.
 */
export function foldCreatorContracts(events: CreatorContractCreatedEvent[]): CreatorContractsState {
  const contracts = new Map<string, CreatorContractInfo>();

  for (const event of events) {
    const contractAddress = event.contractAddress.toLowerCase();
    contracts.set(contractAddress, {
      contractAddress,
      channelId: event.channelId,
      creator: event.creator,
      isThirdParty: event.isThirdParty,
    });
  }

  return { contracts };
}

/** Combined folded state across all four content-funding contracts. */
export interface ContentFundingState {
  contentRegistry: ContentRegistryState;
  channelRegistry: ChannelRegistryState;
  channelEscrow: ChannelEscrowState;
  creatorContracts: CreatorContractsState;
}

/**
 * Fold events from all four content-funding contracts into a single state object.
 *
 * @param contentRegistryEvents - ContentItemRegistered and ContentItemReleased events
 * @param channelRegistryEvents - ChannelVerified and ChannelControlTaken events
 * @param channelEscrowEvents - Deposited and Withdrawn events
 * @param creatorContractEvents - CreatorContractCreated events
 * @returns Combined ContentFundingState
 */
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
