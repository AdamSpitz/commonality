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
} from '../shared/types/conceptspace.js';

export * from './conceptspace-queries.js';

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
} from '../shared/types/pubstarter.js';

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
} from './pubstarter-queries.js';

export {
  type Note,
  type DelegationChainLink,
} from '../shared/types/delegation.js';

// Delegation queries
export {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
} from './delegation-queries.js';

export {
  type AlignmentAttestation,
  type IndirectSubjectAlignment,
  type ProjectAlignment,
  type IndirectProjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from '../shared/types/funding-portals.js';

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
} from './funding-portals-queries.js';

export {
  type MutableRef,
  type RefUpdate,
} from '../shared/types/mutable-refs.js';

// Mutable refs queries
export {
  getUserRef,
  getUserRefs,
  getUserRefHistory,
  getRefsByName,
} from './mutable-refs-queries.js';
