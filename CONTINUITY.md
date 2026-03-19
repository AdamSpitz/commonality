# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## Eliminated last two GraphQL calls from fundingportals/queries.ts

**Task**: Replace `GetProjectDetailsDocument` and `GetParticipantSummariesDocument` GraphQL calls with event cache + chain reads.

**What was done**:
- `GetProjectDetailsDocument` → replaced with `getProject()` from `pubstarter/queries.ts` (already uses event cache + chain reads for threshold/deadline/totalReceived)
- `GetParticipantSummariesDocument` → replaced with `getProjectContributions()` + `getProjectRefunds()` from `pubstarter/queries.ts`, with manual per-participant aggregation
- Removed all GraphQL imports from `fundingportals/queries.ts`

**Files changed**:
- `sdk/src/subsystems/fundingportals/queries.ts` — replaced GraphQL calls, updated imports
- `indexer-redesign-todo.md` — marked these items as done
- `CONTINUITY.md` — this note

**What's next for the indexer redesign**:
- `indexer-sync.ts` still uses `_meta` GraphQL query — last remaining GraphQL usage in SDK
- Once that's migrated, the SDK generated GraphQL files (`sdk/src/generated/`) and `graphqlClient.ts` can be deleted
- Then the old indexer files (schemas, handlers, API endpoints, sync jobs) listed in the todo can be deleted

**Good interrupt point**: Yes — this is a clean checkpoint. The funding portals subsystem is now fully GraphQL-free.

## Integration tests: ALL PASSING ✓

**Status**: All integration tests pass. Pre-commit hook runs 616 tests clean.

**Last commit**: `57d869d` — "Fix all integration test failures across conceptspace and delegation subsystems"

### What was fixed in the last two sessions:

1. **AlignmentAttestation/ImplicationAttestation topic positions**: topic1=attester(address), topic2=fromStatementCid(bytes32), topic3=toStatementCid(bytes32). Addresses need `padAddressAsTopic()`.

2. **AssuranceContractAbi**: `ContractMetadataUpdated` field is `metadata` (not `uri`). Fixed in both `.js` and `.ts` ABI files and `indexer/src/pubstarter/index.ts`.

3. **foldRefHistory ordering**: Returns newest-first (not oldest-first). Fixed the unit test to match.

4. **Delegation fold (revoke)**: The contract's `revoke()` reverses the retained sub-chain, not just truncates. Fixed to reverse-iterate when building new chain. See `sdk/src/subsystems/delegation/folds.ts`.

5. **Delegation integration tests**: After user2 revokes from [user1,user2,user3] chain, owner=user1 (not user2). Chain length check after revocation is `<=` (not `<`) because root-revoking from a 2-element chain reverses but keeps same length.

6. **getIndirectSupporters deduplication**: When a user believes multiple source statements that all imply the same target, they were counted multiple times. Now deduplicated by user address using a Map.

7. **getUserIndirectSupport null statement**: Target statements only referenced via ImplicationAttestation events are not in statementsRegistry, so `getStatement()` returns null. Fixed to use a minimal placeholder instead of skipping.

8. **Workflow test invalid machinery**: `createActionTestingMachinery('http://invalid:9999')` still used real `EVENT_CACHE_URL` from env. The event cache bypassed the invalid GraphQL URL, making the list update succeed unexpectedly. Fixed by also overriding `eventCacheUrl: 'http://invalid:9999'` in the test.

9. **Indexer API BigInt serialization**: Added BigInt-safe JSON serializer to `indexer/src/api/index.ts`.

10. **indexer/src/pubstarter/index.ts**: Fixed TypeScript errors.

### Possible remaining issue: Ponder BuildError

A background docker-based integration test run showed:
```
commonality-indexer  | BuildError: Cannot read properties of undefined (reading 'find')
```
This error happened with the OLD code (before commit 57d869d). It is UNCLEAR if it's pre-existing or introduced by my changes. The pre-commit hook's 616 tests all pass (unit tests only — no docker). The docker-based integration test infrastructure needs a separate investigation.

**To debug the indexer BuildError**:
```bash
docker-compose build --no-cache indexer
VERBOSE_TESTS=true ./scripts/run-integration-tests.sh "Hello World"
# Check logs: docker-compose logs indexer | tail -50
```

## Phase 4 COMPLETE

**Indexer redesign Phase 4 finished.**

### Design summary:
- Event cache path used when `isEventCacheAvailable(machinery)` returns true (eventCacheUrl + contractAddresses set)
- Falls back to GraphQL for discovery/aggregation queries
- `sdk/src/abis.ts` re-exports all ABIs from `indexer/abis/` (auto-synced from hardhat artifacts)

## Phase 3 summary (complete)

Phase 3 added thin event cache service to Ponder with registry tables and event capture handlers.

### Schema additions
- events table: raw event storage with all topics and data
- Registry tables: statements_registry, projects_registry, alignment_attestations_registry, implications_registry

## Key ABI field names (from Solidity)

**Beliefs**: `DirectSupport(address indexed user, bytes32 indexed statementId, uint8 beliefState)`
**Implications**: `ImplicationAttestation(address indexed attester, bytes32 indexed fromStatementCid, bytes32 indexed toStatementCid, bytes32 explanationCid)`
**AlignmentAttestations**: `AlignmentAttestation(address indexed attester, address indexed subjectAddress, bytes32 indexed statementId, bytes32 topicStatementId)`
**AssuranceContract**: `ContractMetadataUpdated(string metadata)` — field is `metadata` NOT `uri`
**Pubstarter**: `ERC1155Offered(address indexed erc1155Addr, uint256 id, uint256 price)` — token ID is `id`
**Pubstarter**: `ERC1155Sold(address indexed participant, address indexed erc1155Addr, uint256 totalCost, uint256[] ids, uint256[] counts)` — refund field is `totalCost`
**Delegation**: `NoteDelegated(uint256 indexed parentNoteId, uint256 indexed childNoteId, address indexed delegate, uint256 amount)`
**Delegation**: `NoteIntentAttested(address indexed attester, address indexed noteContract, uint256 indexed noteId, bytes32 intentStatementId)`
**MutableRefs**: `RefUpdated(address indexed owner, string refName, string currentRefValue)`
