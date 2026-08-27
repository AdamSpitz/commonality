import type { Project } from '../../lazy-giving/types.js';
import type { ContractVetoedEvent } from '../events.js';
import type {
  ChannelEscrowState,
  ChannelInfo,
  ContentFundingState,
  ContentItem,
  CreatorContractInfo,
} from '../folds.js';
import { getContentItemKey } from '../folds.js';
import { extractChannelCanonicalIdFromContentCanonicalId } from '../canonicalization.js';
import { hashCanonicalId } from '../canonicalization.js';

/** Default veto window: 7 days in seconds. */
export const DEFAULT_VETO_WINDOW_SECONDS = 7n * 24n * 60n * 60n;

/** Lifecycle status of a content-funding contract. */
export type ContentFundingContractStatus = 'active' | 'successful' | 'failed' | 'vetoed' | 'unknown';

/** Registration status of a content item in the ContentRegistry. */
export type ContentItemRegistrationStatus = 'unregistered' | 'active' | 'released';

/** A content-funding contract enriched with project data, content items, and status. */
export interface ContentFundingContractSummary extends CreatorContractInfo {
  /** The associated LazyGiving project, or null if not yet resolved. */
  project: Project | null;
  /** Content items registered to this contract. */
  contentItems: ContentItem[];
  /** Computed lifecycle status. */
  status: ContentFundingContractStatus;
  /** Funding progress ratio (0.0–1.0+), or null if threshold is unknown/zero. */
  fundingProgress: number | null;
}

/** Complete overview of a channel: its state, escrow balance, contracts, and content. */
export interface ChannelOverview {
  /** Channel registry state. */
  channel: ChannelInfo;
  /** Escrow balance and cumulative totals for this channel. */
  escrow: {
    balance: bigint;
    totalDeposited: bigint;
    totalWithdrawn: bigint;
  };
  /** All content-funding contracts for this channel, sorted by creation date. */
  contracts: ContentFundingContractSummary[];
  /** All content items across all contracts for this channel. */
  contentItems: ContentItem[];
}

/** Status of a single content item: its registration state and associated contract. */
export interface ContentItemStatus {
  /** Numeric content ID. */
  contentId: bigint;
  /** ContentRegistry contract version that assigned the content ID, or null if unregistered. */
  contentRegistryAddress: string | null;
  /** Whether the item is registered, active, or released. */
  registrationStatus: ContentItemRegistrationStatus;
  /** Platform-specific canonical ID, or null if unregistered. */
  canonicalId: string | null;
  /** Address of the contract this item is registered to, or null. */
  contractAddress: string | null;
  /** Summary of the associated contract, or null. */
  contract: ContentFundingContractSummary | null;
}

/**
 * Options for content-funding query functions.
 *
 * These allow callers to inject pre-fetched data (projects, veto events)
 * and control time-dependent computations (veto window).
 */
export interface ContentFundingQueryOptions {
  /** Pre-fetched LazyGiving projects for enriching contract summaries. */
  projects?: Iterable<Project>;
  /** Pre-fetched ContractVetoed events for marking vetoed contracts. */
  vetoedEvents?: Iterable<ContractVetoedEvent>;
  /** Current block timestamp for time-dependent status checks. */
  now?: bigint;
  /** Veto window duration in seconds (default: 7 days). */
  vetoWindowSeconds?: bigint;
  /** ContentRegistry contract address for scoped contentId lookups in multi-registry state. */
  contentRegistryAddress?: string;
}

