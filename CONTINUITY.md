# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

- Phase 1 (indexer redesign) **Chunk 4 (Pubstarter Secondary Market + Burns) is COMPLETE**: foldSecondaryMarket, foldTokenBurns added to SDK
- Next: Chunk 5 (Delegation) — the hardest fold, see `specs/indexer/phase1-plan.md`
- Still outstanding from before: E2E tests need verification against Docker stack (`npm run ui:test:e2e`)

## Key notes from Chunk 4

- Added 9 new event types to `sdk/src/subsystems/pubstarter/events.ts`: ERC1155SecondaryMarketCreatedEvent, SaleListingCreatedEvent, SaleListingFulfilledEvent, SaleListingCancelledEvent, BuyOrderCreatedEvent, BuyOrderFulfilledEvent, BuyOrderCancelledEvent, TransferSingleEvent, TransferBatchEvent
- Added `foldSecondaryMarket` to `folds.ts` — takes SecondaryMarketEvent[] discriminated union → { saleListings: SaleListing[], buyOrders: BuyOrder[], trades: Trade[] }
  - Sale listings/buy orders tracked by ID; fulfillment reduces remainingCount; status transitions: active → filled (when remainingCount=0) or active → cancelled
  - Each fulfillment produces a Trade record with computed totalPrice (count * pricePerToken)
  - Unknown listing/order IDs in fulfillment/cancellation events are silently ignored
- Added `foldTokenBurns` to `folds.ts` — takes (TransferSingleEvent | TransferBatchEvent)[] → TokenBurn[]
  - Only processes events where `to` is zero address (burns); other transfers ignored
  - Distinguishes Single vs Batch via `'ids' in event` check
- Added 23 tests (15 for foldSecondaryMarket, 8 for foldTokenBurns), all passing
- 167 SDK tests passing; typecheck clean
- Used `contractAddress` (from RawEvent) as `marketplaceAddress` in secondary market folds — events come from the marketplace contract itself

## Key notes from Chunk 3

- Created `sdk/src/subsystems/pubstarter/events.ts` — 7 event types: AssuranceContractCreatedEvent, AssuranceContractInitializedEvent, ContractMetadataUpdatedEvent, ERC1155OfferedEvent, ERC1155BoughtEvent, ERC1155SoldEvent, AssuranceContractWithdrawalEvent
- Created `sdk/src/subsystems/pubstarter/folds.ts` — `foldProject` (discriminated-union ProjectEvent[] → Omit<Project, 'threshold'|'deadline'> | null), `foldContributions` (bought/sold → Contribution[] + Refund[]), `foldProjectTokens` (last-write-wins per tokenId)
- Created `sdk/src/subsystems/pubstarter/folds.test.ts` — 28 tests, all passing
- Note: `foldProject` returns `null` for empty input (unlike conceptspace folds which return empty collections) because a project needs at minimum an ID
- `totalReceived` tracks bought − sold; withdrawals do NOT reduce it (they represent disbursement after success)

## Key notes from Chunk 2

- Created `sdk/src/subsystems/conceptspace/events.ts` — `DirectSupportEvent`, `ImplicationAttestationEvent`
- Created `sdk/src/subsystems/conceptspace/folds.ts` — `foldStatementBeliefs` (per-user delta tracking), `foldUserBeliefs` (last-write-wins per statement), `foldImplications` (key = attester+from+to, re-attestation updates explanationCid), `foldAllStatements` (global aggregate counts)
- Created `sdk/src/subsystems/conceptspace/folds.test.ts` — 29 tests, all passing
- Pre-Chunk 2 fixes also done: added `contractAddress: \`0x${string}\`` to `RawEvent`; updated Chunk 1 `makeEvent()` helpers; added caller-filters-events JSDoc to all Chunk 1 fold functions
- 117 SDK tests passing (88 before Chunk 2); typecheck clean

### Conventions for Chunk 3+

- Keep using the `makeEvent()` with `Partial<T>` overrides pattern for tests.
- Fold functions are pure and assume events arrive in block/logIndex order. Document this.
- Use `.toString()` for bigint→string conversion to match existing SDK types.

## Key notes from Chunk 1

- Created `sdk/src/subsystems/events-common.ts` — shared `RawEvent` base type
- Created mutable-refs `events.ts`, `folds.ts`, `folds.test.ts` — `foldMutableRef` (last-write-wins), `foldRefHistory`
- Created fundingportals `events.ts`, `folds.ts`, `folds.test.ts` — `foldAlignmentAttestations` (key = attester+subject+statement, re-attestation updates topicStatementCid)
- All new files exported from their subsystem `index.ts`; `RawEvent` exported from `subsystems/index.ts`
- 88 SDK tests pass, typecheck clean



