# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What was in progress (interrupted)

**Indexer redesign Phase 4 - fixing broken SDK tests and lint errors**

### This session's work:

1. **Fixed 3 failing SDK tests** in `foldAlignmentAttestations`:
   - Root cause: `AlignmentAttestation` event has a 4th parameter `topicStatementId` (non-indexed, in data field) that was missing from the ABI in `eventDecoder.ts`
   - Fixed: Added `topicStatementId` to the ABI definition and `decodeAlignmentAttestationEvent` output
   - Fixed: Updated `foldAlignmentAttestations` in `folds.ts` to handle `topicStatementId` (set `topicStatementCid` from `topicStatementId`, and update it on re-attestation)

2. **Fixed lint errors**:
   - `sdk/src/subsystems/fundingportals/queries.ts`: Removed unused `contracts` variable, replaced `(e as any).args` with proper `decodeImplicationAttestationEvent` call
   - `sdk/src/subsystems/conceptspace/queries.ts`: Removed unused GraphQL imports (`GetStatementDocument`, `GetUserBeliefDocument`, etc.), removed unused `RawImplication` type and `normalizeImplication`/`normalizeAttester` helpers

### Work remaining for Phase 4:

1. **Migrate pubstarter queries to event cache + folds**:
   - `getProject()` → fetch events + fold
   - `getProjectTokens()` → fetch TransferSingle events + fold
   - `getProjectContributions()` → fetch ERC1155Bought/Sold events + fold
   - `getProjectRefunds()` → fetch ERC1155Sold events + fold
   - `getSaleListing()` → fetch SaleListingCreated events + fold
   - `getBuyOrder()` → fetch BuyOrderCreated events + fold
   - Discovery queries (`getAllProjects`, `getProjectsFiltered`) keep GraphQL (need aggregations)

2. **Migrate delegation queries to event cache + folds**:
   - `getNote()` → fetch DelegatableNotes events + fold
   - `getDelegationChain()` → use foldNote from folds.ts
   - `getNoteIntentAttestationsByNote()` → fetch NoteIntentAttested events + fold
   - Discovery queries (`getNotesByOwner`, `getNotesByRoot`) keep GraphQL

3. **Migrate mutable-refs queries to event cache + folds**:
   - `getUserRef()` → fetch RefUpdated events + fold
   - `getUserRefHistory()` → fetch RefUpdated events + fold history
   - `getRefsByName()` → keep GraphQL (global query)

4. **Remove remaining GraphQL fallback code** after all migrations complete

### How to test:

```bash
cd sdk && npm test  # 239 tests passing
npm run build       # passes
npx eslint src/    # no errors
```

## Phase 4 progress summary

Phase 4 adds event cache client and decoder to SDK, enabling client-side folding.

### SDK changes (sdk/src/)

1. **machinery.ts**: Has `eventCacheUrl` and `contractAddresses` fields

2. **utils/eventCacheClient.ts**: Utilities for fetching from event cache
   - fetchEvents(), fetchStatementsRegistry(), fetchProjectsRegistry(), etc.
   - isEventCacheAvailable()

3. **utils/eventDecoder.ts**: Decodes raw events using viem's decodeEventLog

4. **subsystems/*/folds.ts**: Client-side folding functions for each subsystem

### Key design decisions

- **Event cache + fold only**: Entity-specific queries use event cache + folds
- **GraphQL for aggregations**: Discovery/browsing queries still need GraphQL (they need pre-computed aggregations)
- **Indexer exposes REST API**: Event cache is queried via `/api/{table}` endpoints

## Phase 3 summary (complete)

Phase 3 added thin event cache service to Ponder with registry tables and event capture handlers.

### Schema additions
- events table: raw event storage with all topics and data
- Registry tables: statements_registry, projects_registry, alignment_attestations_registry, implications_registry

### Event handlers (src/events-cache/index.ts)
All contracts emit raw events to the events table, and registries are updated when new entities are created.
