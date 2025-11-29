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
  createTestClients,
  believeStatement,
  disbelieveStatement,
  uploadToIPFS,
  cidToBytes32,
  attestImplication,
  type BeliefsContract,
  type ImplicationsContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getStatement,
  getUserBelief,
  getImplicationsTo,
  getIndirectSupporters,
  getIndirectSupporterCount,
  waitForSync,
  assertNotNull,
} from './queries/index.js';
import { BeliefsAbi, ImplicationsAbi } from './test-abis.js';

describe('Conceptspace Indirect Support', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Hardhat test accounts
  const USER1_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  const USER2_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
  const USER3_PRIVATE_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;
  const ATTESTER_PRIVATE_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const;

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

    const user1Clients = createTestClients(USER1_PRIVATE_KEY, RPC_URL);
    const user2Clients = createTestClients(USER2_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

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

    console.log(`  Specific: "${specificStatement.text}"`);
    console.log(`  General: "${generalStatement.text}"`);

    // User1 and User2 believe the specific statement
    console.log('  User1 and User2 believe specific statement...');
    let txHash = await believeStatement(user1Clients, beliefsContract, specificCid);
    let receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await believeStatement(user2Clients, beliefsContract, specificCid);
    receipt = await user2Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Verify direct support
    const specificStmt = assertNotNull(
      await getStatement(graphqlClient, specificId),
      'Specific statement'
    );
    assert.strictEqual(specificStmt.believerCount, 2, 'Specific statement should have 2 direct believers');

    // General statement should have 0 indirect supporters initially (no implication yet)
    let indirectCount = await getIndirectSupporterCount(graphqlClient, generalId);
    assert.strictEqual(indirectCount, 0, 'General statement should have 0 indirect supporters initially');

    console.log('  ✓ Direct support verified, no indirect support yet');

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

    // Now general statement should have 2 indirect supporters
    indirectCount = await getIndirectSupporterCount(graphqlClient, generalId);
    assert.strictEqual(
      indirectCount,
      2,
      'General statement should have 2 indirect supporters after implication'
    );

    console.log('  ✓ Indirect supporter count computed correctly: 2 supporters');
  });

  it('should return list of indirect supporters with details', async function() {
    this.timeout(30000);

    const user1Clients = createTestClients(USER1_PRIVATE_KEY, RPC_URL);
    const user2Clients = createTestClients(USER2_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

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

    console.log(`  Specific 1: "${specific1.text}"`);
    console.log(`  Specific 2: "${specific2.text}"`);
    console.log(`  General: "${general.text}"`);

    // User1 believes specific1, User2 believes specific2
    console.log('  User1 believes specific1, User2 believes specific2...');
    let txHash = await believeStatement(user1Clients, beliefsContract, specific1Cid);
    let receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await believeStatement(user2Clients, beliefsContract, specific2Cid);
    receipt = await user2Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create implications: specific1 -> general, specific2 -> general
    console.log('  Creating implications...');
    txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      specific1Cid,
      generalCid
    );
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      specific2Cid,
      generalCid
    );
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

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

    console.log('  ✓ Indirect supporters list returned with correct details');
  });

  it('should exclude users who explicitly disbelieve from indirect support', async function() {
    this.timeout(30000);

    const user1Clients = createTestClients(USER1_PRIVATE_KEY, RPC_URL);
    const user2Clients = createTestClients(USER2_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

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

    console.log(`  Specific: "${specific.text}"`);
    console.log(`  General: "${general.text}"`);

    // User1 and User2 believe the specific statement
    console.log('  User1 and User2 believe specific statement...');
    let txHash = await believeStatement(user1Clients, beliefsContract, specificCid);
    let receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await believeStatement(user2Clients, beliefsContract, specificCid);
    receipt = await user2Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // User1 explicitly disbelieves the general statement
    console.log('  User1 explicitly disbelieves the general statement...');
    txHash = await disbelieveStatement(user1Clients, beliefsContract, generalCid);
    receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create implication: specific -> general
    console.log('  Creating implication (specific -> general)...');
    txHash = await attestImplication(
      attesterClients,
      implicationsContract,
      specificCid,
      generalCid
    );
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

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

    console.log('  ✓ User1 correctly excluded from indirect support due to explicit disbelief');
    console.log('  ✓ User2 correctly included in indirect support');
  });

  it('should handle multiple implication chains converging on one statement', async function() {
    this.timeout(40000);

    const user1Clients = createTestClients(USER1_PRIVATE_KEY, RPC_URL);
    const user2Clients = createTestClients(USER2_PRIVATE_KEY, RPC_URL);
    const user3Clients = createTestClients(USER3_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

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

    console.log(`  S1: "${s1.text}"`);
    console.log(`  S2: "${s2.text}"`);
    console.log(`  S3: "${s3.text}"`);
    console.log(`  General: "${sGeneral.text}"`);

    // Each user believes a different specific statement
    console.log('  Users believe their respective specific statements...');
    let txHash = await believeStatement(user1Clients, beliefsContract, s1Cid);
    let receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await believeStatement(user2Clients, beliefsContract, s2Cid);
    receipt = await user2Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await believeStatement(user3Clients, beliefsContract, s3Cid);
    receipt = await user3Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create convergent implications
    console.log('  Creating convergent implications...');
    txHash = await attestImplication(attesterClients, implicationsContract, s1Cid, sGeneralCid);
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await attestImplication(attesterClients, implicationsContract, s2Cid, sGeneralCid);
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await attestImplication(attesterClients, implicationsContract, s3Cid, sGeneralCid);
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

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

    console.log('  ✓ All 3 users correctly identified as indirect supporters');
    console.log('  ✓ Multiple convergent implication chains handled correctly');
  });

  it('should handle user believing multiple statements that imply the same target', async function() {
    this.timeout(30000);

    const user1Clients = createTestClients(USER1_PRIVATE_KEY, RPC_URL);
    const attesterClients = createTestClients(ATTESTER_PRIVATE_KEY, RPC_URL);

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

    console.log(`  S1: "${s1.text}"`);
    console.log(`  S2: "${s2.text}"`);
    console.log(`  Target: "${sTarget.text}"`);

    // User1 believes both S1 and S2
    console.log('  User1 believes both S1 and S2...');
    let txHash = await believeStatement(user1Clients, beliefsContract, s1Cid);
    let receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await believeStatement(user1Clients, beliefsContract, s2Cid);
    receipt = await user1Clients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Create implications: S1 -> Target, S2 -> Target
    console.log('  Creating implications...');
    txHash = await attestImplication(attesterClients, implicationsContract, s1Cid, sTargetCid);
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    txHash = await attestImplication(attesterClients, implicationsContract, s2Cid, sTargetCid);
    receipt = await attesterClients.publicClient.getTransactionReceipt({ hash: txHash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

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

    console.log('  ✓ User correctly counted once despite multiple implication paths');
  });
});
