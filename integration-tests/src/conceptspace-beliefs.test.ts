/**
 * Conceptspace Beliefs Integration Tests
 *
 * Tests for basic belief functionality:
 * - Express belief in statements
 * - Express disbelief
 * - Change opinions
 * - Multiple users and statements
 */

import assert from 'assert';
import {
  createTestClients,
  believeStatement,
  disbelieveStatement,
  clearOpinion,
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
import { TEST_PRIVATE_KEYS } from '@commonality/sdk';
import { testLog } from './setup.js';

describe('Conceptspace Beliefs', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const PRIVATE_KEY_1 = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const PRIVATE_KEY_2 = TEST_PRIVATE_KEYS.ACCOUNT_1;

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

    const clients = createTestClients(PRIVATE_KEY_1, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'We should lower taxes',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.text}"`);
    testLog(`  Statement ID: ${statementId}`);

    // Express belief
    testLog('  User believes the statement...');
    let txHash = await believeStatement(clients, beliefsContract, statementCid);
    let receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify belief was recorded
    let userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );
    assert.strictEqual(userBelief.beliefState, BELIEVES, 'User should believe the statement');

    let statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');
    assert.strictEqual(statement.disbelieverCount, 0, 'Statement should have 0 disbelievers');

    testLog('  ✓ Belief recorded correctly');

    // Change to disbelief
    testLog('  User changes to disbelief...');
    txHash = await disbelieveStatement(clients, beliefsContract, statementCid);
    receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify disbelief was recorded
    userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );
    assert.strictEqual(userBelief.beliefState, DISBELIEVES, 'User should disbelieve the statement');

    statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 0, 'Statement should have 0 believers');
    assert.strictEqual(statement.disbelieverCount, 1, 'Statement should have 1 disbeliever');

    testLog('  ✓ Disbelief recorded correctly');

    // Clear opinion
    testLog('  User clears opinion...');
    txHash = await clearOpinion(clients, beliefsContract, statementCid);
    receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify opinion was cleared
    userBelief = assertNotNull(
      await getUserBelief(graphqlClient, clients.account, statementId),
      'User belief'
    );
    assert.strictEqual(userBelief.beliefState, NO_OPINION, 'User should have no opinion');

    statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 0, 'Statement should have 0 believers');
    assert.strictEqual(statement.disbelieverCount, 0, 'Statement should have 0 disbelievers');

    testLog('  ✓ Opinion cleared correctly');
  });

  it('should track beliefs from multiple users', async function() {
    this.timeout(20000);

    const clients1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const clients2 = createTestClients(PRIVATE_KEY_2, RPC_URL);

    // Create a statement
    const statementContent = {
      statementType: 'text',
      text: 'We should fund space exploration',
    };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Statement: "${statementContent.text}"`);

    // User 1 believes
    testLog('  User 1 believes...');
    let txHash = await believeStatement(clients1, beliefsContract, statementCid);
    let receipt = await clients1.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    let statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');

    // User 2 also believes
    testLog('  User 2 believes...');
    txHash = await believeStatement(clients2, beliefsContract, statementCid);
    receipt = await clients2.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

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

    testLog('  ✓ Multiple users tracked correctly');

    // User 2 changes to disbelief
    testLog('  User 2 changes to disbelief...');
    txHash = await disbelieveStatement(clients2, beliefsContract, statementCid);
    receipt = await clients2.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    statement = assertNotNull(
      await getStatement(graphqlClient, statementId),
      'Statement'
    );
    assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');
    assert.strictEqual(statement.disbelieverCount, 1, 'Statement should have 1 disbeliever');

    testLog('  ✓ User state changes tracked correctly');
  });

  it('should handle multiple statements independently', async function() {
    this.timeout(20000);

    const clients = createTestClients(PRIVATE_KEY_1, RPC_URL);

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

    // Believe statement 1, disbelieve statement 2
    testLog('  User believes statement 1...');
    let txHash = await believeStatement(clients, beliefsContract, statement1Cid);
    let receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    testLog('  User disbelieves statement 2...');
    txHash = await disbelieveStatement(clients, beliefsContract, statement2Cid);
    receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

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

    testLog('  ✓ Multiple statements tracked independently');
  });

  it('should fetch statement metadata using getStatementWithContent()', async function() {
    this.timeout(20000);

    const clients = createTestClients(PRIVATE_KEY_1, RPC_URL);

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
    assert.strictEqual(result.statement.id, statementId, 'Statement ID should match');
    // Note: CID format may differ (bafybe vs bafkre) but both represent the same content hash
    assert.ok(result.statement.cid, 'Statement should have a CID');
    assert.strictEqual(result.statement.believerCount, 1, 'Should have 1 believer');

    // IPFS content won't be available in test environment (uploadToIPFS is a mock),
    // so content will be null - this is expected behavior
    assert.strictEqual(result.content, null, 'Content should be null when IPFS not available');

    // Verify metrics are not included by default
    assert.strictEqual(result.metrics, undefined, 'Metrics should not be included by default');

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

    testLog('  ✓ Fetch with metrics successful');

    // Test that it returns null for non-existent statement
    testLog('  Testing non-existent statement...');
    const nonExistentId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const nonExistentResult = await getStatementWithContent(graphqlClient, nonExistentId);
    assert.strictEqual(nonExistentResult, null, 'Should return null for non-existent statement');

    testLog('  ✓ Returns null for non-existent statement');
  });
});
