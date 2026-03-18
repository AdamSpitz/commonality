# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

- **Phase 3 (indexer redesign) complete**: Raw events table and registry tables added to Ponder. Event handlers capture all contract events. Build passes, 239 SDK tests passing.
- Phase 4 (event cache SDK integration) is next: Update SDK to read from events table and fold locally instead of GraphQL.

## Phase 3 progress summary (Phase 3 complete)

Phase 3 adds the thin event cache service to Ponder:

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

- Phase 4: Update SDK to read from events table and fold locally instead of GraphQL
- This will enable removing the eager indexed tables and business-logic handlers
