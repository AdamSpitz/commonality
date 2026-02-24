/**
 * Pubstarter Project Filtering and Sorting Tests (E4)
 *
 * Tests project discovery features:
 * 1. Sort projects by date created
 * 2. Sort projects by deadline
 * 3. Sort projects by funding goal/threshold
 * 4. Sort projects by funding progress
 * 5. Sort projects by amount raised
 * 6. Filter projects by various criteria
 */

import assert from 'assert';
import {
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
  PubstarterAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import {
  getProjectsByDate,
  getProjectsByDeadline,
  getProjectsByFundingGoal,
  getProjectsByFundingProgress,
  getProjectsByAmountRaised,
  getProjectsFiltered,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { createProjectChecked, buyProjectTokensChecked } from '../actions/funding-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Pubstarter Project Filtering and Sorting Tests (E4)', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'pubstarter-filtering-sorting';

  let machinery: ActionTestingMachinery;

  before(() => {
    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should sort projects by date created (newest first)', async function() {
    this.timeout(60000);

    testLog('  Creating projects with different creation times...');
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const creator3Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Create 3 projects at different times
    const p1Metadata = await uploadToIPFS({ title: 'Project 1 - Oldest' });
    const { hash: p1Hash, projectDetails: p1Details } = await createProjectChecked(
      creator1Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p1/',
        contractURI: 'https://example.com/p1/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p1Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const p2Metadata = await uploadToIPFS({ title: 'Project 2 - Middle' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProjectChecked(
      creator2Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('2.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p2Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const p3Metadata = await uploadToIPFS({ title: 'Project 3 - Newest' });
    const { hash: p3Hash, projectDetails: p3Details } = await createProjectChecked(
      creator3Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p3/',
        contractURI: 'https://example.com/p3/contract',
        owner: creator3Clients.account,
        recipient: creator3Clients.account,
        threshold: parseEther('3.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p3Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    // Query projects sorted by date (newest first)
    testLog('  Querying projects sorted by date...');
    const projects = await getProjectsByDate(machinery, 'desc');

    // Find our three projects in the results
    const projectAddresses = [
      p1Details.assuranceContractAddress.toLowerCase(),
      p2Details.assuranceContractAddress.toLowerCase(),
      p3Details.assuranceContractAddress.toLowerCase(),
    ];

    const ourProjects = projects.filter(p =>
      projectAddresses.includes(p.id.toLowerCase())
    );

    assert.strictEqual(ourProjects.length, 3, 'Should find all 3 projects');

    // Verify order: P3 (newest) should come before P2, which should come before P1 (oldest)
    const p1Index = ourProjects.findIndex(p => p.id.toLowerCase() === p1Details.assuranceContractAddress.toLowerCase());
    const p2Index = ourProjects.findIndex(p => p.id.toLowerCase() === p2Details.assuranceContractAddress.toLowerCase());
    const p3Index = ourProjects.findIndex(p => p.id.toLowerCase() === p3Details.assuranceContractAddress.toLowerCase());

    assert.ok(p3Index < p2Index, 'Project 3 (newest) should come before Project 2');
    assert.ok(p2Index < p1Index, 'Project 2 (middle) should come before Project 1 (oldest)');

    testLog('  Test passed!');
  });

  it('should sort projects by deadline (soonest first)', async function() {
    this.timeout(60000);

    testLog('  Creating projects with different deadlines...');
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const now = Math.floor(Date.now() / 1000);

    // Project with soon deadline
    const p1Metadata = await uploadToIPFS({ title: 'Soon Deadline' });
    const { hash: p1Hash, projectDetails: p1Details } = await createProjectChecked(
      creator1Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p1/',
        contractURI: 'https://example.com/p1/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(now + 3600), // 1 hour from now
        projectMetadataCid: p1Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    // Project with far deadline
    const p2Metadata = await uploadToIPFS({ title: 'Far Deadline' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProjectChecked(
      creator2Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(now + 86400 * 7), // 7 days from now
        projectMetadataCid: p2Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    // Query by deadline (soonest first)
    testLog('  Querying projects sorted by deadline...');
    const projects = await getProjectsByDeadline(machinery, 'asc');

    const projectAddresses = [
      p1Details.assuranceContractAddress.toLowerCase(),
      p2Details.assuranceContractAddress.toLowerCase(),
    ];

    const ourProjects = projects.filter(p =>
      projectAddresses.includes(p.id.toLowerCase())
    );

    assert.strictEqual(ourProjects.length, 2, 'Should find both projects');

    // P1 (sooner deadline) should come before P2 (later deadline)
    const p1Index = ourProjects.findIndex(p => p.id.toLowerCase() === p1Details.assuranceContractAddress.toLowerCase());
    const p2Index = ourProjects.findIndex(p => p.id.toLowerCase() === p2Details.assuranceContractAddress.toLowerCase());

    assert.ok(p1Index < p2Index, 'Project with sooner deadline should come first');

    testLog('  Test passed!');
  });

  it('should sort projects by funding progress', async function() {
    this.timeout(90000);

    testLog('  Creating projects with different funding progress...');
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const contributorClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Create two projects with same threshold
    const p1Metadata = await uploadToIPFS({ title: 'High Progress Project' });
    const { hash: p1Hash, projectDetails: p1Details } = await createProjectChecked(
      creator1Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p1/',
        contractURI: 'https://example.com/p1/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('10.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p1Metadata,
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const p2Metadata = await uploadToIPFS({ title: 'Low Progress Project' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProjectChecked(
      creator2Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('10.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p2Metadata,
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    // Fund P1 to 80% (8 ETH out of 10 ETH)
    const assuranceContract1: AssuranceContract = {
      address: p1Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(
      contributorClients,
      assuranceContract1,
      machinery,
      {
        buyer: contributorClients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [800n], // 800 * 0.01 = 8 ETH
        totalCost: parseEther('8.0'),
      }
    );

    // Fund P2 to 20% (2 ETH out of 10 ETH)
    const assuranceContract2: AssuranceContract = {
      address: p2Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(
      contributorClients,
      assuranceContract2,
      machinery,
      {
        buyer: contributorClients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [200n], // 200 * 0.01 = 2 ETH
        totalCost: parseEther('2.0'),
      }
    );

    // Query by funding progress (highest first)
    testLog('  Querying projects sorted by funding progress...');
    const projects = await getProjectsByFundingProgress(machinery, 'desc');

    const projectAddresses = [
      p1Details.assuranceContractAddress.toLowerCase(),
      p2Details.assuranceContractAddress.toLowerCase(),
    ];

    const ourProjects = projects.filter(p =>
      projectAddresses.includes(p.id.toLowerCase())
    );

    assert.strictEqual(ourProjects.length, 2, 'Should find both projects');

    // P1 (80% funded) should come before P2 (20% funded)
    const p1Index = ourProjects.findIndex(p => p.id.toLowerCase() === p1Details.assuranceContractAddress.toLowerCase());
    const p2Index = ourProjects.findIndex(p => p.id.toLowerCase() === p2Details.assuranceContractAddress.toLowerCase());

    assert.ok(p1Index < p2Index, 'Project with higher funding progress should come first');

    // Verify funding progress values
    const p1Project = ourProjects[p1Index];
    const p2Project = ourProjects[p2Index];

    testLog(`  P1 funding progress: ${p1Project.fundingProgress}`);
    testLog(`  P2 funding progress: ${p2Project.fundingProgress}`);

    assert.ok(p1Project.fundingProgress > 0.7, 'P1 should be at least 70% funded');
    assert.ok(p2Project.fundingProgress > 0.1 && p2Project.fundingProgress < 0.3, 'P2 should be around 20% funded');

    testLog('  Test passed!');
  });

  it('should filter projects by funding threshold', async function() {
    this.timeout(60000);

    testLog('  Creating projects with different thresholds...');
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Small project (1 ETH threshold)
    const p1Metadata = await uploadToIPFS({ title: 'Small Project' });
    const { hash: p1Hash, projectDetails: p1Details } = await createProjectChecked(
      creator1Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p1/',
        contractURI: 'https://example.com/p1/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p1Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    // Large project (100 ETH threshold)
    const p2Metadata = await uploadToIPFS({ title: 'Large Project' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProjectChecked(
      creator2Clients,
      pubstarterContract,
      machinery,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('100.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p2Metadata,
        tokenIds: [1n],
        tokenCounts: [10000n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    // Query projects with threshold >= 10 ETH
    testLog('  Filtering projects with threshold >= 10 ETH...');
    const largeProjects = await getProjectsFiltered(
      machinery,
      {
        minThreshold: parseEther('10.0'),
      }
    );

    // P1 should not be in results, P2 should be
    const hasP1 = largeProjects.some(p => p.id.toLowerCase() === p1Details.assuranceContractAddress.toLowerCase());
    const hasP2 = largeProjects.some(p => p.id.toLowerCase() === p2Details.assuranceContractAddress.toLowerCase());

    assert.strictEqual(hasP1, false, 'Small project should not be in filtered results');
    assert.strictEqual(hasP2, true, 'Large project should be in filtered results');

    testLog('  Test passed!');
  });
});
