import { onchainTable, index } from "ponder";

// ============================================================================
// RAW EVENTS TABLE
// ============================================================================
// This table stores raw events from all contracts for client-side folding.
// No derived fields. No joins. One row per event, forever.
// The SDK reads these events and folds them locally.
//
// Changing column types/names is a breaking Ponder schema change and requires
// a new DATABASE_SCHEMA (full resync). Adding handlers, contract addresses, or
// indexes does not. Do not bump DATABASE_SCHEMA to work around Render schema locks.

export const events = onchainTable(
  "events",
  (t) => ({
    id: t.text().primaryKey(), // chainId + txHash + logIndex
    chainId: t.integer().notNull(),
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
    contractIdx: index().on(table.chainId, table.contractAddress, table.eventName),
    blockIdx: index().on(table.chainId, table.blockNumber),
    // Statement ids live in topic2 (beliefs/signatures) or topic3 (incoming
    // implications). Followers page those filters in chain order. Adding an
    // index changes the Ponder build id but not the table shape. With
    // PONDER_EXPERIMENTAL_DB=platform, startup reuses DATABASE_SCHEMA and
    // creates missing indexes; it does not replay history. Index builds run
    // inside a transaction (not CONCURRENTLY) while the indexer holds the
    // schema lock, so the first deploy after this change can sit in CREATE
    // INDEX before it serves traffic. Do not bump DATABASE_SCHEMA for this.
    topic2OrderIdx: index().on(table.chainId, table.topic2, table.blockNumber, table.logIndex),
    topic3OrderIdx: index().on(table.chainId, table.topic3, table.blockNumber, table.logIndex),
    topic1OrderIdx: index().on(table.chainId, table.topic1, table.blockNumber, table.logIndex),
  })
);