- Pluggable-condition downstream refactor is **COMPLETE** (all tasks done; TODO.md duplicate entries cleaned up)
- E2E tests: `ui/e2e/pubstarter-flow.spec.ts` was written but NOT yet run against Docker stack — run `npm run ui:test:e2e` to verify
- E2E delegation flow test also STILL needs verification against Docker stack (same command)
- Fix the problems in the different workspaces' TODO.md files (hardhat/TODO.md, sdk/TODO.md, ui/TODO.md are mostly empty/done)
- Consider project-wide review

This is a good interrupt point.

## Key notes from this session (pluggable-condition downstream Task 5)

- **Task 5 done**: Updated `integration-tests/src/utils/invariants.ts` and SDK to handle `conditionAddress`:
  - Added `conditionAddress: string | null` to `Project` type in `sdk/src/subsystems/pubstarter/types.ts`
  - Added `conditionAddress` field to `GetProject`, `GetAllProjects`, `GetProjectsFiltered` GraphQL queries
  - Added `conditionAddress: String` (nullable) to `sdk/schema.graphql` (committed copy of Ponder schema)
  - Updated `assertAssuranceContractRefundLogic` to skip early when `threshold === 0n && deadline === 0n` (indicates non-EthThreshold condition where on-chain read returned fallback 0n values)
  - All 616 unit tests pass; build clean

## Key notes from previous session (pluggable-condition downstream updates: Tasks 1-3)

- **Tasks 1-3 of the pluggable-condition downstream updates** are done:
  - Updated ABI files: AssuranceContractAbi (.ts/.js), PubstarterAbi (.ts/.js), PubstarterFactoriesAbi (.ts/.js)
  - Added EthThresholdConditionFactoryAbi to PubstarterFactoriesAbi and exported from sdk/src/abis.ts
  - Added `conditionAddress` (nullable hex) to projects table in indexer schema
  - Updated `AssuranceContractInitialized` event handler: reads `(recipient, condition)` from new event args; does on-chain reads of `threshold`/`deadline` from condition contract (EthThresholdCondition); falls back to 0n for other condition types
  - Fixed pre-existing slither issues: added zero-address checks to EthThresholdCondition and OracleCondition; extracted IOracle to IOracle.sol; MockOracle now inherits from IOracle

## Key notes from previous session (E2E delegation-flow infrastructure)

Previous session wrote `ui/e2e/delegation-flow.spec.ts` but the infrastructure to provide delegation contract addresses was missing. This session completed it:
- Extended `global-setup.ts` `copyContractAddresses()` to also copy `DELEGATABLE_NOTES_ADDRESS` → `VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS` and `PUBSTARTER_ADDRESS` → `VITE_PUBSTARTER_CONTRACT_ADDRESS` to ui/.env
- Extended `getContractAddresses()` in `ui/e2e/utils/blockchain.ts` to expose `delegatableNotesAddress` and `pubstarterAddress` (typed as `0x${string} | undefined`)
- TypeScript does not cover e2e/ (no tsconfig includes it); code verified manually
- Test still needs to be run against Docker stack to confirm it works end-to-end

## Key notes from previous session (E2E delegation-flow spec)

- Added E2E test for deposit → delegate → spend flow (`ui/e2e/delegation-flow.spec.ts`)
  - Test flow: ACCOUNT_0 creates project + deposits 0.1 ETH note + delegates to ACCOUNT_1 → UI verifies note in "Notes I Control" and delegation chain → ACCOUNT_1 spends note via SDK → UI verifies "Inactive" chip
  - All transactions via SDK (bypasses wagmi); UI verified via Playwright after indexer processes events
  - Note + spend amounts matched exactly (0.1 ETH = 1 token at 0.1 ETH) so note is fully consumed

## Key notes from previous session

- Added 20 unit tests for `FundingPortalSummary` (`ui/src/fundingportal/components/FundingPortalSummary.test.tsx`)
  - Coverage: loading/error/error-generic, metrics (heading, "View Funding Portal" link, totalRaised ETH, availableDelegatable ETH, projectCount), empty (no top-projects section), top-projects (heading, metadata name, truncated address fallback, card link, funding amounts, Direct/Indirect chips, top-3-only, sort by progress descending, computeAvailableDelegatableFunding call)
  - Mocks needed: `createSDKMachinery`, `getTotalFundingForCause`, `getAllAlignedProjectsForCause`, `getProject`, `fetchFromIPFS` (from `@commonality/sdk`), `computeAvailableDelegatableFunding` (from `../utils`), `Link` (from react-router-dom)
  - `computeAvailableDelegatableFunding` must be mocked via `vi.mock('../utils', () => ({ computeAvailableDelegatableFunding: vi.fn() }))` — path is relative to test file

