import type {
  ContentItemRegisteredEvent,
  ContentItemReleasedEvent,
  ChannelVerifiedEvent,
  ChannelControlTakenEvent,
  ContractVetoedEvent,
  DepositedEvent,
  WithdrawnEvent,
  CreatorContractCreatedEvent,
} from '../events.js';
import type { ContentFundingState } from '../folds.js';
import { foldAllContentFundingEvents } from '../folds.js';
import type { SDKMachinery } from '../../../machinery.js';
import { fetchAllContentFundingEvents } from '../../../utils/eventCacheClient.js';
import {
  decodeContentItemRegisteredEvent,
  decodeContentItemReleasedEvent,
  decodeChannelVerifiedEvent,
  decodeChannelControlTakenEvent,
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

export async function fetchAndFoldContentFundingState(
  machinery: SDKMachinery,
): Promise<ContentFundingStateWithVetoedEvents | null> {
  const rawEvents = await fetchAllContentFundingEvents(machinery);
  if (rawEvents.length === 0 && !machinery.contractAddresses?.contentRegistry) {
    return null;
  }

  const contentRegistryEvents: (ContentItemRegisteredEvent | ContentItemReleasedEvent)[] = [];
  const channelRegistryEvents: (ChannelVerifiedEvent | ChannelControlTakenEvent)[] = [];
  const channelEscrowEvents: (DepositedEvent | WithdrawnEvent)[] = [];
  const creatorContractEvents: CreatorContractCreatedEvent[] = [];
  const contractVetoedEvents: ContractVetoedEvent[] = [];

  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'ContentItemRegistered': {
        const d = decodeContentItemRegisteredEvent(raw);
        if (d) contentRegistryEvents.push({ type: 'ContentItemRegistered', ...d });
        break;
      }
      case 'ContentItemReleased': {
        const d = decodeContentItemReleasedEvent(raw);
        if (d) contentRegistryEvents.push({ type: 'ContentItemReleased', contentId: d.contentId, contractAddress: d.contractAddress, blockNumber: d.blockNumber, blockTimestamp: d.blockTimestamp, transactionHash: d.transactionHash, logIndex: d.logIndex });
        break;
      }
      case 'ChannelVerified': {
        const d = decodeChannelVerifiedEvent(raw);
        if (d) channelRegistryEvents.push({ type: 'ChannelVerified', ...d });
        break;
      }
      case 'ChannelControlTaken': {
        const d = decodeChannelControlTakenEvent(raw);
        if (d) channelRegistryEvents.push({ type: 'ChannelControlTaken', ...d });
        break;
      }
      case 'ContractVetoed': {
        const d = decodeContractVetoedEvent(raw);
        if (d) contractVetoedEvents.push({ type: 'ContractVetoed', ...d });
        break;
      }
      case 'Deposited': {
        const d = decodeDepositedEvent(raw);
        if (d) channelEscrowEvents.push({ type: 'Deposited', ...d });
        break;
      }
      case 'Withdrawn': {
        const d = decodeWithdrawnEvent(raw);
        if (d) channelEscrowEvents.push({ type: 'Withdrawn', ...d });
        break;
      }
      case 'CreatorContractCreated': {
        const d = decodeCreatorContractCreatedEvent(raw);
        if (d) creatorContractEvents.push({ type: 'CreatorContractCreated', contractAddress: d.contractAddress, channelId: d.channelId, creator: d.creator, isThirdParty: d.isThirdParty, blockNumber: d.blockNumber, blockTimestamp: d.blockTimestamp, transactionHash: d.transactionHash, logIndex: d.logIndex });
        break;
      }
    }
  }

  const state = foldAllContentFundingEvents(
    sortedByBlockOrder(contentRegistryEvents),
    sortedByBlockOrder(channelRegistryEvents),
    sortedByBlockOrder(channelEscrowEvents),
    sortedByBlockOrder(creatorContractEvents),
  );

  return { state, vetoedEvents: contractVetoedEvents };
}
