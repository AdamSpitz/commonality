import type {
  ContentItemRegisteredEvent,
  ContentItemReleasedEvent,
  BeneficiaryVerifiedEvent,
  BeneficiaryControlTakenEvent,
  BeneficiaryControlReleasedEvent,
  ProjectDisavowedEvent,
  ProjectDisavowalWithdrawnEvent,
  PayoutAddressRotatedEvent,
  ContractVetoedEvent,
  DepositedEvent,
  WithdrawnEvent,
  CreatorContractCreatedEvent,
} from '../events.js';
import type { ContentFundingState, ContentItem, ChannelInfo } from '../folds.js';
import { CONTENT_FUNDING_FOLD_VERSION, foldAllContentFundingEvents, foldContentRegistry } from '../folds.js';
import type { SDKMachinery } from '../../../machinery.js';
import { fetchAllContentFundingEvents, readFinalizedThrough } from '../../../utils/eventCacheClient.js';
import { foldStoreKey, runResumableFold } from '../../../utils/resumableFold.js';
import {
  decodeContentItemRegisteredEvent,
  decodeContentItemReleasedEvent,
  decodeBeneficiaryVerifiedEvent,
  decodeBeneficiaryControlTakenEvent,
  decodeBeneficiaryControlReleasedEvent,
  decodeProjectDisavowedEvent,
  decodeProjectDisavowalWithdrawnEvent,
  decodePayoutAddressRotatedEvent,
  decodeContractVetoedEvent,
  decodeDepositedEvent,
  decodeWithdrawnEvent,
  decodeCreatorContractCreatedEvent,
} from '../../../utils/eventDecoder.js';
import { sortedByBlockOrder } from './order.js';

// ============================================================================
// fetchAndFoldContentFundingState
// ============================================================================

/**
 * Fetch all content-funding events from the event cache, decode and fold them
 * into a {@link ContentFundingState} ready for SDK query helpers.
 *
 * Returns null if the content-funding contract addresses are not configured.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Folded state and veto events, or null if content-funding is not configured
 */

/** Result of fetching and folding all content-funding events, including veto events. */
export interface ContentFundingStateWithVetoedEvents {
  /** The folded content-funding state. */
  state: ContentFundingState;
  /** ContractVetoed events (not folded into state, passed as query options). */
  vetoedEvents: ContractVetoedEvent[];
}

type ContentFundingFoldEvent =
  | ContentItemRegisteredEvent
  | ContentItemReleasedEvent
  | BeneficiaryVerifiedEvent
  | BeneficiaryControlTakenEvent
  | BeneficiaryControlReleasedEvent
  | ProjectDisavowedEvent
  | ProjectDisavowalWithdrawnEvent
  | PayoutAddressRotatedEvent
  | ContractVetoedEvent
  | DepositedEvent
  | WithdrawnEvent
  | CreatorContractCreatedEvent;

interface ContentFundingAccumulator {
  state: ContentFundingState;
  vetoedEvents: ContractVetoedEvent[];
}

function asBigint(value: bigint | string): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

function emptyContentFundingState(): ContentFundingState {
  return {
    contentRegistry: { items: new Map() },
    beneficiaryRegistry: { channels: new Map(), disavowedProjects: new Set() },
    beneficiaryEscrow: { balances: new Map() },
    creatorContracts: { contracts: new Map() },
  };
}

function emptyAccumulator(): ContentFundingAccumulator {
  return { state: emptyContentFundingState(), vetoedEvents: [] };
}

function isEmptyAccumulator(accumulator: ContentFundingAccumulator): boolean {
  const { state, vetoedEvents } = accumulator;
  return vetoedEvents.length === 0
    && state.contentRegistry.items.size === 0
    && state.beneficiaryRegistry.channels.size === 0
    && state.beneficiaryRegistry.disavowedProjects.size === 0
    && state.beneficiaryEscrow.balances.size === 0
    && state.creatorContracts.contracts.size === 0;
}

