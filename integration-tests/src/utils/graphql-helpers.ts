/**
 * GraphQL query helpers for integration tests
 *
 * These helpers provide TypeScript types and query strings for common GraphQL operations.
 * Tests use executeQuery() directly with these helpers instead of wrapper functions.
 */

import { executeQuery, type GraphQLExecutor } from '@commonality/sdk';

// ============================================================================
// Types (matching the GraphQL schema)
// ============================================================================

export interface Statement {
  id: string;
  believerCount: number;
  disbelieverCount: number;
  cid?: string | null;
  statementType?: string | null;
  title?: string | null;
  excerpt?: string | null;
  createdAt: string;
}

export interface UserBelief {
  statementId: string;
  beliefState: number; // 0=noOpinion, 1=believes, 2=disbelieves
}

export interface Implication {
  attester: string;
  fromStatementId: string;
  toStatementId: string;
  explanationCid: string;
  createdAt: string;
  blockNumber: string;
}

export interface IndirectSupporter {
  user: string;
  viaStatementId: string;
  viaStatement?: Statement;
}

export interface StatementWithContent {
  statement: Statement;
  content: any | null;
  metrics?: {
    directBelievers: number;
    directDisbelievers: number;
    indirectSupporters: number;
  };
}

export interface IndirectSupportInfo {
  targetStatement: Statement;
  viaStatements: Statement[];
}

// ============================================================================
// GraphQL Query Strings
// ============================================================================

export const QUERY_GET_STATEMENT = `
  query GetStatement($id: ID!) {
    statement(id: $id) {
      id
      believerCount
      disbelieverCount
      cid
      statementType
      title
      excerpt
      createdAt
    }
  }
`;

export const QUERY_GET_USER_BELIEF = `
  query GetUserBelief($userAddress: Address!, $statementId: ID!) {
    userBelief(userAddress: $userAddress, statementId: $statementId) {
      statementId
      beliefState
    }
  }
`;

export const QUERY_GET_IMPLICATIONS_FROM = `
  query GetImplicationsFrom($statementId: ID!, $attesterAddress: Address) {
    implicationsFrom(statementId: $statementId, attesterAddress: $attesterAddress) {
      attester
      fromStatementId
      toStatementId
      explanationCid
      createdAt
      blockNumber
    }
  }
`;

export const QUERY_GET_IMPLICATIONS_TO = `
  query GetImplicationsTo($statementId: ID!, $attesterAddress: Address) {
    implicationsTo(statementId: $statementId, attesterAddress: $attesterAddress) {
      attester
      fromStatementId
      toStatementId
      explanationCid
      createdAt
      blockNumber
    }
  }
`;

