# Federated Indexer Architecture

This document describes how to split the Commonality indexing system into independent, federated indexers rather than using a single monolithic indexer.

## Overview

Instead of one large indexer that watches all contracts and answers all queries, we use multiple specialized indexers that each focus on one domain. Complex cross-cutting queries are handled by a lightweight aggregation layer that federates queries to the specialized indexers.

**Important:** This document describes the *logical* architecture - how we conceptually separate concerns, database schemas, and GraphQL APIs. The *physical* deployment (whether these run as separate processes, separate containers, or all in one executable) is an independent decision that can be changed at any time without affecting the code.

## Architecture Diagram

```
┌─────────────────────┐
│ Concept Space       │
│ Indexer             │  Exports GraphQL API:
│                     │  - getIndirectSupporters(statementId, attesters[])
│ Watches:            │  - getImplyingStatements(statementId, attesters[])
│ - Beliefs events    │  - getImpliedStatements(statementId, attesters[])
│ - Implication events│  - searchStatements(query, attesters[])
│                     │  - etc.
└─────────────────────┘

┌─────────────────────┐
│ Pubstarter          │
│ Indexer             │  Exports GraphQL API:
│                     │  - getProject(address)
│ Watches:            │  - getProjectContributions(address)
│ - Pubstarter events │  - getMarketOrders(projectAddress, tokenId)
│ - ERC1155Marketplace│  - etc.
│   events            │
│ - ERC1155Seller     │  (No knowledge of statements or causes)
│   events            │
└─────────────────────┘

┌─────────────────────┐
│ Delegation          │
│ Indexer             │  Exports GraphQL API:
│                     │  - getNotesByOwner(address)
│ Watches:            │  - getChain(noteId)
│ - DelegatableNotes  │  - getTotalAvailableByStatement(statementId)
│   events            │  - etc.
└─────────────────────┘

┌─────────────────────┐
│ Funding Portal      │
│ Aggregation Indexer │  Exports GraphQL API for cross-cutting queries
│                     │
│ Watches:            │  Consumes upstream APIs:
│ - ProjectAlignment  │  - Concept Space GraphQL API
│   events            │  - Pubstarter GraphQL API
│                     │  - Delegation GraphQL API
│ Builds aggregations:│
│ - Projects aligned  │  Responsibilities:
│   with statement S  │  - Join data from multiple sources
│ - Top contributors  │  - Cache federated query results
│   to cause S        │  - Invalidate caches on relevant events
│ - Total funding for │  - Optimize cross-cutting queries
│   cause S           │
└─────────────────────┘
```

## Individual Indexer Responsibilities

### 1. Concept Space Indexer

**Domain:** Statements, beliefs, and implications

**Watches:**
- `Beliefs.DirectSupport` events
- `Implications.ImplicationAttestation` events

**Data stored:**
- Statements (IPFS content cached locally)
- User beliefs (address → statementId → beliefState)
- Implication graph (organized by attester)
- Direct supporters per statement
- Statement metadata for search

