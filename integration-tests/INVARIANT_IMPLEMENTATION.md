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

## Next Steps

The following invariants from [generative-test-prep.md](generative-test-prep.md) should be implemented next:

### Section 1: State Consistency Invariants

- [ ] **Token conservation**: Total tokens sold from a project = sum of tokens held by all users + tokens burned
- [ ] **Delegation chain integrity**: Following a delegation chain should never create a cycle
- [ ] **Implication bidirectionality**: If the indexer shows S1→S2, the blockchain should have that ImplicationAttestation event

### Section 2: State Transition Properties

- [ ] **Belief transitions**: When user changes from BELIEVES to DISBELIEVES, verify atomic state change
- [ ] **Project funding**: When someone buys tokens worth X ETH, verify `totalRaised` increases by exactly X
- [ ] **Indirect support propagation**: When you attest S1→S2, verify believers of S1 appear in S2's indirect supporters
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
