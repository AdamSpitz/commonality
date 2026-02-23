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
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
  type AlignmentAttestationsContract,
  PubstarterAbi,
  AssuranceContractAbi,
  AlignmentAttestationsAbi,
  PROJECT_ALIGNMENT_TOPIC,
  type IpfsCidV1,
} from '@commonality/sdk';
import {
  getTopContributorsForCause,
  getUserContributionRankForCause,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { buyProjectTokensChecked, createProjectChecked } from '../actions/funding-actions-checked.js';
import { attestAlignmentChecked } from '../actions/alignment-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Funding Portal Contributor Leaderboards Tests (E3)', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
  const ALIGNMENT_ATTESTATIONS_ADDRESS = process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'fundingportal-leaderboards';

  let machinery: ActionTestingMachinery;

  before(() => {
    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should rank top contributors for a cause across multiple projects', async function() {
    this.timeout(90000);

    testLog('  Setting up leaderboard test scenario...');
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const contributor1Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const contributor2Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const contributor3Clients = createIsolatedTestClients(SUITE_NAME, 5, RPC_URL);

    testLog(`  Contributor 1: ${contributor1Clients.account}`);
    testLog(`  Contributor 2: ${contributor2Clients.account}`);
    testLog(`  Contributor 3: ${contributor3Clients.account}`);

    // Create statement for the cause
    const causeContent = { text: 'Support renewable energy projects' };
    const causeCid = await uploadToIPFS(causeContent);

    testLog(`  Cause: ${causeCid}`);

    // Create two projects aligned with the cause
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    testLog('  Creating projects...');
    const p1Metadata = await uploadToIPFS({ title: 'Solar Panel Initiative' });
    const { projectDetails: p1Details } = await createProjectChecked(
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
    testLog('  ✓ Project creation properties verified');

    const p2Metadata = await uploadToIPFS({ title: 'Wind Farm Project' });
    const { projectDetails: p2Details } = await createProjectChecked(
      creator2Clients,
      pubstarterContract,
      machinery,
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
    testLog('  ✓ Project creation properties verified');

    // Align both projects with the cause
    const alignmentContract: AlignmentAttestationsContract = {
      address: ALIGNMENT_ATTESTATIONS_ADDRESS,
      abi: AlignmentAttestationsAbi,
    };

    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      p1Details.assuranceContractAddress,
      causeCid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );
    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      p2Details.assuranceContractAddress,
      causeCid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );

    // Contributors make contributions
    testLog('  Making contributions...');
    const assuranceContract1: AssuranceContract = {
      address: p1Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };
    const assuranceContract2: AssuranceContract = {
      address: p2Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Contributor 1: 2 ETH to P1, 1 ETH to P2 = 3 ETH total
    await buyProjectTokensChecked(
      contributor1Clients,
      assuranceContract1,
      machinery,
      {
        buyer: contributor1Clients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [200n], // 200 * 0.01 = 2 ETH
        totalCost: parseEther('2.0'),
      }
    );
    await buyProjectTokensChecked(
      contributor1Clients,
      assuranceContract2,
      machinery,
      {
        buyer: contributor1Clients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [100n], // 100 * 0.01 = 1 ETH
        totalCost: parseEther('1.0'),
      }
    );

    // Contributor 2: 1.5 ETH to P1 = 1.5 ETH total
    await buyProjectTokensChecked(
      contributor2Clients,
      assuranceContract1,
      machinery,
      {
        buyer: contributor2Clients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [150n], // 150 * 0.01 = 1.5 ETH
        totalCost: parseEther('1.5'),
      }
    );

    // Contributor 3: 0.5 ETH to P2 = 0.5 ETH total
    await buyProjectTokensChecked(
      contributor3Clients,
      assuranceContract2,
      machinery,
      {
        buyer: contributor3Clients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [50n], // 50 * 0.01 = 0.5 ETH
        totalCost: parseEther('0.5'),
      }
    );

    // Query top contributors
    testLog('  Querying top contributors...');
    const topContributors = await getTopContributorsForCause(
      machinery,
      causeCid,
      10, // Get top 10
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    testLog(`  Found ${topContributors.length} contributors`);
    assert.strictEqual(topContributors.length, 3, 'Should have 3 contributors');

    // Verify ranking (by net contribution)
    const rank1 = topContributors[0];
    const rank2 = topContributors[1];
    const rank3 = topContributors[2];

    testLog(`  Rank 1: ${rank1.participant} - ${rank1.netContribution} wei`);
    testLog(`  Rank 2: ${rank2.participant} - ${rank2.netContribution} wei`);
    testLog(`  Rank 3: ${rank3.participant} - ${rank3.netContribution} wei`);

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

    testLog('  Test passed!');
  });

  it('should get a user\'s contribution rank for a cause', async function() {
    this.timeout(90000);

    testLog('  Setting up rank query test...');
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const contributor1Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const contributor2Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const contributor3Clients = createIsolatedTestClients(SUITE_NAME, 6, RPC_URL);

    // Create cause
    const causeContent = { text: 'Support education initiatives' };
    const causeCid = await uploadToIPFS(causeContent);

    // Create project
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    testLog('  Creating project...');
    const pMetadata = await uploadToIPFS({ title: 'Education Fund' });
    const { projectDetails: pDetails } = await createProjectChecked(
      creator1Clients,
      pubstarterContract,
      machinery,
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
    testLog('  ✓ Project creation properties verified');

    // Align project
    const alignmentContract: AlignmentAttestationsContract = {
      address: ALIGNMENT_ATTESTATIONS_ADDRESS,
      abi: AlignmentAttestationsAbi,
    };

    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      pDetails.assuranceContractAddress,
      causeCid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );

    // Make contributions
    testLog('  Making contributions...');
    const assuranceContract: AssuranceContract = {
      address: pDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(contributor1Clients, assuranceContract, machinery, {
      buyer: contributor1Clients.account,
      tokenAddress: pDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [500n],
      totalCost: parseEther('5.0'),
    });

    await buyProjectTokensChecked(contributor2Clients, assuranceContract, machinery, {
      buyer: contributor2Clients.account,
      tokenAddress: pDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [200n],
      totalCost: parseEther('2.0'),
    });

    await buyProjectTokensChecked(contributor3Clients, assuranceContract, machinery, {
      buyer: contributor3Clients.account,
      tokenAddress: pDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [100n],
      totalCost: parseEther('1.0'),
    });

    // Query rank for contributor 2
    testLog('  Querying rank for Contributor 2...');
    const rankResult = await getUserContributionRankForCause(
      machinery,
      causeCid,
      contributor2Clients.account,
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    assert.ok(rankResult, 'Rank result should exist');
    assert.strictEqual(rankResult!.rank, 2, 'Contributor 2 should be rank 2');
    assert.strictEqual(rankResult!.totalContributors, 3, 'Should have 3 total contributors');
    assert.ok(rankResult!.stats, 'Should have stats');
    assert.strictEqual(rankResult!.stats!.netContribution, parseEther('2.0'), 'Net contribution should be 2 ETH');

    testLog(`  Rank: ${rankResult!.rank} of ${rankResult!.totalContributors}`);
    testLog(`  Net contribution: ${rankResult!.stats!.netContribution}`);

    // Query rank for a non-contributor
    testLog('  Querying rank for non-contributor...');
    const nonContributorRank = await getUserContributionRankForCause(
      machinery,
      causeCid,
      attesterClients.account, // Attester didn't contribute
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    assert.ok(nonContributorRank, 'Non-contributor result should exist');
    assert.strictEqual(nonContributorRank!.rank, 0, 'Non-contributor should have rank 0');
    assert.strictEqual(nonContributorRank!.stats, null, 'Non-contributor should have null stats');

    testLog('  Test passed!');
  });
});
