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
- Full-text search on statement content

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

2. **Missing Database Query Methods** ([src/delegation/index.ts:42-45](../indexer/src/delegation/index.ts#L42-L45))
   - Uses `.select().from().where()` pattern that may not match Ponder's actual API
   - Similar patterns in [delegation/api.ts](../indexer/src/delegation/api.ts) throughout
   - **Need to verify**: Check if this is the correct Ponder query syntax vs using `context.db.find()` or similar

3. **ChainSplit Handler Logic** ([src/delegation/index.ts:231-308](../indexer/src/delegation/index.ts#L231-L308))
   - Updates `remainderLeafId` but the variable name suggests it should update `originalLeafId`
   - The contract behavior vs indexer behavior needs clarification: which note ID persists and which is new?

4. **Missing Chain Hash Computation** ([src/delegation/index.ts:120](../indexer/src/delegation/index.ts#L120))
   - Placeholder returns `0x00...00` instead of computing actual chain hash
   - This means chain verification won't work properly
   - Either needs implementation or should read from contract state

5. **Intended Statement ID Not Set** ([src/delegation/index.ts:130](../indexer/src/delegation/index.ts#L130))
   - Always defaults to `0x00...00` - the note's intended statement alignment won't be tracked
   - Needs to read this from contract state or event args

### Major Issues 🟠

6. **IPFS Fetching in Event Handlers** ([src/conceptspace/index.ts:59-76](../indexer/src/conceptspace/index.ts#L59-L76))
   - Async IPFS fetch doesn't await completion before continuing
   - Uses `.then()` which may not work correctly with Ponder's indexing
   - **Risk**: IPFS content might never get fetched or might cause race conditions
   - **Better approach**: Either use a background job queue or accept that IPFS content is eventually consistent

7. **Missing ERC1155Purchased Note Deactivation** ([src/delegation/index.ts:411-422](../indexer/src/delegation/index.ts#L411-L422))
   - Comment acknowledges input notes should be marked inactive but doesn't implement it
   - **Risk**: Notes will appear "available" even after being spent
   - Needs logic to either mark notes inactive or update amounts based on contract state

8. **API Import Issues** ([src/api/index.ts](../indexer/src/api/index.ts))
   - Multiple API files (conceptspace, pubstarter, delegation, fundingportal) but no evidence they're aggregated
   - The main API aggregation file needs to exist to expose all endpoints

9. **Factory Address Correlation** ([src/pubstarter/index.ts:66-89](../indexer/src/pubstarter/index.ts#L66-L89))
   - Factory events just log to console rather than storing relationships
   - Makes it difficult to query "which marketplace goes with which project"
   - Consider adding a mapping table or enriching project records

### Medium Issues 🟡

10. **Query API Consistency** ([src/conceptspace/api.ts](../indexer/src/conceptspace/api.ts), [delegation/api.ts](../indexer/src/delegation/api.ts))
    - Mix of different query patterns: `db.find()`, `db.select().from().where()`, `db.select().from().where().orderBy()`
    - Some use `eq()`, `and()`, `inArray()` while others use different patterns
    - **Verify**: Ensure all these are valid Ponder API patterns

11. **Missing Input Validation**
    - API endpoints don't validate hex strings are properly formatted
    - BigInt parsing could fail with invalid input ([delegation/api.ts:56](../indexer/src/delegation/api.ts#L56))
    - Should add try-catch and format validation

12. **Note Delegation Logic Complexity** ([src/delegation/index.ts:165-225](../indexer/src/delegation/index.ts#L165-L225))
    - The handler assumes `NoteDelegated` might be emitted before `ChainSplit` for partial delegations
    - Event ordering dependency could cause issues if events arrive out of order
    - May need to buffer events or handle both orderings

13. **Missing Metadata Fetching** ([src/pubstarter/index.ts:152](../indexer/src/pubstarter/index.ts#L152))
    - TODO comment for IPFS metadata fetching never implemented
    - Projects won't have cached metadata content

14. **Delegation Chain Revocation** ([src/delegation/index.ts:335-341](../indexer/src/delegation/index.ts#L335-L341))
    - Deletes chain entries one at a time in a loop
    - Could be more efficient with a single "delete where position > X" query

### Minor Issues / Improvements 🟢

15. **Console.log in Production Code** ([src/pubstarter/index.ts:72, 86](../indexer/src/pubstarter/index.ts#L72))
    - Should use proper logging framework instead of console.log
    - Consider structured logging for production

16. **Magic Numbers**
    - Belief states (0, 1, 2) hardcoded in multiple places
    - Token types (0, 1) hardcoded
    - Consider exporting constants from schema file

17. **Missing Error Handling**
    - Most event handlers don't have try-catch blocks
    - Failed IPFS fetches log warnings but might need retry logic
    - Database update failures could cause inconsistent state

18. **TypeScript Type Safety**
    - Many `any` types in query results ([delegation/api.ts](../indexer/src/delegation/api.ts))
    - Could benefit from proper typing of database query results

19. **API Response Pagination Missing**
    - Endpoints like `/api/active-notes` could return unlimited results
    - Should add limit/offset parameters

20. **Missing Index on Common Queries**
    - Schema has good indexes overall, but might benefit from composite index on `(statementId, beliefState, updatedAt)` for trending queries

### Positive Aspects ✅

- **Excellent separation of concerns** - four subsystems are properly isolated
- **Good schema design** - indexes are well thought out
- **Clear documentation** - helpful comments throughout
- **Non-transitive implications** - correctly implements the spec's requirement
- **Comprehensive API endpoints** - good coverage of use cases
- **Proper event sourcing** - noteEvents table provides full audit trail
- **Factory pattern usage** - correctly uses Ponder's factory pattern for dynamic contracts

### Recommendations

1. **Fix critical issues first** - especially delegation chain management and database queries
2. **Add integration tests** - test event handler flows end-to-end
3. **Verify Ponder API usage** - confirm query patterns match Ponder's actual API
4. **Add proper error handling** - wrap handlers in try-catch, add retry logic
5. **Implement missing features** - chain hash computation, note deactivation, metadata fetching
6. **Test IPFS integration** - ensure content fetching actually works
7. **Add environment validation** - check required env vars at startup

### Verdict

The indexer architecture is **sound and follows the spec well**, but it needs **debugging and completion** before it will work correctly. The critical issues around delegation chain management and database queries need immediate attention. Estimated time needed: **2-4 hours of fixes and testing** before ready to run.
