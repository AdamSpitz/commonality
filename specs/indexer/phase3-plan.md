# Phase 3: Add raw events table to Ponder

## Overview

Add a single `events` table to the existing Ponder schema that stores raw events. This is a pure addition — existing tables, handlers, and sync jobs are untouched. The existing Ponder indexer continues functioning exactly as before.

## Goal

Lay the foundation for Phase 4: the SDK can eventually read from `events` and fold locally, replacing the eager indexed tables. But we're not doing any of that migration yet — just adding the storage.

## Migration strategy

This follows the strangler fig pattern:
1. Add `events` table (Phase 3, this doc)
2. Migrate each subsystem to read from `events` instead of eager tables (Phase 4, per-subsystem)
3. Remove old eager tables once all consumers are migrated (Phase 4 end)
4. Remove business-logic event handlers and sync jobs once no table depends on them

## Implementation

### Step 1: Schema

Add to the Ponder schema:

```typescript
// New table: raw events
events {
  id: String!          // primary key (txHash + logIndex)
  contractAddress: String!
  eventName: String!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: String!
  logIndex: Int!
  topic0: String       // event signature
  topic1: String       // indexed param 1
  topic2: String       // indexed param 2
  topic3: String       // indexed param 3
  data: String         // ABI-encoded non-indexed params (hex)
}
```

No derived fields. No joins. One row per event, forever.

### Step 2: Event handlers

One handler per subsystem that inserts into `events`. Example for Concept Space:

```typescript
class ConceptSpace {
  events = new EventsHandler(this)

  onDirectSupport(event) {
    this.events.set({
      id: `${event.log.transactionHash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      eventName: 'DirectSupport',
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.log.transactionHash,
      logIndex: event.log.logIndex,
      topic0: event.log.topics[0],
      topic1: event.log.topics[1],
      topic2: event.log.topics[2],
      topic3: event.log.topics[3],
      data: event.log.data,
    })
  }

  onImplicationAttestation(event) { /* same pattern */ }
  // ... same for every event in every subsystem
}
```

All events go through the same handler shape. Zero business logic. The handler is just a serialization of the raw log data.

### Step 3: Registry tables

In addition to the `events` table, add/update these registry tables to track what entities exist. These are small and eagerly maintained — they're the "what exists" layer that lets you answer "show me all statements" without scanning all events.

```typescript
// Eagerly maintained:
statements {
  id: String!              // IPFS CIDv1
  createdAtBlock: BigInt!
  createdAtTimestamp: BigInt!
}

projects {
  id: String!              // contract address
  factoryAddress: String!
  createdAtBlock: BigInt!
  createdAtTimestamp: BigInt!
}

// These may already exist or need to be added:
alignmentAttestations {
  id: String!              // composite: attester + subject + statementId
  attester: String!
  subjectAddress: String!
  statementId: String!
  createdAtBlock: BigInt!
}

implications {
  id: String!              // composite: attester + from + to
  attester: String!
  fromStatementId: String!
  toStatementId: String!
  createdAtBlock: BigInt!
}
```

Registry handlers are lightweight and low-volume. Keep existing handlers that populate these; don't migrate them to Phase 4.

### What NOT to change

- Existing tables (`Statement`, `Belief`, `Project`, `Contribution`, `Note`, etc.)
- Existing event handlers that populate those tables
- IPFS sync jobs
- Social data sync
- Federation
- Custom REST endpoints
- SDK queries (still talk to Ponder GraphQL as before)

This is a pure addition. The system is functionally identical before and after.

### Verification

1. New `events` table rows match expected event count (watch the chain, count events)
2. Registry tables still populated correctly (existing tests still pass)
3. Existing SDK tests still pass (SDK is unchanged)
4. `npm run build` passes

## Phase 4 (separate)

Once Phase 3 is complete, Phase 4 is per-subsystem migration:

For each subsystem:
1. Write SDK fold functions that read from the `events` table via GraphQL
2. Add a test that the fold-from-events produces the same result as the eager-indexed query
3. Switch SDK queries to use folds instead of direct GraphQL
4. Remove the old eager table and its event handler once no consumers remain

After all subsystems are migrated:
1. Remove all business-logic event handlers (only `events` + registry remain)
2. Remove IPFS sync jobs
3. Remove social data sync
4. Remove custom REST endpoints
5. Simplify or remove GraphQL resolvers that are no longer needed
