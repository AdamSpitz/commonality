/**
 * Funding Portal Aggregated Metrics Integration Tests (E2)
 *
 * Tests cross-cutting queries for funding portals:
 * 1. Total funding raised for a cause (across all aligned projects)
 * 2. Total available funding from delegatable notes for a cause
 * 3. All projects aligned with a cause (direct + indirect)
 * 4. Top contributors for a cause (leaderboards)
 * 5. User's contribution rank for a cause
 */

import assert from 'assert';
import {
  createTestClients,
  uploadToIPFS,
  believeStatement,
  attestImplication,
  createProject,
  buyProjectTokens,
  attestProjectAlignment,
  depositETH,
  cidToBytes32,
  type BeliefsContract,
  type ImplicationsContract,
  type PubstarterContract,
  type AssuranceContract,
  type ProjectAlignmentContract,
  type DelegatableNotesContract,
  TokenType,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  waitForSync,
  assertNotNull,
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getTopContributorsForCause,
  getUserContributionRankForCause,
  type GraphQLClient,
} from '@commonality/sdk';
import { parseEther, type Address, keccak256, toBytes } from 'viem';
import {
  BeliefsAbi,
  ImplicationsAbi,
  PubstarterAbi,
  AssuranceContractAbi,
  ProjectAlignmentAbi,
  DelegatableNotesAbi,
} from '@commonality/sdk';