/** A record of an AlignmentAttestation for a content item. */
export interface ContentAttestationRecord {
  /** Whether an attestation exists (always true in query results). */
  attested: boolean;
  /** Address of the attester. */
  attester: string;
  /** CID of the statement used in the attestation. */
  statementCid: string;
  /** CID of the topic statement used for filtering, when available. */
  topicStatementCid?: string;
  /** Block number of the attestation. */
  blockNumber: bigint;
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

export function uniqueContentItems(state: ContentFundingState): ContentItem[] {
  return [...new Set(state.contentRegistry.items.values())];
}

function indexContentItemsByContract(
  state: ContentFundingState,
  channelId?: string,
): Map<string, ContentItem[]> {
  const contractToItems = new Map<string, ContentItem[]>();
  const contractLookup = state.creatorContracts.contracts;

  for (const item of uniqueContentItems(state)) {
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

/**
 * Get all content-funding contracts for a specific channel, enriched with
 * project data and status. Results are sorted by creation date.
 *
 * @param state - Pre-folded ContentFundingState
 * @param channelId - Bytes32 channel ID
 * @param options - Query options (projects, veto events, current time)
 * @returns Sorted array of contract summaries
 */
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

/**
 * Get a complete overview of a channel: registry state, escrow balance,
 * all contracts, and all content items.
 *
 * @param state - Pre-folded ContentFundingState
 * @param channelId - Bytes32 channel ID
 * @param options - Query options (projects, veto events, current time)
 * @returns Channel overview with all associated data
 */
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

/**
 * Get the registration status and associated contract for a content item.
 *
 * @param state - Pre-folded ContentFundingState
 * @param contentId - Numeric content ID from the ContentRegistry
 * @param options - Query options (projects, veto events, current time)
 * @returns Content item status (unregistered if not found)
 */
export function getContentItemStatus(
  state: ContentFundingState,
  contentId: bigint,
  options: ContentFundingQueryOptions = {},
): ContentItemStatus {
  const lookupKey = options.contentRegistryAddress
    ? getContentItemKey({ contentId, contentRegistryAddress: options.contentRegistryAddress, contractAddress: '', canonicalId: '', status: 'active' })
    : contentId;
  const item = state.contentRegistry.items.get(lookupKey);
  if (!item) {
    return {
      contentId,
      contentRegistryAddress: null,
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
    contentRegistryAddress: item.contentRegistryAddress ?? null,
    registrationStatus: item.status,
    canonicalId: item.canonicalId,
    contractAddress: item.contractAddress,
    contract,
  };
}

/**
 * Get third-party contracts that the channel owner can currently veto.
 *
 * Returns contracts that are: third-party, active, and within the veto
 * window (relative to when the owner took control). Returns empty if the
 * channel is not creator-controlled or the veto window has expired.
 *
 * @param state - Pre-folded ContentFundingState
 * @param channelId - Bytes32 channel ID
 * @param options - Must include `now` for time-dependent check
 * @returns Array of vetoable contract summaries
 */
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
 * Build a map from bytes32 channelId to human-readable channel canonical ID.
 *
 * On-chain, channelId is stored as `keccak256(channelCanonicalId)`. The only
 * way to recover the human-readable form is from content item canonical IDs,
 * which embed it as a prefix (e.g. `"twitter:uid:12345:67890"`).
 *
 * @param state - Pre-folded ContentFundingState
 * @returns Map from bytes32 channelId to canonical channel ID string
 */
export function buildChannelCanonicalIdMap(state: ContentFundingState): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of uniqueContentItems(state)) {
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

/**
 * Return the current owner for a human-readable canonical channel ID.
 *
 * This works for both `verified` and `creator-controlled` channels because the
 * folded registry state always keeps the current owner address.
 *
 * @param state - Pre-folded ContentFundingState
 * @param canonicalChannelId - Human-readable channel ID (e.g. `"twitter:uid:12345"`)
 * @returns Owner address, or null if the channel is unclaimed
 */
export function getOwnerForCanonicalChannelId(
  state: ContentFundingState,
  canonicalChannelId: string,
): string | null {
  const channel = state.channelRegistry.channels.get(hashCanonicalId(canonicalChannelId))
    ?? state.channelRegistry.channels.get(canonicalChannelId);
  return channel?.owner ?? null;
}

// ============================================================================
// getAllChannelOverviews
// ============================================================================

/** Channel overview enriched with the human-readable canonical channel ID. */
export interface ChannelWithCanonicalId extends ChannelOverview {
  /** Human-readable canonical channel ID (e.g. "twitter:uid:12345"), or null if unavailable. */
  canonicalChannelId: string | null;
}

/**
 * Return an overview for every channel that appears in the state.
 *
 * Discovers channels from the channelRegistry, creator contracts, and content items.
 * Each overview includes the human-readable canonical channel ID when available.
 *
 * @param state - Pre-folded ContentFundingState
 * @param options - Query options (projects, veto events, current time)
 * @returns Array of channel overviews with canonical IDs
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
