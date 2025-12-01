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
    createdAt: String!
  }

  type UserBelief {
    statementId: ID!
    beliefState: Int! # 0=noOpinion, 1=believes, 2=disbelieves
  }

  type Implication {
    attester: Address!
    fromStatementId: ID!
    toStatementId: ID!
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
    cid: String!
    statementType: String!
    title: String!
    excerpt: String!
    believerCount: Int!
    disbelieverCount: Int!
    createdAt: String!
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
    createdAt: String!
  }

  type ProjectToken {
    id: ID!
    projectId: ID!
    tokenId: String!
    supply: String!
    price: String!
    createdAt: String!
  }

  type Contribution {
    id: ID!
    projectAddress: Address!
    participant: Address!
    amount: String!
    timestamp: String!
    blockNumber: String!
  }

  type SaleListing {
    id: ID!
    projectAddress: Address!
    tokenId: String!
    seller: Address!
    amount: String!
    pricePerToken: String!
    createdAt: String!
  }

  type BuyOrder {
    id: ID!
    projectAddress: Address!
    tokenId: String!
    buyer: Address!
    amount: String!
    pricePerToken: String!
    createdAt: String!
  }

  type Trade {
    id: ID!
    projectAddress: Address!
    tokenId: String!
    seller: Address!
    buyer: Address!
    amount: String!
    pricePerToken: String!
    timestamp: String!
    blockNumber: String!
  }

  type TokenBurn {
    id: ID!
    projectAddress: Address!
    tokenId: String!
    burner: Address!
    amount: String!
    timestamp: String!
    blockNumber: String!
  }

  type ProjectWithMetrics {
    project: Project!
    totalContributions: String!
    contributionCount: Int!
    activeTokens: Int!
  }

  # ============================================================================
  # Delegation Types
  # ============================================================================

  type Note {
    id: ID!
    owner: Address!
    amount: String!
    intendedStatementId: ID
    active: Boolean!
    createdAt: String!
    blockNumber: String!
  }

  type DelegationChainLink {
    delegator: Address!
    delegatee: Address!
    noteId: ID!
    timestamp: String!
    blockNumber: String!
  }

  # ============================================================================
  # Funding Portals Types
  # ============================================================================

  type ProjectAlignment {
    attester: Address!
    projectAddress: Address!
    statementId: ID!
    createdAt: String!
    blockNumber: String!
  }

  type IndirectProjectAlignment {
    projectAddress: Address!
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
    firstContributionAt: String
    lastContributionAt: String
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
    implication(attesterAddress: Address!, fromStatementId: ID!, toStatementId: ID!): Implication
    
    # Complex conceptspace queries
    indirectSupporters(statementId: ID!, attesterAddress: Address): [IndirectSupporter!]!
    indirectSupporterCount(statementId: ID!, attesterAddress: Address): Int!
    
    # Statement browsing
    browseStatementsByMostSupporters(options: BrowseStatementsOptions): [StatementListItem!]!
    browseStatementsByNewest(options: BrowseStatementsOptions): [StatementListItem!]!
    allStatements(options: BrowseStatementsOptions): [StatementListItem!]!
    userBeliefs(userAddress: Address!): [StatementListItem!]!
    userDisbeliefs(userAddress: Address!): [StatementListItem!]!

    # ========================================================================
    # Pubstarter Queries
    # ========================================================================

    project(id: ID!): Project
    allProjects(options: BrowseStatementsOptions): [Project!]!
    projectTokens(projectAddress: Address!): [ProjectToken!]!
    projectContributions(projectAddress: Address!): [Contribution!]!
    userContributions(userAddress: Address!): [Contribution!]!
    saleListing(id: ID!): SaleListing
    activeSaleListings: [SaleListing!]!
    buyOrder(id: ID!): BuyOrder
    activeBuyOrders: [BuyOrder!]!
    marketplaceTrades: [Trade!]!
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
    delegationChain(fromAddress: Address!, toAddress: Address!): [DelegationChainLink!]!
    notesByStatement(statementId: ID!): [Note!]!

    # ========================================================================
    # Funding Portals Queries
    # ========================================================================

    alignedProjects(statementId: ID!, attesterAddress: Address): [ProjectAlignment!]!
    projectStatements(projectAddress: Address!, attesterAddress: Address): [ProjectAlignment!]!
    projectAlignment(attesterAddress: Address!, projectAddress: Address!, statementId: ID!): ProjectAlignment
    alignmentsByAttester(attesterAddress: Address!): [ProjectAlignment!]!
    
    # Complex funding queries
    indirectlyAlignedProjects(statementId: ID!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): [IndirectProjectAlignment!]!
    totalFundingForCause(statementId: ID!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): CauseFundingMetrics!
    allAlignedProjectsForCause(statementId: ID!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): [AlignedProjectWithDetails!]!
    topContributorsForCause(statementId: ID!, limit: Int = 10, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): [ContributorStats!]!
    userContributionRankForCause(statementId: ID!, userAddress: Address!, trustedImplicationAttester: Address, trustedAlignmentAttester: Address): ContributorRankResult
  }
`;
