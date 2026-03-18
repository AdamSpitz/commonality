# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## Phase 4 COMPLETE

**Indexer redesign Phase 4 finished this session.**

### What was done this session:

1. **Fixed `sdk/src/subsystems/pubstarter/folds.test.ts`**:
   - Removed duplicate `makeWithdrawalEvent` function
   - Fixed `makeOfferedEvent` overrides: `tokenId` → `id`
   - Fixed `makeMetadataUpdatedEvent` overrides: `metadataCid` → `uri`
   - Fixed `makeSoldEvent` override: `totalRefund` → `totalCost`
   - Rewrote `foldContributions` describe block to use `foldContributionsFromEvents(boughtEvents, soldEvents)` (two separate arrays)

2. **Added domain helpers to `sdk/src/utils/eventCacheClient.ts`**:
   - `padAddressAsTopic(address)` — pads address to 32-byte topic
   - `fetchPubstarterProjectEvents(machinery, assuranceContractAddress)` — factory + contract events
   - `fetchSecondaryMarketEvents(machinery, marketplaceAddress)` — marketplace events
   - `fetchAllDelegationEvents(machinery)` — all DelegatableNotes events
   - `fetchNoteIntentEvents(machinery, noteContract)` — NoteIntentAttested events filtered by noteContract
   - `fetchRefUpdatedEvents(machinery, owner)` — RefUpdated events filtered by owner

3. **Migrated queries to event cache + folds** (all with GraphQL fallback):
   - `sdk/src/subsystems/pubstarter/queries.ts`: `getProject`, `getProjectTokens`, `getProjectContributions`, `getProjectRefunds`, `getSaleListing`, `getBuyOrder`
   - `sdk/src/subsystems/delegation/queries.ts`: `getNote`, `getDelegationChain`, `getNoteIntentAttestationsByNote`
   - `sdk/src/subsystems/mutable-refs/queries.ts`: `getUserRef`, `getUserRefHistory`

### Design decisions:
- Event cache path is used when `isEventCacheAvailable(machinery)` returns true (eventCacheUrl + contractAddresses set)
- Falls back to existing GraphQL for discovery/aggregation queries (getAllProjects, getNotesByOwner, etc.)
- `getProject` reads threshold/deadline from on-chain via `readConditionParams` if `publicClient` is available, otherwise returns '0' for those fields
- `getNote`/`getDelegationChain` fetch ALL delegation events (can be large; optimize later)
- `fetchNoteIntentEvents` filters by noteContract (topic2), further filters by noteId client-side

### Next steps:
- Integration test with real running Ponder event cache
- Verify the topic padding for addresses works correctly with the actual Ponder event cache API
- Consider optimizing `fetchAllDelegationEvents` to be more targeted for specific note queries
- Check if `getUserRefs` (all refs for a user) should also be migrated

### Status: 239 SDK tests passing, tsc clean, lint clean.

---

## What was in progress (interrupted)

**Indexer redesign Phase 4 - ABI sync + decoder fixes + fold migration started**

### This session's work:

1. **Updated `sync-abis.ts` script** to include ALL contracts (was only syncing 4 of 8):
   - Added: DelegatableNotes, MutableRefUpdater, PremintingERC1155, MultiERC1155AssuranceContract
   - SDK's sync script also updated and run: all 10 ABI files now in `sdk/abis/`

2. **SDK now imports ABIs from generated files** (not hardcoded):
   - `sdk/src/utils/eventDecoder.ts` now imports from `../abis.js` → `../../indexer/abis/`
   - `sdk/src/abis.ts` re-exports from indexer (already existed)
   - Key: ABIs now come from compiled Solidity artifacts, not manual copies

3. **Fixed event types to match actual ABI field names**:
   - `ERC1155OfferedEvent`: field is `id` (not `tokenId`)
   - `ERC1155SoldEvent`: field is `totalCost` (not `totalRefund`)
   - `ContractMetadataUpdatedEvent`: field is `uri` (not `metadataCid`)
   - `NoteDelegatedEvent`: fields are `parentNoteId`, `childNoteId` (not `noteId`)
   - `NoteIntentAttestedEvent`: fields include `noteContract` (not just `noteId`)

