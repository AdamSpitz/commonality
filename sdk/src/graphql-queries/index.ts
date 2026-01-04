/**
 * GraphQL-based query functions
 *
 * These functions use a local GraphQL executor to provide a clean GraphQL interface
 * without needing to run a separate server.
 */

import { createGraphQLExecutor, type GraphQLExecutor } from '../graphql-server/index.js';

// Re-export GraphQL query functions
// Note: conceptspace wrapper functions have been removed - tests should use executeQuery() directly
// Only export functions that aren't simple wrappers (e.g., getIndirectSupporterCount, getStatementWithContent)
export { getIndirectSupporterCount, getStatementWithContent, getUserIndirectSupport } from './conceptspace.js';
export * from './pubstarter.js';
export * from './delegation.js';
export * from './funding-portals.js';
export * from './mutable-refs.js';

// Re-export the executor creation function
export { createGraphQLExecutor, type GraphQLExecutor };

// Re-export types from the old system for compatibility
export type {
  Statement,
  UserBelief,
  Implication,
  IndirectSupporter,
  StatementListItem,
  BrowseStatementsOptions,
  Project,
  ProjectToken,
  Contribution,
  SaleListing,
  BuyOrder,
  Trade,
  TokenBurn,
  ProjectFilterOptions,
  ProjectSortField,
  SortDirection,
  ProjectWithMetrics,
  Note,
  DelegationChainLink,
  ProjectAlignment,
  IndirectProjectAlignment,
  CauseFundingMetrics,
  ContributorStats,
} from '../queries/index.js';
