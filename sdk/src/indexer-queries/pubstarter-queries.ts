/**
 * GraphQL queries for Pubstarter subsystem
 */

import { query, type GraphQLClient } from '../utils/graphqlClient.js';

// ============================================================================
// Pubstarter Queries
// ============================================================================

export interface Project {
  id: string;
  erc1155Address: string;
  recipient: string;
  threshold: string;
  deadline: string;
  totalReceived: string;
  metadataCid?: string;
  createdAt?: string;
}

export interface ProjectToken {
  projectAddress: string;
  erc1155Address: string;
  tokenId: string;
  price: string;
  createdAt: string;
}

export interface Contribution {
  id: string;
  participant: string;
  projectAddress: string;
  erc1155Address: string;
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  totalCost: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface Refund {
  id: string;
  participant: string;
  projectAddress: string;
  erc1155Address: string;
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  totalRefund: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

/**
 * Get project by assurance contract address (which is the project id)
 */
export async function getProject(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Project | null> {
  const result = await query<{ projects: Project | null }>(
    client,
    `
      query GetProject($id: String!) {
        projects(id: $id) {
          id
          erc1155Address
          recipient
          threshold
          deadline
          totalReceived
          metadataCid
        }
      }
    `,
    { id: assuranceContractAddress.toLowerCase() }
  );

  return result.projects;
}

/**
 * Get all projects
 */
export async function getAllProjects(
  client: GraphQLClient
): Promise<Project[]> {
  const result = await query<{ projectss: { items: Project[] } }>(
    client,
    `
      query GetAllProjects {
        projectss {
          items {
            id
            erc1155Address
            recipient
            threshold
            deadline
            totalReceived
            metadataCid
            createdAt
          }
        }
      }
    `
  );

  return result.projectss?.items || [];
}

// ============================================================================
// Project Filtering and Sorting (E4)
// ============================================================================

export interface ProjectFilterOptions {
  // Filter by deadline
  minDeadline?: bigint;
  maxDeadline?: bigint;
  // Filter by threshold
  minThreshold?: bigint;
  maxThreshold?: bigint;
  // Filter by funding progress
  minTotalReceived?: bigint;
  maxTotalReceived?: bigint;
}

export type ProjectSortField =
  | 'createdAt'
  | 'deadline'
  | 'threshold'
  | 'totalReceived'
  | 'fundingProgress'; // totalReceived / threshold

export type SortDirection = 'asc' | 'desc';

export interface ProjectWithMetrics extends Project {
  fundingProgress: number; // 0.0 to 1.0+ (can exceed 1.0 if overfunded)
  createdAtBlock: string;
}

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
  // Build GraphQL query with filters
  const whereConditions: string[] = [];
  const variables: Record<string, any> = {};

  if (filters?.minDeadline !== undefined) {
    whereConditions.push('deadline_gte: $minDeadline');
    variables.minDeadline = filters.minDeadline.toString();
  }
  if (filters?.maxDeadline !== undefined) {
    whereConditions.push('deadline_lte: $maxDeadline');
    variables.maxDeadline = filters.maxDeadline.toString();
  }
  if (filters?.minThreshold !== undefined) {
    whereConditions.push('threshold_gte: $minThreshold');
    variables.minThreshold = filters.minThreshold.toString();
  }
  if (filters?.maxThreshold !== undefined) {
    whereConditions.push('threshold_lte: $maxThreshold');
    variables.maxThreshold = filters.maxThreshold.toString();
  }
  if (filters?.minTotalReceived !== undefined) {
    whereConditions.push('totalReceived_gte: $minTotalReceived');
    variables.minTotalReceived = filters.minTotalReceived.toString();
  }
  if (filters?.maxTotalReceived !== undefined) {
    whereConditions.push('totalReceived_lte: $maxTotalReceived');
    variables.maxTotalReceived = filters.maxTotalReceived.toString();
  }

  const whereClause = whereConditions.length > 0
    ? `where: { ${whereConditions.join(', ')} }`
    : '';

  // Determine order by clause
  // Note: fundingProgress requires client-side sorting
  let orderByClause = '';
  if (sortBy && sortBy !== 'fundingProgress') {
    orderByClause = `orderBy: "${sortBy}", orderDirection: "${sortDirection}"`;
  }

  const variableDeclarations = Object.keys(variables).length > 0
    ? `(${Object.keys(variables).map(k => `$${k}: BigInt!`).join(', ')})`
    : '';

  // Build the arguments for projectss query
  const queryArgs = whereClause && orderByClause
    ? `${whereClause}, ${orderByClause}`
    : whereClause || orderByClause;

  const graphqlQuery = `
    query GetProjectsFiltered${variableDeclarations} {
      projectss${queryArgs ? `(${queryArgs})` : ''} {
        items {
          id
          erc1155Address
          recipient
          threshold
          deadline
          totalReceived
          metadataCid
          createdAtBlock
        }
      }
    }
  `;

  const result = await query<{ projectss: { items: Array<Project & { createdAtBlock: string }> } }>(
    client,
    graphqlQuery,
    variables
  );

  const projects = result.projectss?.items || [];

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
  const result = await query<{ projectTokenss: { items: ProjectToken[] } }>(
    client,
    `
      query GetProjectTokens($projectAddress: String!) {
        projectTokenss(where: { projectAddress: $projectAddress }) {
          items {
            projectAddress
            erc1155Address
            tokenId
            price
            createdAt
          }
        }
      }
    `,
    { projectAddress: assuranceContractAddress.toLowerCase() }
  );

  return result.projectTokenss?.items || [];
}

/**
 * Get contributions for a project
 */
export async function getProjectContributions(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Contribution[]> {
  const result = await query<{ contributionss: { items: Contribution[] } }>(
    client,
    `
      query GetProjectContributions($projectAddress: String!) {
        contributionss(where: { projectAddress: $projectAddress }) {
          items {
            id
            participant
            projectAddress
            erc1155Address
            tokenIds
            tokenCounts
            totalCost
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { projectAddress: assuranceContractAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}

/**
 * Get contributions by a specific user
 */
export async function getUserContributions(
  client: GraphQLClient,
  userAddress: string
): Promise<Contribution[]> {
  const result = await query<{ contributionss: { items: Contribution[] } }>(
    client,
    `
      query GetUserContributions($participant: String!) {
        contributionss(where: { participant: $participant }) {
          items {
            id
            participant
            projectAddress
            erc1155Address
            tokenIds
            tokenCounts
            totalCost
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { participant: userAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}

/**
 * Get refunds for a specific project
 */
export async function getProjectRefunds(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Refund[]> {
  const result = await query<{ refundss: { items: Refund[] } }>(
    client,
    `
      query GetProjectRefunds($projectAddress: String!) {
        refundss(where: { projectAddress: $projectAddress }) {
          items {
            id
            participant
            projectAddress
            erc1155Address
            tokenIds
            tokenCounts
            totalRefund
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { projectAddress: assuranceContractAddress.toLowerCase() }
  );

  return result.refundss?.items || [];
}

// ============================================================================
// Secondary Market Queries
// ============================================================================

export interface SaleListing {
  marketplaceAddress: string;
  listingId: string;
  seller: string;
  tokenId: string;
  originalCount: string;
  remainingCount: string;
  pricePerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuyOrder {
  marketplaceAddress: string;
  orderId: string;
  buyer: string;
  tokenId: string;
  originalCount: string;
  remainingCount: string;
  pricePerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  marketplaceAddress: string;
  orderType: string;
  orderId: string;
  buyer: string;
  seller: string;
  tokenId: string;
  count: string;
  pricePerToken: string;
  totalPrice: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface TokenBurn {
  id: string;
  erc1155Address: string;
  burner: string;
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

/**
 * Get a specific sale listing by marketplace and listing ID
 */
export async function getSaleListing(
  client: GraphQLClient,
  marketplaceAddress: string,
  listingId: bigint
): Promise<SaleListing | null> {
  const result = await query<{ saleListingss: { items: SaleListing[] } }>(
    client,
    `
      query GetSaleListing($marketplaceAddress: String!, $listingId: BigInt!) {
        saleListingss(where: {
          marketplaceAddress: $marketplaceAddress,
          listingId: $listingId
        }) {
          items {
            marketplaceAddress
            listingId
            seller
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    {
      marketplaceAddress: marketplaceAddress.toLowerCase(),
      listingId: listingId.toString()
    }
  );

  return result.saleListingss?.items[0] || null;
}

/**
 * Get all active sale listings for a marketplace
 */
export async function getActiveSaleListings(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<SaleListing[]> {
  const result = await query<{ saleListingss: { items: SaleListing[] } }>(
    client,
    `
      query GetActiveSaleListings($marketplaceAddress: String!) {
        saleListingss(where: {
          marketplaceAddress: $marketplaceAddress,
          status: "active"
        }) {
          items {
            marketplaceAddress
            listingId
            seller
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    { marketplaceAddress: marketplaceAddress.toLowerCase() }
  );

  return result.saleListingss?.items || [];
}

/**
 * Get a specific buy order by marketplace and order ID
 */
export async function getBuyOrder(
  client: GraphQLClient,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  const result = await query<{ buyOrderss: { items: BuyOrder[] } }>(
    client,
    `
      query GetBuyOrder($marketplaceAddress: String!, $orderId: BigInt!) {
        buyOrderss(where: {
          marketplaceAddress: $marketplaceAddress,
          orderId: $orderId
        }) {
          items {
            marketplaceAddress
            orderId
            buyer
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    {
      marketplaceAddress: marketplaceAddress.toLowerCase(),
      orderId: orderId.toString()
    }
  );

  return result.buyOrderss?.items[0] || null;
}

/**
 * Get all active buy orders for a marketplace
 */
export async function getActiveBuyOrders(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<BuyOrder[]> {
  const result = await query<{ buyOrderss: { items: BuyOrder[] } }>(
    client,
    `
      query GetActiveBuyOrders($marketplaceAddress: String!) {
        buyOrderss(where: {
          marketplaceAddress: $marketplaceAddress,
          status: "active"
        }) {
          items {
            marketplaceAddress
            orderId
            buyer
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    { marketplaceAddress: marketplaceAddress.toLowerCase() }
  );

  return result.buyOrderss?.items || [];
}

/**
 * Get all trades for a marketplace
 */
export async function getMarketplaceTrades(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<Trade[]> {
  const result = await query<{ tradess: { items: Trade[] } }>(
    client,
    `
      query GetMarketplaceTrades($marketplaceAddress: String!) {
        tradess(where: { marketplaceAddress: $marketplaceAddress }) {
          items {
            id
            marketplaceAddress
            orderType
            orderId
            buyer
            seller
            tokenId
            count
            pricePerToken
            totalPrice
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { marketplaceAddress: marketplaceAddress.toLowerCase() }
  );

  return result.tradess?.items || [];
}

/**
 * Get trades for a specific token
 */
export async function getTokenTrades(
  client: GraphQLClient,
  marketplaceAddress: string,
  tokenId: bigint
): Promise<Trade[]> {
  const result = await query<{ tradess: { items: Trade[] } }>(
    client,
    `
      query GetTokenTrades($marketplaceAddress: String!, $tokenId: BigInt!) {
        tradess(where: {
          marketplaceAddress: $marketplaceAddress,
          tokenId: $tokenId
        }) {
          items {
            id
            marketplaceAddress
            orderType
            orderId
            buyer
            seller
            tokenId
            count
            pricePerToken
            totalPrice
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    {
      marketplaceAddress: marketplaceAddress.toLowerCase(),
      tokenId: tokenId.toString()
    }
  );

  return result.tradess?.items || [];
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
  const result = await query<{ tokenBurnss: { items: TokenBurn[] } }>(
    client,
    `
      query GetTokenBurns($erc1155Address: String!) {
        tokenBurnss(where: { erc1155Address: $erc1155Address }) {
          items {
            id
            erc1155Address
            burner
            tokenIds
            tokenCounts
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { erc1155Address: erc1155Address.toLowerCase() }
  );

  return result.tokenBurnss?.items || [];
}

/**
 * Get token burns by a specific user
 */
export async function getUserTokenBurns(
  client: GraphQLClient,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await query<{ tokenBurnss: { items: TokenBurn[] } }>(
    client,
    `
      query GetUserTokenBurns($burner: String!) {
        tokenBurnss(where: { burner: $burner }) {
          items {
            id
            erc1155Address
            burner
            tokenIds
            tokenCounts
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { burner: userAddress.toLowerCase() }
  );

  return result.tokenBurnss?.items || [];
}

/**
 * Get token burns for a specific ERC1155 contract by a specific user
 */
export async function getTokenBurnsByUser(
  client: GraphQLClient,
  erc1155Address: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await query<{ tokenBurnss: { items: TokenBurn[] } }>(
    client,
    `
      query GetTokenBurnsByUser($erc1155Address: String!, $burner: String!) {
        tokenBurnss(where: {
          erc1155Address: $erc1155Address,
          burner: $burner
        }) {
          items {
            id
            erc1155Address
            burner
            tokenIds
            tokenCounts
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    {
      erc1155Address: erc1155Address.toLowerCase(),
      burner: userAddress.toLowerCase()
    }
  );

  return result.tokenBurnss?.items || [];
}
