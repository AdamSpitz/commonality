# What we've been working on lately

---

Main thing I want to work on next:
  - Finish the pluggable-condition downstream refactor (Tasks 1-3, 5 DONE; Tasks 6-7 remain — see section below).

Other big things to do soon:
  - The issues in the different workspaces' TODO.md files (see below).
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.
    - Stuff I'm suspicious about:
      - Statement IDs. Are we using the correct CID format? Are we using the CID at all?
  - ?

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

---

## Pluggable Assurance Conditions — Downstream Updates

The smart contracts (`hardhat/contracts/individual-projects/`) have been refactored so that
assurance contract success/failure is determined by a pluggable `IAssuranceCondition` rather
than hardcoded threshold+deadline. The hardhat tests all pass. But the indexer, integration
tests, and related code still reference the old signatures. Here is what needs updating.

### What changed in the contracts

1. **`AssuranceContract.sol`** no longer stores `_threshold` / `_deadline`. It stores an
   `IAssuranceCondition _condition` (set once via `setCondition()`). The event
   `AssuranceContractInitialized` now emits `(address indexed recipient, address indexed condition)`
   instead of `(address indexed recipient, uint256 threshold, uint256 deadline)`.
   Old errors `NotEnoughFundingReceived` / `ProjectReachedFundingGoal` / `ProjectFateStillUndecided`
   are replaced by `ConditionNotMet` / `ConditionNotFailed` / `ConditionNotSet` / `ConditionAlreadySet`.

2. **`MultiERC1155AssuranceContract`** constructor is now `(owner, recipient, projectMetadataCid)` —
   no `threshold`/`deadline`. It exposes a new `setCondition(IAssuranceCondition)` (onlyOwner, one-time).

