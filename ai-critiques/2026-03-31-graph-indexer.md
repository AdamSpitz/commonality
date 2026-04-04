# AI Critique: Graph Indexer Design
**Date:** Tuesday, March 31, 2026

## Analysis of the Existing Indexer
The current indexer (built with Ponder) is an **Event Log Cache**. Its schema is a flat table of raw blockchain events (`topic0`, `topic1`, etc.).
*   **Pros:** Extremely resilient to logic changes; high data integrity.
*   **Cons:** Requires the SDK to perform expensive "folds" and O(N) scans to reconstruct relationships. It is impossible to run multi-hop queries (e.g., "Find all projects supported by anyone who believes a statement that implies Statement X") without fetching massive amounts of data.

---

## Proposed Graph Indexer Design

A graph database (like Neo4j or FalkorDB) is perfectly suited for Commonality because the system is literally a social and logical graph.

### 1. Nodes (Entities)
*   **User:** Wallet addresses.
*   **Statement:** IPFS CIDs representing causes/ideas.
*   **Project:** Smart contract addresses (Pubstarter projects).
*   **Attester:** Entities (AI or human) that create relationships.
*   **Note:** Delegatable notes (tracking capital flow).

### 2. Edges (Relationships)
*   `(:User)-[:BELIEVES {state: "BELIEVES|DISBELIEVES"}]->(:Statement)`
*   `(:Statement)-[:IMPLIES {attester: "0x..."}]->(:Statement)`
*   `(:Project)-[:ALIGNS_WITH {attester: "0x..."}]->(:Statement)`
*   `(:User)-[:DELEGATES_TO {amount: 10, noteId: 1}]->(:User)`
*   `(:Note)-[:INTENDS_FOR]->(:Statement)`
*   `(:User)-[:CONTRIBUTED_TO {amount: 5}]->(:Project)`

### 3. Key Graph Analyses Possible with this Design

#### A. Finding "Commonality" (The Core Mission)
**Query:** Find statements that bridge two opposing user groups.
*   *Logic:* Look for a Statement node `S` that has `IMPLIES` edges coming from both `Group A's` statements and `Group B's` statements.
*   *Benefit:* Quantifies exactly how much "common ground" exists between polarized groups.

#### B. Recursive Delegation Strength
**Query:** Calculate the total "Voting Power" of a delegate.
*   *Logic:* Sum the `amount` of all `DELEGATES_TO` edges that terminate at a specific User, following the chain recursively (up to the `MAX_DELEGATION_DEPTH`).
*   *Benefit:* Instant calculation of a delegate's influence without O(N) SDK folding.

#### C. Path Discovery for Project Funding
**Query:** "Why am I seeing this project?"
*   *Logic:* Find the shortest path from `(Me:User)` to `(Project:P)`.
*   *Path:* `(Me)-[:BELIEVES]->(S1)-[:IMPLIES]->(S2)<-[:ALIGNS_WITH]-(Project)`.
*   *Benefit:* Explains the "Indirect Support" logic visually and intuitively.

---

## Technical Implementation Strategy

### The "Bridge" Indexer
1.  **Event Listener:** Keep Ponder or a custom listener to catch raw events.
2.  **Cypher Transformer:** Create a service that converts events into `MERGE` and `CREATE` Cypher queries.
    *   *Example:* A `DirectSupport` event becomes:
        `MERGE (u:User {address: event.user}) MERGE (s:Statement {cid: event.statementId}) MERGE (u)-[r:BELIEVES]->(s) SET r.state = event.beliefState`
3.  **GraphQL to Cypher:** Use a library like `@neo4j/graphql` to allow the UI to query the graph directly using the existing GraphQL patterns, but with the power of multi-hop traversals.

## Strengthening the Ideas
*   **Temporal Graphs:** Store the `blockTimestamp` on edges. This allows you to "slide back in time" to see how a coalition formed or when a statement gained traction.
*   **Weighted Implications:** If multiple attesters say `S1 -> S2`, the edge weight increases. The graph can then filter for "Strong Commonality" (supported by many attesters) vs. "Weak Commonality."
*   **Sybil Detection:** Use graph topology to identify clusters of accounts that always sign the same statements at the same time, flagging potential Sybil attacks.

## Summary
The current "Event Cache" indexer is the safe foundation, but the "Graph Indexer" is the **Strategic Accelerator**. It moves the complex logic from the user's browser (SDK folding) to the database, enabling the advanced "Commonality" discovery features that the project specs dream about.