export const QUERY_GET_INDIRECT_SUPPORTERS = `
  query GetIndirectSupporters($statementId: ID!, $attesterAddress: Address) {
    indirectSupporters(statementId: $statementId, attesterAddress: $attesterAddress) {
      user
      viaStatementId
      viaStatement {
        id
        believerCount
        disbelieverCount
        cid
        statementType
        title
        excerpt
        createdAt
      }
    }
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get statement by ID
 */
export async function getStatement(
  executor: GraphQLExecutor,
  statementId: string
): Promise<Statement | null> {
  const result = await executeQuery<{ statement: Statement | null }>(
    executor,
    QUERY_GET_STATEMENT,
    { id: statementId }
  );
  return result.statement;
}

/**
 * Get user's belief about a statement
 */
export async function getUserBelief(
  executor: GraphQLExecutor,
  userAddress: string,
  statementId: string
): Promise<UserBelief | null> {
  const result = await executeQuery<{ userBelief: UserBelief | null }>(
    executor,
    QUERY_GET_USER_BELIEF,
    { userAddress, statementId }
  );
  return result.userBelief;
}

/**
 * Get implications FROM a statement (what it implies)
 */
export async function getImplicationsFrom(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  const result = await executeQuery<{ implicationsFrom: Implication[] }>(
    executor,
    QUERY_GET_IMPLICATIONS_FROM,
    { statementId, attesterAddress }
  );
  return result.implicationsFrom || [];
}

/**
 * Get implications TO a statement (what implies it)
 */
export async function getImplicationsTo(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  const result = await executeQuery<{ implicationsTo: Implication[] }>(
    executor,
    QUERY_GET_IMPLICATIONS_TO,
    { statementId, attesterAddress }
  );
  return result.implicationsTo || [];
}

/**
 * Get users who indirectly support a statement
 */
export async function getIndirectSupporters(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<IndirectSupporter[]> {
  const result = await executeQuery<{ indirectSupporters: IndirectSupporter[] }>(
    executor,
    QUERY_GET_INDIRECT_SUPPORTERS,
    { statementId, attesterAddress }
  );
  return result.indirectSupporters || [];
}

/**
 * Get statement with IPFS content and optional metrics
 *
 * Note: This is a convenience function that combines multiple operations.
 * It's kept as a helper because it does more than just a GraphQL query
 * (it also fetches from IPFS).
 */
export async function getStatementWithContent(
  executor: GraphQLExecutor,
  statementId: string,
  options: {
    includeMetrics?: boolean;
    timeout?: number;
    attesterAddress?: string;
  } = {}
): Promise<StatementWithContent | null> {
  const {
    includeMetrics = false,
    timeout = 10000,
    attesterAddress,
  } = options;

  // Fetch statement metadata
  const statement = await getStatement(executor, statementId);
  if (!statement) {
    return null;
  }

  // Fetch IPFS content if CID exists
  let content: any | null = null;
  if (statement.cid) {
    // Use the unified fetchFromIPFS which respects IPFS_GATEWAY env var
    const { fetchFromIPFS } = await import('@commonality/sdk');
    content = await fetchFromIPFS(statement.cid, timeout);
  }

  // Fetch metrics if requested
  let metrics: StatementWithContent['metrics'] | undefined;
  if (includeMetrics) {
    const indirectSupportersResult = await getIndirectSupporters(
      executor,
      statementId,
      attesterAddress
    );

    metrics = {
      directBelievers: statement.believerCount,
      directDisbelievers: statement.disbelieverCount,
      indirectSupporters: indirectSupportersResult.length,
    };
  }

  return {
    statement,
    content,
    metrics,
  };
}

/**
 * Get all statements a user indirectly supports
 *
 * This is a complex helper that makes multiple queries and does client-side processing.
 * Re-exported from SDK for convenience since it's a complex composite function.
 */
export { getUserIndirectSupport } from '@commonality/sdk';

/**
 * Browse statements sorted by most supporters
 */
export async function browseStatementsByMostSupporters(
  executor: GraphQLExecutor,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const result = await executeQuery<{ browseStatementsByMostSupporters: any[] }>(
    executor,
    `
      query BrowseStatementsByMostSupporters($options: BrowseStatementsOptions) {
        browseStatementsByMostSupporters(options: $options) {
          id
          cid
          statementType
          title
          excerpt
          believerCount
          disbelieverCount
          createdAt
        }
      }
    `,
    { options }
  );
  return result.browseStatementsByMostSupporters || [];
}

/**
 * Browse statements sorted by newest first
 */
export async function browseStatementsByNewest(
  executor: GraphQLExecutor,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const result = await executeQuery<{ browseStatementsByNewest: any[] }>(
    executor,
    `
      query BrowseStatementsByNewest($options: BrowseStatementsOptions) {
        browseStatementsByNewest(options: $options) {
          id
          cid
          statementType
          title
          excerpt
          believerCount
          disbelieverCount
          createdAt
        }
      }
    `,
    { options }
  );
  return result.browseStatementsByNewest || [];
}

/**
 * Get all statements
 */
export async function getAllStatements(
  executor: GraphQLExecutor,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const result = await executeQuery<{ allStatements: any[] }>(
    executor,
    `
      query GetAllStatements($options: BrowseStatementsOptions) {
        allStatements(options: $options) {
          id
          cid
          statementType
          title
          excerpt
          believerCount
          disbelieverCount
          createdAt
        }
      }
    `,
    { options }
  );
  return result.allStatements || [];
}

/**
 * Get statements a user believes in
 */
export async function getUserBeliefs(
  executor: GraphQLExecutor,
  userAddress: string
): Promise<any[]> {
  const result = await executeQuery<{ userBeliefs: any[] }>(
    executor,
    `
      query GetUserBeliefs($userAddress: Address!) {
        userBeliefs(userAddress: $userAddress) {
          id
          cid
          statementType
          title
          excerpt
          believerCount
          disbelieverCount
          createdAt
        }
      }
    `,
    { userAddress }
  );
  return result.userBeliefs || [];
}

/**
 * Get statements a user disbelieves
 */
export async function getUserDisbeliefs(
  executor: GraphQLExecutor,
  userAddress: string
): Promise<any[]> {
  const result = await executeQuery<{ userDisbeliefs: any[] }>(
    executor,
    `
      query GetUserDisbeliefs($userAddress: Address!) {
        userDisbeliefs(userAddress: $userAddress) {
          id
          cid
          statementType
          title
          excerpt
          believerCount
          disbelieverCount
          createdAt
        }
      }
    `,
    { userAddress }
  );
  return result.userDisbeliefs || [];
}

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
  erc1155Address?: string;
  tokenIds?: string;
  tokenCounts?: string;
  totalCost?: string;
  amount: string;
  timestamp: string;
  createdAt?: string;
  blockNumber: string;
  transactionHash?: string;
}

export interface Refund {
  id: string;
  projectAddress: string;
  participant: string;
  erc1155Address?: string;
  tokenIds?: string;
  tokenCounts?: string;
  totalRefund: string;
  createdAt: string;
  blockNumber: string;
  transactionHash?: string;
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
  tokenIds: string;
  tokenCounts: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface ProjectWithMetrics {
  project: Project;
  totalContributions: string;
  contributionCount: number;
  activeTokens: number;
  fundingProgress: number;
}

export interface ProjectWithFundingProgress extends Project {
  fundingProgress: number;
}

export interface ProjectFilterOptions {
  statementId?: string;
  attester?: string;
  minThreshold?: string | bigint;
  maxThreshold?: string | bigint;
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
          erc1155Address
          tokenIds
          tokenCounts
          totalCost
          amount
          timestamp
          createdAt
          blockNumber
          transactionHash
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
          erc1155Address
          tokenIds
          tokenCounts
          totalCost
          amount
          timestamp
          createdAt
          blockNumber
          transactionHash
        }
      }
    `,
    { userAddress }
  );
  return result.userContributions || [];
}

