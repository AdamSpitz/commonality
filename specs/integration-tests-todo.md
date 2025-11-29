# Integration Tests TODO

This document analyzes the current integration test coverage and identifies gaps based on the system specifications in [queries-and-actions.md](queries-and-actions.md) and [README.md](README.md).

## Current Test Coverage

### ✅ Already Implemented

#### Conceptspace - Beliefs
- [conceptspace-beliefs.test.ts](../integration-tests/src/conceptspace-beliefs.test.ts)
  - Single user: believe, disbelieve, clear opinion
  - Multiple users on same statement
  - Multiple statements tracked independently

#### Conceptspace - Implications
- [conceptspace-implications.test.ts](../integration-tests/src/conceptspace-implications.test.ts)
  - Record implication attestations
  - Track indirect support via implications (basic)
  - Multiple implications to same statement
  - Verify non-transitivity of implications

#### Pubstarter - Basic
- [pubstarter-basic.test.ts](../integration-tests/src/pubstarter-basic.test.ts)
  - Create project
  - Buy project tokens
  - Verify funding progress

#### Delegation - Basic
- [delegation-basic.test.ts](../integration-tests/src/delegation-basic.test.ts)
  - Deposit ETH into notes
  - Full delegation (one user to another)
  - Partial delegation (splitting notes)
  - Multi-level delegation chains
  - Revoke delegations
  - Reclaim funds
  - Track notes by root depositor

#### Funding Portal - Alignment
- [fundingportal-alignment.test.ts](../integration-tests/src/fundingportal-alignment.test.ts)
  - Single project alignment attestation
  - Multiple attesters for same project-statement pair
  - Batch attest multiple alignments
  - One project aligned to multiple statements

---

## Missing Test Coverage

## A. Conceptspace Tests

### A1. Statement Discovery & Browsing
**Priority: Medium**

Missing queries:
- Browse/search statements by most supporters (direct + indirect)
- Browse by trending (velocity of new signatures)
- Browse newest statements
- Search statements by keyword/content
- View statement suggestions ("you signed S1, maybe sign S2 which is more popular")
- View statements that reference other statements (coalition/commonality)

**Rationale:** These are core discovery features but we haven't tested the queries. Need to verify the indexer properly computes these metrics.

### A2. Statement Content Rendering
**Priority: Low-Medium**

Missing tests:
- Different statement types (text, conjunction, etc. per [statements.md](statements.md))
- Rendering statements with references to other statements
- Depth limits on reference expansion

**Rationale:** The spec mentions various statement types and reference handling. Should verify the system handles these correctly.

### A3. Indirect Support Computation
**Priority: High**

Current gap: While we test that implications are recorded, we don't thoroughly test the **computation of indirect supporters**.

Missing tests:
- Query a statement's indirect supporter count
- Verify indirect supporters list (users who believe statements that imply this one)
- Exclude users who explicitly disbelieve from indirect support count
- Multiple implication chains converging on one statement
- Different trusted attesters (user configures which attesters to trust)

**Rationale:** Indirect support is a core feature. Need to verify the indexer computes this correctly.

### A4. User Profile Queries
**Priority: Medium**

Missing queries:
- View user's directly signed statements
- View user's indirectly supported statements (via implications)
- View another user's profile and statements

**Rationale:** User pages are a key UI feature specified in the docs.

---

## B. Pubstarter Tests

### B1. Project Lifecycle
**Priority: High**

Missing scenarios:
- Project reaches threshold → successful → withdrawal
- Project fails to reach threshold → refunds
- Project deadline expiration
- Multiple contributors to same project
- Contributor leaderboards

**Rationale:** Assurance contract mechanics are critical. We test basic buying but not the full lifecycle.

### B2. Multiple Token Types
**Priority: Medium**

Missing tests:
- Buy different token types from same project
- Different prices per token type
- Track token holdings by type

**Rationale:** Projects use ERC-1155 with multiple token types, but we don't thoroughly test this.

### B3. Burning Tokens (Donors vs Investors)
**Priority: Medium**

Missing actions:
- User burns tokens (converting from investor to donor)
- Verify burned token tracking
- Display donor vs investor distinction

**Rationale:** The retroactive funding model distinguishes donors from investors. Need to test this.

---

## C. Delegation Tests

### C1. Commission Structures
**Priority: Low (future feature)**

