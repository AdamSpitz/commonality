# Integration Tests TODO

This document tracks remaining integration test coverage gaps based on the system specifications.

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


### A4. User Profile Queries
**Priority: Medium**

Missing queries:
- View user's directly signed statements
- View user's indirectly supported statements (via implications)
- View another user's profile and statements

**Rationale:** User pages are a key UI feature specified in the docs.

---

## B. Pubstarter Tests


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

## E. Funding Portal Cross-Cutting Tests

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
- ~~Complete flow: Create statement → believe it → create aligned project → fund with delegatable note~~
  +++++++ REPLACE
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

## Priority Summary

### Critical (must have):
1. **End-to-end workflows** (F1) - Integration validation
2. **Edge cases for funding** (G2) - Critical error handling

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
