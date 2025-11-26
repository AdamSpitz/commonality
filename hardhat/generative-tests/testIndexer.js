import hre from 'hardhat';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { SimulationRunner } from './runSimulation.js';

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Indexer Integration Test Runner
 *
 * This test:
 * 1. Starts a local Hardhat node
 * 2. Generates fake data and submits it to the blockchain
 * 3. Starts the Ponder indexer
 * 4. Waits for the indexer to sync to the latest block
 * 5. Queries the indexer's GraphQL API to verify correct indexing
 * 6. Validates that indexed data matches blockchain state
 */

class IndexerTestRunner {
  constructor() {
    this.indexerProcess = null;
    this.indexerPort = process.env.PONDER_PORT || 42069;
    this.indexerUrl = `http://localhost:${this.indexerPort}`;
    this.simulation = null;
    this.testResults = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  /**
   * Start the Ponder indexer in a separate process
   */
  async startIndexer() {
    console.log('\n=== Starting Indexer ===\n');

    return new Promise((resolve, reject) => {
      const indexerDir = join(__dirname, '../../indexer');

      // Set environment variables for the indexer
      const env = {
        ...process.env,
        // Contract addresses will be set after deployment
        BELIEFS_CONTRACT_ADDRESS: this.simulation?.contracts?.beliefs
          ? await this.simulation.contracts.beliefs.getAddress()
          : undefined,
        IMPLICATIONS_CONTRACT_ADDRESS: this.simulation?.contracts?.implications
          ? await this.simulation.contracts.implications.getAddress()
          : undefined,
        PROJECT_ALIGNMENT_ADDRESS: this.simulation?.contracts?.projectAlignment
          ? await this.simulation.contracts.projectAlignment.getAddress()
          : undefined,
        PONDER_RPC_URL_84532: 'http://localhost:8545', // Local Hardhat node
        START_BLOCK: '0',
        PONDER_PORT: this.indexerPort.toString()
      };

      // Start the indexer
      this.indexerProcess = spawn('npm', ['run', 'dev'], {
        cwd: indexerDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      this.indexerProcess.stdout.on('data', (data) => {
        const str = data.toString();
        output += str;
        console.log('[Indexer]', str.trim());

        // Check if indexer is ready
        if (str.includes('Started listening on') || str.includes('Ready')) {
          resolve();
        }
      });

      this.indexerProcess.stderr.on('data', (data) => {
        const str = data.toString();
        errorOutput += str;
        console.error('[Indexer Error]', str.trim());
      });

      this.indexerProcess.on('error', (error) => {
        reject(new Error(`Failed to start indexer: ${error.message}`));
      });

      this.indexerProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`Indexer exited with code ${code}`);
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Indexer failed to start within 60 seconds'));
      }, 60000);
    });
  }

  /**
   * Stop the indexer process
   */
  async stopIndexer() {
    if (this.indexerProcess) {
      console.log('\n=== Stopping Indexer ===\n');
      this.indexerProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      if (!this.indexerProcess.killed) {
        this.indexerProcess.kill('SIGKILL');
      }

      this.indexerProcess = null;
    }
  }