/**
 * Get refunds for a specific project
 */
export async function getProjectRefunds(
  executor: GraphQLExecutor,
  projectAddress: string
): Promise<Refund[]> {
  const result = await executeQuery<{ projectRefunds: Refund[] }>(
    executor,
    `
      query GetProjectRefunds($projectAddress: Address!) {
        projectRefunds(projectAddress: $projectAddress) {
          id
          projectAddress
          participant
          erc1155Address
          tokenIds
          tokenCounts
          totalRefund
          createdAt
          blockNumber
          transactionHash
        }
      }
    `,
    { projectAddress }
  );
  return result.projectRefunds || [];
}

/**
 * Get a specific sale listing
 */
export async function getSaleListing(
  executor: GraphQLExecutor,
  marketplaceAddress: string,
  listingId: bigint
): Promise<SaleListing | null> {
  const result = await executeQuery<{ saleListing: SaleListing | null }>(
    executor,
    `
      query GetSaleListing($marketplaceAddress: Address!, $listingId: String!) {
        saleListing(marketplaceAddress: $marketplaceAddress, listingId: $listingId) {
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
    `,
    { marketplaceAddress, listingId: listingId.toString() }
  );
  return result.saleListing;
}

/**
 * Get all active sale listings
 */
export async function getActiveSaleListings(
  executor: GraphQLExecutor,
  marketplaceAddress?: string
): Promise<SaleListing[]> {
  const result = await executeQuery<{ activeSaleListings: SaleListing[] }>(
    executor,
    `
      query GetActiveSaleListings($marketplaceAddress: Address) {
        activeSaleListings(marketplaceAddress: $marketplaceAddress) {
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
    `,
    { marketplaceAddress }
  );
  return result.activeSaleListings || [];
}

