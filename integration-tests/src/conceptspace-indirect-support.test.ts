/**
 * Conceptspace Indirect Support Integration Tests
 *
 * Tests for computing indirect support via implication chains:
 * - Query indirect supporter count
 * - Query list of indirect supporters
 * - Exclude users who explicitly disbelieve from indirect support
 * - Multiple implication chains converging on one statement
 */

import assert from 'assert';
import {
  uploadToIPFS,
  cidToBytes32,
  type BeliefsContract,
  type ImplicationsContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
  getStatement,
  getImplicationsTo,
  getIndirectSupporters,
  getIndirectSupporterCount,
  getUserIndirectSupport,
  assertNotNull,
} from '@commonality/sdk';
import { BeliefsAbi, ImplicationsAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import { believeStatementChecked, disbelieveStatementChecked } from './belief-actions-checked.js';
import { attestImplicationChecked } from './implication-actions-checked.js';
import { assertIndirectSupporterCountConsistency } from './invariants.js';

describe('Conceptspace Indirect Support', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-indirect-support';

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

  it('should compute indirect supporter count', async function() {
    this.timeout(30000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create two statements: specific -> general
    const specificStatement = {
      statementType: 'text',
      text: 'We should transition to 100% renewable energy by 2035',
    };
    const generalStatement = {
      statementType: 'text',
      text: 'We should address climate change',
    };

    const specificCid = await uploadToIPFS(specificStatement);
    const generalCid = await uploadToIPFS(generalStatement);
    const specificId = cidToBytes32(specificCid);
    const generalId = cidToBytes32(generalCid);

    testLog(`  Specific: "${specificStatement.text}"`);
    testLog(`  General: "${generalStatement.text}"`);

    // User1 and User2 believe the specific statement
    testLog('  User1 and User2 believe specific statement...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, specificCid);
    await believeStatementChecked(user2Clients, beliefsContract, graphqlClient, specificCid);

    // Verify direct support
    const specificStmt = assertNotNull(
      await getStatement(graphqlClient, specificId),
      'Specific statement'
    );
    assert.strictEqual(specificStmt.believerCount, 2, 'Specific statement should have 2 direct believers');

    // General statement should have 0 indirect supporters initially (no implication yet)
    let indirectCount = await getIndirectSupporterCount(graphqlClient, generalId);
    assert.strictEqual(indirectCount, 0, 'General statement should have 0 indirect supporters initially');

    testLog('  ✓ Direct support verified, no indirect support yet');

    // Attester creates implication: specific -> general
    testLog('  Attester creates implication (specific -> general)...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specificCid,
      generalCid,
      [user1Clients.account, user2Clients.account] // These users believe the specific statement
    );

    // Now general statement should have 2 indirect supporters
    indirectCount = await getIndirectSupporterCount(graphqlClient, generalId);
    assert.strictEqual(
      indirectCount,
      2,
      'General statement should have 2 indirect supporters after implication'
    );

    // Verify query consistency: count should match list length
    await assertIndirectSupporterCountConsistency(graphqlClient, generalId);

    testLog('  ✓ Indirect supporter count computed correctly: 2 supporters');
    testLog('  ✓ Query consistency verified (count matches list)');
  });

  it('should return list of indirect supporters with details', async function() {
    this.timeout(30000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create statements
    const specific1 = {
      statementType: 'text',
      text: 'We should ban single-use plastics nationwide',
    };
    const specific2 = {
      statementType: 'text',
      text: 'We should implement plastic bottle deposit systems',
    };
    const general = {
      statementType: 'text',
      text: 'We should reduce plastic waste',
    };

    const specific1Cid = await uploadToIPFS(specific1);
    const specific2Cid = await uploadToIPFS(specific2);
    const generalCid = await uploadToIPFS(general);
    const specific1Id = cidToBytes32(specific1Cid);
    const specific2Id = cidToBytes32(specific2Cid);
    const generalId = cidToBytes32(generalCid);

    testLog(`  Specific 1: "${specific1.text}"`);
    testLog(`  Specific 2: "${specific2.text}"`);
    testLog(`  General: "${general.text}"`);

    // User1 believes specific1, User2 believes specific2
    testLog('  User1 believes specific1, User2 believes specific2...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, specific1Cid);
    await believeStatementChecked(user2Clients, beliefsContract, graphqlClient, specific2Cid);

    // Create implications: specific1 -> general, specific2 -> general
    testLog('  Creating implications...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specific1Cid,
      generalCid,
      [user1Clients.account]
    );

    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specific2Cid,
      generalCid,
      [user2Clients.account]
    );

    // Get indirect supporters list
    const indirectSupporters = await getIndirectSupporters(graphqlClient, generalId);

    assert.strictEqual(indirectSupporters.length, 2, 'Should have 2 indirect supporters');

    // Verify supporter details
    const user1Address = user1Clients.account.toLowerCase();
    const user2Address = user2Clients.account.toLowerCase();

    const user1Supporter = indirectSupporters.find(s => s.user.toLowerCase() === user1Address);
    const user2Supporter = indirectSupporters.find(s => s.user.toLowerCase() === user2Address);

    assert.ok(user1Supporter, 'User1 should be in indirect supporters');
    assert.ok(user2Supporter, 'User2 should be in indirect supporters');

    assert.strictEqual(
      user1Supporter!.viaStatementId.toLowerCase(),
      specific1Id.toLowerCase(),
      'User1 supports via specific1'
    );
    assert.strictEqual(
      user2Supporter!.viaStatementId.toLowerCase(),
      specific2Id.toLowerCase(),
      'User2 supports via specific2'
    );

    // Verify query consistency
    await assertIndirectSupporterCountConsistency(graphqlClient, generalId);

    testLog('  ✓ Indirect supporters list returned with correct details');
    testLog('  ✓ Query consistency verified');
  });

  it('should exclude users who explicitly disbelieve from indirect support', async function() {
    this.timeout(30000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create statements
    const specific = {
      statementType: 'text',
      text: 'We should implement carbon taxes',
    };
    const general = {
      statementType: 'text',
      text: 'We should reduce greenhouse gas emissions',
    };

    const specificCid = await uploadToIPFS(specific);
    const generalCid = await uploadToIPFS(general);
    const specificId = cidToBytes32(specificCid);
    const generalId = cidToBytes32(generalCid);

    testLog(`  Specific: "${specific.text}"`);
    testLog(`  General: "${general.text}"`);

    // User1 and User2 believe the specific statement
    testLog('  User1 and User2 believe specific statement...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, specificCid);
    await believeStatementChecked(user2Clients, beliefsContract, graphqlClient, specificCid);

    // User1 explicitly disbelieves the general statement
    testLog('  User1 explicitly disbelieves the general statement...');
    await disbelieveStatementChecked(user1Clients, beliefsContract, graphqlClient, generalCid);

    // Create implication: specific -> general
    testLog('  Creating implication (specific -> general)...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      specificCid,
      generalCid,
      [user1Clients.account, user2Clients.account]
    );

    // Get indirect supporters - should only include User2, not User1
    const indirectSupporters = await getIndirectSupporters(graphqlClient, generalId);
    const indirectCount = await getIndirectSupporterCount(graphqlClient, generalId);

    assert.strictEqual(
      indirectCount,
      1,
      'Should have only 1 indirect supporter (User1 excluded due to disbelief)'
    );
    assert.strictEqual(indirectSupporters.length, 1, 'Supporters list should have 1 entry');

    const user2Address = user2Clients.account.toLowerCase();
    assert.strictEqual(
      indirectSupporters[0].user.toLowerCase(),
      user2Address,
      'The indirect supporter should be User2'
    );

    // Verify query consistency
    await assertIndirectSupporterCountConsistency(graphqlClient, generalId);

    testLog('  ✓ User1 correctly excluded from indirect support due to explicit disbelief');
    testLog('  ✓ User2 correctly included in indirect support');
    testLog('  ✓ Query consistency verified');
  });

  it('should handle multiple implication chains converging on one statement', async function() {
    this.timeout(40000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const user2Clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    const user3Clients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create a convergence pattern:
    // S1 (user1 believes) -> S_general
    // S2 (user2 believes) -> S_general
    // S3 (user3 believes) -> S_general
    const s1 = {
      statementType: 'text',
      text: 'We should invest in solar energy infrastructure',
    };
    const s2 = {
      statementType: 'text',
      text: 'We should invest in wind energy infrastructure',
    };
    const s3 = {
      statementType: 'text',
      text: 'We should invest in nuclear energy infrastructure',
    };
    const sGeneral = {
      statementType: 'text',
      text: 'We should transition away from fossil fuels',
    };

    const s1Cid = await uploadToIPFS(s1);
    const s2Cid = await uploadToIPFS(s2);
    const s3Cid = await uploadToIPFS(s3);
    const sGeneralCid = await uploadToIPFS(sGeneral);
    const sGeneralId = cidToBytes32(sGeneralCid);

    testLog(`  S1: "${s1.text}"`);
    testLog(`  S2: "${s2.text}"`);
    testLog(`  S3: "${s3.text}"`);
    testLog(`  General: "${sGeneral.text}"`);

    // Each user believes a different specific statement
    testLog('  Users believe their respective specific statements...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, s1Cid);
    await believeStatementChecked(user2Clients, beliefsContract, graphqlClient, s2Cid);
    await believeStatementChecked(user3Clients, beliefsContract, graphqlClient, s3Cid);

    // Create convergent implications
    testLog('  Creating convergent implications...');
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s1Cid, sGeneralCid, [user1Clients.account]);
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s2Cid, sGeneralCid, [user2Clients.account]);
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s3Cid, sGeneralCid, [user3Clients.account]);

    // Verify all 3 implications exist
    const implicationsTo = await getImplicationsTo(graphqlClient, sGeneralId);
    assert.strictEqual(
      implicationsTo.length,
      3,
      'General statement should have 3 implications pointing to it'
    );

    // Get indirect supporters
    const indirectSupporters = await getIndirectSupporters(graphqlClient, sGeneralId);
    const indirectCount = await getIndirectSupporterCount(graphqlClient, sGeneralId);

    assert.strictEqual(indirectCount, 3, 'Should have 3 indirect supporters');
    assert.strictEqual(indirectSupporters.length, 3, 'Supporters list should have 3 entries');

    // Verify all three users are included
    const user1Address = user1Clients.account.toLowerCase();
    const user2Address = user2Clients.account.toLowerCase();
    const user3Address = user3Clients.account.toLowerCase();

    const userAddresses = indirectSupporters.map(s => s.user.toLowerCase());
    assert.ok(userAddresses.includes(user1Address), 'User1 should be in supporters');
    assert.ok(userAddresses.includes(user2Address), 'User2 should be in supporters');
    assert.ok(userAddresses.includes(user3Address), 'User3 should be in supporters');

    // Verify query consistency
    await assertIndirectSupporterCountConsistency(graphqlClient, sGeneralId);

    testLog('  ✓ All 3 users correctly identified as indirect supporters');
    testLog('  ✓ Multiple convergent implication chains handled correctly');
    testLog('  ✓ Query consistency verified');
  });

  it('should handle user believing multiple statements that imply the same target', async function() {
    this.timeout(30000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create statements where User1 believes both S1 and S2, both imply S_target
    const s1 = {
      statementType: 'text',
      text: 'We should expand public transportation in cities',
    };
    const s2 = {
      statementType: 'text',
      text: 'We should create more bike lanes',
    };
    const sTarget = {
      statementType: 'text',
      text: 'We should reduce car dependency',
    };

    const s1Cid = await uploadToIPFS(s1);
    const s2Cid = await uploadToIPFS(s2);
    const sTargetCid = await uploadToIPFS(sTarget);
    const sTargetId = cidToBytes32(sTargetCid);

    testLog(`  S1: "${s1.text}"`);
    testLog(`  S2: "${s2.text}"`);
    testLog(`  Target: "${sTarget.text}"`);

    // User1 believes both S1 and S2
    testLog('  User1 believes both S1 and S2...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, s1Cid);
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, s2Cid);

    // Create implications: S1 -> Target, S2 -> Target
    testLog('  Creating implications...');
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s1Cid, sTargetCid, [user1Clients.account]);
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s2Cid, sTargetCid, [user1Clients.account]);

    // Get indirect supporters - User1 should appear only once despite believing 2 implying statements
    const indirectSupporters = await getIndirectSupporters(graphqlClient, sTargetId);
    const indirectCount = await getIndirectSupporterCount(graphqlClient, sTargetId);

    assert.strictEqual(
      indirectCount,
      1,
      'Should count User1 only once despite multiple implication paths'
    );
    assert.strictEqual(indirectSupporters.length, 1, 'Supporters list should have 1 entry');

    const user1Address = user1Clients.account.toLowerCase();
    assert.strictEqual(
      indirectSupporters[0].user.toLowerCase(),
      user1Address,
      'The indirect supporter should be User1'
    );

    // Verify query consistency
    await assertIndirectSupporterCountConsistency(graphqlClient, sTargetId);

    testLog('  ✓ User correctly counted once despite multiple implication paths');
    testLog('  ✓ Query consistency verified');
  });

  it('should efficiently get all indirect support for a user (getUserIndirectSupport)', async function() {
    this.timeout(40000);

    const user1Clients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create a user who believes multiple statements, each implying different targets
    // User1 believes S1, S2, S3
    // S1 -> Target1
    // S2 -> Target2
    // S3 -> Target3
    const s1 = {
      statementType: 'text',
      text: 'We should increase minimum wage to $20/hour',
    };
    const s2 = {
      statementType: 'text',
      text: 'We should provide universal basic income',
    };
    const s3 = {
      statementType: 'text',
      text: 'We should strengthen labor unions',
    };
    const target1 = {
      statementType: 'text',
      text: 'We should reduce income inequality',
    };
    const target2 = {
      statementType: 'text',
      text: 'We should ensure basic economic security',
    };
    const target3 = {
      statementType: 'text',
      text: 'We should empower workers',
    };

    const s1Cid = await uploadToIPFS(s1);
    const s2Cid = await uploadToIPFS(s2);
    const s3Cid = await uploadToIPFS(s3);
    const target1Cid = await uploadToIPFS(target1);
    const target2Cid = await uploadToIPFS(target2);
    const target3Cid = await uploadToIPFS(target3);
    const target1Id = cidToBytes32(target1Cid);
    const target2Id = cidToBytes32(target2Cid);
    const target3Id = cidToBytes32(target3Cid);

    testLog(`  S1: "${s1.text}"`);
    testLog(`  S2: "${s2.text}"`);
    testLog(`  S3: "${s3.text}"`);
    testLog(`  Target1: "${target1.text}"`);
    testLog(`  Target2: "${target2.text}"`);
    testLog(`  Target3: "${target3.text}"`);

    // User1 believes all three specific statements
    testLog('  User1 believes S1, S2, S3...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, s1Cid);
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, s2Cid);
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, s3Cid);

    // Create implications
    testLog('  Creating implications...');
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s1Cid, target1Cid, [user1Clients.account]);
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s2Cid, target2Cid, [user1Clients.account]);
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, s3Cid, target3Cid, [user1Clients.account]);

    // Use the new getUserIndirectSupport function
    testLog('  Getting all indirect support for User1 with single function call...');
    const executor = createGraphQLClient(GRAPHQL_URL);
    const indirectSupport = await getUserIndirectSupport(executor, user1Clients.account);

    // Verify results
    assert.strictEqual(
      indirectSupport.length,
      3,
      'User1 should indirectly support 3 statements'
    );

    // Extract the IDs of indirectly supported statements
    const supportedIds = indirectSupport.map(info => info.statement.id.toLowerCase());

    assert.ok(
      supportedIds.includes(target1Id.toLowerCase()),
      'Should include Target1'
    );
    assert.ok(
      supportedIds.includes(target2Id.toLowerCase()),
      'Should include Target2'
    );
    assert.ok(
      supportedIds.includes(target3Id.toLowerCase()),
      'Should include Target3'
    );

    // Verify the supportedVia information
    indirectSupport.forEach(info => {
      assert.ok(
        info.supportedVia.length > 0,
        'Each indirectly supported statement should have supportedVia information'
      );

      info.supportedVia.forEach(via => {
        assert.ok(via.directlyBelievedStatement, 'Should have directly believed statement info');
        assert.ok(via.viaStatementId, 'Should have viaStatementId');
      });
    });

    testLog('  ✓ getUserIndirectSupport efficiently returned all indirect support');
    testLog('  ✓ Correct supportedVia information included');
  });

  it('should exclude disbelieved statements in getUserIndirectSupport', async function() {
    this.timeout(40000);

    // Use a fresh user account (account 5) that hasn't been used in previous tests
    // to avoid test pollution
    const user1Clients = createIsolatedTestClients(SUITE_NAME, 5, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create statements
    const source1 = {
      statementType: 'text',
      text: 'We should implement congestion pricing in cities',
    };
    const source2 = {
      statementType: 'text',
      text: 'We should subsidize electric vehicles',
    };
    const target1 = {
      statementType: 'text',
      text: 'We should reduce traffic in city centers',
    };
    const target2 = {
      statementType: 'text',
      text: 'We should reduce air pollution from vehicles',
    };

    const source1Cid = await uploadToIPFS(source1);
    const source2Cid = await uploadToIPFS(source2);
    const target1Cid = await uploadToIPFS(target1);
    const target2Cid = await uploadToIPFS(target2);
    const target1Id = cidToBytes32(target1Cid);
    const target2Id = cidToBytes32(target2Cid);

    testLog(`  Source1: "${source1.text}"`);
    testLog(`  Source2: "${source2.text}"`);
    testLog(`  Target1: "${target1.text}"`);
    testLog(`  Target2: "${target2.text}"`);

    // User1 believes both source statements
    testLog('  User1 believes source1 and source2...');
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, source1Cid);
    await believeStatementChecked(user1Clients, beliefsContract, graphqlClient, source2Cid);

    // User1 explicitly disbelieves target1
    testLog('  User1 explicitly disbelieves target1...');
    await disbelieveStatementChecked(user1Clients, beliefsContract, graphqlClient, target1Cid);

    // Create implications
    testLog('  Creating implications...');
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, source1Cid, target1Cid, [user1Clients.account]);
    await attestImplicationChecked(attesterClients, implicationsContract, graphqlClient, source2Cid, target2Cid, [user1Clients.account]);

    // Use getUserIndirectSupport
    testLog('  Getting indirect support for User1...');
    const executor = createGraphQLClient(GRAPHQL_URL);
    const indirectSupport = await getUserIndirectSupport(executor, user1Clients.account);

    // Should only include target2, not target1 (which is explicitly disbelieved)
    assert.strictEqual(
      indirectSupport.length,
      1,
      'User1 should indirectly support only 1 statement (target1 excluded due to disbelief)'
    );

    assert.strictEqual(
      indirectSupport[0].statement.id.toLowerCase(),
      target2Id.toLowerCase(),
      'The indirectly supported statement should be target2'
    );

    testLog('  ✓ Disbelieved statements correctly excluded from indirect support');
  });

  it('should enforce non-transitivity: S1→S2→S3 does NOT make S1 believers indirect supporters of S3', async function() {
    this.timeout(40000);

    const believerClients = createIsolatedTestClients(SUITE_NAME, 6, RPC_URL);
    const attesterClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create a three-level implication chain: S1 → S2 → S3
    // where believer believes S1, but should NOT appear as indirect supporter of S3
    const s1 = {
      statementType: 'text',
      text: 'I support climate action',
    };
    const s2 = {
      statementType: 'text',
      text: 'I support carbon taxes',
    };
    const s3 = {
      statementType: 'text',
      text: 'I support a $500/ton carbon tax',
    };

    const s1Cid = await uploadToIPFS(s1);
    const s2Cid = await uploadToIPFS(s2);
    const s3Cid = await uploadToIPFS(s3);
    const s1Id = cidToBytes32(s1Cid);
    const s2Id = cidToBytes32(s2Cid);
    const s3Id = cidToBytes32(s3Cid);

    testLog(`  S1: "${s1.text}"`);
    testLog(`  S2: "${s2.text}"`);
    testLog(`  S3: "${s3.text}"`);

    // Believer believes S1
    testLog('  Believer believes S1...');
    await believeStatementChecked(believerClients, beliefsContract, graphqlClient, s1Cid);

    // Create implication chain: S1 → S2 → S3 (but NO direct S1 → S3)
    testLog('  Creating implication chain: S1 → S2 → S3...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      s1Cid,
      s2Cid,
      [believerClients.account]  // Believer believes S1, so should appear as indirect supporter of S2
    );

    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      graphqlClient,
      s2Cid,
      s3Cid,
      []  // No believers of S2 yet - the point is that S1's believers should NOT propagate here
    );

    // Verify S1 → S2 worked correctly: believer should support S2 indirectly
    const s2IndirectSupporters = await getIndirectSupporters(graphqlClient, s2Id, attesterClients.account);
    const s2SupporterAddresses = s2IndirectSupporters.map(s => s.user.toLowerCase());
    const believerAddress = believerClients.account.toLowerCase();

    assert.ok(
      s2SupporterAddresses.includes(believerAddress),
      'Believer should appear as indirect supporter of S2 (one hop via S1→S2)'
    );

    testLog('  ✓ Believer correctly appears as indirect supporter of S2 (one hop)');

    // Verify S1 → S2 → S3 does NOT make believer an indirect supporter of S3 (two hops)
    const s3IndirectSupporters = await getIndirectSupporters(graphqlClient, s3Id, attesterClients.account);
    const s3SupporterAddresses = s3IndirectSupporters.map(s => s.user.toLowerCase());

    assert.ok(
      !s3SupporterAddresses.includes(believerAddress),
      'Believer should NOT appear as indirect supporter of S3 (two hops - non-transitive)'
    );

    testLog('  ✓ Believer correctly excluded from S3 indirect support (two hops - non-transitive)');

    // Use the assertImplicationNonTransitivity invariant to verify this property
    testLog('  Running assertImplicationNonTransitivity invariant check...');
    const { assertImplicationNonTransitivity } = await import('./invariants.js');
    await assertImplicationNonTransitivity(
      graphqlClient,
      s1Id,
      s2Id,
      s3Id,
      attesterClients.account,
      believerClients.account
    );

    testLog('  ✓ Non-transitivity invariant verified: implications do NOT propagate through 2+ hops');
  });
});
