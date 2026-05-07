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
  type ProjectFactoryContract,
  type AssuranceContract,
  ProjectFactoryAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { parseUnits, type Address } from 'viem';
import {
  getProject,
  getProjectContributions,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { createProjectChecked, buyProjectTokensChecked, refundProjectTokensChecked, withdrawProjectFundsChecked } from '../actions/funding-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';


describe('Pubstarter Project Lifecycle Integration Tests', () => {
  const paymentTokenGetterAbi = [
    {
      inputs: [],
      name: 'paymentToken',
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  const erc20BalanceOfAbi = [
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  // Test suite name for unique account derivation
  const SUITE_NAME = 'lifecycle';

  let machinery: ActionTestingMachinery;

  before(() => {
    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should allow withdrawal when project reaches threshold', async function() {
    this.timeout(30000);

    const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Test: Successful project with withdrawal');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributorClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Contributor: ${contributorClients.account}`);

    // Create project with low threshold so we can easily reach it
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
      title: 'Successful Project',
      description: 'This project will succeed',
    });

    const threshold = parseUnits('0.5', 6); // Need 0.5 ETH to succeed
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

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
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseUnits('0.01', 6)], // 0.01 ETH per token
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

    await buyProjectTokensChecked(
      contributorClients,
      assuranceContract,
      machinery,
      {
        buyer: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [50n], // 50 tokens * 0.01 ETH = 0.5 ETH
        totalCost: parseUnits('0.5', 6),
      }
    );

    // Note: Money conservation, token conservation, and monotonic funding are automatically
    // verified by buyProjectTokensChecked()

    const paymentToken = await creatorClients.publicClient.readContract({
      address: assuranceContract.address,
      abi: paymentTokenGetterAbi,
      functionName: 'paymentToken',
    });

    // Get creator's payment-token balance before withdrawal
    const balanceBefore = await creatorClients.publicClient.readContract({
      address: paymentToken,
      abi: erc20BalanceOfAbi,
      functionName: 'balanceOf',
      args: [creatorClients.account],
    });
    testLog(`  Creator balance before withdrawal: ${balanceBefore}`);

    // Creator withdraws funds
    testLog('  Creator withdrawing funds...');
    await withdrawProjectFundsChecked(
      creatorClients,
      assuranceContract,
      machinery
    );

    // Verify creator received funds in the payment token
    const balanceAfter = await creatorClients.publicClient.readContract({
      address: paymentToken,
      abi: erc20BalanceOfAbi,
      functionName: 'balanceOf',
      args: [creatorClients.account],
    });
    testLog(`  Creator balance after withdrawal: ${balanceAfter}`);

    // Token balance should increase by the full 0.5 payment-token amount.
    const balanceIncrease = balanceAfter - balanceBefore;
    testLog(`  Balance increase: ${balanceIncrease}`);
    assert.strictEqual(balanceIncrease, parseUnits('0.5', 6), 'Creator should have received the full payment-token withdrawal');

    testLog('  ✓ Successful project workflow completed!');
  });

  it('should allow refunds when project fails to reach threshold', async function() {
    this.timeout(40000);

    const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Test: Failed project with refunds');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributorClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // Create project with high threshold and deadline based on chain time (not wall clock)
    // Previous tests may have advanced blockchain time with evm_increaseTime, so
    // Date.now() can lag far behind block.timestamp.
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
      title: 'Failed Project',
      description: 'This project will fail',
    });

    const latestBlock = await creatorClients.publicClient.getBlock({ blockTag: 'latest' });
    const threshold = parseUnits('10.0', 6); // Need 10 ETH to succeed (impossible)
    const deadline = latestBlock.timestamp + 300n; // 5 minutes from current chain time

    testLog('  Creating project with high threshold...');
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
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseUnits('0.01', 6)],
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

    await buyProjectTokensChecked(
      contributorClients,
      assuranceContract,
      machinery,
      {
        buyer: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n], // 10 tokens * 0.01 ETH = 0.1 ETH (not enough)
        totalCost: parseUnits('0.1', 6),
      }
    );

    // Note: Money conservation and token conservation are automatically
    // verified by buyProjectTokensChecked()

    // Wait for deadline to pass by advancing blockchain time
    testLog('  Advancing blockchain time past deadline...');
    // Increase time by 305 seconds (past the 5 minute deadline)
    await contributorClients.publicClient.request({
      method: 'evm_increaseTime',
      params: [305] as any,
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

    const paymentToken = await contributorClients.publicClient.readContract({
      address: assuranceContract.address,
      abi: paymentTokenGetterAbi,
      functionName: 'paymentToken',
    });

    // Get contributor's payment-token balance before refund
    const balanceBefore = await contributorClients.publicClient.readContract({
      address: paymentToken,
      abi: erc20BalanceOfAbi,
      functionName: 'balanceOf',
      args: [contributorClients.account],
    });
    testLog(`  Contributor balance before refund: ${balanceBefore}`);

    // Contributor gets refund
    testLog('  Contributor requesting refund...');
    await refundProjectTokensChecked(
      contributorClients,
      assuranceContract,
      machinery,
      {
        holder: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n],
        refundAmount: parseUnits('0.1', 6), // 10 tokens * 0.01 ETH each
      }
    );

    // Verify contributor received refund in the payment token
    const balanceAfter = await contributorClients.publicClient.readContract({
      address: paymentToken,
      abi: erc20BalanceOfAbi,
      functionName: 'balanceOf',
      args: [contributorClients.account],
    });
    testLog(`  Contributor balance after refund: ${balanceAfter}`);

    const balanceIncrease = balanceAfter - balanceBefore;
    testLog(`  Balance increase: ${balanceIncrease}`);

    assert.strictEqual(balanceIncrease, parseUnits('0.1', 6), 'Contributor should have received the full payment-token refund');

    testLog('  ✓ Failed project refund workflow completed!');
  });

  it('should handle multiple contributors to the same project', async function() {
    this.timeout(30000);

    const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Test: Multiple contributors to one project');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributor1Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const contributor2Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Contributor 1: ${contributor1Clients.account}`);
    testLog(`  Contributor 2: ${contributor2Clients.account}`);

    // Create project
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
      title: 'Multi-Contributor Project',
      description: 'A project with multiple contributors',
    });

    const threshold = parseUnits('0.5', 6);
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
        tokenIds: [1n, 2n], // Two token types
        tokenCounts: [100n, 50n],
        tokenPrices: [parseUnits('0.01', 6), parseUnits('0.02', 6)],
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
    await buyProjectTokensChecked(
      contributor1Clients,
      assuranceContract,
      machinery,
      {
        buyer: contributor1Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [20n],
        totalCost: parseUnits('0.2', 6),
      }
    );

    // Contributor 2 buys 15 tokens of type 2 (0.3 ETH)
    testLog('  Contributor 2 buying 15 tokens of type 2...');
    await buyProjectTokensChecked(
      contributor2Clients,
      assuranceContract,
      machinery,
      {
        buyer: contributor2Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [2n],
        tokenCounts: [15n],
        totalCost: parseUnits('0.3', 6),
      }
    );

    // Verify project received total of 0.5 ETH from both contributors
    const fundedProject = await getProject(machinery, projectDetails.assuranceContractAddress);
    assert.ok(fundedProject, 'Multi-contributor project');

    testLog(`  Project total received: ${fundedProject.totalReceived}`);
    const expectedTotal = parseUnits('0.5', 6); // 0.2 + 0.3
    assert.strictEqual(
      fundedProject.totalReceived,
      expectedTotal.toString(),
      'Project should have received 0.5 ETH from both contributors'
    );

    // Query and verify contributions
    const contributions = await getProjectContributions(
      machinery,
      projectDetails.assuranceContractAddress
    );

    testLog(`  Found ${contributions.length} contributions`);
    assert.strictEqual(contributions.length, 2, 'Should have 2 contributions');

    // Find each contributor's contribution
    const contrib1 = contributions.find(c => c.participant.toLowerCase() === contributor1Clients.account.toLowerCase());
    const contrib2 = contributions.find(c => c.participant.toLowerCase() === contributor2Clients.account.toLowerCase());

    assert.ok(contrib1, 'Contributor 1 contribution should exist');
    assert.ok(contrib2, 'Contributor 2 contribution should exist');

    assert.strictEqual(contrib1!.totalCost, parseUnits('0.2', 6).toString(), 'Contributor 1 should have contributed 0.2 ETH');
    assert.strictEqual(contrib2!.totalCost, parseUnits('0.3', 6).toString(), 'Contributor 2 should have contributed 0.3 ETH');

    testLog('  ✓ Multiple contributors workflow completed!');
  });
});
