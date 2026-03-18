import { onchainTable, index } from "ponder";

// ============================================================================
// RAW EVENTS TABLE
// ============================================================================
// This table stores raw events from all contracts for client-side folding.
// No derived fields. No joins. One row per event, forever.
// This is the foundation for Phase 4: SDK reads from events and folds locally.

export const events = onchainTable(
  "events",
  (t) => ({
    id: t.text().primaryKey(), // txHash + logIndex
    contractAddress: t.hex().notNull(),
    eventName: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    topic0: t.text(), // event signature
    topic1: t.text(), // indexed param 1
    topic2: t.text(), // indexed param 2
    topic3: t.text(), // indexed param 3
    data: t.text(), // ABI-encoded non-indexed params (hex)
  }),
  (table) => ({
    contractIdx: index().on(table.contractAddress, table.eventName),
    blockIdx: index().on(table.blockNumber),
  })
);

// ============================================================================
// REGISTRY TABLES - Lightweight tracking of what entities exist
// ============================================================================
// These are small, eagerly maintained tables that let you answer
// "show me all statements" without scanning all events.

// Statements registry - lightweight version (what exists, not full content)
export const statementsRegistry = onchainTable("statements_registry", (t) => ({
  cidV1: t.text().primaryKey(), // IPFS CIDv1
  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
}));

// Projects registry - lightweight version (what exists, not full data)
export const projectsRegistry = onchainTable("projects_registry", (t) => ({
  id: t.hex().primaryKey(), // contract address
  factoryAddress: t.hex().notNull(),
  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
}));

// Alignment attestations registry - tracks what alignments exist
export const alignmentAttestationsRegistry = onchainTable(
  "alignment_attestations_registry",
  (t) => ({
    id: t.text().primaryKey(), // composite: attester + subject + statementId
    attester: t.hex().notNull(),
    subjectAddress: t.hex().notNull(),
    statementId: t.text().notNull(),
    createdAtBlock: t.bigint().notNull(),
  })
);

// Implications registry - tracks what implications exist
export const implicationsRegistry = onchainTable("implications_registry", (t) => ({
  id: t.text().primaryKey(), // composite: attester + from + to
  attester: t.hex().notNull(),
  fromStatementId: t.text().notNull(),
  toStatementId: t.text().notNull(),
  createdAtBlock: t.bigint().notNull(),
}));