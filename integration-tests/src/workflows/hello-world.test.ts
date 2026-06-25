/**
 * Hello World Integration Test
 *
 * This is a basic smoke test that:
 * 1. Creates a statement (by generating a CID for mock IPFS content)
 * 2. Has a user express belief in that statement
 * 3. Verifies the belief was recorded (via checked action)
 */

import type { BeliefsContract } from '@commonality/sdk/conceptspace';
import { createStatement, publishDocument } from '@commonality/sdk/displayable-documents';
import { BeliefsAbi } from '@commonality/sdk/abis';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { believeStatementChecked } from '../actions/belief-actions-checked.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Hello World Integration Test', () => {
  // Test configuration - these should match your local setup
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'hello-world';

  it('should record a belief and query it back', async () => {
    // Contract address must be set
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // 1. Setup clients with isolated test account
    const clients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const machinery = createActionTestingMachinery();

    testLog(`  Using account: ${clients.account}`);
    testLog(`  Beliefs contract: ${BELIEFS_CONTRACT_ADDRESS}`);

    // 2. Create a statement (displayable document format)
    const statementData = createStatement({
      content: 'Hello World! This is a test statement.',
    });

    const statementCid = await publishDocument(machinery.ipfsConfig, statementData);

    testLog(`  Statement CID: ${statementCid}`);

    // 3. Express belief in the statement
    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    testLog('  Submitting belief transaction...');
    await believeStatementChecked(clients, beliefsContract, machinery, statementCid);

    testLog('  ✓ Belief recorded correctly (verified by property checks)');
  });
});
