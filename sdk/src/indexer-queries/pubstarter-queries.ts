/**
 * GraphQL queries for Pubstarter subsystem
 */

import { request } from 'graphql-request';
import { type GraphQLClient } from '../utils/graphqlClient.js';
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
} from '../generated/graphql.js';
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
} from '../shared/types/pubstarter.js';

// ============================================================================
// Pubstarter Queries
// ============================================================================

/**
 * Get project by assurance contract address (which is the project id)
 */
export async function getProject(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Project | null> {
  const result = await request(client.url, GetProjectDocument, {
    id: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields (threshold, deadline, totalReceived) come as strings at runtime
  return result.projects as unknown as Project | null;
}

/**
 * Get all projects
 */
export async function getAllProjects(
  client: GraphQLClient
): Promise<Project[]> {
  const result = await request(client.url, GetAllProjectsDocument);
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
 * @param client GraphQL client
 * @param filters Optional filters to apply
 * @param sortBy Field to sort by
 * @param sortDirection Sort direction (asc or desc)
 */
export async function getProjectsFiltered(
  client: GraphQLClient,
  filters?: ProjectFilterOptions,
  sortBy?: ProjectSortField,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  // For fundingProgress sort, omit orderBy (sort client-side after fetching)
  const serverOrderBy = sortBy && sortBy !== 'fundingProgress' ? sortBy : undefined;

  const result = await request(client.url, GetProjectsFilteredDocument, {
    minDeadline: (filters?.minDeadline ?? null) as unknown as bigint | null,
    maxDeadline: (filters?.maxDeadline ?? null) as unknown as bigint | null,
    minThreshold: (filters?.minThreshold ?? null) as unknown as bigint | null,
    maxThreshold: (filters?.maxThreshold ?? null) as unknown as bigint | null,
    minTotalReceived: (filters?.minTotalReceived ?? null) as unknown as bigint | null,
    maxTotalReceived: (filters?.maxTotalReceived ?? null) as unknown as bigint | null,
    orderBy: serverOrderBy ?? null,
    orderDirection: serverOrderBy ? sortDirection : null,
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
  client: GraphQLClient,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(client, undefined, 'createdAt', sortDirection);
}

/**
 * Get projects sorted by deadline (soonest first by default).
 */
export async function getProjectsByDeadline(
  client: GraphQLClient,
  sortDirection: SortDirection = 'asc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(client, undefined, 'deadline', sortDirection);
}

/**
 * Get projects sorted by funding goal/threshold (highest first by default).
 */
export async function getProjectsByFundingGoal(
  client: GraphQLClient,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(client, undefined, 'threshold', sortDirection);
}

/**
 * Get projects sorted by funding progress (most funded first by default).
 */
export async function getProjectsByFundingProgress(
  client: GraphQLClient,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(client, undefined, 'fundingProgress', sortDirection);
}

/**
 * Get projects sorted by amount raised (highest first by default).
 */
export async function getProjectsByAmountRaised(
  client: GraphQLClient,
  sortDirection: SortDirection = 'desc'
): Promise<ProjectWithMetrics[]> {
  return getProjectsFiltered(client, undefined, 'totalReceived', sortDirection);
}

/**
 * Get project tokens for a project
 */
export async function getProjectTokens(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<ProjectToken[]> {
  const result = await request(client.url, GetProjectTokensDocument, {
    projectAddress: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields (tokenId, price, createdAt) come as strings at runtime
  return (result.projectTokenss?.items ?? []) as unknown as ProjectToken[];
}

/**
 * Get contributions for a project
 */
export async function getProjectContributions(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Contribution[]> {
  const result = await request(client.url, GetProjectContributionsDocument, {
    projectAddress: assuranceContractAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.contributionss?.items ?? []) as unknown as Contribution[];
}

/**
 * Get contributions by a specific user
 */
export async function getUserContributions(
  client: GraphQLClient,
  userAddress: string
): Promise<Contribution[]> {
  const result = await request(client.url, GetUserContributionsDocument, {
    participant: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.contributionss?.items ?? []) as unknown as Contribution[];
}

/**
 * Get refunds for a specific project
 */
export async function getProjectRefunds(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Refund[]> {
  const result = await request(client.url, GetProjectRefundsDocument, {
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
  client: GraphQLClient,
  marketplaceAddress: string,
  listingId: bigint
): Promise<SaleListing | null> {
  const result = await request(client.url, GetSaleListingDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    listingId,
  });
  // BigInt fields come as strings at runtime
  return ((result.saleListingss?.items ?? [])[0] ?? null) as unknown as SaleListing | null;
}

/**
 * Get all active sale listings for a marketplace
 */
export async function getActiveSaleListings(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<SaleListing[]> {
  const result = await request(client.url, GetActiveSaleListingsDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.saleListingss?.items ?? []) as unknown as SaleListing[];
}

/**
 * Get a specific buy order by marketplace and order ID
 */
export async function getBuyOrder(
  client: GraphQLClient,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  const result = await request(client.url, GetBuyOrderDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    orderId,
  });
  // BigInt fields come as strings at runtime
  return ((result.buyOrderss?.items ?? [])[0] ?? null) as unknown as BuyOrder | null;
}

/**
 * Get all active buy orders for a marketplace
 */
export async function getActiveBuyOrders(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<BuyOrder[]> {
  const result = await request(client.url, GetActiveBuyOrdersDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.buyOrderss?.items ?? []) as unknown as BuyOrder[];
}

/**
 * Get all trades for a marketplace
 */
export async function getMarketplaceTrades(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<Trade[]> {
  const result = await request(client.url, GetMarketplaceTradesDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tradess?.items ?? []) as unknown as Trade[];
}

/**
 * Get trades for a specific token
 */
export async function getTokenTrades(
  client: GraphQLClient,
  marketplaceAddress: string,
  tokenId: bigint
): Promise<Trade[]> {
  const result = await request(client.url, GetTokenTradesDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    tokenId,
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
  client: GraphQLClient,
  erc1155Address: string
): Promise<TokenBurn[]> {
  const result = await request(client.url, GetTokenBurnsDocument, {
    erc1155Address: erc1155Address.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}

/**
 * Get token burns by a specific user
 */
export async function getUserTokenBurns(
  client: GraphQLClient,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await request(client.url, GetUserTokenBurnsDocument, {
    burner: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}

/**
 * Get token burns for a specific ERC1155 contract by a specific user
 */
export async function getTokenBurnsByUser(
  client: GraphQLClient,
  erc1155Address: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await request(client.url, GetTokenBurnsByUserDocument, {
    erc1155Address: erc1155Address.toLowerCase(),
    burner: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}
