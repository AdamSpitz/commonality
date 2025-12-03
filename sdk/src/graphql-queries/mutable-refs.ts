/**
 * GraphQL-based mutable refs queries
 *
 * These functions use the local GraphQL executor instead of direct indexer queries
 */

import { executeQuery, type GraphQLExecutor } from '../graphql-server/index.js';

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
  executor: GraphQLExecutor,
  owner: string,
  name: string
): Promise<MutableRef | null> {
  const result = await executeQuery<{ mutableRefs: MutableRef | null }>(
    executor,
    `
      query GetUserRef($owner: String!, $name: String!) {
        mutableRefs(owner: $owner, name: $name) {
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

  return result.mutableRefs;
}

/**
 * Get all refs for a user
 */
export async function getUserRefs(
  executor: GraphQLExecutor,
  owner: string
): Promise<MutableRef[]> {
  const result = await executeQuery<{ mutableRefsByOwner: MutableRef[] }>(
    executor,
    `
      query GetUserRefs($owner: String!) {
        mutableRefsByOwner(owner: $owner) {
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

  return result.mutableRefsByOwner;
}

/**
 * Get the update history for a specific ref
 */
export async function getUserRefHistory(
  executor: GraphQLExecutor,
  owner: string,
  name: string,
  limit: number = 100
): Promise<RefUpdate[]> {
  const result = await executeQuery<{ refUpdateHistory: RefUpdate[] }>(
    executor,
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
  executor: GraphQLExecutor,
  name: string,
  limit: number = 100
): Promise<MutableRef[]> {
  const result = await executeQuery<{ mutableRefsByName: MutableRef[] }>(
    executor,
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
