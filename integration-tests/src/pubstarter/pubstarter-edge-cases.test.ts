/**
 * Pubstarter Edge Cases Integration Test
 *
 * Tests edge cases for funding/pubstarter subsystem:
 * - Insufficient funds for project purchase
 * - Refund after project failure (deadline passed without meeting threshold)
 * - Project deadline edge cases
 * - Withdrawal permission checks
 *
 * NOTE: This test file has been refactored to use the action framework,
 * which automatically checks state transition properties and invariants.
 */

import assert from 'assert';
import { parseEther } from 'viem';
import {
  buyProjectTokens,
  refundProjectTokens,
  withdrawProjectFunds,
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
  createGraphQLClient,
  PubstarterAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { getProject } from '../utils/graphql-helpers.js';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import {
  createProjectChecked,
  buyProjectTokensChecked,
  refundProjectTokensChecked,
  withdrawProjectFundsChecked,
} from '../actions/funding-actions-checked.js';

describe('Pubstarter Edge Cases', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'pubstarter-edge-cases';

  it('should fail when trying to buy tokens with insufficient funds', async () => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Create a project
    const projectMetadataCid = await uploadToIPFS({
      title: 'Insufficient Funds Test Project',
      description: 'Testing insufficient funds scenario',
    });

    const tokenPrice = parseEther('0.1');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog('  Creating project...');
    const { projectDetails } = await createProjectChecked(aliceClients, pubstarterContract, graphqlClient, {
      metadataURI: 'ipfs://token-metadata',
      contractURI: 'ipfs://contract-metadata',
      owner: aliceClients.account,
      recipient: aliceClients.account,
      threshold: parseEther('10'),
      deadline,
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [tokenPrice],
    });
    testLog('  ✓ Project creation properties verified');

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob tries to buy 10 tokens but only sends enough for 5
    testLog('  Bob attempting to buy tokens with insufficient funds...');

    let purchaseFailed = false;
    try {
      await buyProjectTokens(bobClients, assuranceContract, {
        buyer: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [10n],
        totalCost: tokenPrice * 5n, // Only half the required amount
      });
    } catch (error) {
      purchaseFailed = true;
      testLog('  ✓ Purchase failed as expected due to insufficient funds');
    }

    assert.ok(purchaseFailed, 'Purchase with insufficient funds should fail');
  });

  it('should allow refund after project fails to meet threshold by deadline', async () => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Create a project with a very short deadline (1 second from now)
    const projectMetadataCid = await uploadToIPFS({
      title: 'Refund Test Project',
      description: 'Testing refund after project failure',
    });

    const tokenPrice = parseEther('0.1');
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = BigInt(currentTime + 2); // 2 seconds from now

    testLog('  Creating project with short deadline...');
    const { projectDetails } = await createProjectChecked(aliceClients, pubstarterContract, graphqlClient, {
      metadataURI: 'ipfs://token-metadata',
      contractURI: 'ipfs://contract-metadata',
      owner: aliceClients.account,
      recipient: aliceClients.account,
      threshold: parseEther('10'), // High threshold that won't be met
      deadline,
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [tokenPrice],
    });
    testLog('  ✓ Project creation properties verified');

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob buys a small amount (not enough to meet threshold) - properties checked automatically
    testLog('  Bob purchasing tokens...');
    await buyProjectTokensChecked(bobClients, assuranceContract, graphqlClient, {
      buyer: bobClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [0n],
      tokenCounts: [5n],
      totalCost: tokenPrice * 5n,
    });

    // Note: We can't reliably check refund logic before deadline in integration tests
    // because by the time the indexer syncs, the blockchain time may have already advanced.
    // The refund logic check is better suited for after we explicitly advance time.

    // Advance blockchain time past the deadline
    testLog('  Advancing blockchain time past deadline...');
    await bobClients.publicClient.request({
      method: 'evm_increaseTime',
      params: [3] as any,
    } as any);
    // Mine a block to apply the time change
    await bobClients.publicClient.request({
      method: 'evm_mine',
      params: [] as any,
    } as any);

    // Bob needs to approve the assurance contract to transfer the tokens back for refund
    testLog('  Bob approving assurance contract to transfer tokens...');
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

    const approveHash = await bobClients.walletClient.writeContract({
      address: projectDetails.tokenAddress,
      abi: erc1155Abi,
      functionName: 'setApprovalForAll',
      args: [projectDetails.assuranceContractAddress, true],
      account: bobClients.account,
      chain: null,
    } as any);
    await bobClients.publicClient.waitForTransactionReceipt({ hash: approveHash });
    testLog('  Tokens approved for transfer');

    // Bob should be able to refund his tokens now - properties checked automatically
    testLog('  Bob attempting refund after project failure...');

    let refundSucceeded = true;
    let refundError: any = null;
    try {
      const refundTx = await refundProjectTokensChecked(bobClients, assuranceContract, graphqlClient, {
        holder: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        refundAmount: tokenPrice * 5n,
      });

      testLog(`  ✓ Refund succeeded: ${refundTx} (state transitions verified)`);
    } catch (error) {
      refundSucceeded = false;
      refundError = error;
      console.error('  Unexpected error during refund:');
      console.error('  Error message:', (error as any)?.message || String(error));
      console.error('  Error details:', (error as any)?.details || 'No details');
    }

    assert.ok(refundSucceeded, `Refund should succeed after project failure. Error: ${refundError?.message || String(refundError)}`);
  });

  it('should prevent non-recipient from withdrawing project funds', async () => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Create a project where Alice is the recipient
    const projectMetadataCid = await uploadToIPFS({
      title: 'Withdrawal Permission Test Project',
      description: 'Testing withdrawal permissions',
    });

    const tokenPrice = parseEther('0.1');
    const threshold = parseEther('1');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);

    testLog('  Creating project with Alice as recipient...');
    const { projectDetails } = await createProjectChecked(aliceClients, pubstarterContract, graphqlClient, {
      metadataURI: 'ipfs://token-metadata',
      contractURI: 'ipfs://contract-metadata',
      owner: aliceClients.account,
      recipient: aliceClients.account, // Alice is the recipient
      threshold,
      deadline,
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [tokenPrice],
    });
    testLog('  ✓ Project creation properties verified');

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob buys enough tokens to meet the threshold - properties checked automatically
    testLog('  Bob purchasing tokens to meet threshold...');
    await buyProjectTokensChecked(bobClients, assuranceContract, graphqlClient, {
      buyer: bobClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [0n],
      tokenCounts: [15n],
      totalCost: tokenPrice * 15n,
    });

    // Verify threshold was met
    const project = await getProject(graphqlClient, projectDetails.assuranceContractAddress);
    testLog(`  Project received: ${project?.totalReceived} (threshold: ${project?.threshold})`);

    // Bob (not the recipient) tries to withdraw the funds
    testLog('  Bob attempting to withdraw funds (should fail)...');

    let withdrawalFailed = false;
    try {
      await withdrawProjectFunds(bobClients, assuranceContract);
    } catch (error) {
      withdrawalFailed = true;
      testLog('  ✓ Withdrawal failed as expected');
    }

    assert.ok(withdrawalFailed, 'Non-recipient withdrawal should fail');

    // Alice (the recipient) should be able to withdraw - properties checked automatically
    testLog('  Alice withdrawing funds (should succeed)...');

    let aliceWithdrawalSucceeded = true;
    try {
      const withdrawTx = await withdrawProjectFundsChecked(aliceClients, assuranceContract, graphqlClient);
      testLog(`  ✓ Alice withdrawal succeeded: ${withdrawTx} (state transitions verified)`);
    } catch (error) {
      aliceWithdrawalSucceeded = false;
      console.error('  Unexpected error during Alice withdrawal:', error);
    }

    assert.ok(aliceWithdrawalSucceeded, 'Recipient should be able to withdraw funds');
  });

  it('should handle exact deadline timing correctly', async () => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Create a project with a deadline 3 seconds from now
    const projectMetadataCid = await uploadToIPFS({
      title: 'Deadline Timing Test Project',
      description: 'Testing exact deadline timing',
    });

    const tokenPrice = parseEther('0.1');
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = BigInt(currentTime + 3);

    testLog('  Creating project...');
    const { projectDetails } = await createProjectChecked(aliceClients, pubstarterContract, graphqlClient, {
      metadataURI: 'ipfs://token-metadata',
      contractURI: 'ipfs://contract-metadata',
      owner: aliceClients.account,
      recipient: aliceClients.account,
      threshold: parseEther('10'),
      deadline,
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [tokenPrice],
    });
    testLog('  ✓ Project creation properties verified');

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob should be able to buy before deadline - properties checked automatically
    testLog('  Bob purchasing before deadline...');
    let purchaseBeforeSucceeded = true;
    try {
      await buyProjectTokensChecked(bobClients, assuranceContract, graphqlClient, {
        buyer: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        totalCost: tokenPrice * 5n,
      });
      testLog('  ✓ Purchase before deadline succeeded (state transitions verified)');
    } catch (error) {
      purchaseBeforeSucceeded = false;
      console.error('  Unexpected error purchasing before deadline:', error);
    }

    assert.ok(purchaseBeforeSucceeded, 'Purchase before deadline should succeed');

    // Advance blockchain time past the deadline
    testLog('  Advancing blockchain time past deadline...');
    await bobClients.publicClient.request({
      method: 'evm_increaseTime',
      params: [4] as any,
    } as any);
    // Mine a block to apply the time change
    await bobClients.publicClient.request({
      method: 'evm_mine',
      params: [] as any,
    } as any);

    // Note: Per the AssuranceContract design (see AssuranceContracts.sol:116-119),
    // buying is ALWAYS allowed, even after the deadline. This is intentional to allow
    // additional contributions that could help the project reach its goal.
    testLog('  Bob purchasing after deadline (should still succeed per contract design)...');
    let purchaseAfterSucceeded = true;
    try {
      await buyProjectTokensChecked(bobClients, assuranceContract, graphqlClient, {
        buyer: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        totalCost: tokenPrice * 5n,
      });
      testLog('  ✓ Purchase after deadline succeeded (as expected, state transitions verified)');
    } catch (error) {
      purchaseAfterSucceeded = false;
      console.error('  Unexpected error purchasing after deadline:', error);
    }

    assert.ok(purchaseAfterSucceeded, 'Purchase after deadline should succeed (contract allows buying at any time)');
  });
});
