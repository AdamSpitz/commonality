# Funding Portal Indexer GraphQL Schema

**AI-generated from specs/README.md and contract files**

This document describes the GraphQL schema for the Funding Portal indexer, which tracks crowdfunding projects, their alignment with statements, delegation of funding decisions, and secondary market activity.

## Data Sources

- `PremintingERC1155.sol` / `AssuranceContract.sol` → Project contracts
- `ProjectAlignment.sol` → `ProjectAlignmentAttestation` events (this file is in specs/contracts/funding-portals)
- `DelegatableNotes.sol` → Delegation and funding events
- `ERC1155Marketplace.sol` → Secondary market events
- Project metadata from IPFS (via `contractURI`)

## Core Entities

### Project

A crowdfunding project represented as an ERC1155 contract.

```graphql
type Project {
  id: String!                    # Contract address
  creator: String!               # Project owner/deployer
  contractURI: String!           # IPFS metadata URI (ERC7572)

  # Assurance contract fields (if project uses AssuranceContract pattern)
  recipient: String              # Who receives funds if successful
  fundingGoal: BigInt            # Threshold in wei (null if no goal set)
  deadline: Int                  # Unix timestamp (null if no deadline)
  amountRaised: BigInt           # Current funding progress in wei
  hasSucceeded: Boolean          # True if fundingGoal reached
  hasFailed: Boolean             # True if deadline passed without reaching goal

  # Alignment with statements/causes
  alignments: [ProjectAlignment!]!
  alignedStatementIds: [String!]! # Quick access to statement CIDs

  # Funding activity
  contributions: [Contribution!]!
  contributionCount: Int!
  totalContributed: BigInt!      # Sum of all contributions
  topContributors: [Contributor!]! # Aggregated leaderboard

  # Token economics (ERC1155)
  tokenIds: [String!]!           # Available token IDs
  totalSupply: BigInt            # Total tokens minted/sold

  # Metadata (parsed from contractURI if available)
  name: String
  description: String
  imageUrl: String

  # Discovery metadata
  createdAt: Int!                # Block timestamp
  blockNumber: Int!
}
```

### ProjectAlignment

Links projects to statements via attester declarations.

```graphql
type ProjectAlignment {
  id: String!                    # Composite: "project-statement-attester"
  projectAddress: String!
  project: Project!              # Resolved Project object
  statementId: String!           # IPFS CID of aligned statement
  attester: String!              # Who made this attestation
  createdAt: Int!                # Block timestamp
  blockNumber: Int!
  transactionHash: String!
}
```

### Contribution

Records a single funding contribution (from direct purchase or via delegated note).

```graphql
type Contribution {
  id: String!                    # Transaction hash + log index
  project: Project!              # Project that received funding
  projectAddress: String!

  # Who made the contribution
  contributor: String!           # Leaf owner (who made the decision)
  amount: BigInt!                # Amount in wei or token value

  # Token details
  tokenId: String                # ERC1155 token ID purchased (if applicable)
  tokenCount: Int                # Number of tokens purchased

  # Donation vs investment
  isDonation: Boolean!           # True if tokens were immediately burned

  # Delegation chain (if funded via DelegatableNotes)
  delegationChain: [String!]     # [leaf, intermediate..., root] addresses
  originalSource: String         # Root note owner (original depositor)
  noteId: String                 # DelegatableNote ID used (if applicable)

  # Metadata
  timestamp: Int!
  blockNumber: Int!
  transactionHash: String!
}
```

### Contributor

Aggregated statistics for a contributor to a specific project.

```graphql
type Contributor {
  id: String!                    # Composite: "project-address"
  address: String!               # Contributor address
  project: Project!

  totalAmount: BigInt!           # Total contributed
  donatedAmount: BigInt!         # Amount from burned tokens
  investedAmount: BigInt!        # Amount from held tokens
  contributionCount: Int!        # Number of contributions

  contributions: [Contribution!]! # Individual contribution records

  # Delegation context
  isDelegatedFunding: Boolean!   # True if any contribution was via delegation

  firstContributedAt: Int!       # Timestamp of first contribution
  lastContributedAt: Int!        # Timestamp of latest contribution
}
```

### DelegatableNote

Represents a note in the DelegatableNotes system (for tracking available funding).

