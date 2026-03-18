/**
 * GraphQL queries for Pubstarter subsystem
 */

import { executeTypedGraphQLQuery } from '../../utils/graphqlClient.js';
import {
  GetProjectDocument,
  GetAllProjectsDocument,
  GetProjectsFilteredDocument,
  GetProjectTokensDocument,
  GetProjectContributionsDocument,
  GetUserContributionsDocument,
  GetProjectRefundsDocument,
  GetSaleListingDocument,
  GetActiveSaleListingsDocument,
  GetBuyOrderDocument,
  GetActiveBuyOrdersDocument,
  GetMarketplaceTradesDocument,
  GetTokenTradesDocument,
  GetTokenBurnsDocument,
  GetUserTokenBurnsDocument,
  GetTokenBurnsByUserDocument,
} from '../../generated/graphql.js';
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
import { isEventCacheAvailable, fetchPubstarterProjectEvents, fetchSecondaryMarketEvents } from '../../utils/eventCacheClient.js';
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
} from '../../utils/eventDecoder.js';
import { foldProject, foldProjectTokens, foldContributionsFromEvents, foldSecondaryMarket, type ProjectEvent, type SecondaryMarketEvent } from './folds.js';
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
  if (isEventCacheAvailable(machinery)) {
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
  const result = await executeTypedGraphQLQuery(machinery, GetProjectDocument, {
    id: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields (threshold, deadline, totalReceived) come as strings at runtime
  return result.projects as unknown as Project | null;
}

/**
 * Get all projects
 */
export async function getAllProjects(
  machinery: SDKMachinery
): Promise<Project[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetAllProjectsDocument);
  // BigInt fields come as strings at runtime
  return (result.projectss?.items ?? []) as unknown as Project[];
}

// ============================================================================
// Project Filtering and Sorting (E4)
// ============================================================================

/**
 * Get all projects with optional filtering and sorting.
 * Note: Some sorting (like fundingProgress) requires client-side computation.
 *
 * @param machinery SDK machinery instance
 * @param filters Optional filters to apply
 * @param sortBy Field to sort by
 * @param sortDirection Sort direction (asc or desc)
 */
export async function getProjectsFiltered(
  machinery: SDKMachinery,
  filters?: ProjectFilterOptions,
  sortBy?: ProjectSortField,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  // For fundingProgress sort, omit orderBy (sort client-side after fetching)
  const serverOrderBy = sortBy && sortBy !== 'fundingProgress' ? sortBy : undefined;

  const result = await executeTypedGraphQLQuery(machinery, GetProjectsFilteredDocument, {
    minDeadline: filters?.minDeadline?.toString(),
    maxDeadline: filters?.maxDeadline?.toString(),
    minThreshold: filters?.minThreshold?.toString(),
    maxThreshold: filters?.maxThreshold?.toString(),
    minTotalReceived: filters?.minTotalReceived?.toString(),
    maxTotalReceived: filters?.maxTotalReceived?.toString(),
    orderBy: serverOrderBy,
    orderDirection: serverOrderBy ? sortDirection : undefined,
  });

  // BigInt fields come as strings at runtime
  const projects = (result.projectss?.items ?? []) as unknown as Array<Project & { createdAtBlock: string }>;

  // Add computed metrics
  const projectsWithMetrics: ProjectWithMetrics[] = projects.map(p => {
    const threshold = BigInt(p.threshold);
    const totalReceived = BigInt(p.totalReceived);
    const fundingProgress = threshold > 0n
      ? Number(totalReceived * 10000n / threshold) / 10000  // Use basis points for precision
      : 0;

    return {
      ...p,
      fundingProgress,
    };
  });

  // Client-side sorting if needed
  if (sortBy === 'fundingProgress') {
    projectsWithMetrics.sort((a, b) => {
      const comparison = a.fundingProgress - b.fundingProgress;
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
  if (isEventCacheAvailable(machinery)) {
    const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
    const offeredEvents = projectEvents
      .filter((e): e is { type: 'tokenOffered'; event: Parameters<typeof foldProjectTokens>[0][0] } => e.type === 'tokenOffered')
      .map(e => e.event);
    return foldProjectTokens(offeredEvents);
  }
  const result = await executeTypedGraphQLQuery(machinery, GetProjectTokensDocument, {
    projectAddress: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields (tokenId, price, createdAt) come as strings at runtime
  return (result.projectTokenss?.items ?? []) as unknown as ProjectToken[];
}

/**
 * Get contributions for a project
 */
export async function getProjectContributions(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<Contribution[]> {
  if (isEventCacheAvailable(machinery)) {
    const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
    const boughtEvents = projectEvents
      .filter((e): e is { type: 'bought'; event: Parameters<typeof foldContributionsFromEvents>[0][0] } => e.type === 'bought')
      .map(e => e.event);
    return foldContributionsFromEvents(boughtEvents, []).contributions;
  }
  const result = await executeTypedGraphQLQuery(machinery, GetProjectContributionsDocument, {
    projectAddress: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.contributionss?.items ?? []) as unknown as Contribution[];
}

/**
 * Get contributions by a specific user
 */
export async function getUserContributions(
  machinery: SDKMachinery,
  userAddress: string
): Promise<Contribution[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetUserContributionsDocument, {
    participant: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.contributionss?.items ?? []) as unknown as Contribution[];
}

/**
 * Get refunds for a specific project
 */
export async function getProjectRefunds(
  machinery: SDKMachinery,
  assuranceContractAddress: string
): Promise<Refund[]> {
  if (isEventCacheAvailable(machinery)) {
    const projectEvents = await fetchAndDecodeProjectEvents(machinery, assuranceContractAddress);
    const soldEvents = projectEvents
      .filter((e): e is { type: 'sold'; event: Parameters<typeof foldContributionsFromEvents>[1][0] } => e.type === 'sold')
      .map(e => e.event);
    return foldContributionsFromEvents([], soldEvents).refunds;
  }
  const result = await executeTypedGraphQLQuery(machinery, GetProjectRefundsDocument, {
    projectAddress: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.refundss?.items ?? []) as unknown as Refund[];
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
  if (isEventCacheAvailable(machinery)) {
    const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
    const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
    const { saleListings } = foldSecondaryMarket(events);
    return saleListings.find(l => l.listingId === listingId.toString()) ?? null;
  }
  const result = await executeTypedGraphQLQuery(machinery, GetSaleListingDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    listingId: listingId.toString(),
  });
  // BigInt fields come as strings at runtime
  return ((result.saleListingss?.items ?? [])[0] ?? null) as unknown as SaleListing | null;
}

/**
 * Get all active sale listings for a marketplace
 */
export async function getActiveSaleListings(
  machinery: SDKMachinery,
  marketplaceAddress: string
): Promise<SaleListing[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetActiveSaleListingsDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.saleListingss?.items ?? []) as unknown as SaleListing[];
}

/**
 * Get a specific buy order by marketplace and order ID
 */
export async function getBuyOrder(
  machinery: SDKMachinery,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  if (isEventCacheAvailable(machinery)) {
    const rawEvents = await fetchSecondaryMarketEvents(machinery, marketplaceAddress);
    const events = fetchAndDecodeSecondaryMarketEvents(rawEvents);
    const { buyOrders } = foldSecondaryMarket(events);
    return buyOrders.find(o => o.orderId === orderId.toString()) ?? null;
  }
  const result = await executeTypedGraphQLQuery(machinery, GetBuyOrderDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    orderId: orderId.toString(),
  });
  // BigInt fields come as strings at runtime
  return ((result.buyOrderss?.items ?? [])[0] ?? null) as unknown as BuyOrder | null;
}

/**
 * Get all active buy orders for a marketplace
 */
export async function getActiveBuyOrders(
  machinery: SDKMachinery,
  marketplaceAddress: string
): Promise<BuyOrder[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetActiveBuyOrdersDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.buyOrderss?.items ?? []) as unknown as BuyOrder[];
}

/**
 * Get all trades for a marketplace
 */
export async function getMarketplaceTrades(
  machinery: SDKMachinery,
  marketplaceAddress: string
): Promise<Trade[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetMarketplaceTradesDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tradess?.items ?? []) as unknown as Trade[];
}

/**
 * Get trades for a specific token
 */
export async function getTokenTrades(
  machinery: SDKMachinery,
  marketplaceAddress: string,
  tokenId: bigint
): Promise<Trade[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetTokenTradesDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    tokenId: tokenId.toString(),
  });
  // BigInt fields come as strings at runtime
  return (result.tradess?.items ?? []) as unknown as Trade[];
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
  const result = await executeTypedGraphQLQuery(machinery, GetTokenBurnsDocument, {
    erc1155Address: erc1155Address.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}

/**
 * Get token burns by a specific user
 */
export async function getUserTokenBurns(
  machinery: SDKMachinery,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetUserTokenBurnsDocument, {
    burner: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}

/**
 * Get token burns for a specific ERC1155 contract by a specific user
 */
export async function getTokenBurnsByUser(
  machinery: SDKMachinery,
  erc1155Address: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetTokenBurnsByUserDocument, {
    erc1155Address: erc1155Address.toLowerCase(),
    burner: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}
