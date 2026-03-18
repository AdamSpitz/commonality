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
- Time-series data for trending calculations ("signatures per time window") — deferred; the schema has a `trendingIdx` index on `(statementId, beliefState, updatedAt)` as a foundation
- Full-text search on statement content — deferred

**Example query:** "Give me all statements that directly imply statement S, according to attesters A1 and A2" (then union their supporters for indirect support count)

For cross-cutting concerns (multi-attester filtering, event reorg handling, no-graph-traversal rationale) and deployment architecture, see [../../indexer](../../indexer/README.md).