```graphql
type DelegatableNote {
  id: String!                    # Note ID from contract
  owner: String!                 # Current owner (leaf in delegation chain)
  amount: BigInt!                # Amount of tokens
  token: String!                 # ERC20 token address

  # Delegation structure
  parentNoteId: String           # Parent note ID (null if root)
  parentNote: DelegatableNote    # Resolved parent
  delegated: Boolean!            # Has this note been delegated to someone else?
  childNote: DelegatableNote     # Child note (if delegated)

  # Derived fields
  rootOwner: String!             # Original depositor (root of chain)
  isLeaf: Boolean!               # True if !delegated (can be spent/delegated)
  isRoot: Boolean!               # True if parentNoteId is null
  chainDepth: Int!               # Distance from root

  # Intent/purpose (could be stored in metadata or associated by user action)
  intendedStatementId: String    # Statement/cause this note is earmarked for

  # Lifecycle events
  createdAt: Int!
  updatedAt: Int!                # Last delegation/revocation/consumption
  consumed: Boolean!             # True if note has been spent
  consumedAt: Int                # Timestamp when consumed
}
```

### MarketListing

Secondary market listing for project tokens (ERC1155).

```graphql
type MarketListing {
  id: String!                    # Listing ID from marketplace contract
  marketplace: String!           # Marketplace contract address
  project: Project!              # ERC1155 project contract
  projectAddress: String!

  seller: String!
  tokenId: String!
  count: Int!                    # Number of tokens for sale
  pricePerToken: BigInt!         # Price in wei per token

  active: Boolean!               # False if fulfilled or cancelled

  createdAt: Int!
  updatedAt: Int!                # Last modification (partial fulfillment, cancellation)
  transactionHash: String!
}
```

### BuyOrder

Buy order on secondary market (inverse of listing).

```graphql
type BuyOrder {
  id: String!                    # Order ID from marketplace contract
  marketplace: String!
  project: Project!
  projectAddress: String!

  buyer: String!
  tokenId: String!
  count: Int!
  pricePerToken: BigInt!

  active: Boolean!

  createdAt: Int!
  updatedAt: Int!
  transactionHash: String!
}
```

### FundingPortal

Aggregated view of all projects aligned with a specific statement/cause.

```graphql
type FundingPortal {
  statementId: String!           # The statement/cause this portal is for

  # Projects (direct + indirect via implication resolution)
  directProjects: [Project!]!    # Directly attested
  indirectProjects: [Project!]!  # Attested to aligned implying statements
  allProjects: [Project!]!       # Union of direct + indirect

  # Aggregate metrics
  totalProjectCount: Int!
  totalFundingRaised: BigInt!    # Sum across all aligned projects
  totalContributors: Int!        # Unique contributors

  # Available funding (delegatable notes earmarked for this cause)
  availableFunding: BigInt!      # Sum of undelegated leaf notes
  availableNotes: [DelegatableNote!]! # Notes earmarked for this statement

  # Top contributors across all aligned projects
  topContributors: [CauseContributor!]!
}
```

### CauseContributor

Aggregated contributor stats across all projects aligned with a cause.

```graphql
type CauseContributor {
  id: String!                    # Composite: "statementId-address"
  address: String!
  statementId: String!           # The cause they've contributed to

  totalAmount: BigInt!           # Total across all aligned projects
  projectCount: Int!             # Number of projects funded
  contributionCount: Int!

  # Breakdown by project
  projectContributions: [Contributor!]!
}
```

## Query API

