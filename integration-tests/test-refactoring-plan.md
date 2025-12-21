# Integration Test Refactoring Plan

## Goal

Refactor the integration tests to use a **property-based testing** architecture where tests verify **system invariants** rather than repeating low-level assertions. The key insight is that many current assertions are checking local instances of what should be global invariants.

### Current Pattern (Repetitive Local Assertions)

```typescript
// Many tests repeat this pattern:
const statement = await getStatement(graphqlClient, statementId);
assert.strictEqual(statement.believerCount, 1);
assert.strictEqual(statement.disbelieverCount, 0);

const userBelief = await getUserBelief(graphqlClient, userId, statementId);
assert.strictEqual(userBelief.beliefState, BELIEVES);
```

### Desired Pattern (Reusable Invariants)

```typescript
// Tests check invariants instead:
await invariants.conceptSpace.believerCountsMatch(statementId);
await invariants.conceptSpace.userBeliefsConsistent(userId);

// Scenario-specific assertions remain:
const userBelief = await getUserBelief(graphqlClient, userId, statementId);
assert.strictEqual(userBelief.beliefState, BELIEVES,
  'User should believe after calling believeStatement');
```

## Benefits

1. **Less Repetition**: Complex validation logic is written once, used everywhere
2. **Better Error Messages**: Invariants can provide detailed context about what went wrong
3. **Property Tests Reuse Logic**: Random action tests and hand-crafted scenarios use the same validation
4. **Easier Maintenance**: Add a new invariant check once, all tests benefit
5. **Foundation for Generative Testing**: Same invariants validate both hand-crafted scenarios and randomly-generated action sequences

## What Are Invariants?

**Invariants** are properties that should **always** hold, regardless of the sequence of actions that led to the current state.

Examples:
- "A statement's `believerCount` equals the number of Belief entities with `beliefState = BELIEVES`"
- "A note's delegation chain is valid (each owner in the chain matches the actual ownership history)"
- "Total contributions to a project equal the project's balance"
- "A user's belief state matches their most recent belief event"

**Not invariants** (these are workflow-specific):
- "After Alice believes a statement, the count increases by 1" (specific to that action)
- "Search results are sorted by creation date" (query result property)
- "Alice's balance increased by ~0.4 ETH" (approximate value, context-dependent)

## Architecture

### Directory Structure

```
integration-tests/
├── src/
│   ├── invariants/
│   │   ├── index.ts              # Main invariants interface
│   │   ├── conceptspace.ts       # Concept Space invariants
│   │   ├── delegation.ts         # Delegation invariants
│   │   ├── pubstarter.ts         # Pubstarter invariants
│   │   ├── funding-portals.ts    # Funding Portal invariants
│   │   └── check-all.ts          # Convenience function to check all invariants
│   │
│   ├── scenario-tests/           # Existing hand-crafted tests (refactored)
│   │   ├── conceptspace-*.test.ts
│   │   ├── pubstarter-*.test.ts
│   │   └── ...
│   │
│   └── property-tests/           # New: random action tests
│       ├── random-actions.test.ts
│       ├── generators.ts
│       └── state-tracking.ts
```

### Invariants Interface

```typescript
// invariants/index.ts

export interface SystemInvariants {
  conceptSpace: {
    // Derived counts match actual data
    believerCountsMatch(statementId: string): Promise<void>;

    // User's belief state matches latest event
    userBeliefsConsistent(userId: string): Promise<void>;

    // Implication attestations reference valid statements
    impliedStatementsExist(statementId: string): Promise<void>;

    // Indirect supporters match implication graph
    indirectSupportersMatchImplications(statementId: string): Promise<void>;
  };

  delegation: {
    // Note balances are valid (non-negative, consistent with ledger)
    noteBalancesValid(noteId: string): Promise<void>;

    // Delegation chain is valid (each step matches ownership)
    delegationChainsValid(noteId: string): Promise<void>;

    // Total delegated amount doesn't exceed root note
    totalDelegatedNotExceedsRoot(rootNoteId: string): Promise<void>;

    // Inactive notes have zero balance
    inactiveNotesHaveZeroBalance(noteId: string): Promise<void>;
  };

  fundingPortal: {
    // Project balance matches sum of contributions
    projectBalanceMatchesContributions(projectAddr: string): Promise<void>;

    // Token supply = minted - burned
    tokenSupplyConsistent(projectAddr: string): Promise<void>;

    // Alignment attestations reference valid projects and statements
    alignmentReferencesValid(alignmentId: string): Promise<void>;
  };

  global: {
    // All statements have valid IPFS CIDs
    allStatementsHaveValidCids(): Promise<void>;

    // No orphaned entities (all foreign keys valid)
    noOrphanedEntities(): Promise<void>;

    // Indexer is synced with blockchain
    indexerSyncedWithBlockchain(): Promise<void>;
  };
}
```

## Incremental Refactoring Plan

The plan is to refactor **incrementally**, one subsystem at a time, so tests continue passing throughout the process.

