# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

- **Phase 2 (indexer redesign) in progress**: Added `readBelief` to chain-reads.ts (4th on-chain read function). SDK has 4 on-chain read functions now: readConditionParams, readProjectETHBalance, readNoteOnChainInfo, readBelief. Phase 2 continues: consider adding more (e.g. readConditionStatus for hasSucceeded/hasFailed on assurance conditions), or move to Phase 3.

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

## Phase 2 progress so far (202 SDK tests → 207)

Phase 2 adds on-chain read capabilities to the SDK. Functions added so far:
1. `readConditionParams` - threshold/deadline from EthThresholdCondition
2. `readProjectETHBalance` - ETH balance via getBalance
3. `readNoteOnChainInfo` - note slot data from DelegatableNotes
4. `readBelief` - user belief state from Beliefs contract

## What to do next

- Phase 2 continues: consider adding more on-chain reads (readConditionStatus? readProjectProgress?), or move to Phase 3 (event cache service)