Missing tests:
- Specify commission percentage for delegates
- Track commission earnings
- Commission distribution on note spending

**Rationale:** Mentioned in spec but may not be implemented yet. Mark as "not implemented" if so.

### ✅ C2. Spending Notes
**Priority: High**
**Status: COMPLETED**

Implemented in [delegation-spending.test.ts](../integration-tests/src/delegation-spending.test.ts):
- ✅ Spend a delegatable note to fund a project
- ✅ Verify delegation chain attribution in project contributions
- ✅ Delegate spends on behalf of root owner (multi-level chains)
- ✅ Track transparency (full delegation chains visible)
- ✅ Spend partial amounts from delegatable notes

**Tests verify:**
- Users can spend delegatable notes to purchase project tokens via `purchaseFromPrimaryMarket`
- Projects correctly receive funds and track total received amount
- Contributions are recorded in the indexer with proper metadata
- Multi-level delegation chains (user1 → user2 → user3) work correctly
- Partial spending from notes (e.g., spend 2 ETH from 10 ETH note)
- Note: Attribution is tracked via the DelegatableNotes contract as participant; actual user attribution comes from delegation chains

**Rationale:** The whole point of delegatable notes is spending them!

### C3. Note Merging
**Priority: Low-Medium**

Missing tests:
- Merge notes with identical delegation chains
- Verify merged note properties

**Rationale:** Mentioned in queries-and-actions.md as a supported action.

### C4. Notes by Statement/Cause
**Priority: Medium**

Missing queries:
- View available notes for a specific statement/cause
- Filter notes by intended statement

**Rationale:** Users should see funding available for their causes.

---

## D. Marketplace Tests

### ✅ D1. Secondary Market Trading
**Priority: High**
**Status: COMPLETED**

Implemented in [marketplace-secondary.test.ts](../integration-tests/src/marketplace-secondary.test.ts):
- ✅ Create sell listing for project tokens
- ✅ Create buy order for project tokens
- ✅ Purchase tokens from sell listing (partial fulfillment tested)
- ✅ Fulfill buy order by selling tokens (partial fulfillment tested)
- ✅ Cancel sell listing
- ✅ Cancel buy order
- ✅ Query active listings and orders
- ✅ Price history tracking via trades

**Tests verify:**
- Sale listings are created with tokens held in escrow
- Buyers can fulfill listings with partial or full amounts
- Listings update remaining count and status correctly
- Buy orders are created with ETH held in escrow
- Sellers can fulfill buy orders with partial or full amounts
- Orders update remaining count and status correctly
- Cancelled listings/orders have correct status
- Active listings/orders queries return only active items
- Trades are recorded with correct buyer, seller, price, and count
- Price history can be queried via trades

**Rationale:** The secondary market is a key part of the retroactive funding model. Full test coverage now implemented.

---

## E. Funding Portal Cross-Cutting Tests

### E1. Indirect Project Alignment
**Priority: High**

Missing tests:
- Project aligned with S1, user queries S2 where S1 → S2 (should show project indirectly)
- Multiple implication levels (S1 → S2, project aligns with S1, query by S2)
- Filter by direct vs indirect alignment

**Rationale:** We test alignment attestations but not the computed indirect alignment via implication graph.

### E2. Aggregated Funding Metrics
**Priority: Medium**

Missing queries:
- Total funding raised for a cause (across all aligned projects)
- Total available funding from delegatable notes for a cause
- All projects aligned with cause (direct + indirect)

**Rationale:** These cross-cutting queries are specified but not tested.

### E3. Contributor Leaderboards
**Priority: Medium**

