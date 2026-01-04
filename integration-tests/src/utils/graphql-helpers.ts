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