4. **Added `foldContributionsFromEvents`** (separate bought/sold arrays) and kept `foldContributions` as alias

5. **FIXED BUT TESTS BROKEN**: `folds.test.ts` still uses old field names. Need to update:
   - `makeOfferedEvent`: use `id` not `tokenId`
   - `makeSoldEvent`: use `totalCost` not `totalRefund`
   - `makeMetadataUpdatedEvent`: use `uri` not `metadataCid`
   - Remove duplicate `makeWithdrawalEvent` definitions

### Work remaining for Phase 4:

1. **Fix pubstarter folds.test.ts** - update event factory helpers to use correct field names
2. **Add helper functions to eventCacheClient.ts**:
   - `fetchPubstarterProjectEvents(assuranceContractAddress)` - fetches all events for a project
   - `fetchMarketplaceEvents(marketplaceAddress)` - fetches all secondary market events
   - `fetchDelegationEvents(noteContract, noteId?)` - fetches delegation events
   - `fetchRefUpdatedEvents(owner, name?)` - fetches mutable ref events

3. **Migrate pubstarter queries to event cache + folds** (`sdk/src/subsystems/pubstarter/queries.ts`):
   - `getProject()` → fetch events + foldProject
   - `getProjectTokens()` → fetch ERC1155Offered events + foldProjectTokens
   - `getProjectContributions()` → fetch ERC1155Bought events + foldContributionsFromEvents
   - `getSaleListing()` → fetch events + foldSecondaryMarket
   - `getBuyOrder()` → fetch events + foldSecondaryMarket
   - Keep GraphQL for: getAllProjects, getProjectsFiltered, getActiveSaleListings, etc.

4. **Migrate delegation queries** (`sdk/src/subsystems/delegation/queries.ts`):
   - `getNote()` → fetch all DelegatableNotes events + foldDelegationState
   - `getDelegationChain()` → same as getNote
   - `getNoteIntentAttestationsByNote()` → fetch NoteIntentAttested events + foldNoteIntentAttestations

5. **Migrate mutable-refs queries** (`sdk/src/subsystems/mutable-refs/queries.ts`):
   - `getUserRef()` → fetch RefUpdated events + foldMutableRef
   - `getUserRefHistory()` → fetch RefUpdated events + foldRefHistory
   - Keep GraphQL for: getRefsByName

### How to test after fixing tests:

```bash
cd sdk && npm test  # should pass
npm run build       # passes
npm run lint        # no errors
```

### Key ABI field names (from Solidity):

**Pubstarter (AssuranceContract):**
- `ERC1155Offered(erc1155Addr indexed, id, price)` - token ID is `id`
- `ERC1155Sold(participant indexed, erc1155Addr indexed, totalCost, ids, counts)` - refund amount is `totalCost`
- `ContractMetadataUpdated(uri)` - field is `uri` (string, not bytes32 CID)

**Delegation (DelegatableNotes):**
- `NoteDelegated(parentNoteId indexed, childNoteId indexed, delegate indexed, amount)` - TWO note IDs
- `ERC1155Purchased(buyer indexed, erc1155Contract indexed, tokenIds, counts, totalCost, inputNoteIds, outputNoteIds)`
- `NoteIntentAttested(attester indexed, noteContract indexed, noteId indexed, intendedStatementId)`

**Mutable Refs:**
- `RefUpdated(owner indexed, name, currentRefValue)`

## Phase 4 progress summary

Phase 4 adds event cache client and decoder to SDK, enabling client-side folding.

### SDK changes (sdk/src/)

1. **machinery.ts**: Has `eventCacheUrl` and `contractAddresses` fields

2. **utils/eventCacheClient.ts**: Utilities for fetching from event cache
   - fetchEvents(), fetchStatementsRegistry(), fetchProjectsRegistry(), etc.
   - isEventCacheAvailable()

3. **utils/eventDecoder.ts**: Decodes raw events using viem's decodeEventLog
   - Now imports ABIs from indexer abis/ directory (auto-synced)
   - Fixed decoders to use correct ABI field names

