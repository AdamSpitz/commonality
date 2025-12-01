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
  intendedStatementId: string;
  chainHash: string;
  active: boolean;
  parentNoteId?: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
}

export interface DelegationChainLink {
  delegator: string;
  delegatee: string;
  noteId: string;
  timestamp: string;
  blockNumber: string;
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
          intendedStatementId
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
          intendedStatementId
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
          intendedStatementId
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
 * Get the full delegation chain between two addresses
 */
export async function getDelegationChain(
  executor: GraphQLExecutor,
  fromAddress: string,
  toAddress: string
): Promise<DelegationChainLink[]> {
  const result = await executeQuery<{ delegationChain: DelegationChainLink[] }>(
    executor,
    `
      query GetDelegationChain($fromAddress: Address!, $toAddress: Address!) {
        delegationChain(fromAddress: $fromAddress, toAddress: $toAddress) {
          delegator
          delegatee
          noteId
          timestamp
          blockNumber
        }
      }
    `,
    { fromAddress, toAddress }
  );

  return result.delegationChain || [];
}

/**
 * Get all notes intended for a specific statement
 */
export async function getNotesByStatement(
  executor: GraphQLExecutor,
  statementId: string
): Promise<Note[]> {
  const result = await executeQuery<{ notesByStatement: Note[] }>(
    executor,
    `
      query GetNotesByStatement($statementId: ID!) {
        notesByStatement(statementId: $statementId) {
          id
          owner
          amount
          intendedStatementId
          active
          createdAt
          blockNumber
        }
      }
    `,
    { statementId }
  );

  return result.notesByStatement || [];
}
