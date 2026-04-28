/**
 * Pubstarter queries — event cache + folds (no GraphQL)
 */

import {
  type Project,
  type ProjectToken,
  type Contribution,
  type Refund,
  type SaleListing,
  type BuyOrder,
  type Trade,
  type TokenBurn,
  type ProjectFilterOptions,
  type ProjectSortField,
  type SortDirection,
  type ProjectWithMetrics,
} from './types.js';
import { SDKMachinery } from '../../machinery.js';
import {
  fetchEvents,
  fetchPubstarterProjectEvents,
  fetchSecondaryMarketEvents,
  fetchERC1155TransferEvents,
  fetchAllBoughtEvents,
} from '../../utils/eventCacheClient.js';
import {
  decodePubstarterAssuranceContractCreatedEvent,
  decodeCreatorContractCreatedEvent,
  decodeAssuranceContractInitializedEvent,
  decodeContractMetadataUpdatedEvent,
  decodeERC1155OfferedEvent,
  decodeERC1155BoughtEvent,
  decodeERC1155SoldEvent,
  decodeAssuranceContractWithdrawalEvent,
  decodeSaleListingCreatedEvent,
  decodeSaleListingFulfilledEvent,
  decodeSaleListingCancelledEvent,
  decodeBuyOrderCreatedEvent,
  decodeBuyOrderFulfilledEvent,
  decodeBuyOrderCancelledEvent,
  decodeTransferSingleEvent,
  decodeTransferBatchEvent,
} from '../../utils/eventDecoder.js';
import {
  foldProject,
  foldProjectTokens,
  foldContributionsFromEvents,
  foldSecondaryMarket,
  foldTokenBurns,
  type ProjectEvent,
  type ProjectAccumulator,
  type SecondaryMarketEvent,
} from './folds.js';
import type { TransferSingleEvent, TransferBatchEvent } from './events.js';
import { readConditionParams } from '../../utils/chain-reads.js';

async function fetchAndDecodeProjectEvents(
  machinery: SDKMachinery,
  assuranceContractAddress: string,
  options?: { blockNumber_gte?: string }
): Promise<ProjectEvent[]> {
  const rawEvents = await fetchPubstarterProjectEvents(machinery, assuranceContractAddress, {
    blockNumber_gte: options?.blockNumber_gte,
  });
  const projectEvents: ProjectEvent[] = [];
  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'PubstarterAssuranceContractCreated': {
        const d = decodePubstarterAssuranceContractCreatedEvent(raw);
        if (d) projectEvents.push({ type: 'created', event: d });
        break;
      }
      case 'CreatorContractCreated': {
        const d = decodeCreatorContractCreatedEvent(raw);
        if (d) {
          projectEvents.push({
            type: 'created',
            event: {
              ...d,
              assuranceContract: d.contractAddress,
              creator: d.creator,
            },
          });
        }
        break;
      }
      case 'AssuranceContractInitialized': {
        const d = decodeAssuranceContractInitializedEvent(raw);
        if (d) projectEvents.push({ type: 'initialized', event: d });
        break;
      }
      case 'ContractMetadataUpdated': {
        const d = decodeContractMetadataUpdatedEvent(raw);
        if (d) projectEvents.push({ type: 'metadataUpdated', event: d });
        break;
      }
      case 'ERC1155Offered': {
        const d = decodeERC1155OfferedEvent(raw);
        if (d) projectEvents.push({ type: 'tokenOffered', event: d });
        break;
      }
      case 'ERC1155Bought': {
        const d = decodeERC1155BoughtEvent(raw);
        if (d) projectEvents.push({ type: 'bought', event: d });
        break;
      }
      case 'ERC1155Sold': {
        const d = decodeERC1155SoldEvent(raw);
        if (d) projectEvents.push({ type: 'sold', event: d });
        break;
      }
      case 'AssuranceContractWithdrawal': {
        const d = decodeAssuranceContractWithdrawalEvent(raw);
        if (d) projectEvents.push({ type: 'withdrawal', event: d });
        break;
      }
    }
  }
  return projectEvents.sort((a, b) => {
    const bn = Number(a.event.blockNumber - b.event.blockNumber);
    return bn !== 0 ? bn : a.event.logIndex - b.event.logIndex;
  });
}

