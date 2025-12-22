/**
 * Pubstarter Token Burning Tests
 *
 * Tests token burning functionality which allows users to convert from
 * "investors" (holding tokens) to "donors" (burned tokens).
 * Covers TODO item B3 from integration-tests-todo.md.
 */

import assert from 'assert';
import {
  createProject,
  buyProjectTokens,
  burnTokens,
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getProject,
  getTokenBurns,
  getUserTokenBurns,
  getTokenBurnsByUser,
  waitForSync,
  assertNotNull,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import {
  PubstarterAbi,
  AssuranceContractAbi
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import { assertTokenConservation } from './invariants.js';


describe('Pubstarter Token Burning Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'pubstarter-burn-tokens';

  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should track burned tokens and distinguish donors from investors', async function() {
    this.timeout(30000);

    testLog('  Setting up test clients...');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const investorClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const donorClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Investor: ${investorClients.account}`);
    testLog(`  Donor: ${donorClients.account}`);

    // Create project
    const projectMetadataCid = await uploadToIPFS({
      title: 'Token Burn Test Project',
      description: 'A project to test token burning',
    });

    const threshold = parseEther('1.0');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

    testLog('  Creating project...');
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProject(
      creatorClients,
      pubstarterContract,
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
        tokenPrices: [parseEther('0.01'), parseEther('0.05')],
      }
    );

    testLog(`  Project created! Token address: ${projectDetails.tokenAddress}`);

    // Wait for indexer
    const receipt = await creatorClients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Verify token conservation (initial state: 0 sold, 0 burned)
    testLog('  Verifying initial token conservation...');
    await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);

    // Investor buys tokens (will keep them - investor)
    testLog('  Investor buying tokens (will hold)...');
    const investorBuyHash = await buyProjectTokens(
      investorClients,
      assuranceContract,
      {
        buyer: investorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [10n],
        totalCost: parseEther('0.1'), // 10 * 0.01 ETH
      }
    );

    const investorReceipt = await investorClients.publicClient.getTransactionReceipt({
      hash: investorBuyHash
    });
    await waitForSync(graphqlClient, investorReceipt.blockNumber, 15000);

    // Verify token conservation (10 sold, 0 burned, 10 held)
    testLog('  Verifying token conservation after investor purchase...');
    await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);

    // Donor buys tokens and will burn them
    testLog('  Donor buying tokens (will burn)...');
    const donorBuyHash = await buyProjectTokens(
      donorClients,
      assuranceContract,
      {
        buyer: donorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n, 1n],
        tokenCounts: [20n, 5n],
        totalCost: parseEther('0.45'), // (20 * 0.01) + (5 * 0.05) = 0.45 ETH
      }
    );

    const donorReceipt = await donorClients.publicClient.getTransactionReceipt({
      hash: donorBuyHash
    });
    await waitForSync(graphqlClient, donorReceipt.blockNumber, 15000);

    // Verify token conservation (30 tokenId 0 + 5 tokenId 1 sold, 0 burned, all held)
    testLog('  Verifying token conservation after donor purchase...');
    await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);

    // Check initial burn count for this token (may be non-zero on non-fresh blockchain)
    testLog('  Checking initial burn count...');
    let burns = await getTokenBurns(graphqlClient, projectDetails.tokenAddress);
    const initialBurnCount = burns.length;
    testLog(`  Initial burns for this token: ${initialBurnCount}`);

    // Donor burns all their tokens
    testLog('  Donor burning all tokens...');
    const burnHash = await burnTokens(
      donorClients,
      projectDetails.tokenAddress,
      {
        tokenIds: [0n, 1n],
        tokenCounts: [20n, 5n],
      }
    );

    const burnReceipt = await donorClients.publicClient.getTransactionReceipt({
      hash: burnHash
    });
    await waitForSync(graphqlClient, burnReceipt.blockNumber, 15000);

    // Verify token conservation (30 tokenId 0 sold, 20 burned, 10 held; 5 tokenId 1 sold, 5 burned, 0 held)
    testLog('  Verifying token conservation after donor burn...');
    await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);

    // Verify burn was tracked
    testLog('  Verifying burn was tracked...');
    burns = await getTokenBurns(graphqlClient, projectDetails.tokenAddress);
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
    const donorBurns = await getUserTokenBurns(graphqlClient, donorClients.account);
    assert(donorBurns.length >= 1, 'Donor should have at least one burn');

    // Check that donor has a burn for this specific token
    const donorBurnForThisToken = donorBurns.find(
      b => b.erc1155Address.toLowerCase() === projectDetails.tokenAddress.toLowerCase()
    );
    assert.ok(donorBurnForThisToken, 'Donor should have burn for this token');

    const investorBurns = await getUserTokenBurns(graphqlClient, investorClients.account);
    const investorBurnsForThisToken = investorBurns.filter(
      b => b.erc1155Address.toLowerCase() === projectDetails.tokenAddress.toLowerCase()
    );
    assert.strictEqual(investorBurnsForThisToken.length, 0, 'Investor should have no burns for this token yet');

    testLog('  ✓ Donor has burns, investor does not');

    // Verify combined query
    testLog('  Verifying combined ERC1155 + user query...');
    const donorTokenBurns = await getTokenBurnsByUser(
      graphqlClient,
      projectDetails.tokenAddress,
      donorClients.account
    );
    assert(donorTokenBurns.length >= 1, 'Should find at least one donor burn for this token');

    const investorTokenBurns = await getTokenBurnsByUser(
      graphqlClient,
      projectDetails.tokenAddress,
      investorClients.account
    );
    assert.strictEqual(investorTokenBurns.length, 0, 'Should find no investor burns for this token yet');

    testLog('  ✓ Combined query works correctly');

    // Now test partial burn
    testLog('  Investor burning half their tokens...');
    const partialBurnHash = await burnTokens(
      investorClients,
      projectDetails.tokenAddress,
      {
        tokenIds: [0n],
        tokenCounts: [5n], // Burn 5 out of 10
      }
    );

    const partialBurnReceipt = await investorClients.publicClient.getTransactionReceipt({
      hash: partialBurnHash
    });
    await waitForSync(graphqlClient, partialBurnReceipt.blockNumber, 15000);

    // Verify token conservation (30 tokenId 0 sold, 25 burned, 5 held)
    testLog('  Verifying token conservation after partial burn...');
    await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);

    // Verify partial burn
    testLog('  Verifying partial burn...');
    burns = await getTokenBurns(graphqlClient, projectDetails.tokenAddress);
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
