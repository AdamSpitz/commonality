# Integration Tests TODO

This document tracks remaining integration test coverage gaps based on the system specifications.

---

## Test Code Analysis (Added 2025-11-29)

### Overall Assessment: **Good Foundation, Some Improvements Needed**

The integration test suite is well-structured with a clean separation between actions and queries, making it easy to write tests at a higher level of abstraction. The tests cover the core functionality across all subsystems (Conceptspace, Delegation, Pubstarter, Project Alignment) and the code is generally clear and maintainable.

**Strengths:**
- **Excellent abstraction**: Actions and queries are cleanly separated into reusable modules
- **Clear test structure**: Tests are well-organized and use descriptive names
- **Good coverage of happy paths**: Core functionality is tested across all subsystems
- **Proper async/await handling**: Tests correctly wait for blockchain transactions and indexer sync
- **Type safety**: Good use of TypeScript types throughout

**Areas for Improvement:**
- **DRY violations**: Contract ABIs are duplicated in test files instead of being centralized
- **Magic numbers**: Some hard-coded event signatures and test parameters could be constants
- **Error handling**: Tests don't verify error cases or negative scenarios
- **Test data**: Some repetitive setup code could be extracted into fixtures
- **Documentation**: Some complex test logic lacks inline comments

#### 4. Code Quality Issues

**High Priority:**

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

#### 5. What's Working Really Well

1. **Abstraction Layers** - The separation of actions/queries from tests is excellent
   - Makes tests readable and maintainable
   - Easy to reuse in future UI code or scripts
   - Good TypeScript types throughout

2. **Wait for Sync** - Proper handling of blockchain → indexer lag
   - Tests correctly wait for indexer to catch up
   - Prevents flaky tests from race conditions

3. **Test Coverage** - Good breadth of scenarios
   - Multiple users, multiple statements, delegation chains
   - Direct and indirect relationships
   - Batch operations

4. **Real Integration** - Tests verify actual blockchain + indexer integration
   - Not just unit tests or mocks
   - Catches real integration bugs

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

### Recommendations

**Immediate (Before Adding More Tests):**
1. ~~Create `test-abis.ts` to centralize contract ABIs~~ ✅ DONE (2025-11-29)
2. ~~Fix event parsing to use viem's parseEventLogs~~ ✅ DONE (2025-11-29)
   - Fixed fragile event parsing in delegation-actions.ts
   - Fixed fragile event parsing in pubstarter-actions.ts
   - Now using viem's `parseEventLogs` with proper ABIs
3. ~~Add JSDoc comments to action functions~~ ✅ DONE (2025-11-29)
   - Added comprehensive JSDoc to delegation-actions.ts
   - Added comprehensive JSDoc to pubstarter-actions.ts
   - Added JSDoc to conceptspace-actions.ts
4. ~~Centralize timeout constants~~ ✅ DONE (2025-11-29)
   - Created test-constants.ts with centralized TEST_TIMEOUTS and INDEXER_SYNC constants
   - Updated queries/common.ts to use centralized constants
5. ~~Fix performance in indirect support queries~~ ✅ DONE (2025-11-29)
   - Optimized [conceptspace-queries.ts:245-316](integration-tests/src/queries/conceptspace-queries.ts#L245-L316)
   - Changed from sequential query loops to Promise.all for parallel execution
   - Reduced N+1 query problem from O(implications × believers) to O(1) batch queries
6. ~~Add environment variable validation at startup~~ ✅ DONE (2025-11-29)
   - Added validation in [setup.ts](integration-tests/src/setup.ts)
   - Checks all required contract addresses are present
   - Provides helpful error messages if variables are missing
7. ~~Move private key constants to shared test config~~ ✅ DONE (2025-11-29)
   - Added TEST_PRIVATE_KEYS to [test-constants.ts](integration-tests/src/test-constants.ts)
   - Updated all test files to use centralized constants
   - Removed hardcoded private keys from individual test files

**Short Term (Next Sprint):**
1. Add error case tests (see G2, G3 in TODO above)
2. Add test fixtures for common scenarios
3. Test assurance contract success/failure paths

**Long Term (Future):**
1. Consider E2E tests that include UI interactions
2. Add performance benchmarks
3. Test with real IPFS
4. Add fuzz testing for edge cases

### Verdict

**Overall: 7.5/10** - This is a solid foundation with good architecture and decent coverage. The code is maintainable and the abstraction layers are well-designed. Main issues are DRY violations (ABI duplication), fragile event parsing, and missing error case coverage. With the recommended fixes, this could easily be 9/10.

The test suite successfully validates that the blockchain and indexer work together correctly, which is the primary goal. The clean separation of actions and queries makes the code reusable and the tests readable. The main work needed is reducing duplication, improving robustness of event parsing, and adding edge case coverage.

---

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
