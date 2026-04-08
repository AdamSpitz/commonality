import type { Project } from '../pubstarter/types.js';
import type {
  ContentItemRegisteredEvent,
  ContentItemReleasedEvent,
  ChannelVerifiedEvent,
  ChannelControlTakenEvent,
  ContractVetoedEvent,
  DepositedEvent,
  WithdrawnEvent,
  CreatorContractCreatedEvent,
} from './events.js';
import type {
  ChannelEscrowState,
  ChannelInfo,
  ContentFundingState,
  ContentItem,
  CreatorContractInfo,
} from './folds.js';
import { foldAllContentFundingEvents } from './folds.js';
import { extractChannelCanonicalIdFromContentCanonicalId } from './canonicalization.js';
import type { SDKMachinery } from '../../machinery.js';
import { fetchAllContentFundingEvents } from '../../utils/eventCacheClient.js';
import {
  decodeContentItemRegisteredEvent,
  decodeContentItemReleasedEvent,
  decodeChannelVerifiedEvent,
  decodeChannelControlTakenEvent,
  decodeContractVetoedEvent,
  decodeDepositedEvent,
  decodeWithdrawnEvent,
  decodeCreatorContractCreatedEvent,
} from '../../utils/eventDecoder.js';

export const DEFAULT_VETO_WINDOW_SECONDS = 7n * 24n * 60n * 60n;

export type ContentFundingContractStatus = 'active' | 'successful' | 'failed' | 'vetoed' | 'unknown';
export type ContentItemRegistrationStatus = 'unregistered' | 'active' | 'released';

export interface ContentFundingContractSummary extends CreatorContractInfo {
  project: Project | null;
  contentItems: ContentItem[];
  status: ContentFundingContractStatus;
  fundingProgress: number | null;
}

export interface ChannelOverview {
  channel: ChannelInfo;
  escrow: {
    balance: bigint;
    totalDeposited: bigint;
    totalWithdrawn: bigint;
  };
  contracts: ContentFundingContractSummary[];
  contentItems: ContentItem[];
}

export interface ContentItemStatus {
  contentId: bigint;
  registrationStatus: ContentItemRegistrationStatus;
  canonicalId: string | null;
  contractAddress: string | null;
  contract: ContentFundingContractSummary | null;
}

