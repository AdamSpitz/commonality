/**
 * Pubstarter Multiple Token Types Tests
 *
 * Tests purchasing different token types from the same project at different prices.
 * Covers TODO item B2 from integration-tests-todo.md.
 */

import assert from 'assert';
import {
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getProject,
  getProjectTokens,
  getProjectContributions,
  assertNotNull,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import {
  PubstarterAbi,
  AssuranceContractAbi
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import { assertMoneyConservation, assertTokenConservation } from './invariants.js';
import { createProjectChecked, buyProjectTokensChecked } from './funding-actions-checked.js';


describe('Pubstarter Multiple Token Types Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'pubstarter-multiple-tokens';

  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should handle multiple token types with different prices', async function() {
    this.timeout(30000);

    testLog('  Setting up test clients...');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const buyer1Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const buyer2Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Buyer1: ${buyer1Clients.account}`);
    testLog(`  Buyer2: ${buyer2Clients.account}`);

    // Create project metadata
    const projectMetadataCid = await uploadToIPFS({
      title: 'Multi-Token Project',
      description: 'A project with multiple token tiers',
      category: 'technology',
    });

    // Project parameters
    const threshold = parseEther('2.0');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

    // Token parameters: 3 different tiers at different prices
    const tokenIds = [0n, 1n, 2n];
    const tokenCounts = [100n, 50n, 10n]; // Bronze, Silver, Gold tiers
    const tokenPrices = [
      parseEther('0.01'),  // Bronze: 0.01 ETH
      parseEther('0.05'),  // Silver: 0.05 ETH
      parseEther('0.2'),   // Gold: 0.2 ETH
    ];

    testLog('  Creating project with 3 token types...');
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { projectDetails } = await createProjectChecked(
      creatorClients,
      pubstarterContract,
      graphqlClient,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: creatorClients.account,
        recipient: creatorClients.account,
        threshold,
        deadline,
        projectMetadataCid,
        tokenIds,
        tokenCounts,
        tokenPrices,
      }
    );

    testLog(`  Project created! Assurance Contract: ${projectDetails.assuranceContractAddress}`);

    // Verify all 3 token types are tracked
    testLog('  Verifying token types in indexer...');
    const tokens = await getProjectTokens(graphqlClient, projectDetails.assuranceContractAddress);

    assert.strictEqual(tokens.length, 3, 'Should have 3 token types');

    // Sort tokens by tokenId for consistent comparison
    const sortedTokens = tokens.sort((a, b) =>
      Number(BigInt(a.tokenId) - BigInt(b.tokenId))
    );

    assert.strictEqual(sortedTokens[0].price, parseEther('0.01').toString(), 'Bronze token price');
    assert.strictEqual(sortedTokens[1].price, parseEther('0.05').toString(), 'Silver token price');
    assert.strictEqual(sortedTokens[2].price, parseEther('0.2').toString(), 'Gold token price');

    testLog('  ✓ All 3 token types verified');

    // Buyer1 purchases Bronze tokens (token 0)
    testLog('  Buyer1 purchasing 5 Bronze tokens...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buy1Hash = await buyProjectTokensChecked(
      buyer1Clients,
      assuranceContract,
      graphqlClient,
      {
        buyer: buyer1Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        totalCost: parseEther('0.05'), // 5 * 0.01 ETH
      }
    );

    // Buyer2 purchases Silver tokens (token 1)
    testLog('  Buyer2 purchasing 3 Silver tokens...');
    const buy2Hash = await buyProjectTokensChecked(
      buyer2Clients,
      assuranceContract,
      graphqlClient,
      {
        buyer: buyer2Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [3n],
        totalCost: parseEther('0.15'), // 3 * 0.05 ETH
      }
    );

    // Buyer1 purchases Gold tokens (token 2) and more Bronze in same transaction
    testLog('  Buyer1 purchasing 1 Gold + 10 Bronze tokens...');
    const buy3Hash = await buyProjectTokensChecked(
      buyer1Clients,
      assuranceContract,
      graphqlClient,
      {
        buyer: buyer1Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [2n, 0n],
        tokenCounts: [1n, 10n],
        totalCost: parseEther('0.3'), // (1 * 0.2) + (10 * 0.01) = 0.3 ETH
      }
    );

    // Verify contributions were tracked correctly
    testLog('  Verifying contribution records...');
    const contributions = await getProjectContributions(
      graphqlClient,
      projectDetails.assuranceContractAddress
    );

    assert.strictEqual(contributions.length, 3, 'Should have 3 contribution records');

    // Verify first contribution (Buyer1, Bronze)
    const contrib1 = contributions.find(c =>
      c.participant.toLowerCase() === buyer1Clients.account.toLowerCase() &&
      c.tokenIds === JSON.stringify(['0'])
    );
    assert.ok(contrib1, 'First Buyer1 contribution not found');
    assert.strictEqual(contrib1.totalCost, parseEther('0.05').toString(), 'First contribution cost');
    assert.strictEqual(contrib1.tokenCounts, JSON.stringify(['5']), 'First contribution counts');

    // Verify second contribution (Buyer2, Silver)
    const contrib2 = contributions.find(c =>
      c.participant.toLowerCase() === buyer2Clients.account.toLowerCase()
    );
    assert.ok(contrib2, 'Buyer2 contribution not found');
    assert.strictEqual(contrib2.totalCost, parseEther('0.15').toString(), 'Second contribution cost');
    assert.strictEqual(contrib2.tokenIds, JSON.stringify(['1']), 'Second contribution token IDs');
    assert.strictEqual(contrib2.tokenCounts, JSON.stringify(['3']), 'Second contribution counts');

    // Verify third contribution (Buyer1, Gold + Bronze)
    const contrib3 = contributions.find(c =>
      c.participant.toLowerCase() === buyer1Clients.account.toLowerCase() &&
      c.tokenIds.includes('2')
    );
    assert.ok(contrib3, 'Second Buyer1 contribution not found');
    assert.strictEqual(contrib3.totalCost, parseEther('0.3').toString(), 'Third contribution cost');
    assert.strictEqual(contrib3.tokenIds, JSON.stringify(['2', '0']), 'Third contribution token IDs');
    assert.strictEqual(contrib3.tokenCounts, JSON.stringify(['1', '10']), 'Third contribution counts');

    testLog('  ✓ All contribution records verified');

    // Verify invariants: money and token conservation across multiple token types and purchases
    await assertMoneyConservation(graphqlClient, projectDetails.assuranceContractAddress);
    await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);

    testLog('  ✓ Money conservation verified');
    testLog('  ✓ Token conservation verified');
    testLog('  Test completed successfully!');
  });
});
