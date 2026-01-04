/**
 * GraphQL-based query functions
 *
 * These functions use a local GraphQL executor to provide a clean GraphQL interface
 * without needing to run a separate server.
 */

import { createGraphQLExecutor, type GraphQLExecutor } from '../graphql-server/index.js';

// Re-export GraphQL query functions
// Note: conceptspace and pubstarter wrapper functions have been removed - tests should use executeQuery() directly
// Only export functions that aren't simple wrappers (e.g., getIndirectSupporterCount, getStatementWithContent)
export { getIndirectSupporterCount, getStatementWithContent, getUserIndirectSupport } from './conceptspace.js';
// Pubstarter: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)
// Delegation: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)
// Funding Portals: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)
// Mutable Refs: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)

// Re-export the executor creation function and GraphQLClient type
export { createGraphQLExecutor, type GraphQLExecutor };
export type { GraphQLClient } from '../queries/common.js';

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
  Refund,
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
  MutableRef,
  RefUpdate,
} from '../queries/index.js';
