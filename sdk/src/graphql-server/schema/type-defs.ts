/**
 * GraphQL type definitions for the unified SDK GraphQL server
 */

export const typeDefs = `#graphql
  # Scalar types
  scalar BigInt
  scalar Address

  # ============================================================================
  # Conceptspace Types
  # ============================================================================

  type Statement {
    id: ID!
    believerCount: Int!
    disbelieverCount: Int!
    cid: String
    statementType: String
    title: String
    excerpt: String
    createdAt: String
  }

  type UserBelief {
    statementId: ID!
    beliefState: Int! # 0=noOpinion, 1=believes, 2=disbelieves
  }

  type Implication {
    attester: Address!
    fromStatementCid: ID!
    toStatementCid: ID!
    explanationCid: ID!
    createdAt: String!
    blockNumber: String!
  }

  type IndirectSupporter {
    user: Address!
    viaStatementId: ID!
    viaStatement: Statement
  }
  type StatementListItem {
    id: ID!
    cid: String
    statementType: String
    title: String
    excerpt: String
    believerCount: Int!
    disbelieverCount: Int!
    createdAt: String
  }

  type StatementSuggestion {
    statement: StatementListItem!
    reason: String! # e.g., "more popular" or "implied by this statement"
    relationshipType: String! # "impliedBy" or "implies"
  }

  # ============================================================================
  # Pubstarter Types
  # ============================================================================

  type Project {
    id: ID!
    totalReceived: String!
    threshold: String!
    deadline: String!
    cid: String
    title: String
    description: String
    createdAt: String
  }

  type ProjectToken {
    projectAddress: Address!
    erc1155Address: Address!
    tokenId: String!
    price: String!
    createdAt: String
  }

  type Contribution {
    id: ID!
    projectAddress: Address!
    participant: Address!
    erc1155Address: Address
    tokenIds: String
    tokenCounts: String
    totalCost: String
    amount: String!
    timestamp: String!
    createdAt: String
    blockNumber: String!
    transactionHash: String
  }

  type Refund {
    id: ID!
    projectAddress: Address!
    participant: Address!
    erc1155Address: Address
    tokenIds: String
    tokenCounts: String
    totalRefund: String!
    createdAt: String!
    blockNumber: String!
    transactionHash: String
  }

  type SaleListing {
    marketplaceAddress: Address!
    listingId: String!
    seller: Address!
    tokenId: String!
    originalCount: String!
    remainingCount: String!
    pricePerToken: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type BuyOrder {
    marketplaceAddress: Address!
    orderId: String!
    buyer: Address!
    tokenId: String!
    originalCount: String!
    remainingCount: String!
    pricePerToken: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Trade {
    id: ID!
    marketplaceAddress: Address!
    orderType: String!
    orderId: String!
    buyer: Address!
    seller: Address!
    tokenId: String!
    count: String!
    pricePerToken: String!
    totalPrice: String!
    createdAt: String!
    blockNumber: String!
    transactionHash: String!
  }

  type TokenBurn {
    id: ID!
    erc1155Address: Address!
    burner: Address!
    tokenIds: String!
    tokenCounts: String!
    createdAt: String!
    blockNumber: String!
    transactionHash: String!
  }

  type ProjectWithMetrics {
    project: Project!
    totalContributions: String!
    contributionCount: Int!
    activeTokens: Int!
    fundingProgress: Float!
  }

  # ============================================================================
  # Delegation Types
  # ============================================================================

  type Note {
    id: ID!
    owner: Address!
    rootOwner: Address!
    amount: String!
    token: Address!
    tokenType: Int!
    tokenId: String!
    chainHash: String!
    active: Boolean!
    parentNoteId: String
    createdAt: String!
    createdAtBlock: String!
    updatedAt: String!
  }

  type DelegationChainLink {
    address: Address!
    position: Int! # 0 = root, higher numbers = closer to leaf
    createdAt: String!
  }

  # ============================================================================
  # Funding Portals Types
  # ============================================================================

  type AlignmentAttestation {
    attester: Address!
    subjectAddress: Address!
    statementId: ID!
    createdAt: String!
    blockNumber: String!
  }

  type IndirectSubjectAlignment {
    subjectAddress: Address!
    directStatementId: ID!
    indirectStatementId: ID!
    attester: Address!
  }

  type CauseFundingMetrics {
    totalRaisedAcrossProjects: BigInt!
    totalAvailableFromNotes: BigInt!
    projectCount: Int!
    noteCount: Int!
  }

  type ContributorStats {
    participant: Address!
    totalContributed: BigInt!
    totalRefunded: BigInt!
    netContribution: BigInt!
    contributionCount: Int!
    firstContributionAt: BigInt
    lastContributionAt: BigInt
    projectsContributedTo: Int!
  }

  type ContributorRankResult {
    rank: Int!
    stats: ContributorStats
    totalContributors: Int!
  }

  type AlignedProjectWithDetails {
    projectAddress: Address!
    alignmentType: String! # "direct" | "indirect"
    totalReceived: String!
    threshold: String!
    deadline: String!
  }

  # ============================================================================
  # Input Types
  # ============================================================================

  input BrowseStatementsOptions {
    limit: Int = 10
    offset: Int = 0
    orderDirection: String = "desc"
  }

  input ProjectFilterOptions {
    statementId: ID
    attester: Address
    minThreshold: String
    maxThreshold: String
    deadlineAfter: String
    deadlineBefore: String
    activeOnly: Boolean = true
  }

  # ============================================================================
  # Mutable Refs Types
  # ============================================================================

  type MutableRef {
    owner: Address!
    name: String!
    value: String!
    updatedAt: String!
    updatedAtBlock: String!
    transactionHash: String!
  }

  type RefUpdate {
    id: ID!
    owner: Address!
    name: String!
    value: String!
    blockNumber: String!
    timestamp: String!
    transactionHash: String!
    logIndex: Int!
  }

  # ============================================================================
  # Query Types
  # ============================================================================

  type Query {
    # ========================================================================
    # Conceptspace Queries
    # ========================================================================

    statement(id: ID!): Statement
    userBelief(userAddress: Address!, statementId: ID!): UserBelief
    implicationsFrom(statementId: ID!, attesterAddress: Address): [Implication!]!
    implicationsTo(statementId: ID!, attesterAddress: Address): [Implication!]!
    implication(attesterAddress: Address!, fromStatementCid: ID!, toStatementCid: ID!): Implication
    
    # Complex conceptspace queries
    indirectSupporters(statementId: ID!, attesterAddress: Address): [IndirectSupporter!]!
    indirectSupporterCount(statementId: ID!, attesterAddress: Address): Int!
    
    # Statement browsing
    browseStatementsByMostSupporters(options: BrowseStatementsOptions): [StatementListItem!]!
    browseStatementsByNewest(options: BrowseStatementsOptions): [StatementListItem!]!
    allStatements(options: BrowseStatementsOptions): [StatementListItem!]!
    userBeliefs(userAddress: Address!): [StatementListItem!]!
    userDisbeliefs(userAddress: Address!): [StatementListItem!]!
    statementSuggestions(statementId: ID!, userAddress: Address, attesterAddress: Address): [StatementSuggestion!]!

    # ========================================================================
    # Pubstarter Queries
    # ========================================================================

    project(id: ID!): Project
    allProjects(options: BrowseStatementsOptions): [Project!]!
    projectTokens(projectAddress: Address!): [ProjectToken!]!
    projectContributions(projectAddress: Address!): [Contribution!]!
    projectRefunds(projectAddress: Address!): [Refund!]!
    userContributions(userAddress: Address!): [Contribution!]!
    saleListing(marketplaceAddress: Address!, listingId: String!): SaleListing
    activeSaleListings(marketplaceAddress: Address): [SaleListing!]!
    buyOrder(marketplaceAddress: Address!, orderId: String!): BuyOrder
    activeBuyOrders(marketplaceAddress: Address): [BuyOrder!]!
    marketplaceTrades(marketplaceAddress: Address): [Trade!]!
    tokenTrades(projectAddress: Address!, tokenId: String!): [Trade!]!
    tokenBurns(projectAddress: Address!): [TokenBurn!]!
    userTokenBurns(userAddress: Address!): [TokenBurn!]!
    tokenBurnsByUser(projectAddress: Address!, userAddress: Address!): [TokenBurn!]!
    
    # Project filtering and sorting
    projectsFiltered(filterOptions: ProjectFilterOptions!, sortField: String, sortDirection: String, limit: Int, offset: Int): [ProjectWithMetrics!]!
    projectsByDate(after: String, before: String, limit: Int, offset: Int): [Project!]!
    projectsByDeadline(after: String, before: String, limit: Int, offset: Int): [Project!]!
    projectsByFundingGoal(min: String, max: String, limit: Int, offset: Int): [Project!]!
    projectsByFundingProgress(min: String, max: String, limit: Int, offset: Int): [Project!]!
    projectsByAmountRaised(min: String, max: String, limit: Int, offset: Int): [Project!]!

    # ========================================================================
    # Delegation Queries
    # ========================================================================

    note(id: ID!): Note
    notesByOwner(ownerAddress: Address!): [Note!]!
    notesByRoot(rootAddress: Address!): [Note!]!
    delegationChain(noteId: ID!): [DelegationChainLink!]!

    # ========================================================================
    # Funding Portals Queries
    # ========================================================================

    alignedSubjects(statementId: ID!, attesterAddress: Address): [AlignmentAttestation!]!
    subjectStatements(subjectAddress: Address!, attesterAddress: Address): [AlignmentAttestation!]!
    alignmentAttestation(attesterAddress: Address!, subjectAddress: Address!, statementId: ID!): AlignmentAttestation
    alignmentsByAttester(attesterAddress: Address!): [AlignmentAttestation!]!

    # Complex funding queries
    indirectlyAlignedSubjects(statementId: ID!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): [IndirectSubjectAlignment!]!
    totalFundingForCause(statementId: ID!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): CauseFundingMetrics!
    allAlignedProjectsForCause(statementId: ID!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): [AlignedProjectWithDetails!]!
    topContributorsForCause(statementId: ID!, limit: Int = 10, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): [ContributorStats!]!
    userContributionRankForCause(statementId: ID!, userAddress: Address!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): ContributorRankResult

    # ========================================================================
    # Mutable Refs Queries
    # ========================================================================

    mutableRef(owner: Address!, name: String!): MutableRef
    mutableRefsByOwner(owner: Address!): [MutableRef!]!
    refUpdateHistory(owner: Address!, name: String!, limit: Int = 100): [RefUpdate!]!
    mutableRefsByName(name: String!, limit: Int = 100): [MutableRef!]!
  }
`;
