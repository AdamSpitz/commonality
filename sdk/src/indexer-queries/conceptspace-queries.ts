/**
 * GraphQL queries for Conceptspace subsystem
 */

import { query, type GraphQLClient } from '../utils/graphqlClient.js';

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
  createdAt?: string;
}

/**
 * Get statement by ID
 */
export async function getStatement(
  client: GraphQLClient,
  statementId: string
): Promise<Statement | null> {
  const result = await query<{ statements: Statement | null }>(
    client,
    `
      query GetStatement($id: String!) {
        statements(id: $id) {
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
    { id: statementId.toLowerCase() }
  );

  return result.statements;
}

export interface UserBelief {
  statementId: string;
  beliefState: number; // 0=noOpinion, 1=believes, 2=disbelieves
}

/**
 * Get user's belief about a statement
 */
export async function getUserBelief(
  client: GraphQLClient,
  userAddress: string,
  statementId: string
): Promise<UserBelief | null> {
  const result = await query<{ beliefs: UserBelief | null }>(
    client,
    `
      query GetUserBelief($user: String!, $statementId: String!) {
        beliefs(user: $user, statementId: $statementId) {
          statementId
          beliefState
        }
      }
    `,
    { user: userAddress.toLowerCase(), statementId: statementId.toLowerCase() }
  );

  return result.beliefs;
}

// ============================================================================
// Implications Queries
// ============================================================================

export interface Implication {
  attester: { id: string };
  fromStatementId: string;
  toStatementId: string;
  explanationCid: string;
  createdAt: string;
  blockNumber: string;
}

/**
 * Get implications from a statement (what it implies)
 */
export async function getImplicationsFrom(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  if (attesterAddress) {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsFrom($fromStatementId: String!, $attester: String!) {
          implicationss(where: { fromStatementId: $fromStatementId, attester: $attester }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              explanationCid
              createdAt
              blockNumber
            }
          }
        }
      `,
      { fromStatementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.implicationss?.items || [];
  } else {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsFrom($fromStatementId: String!) {
          implicationss(where: { fromStatementId: $fromStatementId }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              explanationCid
              createdAt
              blockNumber
            }
          }
        }
      `,
      { fromStatementId: statementId.toLowerCase() }
    );
    return result.implicationss?.items || [];
  }
}

/**
 * Get implications to a statement (what implies it)
 */
export async function getImplicationsTo(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  if (attesterAddress) {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsTo($toStatementId: String!, $attester: String!) {
          implicationss(where: { toStatementId: $toStatementId, attester: $attester }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              explanationCid
              createdAt
              blockNumber
            }
          }
        }
      `,
      { toStatementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.implicationss?.items || [];
  } else {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsTo($toStatementId: String!) {
          implicationss(where: { toStatementId: $toStatementId }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              explanationCid
              createdAt
              blockNumber
            }
          }
        }
      `,
      { toStatementId: statementId.toLowerCase() }
    );
    return result.implicationss?.items || [];
  }
}

/**
 * Get a specific implication attestation
 */
export async function getImplication(
  client: GraphQLClient,
  attesterAddress: string,
  fromStatementId: string,
  toStatementId: string
): Promise<Implication | null> {
  const result = await query<{ implications: Implication | null }>(
    client,
    `
      query GetImplication($attester: String!, $fromStatementId: String!, $toStatementId: String!) {
        implications(
          attester: $attester,
          fromStatementId: $fromStatementId,
          toStatementId: $toStatementId
        ) {
          attester {
            id
          }
          fromStatementId
          toStatementId
          explanationCid
          createdAt
          blockNumber
        }
      }
    `,
    {
      attester: attesterAddress.toLowerCase(),
      fromStatementId: fromStatementId.toLowerCase(),
      toStatementId: toStatementId.toLowerCase()
    }
  );

  return result.implications;
}

// ============================================================================
// Indirect Support Computation Queries
// ============================================================================

export interface IndirectSupporter {
  user: string;
  viaStatementId: string;
  viaStatement?: Statement;
}

/**
 * Compute indirect supporters for a statement.
 * Returns users who believe statements that imply the target statement.
 * Excludes users who explicitly disbelieve the target statement.
 *
 * @param client GraphQL client
 * @param statementId Target statement ID
 * @param attesterAddress Optional: filter implications by specific attester
 */
export async function getIndirectSupporters(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<IndirectSupporter[]> {
  // Step 1: Get all implications pointing to this statement
  const implications = await getImplicationsTo(client, statementId, attesterAddress);

  if (implications.length === 0) {
    return [];
  }

  // Step 2: Fetch believers for all implications in parallel
  const believersQueries = implications.map(implication =>
    query<{ beliefss: { items: Array<{ user: { id: string }; beliefState: number }> } }>(
      client,
      `
        query GetBelievers($statementId: String!) {
          beliefss(where: { statementId: $statementId, beliefState: 1 }) {
            items {
              user {
                id
              }
              beliefState
            }
          }
        }
      `,
      { statementId: implication.fromStatementId.toLowerCase() }
    )
  );

  const believersResults = await Promise.all(believersQueries);

  // Step 3: Collect all unique user addresses and their source statements
  const userToViaStatement = new Map<string, string>();

  implications.forEach((implication, idx) => {
    const believers = believersResults[idx].beliefss?.items || [];
    believers.forEach(believer => {
      const userAddress = believer.user.id;
      // Store the first statement that led to this indirect support
      if (!userToViaStatement.has(userAddress)) {
        userToViaStatement.set(userAddress, implication.fromStatementId);
      }
    });
  });

  // Step 4: Check all users' beliefs on target statement in parallel
  const uniqueUsers = Array.from(userToViaStatement.keys());
  const targetBeliefQueries = uniqueUsers.map(userAddress =>
    getUserBelief(client, userAddress, statementId)
  );

  const targetBeliefs = await Promise.all(targetBeliefQueries);

  // Step 5: Filter out users who explicitly disbelieve the target
  const supporters: IndirectSupporter[] = [];

  uniqueUsers.forEach((userAddress, idx) => {
    const targetBelief = targetBeliefs[idx];
    // Only include if they don't explicitly disbelieve (beliefState 2 = disbelieve)
    if (!targetBelief || targetBelief.beliefState !== 2) {
      supporters.push({
        user: userAddress,
        viaStatementId: userToViaStatement.get(userAddress)!,
      });
    }
  });

  return supporters;
}

/**
 * Get count of indirect supporters for a statement.
 * More efficient than getIndirectSupporters when you only need the count.
 */
export async function getIndirectSupporterCount(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<number> {
  const supporters = await getIndirectSupporters(client, statementId, attesterAddress);
  return supporters.length;
}

// ============================================================================
// Statement Discovery & Browsing Queries
// ============================================================================

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
  /** Maximum number of results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Order direction */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Browse statements by most supporters (direct believers)
 */
export async function browseStatementsByMostSupporters(
  client: GraphQLClient,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await query<{ statementss: { items: StatementListItem[] } }>(
    client,
    `
      query BrowseByMostSupporters($limit: Int!, $offset: Int!) {
        statementss(
          limit: $limit
          offset: $offset
          orderBy: "believerCount"
          orderDirection: "${orderDirection}"
        ) {
          items {
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
      }
    `,
    { limit, offset }
  );

  return result.statementss?.items || [];
}

/**
 * Browse newest statements
 */
export async function browseStatementsByNewest(
  client: GraphQLClient,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await query<{ statementss: { items: StatementListItem[] } }>(
    client,
    `
      query BrowseByNewest($limit: Int!, $offset: Int!) {
        statementss(
          limit: $limit
          offset: $offset
          orderBy: "createdAt"
          orderDirection: "${orderDirection}"
        ) {
          items {
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
      }
    `,
    { limit, offset }
  );

  return result.statementss?.items || [];
}

/**
 * Get all statements (for basic listing)
 */
export async function getAllStatements(
  client: GraphQLClient,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 100, offset = 0 } = options;

  const result = await query<{ statementss: { items: StatementListItem[] } }>(
    client,
    `
      query GetAllStatements($limit: Int!, $offset: Int!) {
        statementss(limit: $limit, offset: $offset) {
          items {
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
      }
    `,
    { limit, offset }
  );

  return result.statementss?.items || [];
}

/**
 * Get statements a user directly believes
 */
export async function getUserBeliefs(
  client: GraphQLClient,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await query<{
    users: {
      beliefs: {
        items: Array<{
          statementId: string;
          beliefState: number;
          statement: StatementListItem;
        }>
      }
    }
  }>(
    client,
    `
      query GetUserBeliefs($user: String!) {
        users(id: $user) {
          beliefs(where: { beliefState: 1 }) {
            items {
              statementId
              beliefState
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
            }
          }
        }
      }
    `,
    { user: userAddress.toLowerCase() }
  );

  return result.users?.beliefs?.items.map(item => item.statement) || [];
}

/**
 * Get statements a user directly disbelieves
 */
export async function getUserDisbeliefs(
  client: GraphQLClient,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await query<{
    users: {
      beliefs: {
        items: Array<{
          statementId: string;
          beliefState: number;
          statement: StatementListItem;
        }>
      }
    }
  }>(
    client,
    `
      query GetUserDisbeliefs($user: String!) {
        users(id: $user) {
          beliefs(where: { beliefState: 2 }) {
            items {
              statementId
              beliefState
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
            }
          }
        }
      }
    `,
    { user: userAddress.toLowerCase() }
  );

  return result.users?.beliefs?.items.map(item => item.statement) || [];
}

/**
 * Get statement suggestions for a given statement
 * Returns statements that:
 * 1. Are implied by this statement (S1 -> S2) and S2 is more popular
 * 2. Imply this statement (S2 -> S1) and S2 is more popular
 */
export async function getStatementSuggestions(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Array<{
  statement: StatementListItem;
  reason: string;
  relationshipType: string;
}>> {
  const suggestions: Array<{
    statement: StatementListItem;
    reason: string;
    relationshipType: string;
  }> = [];

  // Get the source statement to compare popularity
  const sourceStatement = await getStatement(client, statementId);
  if (!sourceStatement) {
    return [];
  }

  // Get implications from this statement (S1 -> S2)
  const implicationsFrom = await getImplicationsFrom(client, statementId, attesterAddress);

  for (const implication of implicationsFrom) {
    const targetStatement = await getStatement(client, implication.toStatementId);
    if (targetStatement && targetStatement.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: targetStatement.id,
          cid: targetStatement.cid || '',
          statementType: targetStatement.statementType || '',
          title: targetStatement.title || '',
          excerpt: targetStatement.excerpt || '',
          believerCount: targetStatement.believerCount,
          disbelieverCount: targetStatement.disbelieverCount,
          createdAt: targetStatement.createdAt || '',
        },
        reason: `This statement is implied by the current statement and has ${targetStatement.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
        relationshipType: 'implies',
      });
    }
  }

  // Get implications to this statement (S2 -> S1)
  const implicationsTo = await getImplicationsTo(client, statementId, attesterAddress);

  for (const implication of implicationsTo) {
    const sourceOfImplication = await getStatement(client, implication.fromStatementId);
    if (sourceOfImplication && sourceOfImplication.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: sourceOfImplication.id,
          cid: sourceOfImplication.cid || '',
          statementType: sourceOfImplication.statementType || '',
          title: sourceOfImplication.title || '',
          excerpt: sourceOfImplication.excerpt || '',
          believerCount: sourceOfImplication.believerCount,
          disbelieverCount: sourceOfImplication.disbelieverCount,
          createdAt: sourceOfImplication.createdAt || '',
        },
        reason: `This statement implies the current statement and has ${sourceOfImplication.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
        relationshipType: 'impliedBy',
      });
    }
  }

  // Sort by popularity (most supporters first)
  suggestions.sort((a, b) => b.statement.believerCount - a.statement.believerCount);

  return suggestions;
}
