import hre from 'hardhat';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateUsers } from './generateUsers.js';
import { generateStatements } from './generateStatements.js';

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main simulation runner
 * Deploys contracts, generates data, executes random user actions
 */

class SimulationRunner {
  constructor() {
    this.contracts = {};
    this.users = [];
    this.statements = [];
    this.actions = [];
    this.metrics = {
      gasUsed: {},
      actionCounts: {},
      errors: []
    };
  }

  async initialize(numUsers = 50) {
    console.log('=== Initializing Simulation ===\n');

    // Deploy contracts
    console.log('Deploying contracts...');
    await this.deployContracts();

    // Generate or load users
    console.log('\nGenerating users...');
    try {
      const usersPath = join(__dirname, 'users.json');
      const data = await fs.readFile(usersPath, 'utf-8');
      this.users = JSON.parse(data);
      console.log(`Loaded ${this.users.length} existing users`);
    } catch (err) {
      this.users = await generateUsers(numUsers);
    }

    // Generate or load statements
    console.log('\nGenerating statements...');
    try {
      const stmtsPath = join(__dirname, 'statements.json');
      const data = await fs.readFile(stmtsPath, 'utf-8');
      this.statements = JSON.parse(data);
      console.log(`Loaded ${this.statements.length} existing statements`);
    } catch (err) {
      this.statements = await generateStatements();
    }

    // Fund users with ETH
    console.log('\nFunding user accounts...');
    await this.fundUsers();

    console.log('\n=== Initialization Complete ===\n');
  }

  async deployContracts() {
    // Deploy Beliefs contract
    const Beliefs = await ethers.getContractFactory('Beliefs');
    this.contracts.beliefs = await Beliefs.deploy();
    await this.contracts.beliefs.waitForDeployment();
    console.log(`  Beliefs: ${await this.contracts.beliefs.getAddress()}`);

    // Deploy Implications contract
    const Implications = await ethers.getContractFactory('Implications');
    this.contracts.implications = await Implications.deploy();
    await this.contracts.implications.waitForDeployment();
    console.log(`  Implications: ${await this.contracts.implications.getAddress()}`);

    // Deploy ProjectAlignment contract
    const ProjectAlignment = await ethers.getContractFactory('ProjectAlignment');
    this.contracts.projectAlignment = await ProjectAlignment.deploy();
    await this.contracts.projectAlignment.waitForDeployment();
    console.log(`  ProjectAlignment: ${await this.contracts.projectAlignment.getAddress()}`);
  }

  async fundUsers() {
    const [funder] = await ethers.getSigners();

    for (const user of this.users) {
      const amount = ethers.parseEther(user.wealth.toString());
      const tx = await funder.sendTransaction({
        to: user.address,
        value: amount
      });
      await tx.wait();
    }

    console.log(`  Funded ${this.users.length} users`);
  }

  getWalletForUser(user) {
    return new ethers.Wallet(user.privateKey, ethers.provider);
  }

