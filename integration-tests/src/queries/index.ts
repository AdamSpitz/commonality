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
  getUserContributions,
  getSaleListing,
  getActiveSaleListings,
  getBuyOrder,
  getActiveBuyOrders,
  getMarketplaceTrades,
  getTokenTrades,
  type Project,
  type ProjectToken,
  type Contribution,
  type SaleListing,
  type BuyOrder,
  type Trade,
} from './pubstarter-queries.js';

// Delegation queries
export {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  getNotesByStatement,
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
  type ProjectAlignment,
  type IndirectProjectAlignment,
} from './funding-portals-queries.js';
