/**
 * User Profile Queries Integration Test
 *
 * Tests user profile functionality:
 * - View user's directly signed statements
 * - View user's directly disbelieved statements
 * - View another user's profile and statements
 */

import assert from 'assert';
import {
  createTestClients,
  believeStatement,
  disbelieveStatement,
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getUserBeliefs,
  getUserDisbeliefs,
  waitForSync,
} from './queries/index.js';
import { BeliefsAbi } from './test-abis.js';
import { TEST_PRIVATE_KEYS } from './test-constants.js';

describe('User Profile Queries', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  const ALICE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const BOB_KEY = TEST_PRIVATE_KEYS.ACCOUNT_1;

  it('should retrieve user\'s directly signed statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // Setup clients for Alice
    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    console.log(`  Alice: ${aliceClients.account}`);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create three statements
    const statement1 = await uploadToIPFS({
      statementType: 'text',
      text: 'Climate change is real and caused by humans',
    });
    const statement2 = await uploadToIPFS({
      statementType: 'text',
      text: 'Renewable energy should be prioritized',
    });
    const statement3 = await uploadToIPFS({
      statementType: 'text',
      text: 'Carbon taxes are an effective policy tool',
    });

    const statementId1 = cidToBytes32(statement1);
    const statementId2 = cidToBytes32(statement2);
    const statementId3 = cidToBytes32(statement3);

    console.log('  Alice signing statements 1 and 2...');

    // Alice believes statements 1 and 2
    const tx1 = await believeStatement(aliceClients, beliefsContract, statement1);
    const receipt1 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx1 });

    const tx2 = await believeStatement(aliceClients, beliefsContract, statement2);
    const receipt2 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx2 });

    // Wait for indexer to sync
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt2.blockNumber, 15000);

    // Query Alice's beliefs
    console.log('  Querying Alice\'s beliefs...');
    const aliceBeliefs = await getUserBeliefs(graphqlClient, aliceClients.account);

    // Verify Alice has 2 beliefs
    assert.strictEqual(aliceBeliefs.length, 2, 'Alice should have 2 beliefs');

    // Verify the beliefs are the correct statements
    const beliefIds = aliceBeliefs.map(b => b.id.toLowerCase()).sort();
    const expectedIds = [statementId1.toLowerCase(), statementId2.toLowerCase()].sort();

    assert.deepStrictEqual(
      beliefIds,
      expectedIds,
      'Alice\'s beliefs should match the statements she signed'
    );

    console.log('  ✓ Successfully retrieved user\'s signed statements');
  });

  it('should retrieve user\'s directly disbelieved statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create statements to disbelieve
    const statement1 = await uploadToIPFS({
      statementType: 'text',
      text: 'The earth is flat',
    });
    const statement2 = await uploadToIPFS({
      statementType: 'text',
      text: 'Vaccines cause autism',
    });

    const statementId1 = cidToBytes32(statement1);
    const statementId2 = cidToBytes32(statement2);

    console.log('  Alice disbelieving statements...');

    // Alice disbelieves both statements
    const tx1 = await disbelieveStatement(aliceClients, beliefsContract, statement1);
    const receipt1 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx1 });

    const tx2 = await disbelieveStatement(aliceClients, beliefsContract, statement2);
    const receipt2 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx2 });

    // Wait for indexer
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt2.blockNumber, 15000);

    // Query Alice's disbeliefs
    console.log('  Querying Alice\'s disbeliefs...');
    const aliceDisbeliefs = await getUserDisbeliefs(graphqlClient, aliceClients.account);

    // Verify Alice has 2 disbeliefs
    assert.strictEqual(aliceDisbeliefs.length, 2, 'Alice should have 2 disbeliefs');

    // Verify the disbeliefs are the correct statements
    const disbeliefIds = aliceDisbeliefs.map(b => b.id.toLowerCase()).sort();
    const expectedIds = [statementId1.toLowerCase(), statementId2.toLowerCase()].sort();

    assert.deepStrictEqual(
      disbeliefIds,
      expectedIds,
      'Alice\'s disbeliefs should match the statements she disbelieved'
    );

    console.log('  ✓ Successfully retrieved user\'s disbelieved statements');
  });

  it('should retrieve another user\'s profile and statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // Setup clients for both users
    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const bobClients = createTestClients(BOB_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    console.log(`  Alice: ${aliceClients.account}`);
    console.log(`  Bob: ${bobClients.account}`);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create statements
    const statement1 = await uploadToIPFS({
      statementType: 'text',
      text: 'Universal healthcare should be a human right',
    });
    const statement2 = await uploadToIPFS({
      statementType: 'text',
      text: 'Education should be free for all',
    });
    const statement3 = await uploadToIPFS({
      statementType: 'text',
      text: 'Housing is a fundamental human need',
    });

    console.log('  Bob signing statements...');

    // Bob believes statements 1 and 3
    const tx1 = await believeStatement(bobClients, beliefsContract, statement1);
    await bobClients.publicClient.waitForTransactionReceipt({ hash: tx1 });

    const tx2 = await believeStatement(bobClients, beliefsContract, statement3);
    const receipt2 = await bobClients.publicClient.getTransactionReceipt({ hash: tx2 });

    // Bob disbelieves statement 2
    const tx3 = await disbelieveStatement(bobClients, beliefsContract, statement2);
    const receipt3 = await bobClients.publicClient.getTransactionReceipt({ hash: tx3 });

    // Wait for indexer
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt3.blockNumber, 15000);

    // Alice queries Bob's profile (simulating viewing another user's profile)
    console.log('  Alice querying Bob\'s profile...');
    const bobBeliefs = await getUserBeliefs(graphqlClient, bobClients.account);
    const bobDisbeliefs = await getUserDisbeliefs(graphqlClient, bobClients.account);

    // Verify Bob's beliefs
    assert.strictEqual(bobBeliefs.length, 2, 'Bob should have 2 beliefs');

    // Verify Bob's disbeliefs
    assert.strictEqual(bobDisbeliefs.length, 1, 'Bob should have 1 disbelief');

    console.log('  ✓ Successfully retrieved another user\'s profile');
  });
});
