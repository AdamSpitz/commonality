# Indexer Architecture

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
