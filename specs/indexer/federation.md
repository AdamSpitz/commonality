# Indexer Architecture

This document describes how the Commonality indexing system is split into independent, federated indexers.

## Overview

Instead of one large indexer, we use multiple specialized indexers that each focus on one domain. Complex cross-cutting queries are handled by federation (one indexer queries another's GraphQL API).

**Important:** This describes the *logical* architecture - the conceptual separation, database schemas, and GraphQL APIs. The *physical* deployment (separate processes vs single executable) is a separate decision that can change without affecting the code.

## The Five Indexers

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
Note: The top-level spec lists Marketplace as a separate subsystem, but in the
current implementation secondary-market indexing is folded into Pubstarter
(since it shares the same project context). If it's ever extracted into its own
subsystem, update this list.

┌──────────────────┐
│ Delegation       │  Watches: DelegatableNotes, NoteIntent
│ Indexer          │  Exports: GraphQL API for notes, delegation chains
│                  │  Dependencies: None
└──────────────────┘

┌──────────────────┐
│ Funding Portal   │  Watches: AlignmentAttestations
│ Indexer          │  Exports: GraphQL API for cross-cutting queries
│                  │  Dependencies: Queries Concept Space, Pubstarter, Delegation APIs
└──────────────────┘

┌──────────────────┐
│ Mutable Refs     │  Watches: MutableRefUpdater
│ Indexer          │  Exports: GraphQL API for named mutable references to IPFS content
│                  │  Dependencies: None
└──────────────────┘
```

## Specs for each subsystem's indexer

See:
  - subsystems/conceptspace/indexer.md
  - subsystems/fundingportals/indexer.md (covers Pubstarter, Delegation, and Funding Portal)

Mutable Refs is a small utility subsystem (tracks named owner+name → IPFS CID references with update history). See [subsystems/mutable-refs/README.md](subsystems/mutable-refs/README.md).

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
