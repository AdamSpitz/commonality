/**
 * GraphQL-based delegation queries
 *
 * All wrapper functions have been removed. Tests should use the graphql-helpers module.
 * This file now only exports type definitions.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Note {
  id: string;
  owner: string;
  rootOwner: string;
  amount: string;
  token: string;
  tokenType: number;
  tokenId: string;
  chainHash: string;
  active: boolean;
  parentNoteId?: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
}

export interface DelegationChainLink {
  address: string;
  position: number; // 0 = root, higher numbers = closer to leaf
  createdAt: string;
}
