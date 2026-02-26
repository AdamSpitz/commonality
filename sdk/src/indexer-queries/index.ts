/**
 * Queries index - exports all query functions
 */

export {
  type Statement,
  type UserBelief,
  type Implication,
  type IndirectSupporter,
  type StatementListItem,
  type BrowseStatementsOptions,
} from '../subsystems/conceptspace/types.js';

export * from '../subsystems/conceptspace/conceptspace-queries.js';

export {
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
} from '../subsystems/pubstarter/types.js';

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
} from '../subsystems/pubstarter/pubstarter-queries.js';

export {
  type Note,
  type DelegationChainLink,
} from '../subsystems/delegation/types.js';

// Delegation queries
export {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
} from '../subsystems/delegation/delegation-queries.js';

export {
  type AlignmentAttestation,
  type IndirectSubjectAlignment,
  type ProjectAlignment,
  type IndirectProjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from '../subsystems/fundingportals/types.js';

// Funding portals queries
export {
  // New function names
  getAlignedSubjects,
  getSubjectStatements,
  getAlignmentAttestation,
  getAlignmentsByAttester,
  getIndirectlyAlignedSubjects,
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getTopContributorsForCause,
  getUserContributionRankForCause,
  // Backwards compatibility aliases
  getAlignedProjects,
  getProjectStatements,
  getProjectAlignment,
  getIndirectlyAlignedProjects,
} from '../subsystems/fundingportals/funding-portals-queries.js';

export {
  type MutableRef,
  type RefUpdate,
} from '../subsystems/mutable-refs/types.js';

// Mutable refs queries
export {
  getUserRef,
  getUserRefs,
  getUserRefHistory,
  getRefsByName,
} from '../subsystems/mutable-refs/mutable-refs-queries.js';
