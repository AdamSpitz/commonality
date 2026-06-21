import { keccak256, encodePacked } from 'viem';
import type { Note, NoteIntentAttestation, DelegationChainLink } from './types.js';
import type {
  NoteCreatedEvent,
  NoteDelegatedEvent,
  ChainSplitEvent,
  NoteRevokedEvent,
  FundsReclaimedEvent,
  NoteConsumedEvent,
  ERC1155PurchasedEvent,
  RefundedIntoNoteEvent,
  NoteIntentAttestedEvent,
} from './events.js';

// Discriminated union of all delegation events for foldDelegationState.
// Caller is responsible for passing all events in block/logIndex order.
export type DelegationEvent =
  | { type: 'noteCreated'; event: NoteCreatedEvent }
  | { type: 'noteDelegated'; event: NoteDelegatedEvent }
  | { type: 'chainSplit'; event: ChainSplitEvent }
  | { type: 'noteRevoked'; event: NoteRevokedEvent }
  | { type: 'fundsReclaimed'; event: FundsReclaimedEvent }
  | { type: 'noteConsumed'; event: NoteConsumedEvent }
  | { type: 'erc1155Purchased'; event: ERC1155PurchasedEvent }
  | { type: 'refundedIntoNote'; event: RefundedIntoNoteEvent };

// Mutable state for a note during fold processing.
// Inactive notes are kept in the map so their chains can be referenced
// by subsequent ERC1155Purchased events.
// Exported so callers can hold onto the full stateMap for resumable folding.
export interface NoteState {
  id: string;
  contractAddress: `0x${string}`;
  amount: bigint;
  token: `0x${string}`;
  tokenType: number;
  tokenId: bigint;
  active: boolean;
  parentNoteId?: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
  chain: DelegationChainLink[]; // position 0 = root, highest position = leaf
}

/**
 * Compute chainHash from a delegation chain.
 *
 * Matches the contract's _computeChainHash / _verifyAndComputeChainHash:
 *   hash = bytes32(0)
 *   for each link from chain[0] (root) to chain[n] (leaf):
 *     hash = keccak256(abi.encodePacked(link.address, hash))
 */
function computeChainHash(chain: DelegationChainLink[]): `0x${string}` {
  let hash: `0x${string}` = `0x${'00'.repeat(32)}`;
  for (const link of chain) {
    hash = keccak256(encodePacked(['address', 'bytes32'], [link.address as `0x${string}`, hash]));
  }
  return hash;
}

function contractScopedId(contractAddress: `0x${string}`, id: bigint | string): string {
  return `${contractAddress.toLowerCase()}:${id.toString()}`;
}

function lookupByScopedOrBareId<T>(map: Map<string, T>, noteId: string): T | undefined {
  const direct = map.get(noteId);
  if (direct) return direct;

  let match: T | undefined;
  for (const [key, value] of map) {
    if (key.endsWith(`:${noteId}`)) {
      if (match) return undefined;
      match = value;
    }
  }
  return match;
}

// Convert internal NoteState to the public Note type.
function toNote(state: NoteState): Note {
  const chain = state.chain;
  const owner = chain.length > 0 ? chain[chain.length - 1].address : '';
  const rootOwner = chain.length > 0 ? chain[0].address : '';
  return {
    id: state.id,
    contractAddress: state.contractAddress,
    chainHash: computeChainHash(chain),
    amount: state.amount.toString(),
    token: state.token,
    tokenType: state.tokenType,
    tokenId: state.tokenId.toString(),
    owner,
    rootOwner,
    active: state.active,
    parentNoteId: state.parentNoteId,
    createdAt: state.createdAt,
    createdAtBlock: state.createdAtBlock,
    updatedAt: state.updatedAt,
  };
}

