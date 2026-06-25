/**
 * Funding Portal - Alignment Attestations Integration Tests
 *
 * Tests for the AlignmentAttestations contract functionality:
 * - Attest that a subject is aligned with a statement/cause
 * - Batch attest multiple alignments
 * - Query alignments by subject, statement, or attester
 * - Multiple attesters for same subject-statement pair
 */

import assert from 'assert';
import { AlignmentAttestationsAbi, ProjectFactoryAbi } from '@commonality/sdk/abis';
import { createStatement, publishDocument } from '@commonality/sdk/displayable-documents';
import { type AlignmentAttestationsContract, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import type { ProjectFactoryContract } from '@commonality/sdk/lazy-giving';
import { uploadToIPFS, fakeIpfsCidV1 } from '@commonality/sdk/utils';
import { getAlignedSubjects, getSubjectStatements, getAlignmentsByAttester } from '@commonality/sdk/fundingportals';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { attestAlignmentChecked, attestAlignmentsBatchChecked } from '../actions/alignment-actions-checked.js';
import { createProjectChecked } from '../actions/funding-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';


describe('Funding Portal - Alignment Attestations', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const ALIGNMENT_ATTESTATIONS_ADDRESS = process.env.ALIGNMENT_ATTESTATIONS_ADDRESS as `0x${string}`;
  const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'fundingportal-alignment';

  let alignmentAttestationsContract: AlignmentAttestationsContract;
  let projectFactoryContract: ProjectFactoryContract;
  let machinery: ActionTestingMachinery;

  before(async () => {
    if (!ALIGNMENT_ATTESTATIONS_ADDRESS) {
      throw new Error('ALIGNMENT_ATTESTATIONS_ADDRESS not set');
    }
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set');
    }

    alignmentAttestationsContract = {
      address: ALIGNMENT_ATTESTATIONS_ADDRESS,
      abi: AlignmentAttestationsAbi,
    };

    projectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    machinery = createActionTestingMachinery();
  });

  it('should attest a single alignment', async function() {
    this.timeout(30000);

    const attesterClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const projectOwnerClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    // Create a statement
    const statementText = 'We support open source software development';
    const statementCid = await publishDocument(machinery.ipfsConfig, createStatement({ content: statementText }));

    testLog(`  Statement: "${statementText}"`);
    testLog(`  Statement CID: ${statementCid}`);

    // Create a project
    testLog('  Creating a crowdfunding project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProjectChecked(projectOwnerClients, projectFactoryContract, machinery, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 1000n * 10n**18n, // 1000 ETH
      deadline: BigInt(currentTime + 86400 * 30), // 30 days from now
      projectMetadataCid: fakeIpfsCidV1('TestProjectCid'),
      tokenIds: [1n, 2n],
      tokenCounts: [100n, 50n],
      tokenPrices: [10n * 10n**18n, 20n * 10n**18n], // 10 ETH, 20 ETH
    });

    testLog('  ✓ Project creation properties verified');
    testLog(`  Project created at: ${projectDetails.tokenAddress}`);

    // Attest that the project aligns with the statement
    testLog('  Attesting alignment...');
    await attestAlignmentChecked(
      attesterClients,
      alignmentAttestationsContract,
      machinery,
      projectDetails.tokenAddress,
      statementCid,
      PROJECT_ALIGNMENT_TOPIC
    );

    testLog('  ✓ Alignment attested successfully (verified by property checks)');
  });

  it('should handle multiple attesters for the same subject-statement pair', async function() {
    this.timeout(30000);

    const attester1Clients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const attester2Clients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);
    const projectOwnerClients = createIsolatedWriteClients(SUITE_NAME, 2, RPC_URL);

    // Create a statement
    const statementText = 'Climate change is a critical issue';
    const statementCid = await publishDocument(machinery.ipfsConfig, createStatement({ content: statementText }));

    testLog(`  Statement: "${statementText}"`);
    testLog(`  Statement CID: ${statementCid}`);

    // Create a project
    testLog('  Creating a project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProjectChecked(projectOwnerClients, projectFactoryContract, machinery, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 500n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: fakeIpfsCidV1('TestProjectCid2'),
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5n * 10n**18n],
    });

    testLog('  ✓ Project creation properties verified');
    testLog(`  Project: ${projectDetails.tokenAddress}`);

    // Attester 1 attests
    testLog('  Attester 1 attesting...');
    await attestAlignmentChecked(
      attester1Clients,
      alignmentAttestationsContract,
      machinery,
      projectDetails.tokenAddress,
      statementCid,
      PROJECT_ALIGNMENT_TOPIC
    );

    // Attester 2 also attests the same alignment
    testLog('  Attester 2 attesting...');
    await attestAlignmentChecked(
      attester2Clients,
      alignmentAttestationsContract,
      machinery,
      projectDetails.tokenAddress,
      statementCid,
      PROJECT_ALIGNMENT_TOPIC
    );

    testLog('  ✓ Multiple attesters tracked independently (verified by property checks)');

    // Query all aligned subjects (should show 2 attestations for same subject)
    const alignedSubjects = await getAlignedSubjects(machinery, statementCid, undefined, PROJECT_ALIGNMENT_TOPIC);
    const matchingAlignments = alignedSubjects.filter(
      a => a.subjectId.toLowerCase() === toSubjectId(projectDetails.tokenAddress).toLowerCase()
    );
    assert.strictEqual(
      matchingAlignments.length,
      2,
      'Should have 2 attestations for the same subject'
    );

    testLog('  ✓ Queries show both attestations');
  });

  it('should batch attest multiple alignments', async function() {
    this.timeout(40000);

    const attesterClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const projectOwnerClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    // Create two statements
    const statement1Content = {
      statementType: 'text',
      text: 'Support renewable energy',
    };
    const statement2Content = {
      statementType: 'text',
      text: 'Promote education access',
    };

    const statement1Cid = await uploadToIPFS(machinery.ipfsConfig, statement1Content);
    const statement2Cid = await uploadToIPFS(machinery.ipfsConfig, statement2Content);

    testLog(`  Statement 1: "${statement1Content.text}"`);
    testLog(`  Statement 2: "${statement2Content.text}"`);

    // Create two projects
    testLog('  Creating projects...');
    const currentTime = Math.floor(Date.now() / 1000);

    const { projectDetails: project1 } = await createProjectChecked(projectOwnerClients, projectFactoryContract, machinery, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 100n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: fakeIpfsCidV1('TestProjectCid1'),
      tokenIds: [1n],
      tokenCounts: [50n],
      tokenPrices: [2n * 10n**18n],
    });
    testLog('  ✓ Project creation properties verified');

    const { projectDetails: project2 } = await createProjectChecked(projectOwnerClients, projectFactoryContract, machinery, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 200n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: fakeIpfsCidV1('TestProjectCid2'),
      tokenIds: [1n],
      tokenCounts: [75n],
      tokenPrices: [3n * 10n**18n],
    });
    testLog('  ✓ Project creation properties verified');

    testLog(`  Project 1: ${project1.tokenAddress}`);
    testLog(`  Project 2: ${project2.tokenAddress}`);

    // Batch attest: project1 -> statement1, project2 -> statement2
    testLog('  Batch attesting alignments...');
    await attestAlignmentsBatchChecked(
      attesterClients,
      alignmentAttestationsContract,
      machinery,
      [project1.tokenAddress, project2.tokenAddress],
      [statement1Cid, statement2Cid],
      [PROJECT_ALIGNMENT_TOPIC, PROJECT_ALIGNMENT_TOPIC]
    );

    testLog('  ✓ Batch attestations recorded successfully (verified by property checks)');

    // Verify query by attester returns both
    const attesterAlignments = await getAlignmentsByAttester(machinery, attesterClients.account, PROJECT_ALIGNMENT_TOPIC);
    assert.ok(
      attesterAlignments.length >= 2,
      'Attester should have at least 2 alignments'
    );

    testLog('  ✓ All alignments queryable by attester');
  });

  it('should allow same attester to link one subject to multiple statements', async function() {
    this.timeout(30000);

    const attesterClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const projectOwnerClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    // Create three statements
    const statements = [
      { statementType: 'text', text: 'Support open data' },
      { statementType: 'text', text: 'Promote transparency' },
      { statementType: 'text', text: 'Advance scientific research' },
    ];

    const statementCids = await Promise.all(
      statements.map(s => uploadToIPFS(machinery.ipfsConfig, s))
    );

    testLog(`  Created ${statements.length} statements`);

    // Create one project
    testLog('  Creating project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProjectChecked(projectOwnerClients, projectFactoryContract, machinery, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwnerClients.account,
      recipient: projectOwnerClients.account,
      threshold: 300n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: fakeIpfsCidV1('TestProjectCidMulti'),
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [3n * 10n**18n],
    });

    testLog('  ✓ Project creation properties verified');
    testLog(`  Project: ${projectDetails.tokenAddress}`);

    // Attest alignment to all three statements
    testLog('  Attesting alignments to multiple statements...');
    for (let i = 0; i < statementCids.length; i++) {
      await attestAlignmentChecked(
        attesterClients,
        alignmentAttestationsContract,
        machinery,
        projectDetails.tokenAddress,
        statementCids[i],
        PROJECT_ALIGNMENT_TOPIC
      );
    }

    // Verify all alignments exist
    const subjectStatements = await getSubjectStatements(
      machinery,
      toSubjectId(projectDetails.tokenAddress),
      attesterClients.account,
      PROJECT_ALIGNMENT_TOPIC
    );

    assert.ok(
      subjectStatements.length >= 3,
      'Subject should be aligned with at least 3 statements'
    );

    // Verify each statement CID is present
    for (const statementCid of statementCids) {
      const found = subjectStatements.some(
        a => a.statementCid.toLowerCase() === statementCid.toLowerCase()
      );
      assert.ok(found, `Statement ${statementCid} should be aligned with subject`);
    }

    testLog('  ✓ Subject aligned with multiple statements');
  });
});
