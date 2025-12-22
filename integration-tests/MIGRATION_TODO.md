# Property-Based Testing Migration TODO

This document tracks the migration of integration tests from ad-hoc assertions to the property-based testing framework described in [generative-test-prep.md](generative-test-prep.md).

## Current Status (as of 2025-12-22)

- **5 test files** fully migrated (21%)
- **5 test files** partially migrated (21%)
- **14 test files** not yet migrated (58%)
- **9 invariants** implemented in [src/invariants.ts](src/invariants.ts)
- **3 action categories** have checked wrappers (beliefs, implications, funding)

---

## Phase 1: Complete Action Framework Infrastructure

### 1.1 Create Missing Action Wrappers

- [ ] **Delegation actions** (`delegation-actions-checked.ts`)
  - [ ] `createNoteChecked()` - Create a delegation note
  - [ ] `delegateNoteChecked()` - Delegate a note to another address
  - [ ] `spendDelegatedNoteChecked()` - Spend a delegated note
  - [ ] Define properties in `delegation-action-properties.ts`

- [ ] **Marketplace actions** (`marketplace-actions-checked.ts`)
  - [ ] `listTokensForSaleChecked()` - List tokens on secondary market
  - [ ] `buyTokensFromMarketplaceChecked()` - Buy from secondary market
  - [ ] Define properties in `marketplace-action-properties.ts`

- [ ] **Project creation actions** (`project-creation-actions-checked.ts`)
  - [ ] `createProjectChecked()` - Create a new crowdfunding project
  - [ ] `withdrawProjectFundsChecked()` - Withdraw funds from successful project
  - [ ] `refundContributionChecked()` - Refund from failed project
  - [ ] Define properties in `project-action-properties.ts`

- [ ] **Token burn actions** (add to `funding-actions-checked.ts`)
  - [ ] `burnProjectTokensChecked()` - Burn project tokens
  - [ ] Update `funding-action-properties.ts` with burn properties

### 1.2 Add Missing Invariants

Based on [generative-test-prep.md](generative-test-prep.md), these invariants are specified but not yet implemented:

**Section 1: State Consistency Invariants**
- [x] Belief counts match belief records
- [x] Money conservation
- [x] Token conservation
- [x] Delegation chain integrity
- [x] Orphaned data check (every UserBelief references existing Statement, etc.)
- [ ] Implication bidirectionality (partially done - exists as property, not standalone invariant)
- [ ] Self-reference handling (S1→S1 implications)
- [ ] Concurrent action handling (same-block operations)

**Section 2: State Transition Properties**
- [x] Belief transitions
- [x] Project funding
- [x] Token transfer consistency (trade data)
- [x] Indirect support propagation
- [ ] Delegation permissions (verify only valid spender can spend)
- [ ] Token burn effects (verify burned tokens reduce held tokens correctly)
- [ ] Refund mechanics (verify refunds restore correct balances)

**Section 3: Query Consistency**
- [x] Indirect supporter count vs list
- [ ] Direct vs aggregated counts (generic version for all entities)
- [ ] Graph traversal consistency (different query paths return same data)
- [ ] Event replay (replaying events produces same state)

**Section 4: Business Logic Constraints**
- [ ] Assurance contract refunds (deadline + threshold logic)
- [ ] Implication non-transitivity (S1→S2→S3 doesn't imply S1's believers support S3)
- [x] Unique statements (same IPFS CID = same statementId)

**Section 5: Edge Case Validation**
- [ ] Empty states (zero believers/disbelievers)
- [ ] Orphaned data (all references valid)

**Section 6: Temporal/Historical Properties**
- [x] Monotonic counters (project funding never decreases without refunds)
- [ ] Event ordering (blockchain order matches query order)

**Section 7: Derived Metrics Validation**
- [ ] Leaderboard rankings (verify ranking calculation)
- [ ] Funding available (delegatable funding calculation)

**Section 8: Cross-Subsystem Consistency**
- [ ] Federated queries (multiple indexers agree)
- [ ] Smart contract state (indexer matches on-chain state)

