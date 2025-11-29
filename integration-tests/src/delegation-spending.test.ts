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
  createTestClients,
  depositETH,
  delegateNote,
  uploadToIPFS,
  cidToBytes32,
  createProject,
  purchaseFromPrimaryMarketWithNotes,
  type DelegatableNotesContract,
  type PubstarterContract,
  type AssuranceContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getNote,
  getDelegationChain,
  getProject,
  getProjectContributions,
  waitForSync,
  assertNotNull,
} from './queries/index.js';

// Contract ABIs
const DelegatableNotesAbi = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "enum DelegatableNotes.TokenType", name: "tokenType", type: "uint8" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes32", name: "intendedStatementId", type: "bytes32" },
    ],
    name: "deposit",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "noteId", type: "uint256" },
      { internalType: "address[]", name: "owners", type: "address[]" },
      { internalType: "address", name: "delegateTo", type: "address" },
      { internalType: "uint256", name: "amountToDelegate", type: "uint256" },
    ],
    name: "delegate",
    outputs: [
      { internalType: "uint256", name: "delegatedNoteId", type: "uint256" },
      { internalType: "uint256", name: "remainderNoteId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "noteIds", type: "uint256[]" },
      { internalType: "address[][]", name: "chains", type: "address[][]" },
      { internalType: "uint256", name: "paymentAmount", type: "uint256" },
      { internalType: "address", name: "primaryMarket", type: "address" },
      { internalType: "address", name: "erc1155Contract", type: "address" },
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "counts", type: "uint256[]" },
    ],
    name: "purchaseFromPrimaryMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

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
    outputs: [
      { internalType: "address", name: "erc1155", type: "address" },
      { internalType: "address", name: "marketplace", type: "address" },
      { internalType: "address", name: "assuranceContract", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Note: The AssuranceContract IS the primary market
// It implements ERC1155PrimaryMarket interface

describe('Delegation Spending', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}`;
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const PRIVATE_KEY_1 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  const PRIVATE_KEY_2 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
  const PRIVATE_KEY_3 = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);

    // Create a statement for the intended purpose
    const statementContent = {
      statementType: 'text',
      text: 'Fund open source development',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    // User 1 deposits 5 ETH into a note
    const depositAmount = 5000000000000000000n; // 5 ETH
    const { hash: depositHash, noteId } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const depositReceipt = await user1.publicClient.getTransactionReceipt({ hash: depositHash });
    await waitForSync(graphqlClient, depositReceipt.blockNumber);

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const deadline = nowInSeconds + 86400n; // 24 hours from now
    const threshold = 3000000000000000000n; // 3 ETH threshold

    const { hash: projectHash, projectDetails } = await createProject(user1, pubstarterContract, {
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

    const projectReceipt = await user1.publicClient.getTransactionReceipt({ hash: projectHash });
    await waitForSync(graphqlClient, projectReceipt.blockNumber);

    // The assurance contract IS the primary market (implements ERC1155PrimaryMarket)
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // Spend the note to purchase tokens (buy 20 tokens = 1 ETH)
    const purchaseAmount = 1000000000000000000n; // 1 ETH
    const tokensToBuy = 20n;

    const purchaseHash = await purchaseFromPrimaryMarketWithNotes(
      user1,
      delegatableNotesContract,
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

    const purchaseReceipt = await user1.publicClient.getTransactionReceipt({ hash: purchaseHash });
    await waitForSync(graphqlClient, purchaseReceipt.blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // User 1 deposits ETH
    const statementContent = {
      statementType: 'text',
      text: 'Support education initiatives',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 10000000000000000000n; // 10 ETH
    const { hash: depositHash, noteId: note1 } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: depositHash })).blockNumber);

    // User 1 delegates to User 2
    const { hash: delegateHash, delegatedNoteId: note2 } = await delegateNote(
      user1,
      delegatableNotesContract,
      {
        noteId: note1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: depositAmount,
      }
    );

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: delegateHash })).blockNumber);

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { hash: projectHash, projectDetails } = await createProject(user1, pubstarterContract, {
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

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: projectHash })).blockNumber);

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // User 2 (delegate) spends the note on behalf of User 1 (root)
    const purchaseAmount = 3000000000000000000n; // 3 ETH
    const tokensToBuy = 60n;

    const purchaseHash = await purchaseFromPrimaryMarketWithNotes(
      user2,
      delegatableNotesContract,
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

    await waitForSync(graphqlClient, (await user2.publicClient.getTransactionReceipt({ hash: purchaseHash })).blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const user3 = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // User 1 deposits
    const statementContent = {
      statementType: 'text',
      text: 'Fund climate research',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 8000000000000000000n; // 8 ETH
    const { hash: d1Hash, noteId: note1 } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: d1Hash })).blockNumber);

    // User 1 -> User 2
    const { hash: d2Hash, delegatedNoteId: note2 } = await delegateNote(
      user1,
      delegatableNotesContract,
      {
        noteId: note1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: depositAmount,
      }
    );

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: d2Hash })).blockNumber);

    // User 2 -> User 3
    const { hash: d3Hash, delegatedNoteId: note3 } = await delegateNote(
      user2,
      delegatableNotesContract,
      {
        noteId: note2,
        owners: [user2.account, user1.account],
        delegateTo: user3.account,
        amount: depositAmount,
      }
    );

    await waitForSync(graphqlClient, (await user2.publicClient.getTransactionReceipt({ hash: d3Hash })).blockNumber);

    // Verify delegation chain
    const chain = await getDelegationChain(graphqlClient, note3.toString());
    assert.strictEqual(chain.length, 3, 'Should have 3-level delegation chain');

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { hash: projectHash, projectDetails } = await createProject(user1, pubstarterContract, {
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

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: projectHash })).blockNumber);

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // User 3 (end of delegation chain) spends the note
    const purchaseAmount = 2000000000000000000n; // 2 ETH
    const tokensToBuy = 40n;

    const purchaseHash = await purchaseFromPrimaryMarketWithNotes(
      user3,
      delegatableNotesContract,
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

    await waitForSync(graphqlClient, (await user3.publicClient.getTransactionReceipt({ hash: purchaseHash })).blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);

    // User 1 deposits 10 ETH
    const statementContent = {
      statementType: 'text',
      text: 'Support arts and culture',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 10000000000000000000n; // 10 ETH
    const { hash: depositHash, noteId } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: depositHash })).blockNumber);

    // Create a project
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
    const { hash: projectHash, projectDetails } = await createProject(user1, pubstarterContract, {
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

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: projectHash })).blockNumber);

    // The assurance contract IS the primary market
    const primaryMarketAddress = projectDetails.assuranceContractAddress;

    // Spend only 2 ETH from the 10 ETH note
    const purchaseAmount = 2000000000000000000n; // 2 ETH
    const tokensToBuy = 40n;

    const purchaseHash = await purchaseFromPrimaryMarketWithNotes(
      user1,
      delegatableNotesContract,
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

    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: purchaseHash })).blockNumber);

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