### Phase 1: Extract Concept Space Invariants

**Goal**: Create the invariants infrastructure and refactor Concept Space tests.

**Steps**:

1. **Create invariants infrastructure** (`invariants/index.ts`, `invariants/conceptspace.ts`)
   - Define the `SystemInvariants` interface
   - Implement 3-5 core Concept Space invariants:
     - `believerCountsMatch(statementId)` - count believers/disbelievers from Belief entities, compare to Statement cached counts
     - `userBeliefsConsistent(userId)` - verify user's belief states match their latest events
     - `indirectSupportersMatchImplications(statementId)` - verify indirect support calculation is correct
   - Include detailed error messages showing what went wrong

2. **Refactor 2-3 Concept Space tests** to use invariants
   - Start with `conceptspace-beliefs.test.ts` - it's simple and core
   - Replace low-level assertions with invariant checks
   - Keep scenario-specific assertions (e.g., "belief state should be BELIEVES after calling believeStatement")
   - Verify tests still pass

3. **Add `checkAllInvariants()` convenience function** (`invariants/check-all.ts`)
   - Discovers all entities (statements, users, projects, etc.)
   - Runs all applicable invariants on each entity
   - Can be called at the end of any test for comprehensive validation

**Completion Criteria**:
- `invariants/conceptspace.ts` exists with 3-5 working invariants
- At least 2 Concept Space tests refactored to use them
- Tests pass

### Phase 2: Refactor Remaining Concept Space Tests

**Goal**: Apply invariants to all Concept Space tests.

**Steps**:

1. Refactor remaining Concept Space tests:
   - `conceptspace-discovery.test.ts`
   - `conceptspace-implications.test.ts`
   - `conceptspace-indirect-support.test.ts`
   - `conceptspace-multiple-attesters.test.ts`
   - `conceptspace-user-profiles.test.ts`
   - `conceptspace-create-statement-workflow.test.ts`

2. Add any new invariants discovered during refactoring

3. Consider adding query result validators (not invariants, but reusable checkers):
   - `assertSortedBySupport(results)` - verify results are correctly ordered
   - `assertPaginationValid(results, limit, offset)` - verify pagination consistency

**Completion Criteria**:
- All Concept Space tests use invariants
- No repeated low-level assertion patterns
- Tests pass

### Phase 3: Extract Delegation Invariants

**Goal**: Create and apply Delegation subsystem invariants.

**Steps**:

1. **Create delegation invariants** (`invariants/delegation.ts`)
   - `noteBalancesValid(noteId)` - verify note amounts are consistent
   - `delegationChainsValid(noteId)` - verify delegation chain integrity
   - `totalDelegatedNotExceedsRoot(rootNoteId)` - verify sum of delegated notes ≤ root
   - `inactiveNotesHaveZeroBalance(noteId)` - verify reclaimed notes are properly inactive

2. **Refactor delegation tests**:
   - `delegation-basic.test.ts`
   - `delegation-permissions.test.ts`
   - `delegation-spending.test.ts`

**Completion Criteria**:
- Delegation invariants implemented and tested
- All delegation tests refactored
- Tests pass

### Phase 4: Extract Funding Portal Invariants

**Goal**: Create and apply Funding Portal invariants.

**Steps**:

1. **Create funding portal invariants** (`invariants/funding-portals.ts`)
   - `projectBalanceMatchesContributions(projectAddr)` - sum of contributions = balance
   - `tokenSupplyConsistent(projectAddr)` - minted - burned = supply
   - `alignmentReferencesValid(alignmentId)` - verify project and statement exist

2. **Refactor funding portal tests**:
   - `fundingportal-alignment.test.ts`
   - `fundingportal-indirect-alignment.test.ts`
   - `fundingportal-leaderboards.test.ts`
   - `fundingportal-aggregated-metrics.test.ts`

**Completion Criteria**:
- Funding portal invariants implemented
- All funding portal tests refactored
- Tests pass

### Phase 5: Extract Pubstarter Invariants

**Goal**: Create and apply Pubstarter invariants.

**Steps**:

1. **Create pubstarter invariants** (`invariants/pubstarter.ts`)
   - `projectBalanceValid(projectAddr)` - verify balance consistency
   - `tokenSupplyConsistent(projectAddr)` - verify ERC1155 supply matches sales/burns
   - `contributionsMatchTokens(projectAddr)` - verify contribution records match token ownership
   - `projectStateValid(projectAddr)` - verify success/failure state is correct based on threshold/deadline

2. **Refactor pubstarter tests**:
   - `pubstarter-basic.test.ts`
   - `pubstarter-lifecycle.test.ts`
   - `pubstarter-multiple-tokens.test.ts`
   - `pubstarter-burn-tokens.test.ts`
   - `pubstarter-filtering-sorting.test.ts`
   - `pubstarter-edge-cases.test.ts`

**Completion Criteria**:
- Pubstarter invariants implemented
- All pubstarter tests refactored
- Tests pass

