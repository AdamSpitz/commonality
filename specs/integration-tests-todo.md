# Integration Tests TODO

This document tracks remaining integration test coverage gaps based on the system specifications.

## A. Conceptspace Tests

### A1. Statement Discovery & Browsing
**Priority: Low-Medium**

Missing queries:
- Browse by trending (velocity of new signatures)
- Search statements by keyword/content
- View statements that reference other statements (coalition/commonality)

**Rationale:** Trending and search features not yet tested. Basic browsing queries are covered.

### A2. Statement Content Rendering
**Priority: Low-Medium**

Missing tests:
- Different statement types (text, conjunction, etc. per [statements.md](statements.md))
- Rendering statements with references to other statements
- Depth limits on reference expansion

**Rationale:** The spec mentions various statement types and reference handling. Should verify the system handles these correctly.



---

## B. Pubstarter Tests

(All basic tests completed, including E2, E3, E4 aggregated metrics, leaderboards, and filtering/sorting)

---

## C. Delegation Tests

### C1. Commission Structures
**Priority: Low (future feature)**

Missing tests:
- Specify commission percentage for delegates
- Track commission earnings
- Commission distribution on note spending

**Rationale:** Mentioned in spec but may not be implemented yet. Mark as "not implemented" if so.


### C3. Note Merging and Splitting
**Priority: Low-Medium**
**Status: NOT YET IMPLEMENTED**

Missing contract features:
- Explicit `mergeNotes()` function to combine notes with identical delegation chains
- Explicit `splitNote()` function to split a note into multiple smaller notes
  (Note: Splitting happens implicitly during partial delegation via `ChainSplit` event)

Missing tests:
- Merge notes with identical delegation chains
- Verify merged note properties
- Split a note explicitly into multiple smaller notes

**Rationale:** Mentioned in queries-and-actions.md and fundingportals.md as supported actions, but not yet implemented in the DelegatableNotes contract.

---

## E. Funding Portal Cross-Cutting Tests

(All basic tests completed and passing - E2, E3, E4 implemented and verified)

---

## F. Integration & Cross-Component Tests

(F2 - Multiple Attesters: Completed and passing. See conceptspace-multiple-attesters.test.ts)

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

### G3. Permission & Authorization
**Priority: Medium**

Missing tests:
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

### High Priority:
1. Multiple attesters (F2)

### Medium Priority:
1. Commission structures (C1) - if implemented
2. Note merging (C3)

### Lower Priority:
1. Statement Discovery & Browsing (A1) - trending, search, statements with references
2. Statement content rendering (A2)
3. Social verification (F3) - if implemented
4. Edge cases for statements (G1)
5. Performance tests (H1)

---

### Test Code Quality Issues

**Medium Priority:**
1. **Test Timeout Values** - ✅ COMPLETED
   - Centralized timeout constants in test-timeouts.ts
   - Provides named constants for different test complexities (SHORT, MEDIUM, LONG, etc.)
   - Updated conceptspace-multiple-attesters.test.ts as example
   - Other test files can gradually migrate to using these constants

2. **Mock IPFS** - No actual IPFS integration
   - *Current*: Just creates CIDs from content hashes
   - *Fix*: Document this limitation, consider testing against real IPFS
   - *Impact*: Could miss IPFS-related bugs

3. **GraphQL Query Strings** - Inline query strings can be verbose
   - *Fix*: Consider using a GraphQL client library or tagged templates
   - *Impact*: Readability, type safety

**Low Priority:**
1. **Console.log for Test Output** - Uses console.log for progress
   - *Current approach*: Works fine for debugging
   - *Alternative*: Could use a proper test reporter

#### 6. What Could Be Better

1. **Edge Cases** - Missing tests for error conditions
   - Invalid inputs
   - Permission failures
   - Insufficient balances
   - Deadline/threshold edge cases

2. **Test Fixtures** - Some repetitive setup
   - Could extract common patterns (e.g., "create statement", "create project")
   - Consider using test helpers or before/beforeEach hooks more

3. **Assertion Messages** - ✅ IMPROVED
   - Enhanced assertion messages in conceptspace-multiple-attesters.test.ts
   - All assertions now include descriptive error messages with actual/expected values
   - Other test files can gradually adopt this pattern

4. **Transaction Gas** - No tests verify gas usage or costs
   - Could be important for production
   - Could test with different gas limits
