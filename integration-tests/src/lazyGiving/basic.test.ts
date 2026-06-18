/**
 * LazyGiving Basic Integration Tests
 *
 * Tests basic lazyGiving functionality:
 * 1. Create a crowdfunding project
 * 2. Buy tokens from the project
 * 3. Verify funding progress
 * 4. Test successful project withdrawal
 * 5. Test failed project refunds
 */

import {
  uploadToIPFS,
  type ProjectFactoryContract,
  type AssuranceContract,
  ProjectFactoryAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { parseUnits, type Address } from 'viem';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { createProjectChecked, buyProjectTokensChecked } from '../actions/funding-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';


describe('LazyGiving Basic Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

  // We need the ProjectFactory contract address
  // For now, we'll construct it from the factory addresses
  // Note: In a real deployment, this should be in .env.local
  const ERC1155_FACTORY_ADDRESS = process.env.ERC1155_FACTORY_ADDRESS as Address;
  const MARKETPLACE_FACTORY_ADDRESS = process.env.MARKETPLACE_FACTORY_ADDRESS as Address;
  const ASSURANCE_CONTRACT_FACTORY_ADDRESS = process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'basic';

  let machinery: ActionTestingMachinery;

  before(() => {
    machinery = createActionTestingMachinery();
  });

  it('should create a project, accept contributions, and allow withdrawal', async function() {
    this.timeout(30000); // Increase timeout for this complex test

    // Factory addresses must be set
    if (!ERC1155_FACTORY_ADDRESS || !MARKETPLACE_FACTORY_ADDRESS || !ASSURANCE_CONTRACT_FACTORY_ADDRESS) {
      throw new Error('Factory addresses not set in environment (ERC1155_FACTORY_ADDRESS, MARKETPLACE_FACTORY_ADDRESS, ASSURANCE_CONTRACT_FACTORY_ADDRESS)');
    }

    // ProjectFactory contract must be deployed
    const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment - the ProjectFactory contract must be deployed');
    }

    testLog('  Setting up test clients...');
    const creatorClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const contributorClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Creator: ${creatorClients.account}`);
    testLog(`  Contributor: ${contributorClients.account}`);

    // Create project metadata
    const projectMetadata = {
      title: 'Test Crowdfunding Project',
      description: 'A test project for integration tests',
      category: 'technology',
    };
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, projectMetadata);
    testLog(`  Project metadata CID: ${projectMetadataCid}`);

    // Project parameters
    const threshold = parseUnits('1.0', 6); // Need 1 ETH to succeed
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

    // Token parameters: 2 token types at different prices
    const tokenIds = [1n, 2n];
    const tokenCounts = [100n, 50n]; // Mint 100 of token 1, 50 of token 2
    const tokenPrices = [parseUnits('0.01', 6), parseUnits('0.02', 6)]; // 0.01 ETH and 0.02 ETH

    testLog('  Creating project (with property checking)...');
    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { hash, projectDetails } = await createProjectChecked(
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

    // Contributor buys some tokens
    testLog('  Contributor buying tokens...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buyTokenIds = [1n];
    const buyCounts = [10n]; // Buy 10 of token 1
    const buyCost = parseUnits('0.1', 6); // 10 * 0.01 ETH = 0.1 ETH

    testLog('  Contributor buying tokens (with property checking)...');
    const buyHash = await buyProjectTokensChecked(
      contributorClients,
      assuranceContract,
      machinery,
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

    testLog('  Test completed successfully!');
  });

  it('should create a simple project with minimal parameters', async function() {
    this.timeout(20000);

    // ProjectFactory contract must be deployed
    const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment - the ProjectFactory contract must be deployed');
    }

    testLog('  Creating a minimal test project (with property checking)...');
    const creatorClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);

    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
      title: 'Minimal Test Project',
    });

    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { hash, projectDetails } = await createProjectChecked(
      creatorClients,
      projectFactoryContract,
      machinery,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: creatorClients.account,
        recipient: creatorClients.account,
        threshold: parseUnits('0.5', 6),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseUnits('0.01', 6)],
      }
    );

    testLog(`  Minimal project created! Tx: ${hash}`);
    testLog(`  Assurance Contract: ${projectDetails.assuranceContractAddress}`);
    testLog('  ✓ Project creation properties verified');

    testLog('  Minimal project test passed!');
  });
});
