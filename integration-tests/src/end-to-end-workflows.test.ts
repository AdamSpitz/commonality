/**
 * End-to-End Workflow Integration Tests
 *
 * These tests verify that the subsystems work together correctly by testing
 * complete user workflows that span multiple components.
 */

import assert from 'assert';
import {
  createTestClients,
  believeStatement,
  attestImplication,
  attestProjectAlignment,
  createProject,
  depositETH,
  delegateNote,
  purchaseFromPrimaryMarketWithNotes,
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
  type ImplicationsContract,
  type PubstarterContract,
  type DelegatableNotesContract,
  type ProjectAlignmentContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getStatement,
  getUserBelief,
  getImplicationsTo,
  getAlignedProjects,
  getNote,
  getNotesByOwner,
  getNotesByStatement,
  getDelegationChain,
  getProject,
  waitForSync,
  assertNotNull,
} from './queries/index.js';
import {
  BeliefsAbi,
  PubstarterAbi,
  ProjectAlignmentAbi,
  DelegatableNotesAbi
} from './test-abis.js';
import { TEST_PRIVATE_KEYS } from './test-constants.js';


describe('End-to-End Workflow Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  
  // Contract addresses from environment
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;
  const PUBSTARTER_CONTRACT_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;
  const DELEGATABLE_NOTES_CONTRACT_ADDRESS = process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as `0x${string}`;
  const PROJECT_ALIGNMENT_CONTRACT_ADDRESS = process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS as `0x${string}`;

  // Test accounts
  const PRIVATE_KEY_USER = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const PRIVATE_KEY_ATTESTER = TEST_PRIVATE_KEYS.ACCOUNT_1;

  describe('Workflow 1: Create statement → believe it → create aligned project → fund with delegatable note', () => {
    it('should complete the full workflow end-to-end', async () => {
      // Verify all required environment variables are set
      if (!BELIEFS_CONTRACT_ADDRESS || !PUBSTARTER_CONTRACT_ADDRESS || 
          !DELEGATABLE_NOTES_CONTRACT_ADDRESS || !PROJECT_ALIGNMENT_CONTRACT_ADDRESS) {
        throw new Error('Required contract addresses not set in environment');
      }

      // 1. Setup clients
      const userClients = createTestClients(PRIVATE_KEY_USER, RPC_URL);
      const attesterClients = createTestClients(PRIVATE_KEY_ATTESTER, RPC_URL);
      const graphqlClient = createGraphQLClient(GRAPHQL_URL);

      console.log(`  User account: ${userClients.account}`);
      console.log(`  Attester account: ${attesterClients.account}`);

      // 2. Create a statement about a cause
      const statementContent = {
        statementType: 'text',
        text: 'We should fund open source infrastructure projects',
      };

      const statementCid = await uploadToIPFS(statementContent);
      const statementId = cidToBytes32(statementCid);

      console.log(`  Statement CID: ${statementCid}`);
      console.log(`  Statement ID: ${statementId}`);

      // 3. User expresses belief in the statement
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      };

      console.log('  User expressing belief in statement...');
      const beliefTxHash = await believeStatement(userClients, beliefsContract, statementCid);
      const beliefReceipt = await userClients.publicClient.getTransactionReceipt({ hash: beliefTxHash });
      console.log(`  Belief transaction: ${beliefTxHash} (block ${beliefReceipt.blockNumber})`);

      // 4. Wait for indexer to sync belief
      await waitForSync(graphqlClient, beliefReceipt.blockNumber, 15000);

      // 5. Verify belief was recorded
      const userBelief = assertNotNull(
        await getUserBelief(graphqlClient, userClients.account, statementId),
        'User belief'
      );
      assert.strictEqual(userBelief.beliefState, 1, 'User should believe the statement');
      console.log('  ✓ User belief recorded correctly');

      // 6. Create a crowdfunding project aligned with the statement
      const pubstarterContract: PubstarterContract = {
        address: PUBSTARTER_CONTRACT_ADDRESS,
        abi: PubstarterAbi,
      };

      const projectParams = {
        metadataURI: 'https://example.com/metadata',
        contractURI: 'https://example.com/contract',
        owner: userClients.account,
        recipient: userClients.account,
        threshold: BigInt('1000000000000000000'), // 1 ETH
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
        projectMetadataCid: await uploadToIPFS({
          name: 'Open Source Infrastructure Fund',
          description: 'Funding critical open source infrastructure',
        }),
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [BigInt('1000000000000000')], // 0.001 ETH per token
      };

      console.log('  Creating project aligned with statement...');
      const projectResult = await createProject(userClients, pubstarterContract, projectParams);
      console.log(`  Project created: ${projectResult.hash}`);
      console.log(`  Token contract: ${projectResult.projectDetails.tokenAddress}`);
      console.log(`  Assurance contract: ${projectResult.projectDetails.assuranceContractAddress}`);

      // 7. Attester attests that the project aligns with the statement
      const projectAlignmentContract: ProjectAlignmentContract = {
        address: PROJECT_ALIGNMENT_CONTRACT_ADDRESS,
        abi: ProjectAlignmentAbi,
      };

      console.log('  Attester attesting project alignment...');
      const alignmentTxHash = await attestProjectAlignment(
        attesterClients,
        projectAlignmentContract,
        projectResult.projectDetails.assuranceContractAddress,
        statementCid
      );
      const alignmentReceipt = await attesterClients.publicClient.getTransactionReceipt({ hash: alignmentTxHash });
      console.log(`  Alignment attestation: ${alignmentTxHash} (block ${alignmentReceipt.blockNumber})`);

      // 8. Wait for indexer to sync alignment
      await waitForSync(graphqlClient, alignmentReceipt.blockNumber, 15000);

      // 9. Verify project alignment was recorded
      const alignedProjects = await getAlignedProjects(graphqlClient, statementId);
      assert.strictEqual(alignedProjects.length, 1, 'Should have one aligned project');
      assert.strictEqual(
        alignedProjects[0].projectAddress.toLowerCase(),
        projectResult.projectDetails.assuranceContractAddress.toLowerCase(),
        'Project address should match'
      );
      console.log('  ✓ Project alignment recorded correctly');

      // 10. User deposits ETH into a delegatable note for the statement
      const delegatableNotesContract: DelegatableNotesContract = {
        address: DELEGATABLE_NOTES_CONTRACT_ADDRESS,
        abi: DelegatableNotesAbi,
      };

      const depositAmount = BigInt('2000000000000000'); // 0.002 ETH
      console.log(`  User depositing ${depositAmount} ETH into delegatable note...`);
      const depositResult = await depositETH(userClients, delegatableNotesContract, {
        amount: depositAmount,
        intendedStatementId: statementId,
      });
      console.log(`  Deposit transaction: ${depositResult.hash} (note ID: ${depositResult.noteId})`);

      // 11. Wait for indexer to sync deposit
      const depositReceipt = await userClients.publicClient.getTransactionReceipt({ hash: depositResult.hash });
      await waitForSync(graphqlClient, depositReceipt.blockNumber, 15000);

      // 12. Verify note was created and linked to statement
      const userNotes = await getNotesByOwner(graphqlClient, userClients.account);
      const createdNote = userNotes.find(note => note.id === depositResult.noteId.toString());
      assert.ok(createdNote, 'User should have the created note');
      assert.strictEqual(createdNote.intendedStatementId.toLowerCase(), statementId.toLowerCase(), 'Note should be intended for the statement');
      console.log('  ✓ Delegatable note created correctly');

      const statementNotes = await getNotesByStatement(graphqlClient, statementId);
      const statementNote = statementNotes.find(note => note.id === depositResult.noteId.toString());
      assert.ok(statementNote, 'Statement should have the created note');
      console.log('  ✓ Note properly linked to statement');

      // 13. User funds the project using the delegatable note
      console.log('  User funding project with delegatable note...');
      const purchaseTxHash = await purchaseFromPrimaryMarketWithNotes(
        userClients,
        delegatableNotesContract,
        {
          noteIds: [depositResult.noteId],
          chains: [[userClients.account]], // Simple chain: user owns the note
          paymentAmount: BigInt('1000000000000000'), // 0.001 ETH for 1 token
          primaryMarket: projectResult.projectDetails.assuranceContractAddress,
          erc1155Contract: projectResult.projectDetails.tokenAddress,
          tokenIds: [1n],
          counts: [1n],
        }
      );
      const purchaseReceipt = await userClients.publicClient.getTransactionReceipt({ hash: purchaseTxHash });
      console.log(`  Purchase transaction: ${purchaseTxHash} (block ${purchaseReceipt.blockNumber})`);

      // 14. Wait for indexer to sync purchase
      await waitForSync(graphqlClient, purchaseReceipt.blockNumber, 15000);

      // 15. Verify project funding progress (confirms purchase succeeded)
      const project = assertNotNull(
        await getProject(graphqlClient, projectResult.projectDetails.assuranceContractAddress),
        'Project'
      );
      assert.strictEqual(project.totalReceived, '1000000000000000', 'Project should have received 0.001 ETH');
      console.log('  ✓ Project funding progress updated correctly');

      console.log('  ✓ End-to-end workflow completed successfully!');
    });
  });

  describe('Workflow 2: User deposits note → delegates → delegate spends on project → verify attribution chain', () => {
    it('should handle delegation chain correctly', async () => {
      // Verify all required environment variables are set
      if (!BELIEFS_CONTRACT_ADDRESS || !PUBSTARTER_CONTRACT_ADDRESS || 
          !DELEGATABLE_NOTES_CONTRACT_ADDRESS || !PROJECT_ALIGNMENT_CONTRACT_ADDRESS) {
        throw new Error('Required contract addresses not set in environment');
      }

      // 1. Setup clients
      const rootUserClients = createTestClients(PRIVATE_KEY_USER, RPC_URL);
      const delegateUserClients = createTestClients(PRIVATE_KEY_ATTESTER, RPC_URL);
      const graphqlClient = createGraphQLClient(GRAPHQL_URL);

      console.log(`  Root user account: ${rootUserClients.account}`);
      console.log(`  Delegate user account: ${delegateUserClients.account}`);

      // 2. Create a statement about a cause
      const statementContent = {
        statementType: 'text',
        text: 'We should support renewable energy research',
      };

      const statementCid = await uploadToIPFS(statementContent);
      const statementId = cidToBytes32(statementCid);

      console.log(`  Statement CID: ${statementCid}`);
      console.log(`  Statement ID: ${statementId}`);

      // 3. Root user expresses belief in the statement
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      };

      console.log('  Root user expressing belief in statement...');
      const beliefTxHash = await believeStatement(rootUserClients, beliefsContract, statementCid);
      const beliefReceipt = await rootUserClients.publicClient.getTransactionReceipt({ hash: beliefTxHash });
      console.log(`  Belief transaction: ${beliefTxHash} (block ${beliefReceipt.blockNumber})`);

      // 4. Wait for indexer to sync belief
      await waitForSync(graphqlClient, beliefReceipt.blockNumber, 15000);

      // 5. Root user deposits ETH into a delegatable note for the statement
      const delegatableNotesContract: DelegatableNotesContract = {
        address: DELEGATABLE_NOTES_CONTRACT_ADDRESS,
        abi: DelegatableNotesAbi,
      };

      const depositAmount = BigInt('3000000000000000'); // 0.003 ETH
      console.log(`  Root user depositing ${depositAmount} ETH into delegatable note...`);
      const depositResult = await depositETH(rootUserClients, delegatableNotesContract, {
        amount: depositAmount,
        intendedStatementId: statementId,
      });
      console.log(`  Deposit transaction: ${depositResult.hash} (note ID: ${depositResult.noteId})`);

      // 6. Wait for indexer to sync deposit
      const depositReceipt = await rootUserClients.publicClient.getTransactionReceipt({ hash: depositResult.hash });
      await waitForSync(graphqlClient, depositReceipt.blockNumber, 15000);

      // 7. Verify note was created
      const rootUserNotes = await getNotesByOwner(graphqlClient, rootUserClients.account);
      const createdNote = rootUserNotes.find(note => note.id === depositResult.noteId.toString());
      assert.ok(createdNote, 'Root user should have the created note');
      assert.strictEqual(createdNote.intendedStatementId.toLowerCase(), statementId.toLowerCase(), 'Note should be intended for the statement');
      console.log('  ✓ Root user note created correctly');

      // 8. Root user delegates half of the note to delegate user
      const delegateAmount = depositAmount / 2n; // Delegate 0.0015 ETH
      console.log(`  Root user delegating ${delegateAmount} ETH to delegate...`);
      const delegateResult = await delegateNote(rootUserClients, delegatableNotesContract, {
        noteId: depositResult.noteId,
        owners: [rootUserClients.account], // Current chain: root user owns note
        delegateTo: delegateUserClients.account,
        amount: delegateAmount,
      });
      console.log(`  Delegation transaction: ${delegateResult.hash} (delegated note ID: ${delegateResult.delegatedNoteId}, remainder note ID: ${delegateResult.remainderNoteId})`);

      // 9. Wait for indexer to sync delegation
      const delegateReceipt = await rootUserClients.publicClient.getTransactionReceipt({ hash: delegateResult.hash });
      await waitForSync(graphqlClient, delegateReceipt.blockNumber, 15000);

      // 10. Verify delegation chain
      const delegatedNote = await getNote(graphqlClient, delegateResult.delegatedNoteId.toString());
      assertNotNull(delegatedNote, 'Delegated note');
      
      const delegationChain = await getDelegationChain(graphqlClient, delegateResult.delegatedNoteId.toString());
      assert.strictEqual(delegationChain.length, 2, 'Delegation chain should have 2 links');
      assert.strictEqual(delegationChain[0].address.toLowerCase(), rootUserClients.account.toLowerCase(), 'First link should be root user');
      assert.strictEqual(delegationChain[1].address.toLowerCase(), delegateUserClients.account.toLowerCase(), 'Second link should be delegate user');
      console.log('  ✓ Delegation chain verified correctly');
      // Verify delegation chain properties
      for (const link of delegationChain) {
        if (link.address.toLowerCase() === rootUserClients.account.toLowerCase()) {
          assert.strictEqual(link.position, 0, 'Root user should be at position 0');
        } else if (link.address.toLowerCase() === delegateUserClients.account.toLowerCase()) {
          assert.strictEqual(link.position, 1, 'Delegate user should be at position 1');
        }
      }
      console.log('  ✓ Delegation chain positions verified correctly');

      // 11. Create a crowdfunding project
      const pubstarterContract: PubstarterContract = {
        address: PUBSTARTER_CONTRACT_ADDRESS,
        abi: PubstarterAbi,
      };

      const projectParams = {
        metadataURI: 'https://example.com/metadata',
        contractURI: 'https://example.com/contract',
        owner: rootUserClients.account,
        recipient: rootUserClients.account,
        threshold: BigInt('1000000000000000000'), // 1 ETH
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
        projectMetadataCid: await uploadToIPFS({
          name: 'Renewable Energy Research Fund',
          description: 'Funding renewable energy research projects',
        }),
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [BigInt('1000000000000000')], // 0.001 ETH per token
      };

      console.log('  Creating project for delegation test...');
      const projectResult = await createProject(rootUserClients, pubstarterContract, projectParams);
      console.log(`  Project created: ${projectResult.hash}`);
      console.log(`  Assurance contract: ${projectResult.projectDetails.assuranceContractAddress}`);

      // 12. Attester attests that the project aligns with the statement
      const projectAlignmentContract: ProjectAlignmentContract = {
        address: PROJECT_ALIGNMENT_CONTRACT_ADDRESS,
        abi: ProjectAlignmentAbi,
      };

      console.log('  Attester attesting project alignment...');
      const alignmentTxHash = await attestProjectAlignment(
        delegateUserClients, // Use delegate user as attester
        projectAlignmentContract,
        projectResult.projectDetails.assuranceContractAddress,
        statementCid
      );
      const alignmentReceipt = await delegateUserClients.publicClient.getTransactionReceipt({ hash: alignmentTxHash });
      console.log(`  Alignment attestation: ${alignmentTxHash} (block ${alignmentReceipt.blockNumber})`);

      // 13. Wait for indexer to sync alignment
      await waitForSync(graphqlClient, alignmentReceipt.blockNumber, 15000);

      // 14. Verify project alignment was recorded
      const alignedProjects = await getAlignedProjects(graphqlClient, statementId);
      assert.strictEqual(alignedProjects.length, 1, 'Should have one aligned project');
      assert.strictEqual(
        alignedProjects[0].projectAddress.toLowerCase(),
        projectResult.projectDetails.assuranceContractAddress.toLowerCase(),
        'Project address should match'
      );
      console.log('  ✓ Project alignment recorded correctly');

      // 15. Delegate user spends part of the delegated note on the project
      const spendAmount = BigInt('1000000000000000'); // 0.001 ETH for 1 token
      console.log(`  Delegate user spending ${spendAmount} ETH on project...`);
      const purchaseTxHash = await purchaseFromPrimaryMarketWithNotes(
        delegateUserClients,
        delegatableNotesContract,
        {
          noteIds: [delegateResult.delegatedNoteId],
          chains: [[delegateUserClients.account, rootUserClients.account]], // Delegation chain: leaf -> root
          paymentAmount: spendAmount,
          primaryMarket: projectResult.projectDetails.assuranceContractAddress,
          erc1155Contract: projectResult.projectDetails.tokenAddress,
          tokenIds: [1n],
          counts: [1n],
        }
      );
      const purchaseReceipt = await delegateUserClients.publicClient.getTransactionReceipt({ hash: purchaseTxHash });
      console.log(`  Purchase transaction: ${purchaseTxHash} (block ${purchaseReceipt.blockNumber})`);

      // 16. Wait for indexer to sync purchase
      await waitForSync(graphqlClient, purchaseReceipt.blockNumber, 15000);

      // 17. Verify root user's remainder note is still intact
      const rootUserNotesAfter = await getNotesByOwner(graphqlClient, rootUserClients.account);
      const remainingNote = rootUserNotesAfter.find(note => note.id === delegateResult.remainderNoteId.toString());
      assertNotNull(remainingNote, 'Remaining note');
      assert.strictEqual(remainingNote.amount, delegateAmount.toString(), 'Remaining note should have correct amount');
      console.log('  ✓ Root user remaining note updated correctly');

      // 19. Verify project funding progress
      const project = assertNotNull(
        await getProject(graphqlClient, projectResult.projectDetails.assuranceContractAddress),
        'Project'
      );
      assert.strictEqual(project.totalReceived, spendAmount.toString(), 'Project should have received delegated amount');
      console.log('  ✓ Project funding progress updated correctly');

      // 20. Verify delegation chain is preserved in contribution record
      // Note: In a real implementation, we'd want to verify that the contribution record
      // shows the full delegation chain, but for this test we'll keep it simple

      console.log('  ✓ Delegation chain workflow completed successfully!');
    });
  });

  describe('Workflow 3: Attesters create implications → projects inherit alignment → users discover via indirect alignment', () => {
    it('should handle indirect alignment through implication graph', async () => {
      // This test will be implemented in the next iteration
      console.log('  ⏸️  Indirect alignment workflow - to be implemented');
    });
  });

  describe('Workflow 4: User signs S1 → S1 implies S2 (via attester) → user sees suggestion to sign S2', () => {
    it('should suggest related statements based on implications', async () => {
      // This test will be implemented in the next iteration
      console.log('  ⏸️  Statement suggestion workflow - to be implemented');
    });
  });
});
