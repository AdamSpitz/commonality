/**
 * Funding Portal Contributor Leaderboards Integration Tests (E3)
 *
 * Tests social recognition queries:
 * 1. Top contributors for a specific cause (across aligned projects)
 * 2. User's contribution rank for a cause
 * 3. Contributor statistics aggregation across multiple projects
 */

import assert from 'assert';
import {
  createTestClients,
  uploadToIPFS,
  attestImplication,
  createProject,
  buyProjectTokens,
  attestProjectAlignment,
  type ImplicationsContract,
  type PubstarterContract,
  type AssuranceContract,
  type ProjectAlignmentContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  waitForSync,
  getTopContributorsForCause,
  getUserContributionRankForCause,
  type GraphQLClient,
} from './queries/index.js';
import { parseEther, type Address, keccak256, toBytes } from 'viem';
import {
  ImplicationsAbi,
  PubstarterAbi,
  AssuranceContractAbi,
  ProjectAlignmentAbi,
} from './test-abis.js';

describe('Funding Portal Contributor Leaderboards Tests (E3)', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  const IMPLICATIONS_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as Address;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
  const PROJECT_ALIGNMENT_ADDRESS = process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS as Address;

  // Test accounts - using different accounts for different roles
  const ATTESTER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  const CREATOR1_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
  const CREATOR2_PRIVATE_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;
  const CONTRIBUTOR1_PRIVATE_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const;
  const CONTRIBUTOR2_PRIVATE_KEY = '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as const;
  const CONTRIBUTOR3_PRIVATE_KEY = '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' as const;

  let graphqlClient: GraphQLClient;

  before(() => {
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should rank top contributors for a cause across multiple projects', async function() {
    this.timeout(90000);

    console.log('  Setting up leaderboard test scenario...');
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);
    const creator1Clients = createTestClients(CREATOR1_PRIVATE_KEY, RPC_URL);
    const creator2Clients = createTestClients(CREATOR2_PRIVATE_KEY, RPC_URL);
    const contributor1Clients = createTestClients(CONTRIBUTOR1_PRIVATE_KEY, RPC_URL);
    const contributor2Clients = createTestClients(CONTRIBUTOR2_PRIVATE_KEY, RPC_URL);
    const contributor3Clients = createTestClients(CONTRIBUTOR3_PRIVATE_KEY, RPC_URL);

    console.log(`  Contributor 1: ${contributor1Clients.account}`);
    console.log(`  Contributor 2: ${contributor2Clients.account}`);
    console.log(`  Contributor 3: ${contributor3Clients.account}`);

    // Create statement for the cause
    const causeContent = { text: 'Support renewable energy projects' };
    const causeCid = await uploadToIPFS(causeContent);
    const causeId = keccak256(toBytes(causeCid));

    console.log(`  Cause: ${causeId}`);

    // Create two projects aligned with the cause
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    console.log('  Creating projects...');
    const p1Metadata = await uploadToIPFS({ title: 'Solar Panel Initiative' });
    const { hash: p1Hash, projectDetails: p1Details } = await createProject(
      creator1Clients,
      pubstarterContract,
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

    const p2Metadata = await uploadToIPFS({ title: 'Wind Farm Project' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProject(
      creator2Clients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('20.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p2Metadata,
        tokenIds: [1n],
        tokenCounts: [2000n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const p2Receipt = await creator2Clients.publicClient.getTransactionReceipt({ hash: p2Hash });
    await waitForSync(graphqlClient, p2Receipt.blockNumber, 15000);

    // Align both projects with the cause
    const alignmentContract: ProjectAlignmentContract = {
      address: PROJECT_ALIGNMENT_ADDRESS,
      abi: ProjectAlignmentAbi,
    };

    await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      p1Details.assuranceContractAddress,
      causeCid
    );
    const align2Hash = await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      p2Details.assuranceContractAddress,
      causeCid
    );

    const align2Receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: align2Hash });
    await waitForSync(graphqlClient, align2Receipt.blockNumber, 15000);

    // Contributors make contributions
    console.log('  Making contributions...');
    const assuranceContract1: AssuranceContract = {
      address: p1Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };
    const assuranceContract2: AssuranceContract = {
      address: p2Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Contributor 1: 2 ETH to P1, 1 ETH to P2 = 3 ETH total
    await buyProjectTokens(
      contributor1Clients,
      assuranceContract1,
      {
        buyer: contributor1Clients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [200n], // 200 * 0.01 = 2 ETH
        totalCost: parseEther('2.0'),
      }
    );
    await buyProjectTokens(
      contributor1Clients,
      assuranceContract2,
      {
        buyer: contributor1Clients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [100n], // 100 * 0.01 = 1 ETH
        totalCost: parseEther('1.0'),
      }
    );

    // Contributor 2: 1.5 ETH to P1 = 1.5 ETH total
    await buyProjectTokens(
      contributor2Clients,
      assuranceContract1,
      {
        buyer: contributor2Clients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [150n], // 150 * 0.01 = 1.5 ETH
        totalCost: parseEther('1.5'),
      }
    );

    // Contributor 3: 0.5 ETH to P2 = 0.5 ETH total
    const buy3Hash = await buyProjectTokens(
      contributor3Clients,
      assuranceContract2,
      {
        buyer: contributor3Clients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [50n], // 50 * 0.01 = 0.5 ETH
        totalCost: parseEther('0.5'),
      }
    );

    console.log('  Waiting for indexer...');
    const buy3Receipt = await contributor3Clients.publicClient.getTransactionReceipt({ hash: buy3Hash });
    await waitForSync(graphqlClient, buy3Receipt.blockNumber, 15000);

    // Query top contributors
    console.log('  Querying top contributors...');
    const topContributors = await getTopContributorsForCause(
      graphqlClient,
      causeId,
      10, // Get top 10
      attesterClients.account
    );

    console.log(`  Found ${topContributors.length} contributors`);
    assert.strictEqual(topContributors.length, 3, 'Should have 3 contributors');

    // Verify ranking (by net contribution)
    const rank1 = topContributors[0];
    const rank2 = topContributors[1];
    const rank3 = topContributors[2];

    console.log(`  Rank 1: ${rank1.participant} - ${rank1.netContribution} wei`);
    console.log(`  Rank 2: ${rank2.participant} - ${rank2.netContribution} wei`);
    console.log(`  Rank 3: ${rank3.participant} - ${rank3.netContribution} wei`);

    // Rank 1 should be contributor 1 (3 ETH)
    assert.strictEqual(
      rank1.participant.toLowerCase(),
      contributor1Clients.account.toLowerCase(),
      'Rank 1 should be Contributor 1'
    );
    assert.strictEqual(rank1.netContribution, parseEther('3.0'), 'Rank 1 should have 3 ETH');
    assert.strictEqual(rank1.projectsContributedTo, 2, 'Rank 1 should have contributed to 2 projects');
    assert.strictEqual(rank1.contributionCount, 2, 'Rank 1 should have 2 contributions');

    // Rank 2 should be contributor 2 (1.5 ETH)
    assert.strictEqual(
      rank2.participant.toLowerCase(),
      contributor2Clients.account.toLowerCase(),
      'Rank 2 should be Contributor 2'
    );
    assert.strictEqual(rank2.netContribution, parseEther('1.5'), 'Rank 2 should have 1.5 ETH');
    assert.strictEqual(rank2.projectsContributedTo, 1, 'Rank 2 should have contributed to 1 project');

    // Rank 3 should be contributor 3 (0.5 ETH)
    assert.strictEqual(
      rank3.participant.toLowerCase(),
      contributor3Clients.account.toLowerCase(),
      'Rank 3 should be Contributor 3'
    );
    assert.strictEqual(rank3.netContribution, parseEther('0.5'), 'Rank 3 should have 0.5 ETH');

    console.log('  Test passed!');
  });

  it('should get a user\'s contribution rank for a cause', async function() {
    this.timeout(90000);

    console.log('  Setting up rank query test...');
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);
    const creator1Clients = createTestClients(CREATOR1_PRIVATE_KEY, RPC_URL);
    const contributor1Clients = createTestClients(CONTRIBUTOR1_PRIVATE_KEY, RPC_URL);
    const contributor2Clients = createTestClients(CONTRIBUTOR2_PRIVATE_KEY, RPC_URL);
    const contributor3Clients = createTestClients(CONTRIBUTOR3_PRIVATE_KEY, RPC_URL);

    // Create cause
    const causeContent = { text: 'Support education initiatives' };
    const causeCid = await uploadToIPFS(causeContent);
    const causeId = keccak256(toBytes(causeCid));

    // Create project
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    console.log('  Creating project...');
    const pMetadata = await uploadToIPFS({ title: 'Education Fund' });
    const { hash: pHash, projectDetails: pDetails } = await createProject(
      creator1Clients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/p/',
        contractURI: 'https://example.com/p/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('5.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: pMetadata,
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const pReceipt = await creator1Clients.publicClient.getTransactionReceipt({ hash: pHash });
    await waitForSync(graphqlClient, pReceipt.blockNumber, 15000);

    // Align project
    const alignmentContract: ProjectAlignmentContract = {
      address: PROJECT_ALIGNMENT_ADDRESS,
      abi: ProjectAlignmentAbi,
    };

    const alignHash = await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      pDetails.assuranceContractAddress,
      causeCid
    );

    const alignReceipt = await attesterClients.publicClient.getTransactionReceipt({ hash: alignHash });
    await waitForSync(graphqlClient, alignReceipt.blockNumber, 15000);

    // Make contributions
    console.log('  Making contributions...');
    const assuranceContract: AssuranceContract = {
      address: pDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokens(contributor1Clients, assuranceContract, {
      buyer: contributor1Clients.account,
      tokenAddress: pDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [500n],
      totalCost: parseEther('5.0'),
    });

    await buyProjectTokens(contributor2Clients, assuranceContract, {
      buyer: contributor2Clients.account,
      tokenAddress: pDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [200n],
      totalCost: parseEther('2.0'),
    });

    const buy3Hash = await buyProjectTokens(contributor3Clients, assuranceContract, {
      buyer: contributor3Clients.account,
      tokenAddress: pDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [100n],
      totalCost: parseEther('1.0'),
    });

    const buy3Receipt = await contributor3Clients.publicClient.getTransactionReceipt({ hash: buy3Hash });
    await waitForSync(graphqlClient, buy3Receipt.blockNumber, 15000);

    // Query rank for contributor 2
    console.log('  Querying rank for Contributor 2...');
    const rankResult = await getUserContributionRankForCause(
      graphqlClient,
      causeId,
      contributor2Clients.account,
      attesterClients.account
    );

    assert.ok(rankResult, 'Rank result should exist');
    assert.strictEqual(rankResult!.rank, 2, 'Contributor 2 should be rank 2');
    assert.strictEqual(rankResult!.totalContributors, 3, 'Should have 3 total contributors');
    assert.ok(rankResult!.stats, 'Should have stats');
    assert.strictEqual(rankResult!.stats!.netContribution, parseEther('2.0'), 'Net contribution should be 2 ETH');

    console.log(`  Rank: ${rankResult!.rank} of ${rankResult!.totalContributors}`);
    console.log(`  Net contribution: ${rankResult!.stats!.netContribution}`);

    // Query rank for a non-contributor
    console.log('  Querying rank for non-contributor...');
    const nonContributorRank = await getUserContributionRankForCause(
      graphqlClient,
      causeId,
      attesterClients.account, // Attester didn't contribute
      attesterClients.account
    );

    assert.ok(nonContributorRank, 'Non-contributor result should exist');
    assert.strictEqual(nonContributorRank!.rank, 0, 'Non-contributor should have rank 0');
    assert.strictEqual(nonContributorRank!.stats, null, 'Non-contributor should have null stats');

    console.log('  Test passed!');
  });
});
