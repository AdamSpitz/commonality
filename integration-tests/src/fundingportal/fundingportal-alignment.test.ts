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
  uploadToIPFS,
  cidToBytes32,
  type ProjectAlignmentContract,
  type PubstarterContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getAlignedProjects,
  getProjectStatements,
  getAlignmentsByAttester,
} from '@commonality/sdk';
import { ProjectAlignmentAbi, PubstarterAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { attestProjectAlignmentChecked, attestProjectAlignmentsBatchChecked } from '../actions/alignment-actions-checked.js';
import { createProjectChecked } from '../actions/funding-actions-checked.js';

describe('Funding Portal - Project Alignment', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PROJECT_ALIGNMENT_ADDRESS = process.env.PROJECT_ALIGNMENT_ADDRESS as `0x${string}`;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'fundingportal-alignment';

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

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const projectOwnerClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'We support open source software development',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.text}"`);
    testLog(`  Statement ID: ${statementId}`);

    // Create a project
    testLog('  Creating a crowdfunding project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProjectChecked(projectOwnerClients, pubstarterContract, graphqlClient, {
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

    testLog('  ✓ Project creation properties verified');
    testLog(`  Project created at: ${projectDetails.tokenAddress}`);

    // Attest that the project aligns with the statement
    testLog('  Attesting project alignment...');
    await attestProjectAlignmentChecked(
      attesterClients,
      projectAlignmentContract,
      graphqlClient,
      projectDetails.tokenAddress,
      statementCid,
      statementId
    );

    testLog('  ✓ Project alignment attested successfully (verified by property checks)');
  });

  it('should handle multiple attesters for the same project-statement pair', async function() {
    this.timeout(30000);

    const attester1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const attester2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const projectOwnerClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'Climate change is a critical issue',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.text}"`);

    // Create a project
    testLog('  Creating a project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProjectChecked(projectOwnerClients, pubstarterContract, graphqlClient, {
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

    testLog('  ✓ Project creation properties verified');
    testLog(`  Project: ${projectDetails.tokenAddress}`);

    // Attester 1 attests
    testLog('  Attester 1 attesting...');
    await attestProjectAlignmentChecked(
      attester1Clients,
      projectAlignmentContract,
      graphqlClient,
      projectDetails.tokenAddress,
      statementCid,
      statementId
    );

    // Attester 2 also attests the same alignment
    testLog('  Attester 2 attesting...');
    await attestProjectAlignmentChecked(
      attester2Clients,
      projectAlignmentContract,
      graphqlClient,
      projectDetails.tokenAddress,
      statementCid,
      statementId
    );

    testLog('  ✓ Multiple attesters tracked independently (verified by property checks)');

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

    testLog('  ✓ Queries show both attestations');
  });

  it('should batch attest multiple alignments', async function() {
    this.timeout(40000);

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const projectOwnerClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

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

    testLog(`  Statement 1: "${statement1Content.text}"`);
    testLog(`  Statement 2: "${statement2Content.text}"`);

    // Create two projects
    testLog('  Creating projects...');
    const currentTime = Math.floor(Date.now() / 1000);

    const { projectDetails: project1 } = await createProjectChecked(projectOwnerClients, pubstarterContract, graphqlClient, {
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
    testLog('  ✓ Project creation properties verified');

    const { projectDetails: project2 } = await createProjectChecked(projectOwnerClients, pubstarterContract, graphqlClient, {
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
    testLog('  ✓ Project creation properties verified');

    testLog(`  Project 1: ${project1.tokenAddress}`);
    testLog(`  Project 2: ${project2.tokenAddress}`);

    // Batch attest: project1 -> statement1, project2 -> statement2
    testLog('  Batch attesting alignments...');
    await attestProjectAlignmentsBatchChecked(
      attesterClients,
      projectAlignmentContract,
      graphqlClient,
      [project1.tokenAddress, project2.tokenAddress],
      [statement1Cid, statement2Cid]
    );

    testLog('  ✓ Batch attestations recorded successfully (verified by property checks)');

    // Verify query by attester returns both
    const attesterAlignments = await getAlignmentsByAttester(graphqlClient, attesterClients.account);
    assert.ok(
      attesterAlignments.length >= 2,
      'Attester should have at least 2 alignments'
    );

    testLog('  ✓ All alignments queryable by attester');
  });

  it('should allow same attester to link one project to multiple statements', async function() {
    this.timeout(30000);

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const projectOwnerClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

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

    testLog(`  Created ${statements.length} statements`);

    // Create one project
    testLog('  Creating project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProjectChecked(projectOwnerClients, pubstarterContract, graphqlClient, {
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

    testLog('  ✓ Project creation properties verified');
    testLog(`  Project: ${projectDetails.tokenAddress}`);

    // Attest alignment to all three statements
    testLog('  Attesting alignments to multiple statements...');
    for (let i = 0; i < statementCids.length; i++) {
      await attestProjectAlignmentChecked(
        attesterClients,
        projectAlignmentContract,
        graphqlClient,
        projectDetails.tokenAddress,
        statementCids[i],
        statementIds[i]
      );
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

    testLog('  ✓ Project aligned with multiple statements');
  });
});
