/**
 * GraphQL queries for Mutable Refs subsystem
 */

import { query, type GraphQLClient } from './common.js';

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
 *
 * @param client - GraphQL client
 * @param owner - Address of the ref owner
 * @param name - Name of the ref
 * @returns The current ref state, or null if not found
 *
 * @example
 * ```typescript
 * const ref = await getUserRef(client, userAddress, "created-statements");
 * if (ref) {
 *   console.log("Current value:", ref.value);
 *   console.log("Last updated:", ref.updatedAt);
 * }
 * ```
 */
export async function getUserRef(
  client: GraphQLClient,
  owner: string,
  name: string
): Promise<MutableRef | null> {
  const result = await query<{ mutableRefs: { items: MutableRef[] } }>(
    client,
    `
      query GetUserRef($owner: String!, $name: String!) {
        mutableRefs(where: { owner: $owner, name: $name }) {
          items {
            owner
            name
            value
            updatedAt
            updatedAtBlock
            transactionHash
          }
        }
      }
    `,
    { owner: owner.toLowerCase(), name }
  );

  // Return first item or null
  return result.mutableRefs.items[0] || null;
}

/**
 * Get all refs for a user
 *
 * @param client - GraphQL client
 * @param owner - Address of the ref owner
 * @returns List of all refs for this user
 *
 * @example
 * ```typescript
 * const refs = await getUserRefs(client, userAddress);
 * refs.forEach(ref => {
 *   console.log(`${ref.name}: ${ref.value}`);
 * });
 * ```
 */
export async function getUserRefs(
  client: GraphQLClient,
  owner: string
): Promise<MutableRef[]> {
  const result = await query<{ mutableRefs: { items: MutableRef[] } }>(
    client,
    `
      query GetUserRefs($owner: String!) {
        mutableRefs(where: { owner: $owner }) {
          items {
            owner
            name
            value
            updatedAt
            updatedAtBlock
            transactionHash
          }
        }
      }
    `,
    { owner: owner.toLowerCase() }
  );

  return result.mutableRefs.items;
}

/**
 * Get the update history for a specific ref
 *
 * Returns all historical updates to a ref, ordered by most recent first.
 *
 * @param client - GraphQL client
 * @param owner - Address of the ref owner
 * @param name - Name of the ref
 * @param limit - Maximum number of updates to return (default: 100)
 * @returns List of historical updates
 *
 * @example
 * ```typescript
 * const history = await getUserRefHistory(client, userAddress, "created-statements");
 * console.log("Update history:");
 * history.forEach((update, i) => {
 *   console.log(`${i + 1}. Block ${update.blockNumber}: ${update.value}`);
 * });
 * ```
 */
export async function getUserRefHistory(
  client: GraphQLClient,
  owner: string,
  name: string,
  limit: number = 100
): Promise<RefUpdate[]> {
  const result = await query<{ refUpdates: { items: RefUpdate[] } }>(
    client,
    `
      query GetUserRefHistory($owner: String!, $name: String!, $limit: Int!) {
        refUpdates(
          where: { owner: $owner, name: $name }
          orderBy: "blockNumber"
          orderDirection: "desc"
          limit: $limit
        ) {
          items {
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
      }
    `,
    { owner: owner.toLowerCase(), name, limit }
  );

  return result.refUpdates.items;
}

/**
 * Get all ref updates across all users for a specific ref name
 *
 * Useful for discovering who else is using a particular ref name.
 *
 * @param client - GraphQL client
 * @param name - Name of the ref
 * @param limit - Maximum number of refs to return (default: 100)
 * @returns List of refs with this name from different users
 *
 * @example
 * ```typescript
 * // See who else has a "created-statements" ref
 * const refs = await getRefsByName(client, "created-statements");
 * console.log(`${refs.length} users have created-statements refs`);
 * ```
 */
export async function getRefsByName(
  client: GraphQLClient,
  name: string,
  limit: number = 100
): Promise<MutableRef[]> {
  const result = await query<{ mutableRefs: { items: MutableRef[] } }>(
    client,
    `
      query GetRefsByName($name: String!, $limit: Int!) {
        mutableRefs(
          where: { name: $name }
          orderBy: "updatedAt"
          orderDirection: "desc"
          limit: $limit
        ) {
          items {
            owner
            name
            value
            updatedAt
            updatedAtBlock
            transactionHash
          }
        }
      }
    `,
    { name, limit }
  );

  return result.mutableRefs.items;
}
