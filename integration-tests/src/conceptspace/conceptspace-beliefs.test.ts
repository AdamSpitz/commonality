/**
 * Conceptspace Beliefs Integration Tests
 *
 * Tests for basic belief functionality:
 * - Express belief in statements
 * - Express disbelief
 * - Change opinions
 * - Multiple users and statements
 *
 * NOTE: This test file has been refactored to use the action framework,
 * which automatically checks state transition properties and invariants.
 */

import assert from 'assert';
import {
  createStatement,
  publishDocument,
  cidToBytes32,
  type BeliefsContract,
  assertNotNull,
  BeliefsAbi,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { assertBeliefCountsMatch, assertNoOrphanedData } from '../utils/invariants.js';
import { getStatementWithContent } from '../utils/graphql-helpers.js';
import {
  believeStatementChecked,
  disbelieveStatementChecked,
  clearOpinionChecked,
} from '../actions/belief-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Conceptspace Beliefs', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-beliefs';

  let beliefsContract: BeliefsContract;
  let machinery: ActionTestingMachinery;

  before(() => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set');
    }

    beliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should record belief and disbelief from a single user', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement
    const statementData = createStatement({ content: 'We should lower taxes' });
    const statementCid = await publishDocument(statementData);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementData.content}"`);
    testLog(`  Statement ID: ${statementId}`);

    // Express belief - properties checked automatically (includes wait for sync)
    testLog('  User believes the statement...');
    await believeStatementChecked(clients, beliefsContract, machinery, statementCid);

    testLog('  ✓ Belief recorded correctly (state transitions verified)');

    // Change to disbelief - properties checked automatically (includes wait for sync)
    testLog('  User changes to disbelief...');
    await disbelieveStatementChecked(clients, beliefsContract, machinery, statementCid);

    testLog('  ✓ Disbelief recorded correctly (state transitions verified)');

    // Clear opinion - properties checked automatically (includes wait for sync)
    testLog('  User clears opinion...');
    await clearOpinionChecked(clients, beliefsContract, machinery, statementCid);

    testLog('  ✓ Opinion cleared correctly (state transitions verified)');
  });

  it('should track beliefs from multiple users', async function() {
    this.timeout(20000);

    const clients1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const clients2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // Create a statement
    const statementData = createStatement({ content: 'We should fund space exploration' });
    const statementCid = await publishDocument(statementData);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementData.content}"`);

    // User 1 believes - properties checked automatically (includes wait for sync)
    testLog('  User 1 believes...');
    await believeStatementChecked(clients1, beliefsContract, machinery, statementCid);

    // User 2 also believes - properties checked automatically (includes wait for sync)
    testLog('  User 2 believes...');
    await believeStatementChecked(clients2, beliefsContract, machinery, statementCid);
    testLog('  ✓ Multiple users tracked correctly (state transitions verified)');

    // User 2 changes to disbelief - properties checked automatically (includes wait for sync)
    testLog('  User 2 changes to disbelief...');
    await disbelieveStatementChecked(clients2, beliefsContract, machinery, statementCid);

    testLog('  ✓ User state changes tracked correctly (state transitions verified)');
  });

  it('should handle multiple statements independently', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create two statements
    const statement1Data = createStatement({ content: 'Democracy is the best form of government' });
    const statement2Data = createStatement({ content: 'Free markets lead to prosperity' });

    const statement1Cid = await publishDocument(statement1Data);
    const statement2Cid = await publishDocument(statement2Data);

    testLog(`  Statement 1: "${statement1Data.content}"`);
    testLog(`  Statement 2: "${statement2Data.content}"`);

    // Believe statement 1, disbelieve statement 2 - properties checked automatically (includes wait for sync)
    testLog('  User believes statement 1...');
    await believeStatementChecked(clients, beliefsContract, machinery, statement1Cid);

    testLog('  User disbelieves statement 2...');
    await disbelieveStatementChecked(clients, beliefsContract, machinery, statement2Cid);

    testLog('  ✓ Multiple statements tracked independently (state transitions verified)');
  });

  it('should fetch statement metadata using getStatementWithContent()', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement
    const statementData = createStatement({
      content: 'We should invest heavily in renewable energy infrastructure to combat climate change.',
    });
    const statementCid = await publishDocument(statementData);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement CID: ${statementCid}`);

    // Express belief to create the statement onchain
    testLog('  User believes the statement...');
    const txHash = await believeStatementChecked(clients, beliefsContract, machinery, statementCid);

    // Test basic usage: fetch statement metadata
    testLog('  Fetching statement with getStatementWithContent (basic)...');
    const result = await getStatementWithContent(machinery, statementId);

    assertNotNull(result, 'Statement result');
    assert.strictEqual(result!.statement.id, statementId, 'Statement ID should match');
    // Note: CID format may differ (bafybe vs bafkre) but both represent the same content hash
    assert.ok(result!.statement.cid, 'Statement should have a CID');
    assert.strictEqual(result!.statement.believerCount, 1, 'Should have 1 believer');

    // IPFS content should be available now that we have a local IPFS node
    assert.ok(result!.content, 'Content should be fetched from local IPFS');
    assert.strictEqual(result!.content!.format, 'markdown-restricted', 'Content should have DisplayableDocument format');
    assert.ok(result!.content!.content, 'Content should have text');

    // Verify metrics are not included by default
    assert.strictEqual(result!.metrics, undefined, 'Metrics should not be included by default');

    testLog('  ✓ Basic fetch successful');

    // Test with metrics included
    testLog('  Fetching statement with metrics...');
    const resultWithMetrics = await getStatementWithContent(machinery, statementId, {
      includeMetrics: true
    });

    assertNotNull(resultWithMetrics, 'Statement result with metrics');
    assertNotNull(resultWithMetrics!.metrics, 'Metrics');
    assert.strictEqual(resultWithMetrics!.metrics!.directBelievers, 1, 'Should have 1 direct believer');
    assert.strictEqual(resultWithMetrics!.metrics!.directDisbelievers, 0, 'Should have 0 disbelievers');
    assert.strictEqual(resultWithMetrics!.metrics!.indirectSupporters, 0, 'Should have 0 indirect supporters');

    // Verify invariants: belief counts match individual records and no orphaned data
    await assertBeliefCountsMatch(machinery, statementId);
    await assertNoOrphanedData(machinery);

    testLog('  ✓ Fetch with metrics successful');

    // Test that it returns null for non-existent statement
    testLog('  Testing non-existent statement...');
    const nonExistentId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const nonExistentResult = await getStatementWithContent(machinery, nonExistentId);
    assert.strictEqual(nonExistentResult, null, 'Should return null for non-existent statement');

    testLog('  ✓ Returns null for non-existent statement');
  });
});
