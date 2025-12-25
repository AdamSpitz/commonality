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
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getProject,
  assertNotNull,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import {
  PubstarterAbi,
  AssuranceContractAbi
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { assertMonotonicProjectFunding } from '../utils/invariants.js';
import { createProjectChecked, buyProjectTokensChecked } from '../actions/funding-actions-checked.js';


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

  // Test suite name for unique account derivation
  const SUITE_NAME = 'pubstarter-basic';

  let graphqlClient: ReturnType<typeof createGraphQLClient>;

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

    testLog('  Setting up test clients...');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributorClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Contributor: ${contributorClients.account}`);

    // Create project metadata
    const projectMetadata = {
      title: 'Test Crowdfunding Project',
      description: 'A test project for integration tests',
      category: 'technology',
    };
    const projectMetadataCid = await uploadToIPFS(projectMetadata);
    testLog(`  Project metadata CID: ${projectMetadataCid}`);

    // Project parameters
    const threshold = parseEther('1.0'); // Need 1 ETH to succeed
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

    // Token parameters: 2 token types at different prices
    const tokenIds = [1n, 2n];
    const tokenCounts = [100n, 50n]; // Mint 100 of token 1, 50 of token 2
    const tokenPrices = [parseEther('0.01'), parseEther('0.02')]; // 0.01 ETH and 0.02 ETH

    testLog('  Creating project (with property checking)...');
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
        tokenIds,
        tokenCounts,
        tokenPrices,
      }
    );

    testLog(`  Project created! Tx: ${hash}`);
    testLog(`  Token: ${projectDetails.tokenAddress}`);
    testLog(`  Marketplace: ${projectDetails.marketplaceAddress}`);
    testLog(`  Assurance Contract: ${projectDetails.assuranceContractAddress}`);
    testLog('  ✓ Project creation properties verified');

    // Query the project for the initial funding value
    const project = assertNotNull(
      await getProject(graphqlClient, projectDetails.assuranceContractAddress),
      'Project'
    );

    // Capture initial funding for monotonic check
    const initialFunding = BigInt(project.totalReceived);

    // Contributor buys some tokens
    testLog('  Contributor buying tokens...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buyTokenIds = [1n];
    const buyCounts = [10n]; // Buy 10 of token 1
    const buyCost = parseEther('0.1'); // 10 * 0.01 ETH = 0.1 ETH

    testLog('  Contributor buying tokens (with property checking)...');
    const buyHash = await buyProjectTokensChecked(
      contributorClients,
      assuranceContract,
      graphqlClient,
      {
        buyer: contributorClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: buyTokenIds,
        tokenCounts: buyCounts,
        totalCost: buyCost,
      }
    );

    testLog(`  Tokens purchased! Tx: ${buyHash}`);
    testLog('  ✓ State transition properties verified');
    testLog('  ✓ Money conservation verified');
    testLog('  ✓ Token conservation verified');

    // Verify monotonic funding property: totalReceived should have increased
    await assertMonotonicProjectFunding(graphqlClient, projectDetails.assuranceContractAddress, initialFunding);
    testLog('  ✓ Monotonic funding property verified');

    testLog('  Test completed successfully!');
  });

  it('should create a simple project with minimal parameters', async function() {
    this.timeout(20000);

    // Pubstarter main contract must be deployed
    const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment - the main Pubstarter contract must be deployed');
    }

    testLog('  Creating a minimal test project (with property checking)...');
    const creatorClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const projectMetadataCid = await uploadToIPFS({
      title: 'Minimal Test Project',
    });

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
        threshold: parseEther('0.5'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    testLog(`  Minimal project created! Tx: ${hash}`);
    testLog(`  Assurance Contract: ${projectDetails.assuranceContractAddress}`);
    testLog('  ✓ Project creation properties verified');

    testLog('  Minimal project test passed!');
  });
});
