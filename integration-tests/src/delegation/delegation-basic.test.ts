/**
 * Delegation System Integration Tests
 *
 * Tests for delegatable notes functionality:
 * - Deposit ETH into notes
 * - Delegate notes (full and partial)
 * - Revoke delegations
 * - Reclaim funds
 * - Multi-level delegation chains
 */

import assert from 'assert';
import {
  createStatement,
  publishDocument,
  type DelegatableNotesContract,
  createGraphQLClient,
  assertNotNull,
  DelegatableNotesAbi,
} from '@commonality/sdk';
import {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
} from '../utils/graphql-helpers.js';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import {
  depositETHChecked,
  delegateNoteChecked,
  revokeNoteChecked,
  reclaimFundsChecked,
} from './delegation-actions-checked.js';

describe('Delegation System', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'delegation-basic';

  let delegatableNotesContract: DelegatableNotesContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_ADDRESS not set');
    }

    delegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should deposit ETH and create a note', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement for the intended purpose
    await publishDocument(createStatement({
      content: 'Fund education initiatives',
    }));

    // Deposit 1 ETH
    const depositAmount = 1000000000000000000n; // 1 ETH
    const { noteId } = await depositETHChecked(
      clients,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: depositAmount,
      }
    );

    // Query the note
    const note = await getNote(graphqlClient, noteId.toString());
    assertNotNull(note, 'Note');

    assert.strictEqual(note.amount, depositAmount.toString(), 'Note amount should match deposit');
    assert.strictEqual(note.token.toLowerCase(), '0x0000000000000000000000000000000000000000', 'Token should be address(0) for ETH');
    assert.strictEqual(note.tokenType, 0, 'Token type should be ERC20 (0) for ETH');
    assert.strictEqual(note.owner.toLowerCase(), clients.account.toLowerCase(), 'Owner should be depositor');
    assert.strictEqual(note.rootOwner.toLowerCase(), clients.account.toLowerCase(), 'Root should be depositor');
    assert.strictEqual(note.active, true, 'Note should be active');
  });

  it('should delegate a note to another user', async function() {
    this.timeout(20000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // User 1 deposits
    await publishDocument(createStatement({
      content: 'Support renewable energy',
    }));

    const depositAmount = 2000000000000000000n; // 2 ETH
    const { noteId } = await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: depositAmount,
      }
    );

    // User 1 delegates full amount to User 2
    const { delegatedNoteId } = await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId,
        owners: [user1.account], // Current chain: just user1
        delegateTo: user2.account,
        amount: depositAmount, // Full amount
      }
    );

    // Query the delegated note
    const delegatedNote = await getNote(graphqlClient, delegatedNoteId.toString());
    assertNotNull(delegatedNote, 'Delegated note');

    assert.strictEqual(delegatedNote.amount, depositAmount.toString(), 'Delegated note should have full amount');
    assert.strictEqual(delegatedNote.owner.toLowerCase(), user2.account.toLowerCase(), 'Owner should be user2');
    assert.strictEqual(delegatedNote.rootOwner.toLowerCase(), user1.account.toLowerCase(), 'Root should still be user1');

    // Check delegation chain depth
    const delegationChain = await getDelegationChain(graphqlClient, delegatedNoteId.toString());
    assert.strictEqual(delegationChain.length, 2, 'Delegation chain should have 2 entries (user1 -> user2)');

    // Verify user2 can query their notes
    const user2Notes = await getNotesByOwner(graphqlClient, user2.account);
    assert(user2Notes.length > 0, 'User2 should have at least one note');
    const foundNote = user2Notes.find(n => n.id === delegatedNoteId.toString());
    assert(foundNote, 'User2 should own the delegated note');
  });

  it('should support partial delegation (splitting a note)', async function() {
    this.timeout(20000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // User 1 deposits 10 ETH
    await publishDocument(createStatement({
      content: 'Fund healthcare research',
    }));

    const depositAmount = 10000000000000000000n; // 10 ETH
    const { noteId } = await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: depositAmount,
      }
    );

    // User 1 delegates 3 ETH to User 2 (partial delegation)
    const delegateAmount = 3000000000000000000n; // 3 ETH
    const { delegatedNoteId, remainderNoteId } = await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: delegateAmount,
      }
    );

    // Check delegated note (should have 3 ETH, owned by user2)
    const delegatedNote = await getNote(graphqlClient, delegatedNoteId.toString());
    assertNotNull(delegatedNote, 'Delegated note');
    assert.strictEqual(delegatedNote.amount, delegateAmount.toString(), 'Delegated note should have 3 ETH');
    assert.strictEqual(delegatedNote.owner.toLowerCase(), user2.account.toLowerCase(), 'Delegated note owner should be user2');

    // Check remainder note (should have 7 ETH, still owned by user1)
    const remainderNote = await getNote(graphqlClient, remainderNoteId.toString());
    assertNotNull(remainderNote, 'Remainder note');
    const expectedRemainder = depositAmount - delegateAmount;
    assert.strictEqual(remainderNote.amount, expectedRemainder.toString(), 'Remainder note should have 7 ETH');
    assert.strictEqual(remainderNote.owner.toLowerCase(), user1.account.toLowerCase(), 'Remainder note owner should still be user1');
  });

  it('should support multi-level delegation chains', async function() {
    this.timeout(20000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const user3 = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // User 1 deposits
    await publishDocument(createStatement({
      content: 'Support scientific research',
    }));

    const depositAmount = 5000000000000000000n; // 5 ETH
    const { noteId: note1 } = await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: depositAmount,
      }
    );

    // User 1 delegates to User 2
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

    // User 2 delegates to User 3
    const { delegatedNoteId: note3 } = await delegateNoteChecked(
      user2,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId: note2,
        owners: [user2.account, user1.account], // Chain: user2 (leaf) -> user1 (root)
        delegateTo: user3.account,
        amount: depositAmount,
      }
    );

    // Check final note
    const finalNote = await getNote(graphqlClient, note3.toString());
    assertNotNull(finalNote, 'Final note');
    assert.strictEqual(finalNote.owner.toLowerCase(), user3.account.toLowerCase(), 'Final owner should be user3');
    assert.strictEqual(finalNote.rootOwner.toLowerCase(), user1.account.toLowerCase(), 'Root should still be user1');

    // Check delegation chain (should be 3 deep: user1 -> user2 -> user3)
    const finalChain = await getDelegationChain(graphqlClient, note3.toString());
    assert.strictEqual(finalChain.length, 3, 'Delegation chain should have 3 entries');
  });

  it('should allow revoking a delegation', async function() {
    this.timeout(20000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const user3 = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // User 1 deposits
    await publishDocument(createStatement({
      content: 'Support climate action',
    }));

    const depositAmount = 4000000000000000000n; // 4 ETH
    const { noteId: note1 } = await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: depositAmount,
      }
    );

    // User 1 -> User 2 -> User 3 delegation chain
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

    // User 2 revokes (takes back control from user3)
    await revokeNoteChecked(
      user2,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId: note3,
        owners: [user3.account, user2.account, user1.account], // Current chain
      }
    );

    // Check that the note is now owned by user2 again
    const revokedNote = await getNote(graphqlClient, note3.toString());
    assertNotNull(revokedNote, 'Revoked note');
    assert.strictEqual(revokedNote.owner.toLowerCase(), user2.account.toLowerCase(), 'Owner should be user2 after revocation');

    // Check delegation chain (should be 2 deep after revocation: user1 -> user2)
    const revokedChain = await getDelegationChain(graphqlClient, note3.toString());
    assert.strictEqual(revokedChain.length, 2, 'Delegation chain should have 2 entries after revocation');
  });

  it('should allow reclaiming funds from a root note', async function() {
    this.timeout(20000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // User 1 deposits
    await publishDocument(createStatement({
      content: 'Support local communities',
    }));

    const depositAmount = 1000000000000000000n; // 1 ETH
    const { noteId } = await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: depositAmount,
      }
    );

    // Get balance before reclaim
    const balanceBefore = await user1.publicClient.getBalance({ address: user1.account });

    // Reclaim the funds (with property checking)
    const reclaimHash = await reclaimFundsChecked(user1, delegatableNotesContract, graphqlClient, noteId);

    // Get balance after reclaim
    const balanceAfter = await user1.publicClient.getBalance({ address: user1.account });

    // Balance should increase (minus gas)
    // The exact amount is tricky because of gas costs, but it should be roughly depositAmount less gas
    const balanceDiff = balanceAfter - balanceBefore;
    assert(balanceDiff > 0n, 'Balance should increase after reclaim');

    // The checked wrapper already verified that the note is inactive and amount is 0
    testLog('  ✓ State transition properties verified (note inactive, amount 0)');
  });

  it('should track notes by root depositor', async function() {
    this.timeout(20000);

    const user1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // User 1 deposits two notes
    await publishDocument(createStatement({ content: 'Cause A' }));
    await publishDocument(createStatement({ content: 'Cause B' }));

    const { noteId: noteId1 } = await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: 1000000000000000000n,
      }
    );

    await depositETHChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        amount: 2000000000000000000n,
      }
    );

    // Delegate one of them to user2
    await delegateNoteChecked(
      user1,
      delegatableNotesContract,
      graphqlClient,
      {
        noteId: noteId1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: 1000000000000000000n,
      }
    );

    // Query notes by root
    const rootNotes = await getNotesByRoot(graphqlClient, user1.account);

    // User 1 should still be the root of both notes (even though one is delegated)
    assert(rootNotes.length >= 2, 'User1 should be root of at least 2 notes');

    // Verify that at least one is owned by user2 (delegated)
    const delegatedToUser2 = rootNotes.filter(n => n.owner.toLowerCase() === user2.account.toLowerCase());
    assert(delegatedToUser2.length >= 1, 'At least one note rooted at user1 should be owned by user2');
  });
});