/**
 * Fold all delegation events → complete note state.
 *
 * Maintains a Map<noteId, NoteState> internally, processing events in order.
 * Inactive notes (consumed, reclaimed) are retained in the output map so their
 * chains remain accessible for ERC1155Purchased output-note reconstruction.
 *
 * Events must arrive in block/logIndex order.
 * Caller is responsible for passing all relevant events.
 *
 * Revocation semantics mirror the contract's revoke(): when a chain member
 * revokes, the chain is truncated to [chain[0]...chain[revoker]] where rPos
 * is the revoker's position in root-first ordering. The revoker becomes the
 * new leaf (spending authority), and any delegates beyond them are removed.
 *
 * Pass `initialStateMap` (from a previous call's `stateMap` output) to resume
 * folding from a saved cursor. The full stateMap must be preserved (not just a
 * single note's state) because ERC1155Purchased events can copy chains across notes.
 */
export function foldDelegationState(
  events: DelegationEvent[],
  initialStateMap?: Map<string, NoteState>,
): {
  notes: Map<string, Note>;
  chains: Map<string, DelegationChainLink[]>;
  stateMap: Map<string, NoteState>;
} {
  // Deep-clone initial state so mutations during folding don't affect the caller's copy.
  const stateMap = new Map<string, NoteState>(
    initialStateMap
      ? [...initialStateMap.entries()].map(([id, s]) => [id, { ...s, chain: s.chain.map(l => ({ ...l })) }])
      : [],
  );

  for (const ev of events) {
    switch (ev.type) {
      case 'noteCreated': {
        const { noteId, owner, amount, token, tokenType, tokenId, blockTimestamp, blockNumber } =
          ev.event;
        const id = noteId.toString();
        const key = contractScopedId(ev.event.contractAddress, noteId);
        stateMap.set(key, {
          id,
          contractAddress: ev.event.contractAddress,
          amount,
          token,
          tokenType,
          tokenId,
          active: true,
          createdAt: blockTimestamp.toString(),
          createdAtBlock: blockNumber.toString(),
          updatedAt: blockTimestamp.toString(),
          chain: [{ address: owner, position: 0, createdAt: blockTimestamp.toString() }],
        });
        break;
      }

      case 'chainSplit': {
        // Partial delegation: create splitLeaf as a copy of originalLeaf with splitAmount.
        // The original (remainderLeaf) keeps its chain but has its amount reduced.
        // NoteDelegated will extend the splitLeaf's chain afterward.
        const { originalLeafId, splitLeafId, splitAmount, blockTimestamp } = ev.event;
        const originalId = contractScopedId(ev.event.contractAddress, originalLeafId);
        const splitId = contractScopedId(ev.event.contractAddress, splitLeafId);
        const original = stateMap.get(originalId);
        if (original) {
          stateMap.set(splitId, {
            ...original,
            id: splitLeafId.toString(),
            amount: splitAmount,
            updatedAt: blockTimestamp.toString(),
            chain: original.chain.map((link) => ({ ...link })), // deep copy
          });
          original.amount -= splitAmount;
          original.updatedAt = blockTimestamp.toString();
        }
        break;
      }

      case 'noteDelegated': {
        const { parentNoteId, childNoteId, delegate, blockTimestamp } = ev.event;
        const isFull = parentNoteId === childNoteId;
        const childId = contractScopedId(ev.event.contractAddress, childNoteId);
        const parentNoteIdForDisplay = parentNoteId.toString();

        if (isFull) {
          // Full delegation: the note itself gets the delegate appended to its chain.
          const note = stateMap.get(childId);
          if (note) {
            note.chain.push({
              address: delegate,
              position: note.chain.length,
              createdAt: blockTimestamp.toString(),
            });
            note.updatedAt = blockTimestamp.toString();
          }
        } else {
          // Partial delegation: ChainSplit already created the split note with the
          // original chain. Now extend it with the delegate and record the parent.
          const child = stateMap.get(childId);
          if (child) {
            child.chain.push({
              address: delegate,
              position: child.chain.length,
              createdAt: blockTimestamp.toString(),
            });
            child.parentNoteId = parentNoteIdForDisplay;
            child.updatedAt = blockTimestamp.toString();
          }
        }
        break;
      }

      case 'noteRevoked': {
        const { noteId, revoker, blockTimestamp } = ev.event;
        const id = contractScopedId(ev.event.contractAddress, noteId);
        const note = stateMap.get(id);
        if (note) {
          const rPos = note.chain.findIndex(
            (link) => link.address.toLowerCase() === revoker.toLowerCase(),
          );
          if (rPos >= 0) {
            // The contract's revoke() builds a new hash from owners[owners.length-newChainLength..end]
            // where owners is leaf-first and newChainLength = callerIndex+1.
            // This reverses the sub-chain: e.g. root-revoking [alice,bob] → [bob,alice].
            // In root-first terms: keep the revoker's sub-chain reversed.
            // Specifically, the new chain contains chain[0..len-1-rPos] reversed.
            const len = note.chain.length;
            const newChain: DelegationChainLink[] = [];
            for (let offset = 0; offset <= len - 1 - rPos; offset++) {
              newChain.push({
                address: note.chain[len - 1 - rPos - offset].address,
                position: offset,
                createdAt: blockTimestamp.toString(),
              });
            }
            note.chain = newChain;
            note.updatedAt = blockTimestamp.toString();
          }
        }
        break;
      }

      case 'fundsReclaimed': {
        const { noteId, blockTimestamp } = ev.event;
        const id = contractScopedId(ev.event.contractAddress, noteId);
        const note = stateMap.get(id);
        if (note) {
          note.active = false;
          note.amount = 0n;
          note.updatedAt = blockTimestamp.toString();
        }
        break;
      }

      case 'noteConsumed': {
        const { noteId, remainingAmount, deleted, blockTimestamp } = ev.event;
        const id = contractScopedId(ev.event.contractAddress, noteId);
        const note = stateMap.get(id);
        if (note) {
          note.amount = remainingAmount;
          if (deleted) note.active = false;
          note.updatedAt = blockTimestamp.toString();
        }
        break;
      }

      case 'erc1155Purchased': {
        // Output notes were already created via NoteCreated events with a
        // single-link chain (leaf owner only). Copy the full delegation chain
        // from each input note so output notes preserve the chain structure.
        //
        // Output note ordering: for each tokenId t and each input note (chain) c,
        // outputNoteIds[t * numInputNotes + c] corresponds to inputNoteIds[c].
        const { inputNoteIds, outputNoteIds, tokenIds, blockTimestamp } = ev.event;
        const numChains = inputNoteIds.length;
        const numTokens = tokenIds.length;

        for (let t = 0; t < numTokens; t++) {
          for (let c = 0; c < numChains; c++) {
            const outputIdx = t * numChains + c;
            if (outputIdx >= outputNoteIds.length) break;

            const outputId = contractScopedId(ev.event.contractAddress, outputNoteIds[outputIdx]);
            const inputId = contractScopedId(ev.event.contractAddress, inputNoteIds[c]);
            const inputState = stateMap.get(inputId);
            const outputState = stateMap.get(outputId);

            if (inputState && outputState && inputState.chain.length > 1) {
              // Replace the single-link chain with the full input chain.
              outputState.chain = inputState.chain.map((link, i) => ({
                ...link,
                position: i,
                createdAt: blockTimestamp.toString(),
              }));
              outputState.updatedAt = blockTimestamp.toString();
            }
          }
        }
        break;
      }

      case 'refundedIntoNote': {
        // Mirror of erc1155Purchased: the new settlement-token note was created via a
        // NoteCreated event carrying only its leaf. Copy the full delegation chain from
        // the consumed receipt note (input) so revocability is preserved across the
        // refund. The input note is inactive by now but its chain is retained in the map.
        const { inputNoteId, outputNoteId, blockTimestamp } = ev.event;
        const inputState = stateMap.get(contractScopedId(ev.event.contractAddress, inputNoteId));
        const outputState = stateMap.get(contractScopedId(ev.event.contractAddress, outputNoteId));
        if (inputState && outputState && inputState.chain.length > 1) {
          outputState.chain = inputState.chain.map((link, i) => ({
            ...link,
            position: i,
            createdAt: blockTimestamp.toString(),
          }));
          outputState.updatedAt = blockTimestamp.toString();
        }
        break;
      }
    }
  }

  const notes = new Map<string, Note>();
  const chains = new Map<string, DelegationChainLink[]>();

  const bareIdCounts = new Map<string, number>();
  for (const state of stateMap.values()) {
    bareIdCounts.set(state.id, (bareIdCounts.get(state.id) ?? 0) + 1);
  }

  for (const [scopedId, state] of stateMap) {
    const note = toNote(state);
    const chain = state.chain.map((link) => ({ ...link }));
    notes.set(scopedId, note);
    chains.set(scopedId, chain);

    // Backwards-compatible lookup for the common single-contract case. When
    // multiple contract versions emit the same numeric id, callers must use the
    // scoped map key (<contractAddress>:<id>) to avoid collisions.
    if (bareIdCounts.get(state.id) === 1) {
      notes.set(state.id, note);
      chains.set(state.id, chain.map((link) => ({ ...link })));
    }
  }

  return { notes, chains, stateMap };
}

