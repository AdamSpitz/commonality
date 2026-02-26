import { onchainTable, primaryKey, relations, index } from "ponder";

// ============================================================================
// DELEGATION INDEXER SCHEMA
// ============================================================================
// This subsystem tracks delegatable notes and delegation chains.
// It is logically independent and has no dependencies on other subsystems.
// The Delegation indexer tracks:
// - Active notes (deposits of tokens)
// - Full delegation chains for each note
// - Revocations and splits
// - Note metadata (intended statement alignment, token details)
// ============================================================================

/**
 * Notes - tracks active delegatable notes
 * Created when NoteCreated event is emitted
 * Updated when notes are delegated, split, or consumed
 */
export const delegatableNotes = onchainTable("delegation_notes", (t) => ({
  // Note ID (from contract)
  id: t.bigint().primaryKey(),
  // Current owner (leaf of delegation chain)
  owner: t.hex().notNull(),
  // Root owner (original depositor)
  rootOwner: t.hex().notNull(),
  // Token details
  token: t.hex().notNull(), // address(0) for ETH
  tokenType: t.integer().notNull(), // 0 = ERC20/ETH, 1 = ERC1155
  tokenId: t.bigint().notNull().default(0n), // Only relevant for ERC1155
  // Amount in the note
  amount: t.bigint().notNull(),
  // Chain hash (commitment to delegation chain)
  chainHash: t.hex().notNull(),
  // Status tracking
  active: t.boolean().notNull().default(true),
  // Parent note (if this was created via split/delegation)
  parentNoteId: t.bigint(),
  // Timestamps
  createdAt: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  updatedAt: t.bigint().notNull(),
}), (table) => ({
  // Index for finding notes by current owner
  ownerIdx: index().on(table.owner, table.active),
  // Index for finding notes by root owner
  rootOwnerIdx: index().on(table.rootOwner, table.active),
  // Index for finding notes by token
  tokenIdx: index().on(table.token, table.tokenType, table.active),
}));

/**
 * Delegation chains - tracks the full delegation chain for each note
 * Each row represents one position in a chain
 * For a note delegated Alice -> Bob -> Charlie:
 *   - (noteId, 0, Alice)   [root]
 *   - (noteId, 1, Bob)
 *   - (noteId, 2, Charlie) [leaf]
 */
export const delegationChains = onchainTable(
  "delegation_chains",
  (t) => ({
    // Composite key: note + position
    noteId: t.bigint().notNull(),
    position: t.integer().notNull(), // 0 = root, higher = closer to leaf
    // Address at this position
    address: t.hex().notNull(),
    // When this chain entry was created
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.noteId, table.position] }),
    // Index for finding all notes in a chain for a given address
    addressIdx: index().on(table.address),
    // Index for efficient chain reconstruction
    notePositionIdx: index().on(table.noteId, table.position),
  })
);

/**
 * Note events - tracks the full history of note operations
 * Useful for auditing and understanding note lifecycle
 */
export const noteEvents = onchainTable(
  "delegation_note_events",
  (t) => ({
    // Unique ID (transaction hash + log index)
    id: t.text().primaryKey(),
    // Event type: created, delegated, revoked, reclaimed, split, purchased
    eventType: t.text().notNull(),
    // Note ID this event relates to
    noteId: t.bigint().notNull(),
    // Actor (who triggered the event)
    actor: t.hex().notNull(),
    // Parent note (for delegation/split events)
    parentNoteId: t.bigint(),
    // Child note (for delegation/split events)
    childNoteId: t.bigint(),
    // Amount involved
    amount: t.bigint(),
    // Additional data (JSON, for purchase details etc.)
    data: t.text(),
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    // Index for finding events by note
    noteIdx: index().on(table.noteId),
    // Index for finding events by actor
    actorIdx: index().on(table.actor),
    // Index for time-based queries
    timeIdx: index().on(table.createdAt),
  })
);

/**
 * Note intent attestations - tracks which statement a note is intended for
 * Created when NoteIntentAttested event is emitted from the NoteIntent contract.
 * Re-attestation updates the intendedStatementId (upsert behavior).
 */
export const noteIntentAttestations = onchainTable(
  "delegation_note_intent_attestations",
  (t) => ({
    // Composite key: attester + noteContract + noteId
    attester: t.hex().notNull(),
    noteContract: t.hex().notNull(),
    noteId: t.bigint().notNull(),
    // IPFS CIDv1 of the intended statement
    intendedStatementId: t.text().notNull(),
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.attester, table.noteContract, table.noteId] }),
    // Index for finding all intents for a specific note
    noteIdx: index().on(table.noteContract, table.noteId),
    // Index for finding all notes intended for a specific statement
    statementIdx: index().on(table.intendedStatementId),
    // Index for finding all attestations by an attester
    attesterIdx: index().on(table.attester),
  })
);

// Delegation Relations

export const delegatableNotesRelations = relations(delegatableNotes, ({ many, one }) => ({
  chainEntries: many(delegationChains),
  events: many(noteEvents),
  parentNote: one(delegatableNotes, {
    fields: [delegatableNotes.parentNoteId],
    references: [delegatableNotes.id],
  }),
}));

export const delegationChainsRelations = relations(delegationChains, ({ one }) => ({
  note: one(delegatableNotes, {
    fields: [delegationChains.noteId],
    references: [delegatableNotes.id],
  }),
}));

export const noteEventsRelations = relations(noteEvents, ({ one }) => ({
  note: one(delegatableNotes, {
    fields: [noteEvents.noteId],
    references: [delegatableNotes.id],
  }),
}));

export const noteIntentAttestationsRelations = relations(noteIntentAttestations, ({}) => ({}));
