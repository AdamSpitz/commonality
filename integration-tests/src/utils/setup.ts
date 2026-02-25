/**
 * Test setup - loads environment variables from .env.local
 */

import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from the integration-tests directory
config({ path: join(__dirname, '..', '..', '.env.local') });

/**
 * Required environment variables for integration tests.
 * RPC_URL and GRAPHQL_URL have defaults, but contract addresses are required.
 */
const REQUIRED_ENV_VARS = [
  'BELIEFS_CONTRACT_ADDRESS',
  'IMPLICATIONS_CONTRACT_ADDRESS',
  'DELEGATABLE_NOTES_ADDRESS',
  'DELEGATABLE_NOTES_CONTRACT_ADDRESS',
  'PUBSTARTER_ADDRESS',
  'PROJECT_ALIGNMENT_ADDRESS',
  'PROJECT_ALIGNMENT_CONTRACT_ADDRESS',
  'ERC1155_FACTORY_ADDRESS',
  'MARKETPLACE_FACTORY_ADDRESS',
  'ASSURANCE_CONTRACT_FACTORY_ADDRESS',
];

/**
 * Validate that required environment variables are set.
 * Throws an error with helpful message if any are missing.
 */
function validateEnvironment(): void {
  const missing: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      `  ${missing.join('\n  ')}\n\n` +
      `These should be set in integration-tests/.env.local\n` +
      `Run './scripts/start-node-and-deploy.sh' to deploy contracts and generate .env.local`
    );
  }
}

// Validate environment on import
validateEnvironment();

/**
 * Conditional logging helper for tests.
 * Only logs if VERBOSE_TESTS environment variable is set to 'true'.
 * This allows tests to be quiet by default while still showing detailed
 * output when debugging.
 *
 * Usage in tests:
 *   import { testLog } from './setup.js';
 *   testLog('Transaction hash:', txHash);
 */
export const testLog = (...args: unknown[]): void => {
  if (process.env.VERBOSE_TESTS === 'true') {
    console.log(...args);
  }
};

/**
 * Re-export test utilities for improved test isolation
 */
export {
  getTestPrivateKey,
  createIsolatedTestClients,
  getTestAccountAddress,
  clearTestSuiteCache,
} from './test-utils.js';
