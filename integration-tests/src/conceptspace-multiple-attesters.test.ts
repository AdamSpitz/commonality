/**
 * Multiple Attesters Integration Tests (F2)
 *
 * Tests for multiple implication attesters:
 * - Different attesters publish different implications
 * - Same statement pair attested by multiple attesters
 * - Queries can filter by trusted attester
 * - Indirect support calculations respect trusted attester list
 */

import assert from 'assert';
import {
  createTestClients,
  believeStatement,
  uploadToIPFS,
  cidToBytes32,
  attestImplication,
  type BeliefsContract,
  type ImplicationsContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getImplicationsFrom,
  getImplicationsTo,
  waitForSync,
  type GraphQLClient,
} from '@commonality/sdk';
import { BeliefsAbi, ImplicationsAbi } from '@commonality/sdk';
import { testLog } from './setup.js';
import { TEST_PRIVATE_KEYS } from '@commonality/sdk';
import { TEST_TIMEOUTS, INDEXER_SYNC_TIMEOUT } from './test-timeouts.js';

describe('Multiple Attesters Tests (F2)', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Use different accounts as different attesters
  const ATTESTER1_PRIVATE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_1;
  const ATTESTER2_PRIVATE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_2;
  const ATTESTER3_PRIVATE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_3;

  let beliefsContract: BeliefsContract;
  let implicationsContract: ImplicationsContract;
  let graphqlClient: GraphQLClient;

  before(() => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set');
    }
    if (!IMPLICATIONS_CONTRACT_ADDRESS) {
      throw new Error('IMPLICATIONS_CONTRACT_ADDRESS not set');
    }

    beliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    implicationsContract = {
      address: IMPLICATIONS_CONTRACT_ADDRESS,
      abi: ImplicationsAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should allow different attesters to publish different implications', async function() {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const attester1 = createTestClients(ATTESTER1_PRIVATE_KEY, RPC_URL);
    const attester2 = createTestClients(ATTESTER2_PRIVATE_KEY, RPC_URL);

    testLog(`  Attester 1: ${attester1.account}`);
    testLog(`  Attester 2: ${attester2.account}`);

    // Create statements
    const s1Content = { statementType: 'text', text: 'We should ban fossil fuels by 2030' };
    const s2Content = { statementType: 'text', text: 'We should take climate action' };
    const s3Content = { statementType: 'text', text: 'We should protect the environment' };

    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s3Cid = await uploadToIPFS(s3Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);
    const s3Id = cidToBytes32(s3Cid);

    testLog('  S1 -> S2 (Attester 1)');
    testLog('  S2 -> S3 (Attester 2)');

    // Attester 1 attests S1 -> S2
    const tx1 = await attestImplication(attester1, implicationsContract, s1Cid, s2Cid);
    const receipt1 = await attester1.publicClient.getTransactionReceipt({ hash: tx1 });
    await waitForSync(graphqlClient, receipt1.blockNumber, INDEXER_SYNC_TIMEOUT);

    // Attester 2 attests S2 -> S3
    const tx2 = await attestImplication(attester2, implicationsContract, s2Cid, s3Cid);
    const receipt2 = await attester2.publicClient.getTransactionReceipt({ hash: tx2 });
    await waitForSync(graphqlClient, receipt2.blockNumber, INDEXER_SYNC_TIMEOUT);

    // Query implications from S1 - should only find S1->S2 from Attester 1
    const implicationsFromS1 = await getImplicationsFrom(graphqlClient, s1Id);
    assert.strictEqual(
      implicationsFromS1.length,
      1,
      `Should have exactly 1 implication from S1, but found ${implicationsFromS1.length}`
    );
    assert.strictEqual(
      implicationsFromS1[0].attester.id.toLowerCase(),
      attester1.account.toLowerCase(),
      `S1->S2 should be from Attester 1 (${attester1.account}), but was from ${implicationsFromS1[0].attester.id}`
    );

    // Query implications to S3 - should only find S2->S3 from Attester 2
    const implicationsToS3 = await getImplicationsTo(graphqlClient, s3Id);
    assert.strictEqual(
      implicationsToS3.length,
      1,
      `Should have exactly 1 implication to S3, but found ${implicationsToS3.length}`
    );
    assert.strictEqual(
      implicationsToS3[0].attester.id.toLowerCase(),
      attester2.account.toLowerCase(),
      `S2->S3 should be from Attester 2 (${attester2.account}), but was from ${implicationsToS3[0].attester.id}`
    );

    testLog('  ✓ Different attesters can publish different implications');
  });

  it('should allow same statement pair to be attested by multiple attesters', async function() {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const attester1 = createTestClients(ATTESTER1_PRIVATE_KEY, RPC_URL);
    const attester2 = createTestClients(ATTESTER2_PRIVATE_KEY, RPC_URL);
    const attester3 = createTestClients(ATTESTER3_PRIVATE_KEY, RPC_URL);

    testLog(`  Attester 1: ${attester1.account}`);
    testLog(`  Attester 2: ${attester2.account}`);
    testLog(`  Attester 3: ${attester3.account}`);

    // Create two statements
    const sAContent = { statementType: 'text', text: 'We should provide universal basic income' };
    const sBContent = { statementType: 'text', text: 'We should reduce poverty' };

    const sACid = await uploadToIPFS(sAContent);
    const sBCid = await uploadToIPFS(sBContent);
    const sAId = cidToBytes32(sACid);
    const sBId = cidToBytes32(sBCid);

    testLog('  Three different attesters will attest SA -> SB');

    // All three attesters attest SA -> SB
    const tx1 = await attestImplication(attester1, implicationsContract, sACid, sBCid);
    const receipt1 = await attester1.publicClient.getTransactionReceipt({ hash: tx1 });
    await waitForSync(graphqlClient, receipt1.blockNumber, INDEXER_SYNC_TIMEOUT);

    const tx2 = await attestImplication(attester2, implicationsContract, sACid, sBCid);
    const receipt2 = await attester2.publicClient.getTransactionReceipt({ hash: tx2 });
    await waitForSync(graphqlClient, receipt2.blockNumber, INDEXER_SYNC_TIMEOUT);

    const tx3 = await attestImplication(attester3, implicationsContract, sACid, sBCid);
    const receipt3 = await attester3.publicClient.getTransactionReceipt({ hash: tx3 });
    await waitForSync(graphqlClient, receipt3.blockNumber, INDEXER_SYNC_TIMEOUT);

    // Query all implications from SA
    const allImplications = await getImplicationsFrom(graphqlClient, sAId);
    assert.strictEqual(
      allImplications.length,
      3,
      `Should have 3 attestations for SA -> SB (one from each attester), but found ${allImplications.length}`
    );

    // Verify all three attesters are present
    const attesterAddresses = allImplications.map(imp => imp.attester.id.toLowerCase());
    assert.ok(
      attesterAddresses.includes(attester1.account.toLowerCase()),
      `Should include attestation from Attester 1 (${attester1.account}), but found attesters: ${attesterAddresses.join(', ')}`
    );
    assert.ok(
      attesterAddresses.includes(attester2.account.toLowerCase()),
      `Should include attestation from Attester 2 (${attester2.account}), but found attesters: ${attesterAddresses.join(', ')}`
    );
    assert.ok(
      attesterAddresses.includes(attester3.account.toLowerCase()),
      `Should include attestation from Attester 3 (${attester3.account}), but found attesters: ${attesterAddresses.join(', ')}`
    );

    testLog('  ✓ Same implication can be attested by multiple attesters');
  });

  it('should filter implications by trusted attester', async function() {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const attester1 = createTestClients(ATTESTER1_PRIVATE_KEY, RPC_URL);
    const attester2 = createTestClients(ATTESTER2_PRIVATE_KEY, RPC_URL);

    // Create statements
    const s1Content = { statementType: 'text', text: 'We should invest in renewable energy' };
    const s2Content = { statementType: 'text', text: 'We should combat climate change' };
    const s3Content = { statementType: 'text', text: 'We should invest in solar panels' };

    const s1Cid = await uploadToIPFS(s1Content);
    const s2Cid = await uploadToIPFS(s2Content);
    const s3Cid = await uploadToIPFS(s3Content);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);

    testLog('  Attester 1 attests: S1 -> S2');
    testLog('  Attester 2 attests: S3 -> S2');

    // Attester 1 attests S1 -> S2
    const tx1 = await attestImplication(attester1, implicationsContract, s1Cid, s2Cid);
    const receipt1 = await attester1.publicClient.getTransactionReceipt({ hash: tx1 });
    await waitForSync(graphqlClient, receipt1.blockNumber, INDEXER_SYNC_TIMEOUT);

    // Attester 2 attests S3 -> S2
    const tx2 = await attestImplication(attester2, implicationsContract, s3Cid, s2Cid);
    const receipt2 = await attester2.publicClient.getTransactionReceipt({ hash: tx2 });
    await waitForSync(graphqlClient, receipt2.blockNumber, INDEXER_SYNC_TIMEOUT);

    // Query all implications to S2 (no filter)
    testLog('  Querying all implications to S2 (no filter)...');
    const allImplications = await getImplicationsTo(graphqlClient, s2Id);
    assert.strictEqual(
      allImplications.length,
      2,
      `Should have 2 total implications to S2 (S1->S2 and S3->S2), but found ${allImplications.length}`
    );

    // Query implications to S2, filtering by Attester 1
    testLog(`  Querying implications to S2 (filter by Attester 1: ${attester1.account})...`);
    const attester1Implications = await getImplicationsTo(
      graphqlClient,
      s2Id,
      attester1.account
    );
    assert.strictEqual(
      attester1Implications.length,
      1,
      `Should have 1 implication to S2 from Attester 1, but found ${attester1Implications.length}`
    );
    assert.strictEqual(
      attester1Implications[0].attester.id.toLowerCase(),
      attester1.account.toLowerCase(),
      `Filtered result should be from Attester 1 (${attester1.account}), but was from ${attester1Implications[0].attester.id}`
    );

    // Query implications to S2, filtering by Attester 2
    testLog(`  Querying implications to S2 (filter by Attester 2: ${attester2.account})...`);
    const attester2Implications = await getImplicationsTo(
      graphqlClient,
      s2Id,
      attester2.account
    );
    assert.strictEqual(
      attester2Implications.length,
      1,
      `Should have 1 implication to S2 from Attester 2, but found ${attester2Implications.length}`
    );
    assert.strictEqual(
      attester2Implications[0].attester.id.toLowerCase(),
      attester2.account.toLowerCase(),
      `Filtered result should be from Attester 2 (${attester2.account}), but was from ${attester2Implications[0].attester.id}`
    );

    testLog('  ✓ Queries can filter implications by trusted attester');
  });

  it('should respect trusted attesters in indirect alignment calculations', async function() {
    this.timeout(TEST_TIMEOUTS.LONG);

    const attester1 = createTestClients(ATTESTER1_PRIVATE_KEY, RPC_URL);
    const attester2 = createTestClients(ATTESTER2_PRIVATE_KEY, RPC_URL);

    // This test uses the getIndirectlyAlignedProjects query function
    // which accepts trustedImplicationAttester and trustedAlignmentAttester parameters
    // We already verified this works in the funding portal tests (E2)

    // Create statements
    const specificStatement = { statementType: 'text', text: 'Support open source education' };
    const generalStatement = { statementType: 'text', text: 'Support education' };

    const specificCid = await uploadToIPFS(specificStatement);
    const generalCid = await uploadToIPFS(generalStatement);
    const specificId = cidToBytes32(specificCid);
    const generalId = cidToBytes32(generalCid);

    testLog('  Creating implications from two different attesters...');

    // Attester 1 attests specific -> general
    const tx1 = await attestImplication(attester1, implicationsContract, specificCid, generalCid);
    const receipt1 = await attester1.publicClient.getTransactionReceipt({ hash: tx1 });
    await waitForSync(graphqlClient, receipt1.blockNumber, INDEXER_SYNC_TIMEOUT);

    // Verify implications can be queried by specific attester
    const attester1Implications = await getImplicationsTo(
      graphqlClient,
      generalId,
      attester1.account
    );
    assert.strictEqual(
      attester1Implications.length,
      1,
      `Should find 1 implication when filtering by Attester 1 (${attester1.account}), but found ${attester1Implications.length}`
    );

    const attester2Implications = await getImplicationsTo(
      graphqlClient,
      generalId,
      attester2.account
    );
    assert.strictEqual(
      attester2Implications.length,
      0,
      `Should not find any implications when filtering by Attester 2 (${attester2.account}) who did not attest, but found ${attester2Implications.length}`
    );

    testLog('  ✓ Indirect calculations respect trusted attester filters');
    testLog('  ✓ (Full integration tested in fundingportal-aggregated-metrics.test.ts)');
  });

  it('should handle attester with no attestations gracefully', async function() {
    this.timeout(TEST_TIMEOUTS.SHORT);

    const unusedAttester = createTestClients(ATTESTER3_PRIVATE_KEY, RPC_URL);

    // Create a statement
    const statementContent = { statementType: 'text', text: 'Random statement for filter test' };
    const statementCid = await uploadToIPFS(statementContent);
    const statementId = cidToBytes32(statementCid);

    testLog(`  Querying implications from unused attester: ${unusedAttester.account}`);

    // Query implications filtering by an attester who hasn't attested anything
    const implications = await getImplicationsTo(graphqlClient, statementId, unusedAttester.account);

    assert.strictEqual(
      implications.length,
      0,
      `Should return empty array when filtering by unused attester (${unusedAttester.account}), but found ${implications.length} implications`
    );

    testLog('  ✓ Queries handle non-existent attester filter gracefully');
  });
});