/**
 * Fold all delegation events → state for a single note.
 *
 * Convenience wrapper around foldDelegationState. Processes all events to
 * build global state, then extracts the requested note and its chain.
 * Returns null if the noteId is not found.
 *
 * Events must arrive in block/logIndex order.
 * Caller must pass all relevant events, including ChainSplit and NoteDelegated
 * events that reference this noteId as a parent.
 *
 * The returned `stateMap` contains the full delegation state for all notes.
 * Pass it as `initialStateMap` to a subsequent `foldDelegationState` call to
 * resume folding incrementally — the full map is needed (not just this note)
 * because ERC1155Purchased events can copy chains from other notes.
 *
 * Pass `initialStateMap` (from a previous call) to resume from a cursor.
 */
export function uniqueNotes(notes: Iterable<Note>): Note[] {
  return [...new Set(notes)];
}

export function foldNote(
  noteId: string,
  events: DelegationEvent[],
  initialStateMap?: Map<string, NoteState>,
): {
  note: Note;
  chain: DelegationChainLink[];
  stateMap: Map<string, NoteState>;
} | null {
  const { notes, chains, stateMap } = foldDelegationState(events, initialStateMap);
  const note = lookupByScopedOrBareId(notes, noteId);
  const chain = lookupByScopedOrBareId(chains, noteId);
  if (!note || !chain) return null;
  return { note, chain, stateMap };
}

/**
 * Fold NoteIntentAttested events → attestation records.
 *
 * Each event produces one NoteIntentAttestation. Re-attestation (same
 * attester + noteContract + noteId) updates intendedStatementId (last-write-wins).
 *
 * Caller is responsible for filtering events to the relevant scope.
 * Events must arrive in block/logIndex order.
 */
export function foldNoteIntentAttestations(
  events: NoteIntentAttestedEvent[],
): NoteIntentAttestation[] {
  const map = new Map<string, NoteIntentAttestation>();

  for (const event of events) {
    const key = `${event.attester.toLowerCase()}:${event.noteContract.toLowerCase()}:${event.noteId.toString()}`;
    map.set(key, {
      attester: event.attester,
      noteContract: event.noteContract,
      noteId: event.noteId.toString(),
      intendedStatementId: event.intendedStatementId,
      createdAt: event.blockTimestamp.toString(),
      blockNumber: event.blockNumber.toString(),
    });
  }

  return [...map.values()];
}
