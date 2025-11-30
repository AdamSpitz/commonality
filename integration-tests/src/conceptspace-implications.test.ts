/**
 * Conceptspace Implications Integration Tests
 *
 * Tests for implication attestations and indirect support:
 * - Attest that one statement implies another
 * - Track indirect support via implications
 * - Multiple attesters
 * - Implication chains (non-transitive)
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
  getStatement,
  getUserBelief,
  getImplicationsFrom,
  getImplicationsTo,
  waitForSync,
  assertNotNull,
} from '@commonality/sdk';
import { BeliefsAbi, ImplicationsAbi } from '@commonality/sdk';
import { TEST_PRIVATE_KEYS } from '@commonality/sdk';

describe('Conceptspace Implications', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const USER_PRIVATE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const ATTESTER_PRIVATE_KEY = TEST_PRIVATE_KEYS.ACCOUNT_1;

  let beliefsContract: BeliefsContract;
  let implicationsContract: ImplicationsContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

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

  it('should record implication attestations', async function() {
    this.timeout(20000);

    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

    // Create two statements
    const statement1Content = {
      statementType: 'text',
      text: 'We should reduce carbon emissions by 50% by 2030',
    };
    const statement2Content = {
      statementType: 'text',
      text: 'We should take action on climate change',
    };

    const statement1Cid = await uploadToIPFS(statement1Content);
    const statement2Cid = await uploadToIPFS(statement2Content);
    const statement1Id = cidToBytes32(statement1Cid);
    const statement2Id = cidToBytes32(statement2Cid);

    console.log(`  Statement 1 (specific): "${statement1Content.text}"`);
    console.log(`  Statement 2 (general): "${statement2Content.text}"`);

    // Attest that statement 1 implies statement 2
    console.log('  Attesting that statement 1 implies statement 2...');
    const txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      statement1Cid,
      statement2Cid
    );
    const receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Query the implication
    const implicationsFrom = await getImplicationsFrom(graphqlClient, statement1Id);
    assert.strictEqual(implicationsFrom.length, 1, 'Should have 1 implication from statement 1');
    assert.strictEqual(
      implicationsFrom[0].fromStatementId.toLowerCase(),
      statement1Id.toLowerCase()
    );
    assert.strictEqual(
      implicationsFrom[0].toStatementId.toLowerCase(),
      statement2Id.toLowerCase()
    );
    assert.strictEqual(
      implicationsFrom[0].attester.id.toLowerCase(),
      attesterClients.account.toLowerCase()
    );

    const implicationsTo = await getImplicationsTo(graphqlClient, statement2Id);
    assert.strictEqual(implicationsTo.length, 1, 'Should have 1 implication to statement 2');

    console.log('  ✓ Implication attestation recorded correctly');
  });

  it('should track indirect support via implications', async function() {
    this.timeout(25000);

    const userClients = createTestClients(USER_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

    // Create two statements: specific -> general
    const specificStatement = {
      statementType: 'text',
      text: 'We should adopt universal healthcare with a single-payer system',
    };
    const generalStatement = {
      statementType: 'text',
      text: 'Everyone should have access to healthcare',
    };

    const specificCid = await uploadToIPFS(specificStatement);
    const generalCid = await uploadToIPFS(generalStatement);
    const specificId = cidToBytes32(specificCid);
    const generalId = cidToBytes32(generalCid);

    console.log(`  Specific: "${specificStatement.text}"`);
    console.log(`  General: "${generalStatement.text}"`);

    // User believes the specific statement
    console.log('  User believes specific statement...');
    let txHash = await believeStatement(userClients, beliefsContract, specificCid);
    let receipt = await userClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify only direct support initially
    let specificStmt = assertNotNull(
      await getStatement(graphqlClient, specificId),
      'Specific statement'
    );
    let generalStmt = await getStatement(graphqlClient, generalId);

    assert.strictEqual(specificStmt.believerCount, 1, 'Specific statement should have 1 direct believer');
    // General statement may not exist yet in the indexer if no one has interacted with it
    assert.ok(
      !generalStmt || generalStmt.believerCount === 0,
      'General statement should have 0 direct believers initially (or not exist yet)'
    );

    console.log('  ✓ Direct support recorded');

    // Attester creates implication: specific -> general
    console.log('  Attester creates implication (specific -> general)...');
    txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      specificCid,
      generalCid
    );
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify implication was recorded
    const implications = await getImplicationsTo(graphqlClient, generalId);
    assert.strictEqual(implications.length, 1, 'General statement should have 1 implication pointing to it');

    console.log('  ✓ Implication created');
    console.log('  ✓ Indexer can now compute indirect support by querying implications');
  });

  it('should handle multiple implications to the same statement', async function() {
    this.timeout(30000);

    const user1Clients = createTestClients(USER_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

    // Create three specific statements that all imply a general one
    const general = {
      statementType: 'text',
      text: 'We need education reform',
    };
    const specific1 = {
      statementType: 'text',
      text: 'We should increase teacher salaries',
    };
    const specific2 = {
      statementType: 'text',
      text: 'We should reduce class sizes',
    };

    const generalCid = await uploadToIPFS(general);
    const specific1Cid = await uploadToIPFS(specific1);
    const specific2Cid = await uploadToIPFS(specific2);
    const generalId = cidToBytes32(generalCid);

    console.log(`  General: "${general.text}"`);
    console.log(`  Specific 1: "${specific1.text}"`);
    console.log(`  Specific 2: "${specific2.text}"`);

    // Create implications: specific1 -> general, specific2 -> general
    console.log('  Creating implications...');
    let txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      specific1Cid,
      generalCid
    );
    let receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      specific2Cid,
      generalCid
    );
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify both implications exist
    const implicationsTo = await getImplicationsTo(graphqlClient, generalId);
    assert.strictEqual(
      implicationsTo.length,
      2,
      'General statement should have 2 implications pointing to it'
    );

    console.log('  ✓ Multiple implications tracked correctly');
  });

  it('should verify implications are NOT transitive', async function() {
    this.timeout(25000);

    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

    // Create chain: S1 -> S2 -> S3
    const s1 = await uploadToIPFS({ statementType: 'text', text: 'Statement 1' });
    const s2 = await uploadToIPFS({ statementType: 'text', text: 'Statement 2' });
    const s3 = await uploadToIPFS({ statementType: 'text', text: 'Statement 3' });
    const s1Id = cidToBytes32(s1);
    const s2Id = cidToBytes32(s2);
    const s3Id = cidToBytes32(s3);

    console.log('  Creating chain: S1 -> S2 -> S3...');

    // Attest S1 -> S2
    let txHash = await attestImplication(attesterClients, implicationsContract, s1, s2);
    let receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Attest S2 -> S3
    txHash = await attestImplication(attesterClients, implicationsContract, s2, s3);
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify S1 -> S2 exists
    const s1Implications = await getImplicationsFrom(graphqlClient, s1Id);
    assert.strictEqual(s1Implications.length, 1);
    assert.strictEqual(s1Implications[0].toStatementId.toLowerCase(), s2Id.toLowerCase());

    // Verify S2 -> S3 exists
    const s2Implications = await getImplicationsFrom(graphqlClient, s2Id);
    assert.strictEqual(s2Implications.length, 1);
    assert.strictEqual(s2Implications[0].toStatementId.toLowerCase(), s3Id.toLowerCase());

    // Verify S1 -> S3 does NOT exist (no transitivity)
    const s3ImplicationsTo = await getImplicationsTo(graphqlClient, s3Id);
    const s1ToS3 = s3ImplicationsTo.find(
      imp => imp.fromStatementId.toLowerCase() === s1Id.toLowerCase()
    );
    assert.strictEqual(s1ToS3, undefined, 'S1 -> S3 should NOT exist (implications are not transitive)');

    console.log('  ✓ Confirmed: implications are NOT transitive');
    console.log('  ✓ To find indirect support for S3 from S1 believers, need direct S1->S3 attestation');
  });
});