export interface ContentFundingQueryOptions {
  projects?: Iterable<Project>;
  vetoedEvents?: Iterable<ContractVetoedEvent>;
  now?: bigint;
  vetoWindowSeconds?: bigint;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function buildProjectMap(projects: Iterable<Project>): Map<string, Project> {
  const projectMap = new Map<string, Project>();

  for (const project of projects) {
    projectMap.set(normalizeAddress(project.id), project);
  }

  return projectMap;
}

function buildVetoedContractSet(vetoedEvents: Iterable<ContractVetoedEvent>): Set<string> {
  const vetoedContracts = new Set<string>();

  for (const event of vetoedEvents) {
    vetoedContracts.add(normalizeAddress(event.contractAddress));
  }

  return vetoedContracts;
}

function indexContentItemsByContract(
  state: ContentFundingState,
  channelId?: string,
): Map<string, ContentItem[]> {
  const contractToItems = new Map<string, ContentItem[]>();
  const contractLookup = state.creatorContracts.contracts;

  for (const item of state.contentRegistry.items.values()) {
    const contract = contractLookup.get(normalizeAddress(item.contractAddress));
    if (channelId && contract?.channelId !== channelId) {
      continue;
    }

    const key = normalizeAddress(item.contractAddress);
    const items = contractToItems.get(key) ?? [];
    items.push(item);
    contractToItems.set(key, items);
  }

  for (const items of contractToItems.values()) {
    items.sort((a, b) => {
      if (a.contentId < b.contentId) return -1;
      if (a.contentId > b.contentId) return 1;
      return 0;
    });
  }

  return contractToItems;
}

function sortContracts(contracts: ContentFundingContractSummary[]): ContentFundingContractSummary[] {
  return contracts.sort((a, b) => {
    const aCreatedAt = a.project?.createdAt ? BigInt(a.project.createdAt) : null;
    const bCreatedAt = b.project?.createdAt ? BigInt(b.project.createdAt) : null;

    if (aCreatedAt !== null && bCreatedAt !== null && aCreatedAt !== bCreatedAt) {
      return aCreatedAt < bCreatedAt ? -1 : 1;
    }

    const aBlock = a.project?.blockNumber ? BigInt(a.project.blockNumber) : null;
    const bBlock = b.project?.blockNumber ? BigInt(b.project.blockNumber) : null;
    if (aBlock !== null && bBlock !== null && aBlock !== bBlock) {
      return aBlock < bBlock ? -1 : 1;
    }

    return normalizeAddress(a.contractAddress).localeCompare(normalizeAddress(b.contractAddress));
  });
}

function getFundingProgress(project: Project | null): number | null {
  if (!project) return null;

  const threshold = BigInt(project.threshold);
  if (threshold <= 0n) return null;

  return Number((BigInt(project.totalReceived) * 10000n) / threshold) / 10000;
}

function getContractStatus(
  project: Project | null,
  now: bigint | undefined,
  isVetoed: boolean,
): ContentFundingContractStatus {
  if (isVetoed) return 'vetoed';
  if (!project) return 'unknown';

  const threshold = BigInt(project.threshold);
  const totalReceived = BigInt(project.totalReceived);
  if (threshold > 0n && totalReceived >= threshold) {
    return 'successful';
  }

  const deadline = BigInt(project.deadline);
  if (now !== undefined && deadline > 0n && now > deadline) {
    return 'failed';
  }

  return 'active';
}

function buildContractSummary(
  contract: CreatorContractInfo,
  projectMap: Map<string, Project>,
  contentItemsByContract: Map<string, ContentItem[]>,
  vetoedContracts: Set<string>,
  now: bigint | undefined,
): ContentFundingContractSummary {
  const normalizedContractAddress = normalizeAddress(contract.contractAddress);
  const project = projectMap.get(normalizedContractAddress) ?? null;
  const contentItems = contentItemsByContract.get(normalizedContractAddress) ?? [];

  return {
    ...contract,
    project,
    contentItems,
    status: getContractStatus(project, now, vetoedContracts.has(normalizedContractAddress)),
    fundingProgress: getFundingProgress(project),
  };
}

function getDefaultChannelInfo(channelId: string): ChannelInfo {
  return {
    channelId,
    owner: null,
    state: 'unclaimed',
    controlTakenAt: null,
  };
}

function getEscrowEntry(
  channelEscrow: ChannelEscrowState,
  channelId: string,
): { balance: bigint; totalDeposited: bigint; totalWithdrawn: bigint } {
  return channelEscrow.balances.get(channelId) ?? {
    balance: 0n,
    totalDeposited: 0n,
    totalWithdrawn: 0n,
  };
}

export function getContractsForChannel(
  state: ContentFundingState,
  channelId: string,
  options: ContentFundingQueryOptions = {},
): ContentFundingContractSummary[] {
  const projectMap = buildProjectMap(options.projects ?? []);
  const vetoedContracts = buildVetoedContractSet(options.vetoedEvents ?? []);
  const contentItemsByContract = indexContentItemsByContract(state, channelId);

  const contracts = Array.from(state.creatorContracts.contracts.values())
    .filter((contract) => contract.channelId === channelId)
    .map((contract) => buildContractSummary(contract, projectMap, contentItemsByContract, vetoedContracts, options.now));

  return sortContracts(contracts);
}

export function getChannelOverview(
  state: ContentFundingState,
  channelId: string,
  options: ContentFundingQueryOptions = {},
): ChannelOverview {
  const contracts = getContractsForChannel(state, channelId, options);
  const contentItems = contracts.flatMap((contract) => contract.contentItems);

  return {
    channel: state.channelRegistry.channels.get(channelId) ?? getDefaultChannelInfo(channelId),
    escrow: getEscrowEntry(state.channelEscrow, channelId),
    contracts,
    contentItems,
  };
}

export function getContentItemStatus(
  state: ContentFundingState,
  contentId: bigint,
  options: ContentFundingQueryOptions = {},
): ContentItemStatus {
  const item = state.contentRegistry.items.get(contentId);
  if (!item) {
    return {
      contentId,
      registrationStatus: 'unregistered',
      canonicalId: null,
      contractAddress: null,
      contract: null,
    };
  }

  const contractInfo = state.creatorContracts.contracts.get(normalizeAddress(item.contractAddress));
  const contract = contractInfo
    ? buildContractSummary(
        contractInfo,
        buildProjectMap(options.projects ?? []),
        indexContentItemsByContract(state),
        buildVetoedContractSet(options.vetoedEvents ?? []),
        options.now,
      )
    : null;

  return {
    contentId,
    registrationStatus: item.status,
    canonicalId: item.canonicalId,
    contractAddress: item.contractAddress,
    contract,
  };
}

export function getVetoableContracts(
  state: ContentFundingState,
  channelId: string,
  options: ContentFundingQueryOptions = {},
): ContentFundingContractSummary[] {
  const channel = state.channelRegistry.channels.get(channelId);
  if (!channel || channel.state !== 'creator-controlled' || channel.controlTakenAt === null) {
    return [];
  }

  const now = options.now;
  if (now === undefined) {
    return [];
  }

  const vetoWindowSeconds = options.vetoWindowSeconds ?? DEFAULT_VETO_WINDOW_SECONDS;
  if (now > channel.controlTakenAt + vetoWindowSeconds) {
    return [];
  }

  return getContractsForChannel(state, channelId, options).filter((contract) => (
    contract.isThirdParty && contract.status === 'active'
  ));
}

// ============================================================================
// Channel canonical ID helpers
// ============================================================================

/**
 * Build a map from bytes32 channelId → human-readable channel canonical ID.
 *
 * On-chain, channelId is stored as keccak256(channelCanonicalId). The only
 * way to recover the human-readable form is from content item canonical IDs,
 * which embed it as a prefix (e.g. "twitter:uid:12345:67890").
 */
export function buildChannelCanonicalIdMap(state: ContentFundingState): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of state.contentRegistry.items.values()) {
    try {
      const channelCanonicalId = extractChannelCanonicalIdFromContentCanonicalId(item.canonicalId);
      const contractAddress = item.contractAddress.toLowerCase();
      const contract = state.creatorContracts.contracts.get(contractAddress);
      if (contract && !map.has(contract.channelId)) {
        map.set(contract.channelId, channelCanonicalId);
      }
    } catch {
      // Skip items whose canonical ID cannot be parsed
    }
  }
  return map;
}

