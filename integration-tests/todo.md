# Integration Tests: Path to Generative Testing

## Current Status: 70-80% Complete

We've built an excellent property-based testing framework with automatic invariant checking. Many tests already use "checked" wrappers that automatically verify state transitions and invariants. However, we're not quite ready for generative testing yet.

## What We Have

### Framework Components ✅
- **Action framework** ([action-framework.ts](src/actions/action-framework.ts)) - Generic system for running actions with automatic property checking
- **Checked action wrappers** - Belief actions, funding actions, implication actions, alignment actions, delegation actions
- **State transition properties** - Automatically verify that actions cause expected state changes
- **Comprehensive invariants** - Money conservation, token conservation, belief count consistency, etc.

### Well-Migrated Tests ✅
- [hello-world.test.ts](src/workflows/hello-world.test.ts) - Clean, uses `believeStatementChecked`, minimal assertions
- [conceptspace-beliefs.test.ts](src/conceptspace/conceptspace-beliefs.test.ts) - Uses checked wrappers throughout

### Partially Migrated Tests ⚠️
- [conceptspace-create-statement-workflow.test.ts](src/conceptspace/conceptspace-create-statement-workflow.test.ts) - Uses checked wrappers but has manual assertions (lines 103-135, 188-191, etc.)
- [end-to-end-workflows.test.ts](src/workflows/end-to-end-workflows.test.ts) - Mixes checked actions with manual assertions
- [pubstarter-basic.test.ts](src/pubstarter/pubstarter-basic.test.ts) - Uses `buyProjectTokensChecked` but `createProject` is unchecked, manual invariant checks (lines 144-146)

## What Belongs in Tests vs What Doesn't

### ✅ These SHOULD Stay in Handcrafted Tests:
1. **Test setup** - Creating clients, contract objects
2. **Test data creation** - Specific statement content, project parameters
3. **Logging for debugging** - `testLog()` calls showing progress
4. **Scenario-specific sequencing** - The particular order of actions for this test case

### ❌ These Should Be REMOVED (handled by framework):
1. **Manual assertions of specific values after actions**
   - Example: Checking `believerCount === 1` after believing a statement
   - Should be: State transition property checks this automatically

2. **Manual invariant checks**
   - Example: Calling `assertMoneyConservation()` manually in tests
   - Should be: Invariants run automatically via action metadata

3. **Ad-hoc queries to verify state**
   - Example: Querying and asserting about notes/projects after every action
   - Should be: State transition properties capture and verify state changes

## Ideal Test Structure

Once fully migrated, a test should look like this:

```typescript
it('should create, sign, and add statement to list', async () => {
  // Setup (this stays)
  const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

  const statementData: StatementContent = {
    statementType: 'statement',
    content: 'We should invest in renewable energy.',
    title: 'Renewable Energy Investment',
  };

  // Action with automatic checking (no manual assertions!)
  const result = await createAndSignStatementChecked(
    clients,
    { beliefs: beliefsContract, mutableRefUpdater: mutableRefUpdaterContract },
    graphqlClient,
    statementData,
    { addToCreatedList: true }
  );

  // Optional: Log for debugging (this stays)
  testLog(`Created statement: ${result.cid}`);

  // That's it! No manual assertions unless verifying something
  // very specific to this particular scenario
});
```

## Path to Generative Testing

For random fake data generation, we need tests to be pure sequences of actions:

```typescript
// Future generative test
for (let i = 0; i < 100; i++) {
  const randomAction = pickRandomValidAction(currentState);
  const randomParams = generateRandomParams(randomAction);

  // Execute - all properties/invariants checked automatically!
  await executeActionChecked(randomAction, randomParams);
}
```

**We're not quite there yet because:**
1. Some actions don't have checked wrappers
2. Manual assertions are scattered throughout tests
3. Manual invariant calls haven't been moved to action metadata

## Concrete Next Steps

### Phase 1: Complete the Migration
- [ ] **Create checked wrappers for all remaining actions**
  - [ ] Any other SDK actions used in tests

- [ ] **Remove manual assertions from tests**
  - [ ] Review each test file
  - [ ] Delete ad-hoc state verification (rely on state transition properties)
  - [ ] Keep only scenario-specific logging


- [ ] **Audit all test files**
  - [ ] Go through each of the ~25 test files
  - [ ] Ensure consistent use of checked wrappers
  - [ ] Document any exceptions (actions that can't be checked)

### Phase 2: Prepare for Generative Testing
- [ ] **Add preconditions to action metadata** (optional but helpful)
  - [ ] Define when each action is valid
  - [ ] Example: Can only buy tokens if project exists and isn't expired

- [ ] **Add parameter generation helpers**
  - [ ] Random statement content generator
  - [ ] Random project parameters generator
  - [ ] Random amounts within valid ranges

- [ ] **Create action sequence validator**
  - [ ] Given current state, which actions are valid?
  - [ ] Select random action weighted by importance

### Phase 3: Build Generative Test Runner
- [ ] **Implement random action sequence generator**
- [ ] **Add shrinking/simplification for failures**
- [ ] **Create seed-based reproduction**
- [ ] **Add configurable test length/complexity**

## When Are We Ready?

You'll know you're ready for generative testing when:

1. ✅ Every action used in tests has a checked wrapper
2. ✅ Test files contain mostly action calls, minimal assertions
3. ✅ No manual invariant checks in test files
4. ✅ All property checking happens via the framework
5. ✅ You could run any valid action sequence without test failures

**Current estimate: 70-80% there**

The framework is solid. Main work remaining: finish migrating tests to use it consistently.

## References

- [README.md](README.md) - Test approach overview
- [analysis.md](analysis.md) - Detailed framework analysis
- [src/actions/action-framework.ts](src/actions/action-framework.ts) - Core framework
- [src/actions/*-actions-checked.ts](src/actions/) - Checked action wrappers
