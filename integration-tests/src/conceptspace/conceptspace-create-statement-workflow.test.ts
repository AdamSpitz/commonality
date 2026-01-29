/**
 * Conceptspace Create Statement Workflow Integration Tests
 *
 * Tests for the high-level createAndSignStatement() workflow function:
 * - Complete workflow (IPFS + sign + list update)
 * - Progress callbacks
 * - Optional list updating
 * - Error handling at each stage
 * - Multiple statement creation
 */

import assert from 'assert';
import {
  createAndSignStatement,
  createStatement,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  cidToBytes32,
} from '@commonality/sdk';
import {
  createGraphQLClient,
} from '@commonality/sdk';
import { BeliefsAbi, MutableRefUpdaterAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import { assertUniqueStatements } from '../utils/invariants.js';
import { createAndSignStatementChecked } from '../actions/workflow-actions-checked.js';

describe('Conceptspace Create Statement Workflow', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const BELIEFS_CONTRACT_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`;
  const MUTABLE_REF_UPDATER_CONTRACT_ADDRESS = process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}`;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'conceptspace-create-statement-workflow';

  let beliefsContract: BeliefsContract;
  let mutableRefUpdaterContract: MutableRefUpdaterContract;
  let graphqlClient: ReturnType<typeof createGraphQLClient>;

  before(() => {
    if (!BELIEFS_CONTRACT_ADDRESS) {
      throw new Error('BELIEFS_CONTRACT_ADDRESS not set');
    }
    if (!MUTABLE_REF_UPDATER_CONTRACT_ADDRESS) {
      throw new Error('MUTABLE_REF_UPDATER_CONTRACT_ADDRESS not set');
    }

    beliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi,
    };

    mutableRefUpdaterContract = {
      address: MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
      abi: MutableRefUpdaterAbi,
    };

    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should create, sign, and add statement to list in one call', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const statementData = createStatement({
      content: 'We should invest in renewable energy infrastructure.',
    });

    testLog(`  Creating statement (displayable document format)`);

    // Call the high-level workflow function (with property checking)
    const result = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      graphqlClient,
      statementData,
      {
        addToCreatedList: true,
      }
    );

    testLog(`  Statement CID: ${result.cid}`);
    testLog(`  Sign tx hash: ${result.signTxHash}`);
    testLog(`  Update list tx hash: ${result.updateListTxHash}`);
    testLog('  ✓ Complete workflow executed successfully');
  });

  it('should invoke progress callbacks during workflow', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const statementData = createStatement({
      content: 'We need comprehensive healthcare reform.',
    });

    testLog('  Testing progress callbacks...');

    // Track callback invocations
    let ipfsUploadCalled = false;
    let signedCalled = false;
    let listUpdatedCalled = false;
    let cidFromCallback = '';

    const result = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      graphqlClient,
      statementData,
      {
        addToCreatedList: true,
        onIPFSUpload: (cid) => {
          testLog(`    → IPFS upload callback: ${cid}`);
          ipfsUploadCalled = true;
          cidFromCallback = cid;
        },
        onSigned: (txHash) => {
          testLog(`    → Signed callback: ${txHash}`);
          signedCalled = true;
        },
        onListUpdated: (txHash) => {
          testLog(`    → List updated callback: ${txHash}`);
          listUpdatedCalled = true;
        },
      }
    );

    // Verify all callbacks were invoked
    assert.strictEqual(ipfsUploadCalled, true, 'IPFS upload callback should be called');
    assert.strictEqual(signedCalled, true, 'Signed callback should be called');
    assert.strictEqual(listUpdatedCalled, true, 'List updated callback should be called');
    assert.strictEqual(cidFromCallback, result.cid, 'Callback CID should match result CID');

    testLog('  ✓ All progress callbacks invoked correctly');
  });

  it('should work without adding to created list when disabled', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const statementData = createStatement({
      content: 'This statement should not be added to the created list.',
    });

    testLog('  Creating statement without list update...');

    const result = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        // Note: not providing mutableRefUpdater
      },
      graphqlClient,
      statementData,
      {
        addToCreatedList: false, // Explicitly disable
      }
    );

    // Verify workflow worked correctly
    assert.ok(result.cid, 'Should have a CID');
    assert.ok(result.signTxHash, 'Should have a sign transaction hash');
    assert.strictEqual(result.updateListTxHash, undefined, 'Should not have update list tx hash');

    testLog('  ✓ Workflow works without list update');
  });

  it('should handle statement with references', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    const statementData = createStatement({
      content: 'I support [renewable energy](ref:0) and [healthcare reform](ref:1) because they lead to better outcomes.',
      references: [
        { cid: 'bafyreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'renewable energy' },
        { cid: 'bafyreibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', label: 'healthcare reform' },
      ],
    });

    testLog('  Creating statement with references (displayable document format)');

    const result = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      graphqlClient,
      statementData,
      {
        addToCreatedList: true,
      }
    );

    assert.ok(result.cid, 'Should have a CID');
    assert.ok(result.signTxHash, 'Should have a sign transaction hash');

    testLog('  ✓ Statement with references created successfully');
  });

  it('should create multiple statements sequentially', async function() {
    this.timeout(60000);

    const clients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    const statements = [
      createStatement({ content: 'First statement about climate change.' }),
      createStatement({ content: 'Second statement about economic policy.' }),
      createStatement({ content: 'Third statement about education reform.' }),
    ];

    testLog('  Creating 3 statements sequentially...');

    const results = [];
    for (let i = 0; i < statements.length; i++) {
      testLog(`    Creating statement ${i + 1}/3...`);
      const result = await createAndSignStatementChecked(
        clients,
        {
          beliefs: beliefsContract,
          mutableRefUpdater: mutableRefUpdaterContract,
        },
        graphqlClient,
        statements[i],
        {
          addToCreatedList: true,
        }
      );
      results.push(result);
    }

    // Verify all statements were created
    assert.strictEqual(results.length, 3, 'Should have created 3 statements');
    for (let i = 0; i < results.length; i++) {
      assert.ok(results[i].cid, `Statement ${i + 1} should have a CID`);
      assert.ok(results[i].signTxHash, `Statement ${i + 1} should have a sign tx hash`);
    }

    testLog('  ✓ Multiple statements created successfully');
  });

  it('should throw error when addToCreatedList is true but mutableRefUpdater is missing', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const statementData = createStatement({
      content: 'This should fail due to missing mutableRefUpdater.',
    });

    testLog('  Testing validation: missing mutableRefUpdater...');

    try {
      await createAndSignStatement(
        clients,
        {
          beliefs: beliefsContract,
          // Missing mutableRefUpdater
        },
        statementData,
        {
          graphqlClient,
          addToCreatedList: true, // This requires mutableRefUpdater
        }
      );

      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw an Error');
      assert.ok(
        error.message.includes('mutableRefUpdater'),
        'Error message should mention mutableRefUpdater'
      );
      testLog('  ✓ Correctly throws error for missing mutableRefUpdater');
    }
  });

  it('should throw error when addToCreatedList is true but graphqlClient is missing', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const statementData = createStatement({
      content: 'This should fail due to missing graphqlClient.',
    });

    testLog('  Testing validation: missing graphqlClient...');

    try {
      await createAndSignStatement(
        clients,
        {
          beliefs: beliefsContract,
          mutableRefUpdater: mutableRefUpdaterContract,
        },
        statementData,
        {
          // Missing graphqlClient
          addToCreatedList: true,
        }
      );

      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw an Error');
      assert.ok(
        error.message.includes('graphqlClient'),
        'Error message should mention graphqlClient'
      );
      testLog('  ✓ Correctly throws error for missing graphqlClient');
    }
  });

  it('should handle list update failure gracefully', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);

    const statementData = createStatement({
      content: 'Testing graceful handling of list update failures.',
    });

    testLog('  Creating statement with invalid GraphQL client...');

    // Create a mock GraphQL client that will fail
    const invalidGraphqlClient = {
      indexerClient: {
        request: async () => {
          throw new Error('Simulated GraphQL failure');
        },
      },
    };

    // This should succeed for steps 1 & 2, but log an error for step 3
    // We use the checked wrapper which will verify the belief was created correctly
    const result = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      invalidGraphqlClient,
      statementData,
      {
        addToCreatedList: true,
      }
    );

    // Verify statement was still created and signed successfully
    assert.ok(result.cid, 'Should have a CID');
    assert.ok(result.signTxHash, 'Should have a sign transaction hash');
    // List update failed, so updateListTxHash should be undefined
    assert.strictEqual(result.updateListTxHash, undefined, 'Update list tx hash should be undefined after failure');

    testLog('  ✓ Gracefully handled list update failure (statement still created)');
  });

  it('should deduplicate statements with identical content (CID-based)', async function() {
    this.timeout(30000);

    const clients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

    // Create identical statement content — canonical JSON ensures same CID
    const statementData = createStatement({
      content: 'We should prioritize climate action now.',
    });

    testLog('  Creating first statement...');

    // Create the statement the first time
    const result1 = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      graphqlClient,
      statementData,
      {
        addToCreatedList: true,
      }
    );

    testLog(`  First statement CID: ${result1.cid}`);

    const statementId1 = cidToBytes32(result1.cid);

    testLog('  Creating second statement with identical content...');

    // Create the same statement again
    const result2 = await createAndSignStatementChecked(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      graphqlClient,
      statementData,
      {
        addToCreatedList: true,
      }
    );

    testLog(`  Second statement CID: ${result2.cid}`);

    const statementId2 = cidToBytes32(result2.cid);

    // Verify that both statements have the same CID (deduplication)
    await assertUniqueStatements(
      statementId1,
      statementId2,
      'when creating statement with identical content twice'
    );

    testLog('  ✓ CID-based deduplication working correctly');
  });
});
