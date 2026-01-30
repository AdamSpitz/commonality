/**
 * Action Framework Expected Failure Test
 *
 * Tests the expectFailure functionality in the action framework.
 * This demonstrates how to use expectFailure and expectedError options
 * to verify that actions fail as expected with proper error messages.
 */

import assert from 'assert';
import { parseEther } from 'viem';
import {
  delegateNote,
  cidToBytes32,
  createStatement,
  publishDocument,
  type DelegatableNotesContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
} from '@commonality/sdk';
import { DelegatableNotesAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import {
  depositETHChecked,
  delegateNoteChecked,
} from '../delegation/delegation-actions-checked.js';

describe('Action Framework Expected Failure', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'action-framework-expected-failure';

  it('should handle expectFailure with no error message check', async () => {
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
    const statementCid = cidToBytes32(await publishDocument(createStatement({
      content: 'Test statement for expectFailure test',
    })));

    // Alice creates a note
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
    });

    testLog(`  Note created: ${noteId}`);

    // Bob tries to delegate Alice's note (should fail)
    testLog('  Bob attempting to delegate Alice\'s note (should fail)...');

    // Using the expectFailure option - the framework will verify:
    // 1. The action throws an error
    // 2. The state remains unchanged
    const result = await delegateNoteChecked(
      bobClients,
      contract,
      graphqlClient,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: charlieClients.account,
        amount: parseEther('0.5'),
      },
      {
        expectFailure: true,
      }
    );

    // Result should be undefined for failed actions
    assert.strictEqual(result, undefined, 'Failed action should return undefined');

    testLog('  ✓ Delegation failed as expected and state remained unchanged');
  });

  it('should handle expectFailure with error message substring check', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    const statementCid = cidToBytes32(await publishDocument(createStatement({
      content: 'Test statement for error message check',
    })));

    // Alice creates a note
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
    });

    // Bob tries to delegate Alice's note with expectedError substring check
    testLog('  Bob attempting to delegate Alice\'s note with error check...');

    await delegateNoteChecked(
      bobClients,
      contract,
      graphqlClient,
      {
        noteId,
        owners: [aliceClients.account],
        delegateTo: charlieClients.account,
        amount: parseEther('0.5'),
      },
      {
        expectFailure: true,
        // Note: The actual error message from the contract might vary
        // This is a very permissive check - in real tests you'd be more specific
        expectedError: 'revert',
      }
    );

    testLog('  ✓ Delegation failed with expected error message');
  });

  it('should fail if action succeeds when expectFailure is true', async () => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    const contract: DelegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    const statementCid = cidToBytes32(await publishDocument(createStatement({
      content: 'Test statement for success/failure mismatch',
    })));

    // Alice creates a note
    testLog('  Alice creating a note...');
    const { noteId } = await depositETHChecked(aliceClients, contract, graphqlClient, {
      amount: parseEther('1.0'),
    });

    // Alice tries to delegate her own note (this WILL succeed)
    // But we're telling the framework to expect failure
    testLog('  Alice delegating her own note with expectFailure=true (framework should error)...');

    let frameworkErrored = false;
    try {
      await delegateNoteChecked(
        aliceClients,
        contract,
        graphqlClient,
        {
          noteId,
          owners: [aliceClients.account],
          delegateTo: bobClients.account,
          amount: parseEther('0.5'),
        },
        {
          expectFailure: true, // This is wrong - the action will succeed
        }
      );
    } catch (error: any) {
      // The framework should throw an error because the action succeeded
      // when we expected it to fail
      frameworkErrored = true;
      assert.ok(
        error.message.includes('Expected action') && error.message.includes('to fail, but it succeeded'),
        'Framework should report that action succeeded when failure was expected'
      );
      testLog('  ✓ Framework correctly detected unexpected success');
    }

    assert.ok(frameworkErrored, 'Framework should have thrown an error');
  });
});
