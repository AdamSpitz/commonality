import { onchainTable, primaryKey, index } from "ponder";

// ============================================================================
// MUTABLE REFS INDEXER SCHEMA
// ============================================================================
// This subsystem tracks mutable references (pointers to IPFS content).
// Users can create named refs that point to IPFS CIDs or other string values.
// This is useful for tracking "my created statements", bookmarks, drafts, etc.
// ============================================================================

/**
 * MutableRefs - tracks current state of each user's refs
 * One row per (owner, name) pair
 */
export const mutableRefs = onchainTable(
  "mutable_refs",
  (t) => ({
    // Composite key: owner address + ref name
    owner: t.hex().notNull(),
    name: t.text().notNull(),
    // Current ref value (typically an IPFS CID)
    value: t.text().notNull(),
    // When this ref was last updated
    updatedAt: t.bigint().notNull(),
    updatedAtBlock: t.bigint().notNull(),
    // Transaction that last updated this ref
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.owner, table.name] }),
    ownerIdx: index().on(table.owner),
    nameIdx: index().on(table.name),
  })
);

/**
 * RefUpdates - tracks history of all ref updates
 * One row per update event
 */
export const refUpdates = onchainTable("ref_updates", (t) => ({
  // Unique ID: ${owner}:${name}:${blockNumber}:${logIndex}
  id: t.text().primaryKey(),
  owner: t.hex().notNull(),
  name: t.text().notNull(),
  value: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  logIndex: t.integer().notNull(),
}));

/**
 * Relations for mutable refs
 */
export const mutableRefsRelations = {
  // Empty for now - could add relations if needed
};

export const refUpdatesRelations = {
  // Empty for now - could add relations if needed
};
