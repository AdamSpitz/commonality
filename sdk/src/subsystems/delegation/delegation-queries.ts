/**
 * GraphQL queries for Delegation subsystem
 */

import { request } from 'graphql-request';
import {
  GetNoteDocument,
  GetNotesByOwnerDocument,
  GetNotesByRootDocument,
  GetDelegationChainDocument,
} from '../../generated/graphql.js';

import {
  type Note,
  type DelegationChainLink,
} from './types.js';
import { SDKMachinery } from '../../machinery.js';

// ============================================================================
// Delegation Queries
// ============================================================================

/**
 * Get a note by ID
 */
export async function getNote(
  machinery: SDKMachinery,
  noteId: string
): Promise<Note | null> {
  // Cast string to bigint for the variable type — server accepts string representations of BigInt
  const result = await request(machinery.graphqlClient.url, GetNoteDocument, { id: noteId as unknown as bigint });
  // BigInt fields (id, tokenId, amount, createdAt, etc.) come as strings at runtime
  return result.delegatableNotes as unknown as Note | null;
}

/**
 * Get all notes owned by a specific address (as leaf owner)
 */
export async function getNotesByOwner(
  machinery: SDKMachinery,
  ownerAddress: string
): Promise<Note[]> {
  const result = await request(machinery.graphqlClient.url, GetNotesByOwnerDocument, {
    owner: ownerAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.delegatableNotess?.items ?? []) as unknown as Note[];
}

/**
 * Get all notes deposited by a specific address (as root)
 */
export async function getNotesByRoot(
  machinery: SDKMachinery,
  rootAddress: string
): Promise<Note[]> {
  const result = await request(machinery.graphqlClient.url, GetNotesByRootDocument, {
    rootOwner: rootAddress.toLowerCase(),
  });
  // BigInt fields come as strings at runtime
  return (result.delegatableNotess?.items ?? []) as unknown as Note[];
}

/**
 * Get the full delegation chain for a note
 */
export async function getDelegationChain(
  machinery: SDKMachinery,
  noteId: string
): Promise<DelegationChainLink[]> {
  // Cast string to bigint for the variable type — server accepts string representations of BigInt
  const result = await request(machinery.graphqlClient.url, GetDelegationChainDocument, {
    noteId: noteId as unknown as bigint,
  });
  // BigInt fields (createdAt) come as strings at runtime
  return (result.delegationChainss?.items ?? []) as unknown as DelegationChainLink[];
}
