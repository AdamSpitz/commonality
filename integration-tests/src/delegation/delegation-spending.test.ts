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
import { DelegatableNotesAbi, ProjectFactoryAbi } from '@commonality/sdk/abis';
import type { DelegatableNotesContract } from '@commonality/sdk/delegation';
import { createStatement, publishDocument } from '@commonality/sdk/displayable-documents';
import type { ProjectFactoryContract } from '@commonality/sdk/lazy-giving';
import { uploadToIPFS } from '@commonality/sdk/utils';
import { getDelegationChain } from '@commonality/sdk/delegation';
import { getProject, getProjectContributions } from '@commonality/sdk/lazy-giving';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import {
  depositPaymentTokenChecked,
  delegateNoteChecked,
  spendDelegatedNoteChecked,
} from './delegation-actions-checked.js';
import { createProjectChecked } from '../actions/funding-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';


// Note: The AssuranceContract IS the primary market
// It implements ERC1155PrimaryMarket interface

describe('Delegation Spending', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}`;
  const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'delegation-spending';

  let delegatableNotesContract: DelegatableNotesContract;
  let projectFactoryContract: ProjectFactoryContract;
  let machinery: ActionTestingMachinery;

  before(() => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_ADDRESS not set');
    }
    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set');
    }

    delegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    projectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    machinery = createActionTestingMachinery();
  });

  it('should spend a delegatable note to fund a project', async function() {
    this.timeout(30000);

    const user1 = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement for the intended purpose
    const statementData = createStatement({
      content: 'Fund open source development',
    });
    await publishDocument(machinery.ipfsConfig, statementData);

    // User 1 deposits 5 ETH into a note (automatically verifies delegation chain integrity)
    const depositAmount = 500000n; // 0.5 tokens
    const { noteId } = await depositPaymentTokenChecked(user1, delegatableNotesContract, machinery, {
      amount: depositAmount,
    });

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const deadline = nowInSeconds + 86400n; // 24 hours from now
    const threshold = 300000n; // 0.3 threshold

    const { projectDetails } = await createProjectChecked(user1, projectFactoryContract, machinery, {
      metadataURI: 'ipfs://project-metadata',
      contractURI: 'ipfs://contract-metadata',
      owner: user1.account,
      recipient: user1.account,
      threshold,
      deadline,
      projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, { name: 'Fund a Project', description: 'Spend a delegatable note to fund a project' }),
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5000n], // 0.005 per token
    });
    testLog('  ✓ Project creation properties verified');

    // The assurance contract IS the primary market (implements ERC1155PrimaryMarket)
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // Spend the note to purchase tokens (buy 20 tokens = 1 ETH)
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 100000n; // 0.1 tokens
    const tokensToBuy = 20n;

    await spendDelegatedNoteChecked(
      user1,
      delegatableNotesContract,
      machinery,
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
    const project = await getProject(machinery, projectDetails.assuranceContractAddress);
    assert.ok(project, 'Project');

    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 1 ETH'
    );

    // Verify contributions were tracked
    const contributions = await getProjectContributions(machinery, projectDetails.assuranceContractAddress);
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

    const user1 = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    // User 1 deposits ETH (automatically verifies delegation chain integrity)
    const statementData = createStatement({
      content: 'Support education initiatives',
    });
    await publishDocument(machinery.ipfsConfig, statementData);

    const depositAmount = 800000n; // 0.8 tokens
    const { noteId: note1 } = await depositPaymentTokenChecked(user1, delegatableNotesContract, machinery, {
      amount: depositAmount,
    });

    // User 1 delegates to User 2 (automatically verifies delegation chain integrity)
    const { delegatedNoteId: note2 } = await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      machinery,
      {
        noteId: note1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: depositAmount,
      }
    );

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { projectDetails } = await createProjectChecked(user1, projectFactoryContract, machinery, {
      metadataURI: 'ipfs://project-metadata-2',
      contractURI: 'ipfs://contract-metadata-2',
      owner: user1.account,
      recipient: user1.account,
      threshold: 200000n, // 0.2 threshold
      deadline: nowInSeconds + 86400n,
      projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, { name: 'Education Initiative', description: 'Support education initiatives via delegated funding' }),
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5000n], // 0.005 per token
    });
    testLog('  ✓ Project creation properties verified');

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // User 2 (delegate) spends the note on behalf of User 1 (root)
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 300000n; // 0.3 tokens
    const tokensToBuy = 60n;

    await spendDelegatedNoteChecked(
      user2,
      delegatableNotesContract,
      machinery,
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
    const project = await getProject(machinery, projectDetails.assuranceContractAddress);
    assert.ok(project, 'Project');
    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 3 ETH'
    );

    // Verify contribution attribution
    const contributions = await getProjectContributions(machinery, projectDetails.assuranceContractAddress);
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

    const user1 = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);
    const user3 = createIsolatedWriteClients(SUITE_NAME, 2, RPC_URL);

    // User 1 deposits (automatically verifies delegation chain integrity)
    const statementData = createStatement({
      content: 'Fund climate research',
    });
    await publishDocument(machinery.ipfsConfig, statementData);

    const depositAmount = 600000n; // 0.6 tokens
    const { noteId: note1 } = await depositPaymentTokenChecked(user1, delegatableNotesContract, machinery, {
      amount: depositAmount,
    });

    // User 1 -> User 2 (automatically verifies delegation chain integrity)
    const { delegatedNoteId: note2 } = await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      machinery,
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
      machinery,
      {
        noteId: note2,
        owners: [user2.account, user1.account],
        delegateTo: user3.account,
        amount: depositAmount,
      }
    );

    // Verify delegation chain
    const chain = await getDelegationChain(machinery, note3.toString());
    assert.strictEqual(chain.length, 3, 'Should have 3-level delegation chain');

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { projectDetails } = await createProjectChecked(user1, projectFactoryContract, machinery, {
      metadataURI: 'ipfs://project-metadata-3',
      contractURI: 'ipfs://contract-metadata-3',
      owner: user1.account,
      recipient: user1.account,
      threshold: 200000n,
      deadline: nowInSeconds + 86400n,
      projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, { name: 'Multi-Level Delegation Project', description: 'Multi-level delegation chain spending test' }),
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5000n],
    });
    testLog('  ✓ Project creation properties verified');

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // User 3 (end of delegation chain) spends the note
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 200000n; // 0.2 tokens
    const tokensToBuy = 40n;

    await spendDelegatedNoteChecked(
      user3,
      delegatableNotesContract,
      machinery,
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
    const project = await getProject(machinery, projectDetails.assuranceContractAddress);
    assert.ok(project, 'Project');
    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 2 ETH from multi-level delegation'
    );

    // Verify contribution was tracked
    const contributions = await getProjectContributions(machinery, projectDetails.assuranceContractAddress);
    assert(contributions.length > 0, 'Should have contributions');
    assert.strictEqual(
      contributions[0].totalCost,
      purchaseAmount.toString(),
      'Contribution amount should match'
    );
  });

  it('should spend partial amounts from delegatable notes', async function() {
    this.timeout(30000);

    const user1 = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);

    // User 1 deposits 10 ETH (automatically verifies delegation chain integrity)
    const statementData = createStatement({
      content: 'Support arts and culture',
    });
    await publishDocument(machinery.ipfsConfig, statementData);

    const depositAmount = 800000n; // 0.8 tokens
    const { noteId } = await depositPaymentTokenChecked(user1, delegatableNotesContract, machinery, {
      amount: depositAmount,
    });

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { projectDetails } = await createProjectChecked(user1, projectFactoryContract, machinery, {
      metadataURI: 'ipfs://project-metadata-4',
      contractURI: 'ipfs://contract-metadata-4',
      owner: user1.account,
      recipient: user1.account,
      threshold: 100000n,
      deadline: nowInSeconds + 86400n,
      projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, { name: 'Partial Spend Project', description: 'Partial amounts spending test' }),
      tokenIds: [1n],
      tokenCounts: [100n],
      tokenPrices: [5000n],
    });
    testLog('  ✓ Project creation properties verified');

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // Spend only 2 ETH from the 10 ETH note
    // Automatically verifies delegation chain integrity
    const purchaseAmount = 200000n; // 0.2 tokens
    const tokensToBuy = 40n;

    await spendDelegatedNoteChecked(
      user1,
      delegatableNotesContract,
      machinery,
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
    const project = await getProject(machinery, projectDetails.assuranceContractAddress);
    assert.ok(project, 'Project');
    assert.strictEqual(
      project.totalReceived,
      purchaseAmount.toString(),
      'Project should have received 2 ETH'
    );

    // The original note should be spent (or a remainder note created)
    // This behavior depends on the contract implementation
    // We verify the project received the correct amount
    const contributions = await getProjectContributions(machinery, projectDetails.assuranceContractAddress);
    assert(contributions.length > 0, 'Should have contributions');
  });
});
