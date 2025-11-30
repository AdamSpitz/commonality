/**
 * Funding Portal - Project Alignment Integration Tests
 *
 * Tests for the ProjectAlignment contract functionality:
 * - Attest that a project is aligned with a statement/cause
 * - Batch attest multiple alignments
 * - Query alignments by project, statement, or attester
 * - Multiple attesters for same project-statement pair
 */

import assert from 'assert';
import {
  createTestClients,
  attestProjectAlignment,
  attestProjectAlignmentsBatch,
  createProject,
  uploadToIPFS,
  cidToBytes32,
  type ProjectAlignmentContract,
  type PubstarterContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getAlignedProjects,
  getProjectStatements,
  getProjectAlignment,
  getAlignmentsByAttester,
  waitForSync,
  assertNotNull,
} from '@commonality/sdk';
import { type Address } from 'viem';
import { ProjectAlignmentAbi, PubstarterAbi } from '@commonality/sdk';
import { TEST_PRIVATE_KEYS } from '@commonality/sdk';

describe('Funding Portal - Project Alignment', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PROJECT_ALIGNMENT_ADDRESS = process.env.PROJECT_ALIGNMENT_ADDRESS as `0x${string}`;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const PRIVATE_KEY_1 = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const PRIVATE_KEY_2 = TEST_PRIVATE_KEYS.ACCOUNT_1;
  const PRIVATE_KEY_3 = TEST_PRIVATE_KEYS.ACCOUNT_2;

  let projectAlignmentContract: ProjectAlignmentContract;
  let pubstarterContract: PubstarterContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!PROJECT_ALIGNMENT_ADDRESS) {
      throw new Error('PROJECT_ALIGNMENT_ADDRESS not set');
    }
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set');
    }

    projectAlignmentContract = {
      address: PROJECT_ALIGNMENT_ADDRESS,
      abi: ProjectAlignmentAbi,
    };

    pubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should attest a single project alignment', async function() {
    this.timeout(30000);

    const attesterClients = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const projectOwnerClients = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'We support open source software development',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    console.log(`  Statement: "${statementContent.text}"`);
    console.log(`  Statement ID: ${statementId}`);

    // Create a project
    console.log('  Creating a crowdfunding project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProject(projectOwnerClients, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 1000n * 10n**18n, // 1000 ETH
      deadline: BigInt(currentTime + 86400 * 30), // 30 days from now
      projectMetadataCid: 'QmTestProjectCid',
      tokenIds: [1n, 2n],
      tokenCounts: [100n, 50n],
      tokenPrices: [10n * 10n**18n, 20n * 10n**18n], // 10 ETH, 20 ETH
    });

    console.log(`  Project created at: ${projectDetails.tokenAddress}`);

    // Attest that the project aligns with the statement
    console.log('  Attesting project alignment...');
    const txHash = await attestProjectAlignment(
      attesterClients,
      projectAlignmentContract,
      projectDetails.tokenAddress,
      statementCid
    );

    const receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Query and verify the alignment
    const alignment = assertNotNull(
      await getProjectAlignment(
        graphqlClient,
        attesterClients.account,
        projectDetails.tokenAddress,
        statementId
      ),
      'Project alignment'
    );

    assert.strictEqual(
      alignment.attester.toLowerCase(),
      attesterClients.account.toLowerCase(),
      'Attester should match'
    );
    assert.strictEqual(
      alignment.projectAddress.toLowerCase(),
      projectDetails.tokenAddress.toLowerCase(),
      'Project address should match'
    );
    assert.strictEqual(
      alignment.statementId.toLowerCase(),
      statementId.toLowerCase(),
      'Statement ID should match'
    );

    console.log('  ✓ Project alignment attested successfully');

    // Query alignments by statement
    const alignedProjects = await getAlignedProjects(graphqlClient, statementId);
    assert.ok(
      alignedProjects.some(
        a => a.projectAddress.toLowerCase() === projectDetails.tokenAddress.toLowerCase()
      ),
      'Project should appear in aligned projects list'
    );

    // Query alignments by project
    const projectStatements = await getProjectStatements(graphqlClient, projectDetails.tokenAddress);
    assert.ok(
      projectStatements.some(
        a => a.statementId.toLowerCase() === statementId.toLowerCase()
      ),
      'Statement should appear in project statements list'
    );

    console.log('  ✓ Queries return correct results');
  });

  it('should handle multiple attesters for the same project-statement pair', async function() {
    this.timeout(30000);

    const attester1Clients = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const attester2Clients = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const projectOwnerClients = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'Climate change is a critical issue',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    console.log(`  Statement: "${statementContent.text}"`);

    // Create a project
    console.log('  Creating a project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProject(projectOwnerClients, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 500n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmTestProjectCid2',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5n * 10n**18n],
    });

    console.log(`  Project: ${projectDetails.tokenAddress}`);

    // Attester 1 attests
    console.log('  Attester 1 attesting...');
    let txHash = await attestProjectAlignment(
      attester1Clients,
      projectAlignmentContract,
      projectDetails.tokenAddress,
      statementCid
    );
    let receipt = await attester1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Attester 2 also attests the same alignment
    console.log('  Attester 2 attesting...');
    txHash = await attestProjectAlignment(
      attester2Clients,
      projectAlignmentContract,
      projectDetails.tokenAddress,
      statementCid
    );
    receipt = await attester2Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify both attestations exist
    const alignment1 = assertNotNull(
      await getProjectAlignment(
        graphqlClient,
        attester1Clients.account,
        projectDetails.tokenAddress,
        statementId
      ),
      'Attester 1 alignment'
    );

    const alignment2 = assertNotNull(
      await getProjectAlignment(
        graphqlClient,
        attester2Clients.account,
        projectDetails.tokenAddress,
        statementId
      ),
      'Attester 2 alignment'
    );

    assert.notStrictEqual(
      alignment1.attester.toLowerCase(),
      alignment2.attester.toLowerCase(),
      'Attesters should be different'
    );

    console.log('  ✓ Multiple attesters tracked independently');

    // Query all aligned projects (should show 2 attestations for same project)
    const alignedProjects = await getAlignedProjects(graphqlClient, statementId);
    const matchingAlignments = alignedProjects.filter(
      a => a.projectAddress.toLowerCase() === projectDetails.tokenAddress.toLowerCase()
    );
    assert.strictEqual(
      matchingAlignments.length,
      2,
      'Should have 2 attestations for the same project'
    );

    console.log('  ✓ Queries show both attestations');
  });

  it('should batch attest multiple alignments', async function() {
    this.timeout(40000);

    const attesterClients = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const projectOwnerClients = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // Create two statements
    const statement1Content = {
      statementType: 'text',
      text: 'Support renewable energy',
    };
    const statement2Content = {
      statementType: 'text',
      text: 'Promote education access',
    };

    const statement1Cid = await uploadToIPFS(statement1Content);
    const statement2Cid = await uploadToIPFS(statement2Content);
    const statement1Id = cidToBytes32(statement1Cid);
    const statement2Id = cidToBytes32(statement2Cid);

    console.log(`  Statement 1: "${statement1Content.text}"`);
    console.log(`  Statement 2: "${statement2Content.text}"`);

    // Create two projects
    console.log('  Creating projects...');
    const currentTime = Math.floor(Date.now() / 1000);

    const { projectDetails: project1 } = await createProject(projectOwnerClients, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 100n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmProject1',
      tokenIds: [1n],
      tokenCounts: [50n],
      tokenPrices: [2n * 10n**18n],
    });

    const { projectDetails: project2 } = await createProject(projectOwnerClients, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 200n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmProject2',
      tokenIds: [1n],
      tokenCounts: [75n],
      tokenPrices: [3n * 10n**18n],
    });

    console.log(`  Project 1: ${project1.tokenAddress}`);
    console.log(`  Project 2: ${project2.tokenAddress}`);

    // Batch attest: project1 -> statement1, project2 -> statement2
    console.log('  Batch attesting alignments...');
    const txHash = await attestProjectAlignmentsBatch(
      attesterClients,
      projectAlignmentContract,
      [project1.tokenAddress, project2.tokenAddress],
      [statement1Cid, statement2Cid]
    );

    const receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify both alignments
    const alignment1 = assertNotNull(
      await getProjectAlignment(
        graphqlClient,
        attesterClients.account,
        project1.tokenAddress,
        statement1Id
      ),
      'Project 1 alignment'
    );

    const alignment2 = assertNotNull(
      await getProjectAlignment(
        graphqlClient,
        attesterClients.account,
        project2.tokenAddress,
        statement2Id
      ),
      'Project 2 alignment'
    );

    assert.strictEqual(
      alignment1.projectAddress.toLowerCase(),
      project1.tokenAddress.toLowerCase()
    );
    assert.strictEqual(
      alignment2.projectAddress.toLowerCase(),
      project2.tokenAddress.toLowerCase()
    );

    console.log('  ✓ Batch attestations recorded successfully');

    // Verify query by attester returns both
    const attesterAlignments = await getAlignmentsByAttester(graphqlClient, attesterClients.account);
    assert.ok(
      attesterAlignments.length >= 2,
      'Attester should have at least 2 alignments'
    );

    console.log('  ✓ All alignments queryable by attester');
  });

  it('should allow same attester to link one project to multiple statements', async function() {
    this.timeout(30000);

    const attesterClients = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const projectOwnerClients = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // Create three statements
    const statements = [
      { statementType: 'text', text: 'Support open data' },
      { statementType: 'text', text: 'Promote transparency' },
      { statementType: 'text', text: 'Advance scientific research' },
    ];

    const statementCids = await Promise.all(
      statements.map(s => uploadToIPFS(s))
    );
    const statementIds = statementCids.map(cidToBytes32);

    console.log(`  Created ${statements.length} statements`);

    // Create one project
    console.log('  Creating project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProject(projectOwnerClients, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 300n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmMultiStatement',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [3n * 10n**18n],
    });

    console.log(`  Project: ${projectDetails.tokenAddress}`);

    // Attest alignment to all three statements
    console.log('  Attesting alignments to multiple statements...');
    for (let i = 0; i < statementCids.length; i++) {
      const txHash = await attestProjectAlignment(
        attesterClients,
        projectAlignmentContract,
        projectDetails.tokenAddress,
        statementCids[i]
      );
      const receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
      await waitForSync(graphqlClient, receipt.blockNumber, 15000);
    }

    // Verify all alignments exist
    const projectStatements = await getProjectStatements(
      graphqlClient,
      projectDetails.tokenAddress,
      attesterClients.account
    );

    assert.ok(
      projectStatements.length >= 3,
      'Project should be aligned with at least 3 statements'
    );

    // Verify each statement ID is present
    for (const statementId of statementIds) {
      const found = projectStatements.some(
        a => a.statementId.toLowerCase() === statementId.toLowerCase()
      );
      assert.ok(found, `Statement ${statementId} should be aligned with project`);
    }

    console.log('  ✓ Project aligned with multiple statements');
  });
});
