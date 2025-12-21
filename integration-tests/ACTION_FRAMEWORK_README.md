# Action Framework for State Transition Property Checking

This framework provides first-class support for automatically verifying state transition properties and invariants when executing actions in tests.

## Overview

Instead of manually writing repetitive property checks:

```typescript
// OLD WAY
const hash = await believeStatement(clients, contract, cid);
const receipt = await clients.publicClient.getTransactionReceipt({ hash });
await waitForSync(graphqlClient, receipt.blockNumber);

const before = await getStatement(graphqlClient, statementId);
// ... manual property checks ...
assert.strictEqual(after.believerCount, before.believerCount + 1);
await assertBeliefCountsMatch(graphqlClient, statementId);
```

You can use checked action wrappers that automatically verify properties:

```typescript
// NEW WAY
await believeStatementChecked(clients, contract, graphqlClient, cid);
// Action executed, synced, and all properties verified automatically!
```

## Architecture

The framework consists of three main components:

### 1. Core Framework ([action-framework.ts](src/action-framework.ts))

Provides the infrastructure for associating actions with properties:

- **`ActionMetadata`**: Describes an action and its associated properties
- **`StateTransitionProperty`**: Checks that an action causes expected state changes
- **`InvariantCheck`**: Verifies consistency properties at a point in time
- **`runActionAndCheckProperties()`**: Executes an action and verifies all associated properties

### 2. Property Definitions ([belief-action-properties.ts](src/belief-action-properties.ts))

Defines the specific properties for each category of actions. For belief actions:

- **`beliefTransitionProperty`**: Verifies that believer/disbeliever counts change correctly when users change their beliefs
- **`beliefCountsInvariant`**: Verifies that cached counts match individual belief records

### 3. Checked Action Wrappers ([belief-actions-checked.ts](src/belief-actions-checked.ts))

Provides drop-in replacements for SDK actions that include automatic property checking:

- `believeStatementChecked()`
- `disbelieveStatementChecked()`
- `clearOpinionChecked()`

## Usage

### In Tests

Replace unchecked SDK actions with checked wrappers:

```typescript
// Import the checked wrappers
import {
  believeStatementChecked,
  disbelieveStatementChecked,
  clearOpinionChecked,
} from './belief-actions-checked.js';

// Use them in place of the original SDK actions
await believeStatementChecked(clients, beliefsContract, graphqlClient, statementCid);
```

### Controlling Which Checks Run

You can skip specific checks when needed:

```typescript
// Skip all invariants (useful for setup phases)
await believeStatementChecked(clients, contract, graphqlClient, cid, {
  skipInvariants: true
});

// Skip specific properties by name
await believeStatementChecked(clients, contract, graphqlClient, cid, {
  skipSpecificInvariants: ['beliefCountsMatch'],
  skipSpecificTransitions: ['beliefTransition']
});

// Skip expensive checks for fast test runs
await believeStatementChecked(clients, contract, graphqlClient, cid, {
  skipExpensiveChecks: true
});
```

## Key Features

1. **DRY**: Eliminates repetitive boilerplate in tests
2. **Guaranteed Coverage**: Can't forget to check properties
3. **Automatic Sync**: Waits for the indexer to sync before checking properties
4. **Composability**: Actions work seamlessly in both handcrafted and generative tests
5. **Better Error Messages**: Property failures include context about which action caused the violation
6. **Flexibility**: Can still skip checks when needed

**Note:** Checked actions automatically wait for the indexer to sync after executing the blockchain transaction. This ensures properties are checked against the most up-to-date indexer state. You don't need to call `waitForSync` manually.

## Example: Refactored Test

See [conceptspace-beliefs.test.ts](src/conceptspace-beliefs.test.ts) for a complete example of a test file that's been refactored to use the framework.

**Before (manual property checking):**
```typescript
const hash = await believeStatement(clients, beliefsContract, statementCid);
const receipt = await clients.publicClient.getTransactionReceipt({ hash });
await waitForSync(graphqlClient, receipt.blockNumber, 15000);

let statement = assertNotNull(await getStatement(graphqlClient, statementId), 'Statement');
assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');
assert.strictEqual(statement.disbelieverCount, 0, 'Statement should have 0 disbelievers');
await assertBeliefCountsMatch(graphqlClient, statementId);
```

**After (automatic property checking):**
```typescript
await believeStatementChecked(clients, beliefsContract, graphqlClient, statementCid);
// That's it! Transaction executed, indexer synced, and properties verified automatically
```

## Adding New Action Categories

To add property checking for new types of actions (e.g., funding, delegation):

1. **Define properties** in a new file (e.g., `funding-action-properties.ts`):
   ```typescript
   export const moneyConservationProperty: StateTransitionProperty = {
     name: 'moneyConservation',
     captureState: async (ctx) => { /* ... */ },
     check: async (ctx, before, after) => { /* ... */ }
   };
   ```

2. **Create checked wrappers** (e.g., `funding-actions-checked.ts`):
   ```typescript
   export async function buyTokensChecked(...) {
     const context: ActionContext = { /* ... */ };
     return await runActionAndCheckProperties(
       () => buyTokens(...),
       buyTokensMetadata,
       context
     );
   }
   ```

3. **Use in tests**:
   ```typescript
   await buyTokensChecked(clients, pubstarterContract, graphqlClient, projectAddress, amount);
   ```

## Future: Generative Testing

This framework is designed to work seamlessly with generative testing:

```typescript
// After generating random actions
for (const action of randomActions) {
  // Properties checked automatically for each action
  await runActionAndCheckProperties(action, metadata, context);
}

// Additional comprehensive checks at the end
for (const statementId of allStatementIds) {
  await assertBeliefCountsMatch(graphqlClient, statementId);
}
```

## Related Documentation

- [generative-test-prep.md](generative-test-prep.md) - Framework for generative testing
- [INVARIANT_IMPLEMENTATION.md](INVARIANT_IMPLEMENTATION.md) - Implementation progress for invariants
