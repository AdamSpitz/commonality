/**
 * Delegation Permissions & Authorization Edge Cases Test
 *
 * Tests permission and authorization edge cases for delegation:
 * - Only note owner can delegate/revoke
 * - Only parent in chain can revoke
 * - Cannot delegate/spend/revoke someone else's note
 * - Cannot spend revoked notes
 *
 * This test demonstrates the use of the expectFailure framework for
 * systematic negative testing. All failing actions verify:
 * 1. The action throws an error
 * 2. State remains unchanged (verified by state transition properties)
 * 3. Invariants still hold after the failed action
 */

import assert from 'assert';
import { parseEther } from 'viem';
import {
  createStatement,
  publishDocument,
  type DelegatableNotesContract,
  DelegatableNotesAbi,
  type IPFSConfig,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import {
  depositETHChecked,
  delegateNoteChecked,
  revokeNoteChecked,
  reclaimFundsChecked,
} from './delegation-actions-checked.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';


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
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    // Create a statement
    await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Test statement for permission test',
    }));

    // Alice creates a note
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, machinery, {
      amount: parseEther('1.0'),
    });

    testLog(`  Note created: ${noteId}`);

    // Bob (not the owner) tries to delegate Alice's note to Charlie
    // Using expectFailure framework - automatically verifies:
    // 1. Action throws an error
    // 2. State remains unchanged
    // 3. Invariants still hold
    testLog('  Bob attempting to delegate Alice\'s note (should fail)...');

    const result = await delegateNoteChecked(
      bobClients,
      contract,
      machinery,
      {
        noteId,
        owners: [aliceClients.account], // Claiming Alice is the owner
        delegateTo: charlieClients.account,
        amount: parseEther('0.5'),
      },
      {
        expectFailure: true,
        expectedError: /revert/i,
      }
    );

    // Result should be undefined for failed actions
    assert.strictEqual(result, undefined, 'Failed action should return undefined');
    testLog('  ✓ Delegation failed as expected and state remained unchanged');
  });

  it('should prevent non-parent from revoking a delegated note', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Test statement for revocation permission test',
    }));

    // Alice creates a note
    testLog('  Alice creating note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, machinery, {
      amount: parseEther('1.0'),
    });

    // Alice delegates to Bob
    testLog('  Alice delegating note to Bob...');
    const { delegatedNoteId } = await delegateNoteChecked(
      aliceClients,
      contract,
      machinery,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: bobClients.account,
        amount: parseEther('1.0'),
      }
    );

    testLog(`  Note delegated to Bob: ${delegatedNoteId}`);

    // Charlie (not in the delegation chain) tries to revoke the note
    // Using expectFailure framework
    testLog('  Charlie attempting to revoke Bob\'s note (should fail)...');

    const result = await revokeNoteChecked(
      charlieClients,
      contract,
      machinery,
      {
        noteId: delegatedNoteId,
        owners: [bobClients.account, aliceClients.account],
      },
      {
        expectFailure: true,
        expectedError: /revert/i,
      }
    );

    assert.strictEqual(result, undefined, 'Failed action should return undefined');
    testLog('  ✓ Revocation failed as expected and state remained unchanged');
  });

  it('should prevent delegating a revoked note', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Test statement for revoked note test',
    }));

    // Alice creates a note
    testLog('  Alice creating note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, machinery, {
      amount: parseEther('1.0'),
    });

    // Alice delegates to Bob
    testLog('  Alice delegating note to Bob...');
    const { delegatedNoteId } = await delegateNoteChecked(
      aliceClients,
      contract,
      machinery,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: bobClients.account,
        amount: parseEther('1.0'),
      }
    );

    testLog(`  Note delegated to Bob: ${delegatedNoteId}`);

    // Alice revokes the note
    testLog('  Alice revoking the note...');
    await revokeNoteChecked(aliceClients, contract, machinery, {
      noteId: delegatedNoteId,
      owners: [bobClients.account, aliceClients.account],
    });

    // Bob tries to delegate the revoked note to Charlie
    // Using expectFailure framework
    testLog('  Bob attempting to delegate revoked note (should fail)...');

    const result = await delegateNoteChecked(
      bobClients,
      contract,
      machinery,
      {
        noteId: delegatedNoteId,
        owners: [bobClients.account, aliceClients.account],
        delegateTo: charlieClients.account,
        amount: parseEther('0.5'),
      },
      {
        expectFailure: true,
        expectedError: /revert/i,
      }
    );

    assert.strictEqual(result, undefined, 'Failed action should return undefined');
    testLog('  ✓ Delegation of revoked note failed as expected and state remained unchanged');
  });

  it('should prevent non-owner from reclaiming funds', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Test statement for reclaim permission test',
    }));

    // Alice creates a note
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, machinery, {
      amount: parseEther('1.0'),
    });

    testLog(`  Note created: ${noteId}`);

    // Bob tries to reclaim Alice's funds
    // Using expectFailure framework
    testLog('  Bob attempting to reclaim Alice\'s funds (should fail)...');

    const result = await reclaimFundsChecked(
      bobClients,
      contract,
      machinery,
      noteId,
      {
        expectFailure: true,
        expectedError: /revert/i,
      }
    );

    assert.strictEqual(result, undefined, 'Failed action should return undefined');
    testLog('  ✓ Reclaim failed as expected and state remained unchanged');
  });

  it('should allow parent to revoke note from child', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const machinery = createActionTestingMachinery(GRAPHQL_URL);

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Test statement for valid revocation test',
    }));

    // Alice creates a note (with checked wrapper)
    testLog('  Alice creating note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, machinery, {
      amount: parseEther('1.0'),
    });

    // Alice delegates to Bob (with checked wrapper)
    testLog('  Alice delegating note to Bob...');
    const { delegatedNoteId } = await delegateNoteChecked(
      aliceClients,
      contract,
      machinery,
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
    const tx = await revokeNoteChecked(aliceClients, contract, machinery, {
      noteId: delegatedNoteId,
      owners: [bobClients.account, aliceClients.account],
    });

    testLog(`  ✓ Revocation succeeded: ${tx}`);
    // The checked wrapper automatically verifies the revocation properties and invariants
  });
});
