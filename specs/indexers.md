# Indexer Database Schema Considerations

AI-generated. The prompt was:

    Please read specs/README.md and specs/queries-and-actions.md and anything else relevant, and then come up with a list of any nonobvious things we need to keep in mind when we design our conceptspace and fundingspace indexers' database schemas. Like... some smart contracts are gonna emit some events... the indexers will watch those events and store the data in their DB... but I imagine we're gonna need various indexes to make various kinds of queries efficient enough, and maybe also some clever algorithms (e.g. for computing indirect support), etc. What do we need to do that's more complicated than just "watch the events and shove the data into the DB"?

This document describes the non-obvious database schema and indexing considerations beyond simple event storage.

## Conceptspace Indexer

### 1. Reverse Implication Maps by Attester
- Need a many-to-many relationship: (statement, attester) → [statements that imply it]
- Must support filtering by user's trusted attesters for all queries
- Index: `(implied_statement_id, attester_address, implying_statement_id)`

### 2. Indirect Support Computation via BFS
- Runtime graph traversal on every query (not pre-computed)
- Need efficient adjacency list lookups with attester filtering
- Must track visited nodes to prevent infinite loops in circular graphs
- Need to exclude users who disbelieve any statement in the transitive path (or at minimum, the target)
- Consider caching common traversal results with cache invalidation on new implications

### 3. Direct Supporters Cache
- Maintain current set of believers per statement (updated on belief changes)
- Need to handle belief state transitions: noOpinion ↔ believes ↔ disbelieves
- Index for fast "give me all believers of statement X"

### 4. Statement Content Indexing
- Must pin and cache IPFS content for statements
- Extract metadata (title, excerpt) for search/browse queries
- Parse `references` array to build statement-reference graph
- Full-text search on markdown content
- Handle IPFS retrieval failures gracefully

### 5. Trending/Velocity Calculations
- Need timestamps on support events to compute "signatures per time window"
- Requires time-series indexing for efficient trending queries
- Consider materialized views that refresh periodically

## Funding Portal Indexer

### 6. Indirect Project Alignment
- Similar to indirect support: BFS traversal through implication graph
- Must query Conceptspace indexer's GraphQL API for implication data
- Cache strategy to avoid hammering the other indexer
- Project aligned with S2, S2 implies S1 → project aligned with S1

### 7. Delegatable Notes Chain Tracking
- Store full delegation chains: root → intermediate → ... → leaf
- On revocation, must invalidate entire sub-chain efficiently
- Index: `(note_id, position_in_chain)` for fast chain reconstruction
- Track splits/merges maintaining chain identity

### 8. Aggregated Funding by Cause
- Sum available delegatable notes per statement (direct + indirect via implications)
- Pre-compute or cache these aggregations for performance
- Must recalculate when: new note created, delegation changed, note spent

### 9. Contributor Leaderboards with Context
- Aggregate contributions across all (indirectly) aligned projects
- Distinguish: donors (burned tokens) vs investors (holding tokens)
- Track full delegation chains for attribution (Alice → Bob → Charlie)
- Multiple indexes needed: by cause, by project, by user

### 10. Secondary Market Order Books
- Track active buy/sell orders per (project, token_type)
- Need price-time priority indexing for efficient matching
- Handle order cancellations and partial fills

### 11. ERC-1155 Multi-Token Tracking
- Each project has multiple token types
- Need indexes per (project_address, token_id) for balances and prices
- Track primary market price vs secondary market prices

## Cross-Cutting Concerns

### 12. Multi-Attester Query Performance
- Almost all queries filtered by "trusted attesters" set
- Can't pre-compute because every user has different trusted set
- Need efficient bitmap/set operations for attester filtering

### 13. Graph Depth Limiting
- Prevent DoS via deep implication chains or reference chains
- Configurable max depth (3-5 levels) for reference expansion
- Track depth during BFS to terminate early

### 14. Commission Calculation in Delegation Chains
- When note is spent, calculate commission distribution along chain
- Need to store commission percentages at each delegation hop
- Complex calculation: nested percentages with passthrough

### 15. Event Reorg Handling
- Blockchain reorgs can invalidate recent events
- Need to track block numbers and handle rollbacks
- Consider finality thresholds before treating data as permanent