/**
 * Get a specific buy order
 */
export async function getBuyOrder(
  executor: GraphQLExecutor,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  const result = await executeQuery<{ buyOrder: BuyOrder | null }>(
    executor,
    `
      query GetBuyOrder($marketplaceAddress: Address!, $orderId: String!) {
        buyOrder(marketplaceAddress: $marketplaceAddress, orderId: $orderId) {
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
    `,
    { marketplaceAddress, orderId: orderId.toString() }
  );
  return result.buyOrder;
}

/**
 * Get all active buy orders
 */
export async function getActiveBuyOrders(
  executor: GraphQLExecutor,
  marketplaceAddress?: string
): Promise<BuyOrder[]> {
  const result = await executeQuery<{ activeBuyOrders: BuyOrder[] }>(
    executor,
    `
      query GetActiveBuyOrders($marketplaceAddress: Address) {
        activeBuyOrders(marketplaceAddress: $marketplaceAddress) {
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
    `,
    { marketplaceAddress }
  );
  return result.activeBuyOrders || [];
}

/**
 * Get all marketplace trades
 */
export async function getMarketplaceTrades(
  executor: GraphQLExecutor,
  marketplaceAddress?: string
): Promise<Trade[]> {
  const result = await executeQuery<{ marketplaceTrades: Trade[] }>(
    executor,
    `
      query GetMarketplaceTrades($marketplaceAddress: Address) {
        marketplaceTrades(marketplaceAddress: $marketplaceAddress) {
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
    `,
    { marketplaceAddress }
  );
  return result.marketplaceTrades || [];
}

/**
 * Get trades for a specific token
 */
