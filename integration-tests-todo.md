# Integration Tests - Coverage Assessment

## Overview

The integration test suite is **substantial and well-structured**, covering most core functionality of the Commonality system. The tests verify that the blockchain (Hardhat), indexer (Ponder), and GraphQL API work together correctly.

**Total test files:** 24

## What's Currently Covered

### ✅ Concept Space Subsystem (7 test files)

**Well covered:**
- ✅ **Beliefs** ([conceptspace-beliefs.test.ts](integration-tests/src/conceptspace-beliefs.test.ts))
  - Express belief/disbelief in statements
  - Change opinions (believe → disbelieve → no opinion)
  - Multiple users and multiple statements
  - Fetch statement metadata with `getStatementWithContent()`

- ✅ **Implications** ([conceptspace-implications.test.ts](integration-tests/src/conceptspace-implications.test.ts))
  - Record implication attestations (S1 → S2)
  - Track indirect support via implications
  - Multiple implications to the same statement
  - Verify implications are NOT transitive

- ✅ **Indirect Support** ([conceptspace-indirect-support.test.ts](integration-tests/src/conceptspace-indirect-support.test.ts))
  - Compute indirect supporter count
  - Return list of indirect supporters with details
  - Exclude users who explicitly disbelieve
  - Handle multiple implication chains converging
  - Handle users believing multiple statements that imply same target
  - `getUserIndirectSupport()` function for efficient queries

- ✅ **Multiple Attesters** ([conceptspace-multiple-attesters.test.ts](integration-tests/src/conceptspace-multiple-attesters.test.ts))
  - Track implications from different attesters
  - User settings for trusted attesters
  - Query indirect support filtered by trusted attesters

- ✅ **User Profiles** ([conceptspace-user-profiles.test.ts](integration-tests/src/conceptspace-user-profiles.test.ts))
  - Query user's direct beliefs
  - Query user's indirect support
  - Paginated queries for users with many beliefs

- ✅ **Discovery** ([conceptspace-discovery.test.ts](integration-tests/src/conceptspace-discovery.test.ts))
  - Browse/search statements
  - Sort by most supporters, trending, newest
  - Filter and search functionality

- ✅ **Create Statement Workflow** ([conceptspace-create-statement-workflow.test.ts](integration-tests/src/conceptspace-create-statement-workflow.test.ts))
  - End-to-end statement creation flow
  - IPFS upload and CID handling

### ✅ Pubstarter Subsystem (6 test files)

**Well covered:**
- ✅ **Basic Functionality** ([pubstarter-basic.test.ts](integration-tests/src/pubstarter-basic.test.ts))
  - Create projects with metadata
  - Buy tokens from primary market
  - Verify funding progress
  - Project withdrawal when successful

- ✅ **Multiple Tokens** ([pubstarter-multiple-tokens.test.ts](integration-tests/src/pubstarter-multiple-tokens.test.ts))
  - Projects with multiple ERC-1155 token types
  - Different prices per token type

- ✅ **Lifecycle** ([pubstarter-lifecycle.test.ts](integration-tests/src/pubstarter-lifecycle.test.ts))
  - Assurance contract mechanics
  - Deadline handling
  - Project success/failure states
  - Refunds for failed projects

- ✅ **Burn Tokens** ([pubstarter-burn-tokens.test.ts](integration-tests/src/pubstarter-burn-tokens.test.ts))
  - Convert from investor to donor
  - Track burned vs held tokens

- ✅ **Filtering & Sorting** ([pubstarter-filtering-sorting.test.ts](integration-tests/src/pubstarter-filtering-sorting.test.ts))
  - Query projects by various criteria
  - Sort by deadline, funding progress, etc.

- ✅ **Edge Cases** ([pubstarter-edge-cases.test.ts](integration-tests/src/pubstarter-edge-cases.test.ts))
  - Boundary conditions
  - Error handling

### ✅ Marketplace Subsystem (1 test file)

**Well covered:**
- ✅ **Secondary Market** ([marketplace-secondary.test.ts](integration-tests/src/marketplace-secondary.test.ts))
  - Create and fulfill sale listings
  - Cancel sale listings
  - Create and fulfill buy orders
  - Cancel buy orders
  - Query active listings/orders
  - Price history via trade tracking

### ✅ Delegation Subsystem (3 test files)

**Well covered:**
- ✅ **Basic Delegation** ([delegation-basic.test.ts](integration-tests/src/delegation-basic.test.ts))
  - Deposit ETH into notes
  - Delegate notes (full and partial)
  - Revoke delegations
  - Reclaim funds
  - Multi-level delegation chains
  - Track notes by owner and by root

- ✅ **Permissions** ([delegation-permissions.test.ts](integration-tests/src/delegation-permissions.test.ts))
  - Verify authorization rules
  - Test unauthorized operations fail

- ✅ **Spending** ([delegation-spending.test.ts](integration-tests/src/delegation-spending.test.ts))
  - Use delegatable notes to fund projects
  - Spending from delegated notes

