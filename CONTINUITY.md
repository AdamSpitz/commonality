# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What was in progress (interrupted)

**Indexer redesign Phase 4 - removing GraphQL fallback**: We were deleting the old GraphQL-based queries and making event cache + folds the only path. This should fix failing integration tests that had both paths living side-by-side.

### Work completed:

1. **integration-tests/src/actions/action-machinery.ts**: Updated to configure `eventCacheUrl` and `contractAddresses` when creating test machinery.

2. **integration-tests/src/utils/setup.ts**: Updated `REQUIRED_ENV_VARS` to include `EVENT_CACHE_URL` and contract addresses (removed deprecated names like `DELEGATABLE_NOTES_ADDRESS`).

3. **sdk/src/subsystems/conceptspace/queries.ts**: Rewritten to use event cache + folds for entity queries (`getStatement`, `getUserBelief`, `getImplicationsFrom`, `getImplicationsTo`, `getImplication`, `getIndirectSupporters`, `getIndirectSupporterCount`). Discovery/browsing queries still use GraphQL (they need pre-computed aggregations).

4. **sdk/src/utils/eventDecoder.ts**: Updated `decodeAlignmentAttestationEvent` to include full event metadata (contractAddress, blockNumber, etc.).

5. **sdk/src/subsystems/fundingportals/folds.ts**: Updated `foldAlignmentAttestations` to work with decoded events, removed `AlignmentAttestationEvent` dependency.

6. **sdk/src/subsystems/fundingportals/queries.ts**: Partially updated - entity queries now use event cache, but still needs fixing (see below).

### Work remaining:

1. **sdk/src/subsystems/fundingportals/queries.ts**: Still has duplicate code that needs cleanup - `getSubjectStatements` and `getAlignmentAttestation` still have the old transformation wrappers. Also `getAlignmentsByAttester` still uses GraphQL.

2. **indexer needs REST API endpoint for event cache**: The SDK fetches from `/api/events` endpoint. Need to verify this is exposed in the indexer.

3. **Environment variable naming**: The integration tests expect `EVENT_CACHE_URL` but the indexer exposes it at port 42069. Need to verify the correct URL format (likely `http://localhost:42069`).

4. **Event cache table names**: Need to verify the indexer's REST API table names match what the SDK expects:
   - `events` → `/api/events`
   - `statements_registry` → `/api/statements_registry`
   - `alignment_attestations_registry` → `/api/alignment_attestations_registry`

5. **Remaining subsystems to update** (not yet started):
   - `sdk/src/subsystems/pubstarter/queries.ts` - still GraphQL only
   - `sdk/src/subsystems/delegation/queries.ts` - still GraphQL only
   - `sdk/src/subsystems/mutable-refs/queries.ts` - still GraphQL only

6. **Remove unused code after migration**:
   - `sdk/src/generated/graphql.ts` - GraphQL codegen (may still be needed for aggregated queries)
   - `sdk/src/utils/graphqlClient.ts` - May still be needed for aggregated queries
   - The old Ponder indexer handlers in `indexer/src/conceptspace/index.ts`, etc. (business logic that will be replaced by event cache)

### How to test after completing migration:

```bash
# Start Docker services
./scripts/run-integration-tests.sh

# Run a single test
cd integration-tests && npx mocha --grep "should record belief"
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
