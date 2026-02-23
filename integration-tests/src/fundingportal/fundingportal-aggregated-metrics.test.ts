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
  uploadToIPFS,
  cidToBytes32,
  PROJECT_ALIGNMENT_TOPIC,
  type IpfsCidV1,
  type ImplicationsContract,
  type PubstarterContract,
  type AssuranceContract,
  type AlignmentAttestationsContract,
  type DelegatableNotesContract,
} from '@commonality/sdk';
import {
  ImplicationsAbi,
  PubstarterAbi,
  AssuranceContractAbi,
  AlignmentAttestationsAbi,
  DelegatableNotesAbi,
} from '@commonality/sdk';
import {
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { attestImplicationChecked } from '../actions/implication-actions-checked.js';
import { buyProjectTokensChecked, createProjectChecked } from '../actions/funding-actions-checked.js';
import { attestAlignmentChecked } from '../actions/alignment-actions-checked.js';
import { depositETHChecked } from '../delegation/delegation-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Funding Portal Aggregated Metrics Tests (E2)', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';

  // Contract addresses
  const IMPLICATIONS_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as Address;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;
  const ALIGNMENT_ATTESTATIONS_ADDRESS = process.env.ALIGNMENT_ATTESTATIONS_ADDRESS as Address;
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'fundingportal-aggregated-metrics';

  let machinery: ActionTestingMachinery;

  before(() => {
    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should calculate total funding raised across all aligned projects for a cause', async function() {
    this.timeout(60000);

    testLog('  Setting up test scenario...');
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const contributor1Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const contributor2Clients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);

    // Create statements: S1 (specific cause) and S2 (broader cause)
    const s1Content = { text: 'We should fund open source AI safety research' };
    const s2Content = { text: 'We should fund AI safety research' };
    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    testLog(`  S1 (specific): ${s1Id}`);
    testLog(`  S2 (broader): ${s2Id}`);

    // Attest that S1 implies S2
    const implicationsContract: ImplicationsContract = {
      address: IMPLICATIONS_ADDRESS,
      abi: ImplicationsAbi,
    };

    const implHash = await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      machinery,
      s1Cid,
      s2Cid
    );
    testLog(`  Implication attested: ${implHash}`);

    // Create two projects
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    // Project 1 aligned with S1 (specific cause)
    testLog('  Creating Project 1...');
    const project1Metadata = await uploadToIPFS({ title: 'Open Source AI Safety Project' });
    const { projectDetails: p1Details } = await createProjectChecked(
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
        projectMetadataCid: project1Metadata,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.1')],
      }
    );
    testLog('  ✓ Project creation properties verified');
    testLog(`  Project 1: ${p1Details.assuranceContractAddress}`);

    // Project 2 aligned with S2 (broader cause)
    testLog('  Creating Project 2...');
    const project2Metadata = await uploadToIPFS({ title: 'General AI Safety Research' });
    const { projectDetails: p2Details } = await createProjectChecked(
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
        projectMetadataCid: project2Metadata,
        tokenIds: [1n],
        tokenCounts: [200n],
        tokenPrices: [parseEther('0.05')],
      }
    );
    testLog('  ✓ Project creation properties verified');
    testLog(`  Project 2: ${p2Details.assuranceContractAddress}`);

    // Align projects with statements
    const alignmentContract: AlignmentAttestationsContract = {
      address: ALIGNMENT_ATTESTATIONS_ADDRESS,
      abi: AlignmentAttestationsAbi,
    };

    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      p1Details.assuranceContractAddress,
      s1Cid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );
    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      p2Details.assuranceContractAddress,
      s2Cid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );

    testLog(`  Alignments attested`);

    // Contributors fund the projects
    testLog('  Contributors funding projects...');
    const assuranceContract1: AssuranceContract = {
      address: p1Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };
    const assuranceContract2: AssuranceContract = {
      address: p2Details.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    // Contributor 1 contributes 0.5 ETH to Project 1
    await buyProjectTokensChecked(
      contributor1Clients,
      assuranceContract1,
      machinery,
      {
        buyer: contributor1Clients.account,
        tokenAddress: p1Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [5n], // 5 tokens * 0.1 ETH = 0.5 ETH
        totalCost: parseEther('0.5'),
      }
    );

    // Contributor 2 contributes 0.3 ETH to Project 2
    await buyProjectTokensChecked(
      contributor2Clients,
      assuranceContract2,
      machinery,
      {
        buyer: contributor2Clients.account,
        tokenAddress: p2Details.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [6n], // 6 tokens * 0.05 ETH = 0.3 ETH
        totalCost: parseEther('0.3'),
      }
    );

    testLog(`  Contributions made`);

    // Now query total funding for S2 (broader cause)
    // Should include both projects: direct (P2) and indirect (P1 via S1->S2)
    testLog('  Querying total funding for S2...');
    const metrics = await getTotalFundingForCause(
      machinery,
      s2Cid,
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    testLog(`  Total raised: ${metrics.totalRaisedAcrossProjects}`);
    testLog(`  Project count: ${metrics.projectCount}`);

    // Should have both projects
    assert.strictEqual(metrics.projectCount, 2, 'Should have 2 projects aligned (1 direct, 1 indirect)');

    // Total should be 0.5 + 0.3 = 0.8 ETH
    const expectedTotal = parseEther('0.8');
    assert.strictEqual(
      metrics.totalRaisedAcrossProjects,
      expectedTotal,
      'Total funding should be 0.8 ETH'
    );

    testLog('  Test passed!');
  });

  // TODO: Re-enable once NoteIntent attestation system is implemented
  // This test requires querying notes by intendedStatementId, which has been moved to NoteIntent contract
  it.skip('should calculate total available funding from delegatable notes for a cause', async function() {
    this.timeout(40000);

    testLog('  Setting up delegatable notes scenario...');
    const donor1Clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const donor2Clients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);

    // Create a statement for the cause
    const causeContent = { text: 'We should fund climate change research' };
    const causeCid = await uploadToIPFS(causeContent);
    const causeId = cidToBytes32(causeCid);

    testLog(`  Cause: ${causeId}`);

    // Deposit notes for the cause
    const delegatableNotesContract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    testLog('  Depositing notes...');
    await depositETHChecked(
      donor1Clients,
      delegatableNotesContract,
      machinery,
      {
        amount: parseEther('1.0'),
      }
    );

    await depositETHChecked(
      donor2Clients,
      delegatableNotesContract,
      machinery,
      {
        amount: parseEther('0.5'),
      }
    );

    testLog('  Notes deposited');

    // Query funding metrics
    testLog('  Querying available funding...');
    const metrics = await getTotalFundingForCause(
      machinery,
      causeCid
    );

    testLog(`  Total available from notes: ${metrics.totalAvailableFromNotes}`);
    testLog(`  Note count: ${metrics.noteCount}`);

    // Should have at least 2 notes (may have more on non-fresh blockchain)
    assert(metrics.noteCount >= 2, 'Should have at least 2 notes');

    // Verify our specific notes exist by checking the total includes at least our 1.5 ETH
    const expectedMinimum = parseEther('1.5');
    assert(
      BigInt(metrics.totalAvailableFromNotes) >= expectedMinimum,
      `Total available should be at least 1.5 ETH, got ${metrics.totalAvailableFromNotes}`
    );

    testLog('  Test passed!');
  });

  it('should get all projects aligned with a cause (direct and indirect)', async function() {
    this.timeout(60000);

    testLog('  Setting up multi-project scenario...');
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const creator1Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const creator2Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);

    // Create statements
    const s1Content = { text: 'Fund cancer research' };
    const s2Content = { text: 'Fund medical research' };
    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);

    // Attest implication
    const implicationsContract: ImplicationsContract = {
      address: IMPLICATIONS_ADDRESS,
      abi: ImplicationsAbi,
    };
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      machinery,
      s1Cid,
      s2Cid
    );

    // Create projects
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const p1Metadata = await uploadToIPFS({ title: 'Cancer Research Lab' });
    const { projectDetails: p1Details } = await createProjectChecked(
      creator1Clients,
      pubstarterContract,
      machinery,
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
    testLog('  ✓ Project creation properties verified');

    const p2Metadata = await uploadToIPFS({ title: 'General Medical Research' });
    const { projectDetails: p2Details } = await createProjectChecked(
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
        tokenCounts: [200n],
        tokenPrices: [parseEther('0.1')],
      }
    );
    testLog('  ✓ Project creation properties verified');

    // Align projects
    const alignmentContract: AlignmentAttestationsContract = {
      address: ALIGNMENT_ATTESTATIONS_ADDRESS,
      abi: AlignmentAttestationsAbi,
    };

    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      p1Details.assuranceContractAddress,
      s1Cid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );
    await attestAlignmentChecked(
      attesterClients,
      alignmentContract,
      machinery,
      p2Details.assuranceContractAddress,
      s2Cid,
      PROJECT_ALIGNMENT_TOPIC as unknown as IpfsCidV1
    );

    // Query all aligned projects for S2
    testLog('  Querying all aligned projects for S2...');
    const projects = await getAllAlignedProjectsForCause(
      machinery,
      s2Cid,
      attesterClients.account, // Trust this attester for implications
      attesterClients.account  // Trust this attester for alignments
    );

    testLog(`  Found ${projects.length} projects`);
    assert.strictEqual(projects.length, 2, 'Should find 2 projects');

    // Find each project
    const p1 = projects.find(p => p.projectAddress.toLowerCase() === p1Details.assuranceContractAddress.toLowerCase());
    const p2 = projects.find(p => p.projectAddress.toLowerCase() === p2Details.assuranceContractAddress.toLowerCase());

    assert.ok(p1, 'Should find Project 1');
    assert.ok(p2, 'Should find Project 2');

    // Check alignment types
    assert.strictEqual(p1!.alignmentType, 'indirect', 'Project 1 should be indirectly aligned');
    assert.strictEqual(p2!.alignmentType, 'direct', 'Project 2 should be directly aligned');

    testLog('  Test passed!');
  });
});
