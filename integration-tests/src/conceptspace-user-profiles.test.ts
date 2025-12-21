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
  believeStatement,
  disbelieveStatement,
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getUserBeliefs,
  getUserDisbeliefs,
  waitForSync,
} from '@commonality/sdk';
import { BeliefsAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';

describe('User Profile Queries', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-user-profiles';

  it('should retrieve user\'s directly signed statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // Setup clients for Alice
    const aliceClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);

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

    testLog('  Alice signing statements 1 and 2...');

    // Alice believes statements 1 and 2
    const tx1 = await believeStatement(aliceClients, beliefsContract, statement1);
    const receipt1 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx1 });

    const tx2 = await believeStatement(aliceClients, beliefsContract, statement2);
    const receipt2 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx2 });

    // Wait for indexer to sync
    testLog('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt2.blockNumber);

    // Query Alice's beliefs
    testLog('  Querying Alice\'s beliefs...');
    const aliceBeliefs = await getUserBeliefs(graphqlClient, aliceClients.account);

    // Verify Alice believes the 2 statements created in this test
    const beliefIds = aliceBeliefs.map(b => b.id.toLowerCase());
    const expectedIds = [statementId1.toLowerCase(), statementId2.toLowerCase()];

    assert.ok(
      expectedIds.every(id => beliefIds.includes(id)),
      'Alice\'s beliefs should include both statements she signed in this test'
    );

    testLog('  ✓ Successfully retrieved user\'s signed statements');
  });

  it('should retrieve user\'s directly disbelieved statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
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

    testLog('  Alice disbelieving statements...');

    // Alice disbelieves both statements
    const tx1 = await disbelieveStatement(aliceClients, beliefsContract, statement1);
    const receipt1 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx1 });

    const tx2 = await disbelieveStatement(aliceClients, beliefsContract, statement2);
    const receipt2 = await aliceClients.publicClient.getTransactionReceipt({ hash: tx2 });

    // Wait for indexer
    testLog('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt2.blockNumber);

    // Query Alice's disbeliefs
    testLog('  Querying Alice\'s disbeliefs...');
    const aliceDisbeliefs = await getUserDisbeliefs(graphqlClient, aliceClients.account);

    // Verify Alice disbelieves the 2 statements created in this test
    const disbeliefIds = aliceDisbeliefs.map(b => b.id.toLowerCase());
    const expectedIds = [statementId1.toLowerCase(), statementId2.toLowerCase()];

    assert.ok(
      expectedIds.every(id => disbeliefIds.includes(id)),
      'Alice\'s disbeliefs should include both statements she disbelieved in this test'
    );

    testLog('  ✓ Successfully retrieved user\'s disbelieved statements');
  });

  it('should retrieve another user\'s profile and statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // Setup clients for both users
    const aliceClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

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

    testLog('  Bob signing statements...');

    // Bob believes statements 1 and 3
    const tx1 = await believeStatement(bobClients, beliefsContract, statement1);
    await bobClients.publicClient.waitForTransactionReceipt({ hash: tx1 });

    const tx2 = await believeStatement(bobClients, beliefsContract, statement3);
    const receipt2 = await bobClients.publicClient.getTransactionReceipt({ hash: tx2 });

    // Bob disbelieves statement 2
    const tx3 = await disbelieveStatement(bobClients, beliefsContract, statement2);
    const receipt3 = await bobClients.publicClient.getTransactionReceipt({ hash: tx3 });

    // Wait for indexer
    testLog('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt3.blockNumber);

    // Alice queries Bob's profile (simulating viewing another user's profile)
    testLog('  Alice querying Bob\'s profile...');
    const bobBeliefs = await getUserBeliefs(graphqlClient, bobClients.account);
    const bobDisbeliefs = await getUserDisbeliefs(graphqlClient, bobClients.account);

    // Verify Bob believes statements 1 and 3 (created in this test)
    const bobBeliefIds = bobBeliefs.map(b => b.id.toLowerCase());
    const statement1Id = cidToBytes32(statement1).toLowerCase();
    const statement3Id = cidToBytes32(statement3).toLowerCase();

    assert.ok(
      bobBeliefIds.includes(statement1Id) && bobBeliefIds.includes(statement3Id),
      'Bob should believe statements 1 and 3 from this test'
    );

    // Verify Bob disbelieves statement 2 (created in this test)
    const bobDisbeliefIds = bobDisbeliefs.map(b => b.id.toLowerCase());
    const statement2Id = cidToBytes32(statement2).toLowerCase();

    assert.ok(
      bobDisbeliefIds.includes(statement2Id),
      'Bob should disbelieve statement 2 from this test'
    );

    testLog('  ✓ Successfully retrieved another user\'s profile');
  });
});
