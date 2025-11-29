/**
 * Pubstarter Edge Cases Integration Test
 *
 * Tests edge cases for funding/pubstarter subsystem:
 * - Insufficient funds for project purchase
 * - Refund after project failure (deadline passed without meeting threshold)
 * - Project deadline edge cases
 * - Withdrawal permission checks
 */

import assert from 'assert';
import { parseEther } from 'viem';
import {
  createTestClients,
  createProject,
  buyProjectTokens,
  refundProjectTokens,
  withdrawProjectFunds,
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getProject,
  waitForSync,
} from './queries/index.js';
import { PubstarterAbi, AssuranceContractAbi } from './test-abis.js';
import { TEST_PRIVATE_KEYS } from './test-constants.js';

describe('Pubstarter Edge Cases', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  const ALICE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const BOB_KEY = TEST_PRIVATE_KEYS.ACCOUNT_1;

  it('should fail when trying to buy tokens with insufficient funds', async () => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const bobClients = createTestClients(BOB_KEY, RPC_URL);

    console.log(`  Alice: ${aliceClients.account}`);
    console.log(`  Bob: ${bobClients.account}`);

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

    console.log('  Creating project...');
    const { projectDetails } = await createProject(aliceClients, pubstarterContract, {
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

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob tries to buy 10 tokens but only sends enough for 5
    console.log('  Bob attempting to buy tokens with insufficient funds...');

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
      console.log('  ✓ Purchase failed as expected due to insufficient funds');
    }

    assert.ok(purchaseFailed, 'Purchase with insufficient funds should fail');
  });

  it('should allow refund after project fails to meet threshold by deadline', async () => {
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const bobClients = createTestClients(BOB_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    console.log(`  Alice: ${aliceClients.account}`);
    console.log(`  Bob: ${bobClients.account}`);

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

    console.log('  Creating project with short deadline...');
    const { projectDetails } = await createProject(aliceClients, pubstarterContract, {
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

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob buys a small amount (not enough to meet threshold)
    console.log('  Bob purchasing tokens...');
    const purchaseTx = await buyProjectTokens(bobClients, assuranceContract, {
      buyer: bobClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [0n],
      tokenCounts: [5n],
      totalCost: tokenPrice * 5n,
    });

    const receipt = await bobClients.publicClient.getTransactionReceipt({ hash: purchaseTx });
    await waitForSync(graphqlClient, receipt.blockNumber);

    // Advance blockchain time past the deadline
    console.log('  Advancing blockchain time past deadline...');
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
    console.log('  Bob approving assurance contract to transfer tokens...');
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
    console.log('  Tokens approved for transfer');

    // Bob should be able to refund his tokens now
    console.log('  Bob attempting refund after project failure...');

    let refundSucceeded = true;
    let refundError: any = null;
    try {
      const refundTx = await refundProjectTokens(bobClients, assuranceContract, {
        holder: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
      });

      console.log(`  ✓ Refund succeeded: ${refundTx}`);
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

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const bobClients = createTestClients(BOB_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    console.log(`  Alice: ${aliceClients.account}`);
    console.log(`  Bob: ${bobClients.account}`);

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

    console.log('  Creating project with Alice as recipient...');
    const { projectDetails } = await createProject(aliceClients, pubstarterContract, {
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

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob buys enough tokens to meet the threshold
    console.log('  Bob purchasing tokens to meet threshold...');
    const purchaseTx = await buyProjectTokens(bobClients, assuranceContract, {
      buyer: bobClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [0n],
      tokenCounts: [15n],
      totalCost: tokenPrice * 15n,
    });

    const receipt = await bobClients.publicClient.getTransactionReceipt({ hash: purchaseTx });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify threshold was met
    const project = await getProject(graphqlClient, projectDetails.assuranceContractAddress);
    console.log(`  Project received: ${project?.totalReceived} (threshold: ${project?.threshold})`);

    // Bob (not the recipient) tries to withdraw the funds
    console.log('  Bob attempting to withdraw funds (should fail)...');

    let withdrawalFailed = false;
    try {
      await withdrawProjectFunds(bobClients, assuranceContract);
    } catch (error) {
      withdrawalFailed = true;
      console.log('  ✓ Withdrawal failed as expected');
    }

    assert.ok(withdrawalFailed, 'Non-recipient withdrawal should fail');

    // Alice (the recipient) should be able to withdraw
    console.log('  Alice withdrawing funds (should succeed)...');

    let aliceWithdrawalSucceeded = true;
    try {
      const withdrawTx = await withdrawProjectFunds(aliceClients, assuranceContract);
      console.log(`  ✓ Alice withdrawal succeeded: ${withdrawTx}`);
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

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const bobClients = createTestClients(BOB_KEY, RPC_URL);

    console.log(`  Alice: ${aliceClients.account}`);
    console.log(`  Bob: ${bobClients.account}`);

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

    console.log('  Creating project...');
    const { projectDetails } = await createProject(aliceClients, pubstarterContract, {
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

    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Bob should be able to buy before deadline
    console.log('  Bob purchasing before deadline...');
    let purchaseBeforeSucceeded = true;
    try {
      await buyProjectTokens(bobClients, assuranceContract, {
        buyer: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        totalCost: tokenPrice * 5n,
      });
      console.log('  ✓ Purchase before deadline succeeded');
    } catch (error) {
      purchaseBeforeSucceeded = false;
      console.error('  Unexpected error purchasing before deadline:', error);
    }

    assert.ok(purchaseBeforeSucceeded, 'Purchase before deadline should succeed');

    // Advance blockchain time past the deadline
    console.log('  Advancing blockchain time past deadline...');
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
    console.log('  Bob purchasing after deadline (should still succeed per contract design)...');
    let purchaseAfterSucceeded = true;
    try {
      await buyProjectTokens(bobClients, assuranceContract, {
        buyer: bobClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        totalCost: tokenPrice * 5n,
      });
      console.log('  ✓ Purchase after deadline succeeded (as expected)');
    } catch (error) {
      purchaseAfterSucceeded = false;
      console.error('  Unexpected error purchasing after deadline:', error);
    }

    assert.ok(purchaseAfterSucceeded, 'Purchase after deadline should succeed (contract allows buying at any time)');
  });
});
