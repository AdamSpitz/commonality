# What we've been working on lately

---

Main thing I want to work on next:
  - ~~Finish the pluggable-condition downstream refactor~~ ✓ DONE (Tasks 1-3, 5-7 all complete)

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

### Task 4: Update `ponder.config.ts` — skipped (using Option B)

Not needed with Option B (on-chain reads). If we later want to listen to
`EthThresholdConditionFactory` events, add it here with env var
`ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS`.

### ~~Task 5: Update `integration-tests/src/utils/invariants.ts`~~ ✓ DONE

`assertAssuranceContractRefundLogic` (around line 773) reads `project.threshold` and
`project.deadline` from the indexer's GraphQL. If those fields become 0 or null, this
invariant silently produces wrong results. Must be updated to match whatever schema change
is made in Task 3.

### ~~Task 6: Update `integration-tests/src/pubstarter/pubstarter-filtering-sorting.test.ts`~~ ✓ DONE (no changes needed)

Tests pass as-is — projects are created via `createProjectChecked` → SDK → Pubstarter (still accepts threshold/deadline),
and the indexer correctly populates threshold/deadline via on-chain reads. Verified by pre-commit integration test run.

### ~~Task 7: Update `delegation-spending.test.ts` call to `createAssuranceContract`~~ ✓ DONE (no changes needed)

`delegation-spending.test.ts` uses `createProjectChecked` (not `createAssuranceContract` directly). No change needed.
Verified by pre-commit integration test run.

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
