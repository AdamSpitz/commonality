/**
 * Statement Discovery Integration Test
 *
 * Tests statement browsing and discovery features:
 * - Browse statements by most supporters (direct believers)
 * - Browse newest statements
 * - Browse all statements with pagination
 */

import assert from 'assert';
import { BeliefsAbi } from '@commonality/sdk/abis';
import type { BeliefsContract } from '@commonality/sdk/conceptspace';
import { createStatement, publishDocument } from '@commonality/sdk/displayable-documents';
import { uploadToIPFS, type IpfsCidV1 } from '@commonality/sdk/utils';
import { browseStatementsByMostSupporters, browseStatementsByNewest, getAllStatements } from '@commonality/sdk/conceptspace';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { believeStatementChecked } from '../actions/belief-actions-checked.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';


describe('Statement Discovery & Browsing', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'discovery';

  it('should browse statements by most supporters', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const bobClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);
    const charlieClients = createIsolatedWriteClients(SUITE_NAME, 2, RPC_URL);
    const machinery = createActionTestingMachinery();

    testLog(`  Alice: ${aliceClients.account}`);
    testLog(`  Bob: ${bobClients.account}`);
    testLog(`  Charlie: ${charlieClients.account}`);

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create three statements with different levels of support
    const popularStatement = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Very popular statement - everyone signs this',
    }));

    const moderateStatement = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Moderately popular statement - two people sign',
    }));

    const unpopularStatement = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Unpopular statement - only one person signs',
    }));

    testLog('  Creating statements with different support levels...');

    // Popular statement: All three users believe it
    await believeStatementChecked(aliceClients, beliefsContract, machinery, popularStatement);
    await believeStatementChecked(bobClients, beliefsContract, machinery, popularStatement);
    await believeStatementChecked(charlieClients, beliefsContract, machinery, popularStatement);

    // Moderate statement: Alice and Bob believe it
    await believeStatementChecked(aliceClients, beliefsContract, machinery, moderateStatement);
    await believeStatementChecked(bobClients, beliefsContract, machinery, moderateStatement);

    // Unpopular statement: Only Alice believes it
    await believeStatementChecked(aliceClients, beliefsContract, machinery, unpopularStatement);

    // Browse by most supporters (descending order)
    testLog('  Browsing statements by most supporters...');
    const statementsBySupport = await browseStatementsByMostSupporters(machinery, {
      limit: 100, // Increased limit to ensure we get all statements including those with low believer counts
      orderDirection: 'desc',
    });

    // Find our statements in the results by ID
    const popularResult = statementsBySupport.find(s => s.id === popularStatement);
    const moderateResult = statementsBySupport.find(s => s.id === moderateStatement);
    const unpopularResult = statementsBySupport.find(s => s.id === unpopularStatement);

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

    testLog('  ✓ Statements correctly ordered by supporter count');
  });

  it('should browse newest statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const machinery = createActionTestingMachinery();

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create statements in sequence
    const oldStatement = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Old statement created first',
    }));

    const middleStatement = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'Middle statement created second',
    }));

    const newStatement = await publishDocument(machinery.ipfsConfig, createStatement({
      content: 'New statement created third',
    }));

    testLog('  Creating statements in sequence...');

    // Create them in order (believing creates the statement if it doesn't exist)
    await believeStatementChecked(aliceClients, beliefsContract, machinery, oldStatement);
    await believeStatementChecked(aliceClients, beliefsContract, machinery, middleStatement);
    await believeStatementChecked(aliceClients, beliefsContract, machinery, newStatement);

    // Browse by newest
    testLog('  Browsing newest statements...');
    const newestStatements = await browseStatementsByNewest(machinery, {
      limit: 10,
      orderDirection: 'desc',
    });

    // Find our statements by ID
    const oldResult = newestStatements.find(s => s.id === oldStatement);
    const middleResult = newestStatements.find(s => s.id === middleStatement);
    const newResult = newestStatements.find(s => s.id === newStatement);

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

    testLog('  ✓ Statements correctly ordered by creation time');
  });

  it('should support pagination when browsing statements', async () => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set in environment');
    }

    const aliceClients = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const machinery = createActionTestingMachinery();

    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    // Create several statements to test pagination
    testLog('  Creating multiple statements for pagination test...');

    const statements: IpfsCidV1[] = [];
    for (let i = 0; i < 5; i++) {
      const statement = await uploadToIPFS(machinery.ipfsConfig, {
        statementType: 'text',
        text: `Pagination test statement ${i}`,
      });
      statements.push(statement);
    }

    // Believe all statements
    for (const statement of statements) {
      await believeStatementChecked(aliceClients, beliefsContract, machinery, statement);
    }

    // Test pagination: Get first 2 statements
    testLog('  Testing pagination with limit=2...');
    const page1 = await getAllStatements(machinery, { limit: 2, offset: 0 });

    // Test getting next page
    testLog('  Getting next page with offset=2...');
    const page2 = await getAllStatements(machinery, { limit: 2, offset: 2 });

    // Verify we got different statements
    assert.strictEqual(page1.length, 2, 'First page should have 2 statements');
    assert.strictEqual(page2.length, 2, 'Second page should have 2 statements');

    // Verify no overlap (different statement IDs)
    const page1Ids = page1.map(s => s.id);
    const page2Ids = page2.map(s => s.id);

    const hasOverlap = page1Ids.some(id => page2Ids.includes(id));
    assert.ok(!hasOverlap, 'Pages should not have overlapping statements');

    testLog('  ✓ Pagination works correctly');
  });
});
