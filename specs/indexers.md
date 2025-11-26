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

# Indexer Implementation Review

## Current State Assessment

**What's Working Well:**
- Clean federated architecture with 4 logical subsystems (Concept Space, Pubstarter, Delegation, Funding Portal)
- Comprehensive database schema with proper indexing for key queries
- **Extensive event handlers implemented** for all major contracts across all subsystems
- IPFS sync jobs for resilient content fetching (Concept Space fully implemented)
- Integration tests that validate basic Concept Space functionality
- Proper separation of concerns with GraphQL APIs
- **Sophisticated delegation chain tracking** with proper position-based indexing
- **Complete secondary market implementation** with order book management

**Implementation Status by Subsystem:**

### ✅ **Concept Space** - Fully Implemented
- Complete event handlers for Beliefs and Implications contracts
- IPFS sync jobs for content fetching
- Comprehensive database schema with proper indexing
- Statement caching and belief state management

### ✅ **Pubstarter** - Fully Implemented  
- Full event handlers for factory contracts (AssuranceContract, ERC1155, Marketplace)
- Complete assurance contract lifecycle (initialization, contributions, refunds, withdrawals)
- Comprehensive secondary market handling (sale listings, buy orders, trades, cancellations)
- Participant summary tracking and correlation between contracts
- **Complete IPFS metadata fetching** with background sync job and retry logic

### ✅ **Delegation** - Fully Implemented
- Complete event handlers for DelegatableNotes contract
- Sophisticated chain tracking with position-based indexing
- Proper handling of splits, delegations, revocations, and consumption
- Chain hash computation matching Solidity logic
- Event audit trail

### ✅ **Funding Portal** - Implemented
- Event handlers for ProjectAlignment attestations
- Simple but complete for its scope
- **Missing: Federated query implementation** (currently only stores attestations, doesn't federate queries to other subsystems)

## Real Issues to Address

### **High Priority:**

1. **Implement federated queries in Funding Portal**
   - Currently only stores project alignments
   - Needs to query Concept Space for indirect implications
   - Needs to query Pubstarter for project data
   - Needs to query Delegation for note data

2. **Extend integration tests** beyond Concept Space
   - Add tests for Pubstarter contracts and funding flow
   - Add tests for Delegation functionality
   - Add tests for Funding Portal federated queries
   - Add tests for cross-subsystem interactions

3. **Remove misleading TODO comment** in pubstarter/index.ts
   - IPFS metadata fetching is already implemented
   - Clean up outdated documentation

### **Medium Priority:**

4. **Add comprehensive error handling**
   - Better error handling in event handlers
   - Retry logic for failed operations
   - Graceful degradation for IPFS failures

5. **Implement monitoring and health checks**
   - Indexer status monitoring
   - Performance metrics
   - Database health checks

6. **Add query optimization**
   - Optimize federated queries in Funding Portal
   - Add caching for expensive cross-subsystem queries
   - Implement pagination in APIs

### **Lower Priority:**

7. **Performance testing under load**
   - Test with realistic data volumes
   - Benchmark query performance
   - Stress test indexer throughput

8. **Failure scenario testing**
   - Blockchain reorg handling
   - IPFS downtime scenarios
   - Database corruption recovery

## Specific Immediate Actions

If starting work tomorrow, the recommended sequence would be:

1. **Implement federated queries** in Funding Portal APIs
2. **Extend integration tests** to cover all subsystems and interactions
3. **Remove misleading TODO comment** in pubstarter/index.ts
4. **Add comprehensive error handling** with retry logic and proper logging
5. **Implement basic monitoring** to track indexer health and performance

## Overall Assessment

The indexer is actually **about 75% complete** in terms of core functionality, not 25% as initially assessed. The federated architecture is well-implemented and most subsystems have comprehensive event handlers. The foundation is very solid, and core indexing logic is well-implemented.

The main gaps are in:
- **Federated query implementation** in Funding Portal
- **Test coverage** beyond Concept Space
- **Error handling and monitoring**
- **Documentation cleanup** (remove misleading TODO comments)

Once these core issues are addressed, the indexer should be highly trustworthy and ready for production use. The existing implementation demonstrates sophisticated understanding of the domain requirements and follows best practices for event-driven indexing.
