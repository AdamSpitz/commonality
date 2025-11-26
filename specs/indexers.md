# Indexer Architecture

This document describes how the Commonality indexing system is split into independent, federated indexers.

## Overview

Instead of one large indexer, we use multiple specialized indexers that each focus on one domain. Complex cross-cutting queries are handled by federation (one indexer queries another's GraphQL API).

**Important:** This describes the *logical* architecture - the conceptual separation, database schemas, and GraphQL APIs. The *physical* deployment (separate processes vs single executable) is a separate decision that can change without affecting the code.

## The Four Indexers

```
┌──────────────────┐
│ Concept Space    │  Watches: Beliefs, Implications
│ Indexer          │  Exports: GraphQL API for statements, beliefs, implication graph
│                  │  Dependencies: None
└──────────────────┘

┌──────────────────┐
│ Pubstarter       │  Watches: Pubstarter contracts, ERC1155PrimaryMarket, ERC1155SecondaryMarket
│ Indexer          │  Exports: GraphQL API for projects, contributions, market orders
│                  │  Dependencies: None
└──────────────────┘

┌──────────────────┐
│ Delegation       │  Watches: DelegatableNotes
│ Indexer          │  Exports: GraphQL API for notes, delegation chains
│                  │  Dependencies: None
└──────────────────┘

┌──────────────────┐
│ Funding Portal   │  Watches: ProjectAlignment
│ Indexer          │  Exports: GraphQL API for cross-cutting queries
│                  │  Dependencies: Queries Concept Space, Pubstarter, Delegation APIs
└──────────────────┘
```

## Key Responsibilities

### Concept Space Indexer

**Domain:** Statements, beliefs, and implications

**Data stored:**
- Statements (IPFS content cached locally)
- User beliefs (address → statementId → beliefState)
- Implication graph (organized by attester)
- Direct supporters per statement

**Non-obvious requirements:**
- Reverse implication maps indexed by attester: `(implied_statement_id, attester_address, implying_statement_id)`
- Implications are NOT transitive - indirect support is computed via direct implication lookups only (simple DB query, no graph traversal needed)
- Time-series data for trending calculations ("signatures per time window")
- Full-text search on statement content (see indexer/IPFS_SYNC_README.md)

**Example query:** "Give me all statements that directly imply statement S, according to attesters A1 and A2" (then union their supporters for indirect support count)

### Pubstarter Indexer

**Domain:** Individual crowdfunding projects and token markets

**Data stored:**
- Project details (threshold, deadline, recipient)
- Token types per project (ERC1155)
- Contributions and current token holders
- Burned tokens (donors vs investors)
- Active market orders (buy/sell listings)

**Non-obvious requirements:**
- Multi-token tracking per project: indexes per `(project_address, token_id)`
- Order book indexing with price-time priority
- Track primary vs secondary market prices
- Handle partial order fills

**Example query:** "Give me all contributors to project P, distinguishing between donors (who burned tokens) and investors (who still hold)"

### Delegation Indexer

**Domain:** Delegatable notes and delegation chains

**Data stored:**
- Active notes indexed by noteId, owner, intendedStatementId
- Full delegation chains with position tracking
- Commission percentages per delegation hop

**Non-obvious requirements:**
- Efficient chain reconstruction via `(note_id, position_in_chain)` index
- Fast sub-chain invalidation on revocation
- Track splits/merges while maintaining chain identity
- Commission data stored (actual calculation happens in smart contract)

**Example query:** "Give me the full delegation chain for note N (Alice → Bob → Charlie)"

### Funding Portal Indexer

**Domain:** Cross-cutting queries joining concepts, projects, and funding

**Data stored:**
- Project alignment attestations (projectAddress → statementId, by attester)
- Cached results of expensive federated queries
- Aggregated contributor data across aligned projects

**Non-obvious requirements:**
- **Indirect project alignment:** Federates to Concept Space API for direct implication attestations (no transitive traversal), joins with local alignment data
- **Aggregated funding by cause:** Federates to Delegation API for notes, Concept Space API for implications, sums across relevant statements
- **Contributor leaderboards:** Federates to Pubstarter API for contributions, Delegation API for chains, aggregates by cause
- Heavy caching with invalidation on: new implications, new alignments, delegation changes

**Example query:** "Show me all projects aligned with statement S (directly or indirectly via implications), sorted by funding progress, with top contributors and their full delegation chains"

## Cross-Cutting Concerns

**Multi-Attester Query Performance:**
- Almost all queries filtered by user's "trusted attesters" set
- Can't pre-compute (every user has different trusted set)
- Solution: Attester filtering happens once in Concept Space, filtered results passed downstream

**Event Reorg Handling:**
- All indexers track block numbers and handle rollbacks
- Wait for finality threshold before treating data as permanent

**No Graph Traversal Needed:**
- Implications are not transitive, so no BFS/DFS traversal required
- Indirect support = simple lookup of direct implications pointing to target statement
- Only depth limiting needed is for displaying nested statement references in UI (3-5 levels)

## Deployment: Logical vs Physical

### Logical Architecture (What Matters for Code)

Maintain these boundaries:
1. **Separate database schemas** - Each indexer has its own tables
2. **Separate GraphQL schemas** - Clear API contracts
3. **Dependency direction** - Funding Portal depends on others; others have no dependencies
4. **No shared business logic** - Federation via GraphQL, not function calls

### Physical Deployment (Flexible)

You can deploy as:
- **Monolithic** (single process, GraphQL "queries" are direct function calls) - Simplest for development
- **Separate services** (each indexer in own container) - Best for production scaling
- **Hybrid** (combine some, separate others)

The key: Write code with logical boundaries even if deploying monolithically. Then physical architecture can evolve based on operational needs.

## Why This Works

**Clear separation of concerns:**
- Concept Space: "Tell me about statements and beliefs"
- Pubstarter: "Tell me about crowdfunding projects"
- Delegation: "Tell me about notes and chains"
- Funding Portal: "Join everything together"

**Complex queries handled cleanly:**
- "Projects for cause S" = Funding Portal federates to Concept Space (for implications) + local alignment data
- "Total funding for S" = Funding Portal federates to Delegation (notes) + Concept Space (implications) + sums
- "Top contributors to S" = Funding Portal federates to Pubstarter (contributions) + Delegation (chains) + aggregates

**Independent testing:**
- Test each indexer with mock upstream APIs
- No need to spin up entire system

**Reusability:**
- Pubstarter indexer works for any Kickstarter-like system
- Concept Space indexer works for any belief/statement tracking
- Delegation indexer works for any delegation use case

## Recommendation

Start with federated logical architecture deployed monolithically:
1. Write separate modules with GraphQL APIs (as if they're separate services)
2. Deploy as single process (simpler initially)
3. Switch to distributed deployment when needed (just config changes)

This gives clean separation (good for code quality) with simple deployment (good for getting started quickly).

## Implementation Review Notes

The following issues were identified in the initial indexer implementation (as of 2025-11-26):

### Critical Issues 🔴

1. ~~**Delegation Chain Storage Logic Error**~~ ✅ **FIXED** ([src/delegation/index.ts:41-54](../indexer/src/delegation/index.ts#L41-L54))
   - ~~The code attempts to delete existing chain entries using a hardcoded `position: 0`, which won't delete all positions~~
   - ~~The deletion logic is flawed: `await ctx.db.delete(delegationChains, { noteId: row.noteId, position: 0 })` will only try to delete position 0~~
   - **Fixed**: Now selects both `noteId` and `position` from existing entries and deletes each specific position individually

2. ~~**Missing Database Query Methods**~~ ✅ **FIXED** ([src/delegation/index.ts:46, 185, 261, 324](../indexer/src/delegation/index.ts#L46))
   - ~~Uses `.select().from().where()` pattern that may not match Ponder's actual API~~
   - **Fixed**: Event handlers now use `context.db.sql.query.tableName.findMany()` for complex queries (Ponder's relational query API)
   - **Note**: API files (delegation/api.ts) correctly use `db.select()` since they import from "ponder:api" which provides direct Drizzle access
   - **Explanation**: Ponder has two contexts:
     - Event handlers (`context.db`): Should use Store API (`find`, `insert`, `update`, `delete`) or `context.db.sql.query` for complex queries
     - API routes (`db` from "ponder:api"): Can use full Drizzle query builder (`db.select().from().where()`)

3. ~~**ChainSplit Handler Logic**~~ ✅ **FIXED** ([src/delegation/index.ts:231-311](../indexer/src/delegation/index.ts#L231-L311))
   - ~~Updates `remainderLeafId` but the variable name suggests it should update `originalLeafId`~~
   - ~~The contract behavior vs indexer behavior needs clarification: which note ID persists and which is new?~~
   - **Fixed**: Now correctly updates `originalLeafId` (the remainder note). Contract keeps the original note ID for the remainder and creates a new note ID for the delegated split portion.

4. ~~**Missing Chain Hash Computation**~~ ✅ **FIXED** ([src/delegation/index.ts:26-32, 125, 201, 236, 382-391](../indexer/src/delegation/index.ts#L26-L32))
   - ~~Placeholder returns `0x00...00` instead of computing actual chain hash~~
   - **Fixed**: Now properly computes chain hash using `keccak256(encodePacked(owner, parentChainHash))` matching Solidity implementation
   - **Implementation**: Uses viem's `keccak256` and `encodePacked` functions
   - **Locations updated**:
     - `computeChainHash` helper function implements the hash computation
     - `NoteCreated` handler computes initial chain hash for root notes
     - `NoteDelegated` handler computes new chain hash when delegating (both full and partial)
     - `NoteRevoked` handler recomputes chain hash after truncating the delegation chain

5. ~~**Intended Statement ID Not Set**~~ ✅ **FIXED** ([DelegatableNotes.sol:45-53, 151](../hardhat/contracts/delegation/DelegatableNotes.sol#L45-L53) & [src/delegation/index.ts:118](../indexer/src/delegation/index.ts#L118))
   - ~~Always defaults to `0x00...00` - the note's intended statement alignment won't be tracked~~
   - **Root cause**: The `NoteCreated` event was missing `intendedStatementId` parameter
   - **Fixed**:
     - **Smart contract**: Added `intendedStatementId` to `NoteCreated` event parameters
     - **Indexer**: Now reads `intendedStatementId` directly from event args
   - **Benefits**: Cleaner, more efficient (no extra RPC calls), more reliable during reorgs

### Major Issues 🟠

6. ~~**IPFS Fetching in Event Handlers**~~ ✅ **FIXED** ([src/conceptspace/index.ts:27-60](../indexer/src/conceptspace/index.ts#L27-L60), [src/conceptspace/utils/ipfsSyncJob.ts](../indexer/src/conceptspace/utils/ipfsSyncJob.ts))
   - ~~Async IPFS fetch doesn't await completion before continuing~~
   - ~~Uses `.then()` which may not work correctly with Ponder's indexing~~
   - ~~**Risk**: IPFS content might never get fetched or might cause race conditions~~
   - **Fixed**: Implemented background IPFS sync job with retry mechanism
   - **Solution**:
     - Event handlers now create placeholder records immediately (no blocking)
     - Background job (`ipfsSyncJob.ts`) runs every 5 minutes
     - Retries failed IPFS fetches up to 10 times or 24 hours
     - Tracks retry attempts per statement and cleans up after success
     - Started automatically when API server launches ([src/api/index.ts:66-73](../indexer/src/api/index.ts#L66-L73))
   - **Benefits**:
     - Doesn't block event processing
     - Resilient to temporary IPFS gateway failures
     - Eventually consistent content fetching
     - Proper separation of concerns
   - **Why we need IPFS data in indexer**: Required for full-text search, displaying statement lists with titles/excerpts, and caching improves performance vs. fetching from UI

7. ~~**Missing ERC1155Purchased Note Deactivation**~~ ✅ **FIXED** ([DelegatableNotes.sol:75-80, 535](../hardhat/contracts/delegation/DelegatableNotes.sol#L75-L80) & [src/delegation/index.ts:453-477](../indexer/src/delegation/index.ts#L453-L477))
   - ~~Comment acknowledges input notes should be marked inactive but doesn't implement it~~
   - ~~**Risk**: Notes will appear "available" even after being spent~~
   - **Fixed**:
     - **Smart contract**: Added `NoteConsumed` event emitted when notes are spent during purchases ([DelegatableNotes.sol:535](../hardhat/contracts/delegation/DelegatableNotes.sol#L535))
     - **Smart contract**: Added `NoteCreated` events for output notes created during purchases ([DelegatableNotes.sol:571-579](../hardhat/contracts/delegation/DelegatableNotes.sol#L571-L579))
     - **Indexer**: Added `NoteConsumed` event handler that marks fully-spent notes as `active: false` and updates amounts for partially-spent notes
   - **Benefits**:
     - Preserves audit trail (inactive notes remain in DB rather than being deleted)
     - Handles both full and partial note consumption
     - Clean separation: NoteConsumed handles inputs, NoteCreated handles outputs, ERC1155Purchased records the purchase event

8. ~~**API Import Issues**~~ ✅ **FIXED** ([src/api/index.ts](../indexer/src/api/index.ts))
   - ~~Multiple API files (conceptspace, pubstarter, delegation, fundingportal) but no evidence they're aggregated~~
   - **Fixed**: Main API file properly imports and mounts all subsystem APIs at their respective routes
   - **Verification**: [src/api/index.ts:22-57](../indexer/src/api/index.ts#L22-L57) shows all APIs imported and mounted correctly
   - **Note**: This was never actually broken - the aggregation was already implemented

9. ~~**Factory Address Correlation**~~ ✅ **FIXED** ([src/pubstarter/index.ts:498-523](../indexer/src/pubstarter/index.ts#L498-L523))
   - ~~Factory events just log to console rather than storing relationships~~
   - ~~Makes it difficult to query "which marketplace goes with which project"~~
   - **Fixed**: Added handler for `SecondaryMarket:ERC1155SecondaryMarketCreated` event
   - **Solution**: When marketplace is created, it emits the ERC1155 token address it serves
   - **Implementation**: Query for projects using that ERC1155 token, update their `marketplaceAddress` field
   - **Note**: ERC1155 address correlation was already handled via `ERC1155Offered` event ([lines 169-174](../indexer/src/pubstarter/index.ts#L169-L174))

### Medium Issues 🟡

10. ~~**Query API Consistency**~~ ✅ **FIXED** ([src/conceptspace/api.ts](../indexer/src/conceptspace/api.ts), [delegation/api.ts](../indexer/src/delegation/api.ts), [fundingportal/api.ts](../indexer/src/fundingportal/api.ts))
    - ~~Mix of different query patterns: `db.find()`, `db.select().from().where()`, `db.select().from().where().orderBy()`~~
    - ~~Some use `eq()`, `and()`, `inArray()` while others use different patterns~~
    - **Fixed**: All API endpoints now consistently use Drizzle query builder syntax (`db.select().from().where()`)
    - **Fixed**: Added explicit `asc()` for `.orderBy()` calls for clarity
    - **Fixed**: Removed usage of `db.find()` in favor of explicit query patterns
    - **Note**: All patterns are valid Ponder/Drizzle API methods

11. ~~**Missing Input Validation**~~ ✅ **FIXED** ([src/utils/validation.ts](../indexer/src/utils/validation.ts), all API files)
    - ~~API endpoints don't validate hex strings are properly formatted~~
    - ~~BigInt parsing could fail with invalid input~~
    - ~~Should add try-catch and format validation~~
    - **Fixed**: Created comprehensive validation utilities module ([src/utils/validation.ts](../indexer/src/utils/validation.ts))
    - **Fixed**: Added validation functions:
      - `isValidAddress()` - validates Ethereum addresses (0x + 40 hex chars)
      - `isValidHash()` - validates 32-byte hashes (0x + 64 hex chars)
      - `isValidHex()` - validates general hex strings
      - `parseBigIntSafe()` - safely parses BigInt with null return on error
      - `parseAddressList()` - parses and validates comma-separated address lists
      - `parsePositiveInt()` - safely parses positive integers with defaults
      - `parseBoolean()` - parses boolean query parameters
      - `invalidInputError()` - standardized error response format
    - **Fixed**: All API endpoints now:
      - Validate all path parameters (addresses, hashes, noteIds)
      - Validate all query parameters (attesters, limits, filters)
      - Wrap handlers in try-catch blocks with proper error logging
      - Return standardized 400 errors for invalid input
      - Return 500 errors for unexpected exceptions
    - **Locations updated**:
      - [conceptspace/api.ts](../indexer/src/conceptspace/api.ts) - 3 endpoints validated
      - [delegation/api.ts](../indexer/src/delegation/api.ts) - 5 endpoints validated
      - [fundingportal/api.ts](../indexer/src/fundingportal/api.ts) - 4 endpoints validated
      - [pubstarter/api.ts](../indexer/src/pubstarter/api.ts) - No custom endpoints (GraphQL only)

12. ~~**Note Delegation Logic Complexity**~~ ✅ **FIXED** ([src/delegation/index.ts:165-253](../indexer/src/delegation/index.ts#L165-L253))
    - ~~The handler assumes `NoteDelegated` might be emitted before `ChainSplit` for partial delegations~~
    - ~~Event ordering dependency could cause issues if events arrive out of order~~
    - **Fixed**: Added clear documentation of event ordering (ChainSplit → NoteDelegated)
    - **Fixed**: Added error handling in NoteDelegated to gracefully handle missing child notes
    - **Verification**: Smart contract guarantees ordering by emitting events sequentially in same transaction ([DelegatableNotes.sol:251-252](../hardhat/contracts/delegation/DelegatableNotes.sol#L251-L252))
    - **Robustness**: Handler now logs errors and returns early if child note is missing, preventing database corruption

13. ~~**Missing Metadata Fetching**~~ ✅ **FIXED** ([src/pubstarter/index.ts:152](../indexer/src/pubstarter/index.ts#L152))
    - ~~TODO comment for IPFS metadata fetching never implemented~~
    - ~~Projects won't have cached metadata content~~
    - **Fixed**: Implemented background IPFS sync job for project metadata, mirroring the solution for statement content (issue #6)
    - **Solution**:
      - Created IPFS utilities module ([src/pubstarter/utils/ipfs.ts](../indexer/src/pubstarter/utils/ipfs.ts)) with metadata fetching and validation
      - Created background sync job ([src/pubstarter/utils/ipfsSyncJob.ts](../indexer/src/pubstarter/utils/ipfsSyncJob.ts)) with retry mechanism
      - Added `metadataFetched` boolean flag to projects schema ([ponder.schema.ts:184](../indexer/ponder.schema.ts#L184))
      - Started sync job automatically when API server launches ([src/api/index.ts:76-86](../indexer/src/api/index.ts#L76-L86))
      - Retries failed IPFS fetches up to 10 times or 24 hours
      - Runs every 5 minutes in the background
    - **Benefits**:
      - Doesn't block event processing
      - Resilient to temporary IPFS gateway failures
      - Eventually consistent metadata fetching
      - Proper separation of concerns

14. **Delegation Chain Revocation** ([src/delegation/index.ts:335-341](../indexer/src/delegation/index.ts#L335-L341))
    - Deletes chain entries one at a time in a loop
    - Could be more efficient with a single "delete where position > X" query

### Minor Issues / Improvements 🟢

15. ~~**Console.log in Production Code**~~ ✅ **ACCEPTABLE** ([src/pubstarter/index.ts:72, 86](../indexer/src/pubstarter/index.ts#L72))
    - ~~Should use proper logging framework instead of console.log~~
    - **Review**: Code uses `context.log.info()` which is the correct Ponder logging API
    - **Note**: `console.warn` in [conceptspace/index.ts:74](../indexer/src/conceptspace/index.ts#L74) is unavoidable since it's in a `.then()` callback outside event handler scope (related to issue #6)

16. ~~**Magic Numbers**~~ ✅ **FIXED** ([src/constants.ts](../indexer/src/constants.ts))
    - ~~Belief states (0, 1, 2) hardcoded in multiple places~~
    - ~~Token types (0, 1) hardcoded~~
    - **Fixed**: Constants exported in [src/constants.ts](../indexer/src/constants.ts) with `BeliefState` and `TokenType` enums
    - **Used properly**: [conceptspace/index.ts](../indexer/src/conceptspace/index.ts#L24-L29) imports and uses these constants

17. **Missing Error Handling**
    - Most event handlers don't have try-catch blocks
    - Failed IPFS fetches log warnings but might need retry logic
    - Database update failures could cause inconsistent state

18. **TypeScript Type Safety**
    - Many `any` types in query results ([delegation/api.ts](../indexer/src/delegation/api.ts))
    - Could benefit from proper typing of database query results

19. ~~**API Response Pagination Missing**~~ ✅ **FIXED** ([delegation/api.ts](../indexer/src/delegation/api.ts), [conceptspace/api.ts](../indexer/src/conceptspace/api.ts))
    - ~~Endpoints like `/api/active-notes` could return unlimited results~~
    - ~~Should add limit/offset parameters~~
    - **Fixed**: Added pagination support to list endpoints:
      - **Delegation API**: `/api/active-notes`, `/api/notes-by-root-owner`, `/api/note-history`
      - **Concept Space API**: `/api/indirect-supporters`, `/api/suggestions`
      - All endpoints support `limit` (default 100, max 1000) and `offset` (default 0) query parameters
      - Responses include `totalCount`, `limit`, and `offset` fields
    - **Note**: Funding Portal APIs do aggregation/summaries and pagination is less critical there

20. ~~**Missing Index on Common Queries**~~ ✅ **FIXED** ([ponder.schema.ts:55](../indexer/ponder.schema.ts#L55))
    - ~~Schema has good indexes overall, but might benefit from composite index on `(statementId, beliefState, updatedAt)` for trending queries~~
    - **Fixed**: Added `trendingIdx` composite index on `beliefs` table covering `(statementId, beliefState, updatedAt)`
    - **Benefits**: Efficiently supports queries for trending statements (statements gaining believers over time)

### Positive Aspects ✅

- **Excellent separation of concerns** - four subsystems are properly isolated
- **Good schema design** - indexes are well thought out
- **Clear documentation** - helpful comments throughout
- **Non-transitive implications** - correctly implements the spec's requirement
- **Comprehensive API endpoints** - good coverage of use cases
- **Proper event sourcing** - noteEvents table provides full audit trail
- **Factory pattern usage** - correctly uses Ponder's factory pattern for dynamic contracts

### Recommendations

1. ~~**Fix critical issues first**~~ ✅ - ~~especially delegation chain management and database queries~~ (Issues #1-5 fixed)
2. **Add integration tests** - test event handler flows end-to-end
3. **Verify Ponder API usage** - confirm query patterns match Ponder's actual API
4. **Add proper error handling** - wrap handlers in try-catch, add retry logic
5. ~~**Implement missing features**~~ ✅ - ~~chain hash computation~~ (fixed), note deactivation (remaining), metadata fetching (remaining)
6. ~~**Test IPFS integration**~~ ✅ - ~~ensure content fetching actually works~~ (background sync job implemented)
7. **Add environment validation** - check required env vars at startup

### Verdict

The indexer architecture is **sound and follows the spec well**, but it needs **debugging and completion** before it will work correctly. The critical issues around delegation chain management and database queries need immediate attention. Estimated time needed: **2-4 hours of fixes and testing** before ready to run.

---

## Comprehensive Indexer Testing Plan

Based on my review of your project, I can see you have:

1. **Four logical indexers** (Concept Space, Pubstarter, Delegation, Funding Portal) with critical issues documented in [specs/indexers.md](specs/indexers.md)
2. **A generative testing system** that creates realistic blockchain data
3. **Basic integration tests** that validate Concept Space indexing only
4. **A complete spec** of user queries/actions in [specs/queries-and-actions.md](specs/queries-and-actions.md)

### Current Test Coverage Gaps

Your existing [integration-tests/testIndexer.js](integration-tests/testIndexer.js) only tests the **Concept Space indexer**:
- ✅ Statements, Users, Beliefs, Implications
- ❌ **Not tested**: Pubstarter, Delegation, Funding Portal
- ❌ **Not tested**: Most queries from [queries-and-actions.md](specs/queries-and-actions.md)
- ❌ **Not tested**: Critical bugs documented in [indexers.md](specs/indexers.md)

---

## Recommended Testing Strategy

### **Phase 1: Fix Critical Bugs First** 🔴
Before extensive testing, fix the critical issues documented in [specs/indexers.md:178-303](specs/indexers.md#L178-L303):

1. **Delegation Chain Storage** (FIXED ✅)
2. **Database Query API** - Verify Ponder's actual API syntax
3. **Chain Hash Computation** - Implement or remove placeholder
4. **Intended Statement ID** - Populate from contract state
5. **Note Deactivation** - Mark notes inactive after spending

**Why fix first?** Many of these bugs will cause tests to fail, making it hard to distinguish between test bugs and indexer bugs.

---

### **Phase 2: Expand Test Coverage Using queries-and-actions.md** 📋

Yes, [specs/queries-and-actions.md](specs/queries-and-actions.md) is an excellent checklist! I recommend organizing tests by **indexer subsystem**:

#### **2.1 Concept Space Tests** (Expand existing)
Current coverage is good, but add:
- Search by keyword (full-text search)
- Trending statements (velocity calculation)
- Statement suggestions (based on implications)
- High-profile signers (verified accounts)
- Trusted attesters filtering

#### **2.2 Pubstarter Tests** (New - missing!)
Test queries from lines 51-93:
- Project discovery and filtering
- Contribution tracking
- Donor vs investor distinction
- Token holdings
- Secondary market (buy/sell orders)
- Order book with price-time priority

#### **2.3 Delegation Tests** (New - missing!)
Test queries from lines 94-106:
- Create delegatable notes
- Delegation chain tracking
- Note splits/merges
- Commission percentages
- Revocation handling
- Spend notes to fund projects

#### **2.4 Funding Portal Tests** (New - missing!)
Test cross-cutting queries from lines 51-123:
- Total funding per cause (aggregated)
- Projects aligned with statements (direct + indirect via implications)
- Contributor leaderboards
- Federation to other indexer APIs
- Cached query invalidation

---

### **Phase 3: Test-Driven Development Pattern** 🔄

For each subsystem, follow this pattern:

```javascript
// 1. Generate blockchain events
await simulation.createProject(/* ... */);
await simulation.contributeToProject(/* ... */);

// 2. Wait for indexer sync
await waitForSync();

// 3. Query GraphQL API
const data = await queryGraphQL(`
  query {
    projects(limit: 10) {
      items { id threshold currentFunding }
    }
  }
`);

// 4. Validate against expected state
assert(data.projects.items.length > 0);
assert(data.projects.items[0].currentFunding >= 0);

// 5. Query custom APIs
const projectDetails = await queryAPI(`/pubstarter/api/project/${projectId}`);
assert(projectDetails.contributors.length > 0);
```

---

### **Phase 4: Specific Test Scenarios** 🎯

Beyond basic CRUD, test **edge cases and business logic**:

#### **Concept Space**
- **Indirect support calculation**: Create S1→S2 implication, users sign S1, verify S2 shows indirect supporters
- **Multiple attesters**: Filter implications by trusted attester set
- **Batch beliefs**: setBeliefsInBatch should create multiple belief records

#### **Pubstarter**
- **Assurance contract**: Verify refunds if threshold not met by deadline
- **Burned tokens**: Donors burn tokens, verify they're not counted as investors
- **Partial order fills**: Place buy order for 100 tokens, fulfill in two batches of 50

#### **Delegation**
- **Chain reconstruction**: Delegate Alice→Bob→Charlie, verify full chain query
- **Split invalidation**: Split a note, verify both notes have correct chain
- **Revocation cascading**: Revoke Alice→Bob, verify Bob→Charlie also invalidated
- **Commission tracking**: Verify commissions stored at each hop

#### **Funding Portal (Federation)**
- **Indirect alignment**: Project P aligns with S2, S1→S2, verify P appears for S1
- **Aggregated funding**: Multiple projects for S1, verify total summed correctly
- **Delegation attribution**: Contribute via delegated note, verify full chain visible

---

### **Phase 5: Data Integrity & Stress Tests** 💪

#### **5.1 Deep Validation**
Compare **every blockchain event** with indexed records:
```javascript
// Get all BeliefSet events from blockchain
const events = await beliefsContract.queryFilter('BeliefSet');

// Query all beliefs from indexer
const indexedBeliefs = await queryGraphQL(/* ... */);

// Validate 1:1 correspondence
for (const event of events) {
  const indexed = indexedBeliefs.find(b =>
    b.user === event.args.user &&
    b.statementId === event.args.statementId
  );
  assert(indexed, `Missing belief: ${event.args.user}`);
  assert(indexed.beliefState === event.args.beliefState);
}
```

#### **5.2 Performance Testing**
- Run with **1000+ users, 10 rounds**
- Measure indexer sync time
- Measure GraphQL query response times
- Test pagination with large result sets

#### **5.3 Reorg Handling**
- Simulate blockchain reorganization
- Verify indexer rolls back correctly
- Verify finality thresholds respected

---

### **Implementation Plan**

#### **Option A: Expand testIndexer.js** (Incremental)
Add new test methods to existing file:
```javascript
// In IndexerTestRunner class
async testProjects() { /* ... */ }
async testDelegation() { /* ... */ }
async testFundingPortal() { /* ... */ }
```

**Pros**: Quick to get started
**Cons**: File will become large (500+ lines → 2000+ lines)

#### **Option B: Create Separate Test Files** (Modular)
```
integration-tests/
├── testConceptSpace.js      # Existing + expanded
├── testPubstarter.js         # New
├── testDelegation.js         # New
├── testFundingPortal.js      # New (depends on others)
└── testAll.js                # Orchestrates all tests
```

**Pros**: Better organization, parallel development
**Cons**: Slightly more setup overhead

#### **My Recommendation**: **Option B** - separate files

Create a shared `TestFramework` class with common methods (startIndexer, waitForSync, queryGraphQL), then each test file imports it.

---

### **Concrete Next Steps**

1. **Fix critical bugs** (2-4 hours)
   - Database query API verification
   - Chain hash computation
   - Note deactivation logic

2. **Create test framework** (1 hour)
   - Extract common code from testIndexer.js
   - Create TestFramework base class

3. **Write Pubstarter tests** (2-3 hours)
   - Update simulation to generate projects, contributions
   - Add testPubstarter.js with 10-15 test cases

4. **Write Delegation tests** (2-3 hours)
   - Update simulation to generate notes, delegations, splits
   - Add testDelegation.js with 10-15 test cases

5. **Write Funding Portal tests** (2-3 hours)
   - Test federation queries
   - Validate cross-indexer consistency

6. **Add deep validation** (2 hours)
   - Event-by-event comparison
   - Data integrity checks

**Total estimated effort**: 12-18 hours of focused work

---

### **Would you like me to...**

1. **Start implementing**: Create the test framework and one subsystem's tests (e.g., Pubstarter)?
2. **Fix critical bugs first**: Address the issues in [specs/indexers.md](specs/indexers.md)?
3. **Review existing code**: Deep-dive into the indexer implementation to understand actual vs expected behavior?
4. **Something else**: Different priority or approach?

What would be most valuable to tackle first?
