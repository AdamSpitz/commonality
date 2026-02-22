/**
 * GraphQL queries for Delegation subsystem
 */

import { request } from 'graphql-request';
import { type GraphQLClient } from '../utils/graphqlClient.js';
import {
  GetNoteDocument,
  GetNotesByOwnerDocument,
  GetNotesByRootDocument,
  GetDelegationChainDocument,
} from '../generated/graphql.js';

import {
  type Note,
  type DelegationChainLink,
} from '../shared/types/delegation.js';

// ============================================================================
// Delegation Queries
// ============================================================================

/**
 * Get a note by ID
 */
export async function getNote(
  client: GraphQLClient,
  noteId: string
): Promise<Note | null> {
  // Cast string to bigint for the variable type — server accepts string representations of BigInt
  const result = await request(client.url, GetNoteDocument, { id: noteId as unknown as bigint });
  // BigInt fields (id, tokenId, amount, createdAt, etc.) come as strings at runtime
  return result.delegatableNotes as unknown as Note | null;
}

/**
 * Get all notes owned by a specific address (as leaf owner)
 */
export async function getNotesByOwner(
  client: GraphQLClient,
  ownerAddress: string
): Promise<Note[]> {
  const result = await request(client.url, GetNotesByOwnerDocument, {
    owner: ownerAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.delegatableNotess?.items ?? []) as unknown as Note[];
}

/**
 * Get all notes deposited by a specific address (as root)
 */
export async function getNotesByRoot(
  client: GraphQLClient,
  rootAddress: string
): Promise<Note[]> {
  const result = await request(client.url, GetNotesByRootDocument, {
    rootOwner: rootAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.delegatableNotess?.items ?? []) as unknown as Note[];
}

/**
 * Get the full delegation chain for a note
 */
export async function getDelegationChain(
  client: GraphQLClient,
  noteId: string
): Promise<DelegationChainLink[]> {
  // Cast string to bigint for the variable type — server accepts string representations of BigInt
  const result = await request(client.url, GetDelegationChainDocument, {
    noteId: noteId as unknown as bigint,
  });
  // BigInt fields (createdAt) come as strings at runtime
  return (result.delegationChainss?.items ?? []) as unknown as DelegationChainLink[];
}
