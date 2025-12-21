/**
 * Invariant checking utilities for integration tests
 *
 * These functions verify that the system maintains consistency properties
 * that should always be true, regardless of what actions are performed.
 *
 * See ../generative-test-prep.md for the full framework.
 */

import assert from 'assert';

/**
 * GraphQL client type (simple HTTP client)
 */
interface GraphQLClient {
  url: string;
}

/**
 * GraphQL executor type (in-process executor with indexer client)
 */
interface GraphQLExecutor {
  indexerClient: GraphQLClient;
}

/**
 * Execute a GraphQL query
 * Supports both GraphQLClient and GraphQLExecutor types
 */
async function query<T = any>(
  clientOrExecutor: GraphQLClient | GraphQLExecutor,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  // Extract the actual client from either type
  const client = 'indexerClient' in clientOrExecutor
    ? clientOrExecutor.indexerClient
    : clientOrExecutor;

  const response = await fetch(client.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: queryString,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { data?: T; errors?: any[] };

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

/**
 * State Consistency Invariant #1: Belief counts match belief records
 *
 * For any statement:
 * - believerCount should equal the number of UserBelief records with beliefState=BELIEVES (1)
 * - disbelieverCount should equal the number of UserBelief records with beliefState=DISBELIEVES (2)
 *
 * This checks that the cached aggregated counts on the Statement entity
 * match the actual individual belief records in the database.
 */
export async function assertBeliefCountsMatch(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  statementId: string
): Promise<void> {
  // Get the statement with its cached counts
  const statementResult = await query<{
    statements: {
      id: string;
      believerCount: number;
      disbelieverCount: number
    } | null
  }>(
    graphqlClient,
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

  const statement = statementResult.statements;
  if (!statement) {
    throw new Error(`Statement ${statementId} not found`);
  }

  // Get all believers (beliefState = 1)
  const believersResult = await query<{
    beliefss: {
      items: Array<{ user: { id: string }; beliefState: number }>
    }
  }>(
    graphqlClient,
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
    { statementId: statementId.toLowerCase() }
  );

  const actualBelieverCount = believersResult.beliefss?.items.length || 0;

  // Get all disbelievers (beliefState = 2)
  const disbelieversResult = await query<{
    beliefss: {
      items: Array<{ user: { id: string }; beliefState: number }>
    }
  }>(
    graphqlClient,
    `
      query GetDisbelievers($statementId: String!) {
        beliefss(where: { statementId: $statementId, beliefState: 2 }) {
          items {
            user {
              id
            }
            beliefState
          }
        }
      }
    `,
    { statementId: statementId.toLowerCase() }
  );

  const actualDisbelieverCount = disbelieversResult.beliefss?.items.length || 0;

  // Verify the counts match
  assert.strictEqual(
    statement.believerCount,
    actualBelieverCount,
    `Statement ${statementId}: believerCount mismatch. ` +
    `Expected ${actualBelieverCount} (from individual belief records), ` +
    `got ${statement.believerCount} (from cached count)`
  );

  assert.strictEqual(
    statement.disbelieverCount,
    actualDisbelieverCount,
    `Statement ${statementId}: disbelieverCount mismatch. ` +
    `Expected ${actualDisbelieverCount} (from individual belief records), ` +
    `got ${statement.disbelieverCount} (from cached count)`
  );
}
