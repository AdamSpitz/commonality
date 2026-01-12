/**
 * Pubstarter Project Lifecycle Integration Tests
 *
 * Tests the complete lifecycle of crowdfunding projects:
 * 1. Successful project: reaches threshold → allows withdrawal
 * 2. Failed project: misses threshold after deadline → allows refunds
 * 3. Multiple contributors to same project
 */

import assert from 'assert';
import {
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
  createGraphQLClient,
  assertNotNull,
  PubstarterAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import {
  getProject,
  getProjectContributions,
} from '../utils/graphql-helpers.js';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { createProjectChecked, buyProjectTokensChecked, refundProjectTokensChecked, withdrawProjectFundsChecked } from '../actions/funding-actions-checked.js';


describe('Pubstarter Project Lifecycle Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  // Test suite name for unique account derivation
  const SUITE_NAME = 'pubstarter-lifecycle';

  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should allow withdrawal when project reaches threshold', async function() {
    this.timeout(30000);

    const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Test: Successful project with withdrawal');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributorClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Contributor: ${contributorClients.account}`);

    // Create project with low threshold so we can easily reach it
    const projectMetadataCid = await uploadToIPFS({
      title: 'Successful Project',
      description: 'This project will succeed',
    });

    const threshold = parseEther('0.5'); // Need 0.5 ETH to succeed
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

    testLog('  Creating project...');
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProjectChecked(
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
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')], // 0.01 ETH per token
      }
    );

    testLog(`  Project created! Assurance Contract: ${projectDetails.assuranceContractAddress}`);
    testLog('  ✓ Project creation properties verified');

    // Contributor buys enough tokens to meet threshold
    testLog('  Contributor buying 50 tokens (0.5 ETH total)...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buyHash = await buyProjectTokensChecked(
      contributorClients,
      assuranceContract,
      graphqlClient,
      {
        buyer: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [50n], // 50 tokens * 0.01 ETH = 0.5 ETH
        totalCost: parseEther('0.5'),
      }
    );

    // Note: Money conservation, token conservation, and monotonic funding are automatically
    // verified by buyProjectTokensChecked()

    // Get creator's balance before withdrawal
    const balanceBefore = await creatorClients.publicClient.getBalance({
      address: creatorClients.account,
    });
    testLog(`  Creator balance before withdrawal: ${balanceBefore}`);

    // Creator withdraws funds
    testLog('  Creator withdrawing funds...');
    await withdrawProjectFundsChecked(
      creatorClients,
      assuranceContract,
      graphqlClient
    );

    // Verify creator received funds (ETH balance check)
    const balanceAfter = await creatorClients.publicClient.getBalance({
      address: creatorClients.account,
    });
    testLog(`  Creator balance after withdrawal: ${balanceAfter}`);

    // Balance should increase by approximately 0.5 ETH (minus gas costs from withdrawal)
    const balanceIncrease = balanceAfter - balanceBefore;
    testLog(`  Balance increase: ${balanceIncrease}`);

    // The increase should be close to 0.5 ETH, accounting for gas costs
    // Gas costs should be much smaller than 0.1 ETH, so we check it's at least 0.4 ETH
    assert.ok(balanceIncrease > parseEther('0.4'), 'Creator should have received funds (minus gas)');

    testLog('  ✓ Successful project workflow completed!');
  });

  it('should allow refunds when project fails to reach threshold', async function() {
    this.timeout(40000);

    const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Test: Failed project with refunds');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributorClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // Create project with high threshold and very short deadline
    const projectMetadataCid = await uploadToIPFS({
      title: 'Failed Project',
      description: 'This project will fail',
    });

    const threshold = parseEther('10.0'); // Need 10 ETH to succeed (impossible)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 2); // 2 seconds from now

    testLog('  Creating project with high threshold...');
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProjectChecked(
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
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    testLog(`  Project created! Assurance Contract: ${projectDetails.assuranceContractAddress}`);
    testLog('  ✓ Project creation properties verified');

    // Contributor buys some tokens (but not enough to reach threshold)
    testLog('  Contributor buying 10 tokens (0.1 ETH)...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buyHash = await buyProjectTokensChecked(
      contributorClients,
      assuranceContract,
      graphqlClient,
      {
        buyer: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n], // 10 tokens * 0.01 ETH = 0.1 ETH (not enough)
        totalCost: parseEther('0.1'),
      }
    );

    // Note: Money conservation and token conservation are automatically
    // verified by buyProjectTokensChecked()

    // Wait for deadline to pass by advancing blockchain time
    testLog('  Advancing blockchain time past deadline...');
    // Increase time by 5 seconds (past the 2 second deadline)
    await contributorClients.publicClient.request({
      method: 'evm_increaseTime',
      params: [5] as any,
    } as any);
    // Mine a block to apply the time change
    await contributorClients.publicClient.request({
      method: 'evm_mine',
      params: [] as any,
    } as any);
    testLog('  Blockchain time advanced');

    // Contributor needs to approve the assurance contract to transfer tokens back
    testLog('  Contributor approving assurance contract to transfer tokens...');
    const erc1155Abi = [
      {
        inputs: [
          { name: 'operator', type: 'address' },
          { name: 'approved', type: 'bool' },
        ],
        name: 'setApprovalForAll',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ] as const;

    const approveHash = await contributorClients.walletClient.writeContract({
      address: projectDetails.tokenAddress,
      abi: erc1155Abi,
      functionName: 'setApprovalForAll',
      args: [projectDetails.assuranceContractAddress, true],
      account: contributorClients.account,
      chain: null,
    } as any);
    await contributorClients.publicClient.waitForTransactionReceipt({ hash: approveHash });
    testLog('  Tokens approved for transfer');

    // Get contributor's balance before refund
    const balanceBefore = await contributorClients.publicClient.getBalance({
      address: contributorClients.account,
    });
    testLog(`  Contributor balance before refund: ${balanceBefore}`);

    // Contributor gets refund
    testLog('  Contributor requesting refund...');
    await refundProjectTokensChecked(
      contributorClients,
      assuranceContract,
      graphqlClient,
      {
        holder: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n],
        refundAmount: parseEther('0.1'), // 10 tokens * 0.01 ETH each
      }
    );

    // Verify contributor received refund (ETH balance check)
    const balanceAfter = await contributorClients.publicClient.getBalance({
      address: contributorClients.account,
    });
    testLog(`  Contributor balance after refund: ${balanceAfter}`);

    const balanceIncrease = balanceAfter - balanceBefore;
    testLog(`  Balance increase: ${balanceIncrease}`);

    // Balance should increase by approximately 0.1 ETH (minus gas costs)
    assert.ok(balanceIncrease > parseEther('0.05'), 'Contributor should have received refund (minus gas)');

    testLog('  ✓ Failed project refund workflow completed!');
  });

  it('should handle multiple contributors to the same project', async function() {
    this.timeout(30000);

    const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Test: Multiple contributors to one project');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributor1Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const contributor2Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Contributor 1: ${contributor1Clients.account}`);
    testLog(`  Contributor 2: ${contributor2Clients.account}`);

    // Create project
    const projectMetadataCid = await uploadToIPFS({
      title: 'Multi-Contributor Project',
      description: 'A project with multiple contributors',
    });

    const threshold = parseEther('0.5');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

    testLog('  Creating project...');
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProjectChecked(
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
        tokenIds: [1n, 2n], // Two token types
        tokenCounts: [100n, 50n],
        tokenPrices: [parseEther('0.01'), parseEther('0.02')],
      }
    );

    testLog(`  Project created! Assurance Contract: ${projectDetails.assuranceContractAddress}`);
    testLog('  ✓ Project creation properties verified');

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Contributor 1 buys 20 tokens of type 1 (0.2 ETH)
    testLog('  Contributor 1 buying 20 tokens of type 1...');
    const buy1Hash = await buyProjectTokensChecked(
      contributor1Clients,
      assuranceContract,
      graphqlClient,
      {
        buyer: contributor1Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [20n],
        totalCost: parseEther('0.2'),
      }
    );

    // Contributor 2 buys 15 tokens of type 2 (0.3 ETH)
    testLog('  Contributor 2 buying 15 tokens of type 2...');
    const buy2Hash = await buyProjectTokensChecked(
      contributor2Clients,
      assuranceContract,
      graphqlClient,
      {
        buyer: contributor2Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [2n],
        tokenCounts: [15n],
        totalCost: parseEther('0.3'),
      }
    );

    // Verify project received total of 0.5 ETH from both contributors
    const fundedProject = assertNotNull(
      await getProject(graphqlClient, projectDetails.assuranceContractAddress),
      'Multi-contributor project'
    );

    testLog(`  Project total received: ${fundedProject.totalReceived}`);
    const expectedTotal = parseEther('0.5'); // 0.2 + 0.3
    assert.strictEqual(
      fundedProject.totalReceived,
      expectedTotal.toString(),
      'Project should have received 0.5 ETH from both contributors'
    );

    // Query and verify contributions
    const contributions = await getProjectContributions(
      graphqlClient,
      projectDetails.assuranceContractAddress
    );

    testLog(`  Found ${contributions.length} contributions`);
    assert.strictEqual(contributions.length, 2, 'Should have 2 contributions');

    // Find each contributor's contribution
    const contrib1 = contributions.find(c => c.participant.toLowerCase() === contributor1Clients.account.toLowerCase());
    const contrib2 = contributions.find(c => c.participant.toLowerCase() === contributor2Clients.account.toLowerCase());

    assert.ok(contrib1, 'Contributor 1 contribution should exist');
    assert.ok(contrib2, 'Contributor 2 contribution should exist');

    assert.strictEqual(contrib1!.totalCost, parseEther('0.2').toString(), 'Contributor 1 should have contributed 0.2 ETH');
    assert.strictEqual(contrib2!.totalCost, parseEther('0.3').toString(), 'Contributor 2 should have contributed 0.3 ETH');

    testLog('  ✓ Multiple contributors workflow completed!');
  });
});