3. **`Pubstarter`** constructor takes 4 factory addresses (added `conditionFactory`).
   `createERC1155AndMarketplaceAndAssuranceContract` still accepts `threshold` and `deadline` in
   its signature (so SDK/integration-test call sites don't need to change), but internally it deploys
   an `EthThresholdCondition` and wires it up. There is also a new
   `createERC1155AndMarketplaceAndAssuranceContractWithCondition` for arbitrary conditions.

4. **`AssuranceContractFactory.createAssuranceContract`** now takes `(owner, recipient, projectMetadataCid)` — no `threshold`/`deadline`.

5. New contracts: `IAssuranceCondition.sol`, `EthThresholdCondition.sol`, `OracleCondition.sol`,
   `EthThresholdConditionFactory` (in Pubstarter.sol).

### ~~Task 1: Regenerate ABI files~~ ✓ DONE

ABI files updated manually (sync-abis script doesn't cover AssuranceContract/Pubstarter):
- AssuranceContractAbi: new error names, new event signature, setCondition function
- PubstarterAbi: 4-arg constructor
- PubstarterFactoriesAbi: added EthThresholdConditionFactoryAbi
- sdk/src/abis.ts: exports EthThresholdConditionFactoryAbi

### ~~Task 2: Update the indexer event handler~~ ✓ DONE (used Option B)

`AssuranceContractInitialized` handler updated to read `(recipient, condition)` from new
event args. Does on-chain reads of `threshold`/`deadline` from condition contract via
`context.client.readContract()` (falls back to 0n for non-EthThreshold conditions).

### ~~Task 3: Update the indexer schema~~ ✓ DONE

Added `conditionAddress: t.hex()` (nullable) to projects table. Kept `threshold`/`deadline`
as non-null (populated via on-chain reads from EthThresholdCondition).

### Task 4: Update `ponder.config.ts` (LOW — skipped with Option B)

Run `cd indexer && npm run sync-abis` after recompiling hardhat. This regenerates
`indexer/abis/*.ts` and `indexer/abis/*.js` from the compiled artifacts. After regenerating,
verify that:
- `AssuranceContractAbi` has the new `AssuranceContractInitialized(address,address)` event
  (not the old `(address,uint256,uint256)`), the new error names, and `setCondition`.
- `PubstarterAbi` constructor has 4 inputs (includes `conditionFactory`).
- A new ABI for `EthThresholdConditionFactory` is generated (may need to add it to the sync
  script's contract list if it doesn't pick it up automatically).

Also update `sdk/src/abis.ts` if it re-exports these ABIs (it imports from `indexer/abis/`).

### Task 2: Update the indexer event handler (`indexer/src/pubstarter/index.ts`) (CRITICAL)

The `AssuranceContractInitialized` handler currently destructures `threshold` and `deadline`
from `event.args` and writes them into the `projects` table. After the ABI change, the event
args will be `{ recipient, condition }`.

Decision needed: how to populate `threshold` and `deadline` in the indexed data for
`EthThresholdCondition`-based projects. Options:
- **Option A (recommended):** Store `conditionAddress` on the project record. Listen to
  `EthThresholdConditionCreated` events from the new factory (`EthThresholdConditionFactory`)
  to populate `threshold` and `deadline`. This requires adding the factory to `ponder.config.ts`.
- **Option B:** On receiving `AssuranceContractInitialized`, do an on-chain read of
  `EthThresholdCondition(condition).threshold()` and `.deadline()`. This couples the indexer
  to a specific condition type, but is simpler.
- **Option C:** Accept that generic conditions won't have threshold/deadline, and make those
  fields nullable. The UI would display condition-type-specific info based on `conditionAddress`.

### Task 3: Update the indexer schema (`indexer/schemas/pubstarter.schema.ts`) (HIGH)

The `projects` table has `threshold` and `deadline` as `bigint().notNull()`. Depending on the
decision in Task 2:
- Add a `conditionAddress` field (`t.hex()`).
- Either keep `threshold`/`deadline` (populated from the condition contract) or make them
  nullable (for non-threshold condition types).

### Task 4: Update `ponder.config.ts` (LOW — skipped, using Option B instead of Option A)

Not needed with Option B (on-chain reads). If we later want to listen to EthThresholdConditionFactory
events, we'd add it here with env var `ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS`.

### ~~Task 5: Update `integration-tests/src/utils/invariants.ts`~~ ✓ DONE

`assertAssuranceContractRefundLogic` (around line 773) reads `project.threshold` and
`project.deadline` from the indexer's GraphQL. If those fields become 0 or null, this
invariant silently produces wrong results. Must be updated to match whatever schema change
is made in Task 3.

### Task 6: Update `integration-tests/src/pubstarter/pubstarter-filtering-sorting.test.ts` (HIGH)

Tests that sort/filter by `threshold` and `deadline` from indexed data will break if those
fields are 0 or null. Update to match the new schema.

### Task 7: Update `DelegatableNotes.purchase.test.js` call to `createAssuranceContract` in integration tests

Check `integration-tests/src/delegation/delegation-spending.test.ts` for calls to
`createAssuranceContract` with the old 5-arg signature. Update to the new 3-arg signature
`(owner, recipient, projectMetadataCid)` + deploy condition + call `setCondition`.
(The hardhat-level `DelegatableNotes.purchase.test.js` has already been updated.)

### Low priority / no change needed

- **`sdk/src/subsystems/pubstarter/actions.ts`**: The `createProject` function still works
  because `Pubstarter.createERC1155AndMarketplaceAndAssuranceContract` still accepts
  `threshold` and `deadline`. No code change needed; JSDoc comments are slightly misleading
  but harmless.
- **`fake-data-generation/fundingAndDelegationActions.ts`**: Still correctly calls the SDK
  with `threshold`/`deadline`. No change needed.
- **`fake-data-generation/attackScenarios.ts`**: Calls a nonexistent `pubstart` function
  (already broken, fails silently in try/catch). Low priority fix.
- **All integration test `createProjectChecked` calls**: These pass `threshold`/`deadline`
  to the SDK which passes them to the on-chain function. Still correct. No change needed at
  the call site.

---

## Miscellaneous TODO.md files

- [hardhat/TODO.md](hardhat/TODO.md)
- [sdk/TODO.md](sdk/TODO.md)
- [ui/TODO.md](ui/TODO.md)
