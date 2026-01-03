/**
 * GraphQL-based delegation queries
 *
 * These functions use the local GraphQL executor instead of direct indexer queries
 */

import { executeQuery, type GraphQLExecutor } from '../graphql-server/index.js';

// ============================================================================
// Delegation Queries
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

/**
 * Get a note by ID
 */
export async function getNote(
  executor: GraphQLExecutor,
  noteId: string
): Promise<Note | null> {
  const result = await executeQuery<{ note: Note | null }>(
    executor,
    `
      query GetNote($id: ID!) {
        note(id: $id) {
          id
          owner
          rootOwner
          amount
          token
          tokenType
          tokenId
          chainHash
          active
          parentNoteId
          createdAt
          createdAtBlock
          updatedAt
        }
      }
    `,
    { id: noteId }
  );

  return result.note;
}

/**
 * Get all notes owned by a specific address
 */
export async function getNotesByOwner(
  executor: GraphQLExecutor,
  ownerAddress: string
): Promise<Note[]> {
  const result = await executeQuery<{ notesByOwner: Note[] }>(
    executor,
    `
      query GetNotesByOwner($ownerAddress: Address!) {
        notesByOwner(ownerAddress: $ownerAddress) {
          id
          owner
          rootOwner
          amount
          token
          tokenType
          tokenId
          chainHash
          active
          parentNoteId
          createdAt
          createdAtBlock
          updatedAt
        }
      }
    `,
    { ownerAddress }
  );

  return result.notesByOwner || [];
}

/**
 * Get all notes deposited by a specific address
 */
export async function getNotesByRoot(
  executor: GraphQLExecutor,
  rootAddress: string
): Promise<Note[]> {
  const result = await executeQuery<{ notesByRoot: Note[] }>(
    executor,
    `
      query GetNotesByRoot($rootAddress: Address!) {
        notesByRoot(rootAddress: $rootAddress) {
          id
          owner
          rootOwner
          amount
          token
          tokenType
          tokenId
          chainHash
          active
          parentNoteId
          createdAt
          createdAtBlock
          updatedAt
        }
      }
    `,
    { rootAddress }
  );

  return result.notesByRoot || [];
}

/**
 * Get the delegation chain for a specific note
 */
export async function getDelegationChain(
  executor: GraphQLExecutor,
  noteId: string
): Promise<DelegationChainLink[]> {
  const result = await executeQuery<{ delegationChain: DelegationChainLink[] }>(
    executor,
    `
      query GetDelegationChain($noteId: ID!) {
        delegationChain(noteId: $noteId) {
          address
          position
          createdAt
        }
      }
    `,
    { noteId }
  );

  return result.delegationChain || [];
}
