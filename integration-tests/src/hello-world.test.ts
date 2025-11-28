/**
 * Hello World Integration Test
 *
 * This is a basic smoke test that:
 * 1. Creates a statement (by generating a CID for mock IPFS content)
 * 2. Has a user express belief in that statement
 * 3. Waits for the indexer to sync
 * 4. Queries the indexer to verify the belief was recorded
 */

import assert from 'assert';
import {
  createTestClients,
  believeStatement,
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
} from './actions.js';
import {
  createGraphQLClient,
  getStatement,
  getUserBelief,
  waitForSync,
  assertNotNull,
} from './queries.js';

// Import the Beliefs ABI - we'll copy it from the indexer
const BeliefsAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "statementId", type: "bytes32" },
      { internalType: "uint8", name: "beliefState", type: "uint8" },
    ],
    name: "setBelief",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "bytes32", name: "statementId", type: "bytes32" },
    ],
    name: "getBelief",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "bytes32", name: "statementId", type: "bytes32" },
      { indexed: false, internalType: "uint8", name: "beliefState", type: "uint8" },
    ],
    name: "DirectSupport",
    type: "event",
  },
] as const;

describe('Hello World Integration Test', () => {
  // Test configuration - these should match your local setup
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Hardhat account #0 private key (default test account)
  const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

  it('should record a belief and query it back', async () => {
    // Contract address must be set
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // 1. Setup clients
    const clients = createTestClients(PRIVATE_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    console.log(`  Using account: ${clients.account}`);
    console.log(`  Beliefs contract: ${BELIEFS_CONTRACT_ADDRESS}`);

    // 2. Create a statement (mock IPFS upload)
    const statementContent = {
      statementType: 'text',
      text: 'Hello World! This is a test statement.',
    };

    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    console.log(`  Statement CID: ${statementCid}`);
    console.log(`  Statement ID (bytes32): ${statementId}`);

    // 3. Express belief in the statement
    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    console.log('  Submitting belief transaction...');
    const txHash = await believeStatement(clients, beliefsContract, statementCid);
    console.log(`  Transaction: ${txHash}`);

    // Get the block number of the transaction
    const receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    console.log(`  Block: ${receipt.blockNumber}`);

    // 4. Wait for indexer to sync
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);
    console.log('  Indexer synced!');

    // 5. Query the belief back from the indexer
    console.log('  Querying belief from indexer...');
    const userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );

    // 6. Assert the belief was recorded correctly
    assert.strictEqual(userBelief.beliefState, 1, 'User should believe the statement (beliefState=1)');
    assert.strictEqual(
      userBelief.statementId.toLowerCase(),
      statementId.toLowerCase(),
      'Statement ID should match'
    );

    console.log('  ✓ Belief recorded and queried successfully!');

    // 7. Also check the statement's supporter count
    const statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');

    console.log('  ✓ Statement has correct supporter count!');
  });
});