  getRandomUser() {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  getRandomStatement() {
    return this.statements[Math.floor(Math.random() * this.statements.length)];
  }

  getRelevantStatements(user) {
    // Get statements matching user's interests
    const relevant = this.statements.filter(stmt => {
      if (!user.interests[stmt.domain]) return false;

      const userPosition = user.interests[stmt.domain];
      const stmtPosition = stmt.position;

      // For categorical domains, exact match
      if (typeof userPosition === 'string') {
        return stmtPosition === userPosition || stmtPosition === 'coalition' || stmtPosition === 'commonality';
      }

      // For spectrum domains, check if any axis matches
      if (typeof userPosition === 'object') {
        for (const [axis, value] of Object.entries(userPosition)) {
          if (stmtPosition.includes(`${axis}-${value}`)) {
            return true;
          }
        }
      }

      return false;
    });

    return relevant.length > 0 ? relevant : this.statements;
  }

  async performAction(actionType, user) {
    const wallet = this.getWalletForUser(user);

    try {
      let tx, receipt;

      switch (actionType) {
        case 'setBelief': {
          const statements = this.getRelevantStatements(user);
          const stmt = statements[Math.floor(Math.random() * statements.length)];
          const beliefState = Math.random() > 0.1 ? 1 : 2; // 90% believe, 10% disbelieve

          const contract = this.contracts.beliefs.connect(wallet);
          tx = await contract.setBelief(stmt.statementId, beliefState);
          receipt = await tx.wait();

          this.recordAction('setBelief', user, { statementId: stmt.id, beliefState }, receipt);
          break;
        }

        case 'setBeliefsInBatch': {
          const statements = this.getRelevantStatements(user);
          const numStatements = Math.min(3, statements.length);
          const selected = [];
          const beliefs = [];

          for (let i = 0; i < numStatements; i++) {
            const stmt = statements[Math.floor(Math.random() * statements.length)];
            selected.push(stmt.statementId);
            beliefs.push(Math.random() > 0.1 ? 1 : 2);
          }

          const contract = this.contracts.beliefs.connect(wallet);
          tx = await contract.setBeliefsInBatch(selected, beliefs);
          receipt = await tx.wait();

          this.recordAction('setBeliefsInBatch', user, { count: numStatements }, receipt);
          break;
        }

        case 'attestImplication': {
          // For this basic version, random implications
          // In full version, would use OpenRouter to evaluate
          const stmt1 = this.getRandomStatement();
          const stmt2 = this.getRandomStatement();

          if (stmt1.id !== stmt2.id && stmt1.domain === stmt2.domain) {
            const implies = Math.random() > 0.7; // 30% chance of implication

            if (implies) {
              const contract = this.contracts.implications.connect(wallet);
              tx = await contract.attestImplication(stmt1.statementId, stmt2.statementId);
              receipt = await tx.wait();

              this.recordAction('attestImplication', user, { from: stmt1.id, to: stmt2.id }, receipt);
            }
          }
          break;
        }

        case 'attestProjectAlignment': {
          // Mock project address
          const projectAddress = ethers.Wallet.createRandom().address;
          const stmt = this.getRandomStatement();

          const contract = this.contracts.projectAlignment.connect(wallet);
          tx = await contract.attestAlignment(projectAddress, stmt.statementId);
          receipt = await tx.wait();

          this.recordAction('attestProjectAlignment', user, { project: projectAddress, statement: stmt.id }, receipt);
          break;
        }

        default:
          console.log(`Unknown action type: ${actionType}`);
      }
    } catch (error) {
      this.metrics.errors.push({
        action: actionType,
        user: user.id,
        error: error.message
      });
      console.log(`  Error in ${actionType} for user ${user.id}: ${error.message}`);
    }
  }

  recordAction(actionType, user, data, receipt) {
    this.actions.push({
      timestamp: Date.now(),
      actionType,
      userId: user.id,
      data,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    });

    // Update metrics
    if (!this.metrics.gasUsed[actionType]) {
      this.metrics.gasUsed[actionType] = [];
    }
    this.metrics.gasUsed[actionType].push(Number(receipt.gasUsed));

    if (!this.metrics.actionCounts[actionType]) {
      this.metrics.actionCounts[actionType] = 0;
    }
    this.metrics.actionCounts[actionType]++;
  }

  async runSimulation(rounds = 5) {
    console.log('=== Running Simulation ===\n');

    const actionTypes = [
      { type: 'setBelief', weight: 0.5 },
      { type: 'setBeliefsInBatch', weight: 0.2 },
      { type: 'attestImplication', weight: 0.15 },
      { type: 'attestProjectAlignment', weight: 0.15 }
    ];

    for (let round = 0; round < rounds; round++) {
      console.log(`\n--- Round ${round + 1}/${rounds} ---`);

      // Each user performs actions based on their engagement level
      for (const user of this.users) {
        const numActions = user.actionsPerRound;

        for (let i = 0; i < numActions; i++) {
          // Select action type based on weights
          const rand = Math.random();
          let cumulative = 0;
          let selectedAction = actionTypes[0].type;

          for (const { type, weight } of actionTypes) {
            cumulative += weight;
            if (rand < cumulative) {
              selectedAction = type;
              break;
            }
          }

          await this.performAction(selectedAction, user);
        }
      }

      console.log(`  Completed ${this.actions.length} total actions`);
    }

    console.log('\n=== Simulation Complete ===\n');
  }

  async saveResults() {
    // Save actions log
    const actionsPath = join(__dirname, 'actions.json');
    await fs.writeFile(actionsPath, JSON.stringify(this.actions, null, 2));

    // Calculate and save metrics
    const metricsReport = {
      totalActions: this.actions.length,
      actionCounts: this.metrics.actionCounts,
      gasUsage: {},
      errors: this.metrics.errors
    };

    for (const [actionType, gasValues] of Object.entries(this.metrics.gasUsed)) {
      if (gasValues.length > 0) {
        gasValues.sort((a, b) => a - b);
        metricsReport.gasUsage[actionType] = {
          count: gasValues.length,
          mean: Math.round(gasValues.reduce((a, b) => a + b) / gasValues.length),
          median: gasValues[Math.floor(gasValues.length / 2)],
          p95: gasValues[Math.floor(gasValues.length * 0.95)],
          max: gasValues[gasValues.length - 1]
        };
      }
    }

    const metricsPath = join(__dirname, 'metrics.json');
    await fs.writeFile(metricsPath, JSON.stringify(metricsReport, null, 2));

    console.log('Results Summary:');
    console.log(`  Total actions: ${metricsReport.totalActions}`);
    console.log(`  Action breakdown:`);
    for (const [type, count] of Object.entries(metricsReport.actionCounts)) {
      console.log(`    ${type}: ${count}`);
    }
    console.log(`\n  Gas usage:`);
    for (const [type, stats] of Object.entries(metricsReport.gasUsage)) {
      console.log(`    ${type}: mean=${stats.mean}, p95=${stats.p95}, max=${stats.max}`);
    }
    if (metricsReport.errors.length > 0) {
      console.log(`\n  Errors: ${metricsReport.errors.length}`);
    }
  }
}

// Main execution
async function main() {
  const numUsers = parseInt(process.argv[2]) || 50;
  const numRounds = parseInt(process.argv[3]) || 5;

  const simulation = new SimulationRunner();
  await simulation.initialize(numUsers);
  await simulation.runSimulation(numRounds);
  await simulation.saveResults();
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { SimulationRunner };