// ============================================================================
// getAllChannelOverviews
// ============================================================================

export interface ChannelWithCanonicalId extends ChannelOverview {
  /** Human-readable canonical channel ID (e.g. "twitter:uid:12345"), or null if unavailable. */
  canonicalChannelId: string | null;
}

/**
 * Return an overview for every channel that appears in the state —
 * from channelRegistry, creator contracts, or content items.
 */
export function getAllChannelOverviews(
  state: ContentFundingState,
  options: ContentFundingQueryOptions = {},
): ChannelWithCanonicalId[] {
  const channelIds = new Set<string>();
  for (const channelId of state.channelRegistry.channels.keys()) {
    channelIds.add(channelId);
  }
  for (const contract of state.creatorContracts.contracts.values()) {
    channelIds.add(contract.channelId);
  }

  const canonicalIdMap = buildChannelCanonicalIdMap(state);

  return Array.from(channelIds).map((channelId) => ({
    ...getChannelOverview(state, channelId, options),
    canonicalChannelId: canonicalIdMap.get(channelId) ?? null,
  }));
}

// ============================================================================
// fetchAndFoldContentFundingState
// ============================================================================

function sortedByBlockOrder<T extends { blockNumber: bigint; logIndex: number }>(events: T[]): T[] {
  return events.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? -1 : 1;
    }
    return a.logIndex - b.logIndex;
  });
}

/**
 * Fetch all content-funding events from the event cache, decode and fold them
 * into a `ContentFundingState` ready for SDK query helpers.
 *
 * Returns null if the content-funding contract addresses are not configured.
 */
export interface ContentFundingStateWithVetoedEvents {
  state: ContentFundingState;
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

// ============================================================================
// Content Attestation Queries (AlignmentAttestations for content items)
// ============================================================================

import { keccak256, stringToBytes } from 'viem';
import { fetchEvents } from '../../utils/eventCacheClient.js';
import { decodeAlignmentAttestationEvent } from '../../utils/eventDecoder.js';

/**
 * Get the keccak256 hash of a canonical content ID for use as an AlignmentAttestation subjectId.
 * This matches how content-attester service computes the subjectId.
 */
export function getContentSubjectId(canonicalContentId: string): string {
  return keccak256(stringToBytes(canonicalContentId));
}

/**
 * Query attestation status for a specific content item.
 */
export async function getContentAttestation(
  machinery: SDKMachinery,
  canonicalContentId: string,
  attesterAddress?: string,
): Promise<{ attested: boolean; attester: string; statementCid: string } | null> {
  const contracts = machinery.contractAddresses;
  if (!contracts?.alignmentAttestations) {
    return null;
  }

  const subjectId = getContentSubjectId(canonicalContentId);

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.alignmentAttestations,
    eventName: 'AlignmentAttestation',
    topic2: subjectId,
    limit: 100,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (decodedEvents.length === 0) {
    return null;
  }

  // If specific attester requested, filter to that attester
  let matchingEvents = decodedEvents;
  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    matchingEvents = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);
  }

  if (matchingEvents.length === 0) {
    return null;
  }

  // Get the latest attestation (most recent block)
  const latest = matchingEvents.reduce((a, b) =>
    BigInt(a.blockNumber) > BigInt(b.blockNumber) ? a : b
  );

  return {
    attested: true,
    attester: latest.attester,
    statementCid: latest.statementId,
  };
}

