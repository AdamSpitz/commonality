/**
 * GraphQL-based pubstarter queries
 *
 * These functions use the local GraphQL executor instead of direct indexer queries
 */

import { executeQuery, type GraphQLExecutor } from '../graphql-server/index.js';

// ============================================================================
// Pubstarter Queries
// ============================================================================

export interface Project {
  id: string;
  totalReceived: string;
  threshold: string;
  deadline: string;
  cid?: string;
  title?: string;
  description?: string;
  createdAt: string;
}

export interface ProjectToken {
  id: string;
  projectId: string;
  tokenId: string;
  supply: string;
  price: string;
  createdAt: string;
}

export interface Contribution {
  id: string;
  projectAddress: string;
  participant: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
}

export interface SaleListing {
  id: string;
  projectAddress: string;
  tokenId: string;
  seller: string;
  amount: string;
  pricePerToken: string;
  createdAt: string;
}

export interface BuyOrder {
  id: string;
  projectAddress: string;
  tokenId: string;
  buyer: string;
  amount: string;
  pricePerToken: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  projectAddress: string;
  tokenId: string;
  seller: string;
  buyer: string;
  amount: string;
  pricePerToken: string;
  timestamp: string;
  blockNumber: string;
}

export interface TokenBurn {
  id: string;
  projectAddress: string;
  tokenId: string;
  burner: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
}

export interface ProjectWithMetrics {
  project: Project;
  totalContributions: string;
  contributionCount: number;
  activeTokens: number;
}

export interface ProjectFilterOptions {
  statementId?: string;
  attester?: string;
  minThreshold?: string;
  maxThreshold?: string;
  deadlineAfter?: string;
  deadlineBefore?: string;
  activeOnly?: boolean;
}

export interface BrowseStatementsOptions {
  limit?: number;
  offset?: number;
  orderDirection?: string;
}

/**
 * Get project by ID
 */
