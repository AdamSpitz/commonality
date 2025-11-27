import { onchainTable, primaryKey, relations, index } from "ponder";

// ============================================================================
// CONCEPT SPACE INDEXER SCHEMA
// ============================================================================
// This subsystem tracks statements, beliefs, and implication relationships.
// It is logically independent and has no dependencies on other subsystems.
// Cross-subsystem queries are handled via GraphQL federation.
// ============================================================================

// Belief states (matching Solidity constants)
// 0 = NO_OPINION, 1 = BELIEVES, 2 = DISBELIEVES

/**
 * Statements - cached IPFS content for statements
 * Statements are created when we first see them referenced in events
 */
export const statements = onchainTable("statements", (t) => ({
  // IPFS CID as bytes32 (hex string)
  id: t.hex().primaryKey(),
  // Full IPFS CID string (for fetching)
  cid: t.text(),
  // Cached content from IPFS (JSON string)
  content: t.text(),
  // Parsed fields for querying
  statementType: t.text(),
  title: t.text(),
  // Content excerpt for search/display
  excerpt: t.text(),
  // Counts for quick lookups
  believerCount: t.integer().notNull().default(0),
  disbelieverCount: t.integer().notNull().default(0),
  // First seen timestamp
  createdAt: t.bigint().notNull(),
  // Whether content was successfully fetched from IPFS
  contentFetched: t.boolean().notNull().default(false),
}));

/**
 * Beliefs - tracks user beliefs about statements
 * Updated on each DirectSupport event
 */
export const beliefs = onchainTable(
  "beliefs",
  (t) => ({
    // Composite key: user + statement
    user: t.hex().notNull(),
    statementId: t.hex().notNull(),
    // Belief state: 0=noOpinion, 1=believes, 2=disbelieves
    beliefState: t.integer().notNull(),
    // Last updated
    updatedAt: t.bigint().notNull(),
    // Block number of last update
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.user, table.statementId] }),
    // Index for finding all believers of a statement
    statementIdx: index().on(table.statementId, table.beliefState),
    // Index for finding all statements a user believes
    userIdx: index().on(table.user, table.beliefState),
    // Composite index for trending queries (statements gaining believers over time)
    trendingIdx: index().on(table.statementId, table.beliefState, table.updatedAt),
  })
);

/**
 * Implications - tracks "S1 implies S2" attestations
 * These are NOT transitive
 */
export const implications = onchainTable(
  "implications",
  (t) => ({
    // Composite key: attester + from + to
    attester: t.hex().notNull(),
    fromStatementId: t.hex().notNull(),
    toStatementId: t.hex().notNull(),
    // When attested
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.attester, table.fromStatementId, table.toStatementId],
    }),
    // Reverse lookup: find all statements that imply a given statement (by attester)
    // This is the key index for computing indirect support
    reverseIdx: index().on(table.toStatementId, table.attester),
    // Forward lookup: find all statements implied by a given statement
    forwardIdx: index().on(table.fromStatementId, table.attester),
    // Find all attestations by an attester
    attesterIdx: index().on(table.attester),
  })
);

/**
 * Users - tracks users who have interacted with the system
 */
export const users = onchainTable("users", (t) => ({
  // User address
  id: t.hex().primaryKey(),
  // Count of statements user believes
  beliefCount: t.integer().notNull().default(0),
  // Count of statements user disbelieves
  disbeliefCount: t.integer().notNull().default(0),
  // First interaction timestamp
  createdAt: t.bigint().notNull(),
}));

/**
 * Attesters - tracks addresses that have published implications
 */
export const attesters = onchainTable("attesters", (t) => ({
  // Attester address
  id: t.hex().primaryKey(),
  // Count of implications published
  implicationCount: t.integer().notNull().default(0),
  // First attestation timestamp
  createdAt: t.bigint().notNull(),
}));

// Relations for easier querying
export const statementsRelations = relations(statements, ({ many }) => ({
  beliefs: many(beliefs),
  implicationsFrom: many(implications, { relationName: "fromStatement" }),
  implicationsTo: many(implications, { relationName: "toStatement" }),
}));

export const beliefsRelations = relations(beliefs, ({ one }) => ({
  statement: one(statements, {
    fields: [beliefs.statementId],
    references: [statements.id],
  }),
  user: one(users, {
    fields: [beliefs.user],
    references: [users.id],
  }),
}));

export const implicationsRelations = relations(implications, ({ one }) => ({
  fromStatement: one(statements, {
    fields: [implications.fromStatementId],
    references: [statements.id],
    relationName: "fromStatement",
  }),
  toStatement: one(statements, {
    fields: [implications.toStatementId],
    references: [statements.id],
    relationName: "toStatement",
  }),
  attester: one(attesters, {
    fields: [implications.attester],
    references: [attesters.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  beliefs: many(beliefs),
}));

export const attestersRelations = relations(attesters, ({ many }) => ({
  implications: many(implications),
}));
