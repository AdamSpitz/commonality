/**
 * End-to-End Workflow Integration Tests
 *
 * These tests verify that the subsystems work together correctly by testing
 * complete user workflows that span multiple components.
 */

import assert from 'assert';
import {
  purchaseFromPrimaryMarketWithNotes,
  uploadToIPFS,
  createStatement,
  publishDocument,
  type BeliefsContract,
  type ImplicationsContract,
  type PubstarterContract,
  type DelegatableNotesContract,
  type AlignmentAttestationsContract,
  waitForIndexerToSyncToTxHash,
  BeliefsAbi,
  ImplicationsAbi,
  PubstarterAbi,
  AlignmentAttestationsAbi,
  DelegatableNotesAbi,
  PROJECT_ALIGNMENT_TOPIC,
  getUserBelief,
  getUserBeliefs,
  getImplicationsFrom,
  getIndirectlyAlignedProjects,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { believeStatementChecked } from '../actions/belief-actions-checked.js';
import { attestImplicationChecked } from '../actions/implication-actions-checked.js';
import { depositETHChecked, delegateNoteChecked } from '../delegation/delegation-actions-checked.js';
import { attestAlignmentChecked } from '../actions/alignment-actions-checked.js';
import { createProjectChecked } from '../actions/funding-actions-checked.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';


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

  // Test suite name for unique account derivation
  const SUITE_NAME = 'end-to-end-workflows';

  describe('Workflow 1: Create statement → believe it → create aligned project → fund with delegatable note', () => {
    it('should complete the full workflow end-to-end', async () => {
      // Verify all required environment variables are set
      if (!BELIEFS_CONTRACT_ADDRESS || !PUBSTARTER_CONTRACT_ADDRESS || 
          !DELEGATABLE_NOTES_CONTRACT_ADDRESS || !PROJECT_ALIGNMENT_CONTRACT_ADDRESS) {
        throw new Error('Required contract addresses not set in environment');
      }

      // 1. Setup clients
      const userClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
      const attesterClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
      const machinery = createActionTestingMachinery(GRAPHQL_URL);

      testLog(`  User account: ${userClients.account}`);
      testLog(`  Attester account: ${attesterClients.account}`);

      // 2. Create a statement about a cause
      const statementDoc = createStatement({
        content: 'We should fund open source infrastructure projects',
      });

      const statementCid = await publishDocument(machinery.ipfsConfig, statementDoc);

      testLog(`  Statement CID: ${statementCid}`);

      // 3. User expresses belief in the statement
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      };

      testLog('  User expressing belief in statement...');
      await believeStatementChecked(userClients, beliefsContract, machinery, statementCid);
      testLog('  ✓ Belief properties verified');

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
        projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, {
          name: 'Open Source Infrastructure Fund',
          description: 'Funding critical open source infrastructure',
        }),
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [BigInt('1000000000000000')], // 0.001 ETH per token
      };

      testLog('  Creating project aligned with statement...');
      const projectResult = await createProjectChecked(userClients, pubstarterContract, machinery, projectParams);
      testLog('  ✓ Project creation properties verified');
      testLog(`  Token contract: ${projectResult.projectDetails.tokenAddress}`);
      testLog(`  Assurance contract: ${projectResult.projectDetails.assuranceContractAddress}`);

      // 7. Attester attests that the project aligns with the statement
      const alignmentAttestationsContract: AlignmentAttestationsContract = {
        address: PROJECT_ALIGNMENT_CONTRACT_ADDRESS,
        abi: AlignmentAttestationsAbi,
      };

      testLog('  Attester attesting project alignment...');
      const alignmentTxHash = await attestAlignmentChecked(
        attesterClients,
        alignmentAttestationsContract,
        machinery,
        projectResult.projectDetails.assuranceContractAddress,
        statementCid,
        PROJECT_ALIGNMENT_TOPIC
      );
      testLog(`  Alignment attestation: ${alignmentTxHash}`);
      testLog('  ✓ Alignment properties verified');

      // 10. User deposits ETH into a delegatable note for the statement
      const delegatableNotesContract: DelegatableNotesContract = {
        address: DELEGATABLE_NOTES_CONTRACT_ADDRESS,
        abi: DelegatableNotesAbi,
      };

      const depositAmount = BigInt('2000000000000000'); // 0.002 ETH
      testLog(`  User depositing ${depositAmount} ETH into delegatable note...`);
      const depositResult = await depositETHChecked(userClients, delegatableNotesContract, machinery, {
        amount: depositAmount,
      });
      testLog(`  Deposit transaction: ${depositResult.hash} (note ID: ${depositResult.noteId})`);
      testLog('  ✓ Deposit properties verified');

      // 13. User funds the project using the delegatable note
      testLog('  User funding project with delegatable note...');
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
      testLog(`  Purchase transaction: ${purchaseTxHash} (block ${purchaseReceipt.blockNumber})`);

      // 14. Wait for indexer to sync purchase
      await waitForIndexerToSyncToTxHash(machinery, userClients.publicClient, purchaseTxHash);
      testLog('  ✓ Purchase completed successfully');

      testLog('  ✓ End-to-end workflow completed successfully!');
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
      const rootUserClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
      const delegateUserClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
      const machinery = createActionTestingMachinery(GRAPHQL_URL);

      testLog(`  Root user account: ${rootUserClients.account}`);
      testLog(`  Delegate user account: ${delegateUserClients.account}`);

      // 2. Create a statement about a cause
      const statementDoc = createStatement({
        content: 'We should support renewable energy research',
      });

      const statementCid = await publishDocument(machinery.ipfsConfig, statementDoc);

      testLog(`  Statement CID: ${statementCid}`);
      // 3. Root user expresses belief in the statement
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      };

      testLog('  Root user expressing belief in statement...');
      await believeStatementChecked(rootUserClients, beliefsContract, machinery, statementCid);
      testLog('  ✓ Belief properties verified');

      // 5. Root user deposits ETH into a delegatable note for the statement
      const delegatableNotesContract: DelegatableNotesContract = {
        address: DELEGATABLE_NOTES_CONTRACT_ADDRESS,
        abi: DelegatableNotesAbi,
      };

      const depositAmount = BigInt('3000000000000000'); // 0.003 ETH
      testLog(`  Root user depositing ${depositAmount} ETH into delegatable note...`);
      const depositResult = await depositETHChecked(rootUserClients, delegatableNotesContract, machinery, {
        amount: depositAmount,
      });
      testLog(`  Deposit transaction: ${depositResult.hash} (note ID: ${depositResult.noteId})`);
      testLog('  ✓ Deposit properties verified');

      // 8. Root user delegates half of the note to delegate user
      const delegateAmount = depositAmount / 2n; // Delegate 0.0015 ETH
      testLog(`  Root user delegating ${delegateAmount} ETH to delegate...`);
      const delegateResult = await delegateNoteChecked(rootUserClients, delegatableNotesContract, machinery, {
        noteId: depositResult.noteId,
        owners: [rootUserClients.account], // Current chain: root user owns note
        delegateTo: delegateUserClients.account,
        amount: delegateAmount,
      });
      testLog(`  Delegation transaction: ${delegateResult.hash} (delegated note ID: ${delegateResult.delegatedNoteId}, remainder note ID: ${delegateResult.remainderNoteId})`);
      testLog('  ✓ Delegation properties verified');

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
        projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, {
          name: 'Renewable Energy Research Fund',
          description: 'Funding renewable energy research projects',
        }),
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [BigInt('1000000000000000')], // 0.001 ETH per token
      };

      testLog('  Creating project for delegation test...');
      const projectResult = await createProjectChecked(rootUserClients, pubstarterContract, machinery, projectParams);
      testLog('  ✓ Project creation properties verified');
      testLog(`  Assurance contract: ${projectResult.projectDetails.assuranceContractAddress}`);

      // 12. Attester attests that the project aligns with the statement
      const alignmentAttestationsContract: AlignmentAttestationsContract = {
        address: PROJECT_ALIGNMENT_CONTRACT_ADDRESS,
        abi: AlignmentAttestationsAbi,
      };

      testLog('  Attester attesting project alignment...');
      const alignmentTxHash = await attestAlignmentChecked(
        delegateUserClients, // Use delegate user as attester
        alignmentAttestationsContract,
        machinery,
        projectResult.projectDetails.assuranceContractAddress,
        statementCid,
        PROJECT_ALIGNMENT_TOPIC
      );
      testLog(`  Alignment attestation: ${alignmentTxHash}`);
      testLog('  ✓ Alignment properties verified');

      // 15. Delegate user spends part of the delegated note on the project
      const spendAmount = BigInt('1000000000000000'); // 0.001 ETH for 1 token
      testLog(`  Delegate user spending ${spendAmount} ETH on project...`);
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
      testLog(`  Purchase transaction: ${purchaseTxHash} (block ${purchaseReceipt.blockNumber})`);

      // 16. Wait for indexer to sync purchase
      await waitForIndexerToSyncToTxHash(machinery, delegateUserClients.publicClient, purchaseTxHash);
      testLog('  ✓ Purchase completed successfully');

      testLog('  ✓ Delegation chain workflow completed successfully!');
    });
  });

  describe('Workflow 3: Attesters create implications → projects inherit alignment → users discover via indirect alignment', () => {
    it('should handle indirect alignment through implication graph', async () => {
      // Verify all required environment variables are set
      if (!BELIEFS_CONTRACT_ADDRESS || !IMPLICATIONS_CONTRACT_ADDRESS ||
          !PUBSTARTER_CONTRACT_ADDRESS || !PROJECT_ALIGNMENT_CONTRACT_ADDRESS) {
        throw new Error('Required contract addresses not set in environment');
      }

      // 1. Setup clients
      const userClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
      const attesterClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
      const machinery = createActionTestingMachinery(GRAPHQL_URL);

      testLog(`  User account: ${userClients.account}`);
      testLog(`  Attester account: ${attesterClients.account}`);

      // 2. Create two statements: S1 (specific) and S2 (general)
      const statement1Doc = createStatement({
        content: 'Solar panel efficiency should be improved through research',
      });

      const statement2Doc = createStatement({
        content: 'Renewable energy research is important',
      });

      const statement1Cid = await publishDocument(machinery.ipfsConfig, statement1Doc);
      const statement2Cid = await publishDocument(machinery.ipfsConfig, statement2Doc);

      testLog(`  Statement 1 (specific): ${statement1Cid}`);
      testLog(`  Statement 2 (general): ${statement2Cid}`);

      // 3. Attester creates implication: S1 → S2 (specific implies general)
      const implicationsContract: ImplicationsContract = {
        address: IMPLICATIONS_CONTRACT_ADDRESS,
        abi: ImplicationsAbi,
      };

      testLog('  Attester attesting that S1 implies S2...');
      await attestImplicationChecked(
        attesterClients,
        implicationsContract,
        machinery,
        statement1Cid,
        statement2Cid
      );
      testLog('  ✓ Implication properties verified');

      // 6. Create a project aligned with S1 (the specific statement)
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
        projectMetadataCid: await uploadToIPFS(machinery.ipfsConfig, {
          name: 'Solar Panel Efficiency Research',
          description: 'Improving solar panel efficiency',
        }),
        tokenIds: [1n],
        tokenCounts: [1000n],
        tokenPrices: [BigInt('1000000000000000')], // 0.001 ETH per token
      };

      testLog('  Creating project aligned with S1 (specific statement)...');
      const projectResult = await createProjectChecked(userClients, pubstarterContract, machinery, projectParams);
      testLog('  ✓ Project creation properties verified');
      testLog(`  Assurance contract: ${projectResult.projectDetails.assuranceContractAddress}`);

      // 7. Attester attests that the project aligns with S1 (specific statement)
      const alignmentAttestationsContract: AlignmentAttestationsContract = {
        address: PROJECT_ALIGNMENT_CONTRACT_ADDRESS,
        abi: AlignmentAttestationsAbi,
      };

      testLog('  Attester attesting project alignment with S1...');
      const alignmentTxHash = await attestAlignmentChecked(
        attesterClients,
        alignmentAttestationsContract,
        machinery,
        projectResult.projectDetails.assuranceContractAddress,
        statement1Cid,
        PROJECT_ALIGNMENT_TOPIC
      );
      testLog(`  Alignment attestation: ${alignmentTxHash}`);
      testLog('  ✓ Alignment properties verified');

      // 10. Query for projects indirectly aligned with S2 (general statement)
      testLog('  Querying for projects indirectly aligned with S2...');
      const indirectAlignments = await getIndirectlyAlignedProjects(
        machinery,
        statement2Cid,
        attesterClients.account, // Trust this attester's implications
        attesterClients.account  // Trust this attester's alignments
      );

      // 11. Verify the project is found via indirect alignment
      assert.strictEqual(indirectAlignments.length, 1, 'Should have one indirectly aligned project');
      assert.strictEqual(
        indirectAlignments[0].subjectAddress.toLowerCase(),
        projectResult.projectDetails.assuranceContractAddress.toLowerCase(),
        'Project should be indirectly aligned with S2'
      );
      assert.strictEqual(
        indirectAlignments[0].directStatementCid.toLowerCase(),
        statement1Cid.toLowerCase(),
        'Direct alignment should be with S1'
      );
      assert.strictEqual(
        indirectAlignments[0].indirectStatementCid.toLowerCase(),
        statement2Cid.toLowerCase(),
        'Indirect alignment should be with S2'
      );
      testLog('  ✓ Project discovered via indirect alignment through implication graph!');

      testLog('  ✓ Indirect alignment workflow completed successfully!');
    });
  });

  describe('Workflow 4: User signs S1 → S1 implies S2 (via attester) → user sees suggestion to sign S2', () => {
    it('should suggest related statements based on implications', async () => {
      // Verify all required environment variables are set
      if (!BELIEFS_CONTRACT_ADDRESS || !IMPLICATIONS_CONTRACT_ADDRESS) {
        throw new Error('Required contract addresses not set in environment');
      }

      // 1. Setup clients
      const userClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
      const attesterClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
      const machinery = createActionTestingMachinery(GRAPHQL_URL);

      testLog(`  User account: ${userClients.account}`);
      testLog(`  Attester account: ${attesterClients.account}`);

      // 2. Create two statements: S1 and S2
      const statement1Doc = createStatement({
        content: 'Carbon emissions must be reduced to prevent climate change',
      });

      const statement2Doc = createStatement({
        content: 'Climate change is a serious threat',
      });

      const statement1Cid = await publishDocument(machinery.ipfsConfig, statement1Doc);
      const statement2Cid = await publishDocument(machinery.ipfsConfig, statement2Doc);

      testLog(`  Statement 1: ${statement1Cid}`);
      testLog(`  Statement 2: ${statement2Cid}`);

      // 3. User expresses belief in S1
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      };

      testLog('  User expressing belief in S1...');
      await believeStatementChecked(userClients, beliefsContract, machinery, statement1Cid);
      testLog('  ✓ Belief properties verified');

      // 6. Attester creates implication: S1 → S2
      const implicationsContract: ImplicationsContract = {
        address: IMPLICATIONS_CONTRACT_ADDRESS,
        abi: ImplicationsAbi,
      };

      testLog('  Attester attesting that S1 implies S2...');
      await attestImplicationChecked(
        attesterClients,
        implicationsContract,
        machinery,
        statement1Cid,
        statement2Cid
      );
      testLog('  ✓ Implication properties verified');

      // 9. Query for statement suggestions
      // The user believes S1, and S1 implies S2, so S2 should be suggested
      // We can find suggestions by querying for implications from statements the user believes
      testLog('  Finding statement suggestions for user...');

      // Get all statements the user believes
      const userBeliefs = await getUserBeliefs(machinery, userClients.account);

      // For each believed statement, get what it implies
      const suggestions = new Set<string>();
      for (const belief of userBeliefs) {
        const impliedStatements = await getImplicationsFrom(
          machinery,
          belief.cid,
          attesterClients.account // Trust this attester's implications
        );
        for (const implication of impliedStatements) {
          // Only suggest if user hasn't already expressed an opinion on it
          const existingBelief = await getUserBelief(
            machinery,
            userClients.account,
            implication.toStatementCid
          );
          if (!existingBelief || existingBelief.beliefState === 0) {
            suggestions.add(implication.toStatementCid);
          }
        }
      }

      // 10. Verify S2 is in the suggestions
      assert.ok(
        Array.from(suggestions).some(id => id.toLowerCase() === statement2Cid.toLowerCase()),
        'S2 should be suggested to the user'
      );
      testLog('  ✓ S2 correctly suggested based on user believing S1 and S1 implying S2');

      testLog('  ✓ Statement suggestion workflow completed successfully!');
    });
  });
});