### Phase 6: Extract Marketplace Invariants

**Goal**: Create and apply Marketplace invariants.

**Steps**:

1. **Create marketplace invariants** (`invariants/marketplace.ts`)
   - `listingReferencesValid(listingId)` - verify listing references valid tokens
   - `orderReferencesValid(orderId)` - verify order references valid tokens
   - `tradeHistoryConsistent(tokenAddr)` - verify trades match ownership changes

2. **Refactor marketplace tests**:
   - `marketplace-secondary.test.ts`

**Completion Criteria**:
- Marketplace invariants implemented
- Marketplace tests refactored
- Tests pass

### Phase 7: Add Global Invariants

**Goal**: Add cross-cutting invariants that apply to the entire system.

**Steps**:

1. **Implement global invariants** (`invariants/global.ts`)
   - `allStatementsHaveValidCids()` - verify all statement CIDs are valid IPFS hashes
   - `noOrphanedEntities()` - verify all foreign keys point to existing entities
   - `indexerSyncedWithBlockchain()` - verify indexer has caught up to latest block

2. **Add global invariant checks** to `checkAllInvariants()`

3. **Optionally**: Add global checks to test setup/teardown hooks

**Completion Criteria**:
- Global invariants implemented
- Can be called from any test
- Consider adding to after-each hook for comprehensive validation

### Phase 8: Create Property-Based Tests

**Goal**: Add random action tests that use the same invariants.

**Steps**:

1. **Create action generators** (`property-tests/generators.ts`)
   - Random user generator (reuse from `hardhat/fake-data-generation/`)
   - Random statement generator
   - Random action generator (weighted: believeStatement, createProject, delegateNote, etc.)

2. **Create state tracker** (`property-tests/state-tracking.ts`)
   - Track known users, statements, projects, notes
   - Provide helper to select valid random actions (with preconditions satisfied)

3. **Create property test runner** (`property-tests/random-actions.test.ts`)
   - Generate N users and M statements
   - Run K rounds of random actions
   - After each action, check all invariants
   - On failure, log the full action sequence for reproduction

**Completion Criteria**:
- Property tests can generate and execute random action sequences
- Same invariants used by scenario tests validate property tests
- Property tests catch any bugs that scenario tests miss

### Phase 9: Polish and Documentation

**Goal**: Clean up, document, and make the system easy to use.

**Steps**:

1. **Document invariants**
   - Add JSDoc comments explaining what each invariant checks
   - Add examples of violations each invariant would catch

2. **Improve error messages**
   - Make invariant failures show detailed context
   - Include relevant entity data in error messages
   - Suggest possible causes

3. **Add testing guidelines** (`integration-tests/README.md`)
   - When to use invariants vs. local assertions
   - How to add new invariants
   - How to write property tests

4. **Consider performance optimizations**
   - Some invariants might be expensive (e.g., checking ALL statements)
   - Add options to check subsets or sample randomly
   - Add caching if needed

**Completion Criteria**:
- Clear documentation
- Good error messages
- Testing guidelines for future developers

## Notes for Future Implementation

### What Makes a Good Invariant?

A good invariant:
- **Always holds**, regardless of action sequence
- **Checks derived/cached data** against source of truth
- **Has a clear failure mode** - you can tell exactly what's wrong
- **Is reusable** across multiple tests

### What Should Stay as Local Assertions?

Keep local assertions for:
- **Immediate effects** of specific actions ("after believing, state should be BELIEVES")
- **Workflow sequences** ("after these 3 steps, this specific outcome")
- **Approximate values** ("balance increased by ~0.4 ETH minus gas")
- **Query result properties** ("results are sorted correctly")

### Testing the Invariants Themselves

Consider adding unit tests for invariants:
- Test that they catch violations (inject bad data, verify invariant fails)
- Test that they pass on known-good data

### Integration with Existing Fake Data Generation

The `hardhat/fake-data-generation/` system already exists and generates random users/actions. The property tests can:
- **Reuse the generators** (users, statements, action weights)
- **Add the validation layer** (check invariants after actions)
- **Bridge the gap** between "smoke test" (no crashes) and "correctness test" (results are valid)

## Success Metrics

The refactoring is successful when:

1. **Less repetition**: Common validation patterns appear once in invariants, not scattered across tests
2. **Better failures**: Invariant violations give detailed, actionable error messages
3. **Property tests work**: Random action tests use the same invariants as scenario tests
4. **Easy to extend**: Adding a new invariant is straightforward and benefits all tests
5. **Tests still pass**: All existing tests continue to work throughout the refactoring

## Starting Point

To begin this refactoring, start with **Phase 1**: Create the invariants infrastructure and refactor a few Concept Space tests. This establishes the pattern and proves the approach before expanding to other subsystems.

The implementor should feel free to adjust the plan based on what they discover during implementation. The key principle is: **extract reusable invariants that check system-wide properties, while keeping scenario-specific assertions local to tests**.
