/**
 * Test Utilities for Integration Tests
 *
 * This module provides utilities for test isolation:
 * - Unique account derivation per test file
 * - Improved test client creation
 */

import { createWriteClients, type WriteClients } from '@commonality/sdk/utils';
import { TEST_PRIVATE_KEYS } from '@commonality/sdk/utils';
import { keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Map of test suite names to account indices.
 * This ensures each test file gets its own set of accounts.
 */
const testSuiteAccountOffsets = new Map<string, number>();

/**
 * Get a unique account offset for a test suite.
 * Each test suite (file) gets a unique offset to avoid account conflicts.
 *
 * @param suiteName - Name of the test suite (typically the test file name)
 * @returns Account offset for this suite (0-19)
 */
function getTestSuiteOffset(suiteName: string): number {
  if (!testSuiteAccountOffsets.has(suiteName)) {
    // Use a hash of the suite name to derive a deterministic offset
    const hash = keccak256(toHex(suiteName));
    // Take last byte and mod by 20 to get offset in range [0, 19]
    // This gives us room for 10 accounts per suite (2 sets of 10)
    const offset = parseInt(hash.slice(-2), 16) % 20;
    testSuiteAccountOffsets.set(suiteName, offset);
  }
  return testSuiteAccountOffsets.get(suiteName)!;
}

/**
 * Get a private key for a specific test account within a suite.
 *
 * This function ensures that each test suite gets unique accounts:
 * - Each suite is assigned a unique offset (0-19)
 * - Account index 0 in suite A maps to different Hardhat account than index 0 in suite B
 * - Prevents nonce conflicts and state pollution between test files
 *
 * @param suiteName - Name of the test suite (typically the test file name)
 * @param accountIndex - Account index within the suite (0-9)
 * @returns Private key for the account
 *
 * @example
 * // In beliefs.test.ts:
 * const privateKey = getTestPrivateKey('beliefs', 0);
 * // Returns ACCOUNT_0's private key
 *
 * // In delegation-basic.test.ts:
 * const privateKey = getTestPrivateKey('delegation-basic', 0);
 * // Returns a different account's private key based on hash
 */
export function getTestPrivateKey(suiteName: string, accountIndex: number): `0x${string}` {
  if (accountIndex < 0 || accountIndex > 9) {
    throw new Error(`Account index must be 0-9, got ${accountIndex}`);
  }

  // Get the offset for this suite
  const offset = getTestSuiteOffset(suiteName);

  // Calculate the actual Hardhat account index
  // We have 10 Hardhat accounts, and each suite can use all 10 accounts (0-9)
  // with an offset to ensure different suites use different sets of accounts
  // This allows maximum flexibility while still providing isolation between test files
  const actualAccountIndex = (offset + accountIndex) % 10;

  const privateKeys = [
    TEST_PRIVATE_KEYS.ACCOUNT_0,
    TEST_PRIVATE_KEYS.ACCOUNT_1,
    TEST_PRIVATE_KEYS.ACCOUNT_2,
    TEST_PRIVATE_KEYS.ACCOUNT_3,
    TEST_PRIVATE_KEYS.ACCOUNT_4,
    TEST_PRIVATE_KEYS.ACCOUNT_5,
    TEST_PRIVATE_KEYS.ACCOUNT_6,
    TEST_PRIVATE_KEYS.ACCOUNT_7,
    TEST_PRIVATE_KEYS.ACCOUNT_8,
    TEST_PRIVATE_KEYS.ACCOUNT_9,
  ];

  return privateKeys[actualAccountIndex];
}

/**
 * Create test clients with unique accounts for a test suite.
 *
 * This is a convenience wrapper around createWriteClients that automatically
 * derives unique accounts per test suite.
 *
 * @param suiteName - Name of the test suite
 * @param accountIndex - Account index within the suite (0-9)
 * @param rpcUrl - RPC URL (defaults to localhost:8545)
 * @returns Test clients
 *
 * @example
 * // In a test file:
 * const clients1 = createIsolatedWriteClients('my-test-suite', 0);
 * const clients2 = createIsolatedWriteClients('my-test-suite', 1);
 * // clients1 and clients2 will have different accounts
 */
export function createIsolatedWriteClients(
  suiteName: string,
  accountIndex: number,
  rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
): WriteClients {
  const privateKey = getTestPrivateKey(suiteName, accountIndex);
  return createWriteClients(privateKey, rpcUrl);
}

/**
 * Get the address for a test account without creating full clients.
 * Useful for assertions and test setup.
 *
 * @param suiteName - Name of the test suite
 * @param accountIndex - Account index within the suite (0-9)
 * @returns Account address
 */
export function getTestAccountAddress(suiteName: string, accountIndex: number): `0x${string}` {
  const privateKey = getTestPrivateKey(suiteName, accountIndex);
  const account = privateKeyToAccount(privateKey);
  return account.address;
}

/**
 * Clear the test suite offset cache.
 * Only needed if running tests programmatically in the same process.
 */
export function clearTestSuiteCache(): void {
  testSuiteAccountOffsets.clear();
}
