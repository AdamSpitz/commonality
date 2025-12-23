/**
 * Hello World Integration Test
 *
 * This is a basic smoke test that:
 * 1. Creates a statement (by generating a CID for mock IPFS content)
 * 2. Has a user express belief in that statement
 * 3. Verifies the belief was recorded (via checked action)
 */

import {
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
} from '@commonality/sdk';
import { BeliefsAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import { believeStatementChecked } from './belief-actions-checked.js';

describe('Hello World Integration Test', () => {
  // Test configuration - these should match your local setup
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'hello-world';

  it('should record a belief and query it back', async () => {
    // Contract address must be set
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // 1. Setup clients with isolated test account
    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Using account: ${clients.account}`);
    testLog(`  Beliefs contract: ${BELIEFS_CONTRACT_ADDRESS}`);

    // 2. Create a statement (mock IPFS upload)
    const statementContent = {
      statementType: 'text',
      text: 'Hello World! This is a test statement.',
    };

    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement CID: ${statementCid}`);
    testLog(`  Statement ID (bytes32): ${statementId}`);

    // 3. Express belief in the statement
    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    testLog('  Submitting belief transaction...');
    await believeStatementChecked(clients, beliefsContract, graphqlClient, statementCid);

    testLog('  ✓ Belief recorded correctly (verified by property checks)');
  });
});
