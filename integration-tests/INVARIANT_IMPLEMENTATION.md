# Invariant Implementation Progress

This document tracks the implementation of invariant checking in the integration tests, as outlined in [generative-test-prep.md](generative-test-prep.md).

## Implemented Invariants

### ✅ State Consistency Invariant #1: Belief Counts Match Belief Records

**Location:** [src/invariants.ts](src/invariants.ts)

**Function:** `assertBeliefCountsMatch(graphqlClient, statementId)`

**What it checks:**
- For any statement, `believerCount` should equal the number of UserBelief records with `beliefState=BELIEVES` (1)
- For any statement, `disbelieverCount` should equal the number of UserBelief records with `beliefState=DISBELIEVES` (2)

**How it works:**
1. Queries the Statement entity to get cached `believerCount` and `disbelieverCount`
2. Queries all UserBelief records with `beliefState=1` for that statement
3. Queries all UserBelief records with `beliefState=2` for that statement
4. Asserts that the cached counts match the actual record counts

**Where it's used:**
- [src/conceptspace-beliefs.test.ts](src/conceptspace-beliefs.test.ts) - Added 8 invariant checks at key points:
  - After expressing belief (should have 1 believer, 0 disbelievers)
  - After changing to disbelief (should have 0 believers, 1 disbeliever)
  - After clearing opinion (should have 0 believers, 0 disbelievers)
  - After multiple users express beliefs
  - After multiple statements are independently tracked

**Why this matters:**
This invariant catches bugs where:
- The indexer fails to update cached counts when belief state changes
- Race conditions cause count updates to be lost
- Database transactions don't properly commit both the belief record and the count update

### ✅ State Consistency Invariant #2: Money Conservation

**Location:** [src/invariants.ts](src/invariants.ts)

**Function:** `assertMoneyConservation(graphqlClient, projectAddress)`

**What it checks:**
- For any assurance contract (project), `totalReceived` should equal the sum of all individual `Contribution` record amounts

**How it works:**
1. Queries the Project entity to get cached `totalReceived`
2. Queries all Contribution records for that project
3. Sums up the `amount` field from all individual contributions
4. Asserts that the cached total matches the sum of individual contributions

**Where it's used:**
- [src/pubstarter-basic.test.ts](src/pubstarter-basic.test.ts) - Added 2 invariant checks:
  - After project creation (should have 0 contributions)
  - After token purchase (should match contribution total)
- [src/pubstarter-lifecycle.test.ts](src/pubstarter-lifecycle.test.ts) - Added 3 invariant checks:
  - After project creation (initial state)
  - After reaching threshold (successful project)
  - After contribution to failed project
- [src/pubstarter-multiple-tokens.test.ts](src/pubstarter-multiple-tokens.test.ts) - Added 1 invariant check:
  - After multiple purchases of different token types (comprehensive test)

**Why this matters:**
This invariant catches bugs where:
- The indexer fails to update `totalReceived` when new contributions are made
- Contribution amounts are miscalculated or lost during indexing
- Database transactions don't properly commit both the contribution record and the total update
- Token price calculations result in incorrect funding amounts

**Note:**
This checks money conservation at the indexer level (query consistency). A more comprehensive cross-system check (Section 8) would also verify that the indexer's `totalReceived` matches the actual ETH balance in the assurance contract on the blockchain.

### ✅ State Transition Property #1: Project Funding

**Location:** [src/funding-action-properties.ts](src/funding-action-properties.ts)

**Property:** `projectFundingProperty`

**What it checks:**
- When someone buys tokens worth X ETH, the project's `totalReceived` should increase by exactly X
- The contribution count should increase by exactly 1

**How it works:**
1. **Before state capture:** Queries the Project entity to get current `totalReceived` and contribution count
2. **Action execution:** Executes `buyProjectTokens` and waits for indexer sync
3. **After state capture:** Re-queries the Project entity to get updated values
4. **Verification:**
   - Asserts `totalReceived` increased by exactly the contribution amount
   - Asserts contribution count increased by 1
   - Also runs the `moneyConservationInvariant` to verify totals match individual contributions

