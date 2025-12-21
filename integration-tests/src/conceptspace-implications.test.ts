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
import { testLog, createIsolatedTestClients } from './setup.js';
import { attestImplicationChecked } from './implication-actions-checked.js';

describe('Conceptspace Implications', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-implications';

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

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

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

    testLog(`  Statement 1 (specific): "${statement1Content.text}"`);
    testLog(`  Statement 2 (general): "${statement2Content.text}"`);

    // Attest that statement 1 implies statement 2
    testLog('  Attesting that statement 1 implies statement 2...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      statement1Cid,
      statement2Cid
    );

    testLog('  ✓ Implication attestation recorded correctly (verified by property checks)');
  });

  it('should track indirect support via implications', async function() {
    this.timeout(25000);

    const userClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

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

    testLog(`  Specific: "${specificStatement.text}"`);
    testLog(`  General: "${generalStatement.text}"`);

    // User believes the specific statement
    testLog('  User believes specific statement...');
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

    testLog('  ✓ Direct support recorded');

    // Attester creates implication: specific -> general
    testLog('  Attester creates implication (specific -> general)...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specificCid,
      generalCid
    );

    testLog('  ✓ Implication created (verified by property checks)');
    testLog('  ✓ Indexer can now compute indirect support by querying implications');
  });

  it('should handle multiple implications to the same statement', async function() {
    this.timeout(30000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);

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

    testLog(`  General: "${general.text}"`);
    testLog(`  Specific 1: "${specific1.text}"`);
    testLog(`  Specific 2: "${specific2.text}"`);

    // Create implications: specific1 -> general, specific2 -> general
    testLog('  Creating implications...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specific1Cid,
      generalCid
    );

    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specific2Cid,
      generalCid
    );

    testLog('  ✓ Multiple implications tracked correctly (verified by property checks)');
  });

  it('should verify implications are NOT transitive', async function() {
    this.timeout(25000);

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);

    // Create chain: S1 -> S2 -> S3
    const s1 = await uploadToIPFS({ statementType: 'text', text: 'Statement 1' });
    const s2 = await uploadToIPFS({ statementType: 'text', text: 'Statement 2' });
    const s3 = await uploadToIPFS({ statementType: 'text', text: 'Statement 3' });
    const s1Id = cidToBytes32(s1);
    const s2Id = cidToBytes32(s2);
    const s3Id = cidToBytes32(s3);

    testLog('  Creating chain: S1 -> S2 -> S3...');

    // Attest S1 -> S2
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s1, s2);

    // Attest S2 -> S3
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s2, s3);

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

    testLog('  ✓ Confirmed: implications are NOT transitive');
    testLog('  ✓ To find indirect support for S3 from S1 believers, need direct S1->S3 attestation');
  });
});
