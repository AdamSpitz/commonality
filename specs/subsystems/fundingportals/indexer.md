# Indexer Architecture

## Key Responsibilities

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
- Alignment attestations (subjectAddress → statementId, by attester)
- Cached results of expensive federated queries
- Aggregated contributor data across aligned projects

**Non-obvious requirements:**
- **Indirect project alignment:** Federates to Concept Space API for direct implication attestations (no transitive traversal), joins with local alignment data
- **Aggregated funding by cause:** Federates to Delegation API for notes, Concept Space API for implications, sums across relevant statements
- **Contributor leaderboards:** Federates to Pubstarter API for contributions, Delegation API for chains, aggregates by cause
- Heavy caching with invalidation on: new implications, new alignments, delegation changes

**Example query:** "Show me all projects aligned with statement S (directly or indirectly via implications), sorted by funding progress, with top contributors and their full delegation chains"