export async function getTokenTrades(
  executor: GraphQLExecutor,
  projectAddress: string,
  tokenId: string | bigint
): Promise<Trade[]> {
  const result = await executeQuery<{ tokenTrades: Trade[] }>(
    executor,
    `
      query GetTokenTrades($projectAddress: Address!, $tokenId: String!) {
        tokenTrades(projectAddress: $projectAddress, tokenId: $tokenId) {
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
    `,
    { projectAddress, tokenId: typeof tokenId === 'bigint' ? tokenId.toString() : tokenId }
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
          erc1155Address
          burner
          tokenIds
          tokenCounts
          createdAt
          blockNumber
          transactionHash
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
          erc1155Address
          burner
          tokenIds
          tokenCounts
          createdAt
          blockNumber
          transactionHash
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
          erc1155Address
          burner
          tokenIds
          tokenCounts
          createdAt
          blockNumber
          transactionHash
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
  const normalizedOptions = {
    ...filterOptions,
    minThreshold: filterOptions.minThreshold != null
      ? (typeof filterOptions.minThreshold === 'bigint' ? filterOptions.minThreshold.toString() : filterOptions.minThreshold)
      : undefined,
    maxThreshold: filterOptions.maxThreshold != null
      ? (typeof filterOptions.maxThreshold === 'bigint' ? filterOptions.maxThreshold.toString() : filterOptions.maxThreshold)
      : undefined,
  };

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
          fundingProgress
        }
      }
    `,
    { filterOptions: normalizedOptions, sortField, sortDirection, limit, offset }
  );

  return (result.projectsFiltered || []).map(item => ({
    ...item.project,
    fundingProgress: item.fundingProgress,
    totalContributions: item.totalContributions,
    contributionCount: item.contributionCount,
    activeTokens: item.activeTokens,
  } as any));
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
): Promise<ProjectWithFundingProgress[]> {
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

  const projects = result.projectsByFundingProgress || [];

  return projects.map(p => {
    const threshold = BigInt(p.threshold);
    const totalReceived = BigInt(p.totalReceived);
    const fundingProgress = threshold > 0n
      ? Number(totalReceived * 10000n / threshold) / 10000
      : 0;

    return {
      ...p,
      fundingProgress,
    };
  });
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

// ============================================================================
// Delegation Queries
// ============================================================================

export interface Note {
  id: string;
  owner: string;
  rootOwner: string;
  amount: string;
  token: string;
  tokenType: number;
  tokenId: string;
  chainHash: string;
  active: boolean;
  parentNoteId?: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
}

export interface DelegationChainLink {
  address: string;
  position: number; // 0 = root, higher numbers = closer to leaf
  createdAt: string;
}

/**
 * Get a note by ID
 */
export async function getNote(
  executor: GraphQLExecutor,
  noteId: string
): Promise<Note | null> {
  const result = await executeQuery<{ delegatableNote: Note | null }>(
    executor,
    `
      query GetNote($id: BigInt!) {
        delegatableNote(id: $id) {
          id
          owner
          rootOwner
          amount
          token
          tokenType
          tokenId
          chainHash
          active
          parentNoteId
          createdAt
          createdAtBlock
          updatedAt
        }
      }
    `,
    { id: noteId }
  );

  return result.delegatableNote;
}

/**
 * Get all notes owned by a specific address
 */
export async function getNotesByOwner(
  executor: GraphQLExecutor,
  ownerAddress: string
): Promise<Note[]> {
  const result = await executeQuery<{ delegatableNotess: { items: Note[] } }>(
    executor,
    `
      query GetNotesByOwner($ownerAddress: String!) {
        delegatableNotess(where: { owner: $ownerAddress, active: true }) {
          items {
            id
            owner
            rootOwner
            amount
            token
            tokenType
            tokenId
            chainHash
            active
            parentNoteId
            createdAt
            createdAtBlock
            updatedAt
          }
        }
      }
    `,
    { ownerAddress: ownerAddress.toLowerCase() }
  );

  return result.delegatableNotess?.items || [];
}

/**
 * Get all notes deposited by a specific address
 */
export async function getNotesByRoot(
  executor: GraphQLExecutor,
  rootAddress: string
): Promise<Note[]> {
  const result = await executeQuery<{ delegatableNotess: { items: Note[] } }>(
    executor,
    `
      query GetNotesByRoot($rootAddress: String!) {
        delegatableNotess(where: { rootOwner: $rootAddress, active: true }) {
          items {
            id
            owner
            rootOwner
            amount
            token
            tokenType
            tokenId
            chainHash
            active
            parentNoteId
            createdAt
            createdAtBlock
            updatedAt
          }
        }
      }
    `,
    { rootAddress: rootAddress.toLowerCase() }
  );

  return result.delegatableNotess?.items || [];
}

/**
 * Get the delegation chain for a specific note
 */
export async function getDelegationChain(
  executor: GraphQLExecutor,
  noteId: string
): Promise<DelegationChainLink[]> {
  const result = await executeQuery<{ delegationChainss: { items: DelegationChainLink[] } }>(
    executor,
    `
      query GetDelegationChain($noteId: BigInt!) {
        delegationChainss(where: { noteId: $noteId }, orderBy: "position", orderDirection: "asc") {
          items {
            address
            position
            createdAt
          }
        }
      }
    `,
    { noteId }
  );

  return result.delegationChainss?.items || [];
}

// ============================================================================
// Funding Portals Queries
// ============================================================================

export interface ProjectAlignment {
  attester: string;
  projectAddress: string;
  statementId: string;
  createdAt: string;
  blockNumber: string;
}

export interface IndirectProjectAlignment {
  projectAddress: string;
  directStatementId: string;
  indirectStatementId: string;
  attester: string;
}

export interface CauseFundingMetrics {
  totalRaisedAcrossProjects: bigint;
  totalAvailableFromNotes: bigint;
  projectCount: number;
  noteCount: number;
}

export interface ContributorStats {
  participant: string;
  totalContributed: bigint;
  totalRefunded: bigint;
  netContribution: bigint;
  contributionCount: number;
  firstContributionAt?: string;
  lastContributionAt?: string;
  projectsContributedTo: number;
}

export interface ContributorRankResult {
  rank: number;
  stats: ContributorStats;
  totalContributors: number;
}

export interface AlignedProjectWithDetails {
  projectAddress: string;
  alignmentType: string;
  totalReceived: string;
  threshold: string;
  deadline: string;
}

/**
 * Get projects aligned with a statement
 */
export async function getAlignedProjects(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  const result = await executeQuery<{ alignedProjects: ProjectAlignment[] }>(
    executor,
    `
      query GetAlignedProjects($statementId: ID!, $attesterAddress: Address) {
        alignedProjects(statementId: $statementId, attesterAddress: $attesterAddress) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { statementId, attesterAddress }
  );

  return result.alignedProjects || [];
}

