/**
 * Commonality SDK
 *
 * This SDK provides type-safe actions and queries for interacting with
 * the Commonality smart contracts and indexer.
 */

// Re-export everything from actions
export * from './actions/index.js';

// Re-export GraphQL-based queries (replaces old direct indexer queries)
export * from './graphql-queries/index.js';

// Re-export GraphQL server functionality
export * from './graphql-server/index.js';

// Re-export common query utilities for tests
export { waitForSync, waitForIndexerSync, assertNotNull } from './indexer-queries/common.js';

// For backward compatibility, export createGraphQLExecutor as createGraphQLClient
// This allows existing code to work with the new executor-based system
export { createGraphQLExecutor as createGraphQLClient } from './graphql-server/index.js';

// Re-export constants for convenience
export { TEST_TIMEOUTS, INDEXER_SYNC, TEST_PRIVATE_KEYS } from './constants.js';

// Re-export ABIs
export * from './abis.js';

// Re-export displayable document types and utilities
export * from './displayable-document.js';
