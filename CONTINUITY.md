# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

- **Phase 2 (indexer redesign) complete**: All chain read functions implemented. SDK has 11 on-chain read functions now. 239 SDK tests passing.
- Phase 3 (event cache service) is next: Build the thin event cache service.

## Phase 2 progress summary (Phase 2 complete)

Phase 2 adds on-chain read capabilities to the SDK. All functions added:

### Already existed (4 functions):
1. `readConditionParams` - threshold/deadline from EthThresholdCondition
2. `readProjectETHBalance` - ETH balance via getBalance
3. `readNoteOnChainInfo` - note slot data from DelegatableNotes
4. `readBelief` - user belief state from Beliefs contract

### Added this session (7 functions):
5. `readHasAlignment` - check if alignment attestation exists (AlignmentAttestations)
6. `readHasImplication` - check if implication attestation exists (Implications)
7. `readExplanation` - get explanation CID for an implication (Implications)
8. `readMutableRef` - read current ref value from MutableRefUpdater
9. `readTotalReceivedValue` - read cumulative funding from AssuranceContract
10. `readConditionStatus` - check hasSucceeded/hasFailed on condition contracts
11. `readSaleListing` - read sale listing from ERC1155SecondaryMarket
12. `readBuyOrder` - read buy order from ERC1155SecondaryMarket
13. `readNextNoteId` - read next note ID counter from DelegatableNotes

Also updated ERC1155SecondaryMarketAbi.ts to include getSaleListing and getBuyOrder view functions.

## What to do next

- Phase 3: Build the thin event cache service (watch contracts, store events, serve via REST)

## Key notes from Phase 2 (this session)

- Added `readBelief(machinery, beliefsContract, user, statementId)` to `sdk/src/utils/chain-reads.ts`:
  - Reads user belief about a statement from the Beliefs contract (believes/disbelieves/no opinion)
  - Falls back to `BELIEF_NO_OPINION` (0n) on error
  - Exports BELIEF_NO_OPINION (0n), BELIEF_BELIEVES (1n), BELIEF_DISBELIEVES (2n) constants
  - BeliefState type: `0n | 1n | 2n` (bigint, matching viem's return type)
  - Added 5 tests to chain-reads.test.ts
  - 207 SDK tests passing, build clean
- Added BeliefsReadAbi for the Beliefs contract's getBelief view function
- Updated redesign.md to reflect Phase 2 progress