### ✅ Funding Portal Subsystem (4 test files)

**Well covered:**
- ✅ **Project Alignment** ([fundingportal-alignment.test.ts](integration-tests/src/fundingportal-alignment.test.ts))
  - Attest project-statement alignment
  - Batch attestations
  - Query alignments by project, statement, or attester

- ✅ **Indirect Alignment** ([fundingportal-indirect-alignment.test.ts](integration-tests/src/fundingportal-indirect-alignment.test.ts))
  - Projects inherit alignment through implication graph
  - Query indirectly aligned projects

- ✅ **Leaderboards** ([fundingportal-leaderboards.test.ts](integration-tests/src/fundingportal-leaderboards.test.ts))
  - Contributor rankings
  - Cross-project leaderboards for a cause
  - Delegation chain transparency

- ✅ **Aggregated Metrics** ([fundingportal-aggregated-metrics.test.ts](integration-tests/src/fundingportal-aggregated-metrics.test.ts))
  - Total funding for a cause
  - Available delegatable note funding
  - Cross-cutting statistics

### ✅ Cross-Component Integration (2 test files)

**Well covered:**
- ✅ **End-to-End Workflows** ([end-to-end-workflows.test.ts](integration-tests/src/end-to-end-workflows.test.ts))
  - Complete user journeys across multiple subsystems
  - Create statement → believe → create project → fund with note

- ✅ **Mutable Refs** ([mutable-refs.test.ts](integration-tests/src/mutable-refs.test.ts))
  - User's saved statement lists
  - Onchain mutable references

### ✅ Infrastructure (1 test file)

- ✅ **Hello World** ([hello-world.test.ts](integration-tests/src/hello-world.test.ts))
  - Basic connectivity test
  - Verify test infrastructure works

## What's NOT Yet Covered (Gaps)

Based on the [queries-and-actions.md](specs/queries-and-actions.md) spec and the main [README](specs/README.md), here are areas with **missing or incomplete** test coverage:

### 🔴 HIGH PRIORITY GAPS

1. **Statement Content Types & Rendering**
   - ❌ No tests for different `statementType` values beyond simple "text"
   - ❌ No tests for statement references (coalition statements like "I believe S1 OR S2")
   - ❌ Missing tests for rendering statements with references and their support numbers
   - **Spec reference:** [statements.md](specs/statements.md) - JSON schema and reference system

2. **Social Account Integration**
   - ❌ No tests for connecting/disconnecting Twitter accounts
   - ❌ No tests for high-profile signer display (verified accounts with 10k+ followers)
   - ❌ No tests for social verification flow
   - **Spec reference:** queries-and-actions.md - "Connect social accounts"

3. **Statement Suggestions**
   - ❌ No tests for "you signed S1, maybe also sign S2 which is more popular" suggestions
   - ❌ No tests for discovering better/more popular equivalent statements
   - **Spec reference:** specs/README.md - "suggestions for other statements you might want to sign also/instead"

4. **Project Success/Failure Complex Scenarios**
   - ⚠️  Basic lifecycle covered, but missing:
     - Project withdrawal after meeting threshold
     - Refund distribution when project fails
     - What happens to secondary market when project fails
     - Token holder rights after project completion

5. **Secondary Market - Price History**
   - ⚠️  Trade tracking exists, but no tests for:
     - Historical price queries over time
     - Volume tracking
     - Market depth analysis

6. **Commission System for Delegation**
   - ❌ No tests for commission percentages on delegated notes
   - ❌ No tests for commission distribution when notes are spent
   - **Spec reference:** queries-and-actions.md - "Specify commission percentage for delegates"

7. **Note Splitting and Merging**
   - ⚠️  Partial delegation (splitting) is tested
   - ❌ No tests for merging notes with identical delegation chains
   - **Spec reference:** queries-and-actions.md - "Merge notes with identical delegation chains"

8. **GraphQL Federated Queries**
   - ❌ No tests verifying that Funding Portal indexer correctly queries other indexers' GraphQL APIs
   - ❌ No tests for handling failures when upstream indexers are unavailable
   - **Spec reference:** specs/README.md and [indexers.md](specs/indexers.md) - federated architecture

9. **Indexer Sync Edge Cases**
   - ⚠️  Basic `waitForSync()` works, but missing:
     - Tests for reorganizations (chain reorgs)
     - Tests for handling missing blocks
     - Tests for catching up from far behind

10. **Search and Keyword Queries**
    - ❌ Discovery tests exist but may not cover full-text search
    - ❌ No tests for keyword/content search
    - **Spec reference:** queries-and-actions.md - "Search for statements by keyword/content"

### 🟡 MEDIUM PRIORITY GAPS

11. **Batch Operations**
    - ✅ Batch project alignment attestations tested
    - ❌ Missing: batch belief operations
    - ❌ Missing: batch implication attestations

12. **Pagination Edge Cases**
    - ⚠️  User profile pagination tested
    - ❌ Missing: pagination for very large result sets (1000+ items)
    - ❌ Missing: cursor-based pagination vs offset pagination