## Key notes from previous session

- Added 20 unit tests for `AlignmentAttestationsSection` (`ui/src/fundingportal/components/AlignmentAttestationsSection.test.tsx`)
  - Coverage: loading/error/empty, list display (title, CID fallback, truncated attester address, Direct chip, portal link, multiple rows), button visibility (hidden when disconnected, visible when connected), dialog (opens, calls getAllStatements, closes on Cancel, wallet/contract validation errors, success message, error message, list refresh after success)
  - Mocks needed: `createSDKMachinery`, `getSubjectStatements`, `getStatement`, `getAllStatements`, `attestAlignment` (from SDK), `getAlignmentContract` (from `./alignmentContract`), `useAccount`/`useWalletClient`/`usePublicClient` (from wagmi), `Link` (from react-router-dom)
  - MUI Dialog close: needs `waitFor` to detect dialog unmount (transition doesn't run in jsdom)
  - Mixed text nodes: "Attester: {truncateAddress(...)}" - can't use exact string, use regex `/Attester: 0xBBBB\.\.\.BBBB/`
  - freeSolo Autocomplete: `user.type(input, text)` + `user.keyboard('{Enter}')` triggers onChange with the typed string

## Previous session notes (DelegatableNotesSection)

- Added 20 unit tests for `DelegatableNotesSection` (`ui/src/fundingportal/components/DelegatableNotesSection.test.tsx`)
  - Coverage: collapsed state (no fetch until opened), loading/error/empty states, note filtering (inactive/non-ETH/failed-load excluded), table display (headers, link, amount format, Direct/Delegated chips, truncated addresses, multiple rows), toggle behavior (reloads on re-open)
  - Mocks needed: `createSDKMachinery`, `getNoteIntentAttestationsByStatement`, `getNote`, `react-router-dom` (Link)
  - MUI Collapse: children stay in DOM when closed (no `unmountOnExit`), so test behaviors (fetch not called) rather than DOM absence when collapsed

## Previous session notes (DRY refactor)

- DRY: extracted `computeAvailableDelegatableFunding` into `ui/src/fundingportal/utils.ts`
  - Was duplicated in `FundingPortalSummary.tsx` and `StatementFundingPortalPage.tsx`
  - Helper takes `(machinery: SDKMachinery, statementCid: string): Promise<bigint>`
  - Callers do a single `cancelled` check after the await, then call setState
- Renamed 'newest' sort → 'latest' in `AlignedProjectsList.tsx` (type, state, case, label) + test

---

## Previous session notes

- Added 20 unit tests for `AlignedProjectsList` component (`ui/src/fundingportal/components/AlignedProjectsList.test.tsx`)
  - Coverage: loading, error, empty states, status filter (all/active/succeeded/refunding), alignment filter (all/direct/indirect), all 4 sort options (newest/deadline/mostFunded/closestToGoal)
  - Key pattern: use named metadata (via mocked getProject + fetchFromIPFS) to distinguish projects in filter/sort tests
  - Pitfall: LinearProgress in cards also has role="progressbar", so don't wait for progressbar absence to detect load completion — wait for project name text instead
  - Pitfall: "Direct"/"Indirect" appear in both filter buttons and alignment chips, use getAllByText not getByText

- Reviewed and fixed funding portals UI (`ui/src/fundingportal/`)
  - Review file: `funding-portals-review.md`
  - Bug: `DelegatableNotesSection` silently swallowed errors → now shows Alert to user
  - Bug: `DelegatableNotesSection` showed non-ETH notes → now filters by `isEthNote` (consistent with metrics)
  - Bug: `AlignmentAttestationsSection` list didn't refresh after attestation → added `refreshKey` state
  - DRY: `getAlignmentContract` extracted to `ui/src/fundingportal/components/alignmentContract.ts`
  - Remaining issues (not fixed): duplicated delegatable funding computation, no unit tests, 'newest' sort label mismatch

## Previous session notes

- Fixed NoteDetailPage null dereference bug in `ui/src/delegation/pages/NoteDetailPage.tsx`
- Added unit tests for `delegation/utils.ts` (17 tests)
- Added unit tests for `NoteDetailPage` (23 tests)
- Added unit tests for `DepositPage` (23 tests)
