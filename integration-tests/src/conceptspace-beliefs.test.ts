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
  believeStatement,
  uploadToIPFS,
  cidToBytes32,
  NO_OPINION,
  BELIEVES,
  DISBELIEVES,
  type BeliefsContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getStatement,
  getUserBelief,
  getStatementWithContent,
  waitForSync,
  assertNotNull,
} from '@commonality/sdk';
import { BeliefsAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import { assertBeliefCountsMatch } from './invariants.js';
import {
  believeStatementChecked,
  disbelieveStatementChecked,
  clearOpinionChecked,
} from './belief-actions-checked.js';

describe('Conceptspace Beliefs', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-beliefs';

  let beliefsContract: BeliefsContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set');
    }

    beliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should record belief and disbelief from a single user', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'We should lower taxes',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.text}"`);
    testLog(`  Statement ID: ${statementId}`);

    // Express belief - properties checked automatically (includes waitForSync)
    testLog('  User believes the statement...');
    await believeStatementChecked(clients, beliefsContract, graphqlClient, statementCid);

    // Basic verification (detailed checks happen in the action framework)
    let userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );
    assert.strictEqual(userBelief.beliefState, BELIEVES, 'User should believe the statement');

    testLog('  ✓ Belief recorded correctly (state transitions verified)');

    // Change to disbelief - properties checked automatically (includes waitForSync)
    testLog('  User changes to disbelief...');
    await disbelieveStatementChecked(clients, beliefsContract, graphqlClient, statementCid);

    // Basic verification
    userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );
    assert.strictEqual(userBelief.beliefState, DISBELIEVES, 'User should disbelieve the statement');

    testLog('  ✓ Disbelief recorded correctly (state transitions verified)');

    // Clear opinion - properties checked automatically (includes waitForSync)
    testLog('  User clears opinion...');
    await clearOpinionChecked(clients, beliefsContract, graphqlClient, statementCid);

    // Basic verification
    userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );
    assert.strictEqual(userBelief.beliefState, NO_OPINION, 'User should have no opinion');

    testLog('  ✓ Opinion cleared correctly (state transitions verified)');
  });

  it('should track beliefs from multiple users', async function() {
    this.timeout(20000);

    const clients1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const clients2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'We should fund space exploration',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.text}"`);

    // User 1 believes - properties checked automatically (includes waitForSync)
    testLog('  User 1 believes...');
    await believeStatementChecked(clients1, beliefsContract, graphqlClient, statementCid);

    let statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');

    // User 2 also believes - properties checked automatically (includes waitForSync)
    testLog('  User 2 believes...');
    await believeStatementChecked(clients2, beliefsContract, graphqlClient, statementCid);

    statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 2, 'Statement should have 2 believers');

    // Verify both users' beliefs
    const user1Belief = assertNotNull(
      await getUserBelief(graphqlClient, clients1.account, statementId),
      'User 1 belief'
    );
    const user2Belief = assertNotNull(
      await getUserBelief(graphqlClient, clients2.account, statementId),
      'User 2 belief'
    );
    assert.strictEqual(user1Belief.beliefState, BELIEVES, 'User 1 should believe');
    assert.strictEqual(user2Belief.beliefState, BELIEVES, 'User 2 should believe');

    testLog('  ✓ Multiple users tracked correctly (state transitions verified)');

    // User 2 changes to disbelief - properties checked automatically (includes waitForSync)
    testLog('  User 2 changes to disbelief...');
    await disbelieveStatementChecked(clients2, beliefsContract, graphqlClient, statementCid);

    statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');
    assert.strictEqual(statement.disbelieverCount, 1, 'Statement should have 1 disbeliever');

    testLog('  ✓ User state changes tracked correctly (state transitions verified)');
  });

  it('should handle multiple statements independently', async function() {
    this.timeout(20000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create two statements
    const statement1Content = {
      statementType: 'text',
      text: 'Democracy is the best form of government',
    };
    const statement2Content = {
      statementType: 'text',
      text: 'Free markets lead to prosperity',
    };

    const statement1Cid = await uploadToIPFS(statement1Content);
    const statement2Cid = await uploadToIPFS(statement2Content);
    const statement1Id = cidToBytes32(statement1Cid);
    const statement2Id = cidToBytes32(statement2Cid);

    testLog(`  Statement 1: "${statement1Content.text}"`);
    testLog(`  Statement 2: "${statement2Content.text}"`);

    // Believe statement 1, disbelieve statement 2 - properties checked automatically (includes waitForSync)
    testLog('  User believes statement 1...');
    await believeStatementChecked(clients, beliefsContract, graphqlClient, statement1Cid);

    testLog('  User disbelieves statement 2...');
    await disbelieveStatementChecked(clients, beliefsContract, graphqlClient, statement2Cid);

    // Verify both statements tracked independently
    const belief1 = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statement1Id),
      'Belief 1'
    );
    const belief2 = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statement2Id),
      'Belief 2'
    );

    assert.strictEqual(belief1.beliefState, BELIEVES, 'User should believe statement 1');
    assert.strictEqual(belief2.beliefState, DISBELIEVES, 'User should disbelieve statement 2');

    const stmt1 = assertNotNull(
      await getStatement(graphqlClient, statement1Id),
      'Statement 1'
    );
    const stmt2 = assertNotNull(
      await getStatement(graphqlClient, statement2Id),
      'Statement 2'
    );

    assert.strictEqual(stmt1.believerCount, 1);
    assert.strictEqual(stmt1.disbelieverCount, 0);
    assert.strictEqual(stmt2.believerCount, 0);
    assert.strictEqual(stmt2.disbelieverCount, 1);

    testLog('  ✓ Multiple statements tracked independently (state transitions verified)');
  });

  it('should fetch statement metadata using getStatementWithContent()', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create a statement
    // Note: In the test environment, uploadToIPFS just creates a CID without actually
    // uploading to IPFS, so the content won't be available from a gateway
    const statementContent = {
      statementType: 'text',
      content: 'We should invest heavily in renewable energy infrastructure to combat climate change.',
      title: 'Renewable Energy Investment',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.title}"`);

    // Express belief to create the statement onchain
    testLog('  User believes the statement...');
    const txHash = await believeStatement(clients, beliefsContract, statementCid);
    const receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Test basic usage: fetch statement metadata
    testLog('  Fetching statement with getStatementWithContent (basic)...');
    const result = await getStatementWithContent(graphqlClient, statementId);

    assertNotNull(result, 'Statement result');
    assert.strictEqual(result!.statement.id, statementId, 'Statement ID should match');
    // Note: CID format may differ (bafybe vs bafkre) but both represent the same content hash
    assert.ok(result!.statement.cid, 'Statement should have a CID');
    assert.strictEqual(result!.statement.believerCount, 1, 'Should have 1 believer');

    // IPFS content should be available now that we have a local IPFS node
    assert.ok(result!.content, 'Content should be fetched from local IPFS');
    assert.strictEqual(result!.content!.statementType, 'text', 'Content should have correct type');
    assert.ok(result!.content!.content, 'Content should have text');

    // Verify metrics are not included by default
    assert.strictEqual(result!.metrics, undefined, 'Metrics should not be included by default');

    testLog('  ✓ Basic fetch successful');

    // Test with metrics included
    testLog('  Fetching statement with metrics...');
    const resultWithMetrics = await getStatementWithContent(graphqlClient, statementId, {
      includeMetrics: true
    });

    assertNotNull(resultWithMetrics, 'Statement result with metrics');
    assertNotNull(resultWithMetrics.metrics, 'Metrics');
    assert.strictEqual(resultWithMetrics.metrics.directBelievers, 1, 'Should have 1 direct believer');
    assert.strictEqual(resultWithMetrics.metrics.directDisbelievers, 0, 'Should have 0 disbelievers');
    assert.strictEqual(resultWithMetrics.metrics.indirectSupporters, 0, 'Should have 0 indirect supporters');

    // Verify invariant: belief counts match individual records
    await assertBeliefCountsMatch(graphqlClient, statementId);

    testLog('  ✓ Fetch with metrics successful');

    // Test that it returns null for non-existent statement
    testLog('  Testing non-existent statement...');
    const nonExistentId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const nonExistentResult = await getStatementWithContent(graphqlClient, nonExistentId);
    assert.strictEqual(nonExistentResult, null, 'Should return null for non-existent statement');

    testLog('  ✓ Returns null for non-existent statement');
  });
});