```graphql
type Query {
  # Projects
  project(id: String!): Project

  projects(
    first: Int = 100,
    skip: Int = 0,
    orderBy: String = "createdAt",
    orderDirection: String = "desc"
  ): [Project!]!

  # Find projects aligned with a statement
  # This is a COMPUTED query that uses implication resolution
  projectsForStatement(
    statementId: String!,
    trustedAttesters: [String!]!, # For implication resolution
    includeIndirect: Boolean = true
  ): [Project!]!

  # Funding portal for a cause (aggregated view)
  fundingPortal(
    statementId: String!,
    trustedAttesters: [String!]!
  ): FundingPortal!

  # Contributions
  contribution(id: String!): Contribution

  contributionsForProject(
    projectId: String!,
    first: Int = 100,
    skip: Int = 0
  ): [Contribution!]!

  contributionsByUser(
    userAddress: String!,
    first: Int = 100,
    skip: Int = 0
  ): [Contribution!]!

  # Contributors
  contributor(id: String!): Contributor

  topContributorsForProject(
    projectId: String!,
    limit: Int = 10
  ): [Contributor!]!

  # Top contributors across all projects aligned with a cause
  topContributorsForCause(
    statementId: String!,
    trustedAttesters: [String!]!,
    limit: Int = 10
  ): [CauseContributor!]!

  # Delegatable notes
  note(id: String!): DelegatableNote

  userNotes(
    owner: String!,
    leafOnly: Boolean = true,
    consumed: Boolean = false
  ): [DelegatableNote!]!

  notesForStatement(
    statementId: String!,
    leafOnly: Boolean = true,
    consumed: Boolean = false
  ): [DelegatableNote!]!

  # Available funding for a cause (sum of undelegated leaf notes)
  availableFunding(statementId: String!): BigInt!

  # Secondary market
  marketListings(
    projectId: String,
    seller: String,
    activeOnly: Boolean = true
  ): [MarketListing!]!

  buyOrders(
    projectId: String,
    buyer: String,
    activeOnly: Boolean = true
  ): [BuyOrder!]!

  # Project alignments
  alignmentsForProject(projectId: String!): [ProjectAlignment!]!
  alignmentsForStatement(statementId: String!): [ProjectAlignment!]!
}
```

## Implementation Notes

### Project Creation

- Index `AssuranceContractInitialized` events from projects
- Fetch `contractURI` and parse metadata from IPFS
- Track ERC1155 minting/transfer events for token supply

### Contribution Tracking

- Index direct token purchases from `AssuranceContract` sales
- Index `DelegatableNotes` consumption events (when notes are used to fund projects)
- Parse delegation chains from `DelegatableNotes` events to populate `delegationChain` field
- Compute `isDonation` by checking if tokens were immediately burned (ERC1155Burnable events)

### Delegation Chain Reconstruction

For each contribution from a `DelegatableNote`:
1. Find the consumed leaf note
2. Traverse parent links to build chain: [leaf, parent, grandparent, ..., root]
3. Store as `Contribution.delegationChain`
4. Extract `originalSource` from root note owner

### Indirect Project Alignment

Projects can be indirectly aligned via statement implications:
- Project P attested to align with statement S1
- Statement S1 implies statement S2 (via trusted attester)
- Therefore P is indirectly aligned with S2

Algorithm:
1. Find all direct alignments for statement S2
2. Use implication resolution to find all statements that imply S2
3. Find all projects aligned with those implying statements
4. Return union (mark as indirect)

### Available Funding Computation

Sum of all `DelegatableNote` entities where:
- `isLeaf = true` (not delegated)
- `consumed = false` (not yet spent)
- `intendedStatementId = targetStatement`

### Top Contributor Aggregation

Precompute `Contributor` entities by:
- Grouping `Contribution` by (project, contributor address)
- Summing amounts, counting contributions
- Sorting by `totalAmount` descending

For cause-level leaderboard (`CauseContributor`):
- Find all projects aligned with the cause (direct + indirect)
- Group contributions across those projects by address
- Aggregate sums and counts

### Secondary Market Indexing

- Index `SaleListingCreated`, `BuyOrderCreated` events
- Update `active` field on fulfillment/cancellation events
- Enables "investor exit path" feature (Retroactive Funding)

## Example Queries

### Get funding portal for a cause

```graphql
{
  fundingPortal(
    statementId: "QmXyz...",
    trustedAttesters: ["0x123..."]
  ) {
    totalFundingRaised
    availableFunding
    allProjects {
      id
      name
      amountRaised
      contributionCount
    }
    topContributors {
      address
      totalAmount
      projectCount
    }
  }
}
```

### Get project with contributions and delegation chains

```graphql
{
  project(id: "0xABC...") {
    name
    fundingGoal
    amountRaised
    topContributors {
      address
      totalAmount
      contributions {
        amount
        delegationChain
        originalSource
      }
    }
  }
}
```

### Get user's delegatable notes

```graphql
{
  userNotes(owner: "0x789...", leafOnly: true) {
    id
    amount
    token
    rootOwner
    chainDepth
    intendedStatementId
  }
}
```

### Get available funding for a cause

```graphql
{
  availableFunding(statementId: "QmXyz...")
}
```
