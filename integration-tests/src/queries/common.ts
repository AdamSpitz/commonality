/**
 * Common GraphQL query utilities
 */

import { INDEXER_SYNC } from '../test-constants.js';

export interface GraphQLClient {
  url: string;
}

/**
 * Assert that a value is not null/undefined, throwing a descriptive error if it is
 */
export function assertNotNull<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${description} not found in indexer`);
  }
  return value;
}

/**
 * Create a GraphQL client
 */
export function createGraphQLClient(url = 'http://localhost:42069/graphql'): GraphQLClient {
  return { url };
}

/**
 * Execute a GraphQL query
 */
export async function query<T = any>(
  client: GraphQLClient,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
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

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

/**
 * Wait for the indexer to sync to a specific block
 */
export async function waitForSync(
  client: GraphQLClient,
  targetBlock: bigint,
  timeoutMs = INDEXER_SYNC.MAX_WAIT_MS
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Ponder exposes indexing status via a meta query
      // The status is a JSON object with chain-specific block info
      const result = await query<{
        _meta: {
          status: Record<string, { block: { number: number } }>
        }
      }>(
        client,
        `
          query {
            _meta {
              status
            }
          }
        `
      );

      // Get the block number from the hardhat chain status
      const hardhatStatus = result._meta.status.hardhat;
      if (!hardhatStatus) {
        throw new Error('No hardhat chain status found');
      }

      const currentBlock = hardhatStatus.block.number;

      if (currentBlock >= Number(targetBlock)) {
        return;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, INDEXER_SYNC.POLL_INTERVAL_MS));
    } catch (error) {
      // Indexer might not be ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, INDEXER_SYNC.POLL_INTERVAL_MS));
    }
  }

  throw new Error(`Indexer did not sync to block ${targetBlock} within ${timeoutMs}ms`);
}
