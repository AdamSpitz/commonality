/**
 * GraphQL queries for Conceptspace subsystem
 */

import { query, type GraphQLClient } from './common.js';

// ============================================================================
// Conceptspace Queries
// ============================================================================

export interface Statement {
  id: string;
  believerCount: number;
  disbelieverCount: number;
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

  // Step 2: For each implication, get believers of the "from" statement
  const supporters = new Map<string, IndirectSupporter>();

  for (const implication of implications) {
    // Get all believers of the "from" statement
    const believersResult = await query<{ beliefss: { items: Array<{ user: { id: string }; beliefState: number }> } }>(
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
    );

    const believers = believersResult.beliefss?.items || [];

    for (const believer of believers) {
      const userAddress = believer.user.id;
      // Check if this user explicitly disbelieves the target statement
      const targetBelief = await getUserBelief(client, userAddress, statementId);

      // Only include if they don't explicitly disbelieve (beliefState 2 = disbelieve)
      if (!targetBelief || targetBelief.beliefState !== 2) {
        supporters.set(userAddress, {
          user: userAddress,
          viaStatementId: implication.fromStatementId,
        });
      }
    }
  }

  return Array.from(supporters.values());
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