**Key optimizations:**
- Reverse implication maps indexed by attester (indexers.md #1)
- BFS graph traversal for indirect support (indexers.md #2)
- Direct supporters cache (indexers.md #3)
- Full-text search on statement content (indexers.md #4)
- Time-series data for trending calculations (indexers.md #5)

**GraphQL API examples:**
```graphql
query {
  statement(id: $statementId) {
    content
    directSupporters
    indirectSupporters(trustedAttesters: $attesters)
    implyingStatements(trustedAttesters: $attesters)
    impliedStatements(trustedAttesters: $attesters)
  }

  searchStatements(
    query: $searchQuery,
    sortBy: TRENDING,
    trustedAttesters: $attesters
  ) {
    id
    title
    totalSupporters
  }

  userBeliefs(address: $userAddress) {
    statementId
    beliefState
    directlySupported
    indirectlySupported(trustedAttesters: $attesters)
  }
}
```

**Integration points:**
- Accepts `trustedAttesters[]` parameter on all queries
- Exports statement data format and statementId (bytes32) format
- No knowledge of projects, funding, or delegation

### 2. Pubstarter Indexer

**Domain:** Individual crowdfunding projects and their token markets

**Watches:**
- All Pubstarter contract events (ERC1155 transfers, purchases, etc.)
- ERC1155Marketplace events (sale listings, buy orders, fulfillments)
- ERC1155Seller events
- AssuranceContract events

**Data stored:**
- Project details (address, threshold, deadline, recipient)
- Token types per project
- Contributions (who bought what, when)
- Current token holders
- Burned tokens (donors vs investors)
- Active market orders (buy/sell listings)
- Project funding progress

**Key optimizations:**
- Multi-token tracking per project (indexers.md #11)
- Order book indexing for price-time priority (indexers.md #10)
- Fast lookups by project address
- Contributor aggregations per project

**GraphQL API examples:**
```graphql
query {
  project(address: $projectAddress) {
    threshold
    deadline
    currentFunding
    status
    tokenTypes {
      tokenId
      primaryPrice
      totalSupply
      burned
    }
    contributors {
      address
      amountContributed
      tokensBurned
      tokensHeld
    }
  }

  marketOrders(projectAddress: $address, tokenId: $tokenId) {
    saleListings {
      id
      seller
      count
      pricePerToken
    }
    buyOrders {
      id
      buyer
      count
      pricePerToken
    }
  }
}
```

**Integration points:**
- Standard ERC1155 contract addresses as identifiers
- No knowledge of statements, alignment, or causes

### 3. Delegation Indexer

**Domain:** Delegatable notes and delegation chains

**Watches:**
- `DelegatableNotes.NoteCreated` events
- `DelegatableNotes.NoteDelegated` events
- `DelegatableNotes.NoteRevoked` events
- `DelegatableNotes.ChainSplit` events
- `DelegatableNotes.FundsReclaimed` events
- `DelegatableNotes.ERC1155Purchased` events

**Data stored:**
- Active notes (noteId → Note data)
- Delegation chains (with position tracking)
- Notes indexed by owner
- Notes indexed by intendedStatementId
- Historical delegation events

**Key optimizations:**
- Efficient chain reconstruction (indexers.md #7)
- Fast revocation handling (invalidate sub-chains)
- Aggregation of available funds by statement (for simple queries)
- Commission data stored per note (the actual commission *calculation* happens in the smart contract when notes are spent; the indexer just tracks what commissions were set)

**GraphQL API examples:**
```graphql
query {
  note(id: $noteId) {
    amount
    token
    owner
    intendedStatementId
    delegated
    chain {
      owners
      commissions
    }
  }

  notesByOwner(address: $ownerAddress) {
    id
    amount
    token
    intendedStatementId
    isLeaf
  }

  totalAvailableForCause(statementId: $statementId) {
    byToken {
      token
      totalAmount
      noteCount
    }
  }
}
```

**Integration points:**
- Uses statementId format from Concept Space
- No knowledge of implication graph or project alignment

**Note:** This indexer could potentially be merged with the Pubstarter Indexer into a single "Token System Indexer" since they're both focused on token operations.

### 4. Funding Portal Aggregation Indexer

**Domain:** Cross-cutting queries that join concepts, projects, and funding

**Watches:**
- `ProjectAlignment.ProjectAlignmentAttestation` events

**Data stored:**
- Project alignment attestations (projectAddress → statementId, by attester)
- Cached results of expensive federated queries
- Aggregated contributor data across aligned projects

**Queries to upstream indexers:**
- Concept Space API for implication graph traversals
- Pubstarter API for project details and contributions
- Delegation API for available notes

**Key responsibilities:**
- Join project alignment with implication graph to find indirectly aligned projects (indexers.md #6)
- Aggregate contributions across all projects aligned with a cause (indexers.md #9)
- Calculate total available funding per cause, including indirect alignment via implications (indexers.md #8)
  - Queries Delegation API for notes by statementId
  - Queries Concept Space API for implied statements
  - Sums across all relevant statements
- Build cause-level leaderboards with full delegation chain context
- Cache heavily and invalidate on relevant events

**GraphQL API examples:**
```graphql
query {
  fundingPortal(
    statementId: $statementId,
    trustedAttesters: $attesters
  ) {
    totalFundingRaised
    totalAvailableFunding
    projects {
      address
      alignmentType # DIRECT or INDIRECT
      viaStatement # if indirect, which statement it's aligned with
      fundingProgress
      deadline
      contributors
    }
    topContributors {
      address
      totalContributed
      projectsFunded
      donorAmount
      investorAmount
      delegationChains {
        projectAddress
        chain # Alice -> Bob -> Charlie
      }
    }
  }

  userActivity(address: $userAddress, trustedAttesters: $attesters) {
    statementsSigned {
      statementId
      directOrIndirect
    }
    projectsContributed {
      projectAddress
      amountContributed
      alignedWithStatements
    }
  }
}
```

**Caching strategy:**
```typescript
// Pseudocode for a federated query with caching

async function getProjectsForStatement(statementId, trustedAttesters) {
  // Cache key includes attester set
  const cacheKey = `projects:${statementId}:${hash(trustedAttesters)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Federated query:

  // 1. Get implication graph from Concept Space
  const impliedStatements = await conceptSpaceAPI.query(`
    query {
      statement(id: "${statementId}") {
        impliedStatements(trustedAttesters: ${trustedAttesters}) {
          id
        }
      }
    }
  `);

  const allRelevantStatements = [statementId, ...impliedStatements.map(s => s.id)];

  // 2. Get project alignments from local DB
  const alignments = await db.query(`
    SELECT projectAddress, statementId, attester
    FROM project_alignments
    WHERE statementId IN (${allRelevantStatements})
      AND attester IN (${trustedAttesters})
  `);

  // 3. Get project details from Pubstarter API
  const projects = await Promise.all(
    alignments.map(async (alignment) => {
      const project = await pubstarterAPI.getProject(alignment.projectAddress);
      return {
        ...project,
        alignmentType: alignment.statementId === statementId ? 'DIRECT' : 'INDIRECT',
        viaStatement: alignment.statementId
      };
    })
  );

  // Cache for 60 seconds
  await redis.set(cacheKey, JSON.stringify(projects), { ttl: 60 });

  return projects;
}
```

**Cache invalidation:**

The Funding Portal Indexer subscribes to events from other indexers to know when to invalidate:

- New `ImplicationAttestation` event → invalidate all caches for affected statements
- New `ProjectAlignmentAttestation` event → invalidate caches for that statement
- New delegation events → recalculate "total available funding" aggregations

**Integration points:**
- Consumes all three upstream GraphQL APIs
- Minimal local data storage (just alignment attestations and caches)

## Benefits of This Architecture

### 1. Clear Separation of Concerns

Each indexer has a single, well-defined domain:
- **Concept Space**: "Tell me about statements and beliefs"
- **Pubstarter**: "Tell me about crowdfunding projects"
- **Delegation**: "Tell me about notes and delegation chains"
- **Funding Portal**: "Join everything together"

### 2. Independent Development & Testing

- Test Concept Space indexer with mock belief/implication data
- Test Pubstarter indexer with mock contribution data
- Test Funding Portal indexer with mocked upstream APIs
- Build and deploy at different paces
- Each can be rebuilt without affecting others (as long as GraphQL APIs stay stable)

### 3. Reusability

- The Pubstarter indexer could be used for any Kickstarter-like system
- The Delegation indexer could be used for any delegation use case
- The Concept Space indexer could be used for any statement/belief tracking system

### 4. Performance Optimization at the Right Layer

Each indexer optimizes for its domain:
- Concept Space optimizes BFS graph traversal
- Pubstarter optimizes multi-token tracking
- Delegation optimizes chain reconstruction
- Funding Portal optimizes cross-indexer joins and caching

### 5. Scalability

- Deploy indexers on different servers
- Scale hot indexers independently (e.g., Funding Portal might need more resources)
- Distribute load across services

### 6. Handle "Multi-Attester Query Performance" Cleanly

The trusted attester set is passed to Concept Space API, which does all the attester filtering. Downstream indexers just use the filtered results without needing to understand attester logic. (See indexers.md #12)

## Handling Cross-Cutting Concerns

### Cross-Indexer Consistency

When events happen in quick succession (create project → attest alignment → contribute), there may be brief inconsistencies between indexers.

**Solutions:**
1. **Eventual consistency is acceptable** - UI can show "loading" or "not found yet"
2. **Block number tracking** - Don't query downstream until events are indexed
3. **Optimistic updates** - Update UI immediately based on transaction, confirm with indexer later

### Cache Invalidation Strategy

The Funding Portal Indexer maintains caches of expensive federated queries. Invalidation happens when:

1. **New implications** → Invalidate statement caches affected by the new implication
2. **New project alignment** → Invalidate caches for that statement
3. **New delegation events** → Recalculate funding aggregations

Implementation: Subscribe to event streams from other indexers (via webhooks, message queue, or polling).

### Event Reorg Handling

All indexers must handle blockchain reorganizations (indexers.md #15):
- Track block numbers for all events
- On reorg detection, roll back affected events
- Wait for finality threshold before treating data as permanent
- Funding Portal Indexer should invalidate caches when upstream data changes due to reorgs

### Graph Depth Limiting

Both Concept Space and Funding Portal need to limit graph traversal depth (indexers.md #13):
- Configure max depth (3-5 levels) for implication chains
- Track depth during BFS and terminate early
- Return partial results with indication that depth limit was reached

## Migration Path

You can adopt this architecture incrementally:

1. **Start with monolithic indexer** if that's easier initially
2. **Extract Concept Space indexer first** - It's the most independent
3. **Extract Pubstarter indexer** - Also very independent
4. **Create Funding Portal indexer** as aggregation layer
5. **Optionally extract Delegation indexer** if it makes sense

Or start with federated architecture from day one if you want maximum separation from the beginning.

## Mapping to Query Requirements

From specs/queries-and-actions.md, here's where each query lives:

| Query Category | Primary Indexer |
|---------------|-----------------|
| Statement discovery & browsing | Concept Space |
| Statement actions (sign/unsign) | Concept Space |
| User profile & signed statements | Concept Space |
| Statement details & supporters | Concept Space |
| Implication attesters settings | Concept Space |
| Funding portal discovery | Funding Portal (federated) |
| Project details | Pubstarter |
| Project actions (contribute, burn) | Pubstarter |
| Secondary market | Pubstarter |
| Delegatable notes | Delegation |
| Leaderboards by cause | Funding Portal (federated) |
| Cross-component queries | Funding Portal (federated) |

## Alternative: Monolithic Indexer

You could build one large indexer that watches all events.

**Downsides:**
- Tight coupling between domains
- Complex schema mixing beliefs, projects, notes, alignments, orders, contributions
- Testing requires full system setup
- Can't reuse components for other projects
- Single performance bottleneck
- All-or-nothing deployment

**Upsides:**
- Simpler to reason about initially
- No cache invalidation across services
- Atomic queries within one database
- Fewer moving parts

The monolithic approach might be easier for initial prototyping, but the federated approach is likely better for a production system.

## Recommendation

Use **federated indexers** with the four-indexer architecture described above. The complexity of federation is manageable (Funding Portal does the hard work), and the benefits in terms of separation, reusability, and independent development are substantial.

The queries in specs/indexers.md are actually already designed with federation in mind (e.g., item #6 explicitly mentions "must query Conceptspace indexer's GraphQL API").

## Logical vs Physical Architecture

**The logical separation described in this document is completely independent from how you choose to deploy the indexers.**

### Logical Architecture (What Matters for Code)

The key aspects that should be maintained in code:

1. **Separate database schemas** - Each indexer has its own tables/collections
   - Concept Space DB: statements, beliefs, implications
   - Pubstarter DB: projects, contributions, orders
   - Delegation DB: notes, chains
   - Funding Portal DB: alignments, cached aggregations

2. **Separate GraphQL schemas** - Each indexer exposes its own API
   - Defined in separate schema files
   - Can be versioned independently
   - Clear interface contracts

3. **Dependency direction** - Higher-level indexers depend on lower-level ones
   - Funding Portal queries → Concept Space, Pubstarter, Delegation
   - Pubstarter has no dependencies
   - Concept Space has no dependencies
   - Delegation has no dependencies

4. **No shared business logic** - Each indexer's code is independent
   - Concept Space code doesn't import Pubstarter code
   - Federation happens via GraphQL queries, not function calls

### Physical Deployment (Flexible)

You can deploy this architecture in many different ways:

#### Option 1: Monolithic Deployment (Simplest)

All four indexers run in a single process:

```typescript
// index.ts
import { ConceptSpaceIndexer } from './concept-space'
import { PubstarterIndexer } from './pubstarter'
import { DelegationIndexer } from './delegation'
import { FundingPortalIndexer } from './funding-portal'

// All use the same database instance (but separate schemas/tables)
const db = new PostgresClient(DATABASE_URL)

// All run in the same process
const conceptSpace = new ConceptSpaceIndexer(db, 'concept_space_')
const pubstarter = new PubstarterIndexer(db, 'pubstarter_')
const delegation = new DelegationIndexer(db, 'delegation_')
const fundingPortal = new FundingPortalIndexer(db, 'funding_portal_')

// GraphQL "queries" are just direct function calls within the same process
fundingPortal.setUpstreamClients({
  conceptSpace: conceptSpace.api,  // Direct reference, not HTTP
  pubstarter: pubstarter.api,
  delegation: delegation.api
})

// Single GraphQL server exposes all schemas
const server = new ApolloServer({
  schema: mergeSchemas([
    conceptSpace.schema,
    pubstarter.schema,
    delegation.schema,
    fundingPortal.schema
  ])
})
```

**Benefits:**
- Simple deployment (one container/process)
- No network latency between indexers
- Easy debugging (single codebase, single process)
- Simpler development setup

**When to use:** Early development, low traffic, or if you prefer simplicity

#### Option 2: Separate Services (Most Scalable)

Each indexer runs as a separate process/container:

```yaml
# docker-compose.yml
services:
  concept-space-indexer:
    image: commonality/concept-space-indexer
    environment:
      - DATABASE_URL=postgres://...
    ports:
      - "4001:4000"

  pubstarter-indexer:
    image: commonality/pubstarter-indexer
    environment:
      - DATABASE_URL=postgres://...
    ports:
      - "4002:4000"

  delegation-indexer:
    image: commonality/delegation-indexer
    environment:
      - DATABASE_URL=postgres://...
    ports:
      - "4003:4000"

  funding-portal-indexer:
    image: commonality/funding-portal-indexer
    environment:
      - DATABASE_URL=postgres://...
      - CONCEPT_SPACE_URL=http://concept-space-indexer:4000
      - PUBSTARTER_URL=http://pubstarter-indexer:4000
      - DELEGATION_URL=http://delegation-indexer:4000
    ports:
      - "4004:4000"
```

**Benefits:**
- Independent scaling (scale Funding Portal more if it's busier)
- Independent deployment (update one without touching others)
- Better fault isolation (one indexer crash doesn't kill others)
- Can use different languages/runtimes if desired

**When to use:** Production, high traffic, or if you need independent scaling

#### Option 3: Hybrid Approach

Mix and match based on your needs:

```typescript
// Option 3a: Combine low-traffic indexers
const tokenSystem = combineIndexers([
  new PubstarterIndexer(db),
  new DelegationIndexer(db)
])

// But keep Concept Space separate (it's reusable)
const conceptSpace = new ConceptSpaceIndexer(separateDB)

// Option 3b: Run indexers together but expose separate APIs
const server1 = new ApolloServer({ schema: conceptSpace.schema })  // Port 4001
const server2 = new ApolloServer({ schema: pubstarter.schema })    // Port 4002
const server3 = new ApolloServer({ schema: delegation.schema })    // Port 4003
const server4 = new ApolloServer({ schema: fundingPortal.schema }) // Port 4004
```

**When to use:** When you want some benefits of separation without full microservices complexity

### What Stays the Same Across All Deployment Options

Regardless of how you deploy, these remain constant:

1. **GraphQL schemas** - The API contracts don't change
2. **Database schemas** - The table structures don't change
3. **Code organization** - Each indexer is a separate module
4. **Testing** - Tests use mocked upstream APIs, work the same way
5. **Reusability** - Can still extract Pubstarter for other projects

### What Changes Based on Deployment

Only these implementation details:

1. **How GraphQL queries happen**
   - Monolithic: Direct function calls
   - Distributed: HTTP/gRPC requests

2. **Connection strings**
   - Monolithic: Same DB connection with table prefixes
   - Distributed: Different DB instances or shared DB with proper isolation

3. **Error handling**
   - Monolithic: Synchronous errors
   - Distributed: Network errors, timeouts, retries

4. **Development workflow**
   - Monolithic: Run one process
   - Distributed: Docker Compose or similar

### Recommendation: Start Monolithic

For initial development:

1. **Write the code as if they're separate services** (separate modules, GraphQL APIs)
2. **Deploy monolithically** (single process, single container)
3. **Switch to distributed when needed** (just configuration changes, minimal code changes)

This gives you:
- Clean logical separation (good for code quality, testing, reusability)
- Simple deployment (good for getting started quickly)
- Easy migration path (when you need to scale or deploy independently)

The key is to **maintain the logical boundaries in the code** (separate modules, no direct imports between indexers, communication via GraphQL) even if you deploy as a monolith. Then the physical architecture can evolve based on operational needs without major code rewrites.

## Mapping to Indexer Requirements (specs/indexers.md)

This section verifies that all the requirements from specs/indexers.md are properly handled in the federated architecture:

### Conceptspace Indexer Requirements

| Item | Requirement | Handled By | Notes |
|------|-------------|------------|-------|
| #1 | Reverse Implication Maps by Attester | Concept Space Indexer | Local DB with index: (implied_statement_id, attester_address, implying_statement_id) |
| #2 | Indirect Support Computation via BFS | Concept Space Indexer | Runtime graph traversal with attester filtering, caching optional |
| #3 | Direct Supporters Cache | Concept Space Indexer | Local cache updated on belief state transitions |
| #4 | Statement Content Indexing | Concept Space Indexer | IPFS pinning, metadata extraction, full-text search |
| #5 | Trending/Velocity Calculations | Concept Space Indexer | Time-series data, materialized views for trending queries |

### Funding Portal Requirements

| Item | Requirement | Handled By | Notes |
|------|-------------|------------|-------|
| #6 | Indirect Project Alignment | Funding Portal Indexer | Federates to Concept Space API for implication graph, joins with local alignment data |
| #7 | Delegatable Notes Chain Tracking | Delegation Indexer | Stores chains with position indexing for fast reconstruction, handles revocation efficiently |
| #8 | Aggregated Funding by Cause | Funding Portal Indexer | Federates to Delegation API for notes, Concept Space API for implications, sums across all relevant statements |
| #9 | Contributor Leaderboards with Context | Funding Portal Indexer | Federates to Pubstarter API for contributions, Delegation API for chains, aggregates by cause |
| #10 | Secondary Market Order Books | Pubstarter Indexer | Price-time priority indexing, handles partial fills |
| #11 | ERC-1155 Multi-Token Tracking | Pubstarter Indexer | Indexes per (project_address, token_id), tracks primary vs secondary prices |

### Cross-Cutting Concerns

| Item | Requirement | Handled By | Notes |
|------|-------------|------------|-------|
| #12 | Multi-Attester Query Performance | Concept Space Indexer | Attester filtering happens once in Concept Space, filtered results passed to Funding Portal |
| #13 | Graph Depth Limiting | Concept Space Indexer (implications), Concept Space Indexer (references) | Configurable max depth (3-5 levels), BFS terminates early |
| #14 | Commission Calculation in Delegation Chains | Smart Contract (calculation), Delegation Indexer (tracking) | Commission percentages stored per note, actual calculation happens in smart contract on spend |
| #15 | Event Reorg Handling | All Indexers | Each indexer tracks block numbers, handles rollbacks, waits for finality threshold |

### Key Insights from This Mapping

1. **Clear ownership** - Each requirement has a single primary owner (no ambiguity)

2. **Federation pattern works** - Complex queries (#6, #8, #9) are handled by Funding Portal federating to upstream APIs

3. **Caching strategy is explicit** - Heavy caching in Funding Portal for federated queries, with clear invalidation triggers

4. **Performance concerns addressed**:
   - #12 (Multi-Attester) handled by doing filtering once upstream
   - #8 (Aggregated Funding) cached in Funding Portal with TTL/invalidation
   - #9 (Leaderboards) pre-aggregated or cached

5. **Smart contract vs indexer responsibilities**:
   - #14 (Commissions): Smart contract calculates, indexer just tracks what was set
   - This keeps indexers simpler (just event storage + aggregation)

6. **All indexers handle reorgs** (#15) - This is a shared concern but each indexer handles it independently for its own data

### Potential Optimizations

Some items from indexers.md suggest optimizations that could be added:

- **#2, #6**: "Consider caching common traversal results" - The Funding Portal already does this for federated queries
- **#5**: "Consider materialized views that refresh periodically" - Concept Space could use this for trending
- **#8**: "Pre-compute or cache these aggregations" - Funding Portal does this

These are already called out in the federated architecture design, confirming good alignment between the documents.
