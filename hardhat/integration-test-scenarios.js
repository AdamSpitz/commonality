import { TestHelpers } from './integration-test-helpers.js';

/**
 * Scenario-Based Integration Tests
 *
 * These tests validate specific user scenarios with the indexer.
 * Each test is concise and focused on a particular functionality.
 */

class ScenarioTests {
  constructor() {
    this.helpers = new TestHelpers();
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  /**
   * Record a test result
   */
  recordResult(testName, passed, message) {
    if (passed) {
      this.results.passed.push({ test: testName, message });
      console.log(`✓ ${testName}: ${message}`);
    } else {
      this.results.failed.push({ test: testName, message });
      console.log(`✗ ${testName}: ${message}`);
    }
  }

  /**
   * Record a warning
   */
  recordWarning(testName, message) {
    this.results.warnings.push({ test: testName, message });
    console.log(`⚠ ${testName}: ${message}`);
  }

  // ==========================================================================
  // Test Scenarios
  // ==========================================================================

  /**
   * Scenario: Basic belief expression
   * - User creates a statement
   * - User expresses belief in the statement
   * - Verify indexer correctly tracks the belief
   */
  async testBasicBelief() {
    console.log('\n=== Scenario: Basic Belief Expression ===\n');

    try {
      // Create a statement
      const statementCID = this.helpers.createStatementCID({
        title: 'Climate change is real',
        description: 'Scientific consensus supports this claim'
      });

      // User 0 believes in the statement
      const user = this.helpers.getUser(0);
      await this.helpers.userBelieves(user, statementCID);

      // Wait for indexer to catch up
      await this.helpers.waitForIndexerSync();

      // Query the indexer
      const beliefs = await this.helpers.getBeliefsForStatement(statementCID);

      // Verify
      const userAddress = await user.getAddress();
      const userBelief = beliefs.find(b => b.user.toLowerCase() === userAddress.toLowerCase());

      if (userBelief && userBelief.beliefState === 1) {
        this.recordResult('Basic Belief', true, 'User belief correctly indexed');
      } else {
        this.recordResult('Basic Belief', false, 'User belief not found or incorrect state');
      }

    } catch (error) {
      this.recordResult('Basic Belief', false, `Error: ${error.message}`);
    }
  }

  /**
   * Scenario: Belief state changes
   * - User believes in a statement
   * - User changes to disbelief
   * - User removes opinion
   * - Verify each state change is tracked
   */
  async testBeliefStateChanges() {
    console.log('\n=== Scenario: Belief State Changes ===\n');

    try {
      const statementCID = this.helpers.createStatementCID({
        title: 'Test statement for state changes'
      });

      const user = this.helpers.getUser(1);
      const userAddress = await user.getAddress();

      // Step 1: Believe
      await this.helpers.userBelieves(user, statementCID);
      await this.helpers.waitForIndexerSync();

      let beliefs = await this.helpers.getBeliefsForStatement(statementCID);
      let userBelief = beliefs.find(b => b.user.toLowerCase() === userAddress.toLowerCase());

      if (!userBelief || userBelief.beliefState !== 1) {
        this.recordResult('Belief State Changes', false, 'Initial belief not recorded');
        return;
      }

      // Step 2: Disbelieve
      await this.helpers.userDisbelieves(user, statementCID);
      await this.helpers.waitForIndexerSync();

      beliefs = await this.helpers.getBeliefsForStatement(statementCID);
      userBelief = beliefs.find(b => b.user.toLowerCase() === userAddress.toLowerCase());

      if (!userBelief || userBelief.beliefState !== 2) {
        this.recordResult('Belief State Changes', false, 'Disbelief not recorded');
        return;
      }

      // Step 3: Remove opinion
      await this.helpers.userRemovesOpinion(user, statementCID);
      await this.helpers.waitForIndexerSync();

      beliefs = await this.helpers.getBeliefsForStatement(statementCID);
      userBelief = beliefs.find(b => b.user.toLowerCase() === userAddress.toLowerCase());

      if (!userBelief || userBelief.beliefState !== 0) {
        this.recordResult('Belief State Changes', false, 'Opinion removal not recorded');
        return;
      }

      this.recordResult('Belief State Changes', true, 'All state transitions tracked correctly');

    } catch (error) {
      this.recordResult('Belief State Changes', false, `Error: ${error.message}`);
    }
  }

  /**
   * Scenario: Multiple users supporting a statement
   * - Multiple users express beliefs
   * - Verify believerCount is correct
   */
  async testMultipleBeliefs() {
    console.log('\n=== Scenario: Multiple Users Support ===\n');

    try {
      const statementCID = this.helpers.createStatementCID({
        title: 'Statement with multiple supporters'
      });

      // Users 0, 1, 2 believe; User 3 disbelieves
      await this.helpers.userBelieves(this.helpers.getUser(0), statementCID);
      await this.helpers.userBelieves(this.helpers.getUser(1), statementCID);
      await this.helpers.userBelieves(this.helpers.getUser(2), statementCID);
      await this.helpers.userDisbelieves(this.helpers.getUser(3), statementCID);

      await this.helpers.waitForIndexerSync();

      // Get statement with counts
      const statement = await this.helpers.getStatement(statementCID);

      if (!statement) {
        this.recordResult('Multiple Beliefs', false, 'Statement not found in indexer');
        return;
      }

      if (statement.believerCount === 3 && statement.disbelieverCount === 1) {
        this.recordResult('Multiple Beliefs', true,
          `Correctly counted 3 believers and 1 disbeliever`);
      } else {
        this.recordResult('Multiple Beliefs', false,
          `Expected 3 believers and 1 disbeliever, got ${statement.believerCount} and ${statement.disbelieverCount}`);
      }

    } catch (error) {
      this.recordResult('Multiple Beliefs', false, `Error: ${error.message}`);
    }
  }

  /**
   * Scenario: Batch belief setting
   * - User sets multiple beliefs at once
   * - Verify all are recorded
   */
  async testBatchBeliefs() {
    console.log('\n=== Scenario: Batch Belief Setting ===\n');

    try {
      const statements = [
        this.helpers.createStatementCID({ title: 'Batch statement 1' }),
        this.helpers.createStatementCID({ title: 'Batch statement 2' }),
        this.helpers.createStatementCID({ title: 'Batch statement 3' })
      ];

      const beliefStates = [1, 2, 1]; // believe, disbelieve, believe

      const user = this.helpers.getUser(0);
      await this.helpers.userSetsBeliefsInBatch(user, statements, beliefStates);

      await this.helpers.waitForIndexerSync();

      // Verify each belief
      const userAddress = await user.getAddress();
      let allCorrect = true;

      for (let i = 0; i < statements.length; i++) {
        const beliefs = await this.helpers.getBeliefsForStatement(statements[i]);
        const userBelief = beliefs.find(b => b.user.toLowerCase() === userAddress.toLowerCase());

        if (!userBelief || userBelief.beliefState !== beliefStates[i]) {
          allCorrect = false;
          break;
        }
      }

      if (allCorrect) {
        this.recordResult('Batch Beliefs', true, 'All batch beliefs recorded correctly');
      } else {
        this.recordResult('Batch Beliefs', false, 'Some batch beliefs not recorded correctly');
      }

    } catch (error) {
      this.recordResult('Batch Beliefs', false, `Error: ${error.message}`);
    }
  }

  /**
   * Scenario: Implication relationship
   * - Attester creates implication S1 -> S2
   * - Users believe S1
   * - Verify indirect support for S2 (when implemented)
   */
  async testImplication() {
    console.log('\n=== Scenario: Implication Relationship ===\n');

    try {
      const s1 = this.helpers.createStatementCID({
        title: 'We should reduce carbon emissions'
      });

      const s2 = this.helpers.createStatementCID({
        title: 'Climate change policies are important'
      });

      // Attester creates implication S1 -> S2
      const attester = this.helpers.getUser(0);
      await this.helpers.createImplication(attester, s1, s2, 100);

      await this.helpers.waitForIndexerSync();

      // Verify implication is recorded
      const implications = await this.helpers.getImplications();
      const attesterAddress = await attester.getAddress();

      const foundImplication = implications.find(imp =>
        imp.fromStatementId === s1 &&
        imp.toStatementId === s2 &&
        imp.attester.toLowerCase() === attesterAddress.toLowerCase()
      );

      if (foundImplication) {
        this.recordResult('Implication', true,
          `Implication S1->S2 recorded with strength ${foundImplication.strength}`);
      } else {
        this.recordResult('Implication', false, 'Implication not found in indexer');
      }

    } catch (error) {
      this.recordResult('Implication', false, `Error: ${error.message}`);
    }
  }

  /**
   * Scenario: User belief counts
   * - User expresses multiple beliefs
   * - Verify user's beliefCount and disbeliefCount
   */
  async testUserCounts() {
    console.log('\n=== Scenario: User Belief Counts ===\n');

    try {
      const user = this.helpers.getUser(4);
      const userAddress = await user.getAddress();

      // Create 3 beliefs and 2 disbeliefs
      const statements = this.helpers.createStatements([
        { title: 'User count test 1' },
        { title: 'User count test 2' },
        { title: 'User count test 3' },
        { title: 'User count test 4' },
        { title: 'User count test 5' }
      ]);

      await this.helpers.userBelieves(user, statements[0]);
      await this.helpers.userBelieves(user, statements[1]);
      await this.helpers.userBelieves(user, statements[2]);
      await this.helpers.userDisbelieves(user, statements[3]);
      await this.helpers.userDisbelieves(user, statements[4]);

      await this.helpers.waitForIndexerSync();

      // Get user from indexer
      const users = await this.helpers.getUsers();
      const indexedUser = users.find(u => u.id.toLowerCase() === userAddress.toLowerCase());

      if (!indexedUser) {
        this.recordResult('User Counts', false, 'User not found in indexer');
        return;
      }

      if (indexedUser.beliefCount === 3 && indexedUser.disbeliefCount === 2) {
        this.recordResult('User Counts', true,
          'User belief counts correct (3 beliefs, 2 disbeliefs)');
      } else {
        this.recordResult('User Counts', false,
          `Expected 3 beliefs and 2 disbeliefs, got ${indexedUser.beliefCount} and ${indexedUser.disbeliefCount}`);
      }

    } catch (error) {
      this.recordResult('User Counts', false, `Error: ${error.message}`);
    }
  }

  // ==========================================================================
  // Test Runner
  // ==========================================================================

  /**
   * Run all scenario tests
   */
  async runAllScenarios() {
    console.log('\n' + '='.repeat(60));
    console.log('SCENARIO-BASED INTEGRATION TESTS');
    console.log('='.repeat(60));

    try {
      // Deploy contracts
      console.log('\n--- Setup: Deploying Contracts ---');
      await this.helpers.deployContracts();

      // Create test users
      console.log('\n--- Setup: Creating Test Users ---');
      await this.helpers.createUsers(10);

      // Start indexer
      console.log('\n--- Setup: Starting Indexer ---');
      await this.helpers.startIndexer();

      // Wait a moment for indexer to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Run scenarios
      await this.testBasicBelief();
      await this.testBeliefStateChanges();
      await this.testMultipleBeliefs();
      await this.testBatchBeliefs();
      await this.testImplication();
      await this.testUserCounts();

      // Print results
      this.printResults();

    } catch (error) {
      console.error('\n❌ Test setup failed:', error);
      throw error;
    } finally {
      // Cleanup
      await this.helpers.stopIndexer();
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n✓ Passed: ${this.results.passed.length}`);
    for (const result of this.results.passed) {
      console.log(`  • ${result.test}: ${result.message}`);
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠ Warnings: ${this.results.warnings.length}`);
      for (const result of this.results.warnings) {
        console.log(`  • ${result.test}: ${result.message}`);
      }
    }

    if (this.results.failed.length > 0) {
      console.log(`\n✗ Failed: ${this.results.failed.length}`);
      for (const result of this.results.failed) {
        console.log(`  • ${result.test}: ${result.message}`);
      }
    }

    const total = this.results.passed.length + this.results.failed.length;
    const passRate = total > 0 ? ((this.results.passed.length / total) * 100).toFixed(1) : 0;

    console.log(`\nPass Rate: ${passRate}% (${this.results.passed.length}/${total})`);
    console.log('='.repeat(60) + '\n');

    return this.results.failed.length === 0 ? 0 : 1;
  }
}

// Main execution
async function main() {
  const tests = new ScenarioTests();
  const exitCode = await tests.runAllScenarios();
  process.exit(exitCode);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { ScenarioTests };
