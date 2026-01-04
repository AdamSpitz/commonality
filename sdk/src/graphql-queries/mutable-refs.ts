/**
 * GraphQL-based mutable refs queries
 *
 * All wrapper functions have been removed. Tests should use the graphql-helpers module.
 * This file now only exports type definitions.
 */

// ============================================================================
// Type Definitions
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