/**
 * Get statements aligned with a project
 */
export async function getProjectStatements(
  executor: GraphQLExecutor,
  projectAddress: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  const result = await executeQuery<{ projectStatements: ProjectAlignment[] }>(
    executor,
    `
      query GetProjectStatements($projectAddress: Address!, $attesterAddress: Address) {
        projectStatements(projectAddress: $projectAddress, attesterAddress: $attesterAddress) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { projectAddress, attesterAddress }
  );

  return result.projectStatements || [];
}

/**
 * Get a specific project alignment
 */
export async function getProjectAlignment(
  executor: GraphQLExecutor,
  attesterAddress: string,
  projectAddress: string,
  statementId: string
): Promise<ProjectAlignment | null> {
  const result = await executeQuery<{ projectAlignment: ProjectAlignment | null }>(
    executor,
    `
      query GetProjectAlignment(
        $attesterAddress: Address!
        $projectAddress: Address!
        $statementId: ID!
      ) {
        projectAlignment(
          attesterAddress: $attesterAddress
          projectAddress: $projectAddress
          statementId: $statementId
        ) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { attesterAddress, projectAddress, statementId }
  );

  return result.projectAlignment;
}

/**
 * Get alignments by attester
 */
export async function getAlignmentsByAttester(
  executor: GraphQLExecutor,
  attesterAddress: string
): Promise<ProjectAlignment[]> {
  const result = await executeQuery<{ alignmentsByAttester: ProjectAlignment[] }>(
    executor,
    `
      query GetAlignmentsByAttester($attesterAddress: Address!) {
        alignmentsByAttester(attesterAddress: $attesterAddress) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { attesterAddress }
  );

  return result.alignmentsByAttester || [];
}

/**
 * Get indirectly aligned projects
 */
export async function getIndirectlyAlignedProjects(
  executor: GraphQLExecutor,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectProjectAlignment[]> {
  const result = await executeQuery<{ indirectlyAlignedProjects: IndirectProjectAlignment[] }>(
    executor,
    `
      query GetIndirectlyAlignedProjects(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        indirectlyAlignedProjects(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          projectAddress
          directStatementId
          indirectStatementId
          attester
        }
      }
    `,
    { statementId, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.indirectlyAlignedProjects || [];
}

/**
 * Get total funding metrics for a cause
 */
export async function getTotalFundingForCause(
  executor: GraphQLExecutor,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<CauseFundingMetrics> {
  const result = await executeQuery<{ totalFundingForCause: CauseFundingMetrics }>(
    executor,
    `
      query GetTotalFundingForCause(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        totalFundingForCause(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          totalRaisedAcrossProjects
          totalAvailableFromNotes
          projectCount
          noteCount
        }
      }
    `,
    { statementId, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.totalFundingForCause || {
    totalRaisedAcrossProjects: 0n,
    totalAvailableFromNotes: 0n,
    projectCount: 0,
    noteCount: 0,
  };
}

/**
 * Get all aligned projects for a cause
 */
export async function getAllAlignedProjectsForCause(
  executor: GraphQLExecutor,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<AlignedProjectWithDetails[]> {
  const result = await executeQuery<{ allAlignedProjectsForCause: AlignedProjectWithDetails[] }>(
    executor,
    `
      query GetAllAlignedProjectsForCause(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        allAlignedProjectsForCause(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          projectAddress
          alignmentType
          totalReceived
          threshold
          deadline
        }
      }
    `,
    { statementId, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.allAlignedProjectsForCause || [];
}

/**
 * Get top contributors for a cause
 */
export async function getTopContributorsForCause(
  executor: GraphQLExecutor,
  statementId: string,
  limit: number = 10,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorStats[]> {
  const result = await executeQuery<{ topContributorsForCause: ContributorStats[] }>(
    executor,
    `
      query GetTopContributorsForCause(
        $statementId: ID!
        $limit: Int!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        topContributorsForCause(
          statementId: $statementId
          limit: $limit
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          participant
          totalContributed
          totalRefunded
          netContribution
          contributionCount
          firstContributionAt
          lastContributionAt
          projectsContributedTo
        }
      }
    `,
    { statementId, limit, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.topContributorsForCause || [];
}

/**
 * Get user contribution rank for a cause
 */
export async function getUserContributionRankForCause(
  executor: GraphQLExecutor,
  statementId: string,
  userAddress: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorRankResult | null> {
  const result = await executeQuery<{ userContributionRankForCause: ContributorRankResult | null }>(
    executor,
    `
      query GetUserContributionRankForCause(
        $statementId: ID!
        $userAddress: Address!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        userContributionRankForCause(
          statementId: $statementId
          userAddress: $userAddress
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          rank
          stats {
            participant
            totalContributed
            totalRefunded
            netContribution
            contributionCount
            firstContributionAt
            lastContributionAt
            projectsContributedTo
          }
          totalContributors
        }
      }
    `,
    { statementId, userAddress, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.userContributionRankForCause;
}

// ============================================================================
// Mutable Refs Queries
// ============================================================================

export interface MutableRef {
  owner: string;
  name: string;
  value: string;
  updatedAt: string;
  updatedAtBlock: string;
  transactionHash: string;
}

export interface RefUpdate {
  id: string;
  owner: string;
  name: string;
  value: string;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
  logIndex: number;
}

/**
 * Get the current value of a user's ref
 */
export async function getUserRef(
  executor: GraphQLExecutor,
  owner: string,
  name: string
): Promise<MutableRef | null> {
  const result = await executeQuery<{ mutableRef: MutableRef | null }>(
    executor,
    `
      query GetUserRef($owner: String!, $name: String!) {
        mutableRef(owner: $owner, name: $name) {
          owner
          name
          value
          updatedAt
          updatedAtBlock
          transactionHash
        }
      }
    `,
    { owner: owner.toLowerCase(), name }
  );

  return result.mutableRef;
}

/**
 * Get all refs for a user
 */
export async function getUserRefs(
  executor: GraphQLExecutor,
  owner: string
): Promise<MutableRef[]> {
  const result = await executeQuery<{ mutableRefsByOwner: MutableRef[] }>(
    executor,
    `
      query GetUserRefs($owner: String!) {
        mutableRefsByOwner(owner: $owner) {
          owner
          name
          value
          updatedAt
          updatedAtBlock
          transactionHash
        }
      }
    `,
    { owner: owner.toLowerCase() }
  );

  return result.mutableRefsByOwner;
}

/**
 * Get the update history for a specific ref
 */
export async function getUserRefHistory(
  executor: GraphQLExecutor,
  owner: string,
  name: string,
  limit: number = 100
): Promise<RefUpdate[]> {
  const result = await executeQuery<{ refUpdateHistory: RefUpdate[] }>(
    executor,
    `
      query GetUserRefHistory($owner: String!, $name: String!, $limit: Int!) {
        refUpdateHistory(owner: $owner, name: $name, limit: $limit) {
          id
          owner
          name
          value
          blockNumber
          timestamp
          transactionHash
          logIndex
        }
      }
    `,
    { owner: owner.toLowerCase(), name, limit }
  );

  return result.refUpdateHistory;
}

/**
 * Get all ref updates across all users for a specific ref name
 */
export async function getRefsByName(
  executor: GraphQLExecutor,
  name: string,
  limit: number = 100
): Promise<MutableRef[]> {
  const result = await executeQuery<{ mutableRefsByName: MutableRef[] }>(
    executor,
    `
      query GetRefsByName($name: String!, $limit: Int!) {
        mutableRefsByName(name: $name, limit: $limit) {
          owner
          name
          value
          updatedAt
          updatedAtBlock
          transactionHash
        }
      }
    `,
    { name, limit }
  );

  return result.mutableRefsByName;
}