function decodeContentFundingEvent(raw: { eventName: string }): ContentFundingFoldEvent | null {
  switch (raw.eventName) {
    case 'ContentItemRegistered': {
      const decoded = decodeContentItemRegisteredEvent(raw as never);
      return decoded ? { type: 'ContentItemRegistered', ...decoded } : null;
    }
    case 'ContentItemReleased': {
      const decoded = decodeContentItemReleasedEvent(raw as never);
      return decoded ? { type: 'ContentItemReleased', contentId: decoded.contentId, contractAddress: decoded.contractAddress, blockNumber: decoded.blockNumber, blockTimestamp: decoded.blockTimestamp, transactionHash: decoded.transactionHash, logIndex: decoded.logIndex } : null;
    }
    case 'BeneficiaryVerified': {
      const decoded = decodeBeneficiaryVerifiedEvent(raw as never);
      return decoded ? { type: 'BeneficiaryVerified', ...decoded } : null;
    }
    case 'BeneficiaryControlTaken': {
      const decoded = decodeBeneficiaryControlTakenEvent(raw as never);
      return decoded ? { type: 'BeneficiaryControlTaken', ...decoded } : null;
    }
    case 'BeneficiaryControlReleased': {
      const decoded = decodeBeneficiaryControlReleasedEvent(raw as never);
      return decoded ? { type: 'BeneficiaryControlReleased', ...decoded } : null;
    }
    case 'ProjectDisavowed': {
      const decoded = decodeProjectDisavowedEvent(raw as never);
      return decoded ? { type: 'ProjectDisavowed', ...decoded } : null;
    }
    case 'ProjectDisavowalWithdrawn': {
      const decoded = decodeProjectDisavowalWithdrawnEvent(raw as never);
      return decoded ? { type: 'ProjectDisavowalWithdrawn', ...decoded } : null;
    }
    case 'PayoutAddressRotated': {
      const decoded = decodePayoutAddressRotatedEvent(raw as never);
      return decoded ? { type: 'PayoutAddressRotated', ...decoded } : null;
    }
    case 'ContractVetoed': {
      const decoded = decodeContractVetoedEvent(raw as never);
      return decoded ? { type: 'ContractVetoed', ...decoded } : null;
    }
    case 'Deposited': {
      const decoded = decodeDepositedEvent(raw as never);
      return decoded ? { type: 'Deposited', ...decoded } : null;
    }
    case 'Withdrawn': {
      const decoded = decodeWithdrawnEvent(raw as never);
      return decoded ? { type: 'Withdrawn', ...decoded } : null;
    }
    case 'CreatorContractCreated': {
      const decoded = decodeCreatorContractCreatedEvent(raw as never);
      return decoded ? { type: 'CreatorContractCreated', contractAddress: decoded.contractAddress, channelId: decoded.channelId, creator: decoded.creator, isThirdParty: decoded.isThirdParty, blockNumber: decoded.blockNumber, blockTimestamp: decoded.blockTimestamp, transactionHash: decoded.transactionHash, logIndex: decoded.logIndex } : null;
    }
    default:
      return null;
  }
}

function stepContentFunding(accumulator: ContentFundingAccumulator, events: ContentFundingFoldEvent[]): ContentFundingAccumulator {
  const contentRegistryEvents: (ContentItemRegisteredEvent | ContentItemReleasedEvent)[] = [];
  const beneficiaryRegistryEvents: (BeneficiaryVerifiedEvent | BeneficiaryControlTakenEvent | BeneficiaryControlReleasedEvent | PayoutAddressRotatedEvent | ProjectDisavowedEvent | ProjectDisavowalWithdrawnEvent)[] = [];
  const beneficiaryEscrowEvents: (DepositedEvent | WithdrawnEvent)[] = [];
  const creatorContractEvents: CreatorContractCreatedEvent[] = [];
  const vetoedEvents = [...accumulator.vetoedEvents];

  for (const event of events) {
    switch (event.type) {
      case 'ContentItemRegistered':
      case 'ContentItemReleased':
        contentRegistryEvents.push(event);
        break;
      case 'BeneficiaryVerified':
      case 'BeneficiaryControlTaken':
      case 'BeneficiaryControlReleased':
      case 'ProjectDisavowed':
      case 'ProjectDisavowalWithdrawn':
      case 'PayoutAddressRotated':
        beneficiaryRegistryEvents.push(event);
        break;
      case 'Deposited':
      case 'Withdrawn':
        beneficiaryEscrowEvents.push(event);
        break;
      case 'CreatorContractCreated':
        creatorContractEvents.push(event);
        break;
      case 'ContractVetoed':
        vetoedEvents.push(event);
        break;
    }
  }

  return {
    state: foldAllContentFundingEvents(
      sortedByBlockOrder(contentRegistryEvents),
      sortedByBlockOrder(beneficiaryRegistryEvents),
      sortedByBlockOrder(beneficiaryEscrowEvents),
      sortedByBlockOrder(creatorContractEvents),
      accumulator.state,
    ),
    vetoedEvents,
  };
}

