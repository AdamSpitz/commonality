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
  type Statement,
  type UserBelief,
  type Implication,
} from './conceptspace-queries.js';

// Pubstarter queries
export {
  getProject,
  getAllProjects,
  getProjectTokens,
  getProjectContributions,
  getUserContributions,
  type Project,
  type ProjectToken,
  type Contribution,
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
  type ProjectAlignment,
} from './funding-portals-queries.js';