describe('Funding Portal Aggregated Metrics Tests (E2)', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  // Contract addresses
  const BELIEFS_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as Address;
  const IMPLICATIONS_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as Address;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
  const PROJECT_ALIGNMENT_ADDRESS = process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS as Address;
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as Address;

  // Test accounts
  const ATTESTER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  const CREATOR1_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
  const CREATOR2_PRIVATE_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;
  const CONTRIBUTOR1_PRIVATE_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const;
  const CONTRIBUTOR2_PRIVATE_KEY = '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as const;

  let graphqlClient: GraphQLClient;

  before(() => {
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should calculate total funding raised across all aligned projects for a cause', async function() {
    this.timeout(60000);

    console.log('  Setting up test scenario...');
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);
    const creator1Clients = createTestClients(CREATOR1_PRIVATE_KEY, RPC_URL);
    const creator2Clients = createTestClients(CREATOR2_PRIVATE_KEY, RPC_URL);
    const contributor1Clients = createTestClients(CONTRIBUTOR1_PRIVATE_KEY, RPC_URL);
    const contributor2Clients = createTestClients(CONTRIBUTOR2_PRIVATE_KEY, RPC_URL);

    // Create statements: S1 (specific cause) and S2 (broader cause)
    const s1Content = { text: 'We should fund open source AI safety research' };
    const s2Content = { text: 'We should fund AI safety research' };
    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    console.log(`  S1 (specific): ${s1Id}`);
    console.log(`  S2 (broader): ${s2Id}`);

    // Attest that S1 implies S2
    const implicationsContract: ImplicationsContract = {
      address: IMPLICATIONS_ADDRESS,
      abi: ImplicationsAbi,
    };

    const implHash = await attestImplication(
      attesterClients,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    console.log(`  Implication attested: ${implHash}`);

    // Wait for indexer
    const implReceipt = await attesterClients.publicClient.getTransactionReceipt({ hash: implHash });
    await waitForSync(graphqlClient, implReceipt.blockNumber, 15000);

    // Create two projects
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Project 1 aligned with S1 (specific cause)
    console.log('  Creating Project 1...');
    const project1Metadata = await uploadToIPFS({ title: 'Open Source AI Safety Project' });
    const { hash: p1Hash, projectDetails: p1Details } = await createProject(
      creator1Clients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/p1/',
        contractURI: 'https://example.com/p1/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: project1Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.1')],
      }
    );
    console.log(`  Project 1: ${p1Details.assuranceContractAddress}`);

    // Project 2 aligned with S2 (broader cause)
    console.log('  Creating Project 2...');
    const project2Metadata = await uploadToIPFS({ title: 'General AI Safety Research' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProject(
      creator2Clients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('2.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: project2Metadata,
        tokenIds: [1n],
        tokenCounts: [200n],
        tokenPrices: [parseEther('0.05')],
      }
    );
    console.log(`  Project 2: ${p2Details.assuranceContractAddress}`);

    // Wait for projects to be indexed
    const p2Receipt = await creator2Clients.publicClient.getTransactionReceipt({ hash: p2Hash });
    await waitForSync(graphqlClient, p2Receipt.blockNumber, 15000);

    // Align projects with statements
    const alignmentContract: ProjectAlignmentContract = {
      address: PROJECT_ALIGNMENT_ADDRESS,
      abi: ProjectAlignmentAbi,
    };

    const align1Hash = await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      p1Details.assuranceContractAddress,
      s1Cid
    );
    const align2Hash = await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      p2Details.assuranceContractAddress,
      s2Cid
    );

    console.log(`  Alignments attested`);

    // Wait for alignments
    const align2Receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: align2Hash });
    await waitForSync(graphqlClient, align2Receipt.blockNumber, 15000);

    // Contributors fund the projects
    console.log('  Contributors funding projects...');
    const assuranceContract1: AssuranceContract = {
      address: p1Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };
    const assuranceContract2: AssuranceContract = {
      address: p2Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Contributor 1 contributes 0.5 ETH to Project 1
    const buy1Hash = await buyProjectTokens(
      contributor1Clients,
      assuranceContract1,
      {
        buyer: contributor1Clients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [5n], // 5 tokens * 0.1 ETH = 0.5 ETH
        totalCost: parseEther('0.5'),
      }
    );

    // Contributor 2 contributes 0.3 ETH to Project 2
    const buy2Hash = await buyProjectTokens(
      contributor2Clients,
      assuranceContract2,
      {
        buyer: contributor2Clients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [6n], // 6 tokens * 0.05 ETH = 0.3 ETH
        totalCost: parseEther('0.3'),
      }
    );

    console.log(`  Contributions made`);

    // Wait for contributions
    const buy2Receipt = await contributor2Clients.publicClient.getTransactionReceipt({ hash: buy2Hash });
    await waitForSync(graphqlClient, buy2Receipt.blockNumber, 15000);

    // Now query total funding for S2 (broader cause)
    // Should include both projects: direct (P2) and indirect (P1 via S1->S2)
    console.log('  Querying total funding for S2...');
    const metrics = await getTotalFundingForCause(
      graphqlClient,
      s2Id,
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    console.log(`  Total raised: ${metrics.totalRaisedAcrossProjects}`);
    console.log(`  Project count: ${metrics.projectCount}`);

    // Should have both projects
    assert.strictEqual(metrics.projectCount, 2, 'Should have 2 projects aligned (1 direct, 1 indirect)');

    // Total should be 0.5 + 0.3 = 0.8 ETH
    const expectedTotal = parseEther('0.8');
    assert.strictEqual(
      metrics.totalRaisedAcrossProjects,
      expectedTotal,
      'Total funding should be 0.8 ETH'
    );

    console.log('  Test passed!');
  });

  it('should calculate total available funding from delegatable notes for a cause', async function() {
    this.timeout(40000);

    console.log('  Setting up delegatable notes scenario...');
    const donor1Clients = createTestClients(CONTRIBUTOR1_PRIVATE_KEY, RPC_URL);
    const donor2Clients = createTestClients(CONTRIBUTOR2_PRIVATE_KEY, RPC_URL);

    // Create a statement for the cause
    const causeContent = { text: 'We should fund climate change research' };
    const causeCid = await uploadToIPFS(causeContent);
    const causeId = cidToBytes32(causeCid);

    console.log(`  Cause: ${causeId}`);

    // Deposit notes for the cause
    const delegatableNotesContract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    console.log('  Depositing notes...');
    const { hash: note1Hash } = await depositETH(
      donor1Clients,
      delegatableNotesContract,
      {
        amount: parseEther('1.0'),
        intendedStatementId: causeId,
      }
    );

    const { hash: note2Hash } = await depositETH(
      donor2Clients,
      delegatableNotesContract,
      {
        amount: parseEther('0.5'),
        intendedStatementId: causeId,
      }
    );

    console.log('  Notes deposited');

    // Wait for notes
    const note2Receipt = await donor2Clients.publicClient.getTransactionReceipt({ hash: note2Hash });
    await waitForSync(graphqlClient, note2Receipt.blockNumber, 15000);

    // Query funding metrics
    console.log('  Querying available funding...');
    const metrics = await getTotalFundingForCause(
      graphqlClient,
      causeId
    );

    console.log(`  Total available from notes: ${metrics.totalAvailableFromNotes}`);
    console.log(`  Note count: ${metrics.noteCount}`);

    // Should have 2 notes totaling 1.5 ETH
    assert.strictEqual(metrics.noteCount, 2, 'Should have 2 notes');
    const expectedTotal = parseEther('1.5');
    assert.strictEqual(
      metrics.totalAvailableFromNotes,
      expectedTotal,
      'Total available should be 1.5 ETH'
    );

    console.log('  Test passed!');
  });

  it('should get all projects aligned with a cause (direct and indirect)', async function() {
    this.timeout(60000);

    console.log('  Setting up multi-project scenario...');
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);
    const creator1Clients = createTestClients(CREATOR1_PRIVATE_KEY, RPC_URL);
    const creator2Clients = createTestClients(CREATOR2_PRIVATE_KEY, RPC_URL);

    // Create statements
    const s1Content = { text: 'Fund cancer research' };
    const s2Content = { text: 'Fund medical research' };
    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    // Attest implication
    const implicationsContract: ImplicationsContract = {
      address: IMPLICATIONS_ADDRESS,
      abi: ImplicationsAbi,
    };
    const implHash = await attestImplication(
      attesterClients,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    const implReceipt = await attesterClients.publicClient.getTransactionReceipt({ hash: implHash });
    await waitForSync(graphqlClient, implReceipt.blockNumber, 15000);

    // Create projects
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const p1Metadata = await uploadToIPFS({ title: 'Cancer Research Lab' });
    const { projectDetails: p1Details } = await createProject(
      creator1Clients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/p1/',
        contractURI: 'https://example.com/p1/contract',
        owner: creator1Clients.account,
        recipient: creator1Clients.account,
        threshold: parseEther('5.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p1Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.1')],
      }
    );

    const p2Metadata = await uploadToIPFS({ title: 'General Medical Research' });
    const { hash: p2Hash, projectDetails: p2Details } = await createProject(
      creator2Clients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/p2/',
        contractURI: 'https://example.com/p2/contract',
        owner: creator2Clients.account,
        recipient: creator2Clients.account,
        threshold: parseEther('10.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid: p2Metadata,
        tokenIds: [1n],
        tokenCounts: [200n],
        tokenPrices: [parseEther('0.1')],
      }
    );

    const p2Receipt = await creator2Clients.publicClient.getTransactionReceipt({ hash: p2Hash });
    await waitForSync(graphqlClient, p2Receipt.blockNumber, 15000);

    // Align projects
    const alignmentContract: ProjectAlignmentContract = {
      address: PROJECT_ALIGNMENT_ADDRESS,
      abi: ProjectAlignmentAbi,
    };

    await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      p1Details.assuranceContractAddress,
      s1Cid
    );
    const align2Hash = await attestProjectAlignment(
      attesterClients,
      alignmentContract,
      p2Details.assuranceContractAddress,
      s2Cid
    );

    const align2Receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: align2Hash });
    await waitForSync(graphqlClient, align2Receipt.blockNumber, 15000);

    // Query all aligned projects for S2
    console.log('  Querying all aligned projects for S2...');
    const projects = await getAllAlignedProjectsForCause(
      graphqlClient,
      s2Id,
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    console.log(`  Found ${projects.length} projects`);
    assert.strictEqual(projects.length, 2, 'Should find 2 projects');

    // Find each project
    const p1 = projects.find(p => p.projectAddress.toLowerCase() === p1Details.assuranceContractAddress.toLowerCase());
    const p2 = projects.find(p => p.projectAddress.toLowerCase() === p2Details.assuranceContractAddress.toLowerCase());

    assert.ok(p1, 'Should find Project 1');
    assert.ok(p2, 'Should find Project 2');

    // Check alignment types
    assert.strictEqual(p1!.alignmentType, 'indirect', 'Project 1 should be indirectly aligned');
    assert.strictEqual(p2!.alignmentType, 'direct', 'Project 2 should be directly aligned');

    console.log('  Test passed!');
  });
});
