/**
 * Centralized test constants
 *
 * This file contains configuration values used across integration tests.
 * Centralizing these makes it easier to tune behavior for different environments.
 */

/**
 * Test timeout values (in milliseconds)
 *
 * These control how long Mocha will wait for individual tests to complete.
 * Adjust these if running tests on slower hardware or networks.
 */
export const TEST_TIMEOUTS = {
  /** Standard timeout for most tests (20 seconds) */
  STANDARD: 20000,

  /** Extended timeout for complex tests with multiple transactions (25 seconds) */
  EXTENDED: 25000,

  /** Long timeout for tests with many transactions or complex queries (30 seconds) */
  LONG: 30000,

  /** Extra long timeout for particularly complex scenarios (40 seconds) */
  EXTRA_LONG: 40000,
} as const;

/**
 * Indexer synchronization configuration
 */
export const INDEXER_SYNC = {
  /** Maximum time to wait for indexer to sync (10 seconds) */
  MAX_WAIT_MS: 10000,

  /** Delay between sync check attempts (100 milliseconds) */
  POLL_INTERVAL_MS: 100,
} as const;
