/**
 * GraphQL queries for Delegation subsystem
 */

import { query, type GraphQLClient } from './common.js';

// ============================================================================
// Delegation Queries
// ============================================================================

export interface Note {
  id: string;
  chainHash: string;
  amount: string;
  token: string;
  tokenType: number; // 0 = ERC20, 1 = ERC1155
  tokenId: string;
  intendedStatementId: string;
  owner: string; // Current leaf owner
  rootOwner: string; // Root depositor
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
  client: GraphQLClient,
  noteId: string
): Promise<Note | null> {
  const result = await query<{ delegatableNotes: Note | null }>(
    client,
    `
      query GetNote($id: BigInt!) {
        delegatableNotes(id: $id) {
          id
          chainHash
          amount
          token
          tokenType
          tokenId
          intendedStatementId
          owner
          rootOwner
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

  return result.delegatableNotes;
}

/**
 * Get all notes owned by a specific address (as leaf owner)
 */
export async function getNotesByOwner(
  client: GraphQLClient,
  ownerAddress: string
): Promise<Note[]> {
  const result = await query<{ delegatableNotess: { items: Note[] } }>(
    client,
    `
      query GetNotesByOwner($owner: String!) {
        delegatableNotess(where: { owner: $owner, active: true }) {
          items {
            id
            chainHash
            amount
            token
            tokenType
            tokenId
            intendedStatementId
            owner
            rootOwner
            active
            parentNoteId
            createdAt
            createdAtBlock
            updatedAt
          }
        }
      }
    `,
    { owner: ownerAddress.toLowerCase() }
  );

  return result.delegatableNotess?.items || [];
}

/**
 * Get all notes deposited by a specific address (as root)
 */
export async function getNotesByRoot(
  client: GraphQLClient,
  rootAddress: string
): Promise<Note[]> {
  const result = await query<{ delegatableNotess: { items: Note[] } }>(
    client,
    `
      query GetNotesByRoot($rootOwner: String!) {
        delegatableNotess(where: { rootOwner: $rootOwner, active: true }) {
          items {
            id
            chainHash
            amount
            token
            tokenType
            tokenId
            intendedStatementId
            owner
            rootOwner
            active
            parentNoteId
            createdAt
            createdAtBlock
            updatedAt
          }
        }
      }
    `,
    { rootOwner: rootAddress.toLowerCase() }
  );

  return result.delegatableNotess?.items || [];
}

/**
 * Get the full delegation chain for a note
 */
export async function getDelegationChain(
  client: GraphQLClient,
  noteId: string
): Promise<DelegationChainLink[]> {
  const result = await query<{ delegationChainss: { items: DelegationChainLink[] } }>(
    client,
    `
      query GetDelegationChain($noteId: BigInt!) {
        delegationChainss(where: { noteId: $noteId }, orderBy: "position", orderDirection: "asc") {
          items {
            address
            position
            createdAt
          }
        }
      }
    `,
    { noteId }
  );

  return result.delegationChainss?.items || [];
}

/**
 * Get all notes intended for a specific statement
 */
export async function getNotesByStatement(
  client: GraphQLClient,
  statementId: string
): Promise<Note[]> {
  const result = await query<{ delegatableNotess: { items: Note[] } }>(
    client,
    `
      query GetNotesByStatement($statementId: String!) {
        delegatableNotess(where: { intendedStatementId: $statementId, active: true }) {
          items {
            id
            chainHash
            amount
            token
            tokenType
            tokenId
            intendedStatementId
            owner
            rootOwner
            active
            parentNoteId
            createdAt
            updatedAt
          }
        }
      }
    `,
    { statementId: statementId.toLowerCase() }
  );

  return result.delegatableNotess?.items || [];
}
