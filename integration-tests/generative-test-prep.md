# Framework for Generative Testing with Real Validation

This document outlines a framework for thinking about generative testing with proper validation (beyond smoke tests). The goal is to run random fake data through the system and validate that it behaves correctly, not just that it doesn't throw errors.

## Core Principle

With random data, you can't check "is this the right answer?" but you CAN check "are all these different views of the answer consistent with each other?"

---

## 1. State Consistency Invariants

These properties should always be true, regardless of what random actions you perform:

- **Belief counts match belief records**: For any statement, `believerCount` should equal the number of UserBelief records with `beliefState=BELIEVES`, and same for disbelievers
- **Token conservation**: Total tokens sold from a project = sum of tokens held by all users + tokens burned
- **Money conservation**: In an assurance contract, total ETH raised = sum of individual contributions (before/after withdrawal/refunds)
- **Delegation chain integrity**: Following a delegation chain should never create a cycle; every delegated note should have a valid spender
- **Implication bidirectionality**: If the indexer shows S1→S2, the blockchain should have that ImplicationAttestation event

## 2. State Transition Properties

When action X happens, verify specific changes:

- **Belief transitions**: When user changes from BELIEVES to DISBELIEVES, `believerCount` should decrease by 1 AND `disbelieverCount` should increase by 1 (atomic state change)
- **Project funding**: When someone buys tokens worth X ETH, the project's `totalRaised` should increase by exactly X
- **Indirect support propagation**: When you attest S1→S2, anyone who believes S1 should now appear in S2's indirect supporters list (if they're not explicitly disbelieving S2)
- **Token transfers**: When tokens move from user A to user B via secondary market, A's balance decreases by N and B's balance increases by N in the same block

## 3. Query Consistency

Different ways to query the same data should return consistent results:

- **Direct vs aggregated counts**: Querying individual UserBelief records and counting them should match the `believerCount` field on the Statement
- **Event replay**: Replaying all blockchain events from genesis should produce the same indexer state as the current indexed state
- **Graph traversal**: Getting indirect supporters by querying implications separately vs using a single federated query should return the same set of users

## 4. Business Logic Constraints

Domain-specific rules that must hold:

