/**
 * Statement Discovery Integration Test
 *
 * Tests statement browsing and discovery features:
 * - Browse statements by most supporters (direct believers)
 * - Browse newest statements
 * - Browse all statements with pagination
 */

import assert from 'assert';
import {
  createTestClients,
  believeStatement,
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  browseStatementsByMostSupporters,
  browseStatementsByNewest,
  getAllStatements,
  waitForSync,
} from '@commonality/sdk';
import { BeliefsAbi } from '@commonality/sdk';
import { TEST_PRIVATE_KEYS } from '@commonality/sdk';

describe('Statement Discovery & Browsing', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  const ALICE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const BOB_KEY = TEST_PRIVATE_KEYS.ACCOUNT_1;
  const CHARLIE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_2;

  it('should browse statements by most supporters', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const bobClients = createTestClients(BOB_KEY, RPC_URL);
    const charlieClients = createTestClients(CHARLIE_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    console.log(`  Alice: ${aliceClients.account}`);
    console.log(`  Bob: ${bobClients.account}`);
    console.log(`  Charlie: ${charlieClients.account}`);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create three statements with different levels of support
    const popularStatement = await uploadToIPFS({
      statementType: 'text',
      text: 'Very popular statement - everyone signs this',
    });

    const moderateStatement = await uploadToIPFS({
      statementType: 'text',
      text: 'Moderately popular statement - two people sign',
    });

    const unpopularStatement = await uploadToIPFS({
      statementType: 'text',
      text: 'Unpopular statement - only one person signs',
    });

    console.log('  Creating statements with different support levels...');

    // Popular statement: All three users believe it
    await believeStatement(aliceClients, beliefsContract, popularStatement);
    await believeStatement(bobClients, beliefsContract, popularStatement);
    const txPopular = await believeStatement(charlieClients, beliefsContract, popularStatement);
    const receiptPopular = await charlieClients.publicClient.getTransactionReceipt({ hash: txPopular });

    // Moderate statement: Alice and Bob believe it
    await believeStatement(aliceClients, beliefsContract, moderateStatement);
    const txModerate = await believeStatement(bobClients, beliefsContract, moderateStatement);
    const receiptModerate = await bobClients.publicClient.getTransactionReceipt({ hash: txModerate });

    // Unpopular statement: Only Alice believes it
    const txUnpopular = await believeStatement(aliceClients, beliefsContract, unpopularStatement);
    const receiptUnpopular = await aliceClients.publicClient.getTransactionReceipt({ hash: txUnpopular });

    // Wait for indexer
    console.log('  Waiting for indexer to sync...');
    const maxBlock = [receiptPopular.blockNumber, receiptModerate.blockNumber, receiptUnpopular.blockNumber].reduce((a, b) => a > b ? a : b);
    await waitForSync(graphqlClient, maxBlock);

    // Browse by most supporters (descending order)
    console.log('  Browsing statements by most supporters...');
    const statementsBySupport = await browseStatementsByMostSupporters(graphqlClient, {
      limit: 10,
      orderDirection: 'desc',
    });

    // Convert CIDs to IDs for comparison
    const popularStatementId = cidToBytes32(popularStatement).toLowerCase();
    const moderateStatementId = cidToBytes32(moderateStatement).toLowerCase();
    const unpopularStatementId = cidToBytes32(unpopularStatement).toLowerCase();

    // Find our statements in the results by ID
    const popularResult = statementsBySupport.find(s => s.id.toLowerCase() === popularStatementId);
    const moderateResult = statementsBySupport.find(s => s.id.toLowerCase() === moderateStatementId);
    const unpopularResult = statementsBySupport.find(s => s.id.toLowerCase() === unpopularStatementId);

    // Verify they exist
    assert.ok(popularResult, 'Popular statement should be in results');
    assert.ok(moderateResult, 'Moderate statement should be in results');
    assert.ok(unpopularResult, 'Unpopular statement should be in results');

    // Verify supporter counts
    assert.strictEqual(popularResult!.believerCount, 3, 'Popular statement should have 3 believers');
    assert.strictEqual(moderateResult!.believerCount, 2, 'Moderate statement should have 2 believers');
    assert.strictEqual(unpopularResult!.believerCount, 1, 'Unpopular statement should have 1 believer');

    // Verify order: popular should come before moderate, moderate before unpopular
    const popularIndex = statementsBySupport.indexOf(popularResult!);
    const moderateIndex = statementsBySupport.indexOf(moderateResult!);
    const unpopularIndex = statementsBySupport.indexOf(unpopularResult!);

    assert.ok(
      popularIndex < moderateIndex,
      'Popular statement should appear before moderate statement'
    );
    assert.ok(
      moderateIndex < unpopularIndex,
      'Moderate statement should appear before unpopular statement'
    );

    console.log('  ✓ Statements correctly ordered by supporter count');
  });

  it('should browse newest statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create statements in sequence
    const oldStatement = await uploadToIPFS({
      statementType: 'text',
      text: 'Old statement created first',
    });

    const middleStatement = await uploadToIPFS({
      statementType: 'text',
      text: 'Middle statement created second',
    });

    const newStatement = await uploadToIPFS({
      statementType: 'text',
      text: 'New statement created third',
    });

    console.log('  Creating statements in sequence...');

    // Create them in order (believing creates the statement if it doesn't exist)
    const txOld = await believeStatement(aliceClients, beliefsContract, oldStatement);
    await aliceClients.publicClient.waitForTransactionReceipt({ hash: txOld });

    const txMiddle = await believeStatement(aliceClients, beliefsContract, middleStatement);
    await aliceClients.publicClient.waitForTransactionReceipt({ hash: txMiddle });

    const txNew = await believeStatement(aliceClients, beliefsContract, newStatement);
    const receiptNew = await aliceClients.publicClient.getTransactionReceipt({ hash: txNew });

    // Wait for indexer
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, receiptNew.blockNumber);

    // Browse by newest
    console.log('  Browsing newest statements...');
    const newestStatements = await browseStatementsByNewest(graphqlClient, {
      limit: 10,
      orderDirection: 'desc',
    });

    // Convert CIDs to IDs for comparison
    const oldStatementId = cidToBytes32(oldStatement).toLowerCase();
    const middleStatementId = cidToBytes32(middleStatement).toLowerCase();
    const newStatementId = cidToBytes32(newStatement).toLowerCase();

    // Find our statements by ID
    const oldResult = newestStatements.find(s => s.id.toLowerCase() === oldStatementId);
    const middleResult = newestStatements.find(s => s.id.toLowerCase() === middleStatementId);
    const newResult = newestStatements.find(s => s.id.toLowerCase() === newStatementId);

    // Verify they exist
    assert.ok(oldResult, 'Old statement should be in results');
    assert.ok(middleResult, 'Middle statement should be in results');
    assert.ok(newResult, 'New statement should be in results');

    // Verify order: newest first
    const newIndex = newestStatements.indexOf(newResult!);
    const middleIndex = newestStatements.indexOf(middleResult!);
    const oldIndex = newestStatements.indexOf(oldResult!);

    assert.ok(
      newIndex < middleIndex,
      'Newest statement should appear before middle statement'
    );
    assert.ok(
      middleIndex < oldIndex,
      'Middle statement should appear before old statement'
    );

    console.log('  ✓ Statements correctly ordered by creation time');
  });

  it('should support pagination when browsing statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createTestClients(ALICE_KEY, RPC_URL);
    const graphqlClient = createGraphQLClient(GRAPHQL_URL);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create several statements to test pagination
    console.log('  Creating multiple statements for pagination test...');

    const statements = [];
    for (let i = 0; i < 5; i++) {
      const statement = await uploadToIPFS({
        statementType: 'text',
        text: `Pagination test statement ${i}`,
      });
      statements.push(statement);
    }

    // Believe all statements
    let lastReceipt;
    for (const statement of statements) {
      const tx = await believeStatement(aliceClients, beliefsContract, statement);
      lastReceipt = await aliceClients.publicClient.getTransactionReceipt({ hash: tx });
    }

    // Wait for indexer
    console.log('  Waiting for indexer to sync...');
    await waitForSync(graphqlClient, lastReceipt!.blockNumber);

    // Test pagination: Get first 2 statements
    console.log('  Testing pagination with limit=2...');
    const page1 = await getAllStatements(graphqlClient, { limit: 2, offset: 0 });

    // Test getting next page
    console.log('  Getting next page with offset=2...');
    const page2 = await getAllStatements(graphqlClient, { limit: 2, offset: 2 });

    // Verify we got different statements
    assert.strictEqual(page1.length, 2, 'First page should have 2 statements');
    assert.strictEqual(page2.length, 2, 'Second page should have 2 statements');

    // Verify no overlap (different statement IDs)
    const page1Ids = page1.map(s => s.id);
    const page2Ids = page2.map(s => s.id);

    const hasOverlap = page1Ids.some(id => page2Ids.includes(id));
    assert.ok(!hasOverlap, 'Pages should not have overlapping statements');

    console.log('  ✓ Pagination works correctly');
  });
});
