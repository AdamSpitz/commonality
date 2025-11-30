# Integration Tests TODO

This document tracks remaining integration test coverage gaps based on the system specifications.

## Recently Implemented (Not Yet Passing)

**E2, E3, E4 - Aggregated Metrics, Leaderboards, and Filtering**

The query functions and test files have been implemented for:
- E2: Aggregated funding metrics (total funding for a cause, available notes, etc.)
- E3: Contributor leaderboards (top contributors, user ranks)
- E4: Project filtering/sorting (by date, deadline, funding progress, etc.)

**Status:** Tests are failing with empty results (0 projects/contributors found when they should find data).

**Possible causes:**
1. The aggregated queries themselves may have bugs in how they federate data across subsystems
2. Test setup might not be creating the data correctly
3. Timing issues - indexer may not be catching up despite waitForSync calls
4. The queries need to handle both direct and indirect relationships through the implication graph, which is complex

**Files created:**
- `integration-tests/src/fundingportal-aggregated-metrics.test.ts`
- `integration-tests/src/fundingportal-leaderboards.test.ts`
- `integration-tests/src/pubstarter-filtering-sorting.test.ts`
- Query functions in `integration-tests/src/queries/funding-portals-queries.ts` and `pubstarter-queries.ts`

**Next steps:** Need to debug why the queries return empty results. The existing integration tests all pass, so the infrastructure works. The issue is specific to these new cross-cutting queries that federate data across multiple subsystems.

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

(All basic tests completed)

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

---

## E. Funding Portal Cross-Cutting Tests

(All basic tests completed - E2, E3, E4 implemented)

---

## F. Integration & Cross-Component Tests


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
1. **Test Timeout Values** - Hard-coded timeouts scattered throughout
   - *Fix*: Centralize timeout constants
   - *Impact*: Harder to tune for different environments

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

3. **Assertion Messages** - Some assertions lack descriptive messages
   - When tests fail, it's not always clear why
   - Could add more context to assert.strictEqual calls

4. **Transaction Gas** - No tests verify gas usage or costs
   - Could be important for production
   - Could test with different gas limits