**Integrated with action framework:**
- **Action metadata:** `buyProjectTokensMetadata` in [src/funding-action-properties.ts](src/funding-action-properties.ts)
- **Checked wrapper:** `buyProjectTokensChecked` in [src/funding-actions-checked.ts](src/funding-actions-checked.ts)
- Uses the same pattern as belief actions for automatic property checking

**Where it's used:**
- [src/pubstarter-basic.test.ts](src/pubstarter-basic.test.ts) - Refactored to use `buyProjectTokensChecked`
- [src/pubstarter-lifecycle.test.ts](src/pubstarter-lifecycle.test.ts) - Refactored to use `buyProjectTokensChecked` (3 calls)
- [src/pubstarter-multiple-tokens.test.ts](src/pubstarter-multiple-tokens.test.ts) - Refactored to use `buyProjectTokensChecked` (3 calls)

**Why this matters:**
This property catches bugs where:
- Contributions are not properly tracked when tokens are purchased
- The wrong amount is recorded (e.g., off-by-one errors, rounding issues)
- Multiple contributions in the same block interfere with each other
- The indexer loses or duplicates contribution data

**Benefits of the action framework approach:**
- **DRY:** Tests are now much shorter - no need to manually capture before/after state or write assertions
- **Consistency:** Same property checks run on every `buyProjectTokens` call across all tests
- **Composability:** Ready to use in generative testing scenarios
- **Automatic sync:** Wrapper handles waiting for indexer sync automatically
- **Better errors:** Property violations include context about which action failed

**Example usage:**
```typescript
// Old way (manual):
const beforeProject = await getProject(graphqlClient, projectAddress);
const hash = await buyProjectTokens(clients, assuranceContract, params);
const receipt = await clients.publicClient.getTransactionReceipt({ hash });
await waitForSync(graphqlClient, receipt.blockNumber);
const afterProject = await getProject(graphqlClient, projectAddress);
assert.strictEqual(
  BigInt(afterProject.totalReceived),
  BigInt(beforeProject.totalReceived) + params.totalCost
);
await assertMoneyConservation(graphqlClient, projectAddress);

// New way (automatic):
await buyProjectTokensChecked(clients, assuranceContract, graphqlClient, params);
// All properties automatically verified!
```

### ✅ State Transition Property #2: Implication Bidirectionality

**Location:** [src/implication-action-properties.ts](src/implication-action-properties.ts)

**Property:** `implicationBidirectionalityProperty`

**What it checks:**
- When an attester creates an implication from statement A to statement B:
  - The implication appears in "implications from A" queries
  - The implication appears in "implications to B" queries
  - Both counts increase by exactly 1 (unless the implication already existed)
  - The attester is correctly recorded

**How it works:**
1. **Before state capture:** Queries implications from/to both statements and checks if this specific implication already exists
2. **Action execution:** Executes `attestImplication` and waits for indexer sync
3. **After state capture:** Re-queries implications from/to both statements
4. **Verification:**
   - If implication didn't exist before: asserts both counts increased by 1
   - If implication already existed: asserts counts remained the same (idempotent)
   - Verifies the specific implication can be queried from both directions
   - Verifies attester identity is preserved

**Integrated with action framework:**
- **Action metadata:** `attestImplicationMetadata` in [src/implication-action-properties.ts](src/implication-action-properties.ts)
- **Checked wrapper:** `attestImplicationChecked` in [src/implication-actions-checked.ts](src/implication-actions-checked.ts)
- **Invariant check:** `implicationBidirectionalityInvariant` verifies query consistency from both directions (marked expensive)

**Where it's used:**
- [src/conceptspace-implications.test.ts](src/conceptspace-implications.test.ts) - Refactored to use `attestImplicationChecked` (4 calls across all tests)
  - Test 1: Single implication attestation
  - Test 2: Implication for indirect support tracking
  - Test 3: Multiple implications to same statement
  - Test 4: Implication chains (non-transitive verification)