13. **Multi-Attester Scenarios**
    - ✅ Basic multi-attester tested
    - ❌ Missing: conflicting attestations from different attesters
    - ❌ Missing: changing trusted attester settings mid-session

14. **Error Handling and Validation**
    - ⚠️  Some edge cases covered
    - ❌ Missing: comprehensive input validation tests
    - ❌ Missing: malformed IPFS CID handling
    - ❌ Missing: invalid blockchain transaction recovery

15. **Gas Cost Optimization Scenarios**
    - ❌ No tests measuring gas costs
    - ❌ No tests for gas-optimized batch operations

16. **IPFS Content Availability**
    - ⚠️  Tests acknowledge that IPFS content may not be available in test environment
    - ❌ Missing: tests for graceful degradation when IPFS is slow/unavailable
    - ❌ Missing: tests for IPFS pinning behavior

17. **Contributor Statistics**
    - ⚠️  Leaderboards tested
    - ❌ Missing: detailed contributor stats (first/last contribution dates, total projects funded, etc.)
    - **Spec reference:** queries-and-actions.md - "View contributor statistics"

18. **Time-Based Queries**
    - ❌ No tests for trending calculations (velocity of new signatures)
    - ❌ No tests for time-windowed queries ("new statements this week")

### 🟢 LOWER PRIORITY GAPS

19. **UI-Specific Queries**
    - ❌ No tests for root page content (user's personalized view)
    - ❌ No tests for browse/search UI state management
    - *Note: These may be better suited for UI-level tests*

20. **Implication Attester AI Service**
    - ❌ No tests for the attester API endpoint (`POST /evaluate-implication`)
    - ❌ No tests for batch processing of new statements
    - **Spec reference:** specs/README.md - "Implication Attester AI" section
    - *Note: This is a separate service with its own test suite*

21. **Cross-Component Activity Tracking**
    - ❌ No tests for "view my complete activity (statements + projects)"
    - ❌ No tests for relationship visualization between statements and funded projects
    - **Spec reference:** queries-and-actions.md - "Cross-Component Queries"

22. **Visualization Data**
    - ❌ No tests for implication graph visualization data
    - ❌ No tests for delegation chain visualization data
    - *Note: May be UI-specific*

## Test Quality Observations

### ✅ Strengths

1. **Good test structure**: Each test file focuses on a specific domain
2. **Clear test names**: Tests describe what they verify
3. **SDK abstraction**: Tests use high-level SDK functions, not raw contract calls
4. **Real blockchain + indexer**: Tests run against actual Hardhat + Ponder, not mocks
5. **Wait for sync**: Tests properly wait for indexer to catch up
6. **GraphQL queries**: Tests verify both blockchain state and indexer state

### ⚠️ Areas for Improvement

1. **Test isolation**: Some tests may have interdependencies (tests create data that affects other tests)
2. **Cleanup**: No explicit cleanup between tests (relying on fresh hardhat/indexer for each run)
3. **Performance**: Some tests have very long timeouts (40 seconds) - could indicate slow operations
4. **Assertions**: Some tests could benefit from more granular assertions
5. **Error cases**: More negative tests (testing failure modes) would be valuable

## Recommendations

### Immediate Next Steps

1. **Add statement content type tests** - Critical for ensuring the rendering system works
2. **Add project lifecycle completion tests** - Verify withdrawals and refunds work
3. **Add commission system tests** - If this feature is implemented
4. **Add federated query tests** - Verify the multi-indexer architecture works

### Medium-Term

5. **Expand error handling tests** - More negative test cases
6. **Add trending/time-based query tests** - Verify sorting algorithms
7. **Add search functionality tests** - Verify keyword search works
8. **Performance benchmarks** - Track gas costs and query performance

### Long-Term

9. **Load testing** - Test with thousands of statements/projects
10. **Chaos testing** - Test recovery from indexer failures, reorgs, etc.
11. **Generative testing** - Use the [fake-data-generation](hardhat/fake-data-generation/README.md) system for property-based testing

## Overall Assessment

**The integration test suite is in good shape** - probably **70-80% complete** for core functionality. The main gaps are:

- **Content type handling** (different statement types)
- **Social integration** (Twitter verification)
- **Statement suggestions** (discovery improvements)
- **Commission system** (if implemented)
- **Federated queries** (cross-indexer communication)
- **Advanced search** (keyword/content search)

The existing tests provide a **solid foundation** for confident development and refactoring. The test infrastructure (Docker-based Hardhat + Ponder, SDK abstraction, GraphQL queries) is well-designed and should scale well as more tests are added.

## Related Documentation

- [Integration tests README](integration-tests/README.md) - How to run tests
- [Integration test specs](specs/integration-tests.md) - Original test plan
- [Queries and actions spec](specs/queries-and-actions.md) - Full list of required functionality
- [Main project spec](specs/README.md) - System architecture and requirements
