/**
 * GraphQL queries for Delegation subsystem
 */

import { executeTypedGraphQLQuery } from '../../utils/graphqlClient.js';
import {
  GetNoteDocument,
  GetNotesByOwnerDocument,
  GetNotesByRootDocument,
  GetDelegationChainDocument,
  GetNoteIntentAttestationDocument,
  GetNoteIntentAttestationsByNoteDocument,
  GetNoteIntentAttestationsByStatementDocument,
} from '../../generated/graphql.js';

import {
  type Note,
  type NoteIntentAttestation,
  type DelegationChainLink,
  type DelegationChainLinkWithNote,
  type NoteEvent,
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
  const result = await executeTypedGraphQLQuery(machinery, GetNoteDocument, { id: noteId });
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
  const result = await executeTypedGraphQLQuery(machinery, GetNotesByOwnerDocument, {
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
  const result = await executeTypedGraphQLQuery(machinery, GetNotesByRootDocument, {
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
  const result = await executeTypedGraphQLQuery(machinery, GetDelegationChainDocument, {
    noteId: noteId,
  });
  // BigInt fields (createdAt) come as strings at runtime
  return (result.delegationChainss?.items ?? []) as unknown as DelegationChainLink[];
}

// ============================================================================
// Note Intent Queries
// ============================================================================

/**
 * Get a specific note intent attestation by attester + noteContract + noteId
 */
export async function getNoteIntentAttestation(
  machinery: SDKMachinery,
  attester: string,
  noteContract: string,
  noteId: string
): Promise<NoteIntentAttestation | null> {
  const result = await executeTypedGraphQLQuery(machinery, GetNoteIntentAttestationDocument, {
    attester: attester.toLowerCase(),
    noteContract: noteContract.toLowerCase(),
    noteId: noteId,
  });
  return result.noteIntentAttestations as unknown as NoteIntentAttestation | null;
}

/**
 * Get all note intent attestations for a specific note (across all attesters)
 */
export async function getNoteIntentAttestationsByNote(
  machinery: SDKMachinery,
  noteContract: string,
  noteId: string
): Promise<NoteIntentAttestation[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetNoteIntentAttestationsByNoteDocument, {
    noteContract: noteContract.toLowerCase(),
    noteId: noteId,
  });
  return (result.noteIntentAttestationss?.items ?? []) as unknown as NoteIntentAttestation[];
}

/**
 * Get all note intent attestations for a specific statement
 */
export async function getNoteIntentAttestationsByStatement(
  machinery: SDKMachinery,
  intendedStatementId: string
): Promise<NoteIntentAttestation[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetNoteIntentAttestationsByStatementDocument, {
    intendedStatementId,
  });
  return (result.noteIntentAttestationss?.items ?? []) as unknown as NoteIntentAttestation[];
}

// ============================================================================
// Cross-subsystem: Purchased Note Events (for leaderboard delegation chains)
// ============================================================================

const GET_PURCHASED_NOTE_EVENTS_BY_TX_HASHES = `
  query GetPurchasedNoteEventsByTxHashes($transactionHashes: [String!]!) {
    noteEventss(where: { eventType: "purchased", transactionHash_in: $transactionHashes }) {
      items {
        noteId
        transactionHash
        data
      }
    }
  }
`;

/**
 * Get "purchased" note events for a given set of transaction hashes.
 * Used to identify which contributions were made via delegatable notes.
 */
export async function getPurchasedNoteEventsByTxHashes(
  machinery: SDKMachinery,
  transactionHashes: string[]
): Promise<NoteEvent[]> {
  if (transactionHashes.length === 0) return [];
  type Result = { noteEventss?: { items: NoteEvent[] } };
  const result = await executeTypedGraphQLQuery<Result>(
    machinery,
    GET_PURCHASED_NOTE_EVENTS_BY_TX_HASHES,
    { transactionHashes }
  );
  return result.noteEventss?.items ?? [];
}

const GET_DELEGATION_CHAINS_FOR_NOTES = `
  query GetDelegationChainsForNotes($noteIds: [BigInt!]!) {
    delegationChainss(
      where: { noteId_in: $noteIds }
      orderBy: "position"
      orderDirection: "asc"
    ) {
      items {
        noteId
        address
        position
        createdAt
      }
    }
  }
`;

/**
 * Batch-fetch delegation chains for multiple note IDs.
 * Returns chain links with noteId included for grouping.
 */
export async function getDelegationChainsForNotes(
  machinery: SDKMachinery,
  noteIds: string[]
): Promise<DelegationChainLinkWithNote[]> {
  if (noteIds.length === 0) return [];
  type Result = { delegationChainss?: { items: DelegationChainLinkWithNote[] } };
  const result = await executeTypedGraphQLQuery<Result>(
    machinery,
    GET_DELEGATION_CHAINS_FOR_NOTES,
    { noteIds }
  );
  return result.delegationChainss?.items ?? [];
}