**Why this matters:**
This property catches bugs where:
- The blockchain event was emitted but not properly indexed
- Implications are queryable from one direction but not the other
- Duplicate implications are created instead of being idempotent
- The attester identity is lost or corrupted during indexing
- The indexer creates asymmetric graph edges

**Benefits of the action framework approach:**
- **DRY:** Tests are much shorter - no need to manually query and verify from both directions
- **Consistency:** Same property checks run on every `attestImplication` call across all tests
- **Composability:** Ready to use in generative testing scenarios
- **Bidirectional verification:** Automatically ensures graph consistency
- **Better errors:** Property violations include context about which direction failed

**Example usage:**
```typescript
// Old way (manual):
const txHash = await attestImplication(
  clients,
  implicationsContract,
  fromCid,
  toCid
);
const receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
await waitForSync(graphqlClient, receipt.blockNumber);

// Manually verify from both directions
const implicationsFrom = await getImplicationsFrom(graphqlClient, fromId);
assert.strictEqual(implicationsFrom.length, 1);
const implicationsTo = await getImplicationsTo(graphqlClient, toId);
assert.strictEqual(implicationsTo.length, 1);
// ... more manual checks

// New way (automatic):
await attestImplicationChecked(
  clients,
  implicationsContract,
  graphqlClient,
  fromCid,
  toCid
);
// All properties automatically verified from both directions!
```

### ✅ State Transition Property #3: Indirect Support Propagation

**Location:** [src/implication-action-properties.ts](src/implication-action-properties.ts)

**Property:** `indirectSupportPropagationProperty`

**What it checks:**
- When an attester creates an implication from statement A to statement B:
  - Users who believe statement A should appear as indirect supporters of statement B
  - Users who explicitly disbelieve statement B should NOT appear as indirect supporters (even if they believe A)
  - The indirect supporter count should not decrease
  - The indexer correctly propagates support through the implication graph

**How it works:**
1. **Before state capture:** Captures the current indirect supporter count and list of addresses for the "to" statement
2. **Action execution:** Executes `attestImplication` and waits for indexer sync
3. **After state capture:** Re-captures the indirect supporter count and addresses
4. **Verification:**
   - Asserts that indirect supporter count did not decrease
   - If `expectedIndirectSupporters` are provided in context.extra, verifies each one:
     - If the user explicitly disbelieves the target statement, they should NOT be in indirect supporters
     - Otherwise, they should appear in the indirect supporters list

**Integrated with action framework:**
- **Action metadata:** `attestImplicationMetadata` in [src/implication-action-properties.ts](src/implication-action-properties.ts)
- **Checked wrapper:** `attestImplicationChecked` in [src/implication-actions-checked.ts](src/implication-actions-checked.ts)
- **Optional parameter:** Can pass expected indirect supporters for stricter verification

**Where it's used:**
- [src/conceptspace-indirect-support.test.ts](src/conceptspace-indirect-support.test.ts) - Refactored all 6 tests to use `attestImplicationChecked`:
  - Test 1: Compute indirect supporter count (verifies 2 believers propagate)
  - Test 2: Return list of indirect supporters with details (verifies multiple chains)
  - Test 3: Exclude users who explicitly disbelieve (verifies filtering logic)
  - Test 4: Handle multiple implication chains converging (verifies 3 convergent paths)
  - Test 5: Handle user believing multiple implying statements (verifies deduplication)
  - Test 6: Efficiently get all indirect support for a user (comprehensive test)

**Why this matters:**
This property catches bugs where:
- The indexer fails to compute indirect support through implication chains
- Believers of the "from" statement don't appear as indirect supporters of the "to" statement
- Users who explicitly disbelieve the target are incorrectly included in indirect support
- The indirect support graph becomes corrupted or inconsistent
- Support propagation breaks when multiple implications converge on one statement