---

## Phase 2: Migrate Test Files

### Priority 1: High-Value Migrations (Complex Tests with Many Assertions)

- [ ] **end-to-end-workflows.test.ts**
  - Has 4 complex workflows with extensive ad-hoc assertions
  - Would benefit most from property-based checking
  - Needs: All action wrappers (beliefs, funding, delegation, marketplace)

- [ ] **fundingportal-indirect-alignment.test.ts**
  - Complex alignment logic with manual verification
  - Needs: Belief and funding action wrappers (already exist)

- [ ] **marketplace-secondary.test.ts**
  - Trading patterns with some invariant use
  - Needs: Marketplace action wrappers

### Priority 2: Finish Partially Migrated Files

- [ ] **pubstarter-burn-tokens.test.ts**
  - Already uses `assertTokenConservation`
  - Needs: `burnProjectTokensChecked()` wrapper

- [ ] **pubstarter-multiple-tokens.test.ts**
  - Already uses `buyProjectTokensChecked()` in some places
  - Refactor remaining ad-hoc assertions to use checked wrappers

- [ ] **delegation-basic.test.ts**
  - Already uses `assertDelegationChainIntegrity`
  - Needs: Delegation action wrappers

- [ ] **delegation-spending.test.ts**
  - Already uses `assertDelegationChainIntegrity`
  - Needs: Delegation action wrappers

- [ ] **conceptspace-create-statement-workflow.test.ts**
  - Could use property checks for statement creation
  - Needs: Define creation properties

### Priority 3: Workflow and Discovery Tests

- [ ] **fundingportal-alignment.test.ts**
  - Project alignment queries
  - Needs: Define alignment query consistency properties

- [ ] **fundingportal-leaderboards.test.ts**
  - Leaderboard ranking logic
  - Needs: Define leaderboard ranking invariants

- [ ] **fundingportal-aggregated-metrics.test.ts**
  - Metrics aggregation
  - Needs: Define aggregation consistency properties

- [ ] **conceptspace-discovery.test.ts**
  - Statement browsing/filtering
  - Needs: Define discovery query properties

- [ ] **pubstarter-filtering-sorting.test.ts**
  - Project sorting logic
  - Needs: Define sorting consistency properties

- [ ] **conceptspace-user-profiles.test.ts**
  - User profile queries
  - Needs: Define profile consistency properties

- [ ] **conceptspace-multiple-attesters.test.ts**
  - Multiple attester scenarios
  - Needs: Implication action wrappers (already exist)

### Priority 4: Edge Cases and Permissions

- [ ] **pubstarter-edge-cases.test.ts**
  - Edge case handling with try-catch assertions
  - Needs: Refund/withdrawal action wrappers

- [ ] **delegation-permissions.test.ts**
  - Permission validation with try-catch
  - Needs: Delegation action wrappers + permission invariants

- [ ] **mutable-refs.test.ts**
  - Mutable reference testing
  - Needs: Define mutable ref consistency properties

### Priority 5: Simple Tests (Lower Priority)

- [ ] **hello-world.test.ts**
  - Basic smoke test - may not need migration
  - Consider: Leave as-is or add basic invariant checks

---

## Phase 3: Prepare for Generative Testing

Once most tests are migrated to use the action framework:

- [ ] Create generative test harness
  - [ ] Random action generator
  - [ ] Configurable action mix (beliefs, funding, delegation, etc.)
  - [ ] Batch property checking after N actions

- [ ] Define comprehensive invariant test suite
  - [ ] Run all invariants after each generative test batch
  - [ ] Performance optimization (expensive checks run less frequently)
  - [ ] Parallel invariant checking where possible

- [ ] Integration with fake-data generation
  - [ ] Use existing `hardhat/fake-data-generation/` system
  - [ ] Generate random but valid inputs
  - [ ] Feed generated data through checked actions

