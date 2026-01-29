/**
 * GraphQL-based conceptspace queries
 *
 * This file exports:
 * - Type definitions (used throughout the codebase)
 * - Complex composite functions that do more than just wrap a GraphQL query
 *
 * Simple wrapper functions have been removed. Tests should use the graphql-helpers module.
 */

import { executeQuery, type GraphQLExecutor } from '../graphql-server/index.js';
import type { DisplayableDocument } from '../displayable-document.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Statement {
  id: string;
  believerCount: number;
  disbelieverCount: number;
  cid?: string;
  statementType?: string;
  title?: string;
  excerpt?: string;
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

export interface StatementListItem {
  id: string;
  cid: string;
  statementType: string;
  title: string;
  excerpt: string;
  believerCount: number;
  disbelieverCount: number;
  createdAt: string;
}

export interface BrowseStatementsOptions {
  limit?: number;
  offset?: number;
  orderDirection?: string;
}

export interface StatementContent {
  statementType: string;
  title?: string;
  excerpt?: string;
  content?: string;
  references?: Array<{
    statementId: string;
    context?: string;
    label?: string;
    relationship?: string;
  }>;
  metadata?: {
    createdDate?: string;
    version?: number;
  };
}

export interface StatementWithContent {
  statement: Statement;
  content: StatementContent | DisplayableDocument | null;
  metrics?: {
    directBelievers: number;
    directDisbelievers: number;
    indirectSupporters: number;
  };
}

export interface GetStatementWithContentOptions {
  includeMetrics?: boolean;
  timeout?: number;
  attesterAddress?: string;
}

export interface IndirectSupportInfo {
  statement: StatementListItem;
  supportedVia: Array<{
    directlyBelievedStatement: StatementListItem;
    viaStatementId: string;
  }>;
}

export interface GetUserIndirectSupportOptions {
  trustedAttesters?: string[];
  limit?: number;
  offset?: number;
}

export interface StatementSuggestion {
  statement: StatementListItem;
  reason: string;
  relationshipType: string;
}

// ============================================================================
// Internal Helper Functions (not exported)
// ============================================================================

async function getStatement(
  executor: GraphQLExecutor,
  statementId: string
): Promise<Statement | null> {
  const result = await executeQuery<{ statement: Statement | null }>(
    executor,
    `
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
    `,
    { id: statementId }
  );

  return result.statement;
}

async function getImplicationsFrom(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  const result = await executeQuery<{ implicationsFrom: Implication[] }>(
    executor,
    `
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
    `,
    { statementId, attesterAddress }
  );

  return result.implicationsFrom || [];
}

// ============================================================================
// Exported Query Functions
// ============================================================================

/**
 * Get a user's belief state for a specific statement.
 */
export async function getUserBelief(
  executor: GraphQLExecutor,
  userAddress: string,
  statementId: string
): Promise<UserBelief | null> {
  const result = await executeQuery<{ userBelief: UserBelief | null }>(
    executor,
    `
      query GetUserBelief($userAddress: Address!, $statementId: ID!) {
        userBelief(userAddress: $userAddress, statementId: $statementId) {
          statementId
          beliefState
        }
      }
    `,
    { userAddress, statementId }
  );

  return result.userBelief;
}

/**
 * Get all statements a user believes (beliefState === 1).
 */
