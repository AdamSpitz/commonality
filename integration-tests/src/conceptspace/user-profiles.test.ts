/**
 * User Profile Queries Integration Test
 *
 * Tests user profile functionality:
 * - View user's directly signed statements
 * - View user's directly disbelieved statements
 * - View another user's profile and statements
 */

import assert from 'assert';
import { BeliefsAbi } from '@commonality/sdk/abis';
import { type BeliefsContract, getUserBeliefs, getUserDisbeliefs } from '@commonality/sdk/conceptspace';
import { createStatement, publishDocument } from '@commonality/sdk/displayable-documents';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { believeStatementChecked, disbelieveStatementChecked } from '../actions/belief-actions-checked.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';


describe('User Profile Queries', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'user-profiles';

  it('should retrieve user\'s directly signed statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // Setup clients for Alice
    const aliceClients = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const machinery = createActionTestingMachinery();

    testLog(`  Alice: ${aliceClients.account}`);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create three statements
    const statement1 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Climate change is real and caused by humans',
    }));
    const statement2 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Renewable energy should be prioritized',
    }));
    await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Carbon taxes are an effective policy tool',
    }));

    testLog('  Alice signing statements 1 and 2...');

    // Alice believes statements 1 and 2 (Checked actions verify belief counts automatically)
    await believeStatementChecked(aliceClients, beliefsContract, machinery, statement1);
    await believeStatementChecked(aliceClients, beliefsContract, machinery, statement2);

    // Query Alice's beliefs
    testLog('  Querying Alice\'s beliefs...');
    const aliceBeliefs = await getUserBeliefs(machinery, aliceClients.account);
    // Verify Alice believes the 2 statements created in this test
    const beliefCids = aliceBeliefs.map(b => b.cid.toLowerCase());
    const expectedCids = [statement1.toLowerCase(), statement2.toLowerCase()];

    assert.ok(
      expectedCids.every(cid => beliefCids.includes(cid)),
      'Alice\'s beliefs should include both statements she signed in this test'
    );

    testLog('  ✓ Successfully retrieved user\'s signed statements');
  });

  it('should retrieve user\'s directly disbelieved statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const machinery = createActionTestingMachinery();

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create statements to disbelieve
    const statement1 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'The earth is flat',
    }));
    const statement2 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Vaccines cause autism',
    }));

    testLog('  Alice disbelieving statements...');

    // Alice disbelieves both statements (Checked actions verify disbelief counts automatically)
    await disbelieveStatementChecked(aliceClients, beliefsContract, machinery, statement1);
    await disbelieveStatementChecked(aliceClients, beliefsContract, machinery, statement2);

    // Query Alice's disbeliefs
    testLog('  Querying Alice\'s disbeliefs...');
    const aliceDisbeliefs = await getUserDisbeliefs(machinery, aliceClients.account);

    // Verify Alice disbelieves the 2 statements created in this test
    const disbeliefCids = aliceDisbeliefs.map(b => b.cid.toLowerCase());
    const expectedCids = [statement1.toLowerCase(), statement2.toLowerCase()];

    assert.ok(
      expectedCids.every(cid => disbeliefCids.includes(cid)),
      'Alice\'s disbeliefs should include both statements she disbelieved in this test'
    );

    testLog('  ✓ Successfully retrieved user\'s disbelieved statements');
  });

  it('should retrieve another user\'s profile and statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    // Setup clients for both users
    const aliceClients = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const bobClients = createIsolatedWriteClients(SUITE_NAME, 4, RPC_URL);
    const machinery = createActionTestingMachinery();

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create statements
    const statement1 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Universal healthcare should be a human right',
    }));
    const statement2 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Education should be free for all',
    }));
    const statement3 = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Housing is a fundamental human need',
    }));

    testLog('  Bob signing statements...');

    // Bob believes statements 1 and 3 (Checked actions verify belief counts automatically)
    await believeStatementChecked(bobClients, beliefsContract, machinery, statement1);
    await believeStatementChecked(bobClients, beliefsContract, machinery, statement3);

    // Bob disbelieves statement 2 (Checked actions verify disbelief counts automatically)
    await disbelieveStatementChecked(bobClients, beliefsContract, machinery, statement2);

    // Alice queries Bob's profile (simulating viewing another user's profile)
    testLog('  Alice querying Bob\'s profile...');
    const bobBeliefs = await getUserBeliefs(machinery, bobClients.account);
    const bobDisbeliefs = await getUserDisbeliefs(machinery, bobClients.account);

    // Verify Bob believes statements 1 and 3 (created in this test)
    const bobBeliefCids = bobBeliefs.map(b => b.cid.toLowerCase());

    assert.ok(
      bobBeliefCids.includes(statement1.toLowerCase()) && bobBeliefCids.includes(statement3.toLowerCase()),
      'Bob should believe statements 1 and 3 from this test'
    );

    // Verify Bob disbelieves statement 2 (created in this test)
    const bobDisbeliefCids = bobDisbeliefs.map(b => b.cid.toLowerCase());

    assert.ok(
      bobDisbeliefCids.includes(statement2.toLowerCase()),
      'Bob should disbelieve statement 2 from this test'
    );

    testLog('  ✓ Successfully retrieved another user\'s profile');
  });
});
