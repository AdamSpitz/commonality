/**
 * LazyGiving Token Burning Tests
 *
 * Tests token burning functionality which allows users to convert from
 * "investors" (holding tokens) to "donors" (burned tokens).
 */

import assert from 'assert';
import {
  uploadToIPFS,
  type ProjectFactoryContract,
  type AssuranceContract,
  ProjectFactoryAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { parseUnits, type Address } from 'viem';
import {
  getTokenBurns,
  getUserTokenBurns,
  getTokenBurnsByUser,
} from '@commonality/sdk';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { createProjectChecked, buyProjectTokensChecked, burnTokensChecked } from '../actions/funding-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';


describe('LazyGiving Token Burning Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'burn-tokens';

  let machinery: ActionTestingMachinery;

  before(() => {
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }
    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should track burned tokens and distinguish donors from investors', async function() {
    this.timeout(30000);

    testLog('  Setting up test clients...');
    const creatorClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const investorClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);
    const donorClients = createIsolatedWriteClients(SUITE_NAME, 2, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Investor: ${investorClients.account}`);
    testLog(`  Donor: ${donorClients.account}`);

    // Create project
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
      title: 'Token Burn Test Project',
      description: 'A project to test token burning',
    });

    const threshold = parseUnits('1.0', 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

    testLog('  Creating project...');
    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { projectDetails } = await createProjectChecked(
      creatorClients,
      projectFactoryContract,
      machinery,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: creatorClients.account,
        recipient: creatorClients.account,
        threshold,
        deadline,
        projectMetadataCid,
        tokenIds: [0n, 1n],
        tokenCounts: [100n, 50n],
        tokenPrices: [parseUnits('0.01', 6), parseUnits('0.05', 6)],
      }
    );

    testLog(`  Project created! Token address: ${projectDetails.tokenAddress}`);
    testLog('  ✓ Project creation properties verified');

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Investor buys tokens (will keep them - investor)
    // buyProjectTokensChecked automatically verifies token conservation
    testLog('  Investor buying tokens (will hold)...');
    await buyProjectTokensChecked(
      investorClients,
      assuranceContract,
      machinery,
      {
        buyer: investorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [10n],
        totalCost: parseUnits('0.1', 6), // 10 * 0.01 ETH
      }
    );

    // Donor buys tokens and will burn them
    // buyProjectTokensChecked automatically verifies token conservation
    testLog('  Donor buying tokens (will burn)...');
    await buyProjectTokensChecked(
      donorClients,
      assuranceContract,
      machinery,
      {
        buyer: donorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n, 1n],
        tokenCounts: [20n, 5n],
        totalCost: parseUnits('0.45', 6), // (20 * 0.01) + (5 * 0.05) = 0.45 ETH
      }
    );

    // Check initial burn count for this token (may be non-zero on non-fresh blockchain)
    testLog('  Checking initial burn count...');
    let burns = await getTokenBurns(machinery, projectDetails.tokenAddress);
    const initialBurnCount = burns.length;
    testLog(`  Initial burns for this token: ${initialBurnCount}`);

    // Donor burns all their tokens
    // burnTokensChecked automatically verifies token conservation and that funding data is unchanged
    testLog('  Donor burning all tokens...');
    await burnTokensChecked(
      donorClients,
      projectDetails.tokenAddress,
      machinery,
      projectDetails.assuranceContractAddress,
      {
        tokenIds: [0n, 1n],
        tokenCounts: [20n, 5n],
      }
    );

    // Verify burn was tracked
    testLog('  Verifying burn was tracked...');
    burns = await getTokenBurns(machinery, projectDetails.tokenAddress);
    assert.strictEqual(burns.length, initialBurnCount + 1, 'Should have one more burn record');

    // Find the burn from our donor
    const burn = burns.find(b => b.burner.toLowerCase() === donorClients.account.toLowerCase());
    assert.ok(burn, 'Should find burn from donor');
    assert.strictEqual(
      burn.erc1155Address.toLowerCase(),
      projectDetails.tokenAddress.toLowerCase(),
      'Burn ERC1155 address should match'
    );
    assert.strictEqual(
      burn.burner.toLowerCase(),
      donorClients.account.toLowerCase(),
      'Burner should be the donor'
    );
    assert.strictEqual(
      burn.tokenIds,
      JSON.stringify(['0', '1']),
      'Burned token IDs should match'
    );
    assert.strictEqual(
      burn.tokenCounts,
      JSON.stringify(['20', '5']),
      'Burned token counts should match'
    );

    testLog(`  ✓ Burn record verified: ${burn.id}`);

    // Verify query by user works
    testLog('  Verifying user-specific burn query...');
    const donorBurns = await getUserTokenBurns(machinery, donorClients.account);
    assert(donorBurns.length >= 1, 'Donor should have at least one burn');

    // Check that donor has a burn for this specific token
    const donorBurnForThisToken = donorBurns.find(
      b => b.erc1155Address.toLowerCase() === projectDetails.tokenAddress.toLowerCase()
    );
    assert.ok(donorBurnForThisToken, 'Donor should have burn for this token');

    const investorBurns = await getUserTokenBurns(machinery, investorClients.account);
    const investorBurnsForThisToken = investorBurns.filter(
      b => b.erc1155Address.toLowerCase() === projectDetails.tokenAddress.toLowerCase()
    );
    assert.strictEqual(investorBurnsForThisToken.length, 0, 'Investor should have no burns for this token yet');

    testLog('  ✓ Donor has burns, investor does not');

    // Verify combined query
    testLog('  Verifying combined ERC1155 + user query...');
    const donorTokenBurns = await getTokenBurnsByUser(
      machinery,
      projectDetails.tokenAddress,
      donorClients.account
    );
    assert(donorTokenBurns.length >= 1, 'Should find at least one donor burn for this token');

    const investorTokenBurns = await getTokenBurnsByUser(
      machinery,
      projectDetails.tokenAddress,
      investorClients.account
    );
    assert.strictEqual(investorTokenBurns.length, 0, 'Should find no investor burns for this token yet');

    testLog('  ✓ Combined query works correctly');

    // Now test partial burn
    // burnTokensChecked automatically verifies token conservation and that funding data is unchanged
    testLog('  Investor burning half their tokens...');
    await burnTokensChecked(
      investorClients,
      projectDetails.tokenAddress,
      machinery,
      projectDetails.assuranceContractAddress,
      {
        tokenIds: [0n],
        tokenCounts: [5n], // Burn 5 out of 10
      }
    );

    // Verify partial burn
    testLog('  Verifying partial burn...');
    burns = await getTokenBurns(machinery, projectDetails.tokenAddress);
    assert.strictEqual(burns.length, initialBurnCount + 2, 'Should have two more burn records now');

    const investorBurn = burns.find(
      b => b.burner.toLowerCase() === investorClients.account.toLowerCase()
    );
    assert.ok(investorBurn, 'Should find investor burn');
    assert.strictEqual(
      investorBurn.tokenIds,
      JSON.stringify(['0']),
      'Investor burned token ID 0'
    );
    assert.strictEqual(
      investorBurn.tokenCounts,
      JSON.stringify(['5']),
      'Investor burned 5 tokens'
    );

    testLog('  ✓ Partial burn tracked correctly');
    testLog('  Test completed successfully!');
  });
});
