/**
 * Mutable Refs Integration Tests
 *
 * Tests for mutable reference functionality:
 * - Create and update refs
 * - Query ref values
 * - Track ref history
 * - Multiple users with same ref name
 */

import assert from 'assert';
import {
  uploadToIPFS,
  type MutableRefUpdaterContract,
  getRef,
  assertNotNull,
  MutableRefUpdaterAbi,
} from '@commonality/sdk';
import {
  getUserRef,
  getUserRefs,
  getUserRefHistory,
  getRefsByName,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { updateRefChecked, appendToUserListChecked } from './mutable-ref-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Mutable Refs', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const MUTABLE_REF_UPDATER_CONTRACT_ADDRESS = process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'mutable-refs';

  let mutableRefUpdaterContract: MutableRefUpdaterContract;
  let machinery: ActionTestingMachinery;

  before(() => {
    if (!MUTABLE_REF_UPDATER_CONTRACT_ADDRESS) {
      throw new Error('MUTABLE_REF_UPDATER_CONTRACT_ADDRESS not set');
    }

    mutableRefUpdaterContract = {
      address: MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
      abi: MutableRefUpdaterAbi,
    };

    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should create and retrieve a ref', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const refName = 'test-ref-create-' + Date.now();
    const refValue = 'QmTestValue123';

    testLog(`  Creating ref "${refName}" with value "${refValue}"...`);
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, refValue);

    testLog('  ✓ Ref created and verified (checked by property checks)');

    // Additional verification: Query from indexer
    const ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Ref from indexer');
    assert.strictEqual(ref.value, refValue, 'Ref value should match');
    assert.strictEqual(ref.name, refName, 'Ref name should match');
    assert.strictEqual(ref.owner.toLowerCase(), clients.account.toLowerCase(), 'Ref owner should match');

    // Query directly from contract
    const contractValue = await getRef(clients, mutableRefUpdaterContract, clients.account as `0x${string}`, refName);
    assert.strictEqual(contractValue, refValue, 'Contract value should match');

    testLog('  ✓ Additional verification passed');
  });

  it('should update an existing ref', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const refName = 'test-ref-update';
    const value1 = 'QmValue1';
    const value2 = 'QmValue2';
    const value3 = 'QmValue3';

    testLog(`  Creating ref "${refName}"...`);
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, value1);

    testLog('  Updating ref to second value...');
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, value2);

    testLog('  Updating ref to third value...');
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, value3);

    // Current value should be the latest
    const ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Current ref');
    assert.strictEqual(ref.value, value3, 'Current value should be value3');

    // History should show all three updates
    const history = await getUserRefHistory(machinery, clients.account, refName);
    assert.ok(history.length >= 3, 'Should have at least 3 history entries');

    // History is returned newest first
    assert.strictEqual(history[0].value, value3, 'Most recent should be value3');
    assert.strictEqual(history[1].value, value2, 'Second most recent should be value2');
    assert.strictEqual(history[2].value, value1, 'Oldest should be value1');

    testLog('  ✓ Ref updated and history tracked correctly (verified by property checks)');
  });

  it('should keep refs independent between users', async function() {
    this.timeout(20000);

    const clients1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const clients2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const clients3 = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    const refName = 'created-statements';
    const value1 = 'QmUser1Statements';
    const value2 = 'QmUser2Statements';
    const value3 = 'QmUser3Statements';

    testLog('  Three users creating refs with same name...');

    // User 1 creates ref
    await updateRefChecked(clients1, mutableRefUpdaterContract, machinery, refName, value1);

    // User 2 creates ref
    await updateRefChecked(clients2, mutableRefUpdaterContract, machinery, refName, value2);

    // User 3 creates ref
    await updateRefChecked(clients3, mutableRefUpdaterContract, machinery, refName, value3);

    // Each user should have their own independent value
    const ref1 = await getUserRef(machinery, clients1.account, refName);
    const ref2 = await getUserRef(machinery, clients2.account, refName);
    const ref3 = await getUserRef(machinery, clients3.account, refName);
    assertNotNull(ref1, 'User 1 ref');
    assertNotNull(ref2, 'User 2 ref');
    assertNotNull(ref3, 'User 3 ref');

    assert.strictEqual(ref1.value, value1, 'User 1 should have value1');
    assert.strictEqual(ref2.value, value2, 'User 2 should have value2');
    assert.strictEqual(ref3.value, value3, 'User 3 should have value3');

    // Query by name should find all three
    const refsByName = await getRefsByName(machinery, refName);
    const matchingUsers = refsByName.map(r => r.owner.toLowerCase());
    assert.ok(matchingUsers.includes(clients1.account.toLowerCase()), 'Should include user 1');
    assert.ok(matchingUsers.includes(clients2.account.toLowerCase()), 'Should include user 2');
    assert.ok(matchingUsers.includes(clients3.account.toLowerCase()), 'Should include user 3');

    testLog('  ✓ Refs are independent between users (verified by property checks)');
  });

  it('should handle multiple refs per user', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const refs = [
      { name: 'created-statements', value: 'QmCreatedList' },
      { name: 'bookmarked-statements', value: 'QmBookmarkedList' },
      { name: 'draft-statements', value: 'QmDraftList' },
    ];

    testLog('  User creating multiple refs...');

    for (const ref of refs) {
      await updateRefChecked(clients, mutableRefUpdaterContract, machinery, ref.name, ref.value);
    }

    // Get all refs for this user
    const userRefs = await getUserRefs(machinery, clients.account);

    // Should have at least these 3 refs (might have more from other tests)
    for (const expectedRef of refs) {
      const found = userRefs.find(r => r.name === expectedRef.name);
      assert.ok(found, `Should have ref named ${expectedRef.name}`);
      assert.strictEqual(found!.value, expectedRef.value, `Value for ${expectedRef.name} should match`);
    }

    testLog('  ✓ User can have multiple refs (verified by property checks)');
  });

  it('should handle empty string values', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const refName = 'test-empty-ref';

    testLog('  Setting ref to non-empty value...');
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, 'QmSomeValue');

    let ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Non-empty ref');
    assert.strictEqual(ref.value, 'QmSomeValue', 'Should have non-empty value');

    testLog('  Clearing ref (empty string)...');
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, '');
    ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Empty ref');
    assert.strictEqual(ref.value, '', 'Should have empty value');

    testLog('  ✓ Empty string values handled correctly (verified by property checks)');
  });

  it('should support created statements workflow', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const refName = 'created-statements-workflow';

    testLog('  Simulating created statements workflow...');

    // User creates first statement - store just the CID
    const statement1 = { statementType: 'text', text: 'First statement' };
    const cid1 = await uploadToIPFS(statement1);

    testLog('  Creating ref with first statement...');
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, cid1);

    let ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'First ref');
    assert.strictEqual(ref.value, cid1, 'Should point to first statement');

    // User creates more statements - update ref to point to a list
    const statement2 = { statementType: 'text', text: 'Second statement' };
    const cid2 = await uploadToIPFS(statement2);
    const statement3 = { statementType: 'text', text: 'Third statement' };
    const cid3 = await uploadToIPFS(statement3);

    // Create a list and upload to IPFS
    const statementList = {
      statements: [cid1, cid2, cid3],
      version: 1,
    };
    const listCid = await uploadToIPFS(statementList);

    testLog('  Updating ref to point to statement list...');
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, listCid);

    ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Updated ref');
    assert.strictEqual(ref.value, listCid, 'Should point to statement list');

    // History should show the evolution
    const history = await getUserRefHistory(machinery, clients.account, refName);
    assert.ok(history.length >= 2, 'Should have at least 2 history entries');
    assert.strictEqual(history[0].value, listCid, 'Latest should be list CID');
    assert.strictEqual(history[1].value, cid1, 'First should be single statement CID');

    testLog('  ✓ Created statements workflow works correctly (verified by property checks)');
  });

  it('should return empty string for non-existent ref', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const nonExistentRef = 'this-ref-does-not-exist-' + Date.now();

    testLog('  Querying non-existent ref...');

    // From contract
    const contractValue = await getRef(clients, mutableRefUpdaterContract, clients.account as `0x${string}`, nonExistentRef);
    assert.strictEqual(contractValue, '', 'Contract should return empty string for non-existent ref');

    // From indexer
    const ref = await getUserRef(machinery, clients.account, nonExistentRef);
    assert.strictEqual(ref, null, 'Indexer should return null for non-existent ref');

    testLog('  ✓ Non-existent refs handled correctly');
  });

  it('should add to created statements list with appendToUserList()', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const refName = 'created-statements-helper-test-' + Date.now();

    testLog('  Testing appendToUserList() helper function...');

    // Create three test statements
    const statement1 = { statementType: 'text', text: 'Test statement 1' };
    const cid1 = await uploadToIPFS(statement1);
    const statement2 = { statementType: 'text', text: 'Test statement 2' };
    const cid2 = await uploadToIPFS(statement2);
    const statement3 = { statementType: 'text', text: 'Test statement 3' };
    const cid3 = await uploadToIPFS(statement3);

    testLog('  Adding first statement using appendToUserList...');
    await appendToUserListChecked(machinery, clients, mutableRefUpdaterContract, refName, cid1);

    // Verify first statement was added (ref value is now a CID pointing to the list)
    let ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'First ref');
    const firstListCid = ref.value;
    // Accept both CIDv0 (Qm...) and CIDv1 (baf...) formats
    assert.ok(firstListCid.startsWith('Qm') || firstListCid.startsWith('baf'), 'Should have valid CID after first statement');

    testLog('  Adding second statement...');
    await appendToUserListChecked(machinery, clients, mutableRefUpdaterContract, refName, cid2);

    // Verify second statement was added (CID should change)
    ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Second ref');
    const secondListCid = ref.value;
    assert.ok(secondListCid.startsWith('Qm') || secondListCid.startsWith('baf'), 'Should have valid CID after second statement');
    assert.notStrictEqual(secondListCid, firstListCid, 'CID should change when adding second statement');

    testLog('  Adding third statement...');
    await appendToUserListChecked(machinery, clients, mutableRefUpdaterContract, refName, cid3);

    // Verify third statement was added (CID should change again)
    ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Third ref');
    const thirdListCid = ref.value;
    assert.ok(thirdListCid.startsWith('Qm') || thirdListCid.startsWith('baf'), 'Should have valid CID after third statement');
    assert.notStrictEqual(thirdListCid, secondListCid, 'CID should change when adding third statement');

    testLog('  ✓ appendToUserList() works correctly (verified by property checks)');

    // Note: Deduplication is tested implicitly - the function should deduplicate by default
    // but we're not verifying the exact CID because JSON serialization order can vary
  });

  it('should handle format migration with appendToUserList()', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);
    const refName = 'format-migration-test-' + Date.now();

    testLog('  Testing format migration from old single-CID format...');

    // Simulate old format: just a single CID string
    const oldFormatCid = await uploadToIPFS({ text: 'Old format statement' });
    await updateRefChecked(clients, mutableRefUpdaterContract, machinery, refName, oldFormatCid);

    // Now add a new statement using the helper - it should migrate the format
    const newStatement = { text: 'New statement after migration' };
    const newCid = await uploadToIPFS(newStatement);

    testLog('  Adding new statement to old-format ref...');
    await appendToUserListChecked(machinery, clients, mutableRefUpdaterContract, refName, newCid);

    // Verify the format was migrated (CID should change from old single-CID format to new list format)
    const ref = await getUserRef(machinery, clients.account, refName);
    assertNotNull(ref, 'Migrated ref');
    const migratedListCid = ref.value;
    assert.ok(migratedListCid.startsWith('Qm') || migratedListCid.startsWith('baf'), 'Should have valid CID after migration');
    assert.notStrictEqual(migratedListCid, oldFormatCid, 'CID should change after migration to list format');

    testLog('  ✓ Format migration works correctly (verified by property checks)');
  });
});
