/**
 * Delegation Spending Integration Tests
 *
 * Tests for spending delegatable notes to fund projects:
 * - Spend notes to purchase from primary market
 * - Verify delegation chain attribution in contributions
 * - Delegate spends on behalf of root owner
 * - Track full delegation chains for transparency
 */

import assert from 'assert';
import {
  uploadToIPFS,
  cidToBytes32,
  createProject,
  type DelegatableNotesContract,
  type PubstarterContract,
  type AssuranceContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getNote,
  getDelegationChain,
  getProject,
  getProjectContributions,
  assertNotNull,
} from '@commonality/sdk';
import { DelegatableNotesAbi, PubstarterAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import {
  depositETHChecked,
  delegateNoteChecked,
  spendDelegatedNoteChecked,
} from './delegation-actions-checked.js';

// Note: The AssuranceContract IS the primary market
// It implements ERC1155PrimaryMarket interface

describe('Delegation Spending', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}`;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'delegation-spending';

  let delegatableNotesContract: DelegatableNotesContract;
  let pubstarterContract: PubstarterContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_ADDRESS not set');
    }
    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set');
    }

    delegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    pubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should spend a delegatable note to fund a project', async function() {
    this.timeout(30000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement for the intended purpose
    const statementContent = {
      statementType: 'text',
      text: 'Fund open source development',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    // User 1 deposits 5 ETH into a note (automatically verifies delegation chain integrity)
    const depositAmount = 5000000000000000000n; // 5 ETH
    const { noteId } = await depositETHChecked(user1, delegatableNotesContract, graphqlClient, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const deadline = nowInSeconds + 86400n; // 24 hours from now
    const threshold = 3000000000000000000n; // 3 ETH threshold

    const { projectDetails } = await createProject(user1, pubstarterContract, {
      metadataURI: 'ipfs://project-metadata',
      contractURI: 'ipfs://contract-metadata',
      owner: user1.account,
      recipient: user1.account,
      threshold,
      deadline,
      projectMetadataCid: 'QmProjectMetadata',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [50000000000000000n], // 0.05 ETH per token
    });

    // The assurance contract IS the primary market (implements ERC1155PrimaryMarket)
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // Spend the note to purchase tokens (buy 20 tokens = 1 ETH)
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 1000000000000000000n; // 1 ETH
    const tokensToBuy = 20n;

    await spendDelegatedNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteIds: [noteId],
        chains: [[user1.account]], // Single-level chain (just user1)
        paymentAmount: purchaseAmount,
        primaryMarket: primaryMarketAddress,
        erc1155Contract: projectDetails.tokenAddress,
        tokenIds: [1n],
        counts: [tokensToBuy],
      }
    );

    // Verify the project received the funds
    const project = await getProject(graphqlClient, projectDetails.assuranceContractAddress);
    assertNotNull(project, 'Project');

    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 1 ETH'
    );

    // Verify contributions were tracked
    const contributions = await getProjectContributions(graphqlClient, projectDetails.assuranceContractAddress);
    assert(contributions.length > 0, 'Should have at least one contribution');

    // Note: When using delegatable notes, the participant is the DelegatableNotes contract
    // not the user directly. The delegation chain tracks the actual attribution.
    const contribution = contributions[0];
    assert.strictEqual(
      contribution.totalCost,
      purchaseAmount.toString(),
      'Contribution amount should match purchase amount'
    );
  });

  it('should attribute delegation chain when delegate spends on behalf of root owner', async function() {
    this.timeout(30000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // User 1 deposits ETH (automatically verifies delegation chain integrity)
    const statementContent = {
      statementType: 'text',
      text: 'Support education initiatives',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 10000000000000000000n; // 10 ETH
    const { noteId: note1 } = await depositETHChecked(user1, delegatableNotesContract, graphqlClient, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    // User 1 delegates to User 2 (automatically verifies delegation chain integrity)
    const { delegatedNoteId: note2 } = await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId: note1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: depositAmount,
      }
    );

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { projectDetails } = await createProject(user1, pubstarterContract, {
      metadataURI: 'ipfs://project-metadata-2',
      contractURI: 'ipfs://contract-metadata-2',
      owner: user1.account,
      recipient: user1.account,
      threshold: 2000000000000000000n, // 2 ETH
      deadline: nowInSeconds + 86400n,
      projectMetadataCid: 'QmProjectMetadata2',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [50000000000000000n], // 0.05 ETH per token
    });

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // User 2 (delegate) spends the note on behalf of User 1 (root)
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 3000000000000000000n; // 3 ETH
    const tokensToBuy = 60n;

    await spendDelegatedNoteChecked(
      user2,
      delegatableNotesContract,
      graphqlClient,
      {
        noteIds: [note2],
        chains: [[user2.account, user1.account]], // Chain: user2 (leaf) -> user1 (root)
        paymentAmount: purchaseAmount,
        primaryMarket: primaryMarketAddress,
        erc1155Contract: projectDetails.tokenAddress,
        tokenIds: [1n],
        counts: [tokensToBuy],
      }
    );

    // Verify the project received funds
    const project = await getProject(graphqlClient, projectDetails.assuranceContractAddress);
    assertNotNull(project, 'Project');
    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 3 ETH'
    );

    // Verify contribution attribution
    const contributions = await getProjectContributions(graphqlClient, projectDetails.assuranceContractAddress);
    assert(contributions.length > 0, 'Should have contributions');

    // The contribution should be attributed to the DelegatableNotes contract
    // (which acts on behalf of the delegation chain)
    // The actual attribution to the delegation chain should be trackable
    const contribution = contributions[0];
    assert.strictEqual(
      contribution.totalCost,
      purchaseAmount.toString(),
      'Contribution should match purchase amount'
    );
  });

  it('should support multi-level delegation chains for spending', async function() {
    this.timeout(30000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const user3 = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // User 1 deposits (automatically verifies delegation chain integrity)
    const statementContent = {
      statementType: 'text',
      text: 'Fund climate research',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 8000000000000000000n; // 8 ETH
    const { noteId: note1 } = await depositETHChecked(user1, delegatableNotesContract, graphqlClient, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    // User 1 -> User 2 (automatically verifies delegation chain integrity)
    const { delegatedNoteId: note2 } = await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId: note1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: depositAmount,
      }
    );

    // User 2 -> User 3 (automatically verifies delegation chain integrity)
    const { delegatedNoteId: note3 } = await delegateNoteChecked(
      user2,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId: note2,
        owners: [user2.account, user1.account],
        delegateTo: user3.account,
        amount: depositAmount,
      }
    );

    // Verify delegation chain
    const chain = await getDelegationChain(graphqlClient, note3.toString());
    assert.strictEqual(chain.length, 3, 'Should have 3-level delegation chain');

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { projectDetails } = await createProject(user1, pubstarterContract, {
      metadataURI: 'ipfs://project-metadata-3',
      contractURI: 'ipfs://contract-metadata-3',
      owner: user1.account,
      recipient: user1.account,
      threshold: 2000000000000000000n,
      deadline: nowInSeconds + 86400n,
      projectMetadataCid: 'QmProjectMetadata3',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [50000000000000000n],
    });

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // User 3 (end of delegation chain) spends the note
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 2000000000000000000n; // 2 ETH
    const tokensToBuy = 40n;

    await spendDelegatedNoteChecked(
      user3,
      delegatableNotesContract,
      graphqlClient,
      {
        noteIds: [note3],
        chains: [[user3.account, user2.account, user1.account]], // Full chain: user3 -> user2 -> user1
        paymentAmount: purchaseAmount,
        primaryMarket: primaryMarketAddress,
        erc1155Contract: projectDetails.tokenAddress,
        tokenIds: [1n],
        counts: [tokensToBuy],
      }
    );

    // Verify project received funds
    const project = await getProject(graphqlClient, projectDetails.assuranceContractAddress);
    assertNotNull(project, 'Project');
    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 2 ETH from multi-level delegation'
    );

    // Verify contribution was tracked
    const contributions = await getProjectContributions(graphqlClient, projectDetails.assuranceContractAddress);
    assert(contributions.length > 0, 'Should have contributions');
    assert.strictEqual(
      contributions[0].totalCost,
      purchaseAmount.toString(),
      'Contribution amount should match'
    );
  });

  it('should spend partial amounts from delegatable notes', async function() {
    this.timeout(30000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // User 1 deposits 10 ETH (automatically verifies delegation chain integrity)
    const statementContent = {
      statementType: 'text',
      text: 'Support arts and culture',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 10000000000000000000n; // 10 ETH
    const { noteId } = await depositETHChecked(user1, delegatableNotesContract, graphqlClient, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { projectDetails } = await createProject(user1, pubstarterContract, {
      metadataURI: 'ipfs://project-metadata-4',
      contractURI: 'ipfs://contract-metadata-4',
      owner: user1.account,
      recipient: user1.account,
      threshold: 1000000000000000000n,
      deadline: nowInSeconds + 86400n,
      projectMetadataCid: 'QmProjectMetadata4',
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [50000000000000000n],
    });

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // Spend only 2 ETH from the 10 ETH note
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 2000000000000000000n; // 2 ETH
    const tokensToBuy = 40n;

    await spendDelegatedNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteIds: [noteId],
        chains: [[user1.account]],
        paymentAmount: purchaseAmount,
        primaryMarket: primaryMarketAddress,
        erc1155Contract: projectDetails.tokenAddress,
        tokenIds: [1n],
        counts: [tokensToBuy],
      }
    );

    // Verify project received only 2 ETH
    const project = await getProject(graphqlClient, projectDetails.assuranceContractAddress);
    assertNotNull(project, 'Project');
    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 2 ETH'
    );

    // The original note should be spent (or a remainder note created)
    // This behavior depends on the contract implementation
    // We verify the project received the correct amount
    const contributions = await getProjectContributions(graphqlClient, projectDetails.assuranceContractAddress);
    assert(contributions.length > 0, 'Should have contributions');
  });
});