- [ ] Smoke test infrastructure
  - [ ] Run large batches of random actions
  - [ ] Collect invariant violations
  - [ ] Report statistics on action coverage and invariant pass rates

---

## Notes

### File-by-File Migration Status

**Fully Migrated (5):**
1. ✅ conceptspace-beliefs.test.ts
2. ✅ conceptspace-implications.test.ts
3. ✅ conceptspace-indirect-support.test.ts
4. ✅ pubstarter-basic.test.ts
5. ✅ pubstarter-lifecycle.test.ts

**Partially Migrated (5):**
6. 🟡 pubstarter-burn-tokens.test.ts
7. 🟡 pubstarter-multiple-tokens.test.ts
8. 🟡 conceptspace-create-statement-workflow.test.ts
9. 🟡 delegation-basic.test.ts
10. 🟡 delegation-spending.test.ts

**Not Yet Migrated (14):**
11. ❌ hello-world.test.ts
12. ❌ end-to-end-workflows.test.ts
13. ❌ fundingportal-alignment.test.ts
14. ❌ pubstarter-filtering-sorting.test.ts
15. ❌ pubstarter-edge-cases.test.ts
16. ❌ conceptspace-multiple-attesters.test.ts
17. ❌ conceptspace-user-profiles.test.ts
18. ❌ conceptspace-discovery.test.ts
19. ❌ fundingportal-leaderboards.test.ts
20. ❌ mutable-refs.test.ts
21. ❌ fundingportal-indirect-alignment.test.ts
22. ❌ fundingportal-aggregated-metrics.test.ts
23. ❌ marketplace-secondary.test.ts
24. ❌ delegation-permissions.test.ts

### Available Action Wrappers

**Implemented:**
- `believeStatementChecked()` - [src/belief-actions-checked.ts](src/belief-actions-checked.ts)
- `disbelieveStatementChecked()` - [src/belief-actions-checked.ts](src/belief-actions-checked.ts)
- `clearOpinionChecked()` - [src/belief-actions-checked.ts](src/belief-actions-checked.ts)
- `attestImplicationChecked()` - [src/implication-actions-checked.ts](src/implication-actions-checked.ts)
- `buyProjectTokensChecked()` - [src/funding-actions-checked.ts](src/funding-actions-checked.ts)

**Needed:**
- Delegation: create, delegate, spend
- Marketplace: list, buy
- Project lifecycle: create, withdraw, refund
- Token burning: burn

### Implemented Invariants

See [src/invariants.ts](src/invariants.ts) for current implementations:
1. `assertBeliefCountsMatch()` - Belief counts match belief records
2. `assertMoneyConservation()` - Money conservation (totalReceived = sum of contributions)
3. `assertTokenConservation()` - Token conservation (sold = held + burned)
4. `assertDelegationChainIntegrity()` - Delegation chain integrity (no cycles)
5. `assertTradeDataConsistency()` - Token transfer consistency (trade data)
6. `assertIndirectSupporterCountConsistency()` - Indirect supporter count vs list
7. `assertNoOrphanedData()` - Referential integrity (Beliefs → Statements/Users, Implications → Statements/Attesters)
8. `assertUniqueStatements()` - CID-based statement deduplication
9. `assertMonotonicProjectFunding()` - Monotonic project funding (totalReceived never decreases without refunds)

---

## Getting Started

To make progress on this migration:

1. **Pick a priority** from Phase 2 above
2. **Create missing action wrappers** if needed (Phase 1.1)
3. **Define properties** for those actions (see [ACTION_FRAMEWORK_README.md](ACTION_FRAMEWORK_README.md))
4. **Refactor the test** to use checked wrappers
5. **Remove ad-hoc assertions** that are now covered by properties
6. **Check this box** when done!

For examples of fully migrated tests, see:
- [src/conceptspace-beliefs.test.ts](src/conceptspace-beliefs.test.ts)
- [src/conceptspace-implications.test.ts](src/conceptspace-implications.test.ts)
- [src/pubstarter-basic.test.ts](src/pubstarter-basic.test.ts)