function fetchAndDecodeSecondaryMarketEvents(
  rawEvents: Awaited<ReturnType<typeof fetchSecondaryMarketEvents>>
): SecondaryMarketEvent[] {
  const events: SecondaryMarketEvent[] = [];
  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'SaleListingCreated': {
        const d = decodeSaleListingCreatedEvent(raw);
        if (d) events.push({ type: 'saleListingCreated', event: d });
        break;
      }
      case 'SaleListingFulfilled': {
        const d = decodeSaleListingFulfilledEvent(raw);
        if (d) events.push({ type: 'saleListingFulfilled', event: d });
        break;
      }
      case 'SaleListingCancelled': {
        const d = decodeSaleListingCancelledEvent(raw);
        if (d) events.push({ type: 'saleListingCancelled', event: d });
        break;
      }
      case 'BuyOrderCreated': {
        const d = decodeBuyOrderCreatedEvent(raw);
        if (d) events.push({ type: 'buyOrderCreated', event: d });
        break;
      }
      case 'BuyOrderFulfilled': {
        const d = decodeBuyOrderFulfilledEvent(raw);
        if (d) events.push({ type: 'buyOrderFulfilled', event: d });
        break;
      }
      case 'BuyOrderCancelled': {
        const d = decodeBuyOrderCancelledEvent(raw);
        if (d) events.push({ type: 'buyOrderCancelled', event: d });
        break;
      }
    }
  }
  return events.sort((a, b) => {
    const bn = Number(a.event.blockNumber - b.event.blockNumber);
    return bn !== 0 ? bn : a.event.logIndex - b.event.logIndex;
  });
}

function decodeTransferEvents(rawEvents: Awaited<ReturnType<typeof fetchERC1155TransferEvents>>): (TransferSingleEvent | TransferBatchEvent)[] {
  const events: (TransferSingleEvent | TransferBatchEvent)[] = [];
  for (const raw of rawEvents) {
    if (raw.eventName === 'TransferSingle') {
      const d = decodeTransferSingleEvent(raw);
      if (d) events.push(d);
    } else if (raw.eventName === 'TransferBatch') {
      const d = decodeTransferBatchEvent(raw);
      if (d) events.push(d);
    }
  }
  return events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
}

// ============================================================================
// Pubstarter Queries
// ============================================================================

/**
 * Get a crowdfunding project by its assurance contract address.
 *
 * Fetches and folds all project events, then reads threshold/deadline
 * from the on-chain condition contract if a publicClient is available.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param assuranceContractAddress - Address of the project's assurance contract
 * @param options - Optional configuration for resumable folding
 * @param options.initialAccumulator - Previously saved accumulator to resume from (enables incremental fetching)
 * @param options.blockNumber_gte - Only fetch events at or after this block number (used with initialAccumulator)
 * @returns The project, or null if no creation event exists
 */
export async function getProject(
  machinery: SDKMachinery,
  assuranceContractAddress: string,
  options?: {
    initialAccumulator?: ProjectAccumulator;
    blockNumber_gte?: string;
  }
): Promise<Project | null> {
  const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress, {
    blockNumber_gte: options?.blockNumber_gte,
  });
  const { project: partial } = foldProject(projectEvents, options?.initialAccumulator);
  if (!partial) return null;

  let threshold = '0';
  let deadline = '0';
  if (machinery.publicClient && partial.conditionAddress) {
    try {
      const params = await readConditionParams(machinery, partial.conditionAddress as `0x${string}`);
      threshold = params.threshold.toString();
      deadline = params.deadline.toString();
    } catch {
      // publicClient not configured or read failed — leave as '0'
    }
  }

  return { ...partial, threshold, deadline };
}

/**
 * Get all crowdfunding projects created through the factory.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Array of all projects
 */
export async function getAllProjects(
  machinery: SDKMachinery
): Promise<Project[]> {
  const projectAddresses = await getAllProjectAddresses(machinery);
  const projects = await Promise.all(
    projectAddresses.map(addr => getProject(machinery, addr))
  );
  return projects.filter((p): p is Project => p !== null);
}

