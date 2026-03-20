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