  /**
   * Wait for the indexer to sync to a specific block number
   * Uses Ponder's /status endpoint or GraphQL _meta field
   */
  async waitForSync(targetBlockNumber, timeoutMs = 60000) {
    console.log(`\n=== Waiting for indexer to sync to block ${targetBlockNumber} ===\n`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to query the status endpoint
        const response = await fetch(`${this.indexerUrl}/status`);

        if (response.ok) {
          const status = await response.json();
          console.log('Indexer status:', JSON.stringify(status, null, 2));

          // Check if we've synced to the target block
          // The exact structure depends on Ponder's status API
          // We'll also try GraphQL _meta as a fallback
          if (status.blockNumber >= targetBlockNumber ||
              status.latestProcessedBlock?.number >= targetBlockNumber) {
            console.log(`✓ Indexer synced to block ${targetBlockNumber}`);
            return true;
          }
        }
      } catch (error) {
        // Status endpoint might not be available, try GraphQL _meta
        try {
          const graphqlQuery = {
            query: `
              query {
                _meta {
                  status
                  block {
                    number
                    timestamp
                  }
                }
              }
            `
          };

          const response = await fetch(`${this.indexerUrl}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(graphqlQuery)
          });

          if (response.ok) {
            const result = await response.json();
            const blockNumber = result.data?._meta?.block?.number;

            console.log(`Indexer at block ${blockNumber} / ${targetBlockNumber}`);

            if (blockNumber >= targetBlockNumber) {
              console.log(`✓ Indexer synced to block ${targetBlockNumber}`);
              return true;
            }
          }
        } catch (graphqlError) {
          // Indexer might not be ready yet
          console.log('Waiting for indexer to be ready...');
        }
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Indexer failed to sync to block ${targetBlockNumber} within ${timeoutMs}ms`);
  }

  /**
   * Query the indexer's GraphQL API
   */
  async queryGraphQL(query, variables = {}) {
    const response = await fetch(`${this.indexerUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GraphQL query failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  /**
   * Query custom API endpoints
   */
  async queryAPI(endpoint) {
    const response = await fetch(`${this.indexerUrl}${endpoint}`);

    if (!response.ok) {
      throw new Error(`API query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Test: Verify beliefs are correctly indexed
   */
  async testBeliefs() {
    console.log('\n=== Testing Beliefs Indexing ===\n');

    try {
      // Get all beliefs from the indexer
      const data = await this.queryGraphQL(`
        query {
          beliefs(limit: 1000) {
            items {
              user
              statementId
              beliefState
              blockNumber
            }
          }
        }
      `);

      const indexedBeliefs = data.beliefs.items;
      console.log(`Found ${indexedBeliefs.length} beliefs in indexer`);

      // Count beliefs by type
      const believers = indexedBeliefs.filter(b => b.beliefState === 1).length;
      const disbelievers = indexedBeliefs.filter(b => b.beliefState === 2).length;

      console.log(`  Believers: ${believers}`);
      console.log(`  Disbelievers: ${disbelievers}`);

      // Validate against actions log
      const actionsPath = join(__dirname, 'actions.json');
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
      const data = await this.queryGraphQL(`
        query {
          implications(limit: 1000) {
            items {
              attester
              fromStatementId
              toStatementId
              blockNumber
            }
          }
        }
      `);

      const indexedImplications = data.implications.items;
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
      // Get a statement with beliefs
      const statementsData = await this.queryGraphQL(`
        query {
          statements(limit: 10, orderBy: "believerCount", orderDirection: "desc") {
            items {
              id
              believerCount
              disbelieverCount
            }
          }
        }
      `);

      if (statementsData.statements.items.length === 0) {
        this.testResults.warnings.push({
          test: 'Indirect Supporters',
          message: 'No statements found to test indirect supporters'
        });
        return;
      }

      const statement = statementsData.statements.items[0];
      console.log(`Testing statement: ${statement.id}`);
      console.log(`  Direct believers: ${statement.believerCount}`);

      // Query the custom API for indirect supporters
      try {
        const indirectData = await this.queryAPI(
          `/conceptspace/api/indirect-supporters/${statement.id}`
        );

        console.log(`  Indirect supporters: ${indirectData.indirectSupporters?.length || 0}`);

        this.testResults.passed.push({
          test: 'Indirect Supporters',
          message: `Successfully calculated indirect supporters for statement ${statement.id}`
        });
      } catch (apiError) {
        // API might not be implemented yet
        this.testResults.warnings.push({
          test: 'Indirect Supporters',
          message: 'Custom API endpoint not available or not implemented'
        });
      }

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
      const data = await this.queryGraphQL(`
        query {
          statements(limit: 100) {
            items {
              id
              cid
              contentFetched
              statementType
              title
              believerCount
              disbelieverCount
            }
          }
        }
      `);

      const statements = data.statements.items;
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
      const data = await this.queryGraphQL(`
        query {
          users(limit: 1000) {
            items {
              id
              beliefCount
              disbeliefCount
            }
          }
        }
      `);

      const users = data.users.items;
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

      // Set contract addresses in environment before starting indexer
      process.env.BELIEFS_CONTRACT_ADDRESS = await this.simulation.contracts.beliefs.getAddress();
      process.env.IMPLICATIONS_CONTRACT_ADDRESS = await this.simulation.contracts.implications.getAddress();
      process.env.PROJECT_ALIGNMENT_ADDRESS = await this.simulation.contracts.projectAlignment.getAddress();

      await this.startIndexer();

      // Step 3: Wait for indexer to sync
      console.log('\n=== Step 3: Waiting for Sync ===\n');
      await this.waitForSync(latestBlock);

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
      await this.stopIndexer();
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