/**
 * Get all project assurance-contract addresses created through the factory.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Array of assurance-contract addresses in creation order
 */
export async function getAllProjectAddresses(
  machinery: SDKMachinery
): Promise<string[]> {
  const contracts = machinery.contractAddresses!;
  const [pubstarterEvents, creatorEvents] = await Promise.all([
    fetchEvents(machinery, {
      contractAddress: contracts.assuranceContractFactory,
      eventName: 'PubstarterAssuranceContractCreated',
      limit: 10000,
    }),
    contracts.creatorContractFactory
      ? fetchEvents(machinery, {
          contractAddress: contracts.creatorContractFactory,
          eventName: 'CreatorContractCreated',
          limit: 10000,
        })
      : Promise.resolve([]),
  ]);

  const projectAddresses = [
    ...pubstarterEvents
      .map(e => decodePubstarterAssuranceContractCreatedEvent(e))
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map(d => d.assuranceContract),
    ...creatorEvents
      .map(e => decodeCreatorContractCreatedEvent(e))
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map(d => d.contractAddress),
  ];

  return Array.from(new Set(projectAddresses.map(address => address.toLowerCase())));
}

// ============================================================================
// Project Filtering and Sorting
// ============================================================================

/**
 * Get all projects with optional filtering and sorting.
 *
 * Supports filtering by deadline, threshold, and totalReceived ranges,
 * and sorting by any project field.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param filters - Optional filter criteria (min/max deadline, threshold, totalReceived)
 * @param sortBy - Field to sort by
 * @param sortDirection - Sort direction (default: `'desc'`)
 * @returns Filtered and sorted array of projects with computed funding metrics
 */
export async function getProjectsFiltered(
  machinery: SDKMachinery,
  filters?: ProjectFilterOptions,
  sortBy?: ProjectSortField,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  const allProjects = await getAllProjects(machinery);

  // Add computed metrics
  let projectsWithMetrics: ProjectWithMetrics[] = allProjects.map(p => {
    const threshold = BigInt(p.threshold);
    const totalReceived = BigInt(p.totalReceived);
    const fundingProgress = threshold > 0n
      ? Number(totalReceived * 10000n / threshold) / 10000
      : 0;
    return { ...p, fundingProgress, createdAtBlock: p.blockNumber ?? '' };
  });

  // Apply filters
  if (filters) {
    projectsWithMetrics = projectsWithMetrics.filter(p => {
      const deadline = BigInt(p.deadline);
      const threshold = BigInt(p.threshold);
      const totalReceived = BigInt(p.totalReceived);

      if (filters.minDeadline !== undefined && deadline < filters.minDeadline) return false;
      if (filters.maxDeadline !== undefined && deadline > filters.maxDeadline) return false;
      if (filters.minThreshold !== undefined && threshold < filters.minThreshold) return false;
      if (filters.maxThreshold !== undefined && threshold > filters.maxThreshold) return false;
      if (filters.minTotalReceived !== undefined && totalReceived < filters.minTotalReceived) return false;
      if (filters.maxTotalReceived !== undefined && totalReceived > filters.maxTotalReceived) return false;
      return true;
    });
  }

  // Sort
  if (sortBy) {
    projectsWithMetrics.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
            || Number(BigInt(a.createdAtBlock || '0') - BigInt(b.createdAtBlock || '0'));
          break;
        case 'deadline':
          comparison = Number(BigInt(a.deadline) - BigInt(b.deadline));
          break;
        case 'threshold':
          comparison = Number(BigInt(a.threshold) - BigInt(b.threshold));
          break;
        case 'totalReceived':
          comparison = Number(BigInt(a.totalReceived) - BigInt(b.totalReceived));
          break;
        case 'fundingProgress':
          comparison = a.fundingProgress - b.fundingProgress;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  return projectsWithMetrics;
}

/**
 * Get projects sorted by creation date.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param sortDirection - Sort direction (default: `'desc'`, newest first)
 * @returns Array of projects with metrics, sorted by date
 */
export async function getProjectsByDate(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'createdAt', sortDirection);
}

/**
 * Get projects sorted by deadline.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param sortDirection - Sort direction (default: `'asc'`, soonest first)
 * @returns Array of projects with metrics, sorted by deadline
 */
