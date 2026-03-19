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
  createStatement,
  publishDocument,
  type BeliefsContract,
  type ImplicationsContract,
  BeliefsAbi,
  ImplicationsAbi,
  getImplicationsTo,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { attestImplicationChecked } from '../actions/implication-actions-checked.js';
import { believeStatementChecked } from '../actions/belief-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';


describe('Conceptspace Implications', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const IMPLICATIONS_CONTRACT_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-implications';

  let beliefsContract: BeliefsContract;
  let implicationsContract: ImplicationsContract;
  let machinery: ActionTestingMachinery;

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

    machinery = createActionTestingMachinery(GRAPHQL_URL);
  });

  it('should record implication attestations', async function() {
    this.timeout(20000);

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    // Create two statements
    const statement1Text = 'We should reduce carbon emissions by 50% by 2030';
    const statement2Text = 'We should take action on climate change';

    const statement1Cid = await publishDocument(machinery.ipfsConfig, createStatement({ content: statement1Text }));
    const statement2Cid = await publishDocument(machinery.ipfsConfig, createStatement({ content: statement2Text }));

    testLog(`  Statement 1 (specific): "${statement1Text}"`);
    testLog(`  Statement 2 (general): "${statement2Text}"`);

    // Attest that statement 1 implies statement 2
    testLog('  Attesting that statement 1 implies statement 2...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      machinery,
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
    const specificText = 'We should adopt universal healthcare with a single-payer system';
    const generalText = 'Everyone should have access to healthcare';

    const specificCid = await publishDocument(machinery.ipfsConfig, createStatement({ content: specificText }));
    const generalCid = await publishDocument(machinery.ipfsConfig, createStatement({ content: generalText }));

    testLog(`  Specific: "${specificText}"`);
    testLog(`  General: "${generalText}"`);

    // User believes the specific statement
    testLog('  User believes specific statement...');
    await believeStatementChecked(userClients, beliefsContract, machinery, specificCid);

    testLog('  ✓ Direct support recorded (verified by property checks)');

    // Attester creates implication: specific -> general
    testLog('  Attester creates implication (specific -> general)...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      machinery,
      specificCid,
      generalCid,
      undefined, // No explanation
      [userClients.account] // User who believes the specific statement should appear as indirect supporter
    );

    testLog('  ✓ Implication created (verified by property checks)');
    testLog('  ✓ Indexer can now compute indirect support by querying implications');
  });

  it('should handle multiple implications to the same statement', async function() {
    this.timeout(30000);

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);

    // Create three specific statements that all imply a general one
    const generalText = 'We need education reform';
    const specific1Text = 'We should increase teacher salaries';
    const specific2Text = 'We should reduce class sizes';

    const generalCid = await publishDocument(machinery.ipfsConfig, createStatement({ content: generalText }));
    const specific1Cid = await publishDocument(machinery.ipfsConfig, createStatement({ content: specific1Text }));
    const specific2Cid = await publishDocument(machinery.ipfsConfig, createStatement({ content: specific2Text }));
    testLog(`  General: "${generalText}"`);
    testLog(`  Specific 1: "${specific1Text}"`);
    testLog(`  Specific 2: "${specific2Text}"`);

    // Create implications: specific1 -> general, specific2 -> general
    testLog('  Creating implications...');
    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      machinery,
      specific1Cid,
      generalCid
    );

    await attestImplicationChecked(
      attesterClients,
      implicationsContract,
      machinery,
      specific2Cid,
      generalCid
    );

    testLog('  ✓ Multiple implications tracked correctly (verified by property checks)');
  });

  it('should verify implications are NOT transitive', async function() {
    this.timeout(25000);

    const attesterClients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);

    // Create chain: S1 -> S2 -> S3
    const s1 = await publishDocument(machinery.ipfsConfig, createStatement({ content: 'Statement 1' }));
    const s2 = await publishDocument(machinery.ipfsConfig, createStatement({ content: 'Statement 2' }));
    const s3 = await publishDocument(machinery.ipfsConfig, createStatement({ content: 'Statement 3' }));

    testLog('  Creating chain: S1 -> S2 -> S3...');

    // Attest S1 -> S2 (checked action verifies the implication exists)
    await attestImplicationChecked(attesterClients, implicationsContract, machinery, s1, s2);

    // Attest S2 -> S3 (checked action verifies the implication exists)
    await attestImplicationChecked(attesterClients, implicationsContract, machinery, s2, s3);

    // Verify S1 -> S3 does NOT exist (no transitivity)
    // This is the key business logic check for non-transitivity
    const s3ImplicationsTo = await getImplicationsTo(machinery, s3);
    const s1ToS3 = s3ImplicationsTo.find(
      imp => imp.fromStatementCid.toLowerCase() === s1.toLowerCase()
    );
    assert.strictEqual(s1ToS3, undefined, 'S1 -> S3 should NOT exist (implications are not transitive)');

    testLog('  ✓ Confirmed: implications are NOT transitive');
    testLog('  ✓ To find indirect support for S3 from S1 believers, need direct S1->S3 attestation');
  });
});