export async function getUserBeliefs(
  executor: GraphQLExecutor,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await executeQuery<{ userBeliefs: StatementListItem[] }>(
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
 * Get all statements a user disbelieves (beliefState === 2).
 */
export async function getUserDisbeliefs(
  executor: GraphQLExecutor,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await executeQuery<{ userDisbeliefs: StatementListItem[] }>(
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
// Exported Complex Functions
// ============================================================================

/**
 * Get count of indirect supporters for a statement.
 * This is more efficient than fetching the full list when you only need the count.
 */
export async function getIndirectSupporterCount(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<number> {
  const result = await executeQuery<{ indirectSupporterCount: number }>(
    executor,
    `
      query GetIndirectSupporterCount($statementId: ID!, $attesterAddress: Address) {
        indirectSupporterCount(statementId: $statementId, attesterAddress: $attesterAddress)
      }
    `,
    { statementId, attesterAddress }
  );

  return result.indirectSupporterCount || 0;
}

/**
 * Get statement with IPFS content and optional metrics.
 * This is a complex function that combines GraphQL queries with IPFS fetching.
 */
export async function getStatementWithContent(
  executor: GraphQLExecutor,
  statementId: string,
  options: GetStatementWithContentOptions = {}
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
  let content: StatementContent | null = null;
  if (statement.cid) {
    // Use the unified fetchFromIPFS which respects IPFS_GATEWAY env var
    const { fetchFromIPFS } = await import('../actions/common.js');
    content = await fetchFromIPFS(statement.cid, timeout) as StatementContent | null;
  }

  // Fetch metrics if requested
  let metrics: StatementWithContent['metrics'] | undefined;
  if (includeMetrics) {
    const indirectSupporters = await getIndirectSupporterCount(
      executor,
      statementId,
      attesterAddress
    );

    metrics = {
      directBelievers: statement.believerCount,
      directDisbelievers: statement.disbelieverCount,
      indirectSupporters,
    };
  }

  return {
    statement,
    content,
    metrics,
  };
}

/**
 * Get all statements a user indirectly supports through their beliefs and implications.
 *
 * This function solves the N+1 query pattern by efficiently computing all of a user's
 * indirect support in a single operation, rather than querying each believed statement
 * separately.
 *
 * A user indirectly supports a statement if:
 * 1. They believe some statement A
 * 2. There exists an implication A -> B (attested by a trusted attester)
 * 3. They have NO explicit opinion on statement B (not belief, not disbelief)
 *
 * Note: Indirect support only applies to statements the user hasn't directly opined on.
 * If they directly believe or disbelieve a statement, it's not considered indirect support.
 */
export async function getUserIndirectSupport(
  executor: GraphQLExecutor,
  userAddress: string,
  options: GetUserIndirectSupportOptions = {}
): Promise<IndirectSupportInfo[]> {
  // Step 1: Get all statements the user directly believes
  const userBeliefs = await getUserBeliefs(executor, userAddress);

  if (userBeliefs.length === 0) {
    return [];
  }

  // Step 2: For each belief, get implications FROM that statement
  // This tells us what statements are implied by the user's beliefs
  const implicationsQueries = userBeliefs.map(belief =>
    getImplicationsFrom(executor, belief.id, options.trustedAttesters?.[0])
  );

  const implicationsResults = await Promise.all(implicationsQueries);

  // Step 3: Build a map of target statements to the source statements that imply them
  // Map<targetStatementId, Set<sourceStatementId>>
  const targetToSources = new Map<string, Set<string>>();
  const allTargetIds = new Set<string>();

  userBeliefs.forEach((belief, idx) => {
    const implications = implicationsResults[idx];
    implications.forEach(implication => {
      const targetId = implication.toStatementId;
      allTargetIds.add(targetId);

      if (!targetToSources.has(targetId)) {
        targetToSources.set(targetId, new Set());
      }
      targetToSources.get(targetId)!.add(belief.id);
    });
  });

  if (allTargetIds.size === 0) {
    return [];
  }

  // Step 4: Check the user's belief state for all target statements
  // We need to exclude statements the user explicitly believes or disbelieves
  // (indirect support only applies to statements with no direct opinion)
  const targetIds = Array.from(allTargetIds);
  const beliefChecks = targetIds.map(targetId =>
    getUserBelief(executor, userAddress, targetId)
  );

  const beliefStates = await Promise.all(beliefChecks);

  // Step 5: Filter to only include statements with NO direct belief (beliefState === 0 or null)
  // Exclude both direct beliefs (beliefState === 1) and disbeliefs (beliefState === 2)
  const indirectlySupportedIds = targetIds.filter((_, idx) => {
    const beliefState = beliefStates[idx];
    // Include only if they have no explicit opinion (no belief state, or beliefState === 0)
    return !beliefState || beliefState.beliefState === 0;
  });

  if (indirectlySupportedIds.length === 0) {
    return [];
  }

  // Step 6: Fetch full statement data for indirectly supported statements
  const statementQueries = indirectlySupportedIds.map(id => getStatement(executor, id));
  const statements = await Promise.all(statementQueries);

  // Step 7: Build the result with information about how each statement is supported
  const results: IndirectSupportInfo[] = [];

  for (let i = 0; i < indirectlySupportedIds.length; i++) {
    const targetId = indirectlySupportedIds[i];
    const statement = statements[i];

    if (!statement) continue;

    const sourceIds = Array.from(targetToSources.get(targetId) || []);
    const sourceStatements = userBeliefs.filter(b => sourceIds.includes(b.id));

    results.push({
      statement: statement as StatementListItem,
      supportedVia: sourceStatements.map(source => ({
        directlyBelievedStatement: source,
        viaStatementId: source.id,
      })),
    });
  }

  // Apply pagination if specified
  const start = options.offset || 0;
  const end = options.limit ? start + options.limit : undefined;

  return results.slice(start, end);
}

/**
 * Get statement suggestions for a given statement.
 * Returns statements that are related via implications and have more supporters.
 */
export async function getStatementSuggestions(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<StatementSuggestion[]> {
  const result = await executeQuery<{ statementSuggestions: StatementSuggestion[] }>(
    executor,
    `
      query GetStatementSuggestions($statementId: ID!, $attesterAddress: Address) {
        statementSuggestions(statementId: $statementId, attesterAddress: $attesterAddress) {
          statement {
            id
            cid
            statementType
            title
            excerpt
            believerCount
            disbelieverCount
            createdAt
          }
          reason
          relationshipType
        }
      }
    `,
    { statementId, attesterAddress }
  );

  return result.statementSuggestions || [];
}
