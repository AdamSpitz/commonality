/**
 * Queries index - exports all query functions
 */

// Common utilities
export {
  createGraphQLClient,
  assertNotNull,
  waitForSync,
  type GraphQLClient,
} from './common.js';

// Conceptspace queries
export {
  getStatement,
  getUserBelief,
  getImplicationsFrom,
  getImplicationsTo,
  getImplication,
  getIndirectSupporters,
  getIndirectSupporterCount,
  browseStatementsByMostSupporters,
  browseStatementsByNewest,
  getAllStatements,
  getUserBeliefs,
  getUserDisbeliefs,
  getStatementSuggestions,
  type Statement,
  type UserBelief,
  type Implication,
  type IndirectSupporter,
  type StatementListItem,
  type BrowseStatementsOptions,
} from './conceptspace-queries.js';

// Pubstarter queries
export {
  getProject,
  getAllProjects,
  getProjectTokens,
  getProjectContributions,
  getProjectRefunds,
  getUserContributions,
  getSaleListing,
  getActiveSaleListings,
  getBuyOrder,
  getActiveBuyOrders,
  getMarketplaceTrades,
  getTokenTrades,
  getTokenBurns,
  getUserTokenBurns,
  getTokenBurnsByUser,
  getProjectsFiltered,
  getProjectsByDate,
  getProjectsByDeadline,
  getProjectsByFundingGoal,
  getProjectsByFundingProgress,
  getProjectsByAmountRaised,
  type Project,
  type ProjectToken,
  type Contribution,
  type Refund,
  type SaleListing,
  type BuyOrder,
  type Trade,
  type TokenBurn,
  type ProjectFilterOptions,
  type ProjectSortField,
  type SortDirection,
  type ProjectWithMetrics,
} from './pubstarter-queries.js';

// Delegation queries
export {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  type Note,
  type DelegationChainLink,
} from './delegation-queries.js';

// Funding portals queries
export {
  getAlignedProjects,
  getProjectStatements,
  getProjectAlignment,
  getAlignmentsByAttester,
  getIndirectlyAlignedProjects,
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getTopContributorsForCause,
  getUserContributionRankForCause,
  type ProjectAlignment,
  type IndirectProjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from './funding-portals-queries.js';

// Mutable refs queries
export {
  getUserRef,
  getUserRefs,
  getUserRefHistory,
  getRefsByName,
  type MutableRef,
  type RefUpdate,
} from './mutable-refs-queries.js';
