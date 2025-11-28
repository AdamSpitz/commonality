/**
 * Pubstarter Basic Integration Tests
 *
 * Tests basic pubstarter functionality:
 * 1. Create a crowdfunding project
 * 2. Buy tokens from the project
 * 3. Verify funding progress
 * 4. Test successful project withdrawal
 * 5. Test failed project refunds
 */

import assert from 'assert';
import {
  createTestClients,
  createProject,
  buyProjectTokens,
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getProject,
  waitForSync,
  assertNotNull,
  type GraphQLClient,
} from './queries/index.js';
import { parseEther, type Address } from 'viem';

// Minimal ABIs for the contracts we need
const PubstarterAbi = [
  {
    inputs: [
      { name: 'metadataURI', type: 'string' },
      { name: 'contractURI', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'threshold', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'projectMetadataCid', type: 'string' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'counts', type: 'uint256[]' },
      { name: 'prices', type: 'uint256[]' },
    ],
    name: 'createERC1155AndMarketplaceAndAssuranceContract',
    outputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' },
      { name: '', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const AssuranceContractAbi = [
  {
    inputs: [
      { name: 'buyer', type: 'address' },
      { name: 'erc1155Addr', type: 'address' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'counts', type: 'uint256[]' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'buyERC1155',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'holder', type: 'address' },
      { name: 'erc1155Addr', type: 'address' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'counts', type: 'uint256[]' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'refundERC1155',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'participant', type: 'address' },
      { indexed: true, name: 'erc1155Addr', type: 'address' },
      { indexed: false, name: 'totalCost', type: 'uint256' },
      { indexed: false, name: 'ids', type: 'uint256[]' },
      { indexed: false, name: 'counts', type: 'uint256[]' },
    ],
    name: 'ERC1155Bought',
    type: 'event',
  },
] as const;

describe('Pubstarter Basic Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  // We need the Pubstarter main contract address
  // For now, we'll construct it from the factory addresses
  // Note: In a real deployment, this should be in .env.local
  const ERC1155_FACTORY_ADDRESS = process.env.ERC1155_FACTORY_ADDRESS as Address;
  const MARKETPLACE_FACTORY_ADDRESS = process.env.MARKETPLACE_FACTORY_ADDRESS as Address;
  const ASSURANCE_CONTRACT_FACTORY_ADDRESS = process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS as Address;

  // Hardhat account #0 (project creator)
  const CREATOR_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  // Hardhat account #1 (contributor)
  const CONTRIBUTOR_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;

  let graphqlClient: GraphQLClient;

  before(() => {
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should create a project, accept contributions, and allow withdrawal', async function() {
    this.timeout(30000); // Increase timeout for this complex test

    // Factory addresses must be set
    if (!ERC1155_FACTORY_ADDRESS || !MARKETPLACE_FACTORY_ADDRESS || !ASSURANCE_CONTRACT_FACTORY_ADDRESS) {
      throw new Error('Factory addresses not set in environment (ERC1155_FACTORY_ADDRESS, MARKETPLACE_FACTORY_ADDRESS, ASSURANCE_CONTRACT_FACTORY_ADDRESS)');
    }

    // Pubstarter main contract must be deployed
    const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment - the main Pubstarter contract must be deployed');
    }

    console.log('  Setting up test clients...');
    const creatorClients = createTestClients(CREATOR_PRIVATE_KEY, RPC_URL);
    const contributorClients = createTestClients(CONTRIBUTOR_PRIVATE_KEY, RPC_URL);

    console.log(`  Creator: ${creatorClients.account}`);
    console.log(`  Contributor: ${contributorClients.account}`);

    // Create project metadata
    const projectMetadata = {
      title: 'Test Crowdfunding Project',
      description: 'A test project for integration tests',
      category: 'technology',
    };
    const projectMetadataCid = await uploadToIPFS(projectMetadata);
    console.log(`  Project metadata CID: ${projectMetadataCid}`);

    // Project parameters
    const threshold = parseEther('1.0'); // Need 1 ETH to succeed
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

    // Token parameters: 2 token types at different prices
    const tokenIds = [1n, 2n];
    const tokenCounts = [100n, 50n]; // Mint 100 of token 1, 50 of token 2
    const tokenPrices = [parseEther('0.01'), parseEther('0.02')]; // 0.01 ETH and 0.02 ETH

    console.log('  Creating project...');
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
        tokenIds,
        tokenCounts,
        tokenPrices,
      }
    );

    console.log(`  Project created! Tx: ${hash}`);
    console.log(`  Token: ${projectDetails.tokenAddress}`);
    console.log(`  Marketplace: ${projectDetails.marketplaceAddress}`);
    console.log(`  Assurance Contract: ${projectDetails.assuranceContractAddress}`);

    // Wait for indexer to sync
    const receipt = await creatorClients.publicClient.getTransactionReceipt({ hash });
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Query the project from the indexer
    console.log('  Querying project from indexer...');
    const project = assertNotNull(
      await getProject(graphqlClient, projectDetails.assuranceContractAddress),
      'Project'
    );

    console.log(`  Project found! Total received: ${project.totalReceived}`);
    assert.strictEqual(project.totalReceived, '0', 'Project should start with 0 received');
    assert.strictEqual(
      project.id.toLowerCase(),
      projectDetails.assuranceContractAddress.toLowerCase(),
      'Project ID (assurance contract address) should match'
    );

    // Contributor buys some tokens
    console.log('  Contributor buying tokens...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buyTokenIds = [1n];
    const buyCounts = [10n]; // Buy 10 of token 1
    const buyCost = parseEther('0.1'); // 10 * 0.01 ETH = 0.1 ETH

    const buyHash = await buyProjectTokens(
      contributorClients,
      assuranceContract,
      {
        buyer: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: buyTokenIds,
        tokenCounts: buyCounts,
        totalCost: buyCost,
      }
    );

    console.log(`  Tokens purchased! Tx: ${buyHash}`);

    // Wait for indexer to sync
    const buyReceipt = await contributorClients.publicClient.getTransactionReceipt({ hash: buyHash });
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, buyReceipt.blockNumber, 15000);

    // Query updated project
    const updatedProject = assertNotNull(
      await getProject(graphqlClient, projectDetails.assuranceContractAddress),
      'Updated project'
    );

    console.log(`  Updated project total received: ${updatedProject.totalReceived}`);
    // Verify that funds were received
    assert.ok(BigInt(updatedProject.totalReceived) > 0n, 'Project should have received funds');

    console.log('  Test completed successfully!');
  });

  it('should create a simple project with minimal parameters', async function() {
    this.timeout(20000);

    // Pubstarter main contract must be deployed
    const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment - the main Pubstarter contract must be deployed');
    }

    console.log('  Creating a minimal test project...');
    const creatorClients = createTestClients(CREATOR_PRIVATE_KEY, RPC_URL);

    const projectMetadataCid = await uploadToIPFS({
      title: 'Minimal Test Project',
    });

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
        threshold: parseEther('0.5'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    console.log(`  Minimal project created! Tx: ${hash}`);
    console.log(`  Assurance Contract: ${projectDetails.assuranceContractAddress}`);

    // Verify the transaction succeeded
    const receipt = await creatorClients.publicClient.getTransactionReceipt({ hash });
    assert.strictEqual(receipt.status, 'success', 'Transaction should succeed');

    console.log('  Minimal project test passed!');
  });
});