export async function getProject(
  executor: GraphQLExecutor,
  id: string
): Promise<Project | null> {
  const result = await executeQuery<{ project: Project | null }>(
    executor,
    `
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { id }
  );

  return result.project;
}

/**
 * Get all projects
 */
export async function getAllProjects(
  executor: GraphQLExecutor,
  options: BrowseStatementsOptions = {}
): Promise<Project[]> {
  const result = await executeQuery<{ allProjects: Project[] }>(
    executor,
    `
      query GetAllProjects($options: BrowseStatementsOptions) {
        allProjects(options: $options) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { options }
  );

  return result.allProjects || [];
}

/**
 * Get project tokens for a project
 */
export async function getProjectTokens(
  executor: GraphQLExecutor,
  projectAddress: string
): Promise<ProjectToken[]> {
  const result = await executeQuery<{ projectTokens: ProjectToken[] }>(
    executor,
    `
      query GetProjectTokens($projectAddress: Address!) {
        projectTokens(projectAddress: $projectAddress) {
          id
          projectId
          tokenId
          supply
          price
          createdAt
        }
      }
    `,
    { projectAddress }
  );

  return result.projectTokens || [];
}

/**
 * Get contributions for a project
 */
export async function getProjectContributions(
  executor: GraphQLExecutor,
  projectAddress: string
): Promise<Contribution[]> {
  const result = await executeQuery<{ projectContributions: Contribution[] }>(
    executor,
    `
      query GetProjectContributions($projectAddress: Address!) {
        projectContributions(projectAddress: $projectAddress) {
          id
          projectAddress
          participant
          amount
          timestamp
          blockNumber
        }
      }
    `,
    { projectAddress }
  );

  return result.projectContributions || [];
}

/**
 * Get contributions by a specific user
 */
export async function getUserContributions(
  executor: GraphQLExecutor,
  userAddress: string
): Promise<Contribution[]> {
  const result = await executeQuery<{ userContributions: Contribution[] }>(
    executor,
    `
      query GetUserContributions($userAddress: Address!) {
        userContributions(userAddress: $userAddress) {
          id
          projectAddress
          participant
          amount
          timestamp
          blockNumber
        }
      }
    `,
    { userAddress }
  );

  return result.userContributions || [];
}

/**
 * Get a specific sale listing
 */
export async function getSaleListing(
  executor: GraphQLExecutor,
  id: string
): Promise<SaleListing | null> {
  const result = await executeQuery<{ saleListing: SaleListing | null }>(
    executor,
    `
      query GetSaleListing($id: ID!) {
        saleListing(id: $id) {
          id
          projectAddress
          tokenId
          seller
          amount
          pricePerToken
          createdAt
        }
      }
    `,
    { id }
  );

  return result.saleListing;
}

/**
 * Get all active sale listings
 */
export async function getActiveSaleListings(
  executor: GraphQLExecutor
): Promise<SaleListing[]> {
  const result = await executeQuery<{ activeSaleListings: SaleListing[] }>(
    executor,
    `
      query GetActiveSaleListings {
        activeSaleListings {
          id
          projectAddress
          tokenId
          seller
          amount
          pricePerToken
          createdAt
        }
      }
    `,
    {}
  );

  return result.activeSaleListings || [];
}

/**
 * Get a specific buy order
 */
export async function getBuyOrder(
  executor: GraphQLExecutor,
  id: string
): Promise<BuyOrder | null> {
  const result = await executeQuery<{ buyOrder: BuyOrder | null }>(
    executor,
    `
      query GetBuyOrder($id: ID!) {
        buyOrder(id: $id) {
          id
          projectAddress
          tokenId
          buyer
          amount
          pricePerToken
          createdAt
        }
      }
    `,
    { id }
  );

  return result.buyOrder;
}

/**
 * Get all active buy orders
 */
export async function getActiveBuyOrders(
  executor: GraphQLExecutor
): Promise<BuyOrder[]> {
  const result = await executeQuery<{ activeBuyOrders: BuyOrder[] }>(
    executor,
    `
      query GetActiveBuyOrders {
        activeBuyOrders {
          id
          projectAddress
          tokenId
          buyer
          amount
          pricePerToken
          createdAt
        }
      }
    `,
    {}
  );

  return result.activeBuyOrders || [];
}

/**
 * Get all marketplace trades
 */
export async function getMarketplaceTrades(
  executor: GraphQLExecutor
): Promise<Trade[]> {
  const result = await executeQuery<{ marketplaceTrades: Trade[] }>(
    executor,
    `
      query GetMarketplaceTrades {
        marketplaceTrades {
          id
          projectAddress
          tokenId
          seller
          buyer
          amount
          pricePerToken
          timestamp
          blockNumber
        }
      }
    `,
    {}
  );

  return result.marketplaceTrades || [];
}

/**
 * Get trades for a specific token
 */
export async function getTokenTrades(
  executor: GraphQLExecutor,
  projectAddress: string,
  tokenId: string
): Promise<Trade[]> {
  const result = await executeQuery<{ tokenTrades: Trade[] }>(
    executor,
    `
      query GetTokenTrades($projectAddress: Address!, $tokenId: String!) {
        tokenTrades(projectAddress: $projectAddress, tokenId: $tokenId) {
          id
          projectAddress
          tokenId
          seller
          buyer
          amount
          pricePerToken
          timestamp
          blockNumber
        }
      }
    `,
    { projectAddress, tokenId }
  );

  return result.tokenTrades || [];
}

/**
 * Get all token burns for a project
 */
export async function getTokenBurns(
  executor: GraphQLExecutor,
  projectAddress: string
): Promise<TokenBurn[]> {
  const result = await executeQuery<{ tokenBurns: TokenBurn[] }>(
    executor,
    `
      query GetTokenBurns($projectAddress: Address!) {
        tokenBurns(projectAddress: $projectAddress) {
          id
          projectAddress
          tokenId
          burner
          amount
          timestamp
          blockNumber
        }
      }
    `,
    { projectAddress }
  );

  return result.tokenBurns || [];
}

/**
 * Get token burns by a specific user
 */
export async function getUserTokenBurns(
  executor: GraphQLExecutor,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await executeQuery<{ userTokenBurns: TokenBurn[] }>(
    executor,
    `
      query GetUserTokenBurns($userAddress: Address!) {
        userTokenBurns(userAddress: $userAddress) {
          id
          projectAddress
          tokenId
          burner
          amount
          timestamp
          blockNumber
        }
      }
    `,
    { userAddress }
  );

  return result.userTokenBurns || [];
}

/**
 * Get token burns for a specific project by a specific user
 */
export async function getTokenBurnsByUser(
  executor: GraphQLExecutor,
  projectAddress: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await executeQuery<{ tokenBurnsByUser: TokenBurn[] }>(
    executor,
    `
      query GetTokenBurnsByUser($projectAddress: Address!, $userAddress: Address!) {
        tokenBurnsByUser(projectAddress: $projectAddress, userAddress: $userAddress) {
          id
          projectAddress
          tokenId
          burner
          amount
          timestamp
          blockNumber
        }
      }
    `,
    { projectAddress, userAddress }
  );

  return result.tokenBurnsByUser || [];
}

/**
 * Get projects with filtering and sorting
 */
export async function getProjectsFiltered(
  executor: GraphQLExecutor,
  filterOptions: ProjectFilterOptions,
  sortField?: string,
  sortDirection?: string,
  limit?: number,
  offset?: number
): Promise<ProjectWithMetrics[]> {
  const result = await executeQuery<{ projectsFiltered: ProjectWithMetrics[] }>(
    executor,
    `
      query GetProjectsFiltered(
        $filterOptions: ProjectFilterOptions!
        $sortField: String
        $sortDirection: String
        $limit: Int
        $offset: Int
      ) {
        projectsFiltered(
          filterOptions: $filterOptions
          sortField: $sortField
          sortDirection: $sortDirection
          limit: $limit
          offset: $offset
        ) {
          project {
            id
            totalReceived
            threshold
            deadline
            cid
            title
            description
            createdAt
          }
          totalContributions
          contributionCount
          activeTokens
        }
      }
    `,
    { filterOptions, sortField, sortDirection, limit, offset }
  );

  return result.projectsFiltered || [];
}

/**
 * Get projects sorted by date
 */
export async function getProjectsByDate(
  executor: GraphQLExecutor,
  sortDirection?: string,
  after?: string,
  before?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeQuery<{ projectsByDate: Project[] }>(
    executor,
    `
      query GetProjectsByDate(
        $sortDirection: String
        $after: String
        $before: String
        $limit: Int
        $offset: Int
      ) {
        projectsByDate(
          sortDirection: $sortDirection
          after: $after
          before: $before
          limit: $limit
          offset: $offset
        ) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { sortDirection, after, before, limit, offset }
  );

  return result.projectsByDate || [];
}

/**
 * Get projects sorted by deadline
 */
export async function getProjectsByDeadline(
  executor: GraphQLExecutor,
  sortDirection?: string,
  after?: string,
  before?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeQuery<{ projectsByDeadline: Project[] }>(
    executor,
    `
      query GetProjectsByDeadline(
        $sortDirection: String
        $after: String
        $before: String
        $limit: Int
        $offset: Int
      ) {
        projectsByDeadline(
          sortDirection: $sortDirection
          after: $after
          before: $before
          limit: $limit
          offset: $offset
        ) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { sortDirection, after, before, limit, offset }
  );

  return result.projectsByDeadline || [];
}

/**
 * Get projects sorted by funding goal
 */
export async function getProjectsByFundingGoal(
  executor: GraphQLExecutor,
  sortDirection?: string,
  min?: string,
  max?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeQuery<{ projectsByFundingGoal: Project[] }>(
    executor,
    `
      query GetProjectsByFundingGoal(
        $sortDirection: String
        $min: String
        $max: String
        $limit: Int
        $offset: Int
      ) {
        projectsByFundingGoal(
          sortDirection: $sortDirection
          min: $min
          max: $max
          limit: $limit
          offset: $offset
        ) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { sortDirection, min, max, limit, offset }
  );

  return result.projectsByFundingGoal || [];
}

/**
 * Get projects sorted by funding progress
 */
export async function getProjectsByFundingProgress(
  executor: GraphQLExecutor,
  sortDirection?: string,
  min?: string,
  max?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeQuery<{ projectsByFundingProgress: Project[] }>(
    executor,
    `
      query GetProjectsByFundingProgress(
        $sortDirection: String
        $min: String
        $max: String
        $limit: Int
        $offset: Int
      ) {
        projectsByFundingProgress(
          sortDirection: $sortDirection
          min: $min
          max: $max
          limit: $limit
          offset: $offset
        ) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { sortDirection, min, max, limit, offset }
  );

  return result.projectsByFundingProgress || [];
}

/**
 * Get projects sorted by amount raised
 */
export async function getProjectsByAmountRaised(
  executor: GraphQLExecutor,
  sortDirection?: string,
  min?: string,
  max?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeQuery<{ projectsByAmountRaised: Project[] }>(
    executor,
    `
      query GetProjectsByAmountRaised(
        $sortDirection: String
        $min: String
        $max: String
        $limit: Int
        $offset: Int
      ) {
        projectsByAmountRaised(
          sortDirection: $sortDirection
          min: $min
          max: $max
          limit: $limit
          offset: $offset
        ) {
          id
          totalReceived
          threshold
          deadline
          cid
          title
          description
          createdAt
        }
      }
    `,
    { sortDirection, min, max, limit, offset }
  );

  return result.projectsByAmountRaised || [];
}
