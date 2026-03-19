/**
 * Delegation queries — event cache + folds (no GraphQL)
 */

import {
  type Note,
  type NoteIntentAttestation,
  type DelegationChainLink,
  type DelegationChainLinkWithNote,
  type NoteEvent,
} from './types.js';
import type { NoteIntentAttestedEvent } from './events.js';
import { SDKMachinery } from '../../machinery.js';
import { fetchAllDelegationEvents, fetchNoteIntentEvents, fetchAllNoteIntentEvents } from '../../utils/eventCacheClient.js';
import {
  decodeNoteCreatedEvent,
  decodeNoteDelegatedEvent,
  decodeChainSplitEvent,
  decodeNoteRevokedEvent,
  decodeFundsReclaimedEvent,
  decodeNoteConsumedEvent,
  decodeERC1155PurchasedEvent,
  decodeNoteIntentAttestedEvent,
} from '../../utils/eventDecoder.js';
import { foldDelegationState, foldNote, foldNoteIntentAttestations, type DelegationEvent } from './folds.js';

function decodeDelegationEvents(rawEvents: Awaited<ReturnType<typeof fetchAllDelegationEvents>>): DelegationEvent[] {
  const events: DelegationEvent[] = [];
  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'NoteCreated': {
        const d = decodeNoteCreatedEvent(raw);
        if (d) events.push({ type: 'noteCreated', event: d });
        break;
      }
      case 'NoteDelegated': {
        const d = decodeNoteDelegatedEvent(raw);
        if (d) events.push({ type: 'noteDelegated', event: d });
        break;
      }
      case 'ChainSplit': {
        const d = decodeChainSplitEvent(raw);
        if (d) events.push({ type: 'chainSplit', event: d });
        break;
      }
      case 'NoteRevoked': {
        const d = decodeNoteRevokedEvent(raw);
        if (d) events.push({ type: 'noteRevoked', event: d });
        break;
      }
      case 'FundsReclaimed': {
        const d = decodeFundsReclaimedEvent(raw);
        if (d) events.push({ type: 'fundsReclaimed', event: d });
        break;
      }
      case 'NoteConsumed': {
        const d = decodeNoteConsumedEvent(raw);
        if (d) events.push({ type: 'noteConsumed', event: d });
        break;
      }
      case 'ERC1155Purchased': {
        const d = decodeERC1155PurchasedEvent(raw);
        if (d) events.push({ type: 'erc1155Purchased', event: d });
        break;
      }
    }
  }
  return events.sort((a, b) => {
    const bn = Number(a.event.blockNumber - b.event.blockNumber);
    return bn !== 0 ? bn : a.event.logIndex - b.event.logIndex;
  });
}

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
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const result = foldNote(noteId, events);
  return result?.note ?? null;
}

/**
 * Get all notes owned by a specific address (as leaf owner)
 */
export async function getNotesByOwner(
  machinery: SDKMachinery,
  ownerAddress: string
): Promise<Note[]> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const { notes } = foldDelegationState(events);

  const ownerLower = ownerAddress.toLowerCase();
  return [...notes.values()].filter(
    n => n.active && n.owner.toLowerCase() === ownerLower
  );
}

/**
 * Get all notes deposited by a specific address (as root)
 */
export async function getNotesByRoot(
  machinery: SDKMachinery,
  rootAddress: string
): Promise<Note[]> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const { notes } = foldDelegationState(events);

  const rootLower = rootAddress.toLowerCase();
  return [...notes.values()].filter(
    n => n.rootOwner.toLowerCase() === rootLower
  );
}

/**
 * Get the full delegation chain for a note
 */
export async function getDelegationChain(
  machinery: SDKMachinery,
  noteId: string
): Promise<DelegationChainLink[]> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const result = foldNote(noteId, events);
  return result?.chain ?? [];
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
  const rawEvents = await fetchNoteIntentEvents(machinery, noteContract);
  const events: NoteIntentAttestedEvent[] = [];
  for (const raw of rawEvents) {
    const d = decodeNoteIntentAttestedEvent(raw);
    if (d && d.noteId.toString() === noteId && d.attester.toLowerCase() === attester.toLowerCase()) {
      events.push(d);
    }
  }
  if (events.length === 0) return null;
  events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
  const attestations = foldNoteIntentAttestations(events);
  return attestations[0] ?? null;
}

