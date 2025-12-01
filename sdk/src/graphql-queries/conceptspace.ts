/**
 * GraphQL-based conceptspace queries
 *
 * These functions use the local GraphQL executor instead of direct indexer queries
 */

import { executeQuery, type GraphQLExecutor } from '../graphql-server/index.js';

// ============================================================================
// Conceptspace Queries
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

/**
 * Get statement by ID
 */
export async function getStatement(
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
 * Get implications from a statement (what it implies)
 */
export async function getImplicationsFrom(
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
          createdAt
          blockNumber
        }
      }
    `,
    { statementId, attesterAddress }
  );

  return result.implicationsFrom || [];
}

/**
 * Get implications to a statement (what implies it)
 */
export async function getImplicationsTo(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  const result = await executeQuery<{ implicationsTo: Implication[] }>(
    executor,
    `
      query GetImplicationsTo($statementId: ID!, $attesterAddress: Address) {
        implicationsTo(statementId: $statementId, attesterAddress: $attesterAddress) {
          attester
          fromStatementId
          toStatementId
          createdAt
          blockNumber
        }
      }
    `,
    { statementId, attesterAddress }
  );

  return result.implicationsTo || [];
}

/**
 * Get a specific implication attestation
 */
export async function getImplication(
  executor: GraphQLExecutor,
  attesterAddress: string,
  fromStatementId: string,
  toStatementId: string
): Promise<Implication | null> {
  const result = await executeQuery<{ implication: Implication | null }>(
    executor,
    `
      query GetImplication($attesterAddress: Address!, $fromStatementId: ID!, $toStatementId: ID!) {
        implication(attesterAddress: $attesterAddress, fromStatementId: $fromStatementId, toStatementId: $toStatementId) {
          attester
          fromStatementId
          toStatementId
          createdAt
          blockNumber
        }
      }
    `,
    { attesterAddress, fromStatementId, toStatementId }
  );

  return result.implication;
}

/**
 * Compute indirect supporters for a statement
 */
export async function getIndirectSupporters(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<IndirectSupporter[]> {
  const result = await executeQuery<{ indirectSupporters: IndirectSupporter[] }>(
    executor,
    `
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
    `,
    { statementId, attesterAddress }
  );

  return result.indirectSupporters || [];
}

/**
 * Get count of indirect supporters for a statement
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
 * Browse statements by most supporters
 */
export async function browseStatementsByMostSupporters(
  executor: GraphQLExecutor,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const result = await executeQuery<{ browseStatementsByMostSupporters: StatementListItem[] }>(
    executor,
    `
      query BrowseByMostSupporters($options: BrowseStatementsOptions) {
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
 * Browse newest statements
 */
export async function browseStatementsByNewest(
  executor: GraphQLExecutor,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const result = await executeQuery<{ browseStatementsByNewest: StatementListItem[] }>(
    executor,
    `
      query BrowseByNewest($options: BrowseStatementsOptions) {
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
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const result = await executeQuery<{ allStatements: StatementListItem[] }>(
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
 * Get statements a user directly believes
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
 * Get statements a user directly disbelieves
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
