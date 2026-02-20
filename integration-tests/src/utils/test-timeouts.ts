/**
 * Centralized timeout constants for integration tests.
 *
 * These values can be adjusted based on the environment:
 * - Local development: Use default values
 * - CI/CD: May need higher values for slower machines
 * - Production testing: May need even higher values
 */

/**
 * Mocha test timeout values (in milliseconds).
 * Used with this.timeout() in test functions.
 */
export const TEST_TIMEOUTS = {
  /** Short tests: simple queries, basic operations (20 seconds) */
  SHORT: 20000,

  /** Medium tests: single project/statement operations (30 seconds) */
  MEDIUM: 30000,

  /** Long tests: multiple operations, complex scenarios (40 seconds) */
  LONG: 40000,

  /** Extra long tests: many operations, cross-cutting queries (60 seconds) */
  EXTRA_LONG: 60000,

  /** Very long tests: complex aggregations, leaderboards (90 seconds) */
  VERY_LONG: 90000,
} as const;

/**
 * Indexer sync wait timeout (in milliseconds).
 * Used with waitForIndexerToSyncToTxHash() to wait for Ponder indexer to catch up.
 *
 * Default: 15 seconds should be sufficient for local testing.
 * Increase if tests fail with "Indexer did not sync in time" errors.
 */
export const INDEXER_SYNC_TIMEOUT = 15000;

/**
 * Helper to get appropriate test timeout based on complexity.
 * @param complexity - Test complexity level
 * @returns Timeout in milliseconds
 */
export function getTestTimeout(complexity: 'short' | 'medium' | 'long' | 'extra_long' | 'very_long'): number {
  switch (complexity) {
    case 'short': return TEST_TIMEOUTS.SHORT;
    case 'medium': return TEST_TIMEOUTS.MEDIUM;
    case 'long': return TEST_TIMEOUTS.LONG;
    case 'extra_long': return TEST_TIMEOUTS.EXTRA_LONG;
    case 'very_long': return TEST_TIMEOUTS.VERY_LONG;
    default: return TEST_TIMEOUTS.MEDIUM;
  }
}