/**
 * Get all note intent attestations for a specific note (across all attesters)
 */
export async function getNoteIntentAttestationsByNote(
  machinery: SDKMachinery,
  noteContract: string,
  noteId: string
): Promise<NoteIntentAttestation[]> {
  const rawEvents = await fetchNoteIntentEvents(machinery, noteContract);
  const events: NoteIntentAttestedEvent[] = [];
  for (const raw of rawEvents) {
    const d = decodeNoteIntentAttestedEvent(raw);
    if (d && d.noteId.toString() === noteId) {
      events.push(d);
    }
  }
  events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
  return foldNoteIntentAttestations(events);
}

/**
 * Get all note intent attestations for a specific statement
 */
export async function getNoteIntentAttestationsByStatement(
  machinery: SDKMachinery,
  intendedStatementId: string
): Promise<NoteIntentAttestation[]> {
  // intendedStatementId is non-indexed, so we fetch all and filter client-side
  const rawEvents = await fetchAllNoteIntentEvents(machinery);
  const events: NoteIntentAttestedEvent[] = [];
  for (const raw of rawEvents) {
    const d = decodeNoteIntentAttestedEvent(raw);
    if (d && d.intendedStatementId === intendedStatementId) {
      events.push(d);
    }
  }
  events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
  return foldNoteIntentAttestations(events);
}

// ============================================================================
// Cross-subsystem: Purchased Note Events (for leaderboard delegation chains)
// ============================================================================

/**
 * Get "purchased" note events for a given set of transaction hashes.
 * Used to identify which contributions were made via delegatable notes.
 */
export async function getPurchasedNoteEventsByTxHashes(
  machinery: SDKMachinery,
  transactionHashes: string[]
): Promise<NoteEvent[]> {
  if (transactionHashes.length === 0) return [];

  const rawEvents = await fetchAllDelegationEvents(machinery);
  const txHashSet = new Set(transactionHashes.map(h => h.toLowerCase()));

  const noteEvents: NoteEvent[] = [];
  for (const raw of rawEvents) {
    if (raw.eventName !== 'ERC1155Purchased') continue;
    if (!txHashSet.has(raw.transactionHash.toLowerCase())) continue;

    const d = decodeERC1155PurchasedEvent(raw);
    if (!d) continue;

    // Each input note gets a NoteEvent record
    for (const inputNoteId of d.inputNoteIds) {
      noteEvents.push({
        noteId: inputNoteId.toString(),
        transactionHash: d.transactionHash,
        data: JSON.stringify({
          inputNoteIds: d.inputNoteIds.map(id => id.toString()),
          outputNoteIds: d.outputNoteIds.map(id => id.toString()),
          erc1155Contract: d.erc1155Contract,
          tokenIds: d.tokenIds.map(id => id.toString()),
          counts: d.counts.map(c => c.toString()),
          totalCost: d.totalCost.toString(),
        }),
      });
    }
  }
  return noteEvents;
}

/**
 * Batch-fetch delegation chains for multiple note IDs.
 * Returns chain links with noteId included for grouping.
 */
export async function getDelegationChainsForNotes(
  machinery: SDKMachinery,
  noteIds: string[]
): Promise<DelegationChainLinkWithNote[]> {
  if (noteIds.length === 0) return [];

  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const { chains } = foldDelegationState(events);

  const noteIdSet = new Set(noteIds);
  const result: DelegationChainLinkWithNote[] = [];

  for (const [noteId, chain] of chains) {
    if (!noteIdSet.has(noteId)) continue;
    for (const link of chain) {
      result.push({ ...link, noteId });
    }
  }

  // Sort by noteId then position for consistent ordering
  result.sort((a, b) => {
    const nCmp = a.noteId.localeCompare(b.noteId);
    return nCmp !== 0 ? nCmp : a.position - b.position;
  });

  return result;
}
