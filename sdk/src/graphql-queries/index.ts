/**
 * GraphQL-based query functions
 *
 * These functions use a local GraphQL executor to provide a clean GraphQL interface
 * without needing to run a separate server.
 */

import { createGraphQLExecutor, type GraphQLExecutor } from '../graphql-server/index.js';

// Re-export GraphQL query functions for conceptspace
export {
  getIndirectSupporterCount,
  getStatementWithContent,
  getUserIndirectSupport,
  getUserBelief,
  getUserBeliefs,
  getUserDisbeliefs,
  getStatementSuggestions,
  type IndirectSupportInfo,
  type StatementSuggestion,
} from './conceptspace.js';
// Pubstarter: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)
// Delegation: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)
// Funding Portals: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)
// Mutable Refs: All functions are simple wrappers, so we don't export any (tests use graphql-helpers.ts)

// Re-export the executor creation function and GraphQLClient type
export { createGraphQLExecutor, type GraphQLExecutor };
export type { GraphQLClient } from '../utils/graphqlClient.js';

// Conceptspace types
export {
  type Statement,
  type UserBelief,
  type Implication,
  type IndirectSupporter,
  type StatementListItem,
  type BrowseStatementsOptions,
} from '../shared/types/conceptspace.js';

export type {
} from '../shared/types/conceptspace.js';

export type {
  Note,
  DelegationChainLink,
} from '../shared/types/delegation.js';

export type {
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
} from '../shared/types/pubstarter.js';

export type {
  ProjectAlignment,
  IndirectProjectAlignment,
  CauseFundingMetrics,
  ContributorStats,
} from '../shared/types/funding-portals.js';

export type {
  MutableRef,
  RefUpdate,
} from '../shared/types/mutable-refs.js';
