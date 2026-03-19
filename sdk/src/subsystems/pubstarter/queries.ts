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
  fetchPubstarterProjectEvents,
  fetchSecondaryMarketEvents,
  fetchProjectsRegistry,
  fetchERC1155TransferEvents,
  fetchAllBoughtEvents,
  fetchAllSoldEvents,
} from '../../utils/eventCacheClient.js';
import {
  decodePubstarterAssuranceContractCreatedEvent,
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
  type SecondaryMarketEvent,
} from './folds.js';
import type { TransferSingleEvent, TransferBatchEvent } from './events.js';
import { readConditionParams } from '../../utils/chain-reads.js';

async function fetchAndDecodeProjectEvents(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<ProjectEvent[]> {
  const rawEvents = await fetchPubstarterProjectEvents(machinery, assuranceContractAddress);
  const projectEvents: ProjectEvent[] = [];
  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'PubstarterAssuranceContractCreated': {
        const d = decodePubstarterAssuranceContractCreatedEvent(raw);
        if (d) projectEvents.push({ type: 'created', event: d });
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
 * Get project by assurance contract address (which is the project id)
 */
export async function getProject(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<Project | null> {
  const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
  const partial = foldProject(projectEvents);
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
 * Get all projects
 */
export async function getAllProjects(
  machinery: SDKMachinery
): Promise<Project[]> {
  const registry = await fetchProjectsRegistry(machinery, { limit: 10000 });
  const projects = await Promise.all(
    registry.map(r => getProject(machinery, r.id))
  );
  return projects.filter((p): p is Project => p !== null);
}

// ============================================================================
// Project Filtering and Sorting
// ============================================================================

/**
 * Get all projects with optional filtering and sorting.
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
    return { ...p, fundingProgress, createdAtBlock: '' };
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
          comparison = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
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
 * Get projects sorted by date created (newest first by default).
 */
export async function getProjectsByDate(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'createdAt', sortDirection);
}

/**
 * Get projects sorted by deadline (soonest first by default).
 */
export async function getProjectsByDeadline(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'asc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'deadline', sortDirection);
}

/**
 * Get projects sorted by funding goal/threshold (highest first by default).
 */
export async function getProjectsByFundingGoal(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'threshold', sortDirection);
}

/**
 * Get projects sorted by funding progress (most funded first by default).
 */
export async function getProjectsByFundingProgress(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'fundingProgress', sortDirection);
}

/**
 * Get projects sorted by amount raised (highest first by default).
 */
export async function getProjectsByAmountRaised(
  machinery: SDKMachinery,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(machinery, undefined, 'totalReceived', sortDirection);
}

/**
 * Get project tokens for a project
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
 * Get contributions for a project
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
 * Get contributions by a specific user (across all projects)
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
 * Get refunds for a specific project
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
 * Get a specific sale listing by marketplace and listing ID
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
 * Get all active sale listings for a marketplace
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
 * Get a specific buy order by marketplace and order ID
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
 * Get all active buy orders for a marketplace
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
 * Get all trades for a marketplace
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
 * Get trades for a specific token
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
 * Get all token burns for a specific ERC1155 contract
 */
export async function getTokenBurns(
  machinery: SDKMachinery,
  erc1155Address: string
): Promise<TokenBurn[]> {
  const rawEvents = await fetchERC1155TransferEvents(machinery, erc1155Address);
  const events = decodeTransferEvents(rawEvents);
  return foldTokenBurns(events);
}

/**
 * Get token burns by a specific user
 */
export async function getUserTokenBurns(
  machinery: SDKMachinery,
  userAddress: string
): Promise<TokenBurn[]> {
  // We need all ERC1155 contracts — get from projects registry
  const registry = await fetchProjectsRegistry(machinery, { limit: 10000 });
  const allBurns: TokenBurn[] = [];
  const userLower = userAddress.toLowerCase();

  // Fetch project events to discover ERC1155 addresses
  for (const project of registry) {
    const projectEvents = await fetchAndDecodeProjectEvents(machinery, project.id);
    const erc1155Addresses = new Set<string>();
    for (const pe of projectEvents) {
      if (pe.type === 'tokenOffered') {
        erc1155Addresses.add(pe.event.erc1155Addr);
      }
    }
    for (const addr of erc1155Addresses) {
      const rawEvents = await fetchERC1155TransferEvents(machinery, addr);
      const events = decodeTransferEvents(rawEvents);
      const burns = foldTokenBurns(events);
      allBurns.push(...burns.filter(b => b.burner.toLowerCase() === userLower));
    }
  }
  return allBurns;
}

/**
 * Get token burns for a specific ERC1155 contract by a specific user
 */
export async function getTokenBurnsByUser(
  machinery: SDKMachinery,
  erc1155Address: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const burns = await getTokenBurns(machinery, erc1155Address);
  return burns.filter(b => b.burner.toLowerCase() === userAddress.toLowerCase());
}