export async function getProjectsByDeadline(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'asc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'deadline', sortDirection);
}

/**
 * Get projects sorted by funding goal (threshold).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param sortDirection - Sort direction (default: `'desc'`, highest first)
 * @returns Array of projects with metrics, sorted by threshold
 */
export async function getProjectsByFundingGoal(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'threshold', sortDirection);
}

/**
 * Get projects sorted by funding progress ratio.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param sortDirection - Sort direction (default: `'desc'`, most funded first)
 * @returns Array of projects with metrics, sorted by funding progress
 */
export async function getProjectsByFundingProgress(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'fundingProgress', sortDirection);
}

/**
 * Get projects sorted by total amount raised.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param sortDirection - Sort direction (default: `'desc'`, highest first)
 * @returns Array of projects with metrics, sorted by totalReceived
 */
export async function getProjectsByAmountRaised(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'totalReceived', sortDirection);
}

/**
 * Get the ERC-1155 tokens offered by a project.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param assuranceContractAddress - Address of the project's assurance contract
 * @returns Array of token definitions (ID, supply, price, metadata)
 */
export async function getProjectTokens(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<ProjectToken[]> {
  const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
  const offeredEvents = projectEvents
    .filter((e): e is { type: 'tokenOffered'; event: Parameters<typeof foldProjectTokens>[0][0] } => e.type === 'tokenOffered')
    .map(e => e.event);
  return foldProjectTokens(offeredEvents);
}

/**
 * Get all contributions (purchases) for a project.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param assuranceContractAddress - Address of the project's assurance contract
 * @returns Array of contribution records
 */
export async function getProjectContributions(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<Contribution[]> {
  const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
  const boughtEvents = projectEvents
    .filter((e): e is { type: 'bought'; event: Parameters<typeof foldContributionsFromEvents>[0][0] } => e.type === 'bought')
    .map(e => e.event);
  return foldContributionsFromEvents(boughtEvents, []).contributions;
}

/**
 * Get all contributions made by a specific user across all projects.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param userAddress - Ethereum address of the contributor
 * @returns Array of contribution records from all projects
 */
export async function getUserContributions(
  machinery: SDKMachinery,
  userAddress: string
): Promise<Contribution[]> {
  const rawEvents = await fetchAllBoughtEvents(machinery);
  const userLower = userAddress.toLowerCase();
  const boughtEvents = [];
  for (const raw of rawEvents) {
    const d = decodeERC1155BoughtEvent(raw);
    if (d && d.participant.toLowerCase() === userLower) {
      boughtEvents.push(d);
    }
  }
  return foldContributionsFromEvents(boughtEvents, []).contributions;
}

/**
 * Get all refunds (sell-backs) for a project.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param assuranceContractAddress - Address of the project's assurance contract
 * @returns Array of refund records
 */
export async function getProjectRefunds(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<Refund[]> {
  const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
  const soldEvents = projectEvents
    .filter((e): e is { type: 'sold'; event: Parameters<typeof foldContributionsFromEvents>[1][0] } => e.type === 'sold')
    .map(e => e.event);
  return foldContributionsFromEvents([], soldEvents).refunds;
}

// ============================================================================
// Secondary Market Queries
// ============================================================================

/**
 * Get a specific secondary market sale listing.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace
 * @param listingId - Numeric listing ID
 * @returns The sale listing, or null if not found
 */
export async function getSaleListing(
  machinery: SDKMachinery,
  marketplaceAddress: string,
  listingId: bigint
): Promise<SaleListing | null> {
  const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
  const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
  const { saleListings } = foldSecondaryMarket(events);
  return saleListings.find(l => l.listingId === listingId.toString()) ?? null;
}

/**
 * Get all active (unfulfilled, uncancelled) sale listings for a marketplace.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace
 * @returns Array of active sale listings
 */
export async function getActiveSaleListings(
  machinery: SDKMachinery,
  marketplaceAddress: string
): Promise<SaleListing[]> {
  const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
  const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
  const { saleListings } = foldSecondaryMarket(events);
  return saleListings.filter(l => l.status === 'active');
}

/**
 * Get a specific secondary market buy order.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace
 * @param orderId - Numeric order ID
 * @returns The buy order, or null if not found
 */
export async function getBuyOrder(
  machinery: SDKMachinery,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
  const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
  const { buyOrders } = foldSecondaryMarket(events);
  return buyOrders.find(o => o.orderId === orderId.toString()) ?? null;
}

/**
 * Get all active (unfulfilled, uncancelled) buy orders for a marketplace.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace
 * @returns Array of active buy orders
 */
export async function getActiveBuyOrders(
  machinery: SDKMachinery,
  marketplaceAddress: string
): Promise<BuyOrder[]> {
  const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
  const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
  const { buyOrders } = foldSecondaryMarket(events);
  return buyOrders.filter(o => o.status === 'active');
}

/**
 * Get all completed trades for a marketplace.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace
 * @returns Array of trade records
 */
export async function getMarketplaceTrades(
  machinery: SDKMachinery,
  marketplaceAddress: string
): Promise<Trade[]> {
  const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
  const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
  const { trades } = foldSecondaryMarket(events);
  return trades;
}

/**
 * Get all trades for a specific token in a marketplace.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace
 * @param tokenId - Numeric token ID to filter by
 * @returns Array of trade records for this token
 */
export async function getTokenTrades(
  machinery: SDKMachinery,
  marketplaceAddress: string,
  tokenId: bigint
): Promise<Trade[]> {
  const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
  const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
  const { trades } = foldSecondaryMarket(events);
  return trades.filter(t => t.tokenId === tokenId.toString());
}

// ============================================================================
// Token Burns Queries
// ============================================================================

/**
 * Get all token burns for a specific ERC-1155 contract.
 *
 * Burns are detected from transfer events to the zero address.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param erc1155Address - Address of the ERC-1155 token contract
 * @returns Array of burn records
 */
export async function getTokenBurns(
  machinery: SDKMachinery,
  erc1155Address: string
): Promise<TokenBurn[]> {
  const rawEvents = await fetchERC1155TransferEvents(machinery, erc1155Address);
  const events = decodeTransferEvents(rawEvents);
  return foldTokenBurns(events).burns;
}

/**
 * Get token burns by a specific user across all projects.
 *
 * Discovers ERC-1155 contracts from project events and checks each for burns.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param userAddress - Ethereum address of the burner
 * @returns Array of burn records from all projects
 */
export async function getUserTokenBurns(
  machinery: SDKMachinery,
  userAddress: string
): Promise<TokenBurn[]> {
  const contracts = machinery.contractAddresses!;
  const rawFactoryEvents = await fetchEvents(machinery, {
    contractAddress: contracts.assuranceContractFactory,
    eventName: 'PubstarterAssuranceContractCreated',
    limit: 10000,
  });
  const projectAddresses = rawFactoryEvents
    .map(e => decodePubstarterAssuranceContractCreatedEvent(e))
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map(d => d.assuranceContract);

  const allBurns: TokenBurn[] = [];
  const userLower = userAddress.toLowerCase();

  // Fetch project events to discover ERC1155 addresses
  for (const projectAddress of projectAddresses) {
    const projectEvents = await fetchAndDecodeProjectEvents(machinery, projectAddress);
    const erc1155Addresses = new Set<string>();
    for (const pe of projectEvents) {
      if (pe.type === 'tokenOffered') {
        erc1155Addresses.add(pe.event.erc1155Addr);
      }
    }
    for (const addr of erc1155Addresses) {
      const rawEvents = await fetchERC1155TransferEvents(machinery, addr);
      const events = decodeTransferEvents(rawEvents);
      const { burns } = foldTokenBurns(events);
      allBurns.push(...burns.filter(b => b.burner.toLowerCase() === userLower));
    }
  }
  return allBurns;
}

/**
 * Get token burns for a specific ERC-1155 contract filtered by user.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param erc1155Address - Address of the ERC-1155 token contract
 * @param userAddress - Ethereum address of the burner
 * @returns Array of burn records by this user
 */
export async function getTokenBurnsByUser(
  machinery: SDKMachinery,
  erc1155Address: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const burns = await getTokenBurns(machinery, erc1155Address);
  return burns.filter(b => b.burner.toLowerCase() === userAddress.toLowerCase());
}