4. **subsystems/*/folds.ts**: Client-side folding functions for each subsystem

5. **abis/**: Generated from hardhat artifacts via `npm run sync-abis`

### Key design decisions

- **Event cache + fold only**: Entity-specific queries use event cache + folds
- **GraphQL for aggregations**: Discovery/browsing queries still need GraphQL (they need pre-computed aggregations)
- **Indexer exposes REST API**: Event cache is queried via `/api/{table}` endpoints
- **ABIs from artifacts**: SDK imports from indexer/abis/ (generated by sync-abis script)

## Phase 3 summary (complete)

Phase 3 added thin event cache service to Ponder with registry tables and event capture handlers.

### Schema additions
- events table: raw event storage with all topics and data
- Registry tables: statements_registry, projects_registry, alignment_attestations_registry, implications_registry

### Event handlers (src/events-cache/index.ts)
All contracts emit raw events to the events table, and registries are updated when new entities are created.

## Previous notes (from earlier session)

**Indexer redesign Phase 4 - ABI corrections + preparing for query migration**

### This session's work:

1. **Fixed all event ABIs in `eventDecoder.ts`** to match actual contract events:
   - `ASSURANCE_CONTRACT_FACTORY_ABI`: `PubstarterAssuranceContractCreated` now has no indexed fields (was incorrectly using `assuranceContract: indexed, creator: indexed` — actual contract has no indexed params)
   - `ASSURANCE_CONTRACT_ABI`: Fixed `AssuranceContractInitialized` (actual: `recipient: indexed, condition: indexed`; was: `assuranceContract: not indexed, recipient: not indexed, condition: not indexed`); Fixed `ContractMetadataUpdated` (actual: only `metadataCid`; was had `assuranceContract` field too); Fixed `ERC1155Offered` (actual: `erc1155Addr: indexed, id: not indexed, price: not indexed`; was different); Fixed `ERC1155Sold` (actual: `participant: indexed, erc1155Addr: indexed, totalCost (not totalRefund)`, was using wrong field name); Fixed `AssuranceContractWithdrawal` (actual: `recipient: indexed, value`; was had `assuranceContract` field)
   - `SECONDARY_MARKET_ABI`: Fixed indexing on all events (actual: first 1-2 params are indexed; was all non-indexed)
   - `DELEGATABLE_NOTES_ABI`: Completely rewritten to match actual contract events (NoteCreated, NoteDelegated, ChainSplit, NoteRevoked, FundsReclaimed, NoteConsumed, ERC1155Purchased — all with correct indexed params)
   - `NOTE_INTENT_ABI`: Fixed `NoteIntentAttested` (actual: `attester: indexed, noteContract: indexed, noteId: indexed, intentStatementId: not indexed`; was all non-indexed)
   - `MUTABLE_REF_UPDATER_ABI`: Fixed `RefUpdated` (actual: `owner: indexed, refName, currentRefValue`; was had wrong field names and indexing)
   - Also fixed `decodeMutableRefEvent` to return `owner`, `currentRefValue` (not `updater`, `refValue`)

2. **Added typed decoder functions** to `eventDecoder.ts`:
   - `decodePubstarterAssuranceContractCreatedEvent`, `decodeAssuranceContractInitializedEvent`, `decodeContractMetadataUpdatedEvent`, `decodeERC1155OfferedEvent`, `decodeERC1155BoughtEvent`, `decodeERC1155SoldEvent`, `decodeAssuranceContractWithdrawalEvent`
   - `decodeSaleListingCreatedEvent`, `decodeSaleListingFulfilledEvent`, `decodeSaleListingCancelledEvent`, `decodeBuyOrderCreatedEvent`, `decodeBuyOrderFulfilledEvent`, `decodeBuyOrderCancelledEvent`
   - `decodeTransferSingleEvent`, `decodeTransferBatchEvent`
   - `decodeNoteCreatedEvent`, `decodeNoteDelegatedEvent`, `decodeChainSplitEvent`, `decodeNoteRevokedEvent`, `decodeFundsReclaimedEvent`, `decodeNoteConsumedEvent`, `decodeERC1155PurchasedEvent`
   - `decodeNoteIntentAttestedEvent`

Build passes, 239 SDK tests pass.

### Work remaining for Phase 4:

1. **Migrate pubstarter queries to event cache + folds** (`sdk/src/subsystems/pubstarter/queries.ts`):
   - `getProject()` → fetch `PubstarterAssuranceContractCreated`, `AssuranceContractInitialized`, `ContractMetadataUpdated` events + foldProject
   - `getProjectTokens()` → fetch `ERC1155Offered` events + foldProjectTokens (need to filter by project)
   - `getProjectContributions()` → fetch `ERC1155Bought` events + foldContributions
   - `getProjectRefunds()` → fetch `ERC1155Sold` events + foldContributions.refunds
   - `getSaleListing()` → fetch `SaleListingCreated` + fulfillments/cancellations events + foldSecondaryMarket
   - `getBuyOrder()` → fetch `BuyOrderCreated` + fulfillments/cancellations + foldSecondaryMarket
   - Discovery queries (`getAllProjects`, `getProjectsFiltered`) keep GraphQL
   - Key challenge: `foldProject` needs events from BOTH the factory contract (PubstarterAssuranceContractCreated) and the assurance contract itself (AssuranceContractInitialized, etc.) — need to fetch from both and combine

2. **Migrate delegation queries to event cache + folds** (`sdk/src/subsystems/delegation/queries.ts`):
   - `getNote()` → fetch all DelegatableNotes events for the note + foldNote
   - `getDelegationChain()` → same as getNote (foldNote returns chain)
   - `getNoteIntentAttestationsByNote()` → fetch `NoteIntentAttested` events + foldNoteIntentAttestations
   - Discovery queries (`getNotesByOwner`, `getNotesByRoot`) keep GraphQL

3. **Migrate mutable-refs queries to event cache + folds** (`sdk/src/subsystems/mutable-refs/queries.ts`):
   - `getUserRef()` → fetch `RefUpdated` events (by owner/name via client-side filter) + foldMutableRef
   - `getUserRefHistory()` → fetch `RefUpdated` events + foldRefHistory
   - `getRefsByName()` → keep GraphQL (global query across all owners)

4. **Pattern to follow**: See `sdk/src/subsystems/conceptspace/queries.ts` and `sdk/src/subsystems/fundingportals/queries.ts` for reference implementations of the event-cache + fold pattern.

### How to test:

```bash
cd sdk && npm test  # 239 tests passing
npm run build       # passes
npm run lint        # no errors
```

### Important ABI notes for next session:

The typed decoder functions have been added but NOT YET INTEGRATED into the query files. The critical thing is getting the ABI field names RIGHT. Key contract events and their actual signatures:

- `RefUpdated`: `(address indexed owner, string refName, string currentRefValue)` — from MutableRefUpdater.sol
- `NoteCreated`: `(uint256 indexed noteId, address indexed owner, uint256 amount, address token, TokenType tokenType, uint256 tokenId)` — from DelegatableNotes.sol
- `NoteDelegated`: `(uint256 indexed parentNoteId, uint256 indexed childNoteId, address indexed delegate, uint256 amount)`
- `ChainSplit`: `(uint256 indexed originalLeafId, uint256 indexed splitLeafId, uint256 indexed remainderLeafId, uint256 splitAmount)`
- `NoteIntentAttested`: `(address indexed attester, address indexed noteContract, uint256 indexed noteId, bytes32 intentStatementId)` — from NoteIntent.sol
- `ERC1155Offered`: `(address indexed erc1155Addr, uint256 id, uint256 price)` — emitted by AssuranceContracts.sol
- `ERC1155Bought/Sold`: `(address indexed participant, address indexed erc1155Addr, uint256 totalCost, uint256[] ids, uint256[] counts)`
- `AssuranceContractInitialized`: `(address indexed recipient, address indexed condition)` — from AssuranceContract.sol
- `SaleListingCreated`: `(uint256 indexed saleListingId, address indexed seller, uint256 tokenId, uint256 count, uint256 pricePerToken)` — from ERC1155SecondaryMarket.sol