**Benefits of the action framework approach:**
- **DRY:** Tests are much shorter - no need to manually verify indirect support after each implication
- **Consistency:** Same property checks run on every `attestImplication` call across all tests
- **Flexible verification:** Can optionally pass expected believers for stricter checking
- **Composability:** Ready to use in generative testing scenarios
- **Better errors:** Property violations include context about which users should/shouldn't be supporters

**Example usage:**
```typescript
// Without expected supporters (basic check - count should not decrease)
await attestImplicationChecked(
  clients,
  implicationsContract,
  graphqlClient,
  specificStatementCid,
  generalStatementCid
);

// With expected supporters (strict check - verifies specific users appear)
await attestImplicationChecked(
  clients,
  implicationsContract,
  graphqlClient,
  specificStatementCid,
  generalStatementCid,
  [user1.account, user2.account] // These users believe the specific statement
);
// Automatically verifies that user1 and user2 appear in general statement's indirect supporters
// (unless they explicitly disbelieve the general statement)
```

## Next Steps

The following invariants from [generative-test-prep.md](generative-test-prep.md) should be implemented next:

### Section 1: State Consistency Invariants

- [ ] **Token conservation**: Total tokens sold from a project = sum of tokens held by all users + tokens burned
- [ ] **Delegation chain integrity**: Following a delegation chain should never create a cycle
- [ ] **Implication bidirectionality**: If the indexer shows S1→S2, the blockchain should have that ImplicationAttestation event

### Section 2: State Transition Properties

- [x] **Belief transitions**: When user changes from BELIEVES to DISBELIEVES, verify atomic state change - Implemented using action framework in `belief-action-properties.ts`, used in `conceptspace-beliefs.test.ts`
- [x] **Project funding**: When someone buys tokens worth X ETH, verify `totalReceived` increases by exactly X - Implemented using action framework in `funding-action-properties.ts`, used in `pubstarter-*.test.ts`
- [x] **Implication bidirectionality**: When attesting S1→S2, verify implication appears in both "from" and "to" queries - Implemented using action framework in `implication-action-properties.ts`, used in `conceptspace-implications.test.ts`
- [x] **Indirect support propagation**: When you attest S1→S2, verify believers of S1 appear in S2's indirect supporters - Implemented using action framework in `implication-action-properties.ts`, used in `conceptspace-indirect-support.test.ts`
- [ ] **Token transfers**: When tokens move via secondary market, verify balances change correctly

### Section 3: Query Consistency

- [ ] **Direct vs aggregated counts**: Count individual records vs cached counts for various entities
- [ ] **Event replay**: Replay all blockchain events and verify indexer state matches
- [ ] **Graph traversal**: Verify different query methods return consistent results

## Implementation Guidelines

When adding new invariant checks:

1. **Create the invariant function in [src/invariants.ts](src/invariants.ts)**
   - Use clear, descriptive names like `assertTokenConservation()`
   - Add comprehensive JSDoc comments explaining what the invariant checks
   - Include the section number from [generative-test-prep.md](generative-test-prep.md) in the comment

2. **Add calls to the invariant in relevant test files**
   - Call the invariant after actions that could violate it
   - Call it at the end of complex test scenarios
   - Don't overdo it - use judgment about when checks add value

3. **Update this document**
   - Move the invariant from "Next Steps" to "Implemented Invariants"
   - Document where it's used
   - Explain why it matters

4. **Consider performance**
   - Some invariants may be expensive (e.g., replaying all events)
   - Mark expensive checks clearly and use them sparingly
   - Consider making them opt-in via environment variables

## Usage in Generative Testing

Once we have a good library of invariant checks, they can be used in generative testing:

```typescript
// After generating and executing random actions
for (const statementId of allStatementIds) {
  await assertBeliefCountsMatch(graphqlClient, statementId);
}

for (const projectAddress of allProjectAddresses) {
  await assertTokenConservation(graphqlClient, projectAddress);
  await assertMoneyConservation(graphqlClient, projectAddress);
}

// etc.
```

This allows us to verify system correctness at scale, not just with handcrafted test scenarios.
