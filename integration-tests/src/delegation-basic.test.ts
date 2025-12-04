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
  createTestClients,
  depositETH,
  delegateNote,
  revokeNote,
  reclaimFunds,
  uploadToIPFS,
  cidToBytes32,
  type DelegatableNotesContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  waitForSync,
  assertNotNull,
} from '@commonality/sdk';

import { DelegatableNotesAbi } from '@commonality/sdk';
import { TEST_PRIVATE_KEYS } from '@commonality/sdk';
import { testLog } from './setup.js';

describe('Delegation System', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const PRIVATE_KEY_1 = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const PRIVATE_KEY_2 = TEST_PRIVATE_KEYS.ACCOUNT_1;
  const PRIVATE_KEY_3 = TEST_PRIVATE_KEYS.ACCOUNT_2;

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

    const clients = createTestClients(PRIVATE_KEY_1, RPC_URL);

    // Create a statement for the intended purpose
    const statementContent = {
      statementType: 'text',
      text: 'Fund education initiatives',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    // Deposit 1 ETH
    const depositAmount = 1000000000000000000n; // 1 ETH
    const { hash, noteId } = await depositETH(clients, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const receipt = await clients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // User 1 deposits
    const statementContent = {
      statementType: 'text',
      text: 'Support renewable energy',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 2000000000000000000n; // 2 ETH
    const { hash: depositHash, noteId } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const depositReceipt = await user1.publicClient.getTransactionReceipt({ hash: depositHash });
    await waitForSync(graphqlClient, depositReceipt.blockNumber);

    // User 1 delegates full amount to User 2
    const { hash: delegateHash, delegatedNoteId } = await delegateNote(user1, delegatableNotesContract, {
      noteId,
      owners: [user1.account], // Current chain: just user1
      delegateTo: user2.account,
      amount: depositAmount, // Full amount
    });

    const delegateReceipt = await user1.publicClient.getTransactionReceipt({ hash: delegateHash });
    await waitForSync(graphqlClient, delegateReceipt.blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // User 1 deposits 10 ETH
    const statementContent = {
      statementType: 'text',
      text: 'Fund healthcare research',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 10000000000000000000n; // 10 ETH
    const { hash: depositHash, noteId } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const depositReceipt = await user1.publicClient.getTransactionReceipt({ hash: depositHash });
    await waitForSync(graphqlClient, depositReceipt.blockNumber);

    // User 1 delegates 3 ETH to User 2 (partial delegation)
    const delegateAmount = 3000000000000000000n; // 3 ETH
    const { hash: delegateHash, delegatedNoteId, remainderNoteId } = await delegateNote(
      user1,
      delegatableNotesContract,
      {
        noteId,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: delegateAmount,
      }
    );

    const delegateReceipt = await user1.publicClient.getTransactionReceipt({ hash: delegateHash });
    await waitForSync(graphqlClient, delegateReceipt.blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const user3 = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // User 1 deposits
    const statementContent = {
      statementType: 'text',
      text: 'Support scientific research',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 5000000000000000000n; // 5 ETH
    const { hash: depositHash, noteId: note1 } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const depositReceipt = await user1.publicClient.getTransactionReceipt({ hash: depositHash });
    await waitForSync(graphqlClient, depositReceipt.blockNumber);

    // User 1 delegates to User 2
    const { hash: delegate1Hash, delegatedNoteId: note2 } = await delegateNote(
      user1,
      delegatableNotesContract,
      {
        noteId: note1,
        owners: [user1.account],
        delegateTo: user2.account,
        amount: depositAmount,
      }
    );

    const delegate1Receipt = await user1.publicClient.getTransactionReceipt({ hash: delegate1Hash });
    await waitForSync(graphqlClient, delegate1Receipt.blockNumber);

    // User 2 delegates to User 3
    const { hash: delegate2Hash, delegatedNoteId: note3 } = await delegateNote(
      user2,
      delegatableNotesContract,
      {
        noteId: note2,
        owners: [user2.account, user1.account], // Chain: user2 (leaf) -> user1 (root)
        delegateTo: user3.account,
        amount: depositAmount,
      }
    );

    const delegate2Receipt = await user2.publicClient.getTransactionReceipt({ hash: delegate2Hash });
    await waitForSync(graphqlClient, delegate2Receipt.blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);
    const user3 = createTestClients(PRIVATE_KEY_3, RPC_URL);

    // User 1 deposits
    const statementContent = {
      statementType: 'text',
      text: 'Support climate action',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 4000000000000000000n; // 4 ETH
    const { hash: depositHash, noteId: note1 } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const depositReceipt = await user1.publicClient.getTransactionReceipt({ hash: depositHash });
    await waitForSync(graphqlClient, depositReceipt.blockNumber);

    // User 1 -> User 2 -> User 3 delegation chain
    const { hash: d1Hash, delegatedNoteId: note2 } = await delegateNote(user1, delegatableNotesContract, {
      noteId: note1,
      owners: [user1.account],
      delegateTo: user2.account,
      amount: depositAmount,
    });
    await user1.publicClient.getTransactionReceipt({ hash: d1Hash });
    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: d1Hash })).blockNumber);

    const { hash: d2Hash, delegatedNoteId: note3 } = await delegateNote(user2, delegatableNotesContract, {
      noteId: note2,
      owners: [user2.account, user1.account],
      delegateTo: user3.account,
      amount: depositAmount,
    });
    await user2.publicClient.getTransactionReceipt({ hash: d2Hash });
    await waitForSync(graphqlClient, (await user2.publicClient.getTransactionReceipt({ hash: d2Hash })).blockNumber);

    // User 2 revokes (takes back control from user3)
    const revokeHash = await revokeNote(user2, delegatableNotesContract, {
      noteId: note3,
      owners: [user3.account, user2.account, user1.account], // Current chain
    });

    const revokeReceipt = await user2.publicClient.getTransactionReceipt({ hash: revokeHash });
    await waitForSync(graphqlClient, revokeReceipt.blockNumber);

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

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);

    // User 1 deposits
    const statementContent = {
      statementType: 'text',
      text: 'Support local communities',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    const depositAmount = 1000000000000000000n; // 1 ETH
    const { hash: depositHash, noteId } = await depositETH(user1, delegatableNotesContract, {
      amount: depositAmount,
      intendedStatementId: statementId,
    });

    const depositReceipt = await user1.publicClient.getTransactionReceipt({ hash: depositHash });
    await waitForSync(graphqlClient, depositReceipt.blockNumber);

    // Get balance before reclaim
    const balanceBefore = await user1.publicClient.getBalance({ address: user1.account });

    // Reclaim the funds
    const reclaimHash = await reclaimFunds(user1, delegatableNotesContract, noteId);
    const reclaimReceipt = await user1.publicClient.getTransactionReceipt({ hash: reclaimHash });
    await waitForSync(graphqlClient, reclaimReceipt.blockNumber);

    // Get balance after reclaim
    const balanceAfter = await user1.publicClient.getBalance({ address: user1.account });

    // Balance should increase (minus gas)
    // The exact amount is tricky because of gas costs, but it should be roughly depositAmount less gas
    const balanceDiff = balanceAfter - balanceBefore;
    assert(balanceDiff > 0n, 'Balance should increase after reclaim');

    // Note should be marked as inactive (not deleted, just inactive with 0 amount)
    const reclaimedNote = await getNote(graphqlClient, noteId.toString());
    assertNotNull(reclaimedNote, 'Reclaimed note');
    assert.strictEqual(reclaimedNote.active, false, 'Note should be inactive after reclaim');
    assert.strictEqual(reclaimedNote.amount, '0', 'Note amount should be 0 after reclaim');
  });

  it('should track notes by root depositor', async function() {
    this.timeout(20000);

    const user1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const user2 = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // User 1 deposits two notes
    const statement1 = await uploadToIPFS({ statementType: 'text', text: 'Cause A' });
    const statement2 = await uploadToIPFS({ statementType: 'text', text: 'Cause B' });

    const { hash: d1Hash, noteId: noteId1 } = await depositETH(user1, delegatableNotesContract, {
      amount: 1000000000000000000n,
      intendedStatementId: cidToBytes32(statement1),
    });
    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: d1Hash })).blockNumber);

    const { hash: d2Hash, noteId: noteId2 } = await depositETH(user1, delegatableNotesContract, {
      amount: 2000000000000000000n,
      intendedStatementId: cidToBytes32(statement2),
    });
    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: d2Hash })).blockNumber);

    // Delegate one of them to user2
    const { hash: delegateHash } = await delegateNote(user1, delegatableNotesContract, {
      noteId: noteId1,
      owners: [user1.account],
      delegateTo: user2.account,
      amount: 1000000000000000000n,
    });
    await waitForSync(graphqlClient, (await user1.publicClient.getTransactionReceipt({ hash: delegateHash })).blockNumber);

    // Query notes by root
    const rootNotes = await getNotesByRoot(graphqlClient, user1.account);

    // User 1 should still be the root of both notes (even though one is delegated)
    assert(rootNotes.length >= 2, 'User1 should be root of at least 2 notes');

    // Verify that at least one is owned by user2 (delegated)
    const delegatedToUser2 = rootNotes.filter(n => n.owner.toLowerCase() === user2.account.toLowerCase());
    assert(delegatedToUser2.length >= 1, 'At least one note rooted at user1 should be owned by user2');
  });
});