- **Assurance contract refunds**: Before deadline + below threshold → refunds allowed; after deadline + above threshold → refunds not allowed
- **Implication non-transitivity**: Just because S1→S2 and S2→S3 exist doesn't mean the system should show S1's believers as indirect supporters of S3 (unless there's a direct S1→S3 attestation)
- **Delegation permissions**: A user should only be able to spend a delegated note if they're the current spender (following the full delegation chain)
- **Unique statements**: Two statements with identical IPFS content should have the same statementId (CID-based deduplication)

## 5. Edge Case Validation

Properties that should hold even in weird situations:

- **Empty states**: A statement with zero believers and zero disbelievers should have `believerCount=0`, `disbelieverCount=0`
- **Self-references**: If a user somehow creates S1→S1, they shouldn't appear as their own indirect supporter (or should they? Define the behavior)
- **Orphaned data**: Every UserBelief should reference a Statement that exists; every ProjectContribution should reference a Project that exists
- **Concurrent actions**: If two users believe the same statement in the same block, the count should increase by 2, not 1

## 6. Temporal/Historical Properties

Things that should be true about the history:

- **Monotonic counters**: A statement's `totalEverBelievers` (if you tracked this) should never decrease across blocks
- **Event ordering**: The blockchain events should match the GraphQL query results when sorted by block number and transaction index
- **Time-bounded queries**: Querying "statements created in the last N blocks" should return a subset of "all statements"

## 7. Derived Metrics Validation

For complex calculated fields:

- **Indirect support calculation**: For each statement S, manually compute indirect supporters by (1) finding all S' where trusted_attester attested S'→S, (2) union all believers of those S', (3) exclude explicit disbelievers of S. Compare to the indexer's result.
- **Leaderboard rankings**: If user A contributed more total ETH to climate-aligned projects than user B, A should rank higher on the climate leaderboard
- **Funding available**: Total delegatable funding for a cause = sum of all notes delegated to spenders who could spend on that cause

## 8. Cross-Subsystem Consistency

Since you have multiple indexers:

- **Federated queries**: The Funding Portal indexer's view of a statement's supporters should match the Concept Space indexer's view
- **Smart contract state**: Any data duplicated between indexers and smart contracts (like belief states) should match when queried directly from the chain vs from GraphQL

---

## How to Structure Tests

For each generative test run:

1. **Setup**: Generate random universe (N users, M statements, K projects)
2. **Execute**: Run random actions for X rounds
3. **Validate after each action** (or batch of actions):
   - Check relevant invariants
   - Verify state transitions were correct
   - Spot-check some query consistency
4. **Final validation**:
   - Check all invariants hold
   - Do comprehensive cross-checks between different query methods
   - Verify event replay produces same state

### Test Categorization

You could categorize tests by what you're checking:

- **Quick invariants**: Run after every action (cheap checks)
- **Expensive validation**: Run every N actions or at the end
- **Statistical properties**: Only meaningful after many actions (e.g., "no user should have >90% of all tokens")

---

## Implementation Strategy

### Phase 1: Add Invariant Checks to Existing Tests

Incrementally refactor existing integration tests to include invariant checking:

1. Start with state consistency invariants (Section 1) - add helper functions to verify these
2. Add state transition checks (Section 2) - verify before/after states around actions
3. Add query consistency checks (Section 3) - compare different ways of getting the same data

### Phase 2: Generic Invariant Framework

Create reusable invariant-checking utilities:

- `assertBeliefCountsMatch(graphqlClient, statementId)` - checks invariant from Section 1
- `assertStateTransition(before, after, expectedChanges)` - checks Section 2 properties
- `assertQueryConsistency(query1Result, query2Result)` - checks Section 3 properties

### Phase 3: Generative Test Integration

Once invariants are proven in handcrafted tests, integrate into generative testing:

1. Run the fake-data generation system
2. After each batch of actions, run invariant checks
3. Collect violations and report them
4. Use the same invariant functions from the integration tests

---

## Current Status

This is a planning document. As we implement invariant checks, we'll track progress here.

See [INVARIANT_IMPLEMENTATION.md](INVARIANT_IMPLEMENTATION.md) for detailed implementation notes.

- [ ] Section 1: State Consistency Invariants
  - [x] **Belief counts match belief records** - Implemented in `src/invariants.ts`, used in `conceptspace-beliefs.test.ts`
  - [x] **Token conservation** - Implemented in `src/invariants.ts`, used in `pubstarter-burn-tokens.test.ts`, `pubstarter-basic.test.ts`, `pubstarter-lifecycle.test.ts`, `pubstarter-multiple-tokens.test.ts`
  - [x] **Money conservation** - Implemented in `src/invariants.ts`, used in `pubstarter-basic.test.ts`, `pubstarter-lifecycle.test.ts`, `pubstarter-multiple-tokens.test.ts`
  - [ ] Delegation chain integrity
  - [ ] Implication bidirectionality (blockchain-to-indexer verification)
- [x] Section 2: State Transition Properties
  - [x] **Belief transitions** - Implemented in `src/belief-action-properties.ts`, used in `conceptspace-beliefs.test.ts`
  - [x] **Project funding** - Implemented in `src/funding-action-properties.ts`, used in `pubstarter-*.test.ts`
  - [x] **Implication bidirectionality** - Implemented in `src/implication-action-properties.ts`, used in `conceptspace-implications.test.ts`
  - [ ] Indirect support propagation
  - [ ] Token transfers
- [ ] Section 3: Query Consistency
- [ ] Section 4: Business Logic Constraints
- [ ] Section 5: Edge Case Validation
- [ ] Section 6: Temporal/Historical Properties
- [ ] Section 7: Derived Metrics Validation
- [ ] Section 8: Cross-Subsystem Consistency
