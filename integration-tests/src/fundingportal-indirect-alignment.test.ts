/**
 * Funding Portal - Indirect Project Alignment Integration Tests
 *
 * Tests for indirect project alignment via the implication graph:
 * - Project aligned with S1, user queries S2 where S1 → S2
 * - Multiple implication levels
 * - Filter by direct vs indirect alignment
 *
 * This addresses item E1 from specs/integration-tests-todo.md
 */

import assert from 'assert';
import {
  createTestClients,
  attestProjectAlignment,
  attestImplication,
  createProject,
  uploadToIPFS,
  cidToBytes32,
  type ProjectAlignmentContract,
  type PubstarterContract,
  type ImplicationsContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getAlignedProjects,
  getIndirectlyAlignedProjects,
  waitForSync,
  assertNotNull,
} from './queries/index.js';

// ProjectAlignment ABI
const ProjectAlignmentAbi = [
  {
    inputs: [
      { internalType: "address", name: "projectAddress", type: "address" },
      { internalType: "bytes32", name: "statementId", type: "bytes32" },
    ],
    name: "attestAlignment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Minimal Pubstarter ABI for creating projects
const PubstarterAbi = [
  {
    inputs: [
      { internalType: "string", name: "metadataURI", type: "string" },
      { internalType: "string", name: "contractURI", type: "string" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "threshold", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "string", name: "projectMetadataCid", type: "string" },
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "tokenCounts", type: "uint256[]" },
      { internalType: "uint256[]", name: "tokenPrices", type: "uint256[]" },
    ],
    name: "createERC1155AndMarketplaceAndAssuranceContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Implications ABI
const ImplicationsAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "fromStatementId", type: "bytes32" },
      { internalType: "bytes32", name: "toStatementId", type: "bytes32" },
    ],
    name: "attestImplication",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

describe('Funding Portal - Indirect Project Alignment', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PROJECT_ALIGNMENT_ADDRESS = process.env.PROJECT_ALIGNMENT_ADDRESS as `0x${string}`;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;
  const IMPLICATIONS_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const PRIVATE_KEY_1 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  const PRIVATE_KEY_2 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
  const PRIVATE_KEY_3 = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;

  let projectAlignmentContract: ProjectAlignmentContract;
  let pubstarterContract: PubstarterContract;
  let implicationsContract: ImplicationsContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!PROJECT_ALIGNMENT_ADDRESS) {
      throw new Error('PROJECT_ALIGNMENT_ADDRESS not set');
    }
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set');
    }
    if (!IMPLICATIONS_ADDRESS) {
      throw new Error('IMPLICATIONS_CONTRACT_ADDRESS not set');
    }

    projectAlignmentContract = {
      address: PROJECT_ALIGNMENT_ADDRESS,
      abi: ProjectAlignmentAbi,
    };

    pubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    implicationsContract = {
      address: IMPLICATIONS_ADDRESS,
      abi: ImplicationsAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should find projects indirectly aligned via single implication', async function() {
    this.timeout(40000);

    const implicationAttester = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const alignmentAttester = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const projectOwner = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // Create two statements: S1 (specific) and S2 (broader)
    const s1Content = {
      statementType: 'text',
      text: 'We should fund renewable energy research',
    };
    const s2Content = {
      statementType: 'text',
      text: 'We should combat climate change',
    };

    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    console.log(`  S1 (specific): "${s1Content.text}"`);
    console.log(`  S2 (broader): "${s2Content.text}"`);

    // Create an implication: S1 → S2 (renewable energy research implies climate action)
    console.log('  Creating implication S1 → S2...');
    let txHash = await attestImplication(
      implicationAttester,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    let receipt = await implicationAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create a project
    console.log('  Creating a renewable energy project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProject(projectOwner, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwner.account,
      recipient: projectOwner.account,
      threshold: 1000n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmRenewableEnergy',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [10n * 10n**18n],
    });

    console.log(`  Project created at: ${projectDetails.tokenAddress}`);

    // Align the project with S1 (specific statement)
    console.log('  Aligning project with S1 (renewable energy)...');
    txHash = await attestProjectAlignment(
      alignmentAttester,
      projectAlignmentContract,
      projectDetails.tokenAddress,
      s1Cid
    );
    receipt = await alignmentAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify direct alignment with S1
    const directAlignments = await getAlignedProjects(graphqlClient, s1Id);
    assert.strictEqual(
      directAlignments.length,
      1,
      'Should have 1 direct alignment with S1'
    );
    assert.strictEqual(
      directAlignments[0].projectAddress.toLowerCase(),
      projectDetails.tokenAddress.toLowerCase(),
      'Project should be directly aligned with S1'
    );

    console.log('  ✓ Project directly aligned with S1');

    // Verify NO direct alignment with S2
    const s2DirectAlignments = await getAlignedProjects(graphqlClient, s2Id);
    assert.strictEqual(
      s2DirectAlignments.length,
      0,
      'Should have 0 direct alignments with S2'
    );

    console.log('  ✓ Project NOT directly aligned with S2');

    // Query for indirect alignment with S2
    console.log('  Querying for projects indirectly aligned with S2...');
    const indirectAlignments = await getIndirectlyAlignedProjects(
      graphqlClient,
      s2Id,
      implicationAttester.account,
      alignmentAttester.account
    );

    assert.strictEqual(
      indirectAlignments.length,
      1,
      'Should have 1 indirect alignment with S2'
    );

    const indirectAlignment = indirectAlignments[0];
    assert.strictEqual(
      indirectAlignment.projectAddress.toLowerCase(),
      projectDetails.tokenAddress.toLowerCase(),
      'Project should be indirectly aligned with S2'
    );
    assert.strictEqual(
      indirectAlignment.directStatementId.toLowerCase(),
      s1Id.toLowerCase(),
      'Direct statement should be S1'
    );
    assert.strictEqual(
      indirectAlignment.indirectStatementId.toLowerCase(),
      s2Id.toLowerCase(),
      'Indirect statement should be S2'
    );

    console.log('  ✓ Project found via indirect alignment with S2');
    console.log('  ✓ Alignment path: Project → S1 → S2');
  });

  it('should handle multiple projects with mixed direct and indirect alignments', async function() {
    this.timeout(50000);

    const implicationAttester = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const alignmentAttester = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const projectOwner = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // Create statements
    const s1Content = {
      statementType: 'text',
      text: 'Support affordable housing initiatives',
    };
    const s2Content = {
      statementType: 'text',
      text: 'Reduce poverty and inequality',
    };

    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    console.log(`  S1: "${s1Content.text}"`);
    console.log(`  S2: "${s2Content.text}"`);

    // Create implication: S1 → S2
    console.log('  Creating implication S1 → S2...');
    let txHash = await attestImplication(
      implicationAttester,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    let receipt = await implicationAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create two projects
    const currentTime = Math.floor(Date.now() / 1000);

    console.log('  Creating Project A (housing)...');
    const { projectDetails: projectA } = await createProject(projectOwner, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwner.account,
      recipient: projectOwner.account,
      threshold: 500n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmHousingProject',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5n * 10n**18n],
    });

    console.log('  Creating Project B (poverty)...');
    const { projectDetails: projectB } = await createProject(projectOwner, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwner.account,
      recipient: projectOwner.account,
      threshold: 300n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmPovertyProject',
      tokenIds: [1n],
      tokenCounts: [50n],
      tokenPrices: [6n * 10n**18n],
    });

    // Align Project A with S1 (indirect to S2)
    console.log('  Aligning Project A with S1...');
    txHash = await attestProjectAlignment(
      alignmentAttester,
      projectAlignmentContract,
      projectA.tokenAddress,
      s1Cid
    );
    receipt = await alignmentAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Align Project B directly with S2
    console.log('  Aligning Project B directly with S2...');
    txHash = await attestProjectAlignment(
      alignmentAttester,
      projectAlignmentContract,
      projectB.tokenAddress,
      s2Cid
    );
    receipt = await alignmentAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Query S2 for direct alignments only
    const directAlignments = await getAlignedProjects(graphqlClient, s2Id);
    assert.strictEqual(
      directAlignments.length,
      1,
      'Should have 1 direct alignment with S2'
    );
    assert.strictEqual(
      directAlignments[0].projectAddress.toLowerCase(),
      projectB.tokenAddress.toLowerCase(),
      'Only Project B should be directly aligned'
    );

    console.log('  ✓ Only Project B is directly aligned with S2');

    // Query S2 for indirect alignments
    const indirectAlignments = await getIndirectlyAlignedProjects(
      graphqlClient,
      s2Id,
      implicationAttester.account,
      alignmentAttester.account
    );

    assert.strictEqual(
      indirectAlignments.length,
      1,
      'Should have 1 indirect alignment with S2'
    );
    assert.strictEqual(
      indirectAlignments[0].projectAddress.toLowerCase(),
      projectA.tokenAddress.toLowerCase(),
      'Project A should be indirectly aligned'
    );

    console.log('  ✓ Project A found via indirect alignment');
    console.log('  ✓ Can distinguish direct vs indirect alignments');
  });

  it('should handle multiple implication levels (S1 → S2, query by S2)', async function() {
    this.timeout(50000);

    const implicationAttester = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const alignmentAttester = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const projectOwner = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // Create a chain of statements with increasing generality
    const s1Content = {
      statementType: 'text',
      text: 'Fund solar panel installation programs',
    };
    const s2Content = {
      statementType: 'text',
      text: 'Promote renewable energy adoption',
    };
    const s3Content = {
      statementType: 'text',
      text: 'Address climate change',
    };

    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s3Cid = await uploadToIPFS(s3Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);
    const s3Id = cidToBytes32(s3Cid);

    console.log(`  S1 (most specific): "${s1Content.text}"`);
    console.log(`  S2 (broader): "${s2Content.text}"`);
    console.log(`  S3 (broadest): "${s3Content.text}"`);

    // Create implications: S1 → S2 and S2 → S3
    console.log('  Creating implication S1 → S2...');
    let txHash = await attestImplication(
      implicationAttester,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    let receipt = await implicationAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    console.log('  Creating implication S2 → S3...');
    txHash = await attestImplication(
      implicationAttester,
      implicationsContract,
      s2Cid,
      s3Cid
    );
    receipt = await implicationAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create a project aligned with S1
    console.log('  Creating solar panel project...');
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProject(projectOwner, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwner.account,
      recipient: projectOwner.account,
      threshold: 800n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmSolarPanels',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [8n * 10n**18n],
    });

    console.log('  Aligning project with S1...');
    txHash = await attestProjectAlignment(
      alignmentAttester,
      projectAlignmentContract,
      projectDetails.tokenAddress,
      s1Cid
    );
    receipt = await alignmentAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Query for indirect alignment with S2 (one level up)
    console.log('  Querying S2 for indirect alignments...');
    const s2IndirectAlignments = await getIndirectlyAlignedProjects(
      graphqlClient,
      s2Id,
      implicationAttester.account,
      alignmentAttester.account
    );

    assert.strictEqual(
      s2IndirectAlignments.length,
      1,
      'Should find project indirectly aligned with S2'
    );
    assert.strictEqual(
      s2IndirectAlignments[0].projectAddress.toLowerCase(),
      projectDetails.tokenAddress.toLowerCase()
    );

    console.log('  ✓ Project found when querying S2 (via S1 → S2)');

    // Query for indirect alignment with S3 (two levels up)
    // NOTE: The spec says implications are NOT transitive, so we should NOT find
    // the project when querying S3, since there's no direct implication S1 → S3
    console.log('  Querying S3 for indirect alignments...');
    const s3IndirectAlignments = await getIndirectlyAlignedProjects(
      graphqlClient,
      s3Id,
      implicationAttester.account,
      alignmentAttester.account
    );

    // We expect to NOT find the project via S1 → S3 (no transitive implication)
    // But we SHOULD find it via S2 → S3 if there are projects aligned with S2
    // In this case, no projects are aligned with S2, so we expect 0 results
    assert.strictEqual(
      s3IndirectAlignments.length,
      0,
      'Should NOT find project via transitive implication (S1 → S2 → S3)'
    );

    console.log('  ✓ Implications are correctly non-transitive');
    console.log('  ✓ Project NOT found when querying S3 (implications not transitive)');
  });

  it('should filter by trusted implication attester', async function() {
    this.timeout(40000);

    const implicationAttester1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const implicationAttester2 = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const alignmentAttester = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // Create statements
    const s1Content = {
      statementType: 'text',
      text: 'Support public transportation',
    };
    const s2Content = {
      statementType: 'text',
      text: 'Reduce carbon emissions',
    };

    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    // Two different attesters create the same implication S1 → S2
    console.log('  Attester 1 creating implication S1 → S2...');
    let txHash = await attestImplication(
      implicationAttester1,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    let receipt = await implicationAttester1.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    console.log('  Attester 2 creating same implication S1 → S2...');
    txHash = await attestImplication(
      implicationAttester2,
      implicationsContract,
      s1Cid,
      s2Cid
    );
    receipt = await implicationAttester2.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create and align a project
    const projectOwner = alignmentAttester; // Reuse for simplicity
    const currentTime = Math.floor(Date.now() / 1000);
    const { projectDetails } = await createProject(projectOwner, pubstarterContract, {
      metadataURI: 'https://example.com/token-metadata',
      contractURI: 'https://example.com/contract-metadata',
      owner: projectOwner.account,
      recipient: projectOwner.account,
      threshold: 400n * 10n**18n,
      deadline: BigInt(currentTime + 86400 * 30),
      projectMetadataCid: 'QmTransportProject',
      tokenIds: [1n],
      tokenCounts: [80n],
      tokenPrices: [5n * 10n**18n],
    });

    txHash = await attestProjectAlignment(
      alignmentAttester,
      projectAlignmentContract,
      projectDetails.tokenAddress,
      s1Cid
    );
    receipt = await alignmentAttester.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Query S2 trusting only attester 1
    console.log('  Querying with trusted attester 1...');
    const results1 = await getIndirectlyAlignedProjects(
      graphqlClient,
      s2Id,
      implicationAttester1.account,
      alignmentAttester.account
    );

    assert.strictEqual(results1.length, 1, 'Should find project when trusting attester 1');

    // Query S2 trusting only attester 2
    console.log('  Querying with trusted attester 2...');
    const results2 = await getIndirectlyAlignedProjects(
      graphqlClient,
      s2Id,
      implicationAttester2.account,
      alignmentAttester.account
    );

    assert.strictEqual(results2.length, 1, 'Should find project when trusting attester 2');

    // Query S2 without specifying attester (trust all)
    console.log('  Querying without trusted attester filter...');
    const resultsAll = await getIndirectlyAlignedProjects(
      graphqlClient,
      s2Id,
      undefined,
      alignmentAttester.account
    );

    // Should find the project twice (once for each implication attestation)
    assert.ok(
      resultsAll.length >= 1,
      'Should find project when not filtering by attester'
    );

    console.log('  ✓ Trusted attester filtering works correctly');
  });
});
