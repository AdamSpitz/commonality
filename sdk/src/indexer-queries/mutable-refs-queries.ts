/**
 * GraphQL queries for Mutable Refs subsystem
 */

import { request } from 'graphql-request';
import { type GraphQLClient } from '../utils/graphqlClient.js';
import {
  GetUserRefDocument,
  GetUserRefsDocument,
  GetUserRefHistoryDocument,
  GetRefsByNameDocument,
} from '../generated/graphql.js';

import {
  type MutableRef,
  type RefUpdate,
} from '../shared/types/mutable-refs.js';
import { SDKMachinery } from '../machinery.js';

// ============================================================================
// Mutable Refs Queries
// ============================================================================

/**
 * Get the current value of a user's ref
 *
 * @param machinery - SDK machinery instance
 * @param owner - Address of the ref owner
 * @param name - Name of the ref
 * @returns The current ref state, or null if not found
 *
 * @example
 * ```typescript
 * const ref = await getUserRef(machinery, userAddress, "created-statements");
 * if (ref) {
 *   console.log("Current value:", ref.value);
 *   console.log("Last updated:", ref.updatedAt);
 * }
 * ```
 */
export async function getUserRef(
  machinery: SDKMachinery,
  owner: string,
  name: string
): Promise<MutableRef | null> {
  const result = await request(machinery.graphqlClient.url, GetUserRefDocument, {
    owner: owner.toLowerCase(),
    name,
  });
  // BigInt fields (updatedAt, updatedAtBlock) come as strings at runtime
  return result.mutableRefs as unknown as MutableRef | null;
}

/**
 * Get all refs for a user
 *
 * @param machinery - SDK machinery instance
 * @param owner - Address of the ref owner
 * @returns List of all refs for this user
 *
 * @example
 * ```typescript
 * const refs = await getUserRefs(machinery, userAddress);
 * refs.forEach(ref => {
 *   console.log(`${ref.name}: ${ref.value}`);
 * });
 * ```
 */
export async function getUserRefs(
  machinery: SDKMachinery,
  owner: string
): Promise<MutableRef[]> {
  const result = await request(machinery.graphqlClient.url, GetUserRefsDocument, {
    owner: owner.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.mutableRefss?.items ?? []) as unknown as MutableRef[];
}

/**
 * Get the update history for a specific ref
 *
 * Returns all historical updates to a ref, ordered by most recent first.
 *
 * @param machinery - SDK machinery instance
 * @param owner - Address of the ref owner
 * @param name - Name of the ref
 * @param limit - Maximum number of updates to return (default: 100)
 * @returns List of historical updates
 *
 * @example
 * ```typescript
 * const history = await getUserRefHistory(machinery, userAddress, "created-statements");
 * console.log("Update history:");
 * history.forEach((update, i) => {
 *   console.log(`${i + 1}. Block ${update.blockNumber}: ${update.value}`);
 * });
 * ```
 */
export async function getUserRefHistory(
  machinery: SDKMachinery,
  owner: string,
  name: string,
  limit: number = 100
): Promise<RefUpdate[]> {
  const result = await request(machinery.graphqlClient.url, GetUserRefHistoryDocument, {
    owner: owner.toLowerCase(),
    name,
    limit,
  });
  // BigInt fields (blockNumber, timestamp) come as strings at runtime
  return (result.refUpdatess?.items ?? []) as unknown as RefUpdate[];
}

/**
 * Get all ref updates across all users for a specific ref name
 *
 * Useful for discovering who else is using a particular ref name.
 *
 * @param machinery - SDK machinery instance
 * @param name - Name of the ref
 * @param limit - Maximum number of refs to return (default: 100)
 * @returns List of refs with this name from different users
 *
 * @example
 * ```typescript
 * // See who else has a "created-statements" ref
 * const refs = await getRefsByName(machinery, "created-statements");
 * console.log(`${refs.length} users have created-statements refs`);
 * ```
 */
export async function getRefsByName(
  machinery: SDKMachinery,
  name: string,
  limit: number = 100
): Promise<MutableRef[]> {
  const result = await request(machinery.graphqlClient.url, GetRefsByNameDocument, {
    name,
    limit,
  });
  // BigInt fields come as strings at runtime
  return (result.mutableRefss?.items ?? []) as unknown as MutableRef[];
}
