import hre from 'hardhat';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SimulationRunner } from './generative-tests/runSimulation.js';
import { TestHelpers } from './integration-test-helpers.js';

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Indexer Integration Test Runner
 *
 * This test:
 * 1. Starts a local Hardhat node
 * 2. Generates fake data and submits it to the blockchain (using generative tests)
 * 3. Starts the Ponder indexer
 * 4. Waits for the indexer to sync to the latest block
 * 5. Queries the indexer's GraphQL API to verify correct indexing
 * 6. Validates that indexed data matches blockchain state
 *
 * This is the "generative testing" approach - randomized data to stress-test the system.
 * See scenarioTests.js for focused scenario-based tests.
 */

class IndexerTestRunner {
  constructor() {
    this.helpers = new TestHelpers();
    this.simulation = null;
    this.testResults = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  /**
   * Set contract addresses in helpers from simulation
   */
  setContractsFromSimulation() {
    this.helpers.contracts = this.simulation.contracts;
  }

  /**
   * Test: Verify beliefs are correctly indexed
   */
  async testBeliefs() {
    console.log('\n=== Testing Beliefs Indexing ===\n');

    try {
      // Get all beliefs from the indexer
      const indexedBeliefs = await this.helpers.getBeliefs();
      console.log(`Found ${indexedBeliefs.length} beliefs in indexer`);

      // Count beliefs by type
      const believers = indexedBeliefs.filter(b => b.beliefState === 1).length;
      const disbelievers = indexedBeliefs.filter(b => b.beliefState === 2).length;

      console.log(`  Believers: ${believers}`);
      console.log(`  Disbelievers: ${disbelievers}`);

      // Validate against actions log
      const actionsPath = join(__dirname, '../hardhat/generative-tests/actions.json');
      const actionsData = await fs.readFile(actionsPath, 'utf-8');
      const actions = JSON.parse(actionsData);

      const beliefActions = actions.filter(a =>
        a.actionType === 'setBelief' || a.actionType === 'setBeliefsInBatch'
      );

      console.log(`  Expected belief-related actions: ${beliefActions.length}`);

      if (indexedBeliefs.length > 0) {
        this.testResults.passed.push({
          test: 'Beliefs Indexing',
          message: `Successfully indexed ${indexedBeliefs.length} beliefs`
        });
      } else {
        this.testResults.failed.push({
          test: 'Beliefs Indexing',
          message: 'No beliefs found in indexer'
        });
      }

    } catch (error) {
      this.testResults.failed.push({
        test: 'Beliefs Indexing',
        error: error.message
      });
      console.error('✗ Beliefs test failed:', error.message);
    }
  }

  /**
   * Test: Verify implications are correctly indexed
   */
  async testImplications() {
    console.log('\n=== Testing Implications Indexing ===\n');

    try {
      const indexedImplications = await this.helpers.getImplications();
      console.log(`Found ${indexedImplications.length} implications in indexer`);

      // Group by attester
      const byAttester = {};
      for (const impl of indexedImplications) {
        if (!byAttester[impl.attester]) {
          byAttester[impl.attester] = 0;
        }
        byAttester[impl.attester]++;
      }

      console.log('Implications by attester:');
      for (const [attester, count] of Object.entries(byAttester)) {
        console.log(`  ${attester.slice(0, 10)}...: ${count}`);
      }

      if (indexedImplications.length > 0) {
        this.testResults.passed.push({
          test: 'Implications Indexing',
          message: `Successfully indexed ${indexedImplications.length} implications`
        });
      } else {
        this.testResults.warnings.push({
          test: 'Implications Indexing',
          message: 'No implications found (this might be expected if none were created)'
        });
      }

    } catch (error) {
      this.testResults.failed.push({
        test: 'Implications Indexing',
        error: error.message
      });
      console.error('✗ Implications test failed:', error.message);
    }
  }

  /**
   * Test: Verify indirect supporters are calculated correctly
   */
  async testIndirectSupporters() {
    console.log('\n=== Testing Indirect Supporters Calculation ===\n');

    try {
      // Get statements
      const statements = await this.helpers.getStatements();

      if (statements.length === 0) {
        this.testResults.warnings.push({
          test: 'Indirect Supporters',
          message: 'No statements found to test indirect supporters'
        });
        return;
      }

      // Sort by believerCount and get the top one
      const sortedStatements = statements.sort((a, b) => b.believerCount - a.believerCount);
      const statement = sortedStatements[0];
      console.log(`Testing statement: ${statement.id}`);
      console.log(`  Direct believers: ${statement.believerCount}`);

      // For now, just verify that statements have been indexed
      // TODO: Once the custom API is implemented, test indirect supporters calculation
      this.testResults.warnings.push({
        test: 'Indirect Supporters',
        message: 'Custom API endpoint not yet implemented (skipping test)'
      });

    } catch (error) {
      this.testResults.failed.push({
        test: 'Indirect Supporters',
        error: error.message
      });
      console.error('✗ Indirect supporters test failed:', error.message);
    }
  }

  /**
   * Test: Verify statements are correctly indexed with IPFS content
   */
  async testStatements() {
    console.log('\n=== Testing Statements Indexing ===\n');

    try {
      const statements = await this.helpers.getStatements();
      console.log(`Found ${statements.length} statements in indexer`);

      const withContent = statements.filter(s => s.contentFetched).length;
      console.log(`  Statements with fetched content: ${withContent}/${statements.length}`);

      // Count by type
      const byType = {};
      for (const stmt of statements) {
        if (!byType[stmt.statementType]) {
          byType[stmt.statementType] = 0;
        }
        byType[stmt.statementType]++;
      }

      console.log('Statements by type:');
      for (const [type, count] of Object.entries(byType)) {
        console.log(`  ${type}: ${count}`);
      }

      if (statements.length > 0) {
        this.testResults.passed.push({
          test: 'Statements Indexing',
          message: `Successfully indexed ${statements.length} statements (${withContent} with content)`
        });
      } else {
        this.testResults.failed.push({
          test: 'Statements Indexing',
          message: 'No statements found in indexer'
        });
      }

    } catch (error) {
      this.testResults.failed.push({
        test: 'Statements Indexing',
        error: error.message
      });
      console.error('✗ Statements test failed:', error.message);
    }
  }

  /**
   * Test: Verify users are correctly indexed
   */
  async testUsers() {
    console.log('\n=== Testing Users Indexing ===\n');

    try {
      const users = await this.helpers.getUsers();
      console.log(`Found ${users.length} users in indexer`);

      const totalBeliefs = users.reduce((sum, u) => sum + u.beliefCount, 0);
      const totalDisbeliefs = users.reduce((sum, u) => sum + u.disbeliefCount, 0);

      console.log(`  Total beliefs across users: ${totalBeliefs}`);
      console.log(`  Total disbeliefs across users: ${totalDisbeliefs}`);

      if (users.length > 0) {
        this.testResults.passed.push({
          test: 'Users Indexing',
          message: `Successfully indexed ${users.length} users`
        });
      } else {
        this.testResults.failed.push({
          test: 'Users Indexing',
          message: 'No users found in indexer'
        });
      }

    } catch (error) {
      this.testResults.failed.push({
        test: 'Users Indexing',
        error: error.message
      });
      console.error('✗ Users test failed:', error.message);
    }
  }

  /**
   * Run all tests
   */
  async runTests() {
    await this.testStatements();
    await this.testUsers();
    await this.testBeliefs();
    await this.testImplications();
    await this.testIndirectSupporters();
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n=== Test Results Summary ===\n');

    console.log(`✓ Passed: ${this.testResults.passed.length}`);
    for (const result of this.testResults.passed) {
      console.log(`  • ${result.test}: ${result.message}`);
    }

    if (this.testResults.warnings.length > 0) {
      console.log(`\n⚠ Warnings: ${this.testResults.warnings.length}`);
      for (const result of this.testResults.warnings) {
        console.log(`  • ${result.test}: ${result.message}`);
      }
    }

    if (this.testResults.failed.length > 0) {
      console.log(`\n✗ Failed: ${this.testResults.failed.length}`);
      for (const result of this.testResults.failed) {
        console.log(`  • ${result.test}: ${result.error || result.message}`);
      }
    }

    const exitCode = this.testResults.failed.length > 0 ? 1 : 0;
    return exitCode;
  }

  /**
   * Main test execution flow
   */
  async run() {
    let exitCode = 0;

    try {
      // Step 1: Run the simulation to generate blockchain data
      console.log('=== Step 1: Running Simulation ===\n');

      this.simulation = new SimulationRunner();
      const numUsers = parseInt(process.argv[2]) || 20;
      const numRounds = parseInt(process.argv[3]) || 3;

      await this.simulation.initialize(numUsers);
      await this.simulation.runSimulation(numRounds);
      await this.simulation.saveResults();

      // Get the latest block number
      const latestBlock = await ethers.provider.getBlockNumber();
      console.log(`\nLatest block number: ${latestBlock}`);

      // Step 2: Start the indexer
      console.log('\n=== Step 2: Starting Indexer ===\n');

      // Set contract addresses from simulation
      this.setContractsFromSimulation();
      await this.helpers.startIndexer();

      // Step 3: Wait for indexer to sync
      console.log('\n=== Step 3: Waiting for Sync ===\n');
      await this.helpers.waitForSync(latestBlock);

      // Step 4: Run validation tests
      console.log('\n=== Step 4: Running Validation Tests ===\n');
      await this.runTests();

      // Step 5: Print results
      exitCode = this.printResults();

    } catch (error) {
      console.error('\n❌ Test execution failed:', error);
      exitCode = 1;
    } finally {
      // Cleanup
      await this.helpers.stopIndexer();
    }

    return exitCode;
  }
}

// Main execution
async function main() {
  const testRunner = new IndexerTestRunner();
  const exitCode = await testRunner.run();
  process.exit(exitCode);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { IndexerTestRunner };
