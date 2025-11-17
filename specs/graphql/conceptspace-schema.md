# Concept Space Indexer GraphQL Schema

**AI-generated from specs/README.md and contract files**

This document describes the GraphQL schema for the Concept Space indexer, which tracks beliefs and implication relationships between statements.

## Data Sources

- `Beliefs.sol` → `DirectSupport` events
- `Implications.sol` → `ImplicationAttestation` events

## Core Entities

### Statement

Represents an IPFS statement (identified by its CID). The indexer doesn't store the statement content itself (that's on IPFS), but tracks all the metadata about support and implications.

```graphql
type Statement {
  id: String!                    # IPFS CID (bytes32 as hex string)

  # Direct support metrics
  directSupporters: [String!]!   # Array of addresses who BELIEVE (beliefState=1)
  directDisbelievers: [String!]! # Array of addresses who DISBELIEVE (beliefState=2)
  directSupportCount: Int!       # Count of directSupporters
  directDisbeliefCount: Int!     # Count of directDisbelievers

  # Implication relationships (for graph traversal)
  impliedBy: [Implication!]!     # Implications where this is the 'to' statement
  implies: [Implication!]!       # Implications where this is the 'from' statement

  # Metadata
  firstSeenAt: Int!              # Block timestamp when first referenced
}
```

### Implication

Tracks attestations of the form "fromStatement → toStatement" made by an attester.

```graphql
type Implication {
  id: String!                    # Composite ID: "attester-fromId-toId"
  attester: String!              # Address of the attester (typically AI)
  fromStatementId: String!       # Source statement CID
  toStatementId: String!         # Target statement CID
  fromStatement: Statement!      # Resolved Statement object
  toStatement: Statement!        # Resolved Statement object
  createdAt: Int!                # Block timestamp
  blockNumber: Int!              # Block number
  transactionHash: String!       # Transaction hash
}
```

### Belief

Tracks a user's belief state for a specific statement. Only stores the latest state per user-statement pair.

```graphql
type Belief {
  id: String!                    # Composite ID: "user-statementId"
  user: String!                  # User address
  statementId: String!           # Statement CID
  statement: Statement!          # Resolved Statement object
  beliefState: Int!              # 0=NO_OPINION, 1=BELIEVES, 2=DISBELIEVES
  updatedAt: Int!                # Block timestamp of last update
  blockNumber: Int!              # Block number of last update
  transactionHash: String!       # Transaction hash of last update
}
```

### User

Aggregated view of a user's beliefs.

```graphql
type User {
  id: String!                    # User address
  beliefs: [Belief!]!            # All beliefs by this user
  believedStatements: [Statement!]!    # Statements with beliefState=BELIEVES
  disbelievedStatements: [Statement!]! # Statements with beliefState=DISBELIEVES
  beliefCount: Int!              # Count of non-NO_OPINION beliefs
}
```

## Query API

```graphql
type Query {
  # Get a specific statement by ID
  statement(id: String!): Statement

  # List all statements (with pagination)
  statements(
    first: Int = 100,
    skip: Int = 0,
    orderBy: String = "directSupportCount",
    orderDirection: String = "desc"
  ): [Statement!]!

  # Get a specific user's beliefs
  user(id: String!): User

  # Get a specific belief
  belief(id: String!): Belief

  # Find all beliefs for a statement
  beliefsForStatement(
    statementId: String!,
    beliefState: Int  # Optional filter: 0, 1, or 2
  ): [Belief!]!

  # Get implications by attester (for filtering trusted attesters)
  implications(
    attester: String,
    fromStatementId: String,
    toStatementId: String
  ): [Implication!]!

  # Get all attesters who have made at least one implication
  attesters: [String!]!

  # COMPUTED QUERIES (not stored, calculated at query time):

  # Given a statement and trusted attesters, compute indirect support
  # This implements the implication resolution algorithm (see specs/algorithms/implication-resolution.md)
  indirectSupporters(
    statementId: String!,
    trustedAttesters: [String!]!
  ): IndirectSupportResult!

  # Suggest statements user might want to sign
  # (finds statements implied by what user signed that are more popular)
  suggestedStatements(
    userAddress: String!,
    trustedAttesters: [String!]!,
    limit: Int = 10
  ): [Statement!]!
}

# Result type for indirect support computation
type IndirectSupportResult {
  statementId: String!
  indirectSupporters: [String!]!       # Array of addresses
  indirectSupportCount: Int!
  implyingStatements: [Statement!]!    # Statements that imply the target

  # Breakdown by implying statement (for transparency)
  breakdown: [IndirectSupportBreakdown!]!
}

type IndirectSupportBreakdown {
  implyingStatement: Statement!
  supporters: [String!]!               # Direct supporters of this implying statement
  supporterCount: Int!
}
```

## Implementation Notes

### Direct Support Storage

- For each `DirectSupport` event, update the `Belief` entity for that user-statement pair
- Recompute `Statement.directSupporters` and `Statement.directDisbelievers` arrays
- Only the latest belief state per user matters (not a history log)

### Implication Storage

- Store implications bidirectionally for efficient graph traversal:
  - Add to `Statement.impliedBy` for the `toStatement`
  - Add to `Statement.implies` for the `fromStatement`
- Index by attester to enable filtering by trusted attesters

### Indirect Support Computation

**NOT stored in the database.** Computed at query time because:
1. Different users trust different attesters
2. Would need to precompute for all possible attester combinations (impractical)

Algorithm (from [specs/algorithms/implication-resolution.md](../../algorithms/implication-resolution.md)):
1. BFS traversal backward through `impliedBy` edges, filtering by trusted attesters
2. Collect all implying statements (with cycle detection via visited set)
3. For each implying statement, get its `directSupporters`
4. Return union of all supporter sets

### Suggested Statements Algorithm

For each statement S that the user believes:
1. Find all statements S2 where S → S2 (statements implied by what user signed)
2. Filter to S2 where `S2.directSupportCount > S.directSupportCount`
3. Sort by support count descending
4. Return top N

## Example Queries

### Get statement with direct support

```graphql
{
  statement(id: "QmXyz...") {
    id
    directSupportCount
    directDisbeliefCount
    directSupporters
    impliedBy {
      fromStatement {
        id
        directSupportCount
      }
      attester
    }
  }
}
```

### Get indirect support

```graphql
{
  indirectSupporters(
    statementId: "QmXyz...",
    trustedAttesters: ["0x123...", "0x456..."]
  ) {
    indirectSupportCount
    breakdown {
      implyingStatement {
        id
      }
      supporterCount
    }
  }
}
```

### Get user's beliefs

```graphql
{
  user(id: "0x789...") {
    believedStatements {
      id
      directSupportCount
    }
    beliefCount
  }
}
```