Missing queries:
- Top contributors for a specific cause (across aligned projects)
- User's contribution rank for a cause
- Contributor statistics (total amount, # projects, donation vs investment breakdown)
- Delegation chain display for transparency

**Rationale:** Social recognition is a key feature, but we don't test the queries.

### E4. Filtering and Sorting Projects
**Priority: Low-Medium**

Missing queries:
- Sort/filter projects by: date created, deadline, amount needed, funding progress, trending
- Distinguish direct vs indirect alignment in results

**Rationale:** Discovery features for funding portals.

---

## F. Integration & Cross-Component Tests

### F1. End-to-End Workflows
**Priority: High**

Missing scenarios:
- Complete flow: Create statement → believe it → create aligned project → fund with delegatable note
- User deposits note → delegates → delegate spends on project → verify attribution chain
- Attesters create implications → projects inherit alignment → users discover via indirect alignment
- User signs S1 → S1 implies S2 (via attester) → user sees suggestion to sign S2

**Rationale:** These test that the subsystems work together correctly.

### F2. Multiple Attesters
**Priority: Medium**

Missing tests:
- Different implication attesters publish different implications
- User configures trusted attesters in settings
- Queries respect user's trusted attester list
- Same statement pair attested by multiple attesters

**Rationale:** The system supports multiple attesters but we don't test this thoroughly.

### F3. Social Verification
**Priority: Low (may not be implemented)**

Missing features:
- Connect/disconnect social accounts (Twitter, etc.)
- View high-profile signers (verified accounts with 10k+ followers)

**Rationale:** Mentioned in spec but may be future work.

---

## G. Edge Cases & Error Handling

### G1. Statement Edge Cases
**Priority: Medium**

Missing tests:
- Empty/malformed IPFS content
- Statement with circular references
- Very long statement content
- Invalid statement type

### G2. Funding Edge Cases
**Priority: High**

Missing tests:
- Insufficient funds for project purchase
- Attempt to delegate/spend revoked note
- Attempt to spend someone else's note
- Project deadline edge cases (exactly at deadline, past deadline)
- Refund after project failure

### G3. Permission & Authorization
**Priority: High**

Missing tests:
- Only note owner can delegate/revoke
- Only parent in chain can revoke
- Only project recipient can withdraw
- Batch operations with mixed success/failure

---

## H. Performance & Scale Tests

### H1. Large Data Sets
**Priority: Low (optimization phase)**

Missing tests:
- Many statements (1000+) with efficient querying
- Many implications (10000+)
- Deep delegation chains (10+ levels)
- Many projects aligned with one statement

**Rationale:** Important for production but can come later.

---

## Summary: Highest Priority Missing Tests

### Critical (must have):
1. ✅ ~~**Delegation spending** (C2) - Core feature completely untested~~ **COMPLETED**
2. ✅ ~~**Secondary marketplace** (D1) - Entire subsystem untested~~ **COMPLETED**
3. **Project lifecycle** (B1) - Success/failure/refunds not tested
4. **Indirect support computation** (A3) - Core conceptspace feature
5. **Indirect project alignment** (E1) - Core funding portal feature
6. **End-to-end workflows** (F1) - Integration validation
7. **Edge cases for funding** (G2) - Critical error handling

### High Priority:
1. Aggregated funding metrics (E2)
2. Statement discovery queries (A1)
3. Multiple attesters (F2)
4. User profile queries (A4)

### Medium Priority:
1. Token burning (B3)
2. Multiple token types (B2)
3. Contributor leaderboards (E3)
4. Commission structures (C1) - if implemented
5. Note merging (C3)
6. Notes by statement queries (C4)

### Lower Priority:
1. Statement content rendering (A2)
2. Project filtering/sorting (E4)
3. Social verification (F3) - if implemented
4. Edge cases for statements (G1)
5. Performance tests (H1)

---

## Recommended Implementation Order

**Phase 1: Core Missing Features**
1. ✅ ~~Delegation spending with notes (purchaseFromPrimaryMarketWithNotes)~~ **COMPLETED**
2. ✅ ~~Secondary marketplace basic flow (create listing, buy, sell, cancel)~~ **COMPLETED**
3. Project success/failure/refunds/withdrawals
4. Indirect support computation queries

**Phase 2: Cross-Cutting Integration**
5. Indirect project alignment via implications
6. End-to-end workflow tests
7. Aggregated funding metrics across projects

**Phase 3: Discovery & UI Support**
8. Statement browsing/searching/sorting
9. User profile queries
10. Contributor leaderboards

**Phase 4: Polish & Edge Cases**
11. Multiple attesters & user preferences
12. Token burning (investor → donor)
13. Edge case handling
14. Note merging and advanced features

---

## Notes on Test Infrastructure

The existing test structure is solid:
- Actions and queries are well-organized in separate files
- Good use of helper functions (waitForSync, assertNotNull, etc.)
- Proper use of test accounts
- Good timeout handling

For new tests, continue this pattern:
- Keep actions/queries in their respective files
- Write descriptive test names
- Use proper timeouts for blockchain operations
- Log progress for debugging
- Verify both on-chain state and indexer data