function serializeAccumulator(accumulator: ContentFundingAccumulator): unknown {
  const { state } = accumulator;
  return {
    items: [...state.contentRegistry.items.entries()]
      .filter((entry): entry is [string, ContentItem] => typeof entry[0] === 'string')
      .map(([key, item]) => [key, { ...item, contentId: item.contentId.toString() }]),
    channels: [...state.beneficiaryRegistry.channels.entries()].map(([id, info]) => [id, {
      ...info,
      controlTakenAt: info.controlTakenAt?.toString() ?? null,
    }]),
    disavowedProjects: [...state.beneficiaryRegistry.disavowedProjects],
    balances: [...state.beneficiaryEscrow.balances.entries()].map(([id, entry]) => [id, {
      balance: entry.balance.toString(),
      totalDeposited: entry.totalDeposited.toString(),
      totalWithdrawn: entry.totalWithdrawn.toString(),
    }]),
    contracts: [...state.creatorContracts.contracts.entries()],
    vetoedEvents: accumulator.vetoedEvents.map(event => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
      blockTimestamp: event.blockTimestamp.toString(),
    })),
  };
}

function deserializeAccumulator(raw: unknown): ContentFundingAccumulator {
  const record = raw as {
    items: [string, Omit<ContentItem, 'contentId'> & { contentId: string }][];
    channels: [string, Omit<ChannelInfo, 'controlTakenAt'> & { controlTakenAt: string | null }][];
    disavowedProjects: string[];
    balances: [string, { balance: string; totalDeposited: string; totalWithdrawn: string }][];
    contracts: [string, ContentFundingState['creatorContracts']['contracts'] extends Map<string, infer T> ? T : never][];
    vetoedEvents: (Omit<ContractVetoedEvent, 'blockNumber' | 'blockTimestamp'> & { blockNumber: string; blockTimestamp: string })[];
  };
  return {
    state: {
      contentRegistry: foldContentRegistry([], {
        items: new Map(record.items.map(([key, item]) => [key, { ...item, contentId: asBigint(item.contentId) }])),
      }),
      beneficiaryRegistry: {
        channels: new Map(record.channels.map(([id, info]) => [id, {
          ...info,
          controlTakenAt: info.controlTakenAt == null ? null : asBigint(info.controlTakenAt),
        }])),
        disavowedProjects: new Set(record.disavowedProjects),
      },
      beneficiaryEscrow: {
        balances: new Map(record.balances.map(([id, entry]) => [id, {
          balance: asBigint(entry.balance),
          totalDeposited: asBigint(entry.totalDeposited),
          totalWithdrawn: asBigint(entry.totalWithdrawn),
        }])),
      },
      creatorContracts: { contracts: new Map(record.contracts) },
    },
    vetoedEvents: record.vetoedEvents.map(event => ({
      ...event,
      type: 'ContractVetoed' as const,
      blockNumber: asBigint(event.blockNumber),
      blockTimestamp: asBigint(event.blockTimestamp),
    })),
  };
}

export async function fetchAndFoldContentFundingState(
  machinery: SDKMachinery,
): Promise<ContentFundingStateWithVetoedEvents | null> {
  const addresses = machinery.contractAddresses;
  const contracts = [
    addresses?.contentRegistry,
    addresses?.beneficiaryRegistry,
    addresses?.beneficiaryEscrow,
    addresses?.creatorContractFactory,
  ].filter((address): address is `0x${string}` => address != null);

  const folded = await runResumableFold<ContentFundingFoldEvent, ContentFundingAccumulator, ContentFundingAccumulator>({
    id: 'content-funding',
    version: CONTENT_FUNDING_FOLD_VERSION,
    key: foldStoreKey({
      chainId: machinery.defaultChainId ?? 0,
      eventCacheUrl: machinery.eventCacheUrl ?? '',
      contracts,
      id: 'content-funding',
      version: CONTENT_FUNDING_FOLD_VERSION,
    }),
    store: machinery.foldStore,
    empty: emptyAccumulator,
    fetch: async cursor => {
      const rawEvents = await fetchAllContentFundingEvents(machinery, cursor ? BigInt(cursor.blockNumber) : 0n);
      return {
        events: rawEvents.flatMap(raw => {
          const decoded = decodeContentFundingEvent(raw);
          return decoded ? [decoded] : [];
        }),
        finalizedThrough: await readFinalizedThrough(machinery, 'ContentItemRegistered'),
      };
    },
    position: event => ({ blockNumber: event.blockNumber.toString(), logIndex: event.logIndex }),
    step: stepContentFunding,
    serialize: serializeAccumulator,
    deserialize: deserializeAccumulator,
    finish: accumulator => accumulator,
  });

  if (isEmptyAccumulator(folded) && !addresses?.contentRegistry) return null;
  return { state: folded.state, vetoedEvents: folded.vetoedEvents };
}
