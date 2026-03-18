# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

- **Phase 4 (indexer redesign) in progress**: SDK now supports fetching from event cache + fold locally. Conceptspace queries updated to use event cache when available (falls back to GraphQL). Build passes, 239 SDK tests passing.
- Remaining: Complete pubstarter and fundingportals event cache integration, then remove Ponder indexer business logic.

## Phase 4 progress summary (Phase 4 in progress)

Phase 4 adds event cache client and decoder to SDK, enabling client-side folding:

### SDK changes (sdk/src/)

1. **machinery.ts**: Added `eventCacheUrl` and `contractAddresses` fields to SDKMachinery

2. **utils/eventCacheClient.ts**: New utility for fetching from event cache
   - fetchEvents(): Query events by contract address, event name, topics
   - fetchStatementsRegistry(): Get all statements from registry
   - fetchProjectsRegistry(): Get all projects from registry
   - fetchAlignmentAttestationsRegistry(): Get alignments from registry
   - fetchImplicationsRegistry(): Get implications from registry
   - isEventCacheAvailable(): Check if event cache is configured

3. **utils/eventDecoder.ts**: New utility for decoding raw events
   - ABIs for all contracts (Beliefs, Implications, AssuranceContract, etc.)
   - decodeDirectSupportEvent(): Decode DirectSupport events
   - decodeImplicationAttestationEvent(): Decode ImplicationAttestation events
   - decodeAlignmentAttestationEvent(): Decode AlignmentAttestation events
   - decodePubstarterEvent(), decodeDelegationEvent(), decodeMutableRefEvent()

4. **subsystems/conceptspace/queries.ts**: Updated to use event cache
   - getStatement(): Uses event cache + foldStatementBeliefs when available
   - getUserBelief(): Uses event cache to find user's belief
   - getImplicationsFrom(): Uses event cache + foldImplications
   - getImplicationsTo(): Uses event cache + foldImplications
   - getImplication(): Uses event cache to find specific implication
   - Falls back to GraphQL when event cache not available

### Key design decisions

- **Hybrid approach**: SDK checks if eventCacheUrl + contractAddresses are configured. If yes, uses event cache + fold. Otherwise falls back to existing GraphQL queries.
- **Registry-first**: For "what exists" queries, uses registry tables (small, eagerly maintained). For entity state, fetches events and folds locally.
- **Backward compatible**: Existing code continues to work - just add eventCacheUrl and contractAddresses to enable Phase 4.

## Phase 3 summary (complete)

Phase 3 added the thin event cache service to Ponder:

### Schema additions (schemas/events.schema.ts)
1. **events** table: raw event storage
   - id (txHash + logIndex), contractAddress, eventName, blockNumber, blockTimestamp
   - transactionHash, logIndex, topic0-3, data (ABI-encoded)

2. **Registry tables**: lightweight "what exists" tracking
   - statements_registry (cidV1, createdAtBlock, createdAtTimestamp)
   - projects_registry (id, factoryAddress, createdAtBlock, createdAtTimestamp)
   - alignment_attestations_registry (id, attester, subjectAddress, statementId, createdAtBlock)
   - implications_registry (id, attester, fromStatementId, toStatementId, createdAtBlock)

### Event handlers (src/events-cache/index.ts)
Added handlers for all contracts:
- Beliefs: DirectSupport
- Implications: ImplicationAttestation
- AssuranceContractFactory: PubstarterAssuranceContractCreated
- AssuranceContract: 6 events
- SecondaryMarket: 7 events
- PremintingERC1155: TransferSingle, TransferBatch
- DelegatableNotes: 7 events
- NoteIntent: NoteIntentAttested
- AlignmentAttestations: AlignmentAttestation
- MutableRefUpdater: RefUpdated

Registry tables are updated when new statements, projects, alignments, and implications are created.

Existing Ponder indexer continues to work unchanged. This is a pure addition.

## What to do next

- Phase 4: Complete SDK integration with event cache
  - Update remaining queries (pubstarter, fundingportals, delegation, mutable-refs)
  - Add chain reads for project details (threshold, deadline, totalReceived)
  - Remove Ponder indexer business logic once all queries use event cache