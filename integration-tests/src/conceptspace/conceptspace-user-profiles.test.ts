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
  createStatement,
  publishDocument,
  cidToBytes32,
  type BeliefsContract,
  createGraphQLClient,
  BeliefsAbi,
} from '@commonality/sdk';
import {
  getUserBeliefs,
  getUserDisbeliefs,
} from '../utils/graphql-helpers.js';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { believeStatementChecked, disbelieveStatementChecked } from '../actions/belief-actions-checked.js';

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
    const statement1 = await publishDocument(createStatement({
      content: 'Climate change is real and caused by humans',
    }));
    const statement2 = await publishDocument(createStatement({
      content: 'Renewable energy should be prioritized',
    }));
    const statement3 = await publishDocument(createStatement({
      content: 'Carbon taxes are an effective policy tool',
    }));

    const statementId1 = cidToBytes32(statement1);
    const statementId2 = cidToBytes32(statement2);
    const statementId3 = cidToBytes32(statement3);

    testLog('  Alice signing statements 1 and 2...');

    // Alice believes statements 1 and 2 (Checked actions verify belief counts automatically)
    await believeStatementChecked(aliceClients, beliefsContract, graphqlClient, statement1);
    await believeStatementChecked(aliceClients, beliefsContract, graphqlClient, statement2);

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
    const statement1 = await publishDocument(createStatement({
      content: 'The earth is flat',
    }));
    const statement2 = await publishDocument(createStatement({
      content: 'Vaccines cause autism',
    }));

    const statementId1 = cidToBytes32(statement1);
    const statementId2 = cidToBytes32(statement2);

    testLog('  Alice disbelieving statements...');

    // Alice disbelieves both statements (Checked actions verify disbelief counts automatically)
    await disbelieveStatementChecked(aliceClients, beliefsContract, graphqlClient, statement1);
    await disbelieveStatementChecked(aliceClients, beliefsContract, graphqlClient, statement2);

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
    const statement1 = await publishDocument(createStatement({
      content: 'Universal healthcare should be a human right',
    }));
    const statement2 = await publishDocument(createStatement({
      content: 'Education should be free for all',
    }));
    const statement3 = await publishDocument(createStatement({
      content: 'Housing is a fundamental human need',
    }));

    testLog('  Bob signing statements...');

    // Bob believes statements 1 and 3 (Checked actions verify belief counts automatically)
    await believeStatementChecked(bobClients, beliefsContract, graphqlClient, statement1);
    await believeStatementChecked(bobClients, beliefsContract, graphqlClient, statement3);

    // Bob disbelieves statement 2 (Checked actions verify disbelief counts automatically)
    await disbelieveStatementChecked(bobClients, beliefsContract, graphqlClient, statement2);

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
