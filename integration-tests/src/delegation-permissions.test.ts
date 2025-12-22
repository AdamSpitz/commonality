/**
 * Delegation Permissions & Authorization Edge Cases Test
 *
 * Tests permission and authorization edge cases for delegation:
 * - Only note owner can delegate/revoke
 * - Only parent in chain can revoke
 * - Cannot delegate/spend/revoke someone else's note
 * - Cannot spend revoked notes
 */

import assert from 'assert';
import { parseEther } from 'viem';
import {
  delegateNote,
  revokeNote,
  reclaimFunds,
  cidToBytes32,
  uploadToIPFS,
  type DelegatableNotesContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  waitForSync,
} from '@commonality/sdk';
import { DelegatableNotesAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import {
  depositETHChecked,
  delegateNoteChecked,
  revokeNoteChecked,
} from './delegation-actions-checked.js';

describe('Delegation Permissions Edge Cases', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'delegation-permissions';

  it('should prevent non-owner from delegating a note', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    // Create a statement CID
    const statementCid = cidToBytes32(await uploadToIPFS({
      statementType: 'text',
      text: 'Test statement for permission test',
    }));

    // Alice creates a note (with checked wrapper)
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
      intendedStatementId: statementCid,
    });

    testLog(`  Note created: ${noteId}`);

    // Bob (not the owner) tries to delegate Alice's note to Charlie
    testLog('  Bob attempting to delegate Alice\'s note (should fail)...');

    let delegationFailed = false;
    try {
      await delegateNote(bobClients, contract, {
        noteId,
        owners: [aliceClients.account], // Claiming Alice is the owner
        delegateTo: charlieClients.account,
        amount: parseEther('0.5'),
      });
    } catch (error) {
      // Transaction should revert
      delegationFailed = true;
      testLog('  ✓ Delegation failed as expected');
    }

    assert.ok(delegationFailed, 'Non-owner delegation should fail');
  });

  it('should prevent non-parent from revoking a delegated note', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    const statementCid = cidToBytes32(await uploadToIPFS({
      statementType: 'text',
      text: 'Test statement for revocation permission test',
    }));

    // Alice creates a note (with checked wrapper)
    testLog('  Alice creating note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
      intendedStatementId: statementCid,
    });

    // Alice delegates to Bob (with checked wrapper)
    testLog('  Alice delegating note to Bob...');
    const { delegatedNoteId } = await delegateNoteChecked(
      aliceClients,
      contract,
      graphqlClient,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: bobClients.account,
        amount: parseEther('1.0'),
      }
    );

    testLog(`  Note delegated to Bob: ${delegatedNoteId}`);

    // Charlie (not in the delegation chain) tries to revoke the note
    testLog('  Charlie attempting to revoke Bob\'s note (should fail)...');

    let revocationFailed = false;
    try {
      await revokeNote(charlieClients, contract, {
        noteId: delegatedNoteId,
        owners: [bobClients.account, aliceClients.account],
      });
    } catch (error) {
      // Transaction should revert
      revocationFailed = true;
      testLog('  ✓ Revocation failed as expected');
    }

    assert.ok(revocationFailed, 'Non-parent revocation should fail');
  });

  it('should prevent delegating a revoked note', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    const statementCid = cidToBytes32(await uploadToIPFS({
      statementType: 'text',
      text: 'Test statement for revoked note test',
    }));

    // Alice creates a note (with checked wrapper)
    testLog('  Alice creating note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
      intendedStatementId: statementCid,
    });

    // Alice delegates to Bob (with checked wrapper)
    testLog('  Alice delegating note to Bob...');
    const { delegatedNoteId } = await delegateNoteChecked(
      aliceClients,
      contract,
      graphqlClient,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: bobClients.account,
        amount: parseEther('1.0'),
      }
    );

    testLog(`  Note delegated to Bob: ${delegatedNoteId}`);

    // Alice revokes the note (with checked wrapper)
    testLog('  Alice revoking the note...');
    await revokeNoteChecked(aliceClients, contract, graphqlClient, {
      noteId: delegatedNoteId,
      owners: [bobClients.account, aliceClients.account],
    });

    // Bob tries to delegate the revoked note to Charlie
    testLog('  Bob attempting to delegate revoked note (should fail)...');

    let delegationFailed = false;
    try {
      await delegateNote(bobClients, contract, {
        noteId: delegatedNoteId,
        owners: [bobClients.account, aliceClients.account],
        delegateTo: charlieClients.account,
        amount: parseEther('0.5'),
      });
    } catch (error) {
      // Transaction should revert
      delegationFailed = true;
      testLog('  ✓ Delegation of revoked note failed as expected');
    }

    assert.ok(delegationFailed, 'Delegation of revoked note should fail');
  });

  it('should prevent non-owner from reclaiming funds', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    const statementCid = cidToBytes32(await uploadToIPFS({
      statementType: 'text',
      text: 'Test statement for reclaim permission test',
    }));

    // Alice creates a note (with checked wrapper)
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
      intendedStatementId: statementCid,
    });

    testLog(`  Note created: ${noteId}`);

    // Bob tries to reclaim Alice's funds
    testLog('  Bob attempting to reclaim Alice\'s funds (should fail)...');

    let reclaimFailed = false;
    try {
      await reclaimFunds(bobClients, contract, noteId);
    } catch (error) {
      // Transaction should revert
      reclaimFailed = true;
      testLog('  ✓ Reclaim failed as expected');
    }

    assert.ok(reclaimFailed, 'Non-owner reclaim should fail');
  });

  it('should allow parent to revoke note from child', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    const statementCid = cidToBytes32(await uploadToIPFS({
      statementType: 'text',
      text: 'Test statement for valid revocation test',
    }));

    // Alice creates a note (with checked wrapper)
    testLog('  Alice creating note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
      intendedStatementId: statementCid,
    });

    // Alice delegates to Bob (with checked wrapper)
    testLog('  Alice delegating note to Bob...');
    const { delegatedNoteId } = await delegateNoteChecked(
      aliceClients,
      contract,
      graphqlClient,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: bobClients.account,
        amount: parseEther('1.0'),
      }
    );

    testLog(`  Note delegated to Bob: ${delegatedNoteId}`);

    // Alice (the parent) revokes the note - this should succeed (with checked wrapper)
    testLog('  Alice revoking note from Bob (should succeed)...');
    const tx = await revokeNoteChecked(aliceClients, contract, graphqlClient, {
      noteId: delegatedNoteId,
      owners: [bobClients.account, aliceClients.account],
    });

    testLog(`  ✓ Revocation succeeded: ${tx}`);
    // The checked wrapper automatically verifies the revocation properties and invariants
  });
});
