/**
 * GraphQL query helpers for integration tests
 */

import { executeSDKQuery, bytes32ToCid, IpfsCidV1, isValidCidV1, normalizeCidV1 } from '@commonality/sdk';
import { ActionTestingMachinery } from '../actions/action-machinery';




// ============================================================================
// Types (matching the GraphQL schema)
// ============================================================================

import {
  type Statement,
  type UserBelief,
  type Implication,
  type IndirectSupporter,
} from '@commonality/sdk';

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
  query GetStatement($id: String!) {
    statements(cidV1: $id) {
      cidV1
      believerCount
      disbelieverCount
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
      fromStatementCid
      toStatementCid
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
      fromStatementCid
      toStatementCid
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
 * Get statement by CID
 */
export async function getStatement(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1
): Promise<Statement | null> {
  const result = await executeSDKQuery<{ statements: Statement | null }>(
    machinery,
    QUERY_GET_STATEMENT,
    { id: statementCid }
  );
  return result.statements;
}

/**
 * Get user's belief about a statement
 */
export async function getUserBelief(
  machinery: ActionTestingMachinery,
  userAddress: string,
  statementCid: IpfsCidV1
): Promise<UserBelief | null> {
  const normalizedStatementId = normalizeCidV1(statementCid);
  const result = await executeSDKQuery<{ userBelief: UserBelief | null }>(
    machinery,
    QUERY_GET_USER_BELIEF,
    { userAddress, statementId: normalizedStatementId }
  );
  return result.userBelief;
}

/**
 * Get implications FROM a statement (what it implies)
 */
export async function getImplicationsFrom(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<Implication[]> {
  const normalizedStatementId = normalizeCidV1(statementCid);
  const result = await executeSDKQuery<{ implicationsFrom: Implication[] }>(
    machinery,
    QUERY_GET_IMPLICATIONS_FROM,
    { statementId: normalizedStatementId, attesterAddress }
  );
  return result.implicationsFrom || [];
}

/**
 * Get implications TO a statement (what implies it)
 */
export async function getImplicationsTo(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<Implication[]> {
  const normalizedStatementId = normalizeCidV1(statementCid);
  const result = await executeSDKQuery<{ implicationsTo: Implication[] }>(
    machinery,
    QUERY_GET_IMPLICATIONS_TO,
    { statementId: normalizedStatementId, attesterAddress }
  );
  return result.implicationsTo || [];
}

/**
 * Get users who indirectly support a statement
 */
export async function getIndirectSupporters(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<IndirectSupporter[]> {
  const normalizedStatementId = normalizeCidV1(statementCid);
  const result = await executeSDKQuery<{ indirectSupporters: IndirectSupporter[] }>(
    machinery,
    QUERY_GET_INDIRECT_SUPPORTERS,
    { statementId: normalizedStatementId, attesterAddress }
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
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
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
  const statement = await getStatement(machinery, statementCid);
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
      machinery,
      statementCid,
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
  machinery: ActionTestingMachinery,
  options?: { limit?: number; offset?: number; orderDirection?: string }
): Promise<any[]> {
  const result = await executeSDKQuery<{ browseStatementsByMostSupporters: any[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  options?: { limit?: number; offset?: number; orderDirection?: string }
): Promise<any[]> {
  const result = await executeSDKQuery<{ browseStatementsByNewest: any[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const result = await executeSDKQuery<{ allStatements: any[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  userAddress: string
): Promise<any[]> {
  const result = await executeSDKQuery<{ userBeliefs: any[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  userAddress: string
): Promise<any[]> {
  const result = await executeSDKQuery<{ userDisbeliefs: any[] }>(
    machinery,
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

import {
  type Project,
  type ProjectToken,
  type Contribution,
  type Refund,
  type SaleListing,
  type BuyOrder,
  type Trade,
  type TokenBurn,
} from '@commonality/sdk';

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
  machinery: ActionTestingMachinery,
  id: string
): Promise<Project | null> {
  const result = await executeSDKQuery<{ project: Project | null }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  options: BrowseStatementsOptions = {}
): Promise<Project[]> {
  const result = await executeSDKQuery<{ allProjects: Project[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  projectAddress: string
): Promise<ProjectToken[]> {
  const result = await executeSDKQuery<{ projectTokens: ProjectToken[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  projectAddress: string
): Promise<Contribution[]> {
  const result = await executeSDKQuery<{ projectContributions: Contribution[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  userAddress: string
): Promise<Contribution[]> {
  const result = await executeSDKQuery<{ userContributions: Contribution[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  projectAddress: string
): Promise<Refund[]> {
  const result = await executeSDKQuery<{ projectRefunds: Refund[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  marketplaceAddress: string,
  listingId: bigint
): Promise<SaleListing | null> {
  const result = await executeSDKQuery<{ saleListing: SaleListing | null }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  marketplaceAddress?: string
): Promise<SaleListing[]> {
  const result = await executeSDKQuery<{ activeSaleListings: SaleListing[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  const result = await executeSDKQuery<{ buyOrder: BuyOrder | null }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  marketplaceAddress?: string
): Promise<BuyOrder[]> {
  const result = await executeSDKQuery<{ activeBuyOrders: BuyOrder[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  marketplaceAddress?: string
): Promise<Trade[]> {
  const result = await executeSDKQuery<{ marketplaceTrades: Trade[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  projectAddress: string,
  tokenId: string | bigint
): Promise<Trade[]> {
  const result = await executeSDKQuery<{ tokenTrades: Trade[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  projectAddress: string
): Promise<TokenBurn[]> {
  const result = await executeSDKQuery<{ tokenBurns: TokenBurn[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await executeSDKQuery<{ userTokenBurns: TokenBurn[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  projectAddress: string,
  userAddress: string
): Promise<TokenBurn[]> {
  const result = await executeSDKQuery<{ tokenBurnsByUser: TokenBurn[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
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

  const result = await executeSDKQuery<{ projectsFiltered: ProjectWithMetrics[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  sortDirection?: string,
  after?: string,
  before?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeSDKQuery<{ projectsByDate: Project[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  sortDirection?: string,
  after?: string,
  before?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeSDKQuery<{ projectsByDeadline: Project[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  sortDirection?: string,
  min?: string,
  max?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeSDKQuery<{ projectsByFundingGoal: Project[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  sortDirection?: string,
  min?: string,
  max?: string,
  limit?: number,
  offset?: number
): Promise<ProjectWithFundingProgress[]> {
  const result = await executeSDKQuery<{ projectsByFundingProgress: Project[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  sortDirection?: string,
  min?: string,
  max?: string,
  limit?: number,
  offset?: number
): Promise<Project[]> {
  const result = await executeSDKQuery<{ projectsByAmountRaised: Project[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  noteId: string
): Promise<Note | null> {
  const result = await executeSDKQuery<{ note: Note | null }>(
    machinery,
    `
      query GetNote($id: ID!) {
        note(id: $id) {
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

  return result.note;
}

/**
 * Get all notes owned by a specific address
 */
export async function getNotesByOwner(
  machinery: ActionTestingMachinery,
  ownerAddress: string
): Promise<Note[]> {
  const result = await executeSDKQuery<{ notesByOwner: Note[] }>(
    machinery,
    `
      query GetNotesByOwner($ownerAddress: Address!) {
        notesByOwner(ownerAddress: $ownerAddress) {
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
    { ownerAddress }
  );

  return result.notesByOwner || [];
}

/**
 * Get all notes deposited by a specific address
 */
export async function getNotesByRoot(
  machinery: ActionTestingMachinery,
  rootAddress: string
): Promise<Note[]> {
  const result = await executeSDKQuery<{ notesByRoot: Note[] }>(
    machinery,
    `
      query GetNotesByRoot($rootAddress: Address!) {
        notesByRoot(rootAddress: $rootAddress) {
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
    { rootAddress }
  );

  return result.notesByRoot || [];
}

/**
 * Get the delegation chain for a specific note
 */
export async function getDelegationChain(
  machinery: ActionTestingMachinery,
  noteId: string
): Promise<DelegationChainLink[]> {
  const result = await executeSDKQuery<{ delegationChain: DelegationChainLink[] }>(
    machinery,
    `
      query GetDelegationChain($noteId: ID!) {
        delegationChain(noteId: $noteId) {
          address
          position
          createdAt
        }
      }
    `,
    { noteId }
  );

  return result.delegationChain || [];
}

// ============================================================================
// Funding Portals Queries
// ============================================================================

export interface AlignmentAttestation {
  attester: string;
  subjectAddress: string;
  statementCid: IpfsCidV1;
  topicStatementCid: IpfsCidV1;
  createdAt: string;
  blockNumber: string;
}

// Legacy alias for backwards compatibility
export interface ProjectAlignment {
  attester: string;
  projectAddress: string;
  statementCid: IpfsCidV1;
  createdAt: string;
  blockNumber: string;
}

export interface IndirectProjectAlignment {
  projectAddress: string;
  directStatementCid: IpfsCidV1;
  indirectStatementCid: IpfsCidV1;
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
 * Get subjects aligned with a statement
 */
export async function getAlignedSubjects(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<AlignmentAttestation[]> {
  const result = await executeSDKQuery<{ alignedSubjects: AlignmentAttestation[] }>(
    machinery,
    `
      query GetAlignedSubjects($statementId: ID!, $attesterAddress: Address) {
        alignedSubjects(statementId: $statementId, attesterAddress: $attesterAddress) {
          attester
          subjectAddress
          statementId
          topicStatementId
          createdAt
          blockNumber
        }
      }
    `,
    { statementId: statementCid, attesterAddress }
  );

  return result.alignedSubjects || [];
}

/**
 * Get projects aligned with a statement (legacy alias)
 */
export async function getAlignedProjects(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  const alignments = await getAlignedSubjects(machinery, statementCid, attesterAddress);
  return alignments.map(a => ({
    attester: a.attester,
    projectAddress: a.subjectAddress,
    statementCid: a.statementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

/**
 * Get statements aligned with a subject
 */
export async function getSubjectStatements(
  machinery: ActionTestingMachinery,
  subjectAddress: string,
  attesterAddress?: string
): Promise<AlignmentAttestation[]> {
  const result = await executeSDKQuery<{ subjectStatements: AlignmentAttestation[] }>(
    machinery,
    `
      query GetSubjectStatements($subjectAddress: Address!, $attesterAddress: Address) {
        subjectStatements(subjectAddress: $subjectAddress, attesterAddress: $attesterAddress) {
          attester
          subjectAddress
          statementCid
          topicStatementCid
          createdAt
          blockNumber
        }
      }
    `,
    { subjectAddress, attesterAddress }
  );

  return result.subjectStatements || [];
}

/**
 * Get statements aligned with a project (legacy alias)
 */
export async function getProjectStatements(
  machinery: ActionTestingMachinery,
  projectAddress: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  const alignments = await getSubjectStatements(machinery, projectAddress, attesterAddress);
  return alignments.map(a => ({
    attester: a.attester,
    projectAddress: a.subjectAddress,
    statementCid: a.statementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

/**
 * Get a specific alignment attestation
 */
export async function getAlignmentAttestation(
  machinery: ActionTestingMachinery,
  attesterAddress: string,
  subjectAddress: string,
  statementCid: IpfsCidV1
): Promise<AlignmentAttestation | null> {
  const result = await executeSDKQuery<{ alignmentAttestation: AlignmentAttestation | null }>(
    machinery,
    `
      query GetAlignmentAttestation(
        $attesterAddress: Address!
        $subjectAddress: Address!
        $statementId: ID!
      ) {
        alignmentAttestation(
          attesterAddress: $attesterAddress
          subjectAddress: $subjectAddress
          statementId: $statementId
        ) {
          attester
          subjectAddress
          statementId
          topicStatementId
          createdAt
          blockNumber
        }
      }
    `,
    { attesterAddress, subjectAddress, statementId: statementCid }
  );

  return result.alignmentAttestation;
}

/**
 * Get a specific project alignment (legacy alias)
 */
export async function getProjectAlignment(
  machinery: ActionTestingMachinery,
  attesterAddress: string,
  projectAddress: string,
  statementCid: IpfsCidV1
): Promise<ProjectAlignment | null> {
  const alignment = await getAlignmentAttestation(machinery, attesterAddress, projectAddress, statementCid);
  if (!alignment) return null;
  return {
    attester: alignment.attester,
    projectAddress: alignment.subjectAddress,
    statementCid: alignment.statementCid,
    createdAt: alignment.createdAt,
    blockNumber: alignment.blockNumber,
  };
}

/**
 * Get alignments by attester
 */
export async function getAlignmentsByAttester(
  machinery: ActionTestingMachinery,
  attesterAddress: string
): Promise<ProjectAlignment[]> {
  const result = await executeSDKQuery<{ alignmentsByAttester: ProjectAlignment[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectProjectAlignment[]> {
  const result = await executeSDKQuery<{ indirectlyAlignedSubjects: { subjectAddress: string; directStatementCid: IpfsCidV1; indirectStatementCid: IpfsCidV1; attester: string }[] }>(
    machinery,
    `
      query GetIndirectlyAlignedSubjects(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        indirectlyAlignedSubjects(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          subjectAddress
          directStatementId
          indirectStatementId
          attester
        }
      }
    `,
    { statementId: statementCid, trustedImplicationAttester, trustedAlignmentAttester }
  );

  // Map subjectAddress to projectAddress for backward compatibility
  return (result.indirectlyAlignedSubjects || []).map(a => ({
    projectAddress: a.subjectAddress,
    directStatementCid: a.directStatementCid,
    indirectStatementCid: a.indirectStatementCid,
    attester: a.attester,
  }));
}

/**
 * Get total funding metrics for a cause
 */
export async function getTotalFundingForCause(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<CauseFundingMetrics> {
  const result = await executeSDKQuery<{ totalFundingForCause: CauseFundingMetrics }>(
    machinery,
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
    { statementCid, trustedImplicationAttester, trustedAlignmentAttester }
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
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<AlignedProjectWithDetails[]> {
  const result = await executeSDKQuery<{ allAlignedProjectsForCause: AlignedProjectWithDetails[] }>(
    machinery,
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
    { statementCid, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.allAlignedProjectsForCause || [];
}

/**
 * Get top contributors for a cause
 */
export async function getTopContributorsForCause(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  limit: number = 10,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorStats[]> {
  const result = await executeSDKQuery<{ topContributorsForCause: ContributorStats[] }>(
    machinery,
    `
      query GetTopContributorsForCause(
        $statementCid: ID!
        $limit: Int!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        topContributorsForCause(
          statementCid: $statementCid
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
    { statementId: statementCid, limit, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.topContributorsForCause || [];
}

/**
 * Get user contribution rank for a cause
 */
export async function getUserContributionRankForCause(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  userAddress: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorRankResult | null> {
  const result = await executeSDKQuery<{ userContributionRankForCause: ContributorRankResult | null }>(
    machinery,
    `
      query GetUserContributionRankForCause(
        $statementCid: String!
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
    { statementCid, userAddress, trustedImplicationAttester, trustedAlignmentAttester }
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
  machinery: ActionTestingMachinery,
  owner: string,
  name: string
): Promise<MutableRef | null> {
  const result = await executeSDKQuery<{ mutableRef: MutableRef | null }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  owner: string
): Promise<MutableRef[]> {
  const result = await executeSDKQuery<{ mutableRefsByOwner: MutableRef[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  owner: string,
  name: string,
  limit: number = 100
): Promise<RefUpdate[]> {
  const result = await executeSDKQuery<{ refUpdateHistory: RefUpdate[] }>(
    machinery,
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
  machinery: ActionTestingMachinery,
  name: string,
  limit: number = 100
): Promise<MutableRef[]> {
  const result = await executeSDKQuery<{ mutableRefsByName: MutableRef[] }>(
    machinery,
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
