/**
 * GraphQL queries for Pubstarter subsystem
 */

import { request } from 'graphql-request';
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
  const result = await request(machinery.graphqlClient.url, GetProjectDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetAllProjectsDocument);
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

  const result = await request(machinery.graphqlClient.url, GetProjectsFilteredDocument, {
    minDeadline: filters?.minDeadline?.toString() as unknown as bigint | undefined,
    maxDeadline: filters?.maxDeadline?.toString() as unknown as bigint | undefined,
    minThreshold: filters?.minThreshold?.toString() as unknown as bigint | undefined,
    maxThreshold: filters?.maxThreshold?.toString() as unknown as bigint | undefined,
    minTotalReceived: filters?.minTotalReceived?.toString() as unknown as bigint | undefined,
    maxTotalReceived: filters?.maxTotalReceived?.toString() as unknown as bigint | undefined,
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
  const result = await request(machinery.graphqlClient.url, GetProjectTokensDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetProjectContributionsDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetUserContributionsDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetProjectRefundsDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetSaleListingDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    listingId: listingId.toString() as any,
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
  const result = await request(machinery.graphqlClient.url, GetActiveSaleListingsDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetBuyOrderDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    orderId: orderId.toString() as any,
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
  const result = await request(machinery.graphqlClient.url, GetActiveBuyOrdersDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetMarketplaceTradesDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetTokenTradesDocument, {
    marketplaceAddress: marketplaceAddress.toLowerCase(),
    tokenId: tokenId.toString() as any,
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
  const result = await request(machinery.graphqlClient.url, GetTokenBurnsDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetUserTokenBurnsDocument, {
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
  const result = await request(machinery.graphqlClient.url, GetTokenBurnsByUserDocument, {
    erc1155Address: erc1155Address.toLowerCase(),
    burner: userAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.tokenBurnss?.items ?? []) as unknown as TokenBurn[];
}
