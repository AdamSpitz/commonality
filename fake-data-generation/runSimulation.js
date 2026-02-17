import hre from 'hardhat';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateUsers } from './generateUsers.js';
import { generateStatements } from './generateStatements.js';
import { generateAttestations, loadAttestations, hasAttestations } from './generateAttestations.js';
import { FundingAndDelegationActions } from './fundingAndDelegationActions.js';
import { AttackScenarios } from './attackScenarios.js';
import { InvariantChecker } from './invariantChecker.js';

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
    this.attestations = [];
    this.actions = [];
    this.metrics = {
      gasUsed: {},
      actionCounts: {},
      errors: []
    };
    this.fundingDelegation = null;
    this.attackScenarios = null;
    this.invariantChecker = null;
    this.usePreGeneratedAttestations = true;
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

    // Load pre-generated attestations
    console.log('\nLoading pre-generated attestations...');
    const attestationsExist = await hasAttestations();
    if (attestationsExist && this.usePreGeneratedAttestations) {
      this.attestations = await loadAttestations();
      console.log(`Loaded ${this.attestations.length} pre-generated attestations`);
    } else if (this.usePreGeneratedAttestations) {
      console.log('No pre-generated attestations found. Set OPENROUTER_API_KEY and run:');
      console.log('  node ../fake-data-generation/generateAttestations.js');
      console.log('Or disable with --no-pregenerated flag');
    } else {
      console.log('Using random attestation decisions (no LLM)');
    }

    // Fund users with ETH
    console.log('\nFunding user accounts...');
    await this.fundUsers();

    // Initialize funding and delegation actions
    console.log('\nInitializing funding and delegation actions...');
    this.fundingDelegation = new FundingAndDelegationActions(
      this.contracts,
      this.users,
      this.statements
    );

    // Initialize attack scenarios
    console.log('\nInitializing attack scenarios module...');
    this.attackScenarios = new AttackScenarios(
      this.contracts,
      this.users,
      this.statements
    );

    // Initialize invariant checker
    console.log('\nInitializing invariant checker...');
    this.invariantChecker = new InvariantChecker(
      this.contracts,
      this.users,
      this.statements
    );

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

    // Deploy AlignmentAttestations contract
    const AlignmentAttestations = await ethers.getContractFactory('AlignmentAttestations');
    this.contracts.alignmentAttestations = await AlignmentAttestations.deploy();
    await this.contracts.alignmentAttestations.waitForDeployment();
    console.log(`  AlignmentAttestations: ${await this.contracts.alignmentAttestations.getAddress()}`);

    // Deploy DelegatableNotes contract
    const DelegatableNotes = await ethers.getContractFactory('DelegatableNotes');
    this.contracts.delegatableNotes = await DelegatableNotes.deploy();
    await this.contracts.delegatableNotes.waitForDeployment();
    console.log(`  DelegatableNotes: ${await this.contracts.delegatableNotes.getAddress()}`);

    // Deploy Pubstarter factories and main contract
    console.log('  Deploying Pubstarter factories...');
    
    // Deploy PremintingERC1155Factory
    const PremintingERC1155Factory = await ethers.getContractFactory('PremintingERC1155Factory');
    const premintingFactory = await PremintingERC1155Factory.deploy();
    await premintingFactory.waitForDeployment();
    
    // Deploy MarketplaceFactory
    const MarketplaceFactory = await ethers.getContractFactory('MarketplaceFactory');
    const marketplaceFactory = await MarketplaceFactory.deploy();
    await marketplaceFactory.waitForDeployment();
    
    // Deploy AssuranceContractFactory
    const AssuranceContractFactory = await ethers.getContractFactory('AssuranceContractFactory');
    const assuranceFactory = await AssuranceContractFactory.deploy();
    await assuranceFactory.waitForDeployment();
    
    // Deploy main Pubstarter contract
    const Pubstarter = await ethers.getContractFactory('Pubstarter');
    this.contracts.pubstarter = await Pubstarter.deploy(
      await premintingFactory.getAddress(),
      await marketplaceFactory.getAddress(),
      await assuranceFactory.getAddress()
    );
    await this.contracts.pubstarter.waitForDeployment();
    console.log(`  Pubstarter: ${await this.contracts.pubstarter.getAddress()}`);
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

  getPreGeneratedAttestation(fromStatementId, toStatementId) {
    if (!this.usePreGeneratedAttestations || this.attestations.length === 0) {
      return null;
    }
    return this.attestations.find(a => 
      a.fromStatementId === fromStatementId && a.toStatementId === toStatementId
    );
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
          // Try to use pre-generated attestation, otherwise use random
          const stmt1 = this.getRandomStatement();
          const stmt2 = this.getRandomStatement();

          if (stmt1.id !== stmt2.id && stmt1.domain === stmt2.domain) {
            let implies = false;

            // Check pre-generated attestations first
            const preGen = this.getPreGeneratedAttestation(stmt1.statementId, stmt2.statementId);
            if (preGen) {
              implies = true;
              console.log(`  Using pre-generated attestation: ${preGen.id} (confidence: ${preGen.confidence})`);
            } else if (this.attestations.length > 0) {
              // Find any attestation where S1 appears as source
              const outbound = this.attestations.filter(a => a.fromStatementId === stmt1.statementId);
              if (outbound.length > 0) {
                const randomAtt = outbound[Math.floor(Math.random() * outbound.length)];
                if (randomAtt.toStatementId === stmt2.statementId) {
                  implies = true;
                }
              }
            } else {
              // Fallback to random for testing without LLM
              implies = Math.random() > 0.7; // 30% chance of implication
            }

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

        // Funding actions
        case 'createProject': {
          const result = await this.fundingDelegation.createProject(user);
          if (result.success) {
            this.recordAction('createProject', user, { project: result.project }, result.receipt);
          } else {
            this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
          }
          break;
        }

        case 'purchaseFromPrimaryMarket': {
          // Only if there are existing projects
          if (this.fundingDelegation.createdProjects.length > 0) {
            const project = this.fundingDelegation.createdProjects[
              Math.floor(Math.random() * this.fundingDelegation.createdProjects.length)
            ];
            const tokenId = project.tokenIds[Math.floor(Math.random() * project.tokenIds.length)];
            const count = Math.floor(Math.random() * 5) + 1; // 1-5 tokens
            
            const result = await this.fundingDelegation.purchaseFromPrimaryMarket(user, project, tokenId, count);
            if (result.success) {
              this.recordAction('purchaseFromPrimaryMarket', user, { project: project.erc1155, tokenId, count }, result.receipt);
            } else {
              this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
            }
          }
          break;
        }

        case 'createSecondaryMarketListing': {
          // Only if there are existing projects
          if (this.fundingDelegation.createdProjects.length > 0) {
            const project = this.fundingDelegation.createdProjects[
              Math.floor(Math.random() * this.fundingDelegation.createdProjects.length)
            ];
            const tokenId = project.tokenIds[Math.floor(Math.random() * project.tokenIds.length)];
            const count = Math.floor(Math.random() * 3) + 1; // 1-3 tokens
            const pricePerToken = ethers.parseEther((Math.random() * 0.1 + 0.01).toFixed(4));
            
            const result = await this.fundingDelegation.createSecondaryMarketListing(
              user, project, tokenId, count, pricePerToken
            );
            if (result.success) {
              this.recordAction('createSecondaryMarketListing', user, { 
                project: project.erc1155, 
                tokenId, 
                count, 
                listingId: result.listingId 
              }, result.receipt);
            } else {
              this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
            }
          }
          break;
        }

        // Delegation actions
        case 'depositToNote': {
          const amount = ethers.parseEther((Math.random() * 0.5 + 0.1).toFixed(2)); // 0.1-0.6 ETH
          const result = await this.fundingDelegation.depositToNote(user, amount);
          if (result.success) {
            this.recordAction('depositToNote', user, { noteId: result.note?.noteId, amount: amount.toString() }, result.receipt);
          } else {
            this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
          }
          break;
        }

        case 'delegateNote': {
          const userNotes = this.fundingDelegation.getUserNotes(user);
          if (userNotes.length > 0) {
            const note = userNotes[Math.floor(Math.random() * userNotes.length)];
            const delegateTo = this.getRandomUser().address;
            const amountToDelegate = BigInt(note.amount) / BigInt(2); // Delegate half
            
            const result = await this.fundingDelegation.delegateNote(user, note.noteId, delegateTo, amountToDelegate);
            if (result.success) {
              this.recordAction('delegateNote', user, { 
                noteId: note.noteId, 
                delegateTo, 
                amount: amountToDelegate.toString() 
              }, result.receipt);
            } else {
              this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
            }
          }
          break;
        }

        case 'revokeDelegation': {
          const userNotes = this.fundingDelegation.getUserNotes(user);
          // Find delegated notes (notes owned by user but with different original owner - simplified check)
          if (userNotes.length > 0) {
            const note = userNotes[Math.floor(Math.random() * userNotes.length)];
            const result = await this.fundingDelegation.revokeDelegation(user, note.noteId);
            if (result.success) {
              this.recordAction('revokeDelegation', user, { noteId: note.noteId }, result.receipt);
            } else {
              this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
            }
          }
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
      { type: 'setBelief', weight: 0.35 },
      { type: 'setBeliefsInBatch', weight: 0.15 },
      { type: 'attestImplication', weight: 0.10 },
      { type: 'attestProjectAlignment', weight: 0.10 },
      { type: 'createProject', weight: 0.05 },
      { type: 'purchaseFromPrimaryMarket', weight: 0.08 },
      { type: 'createSecondaryMarketListing', weight: 0.05 },
      { type: 'depositToNote', weight: 0.06 },
      { type: 'delegateNote', weight: 0.04 },
      { type: 'revokeDelegation', weight: 0.02 }
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

  async runAttackScenarios() {
    console.log('\n=== Running Attack Scenarios ===\n');

    if (!this.attackScenarios) {
      console.log('Attack scenarios not initialized');
      return;
    }

    // Take snapshot before attacks
    await this.invariantChecker.takeSnapshot('before_attacks');

    // Run Sybil attack
    console.log('\n--- Sybil Attack ---');
    await this.attackScenarios.sybilAttack(this.users[0], 30);

    // Run spam attack
    console.log('\n--- Spam Attack ---');
    await this.attackScenarios.spamAttack(30);

    // Run malicious attester attack
    console.log('\n--- Malicious Attester Attack ---');
    await this.attackScenarios.maliciousAttesterAttack(20);

    // Run commission exploitation attack
    console.log('\n--- Commission Exploitation Attack ---');
    await this.attackScenarios.commissionExploitationAttack();

    // Detect attacks
    const detectionResults = await this.attackScenarios.detectAttacks();

    // Take snapshot after attacks
    await this.invariantChecker.takeSnapshot('after_attacks');

    return {
      attackResults: this.attackScenarios.getResults(),
      detectionResults
    };
  }

  async runInvariantChecks() {
    console.log('\n=== Running Invariant Checks ===\n');

    if (!this.invariantChecker) {
      console.log('Invariant checker not initialized');
      return;
    }

    // Take initial snapshot
    await this.invariantChecker.takeSnapshot('initial');

    // Run all invariant checks
    const results = await this.invariantChecker.runAllChecks();

    return results;
  }
}

// Main execution
async function main() {
  const numUsers = parseInt(process.argv[2]) || 50;
  const numRounds = parseInt(process.argv[3]) || 5;
  const runAttacks = process.argv.includes('--attacks');
  const runInvariants = process.argv.includes('--invariants');
  const usePreGenerated = !process.argv.includes('--no-pregenerated');

  const simulation = new SimulationRunner();
  simulation.usePreGeneratedAttestations = usePreGenerated;
  
  await simulation.initialize(numUsers);
  await simulation.runSimulation(numRounds);

  // Run attack scenarios if requested
  if (runAttacks) {
    await simulation.runAttackScenarios();
  }

  // Run invariant checks if requested
  if (runInvariants) {
    await simulation.runInvariantChecks();
  }

  // Always run invariant checks after simulation
  await simulation.runInvariantChecks();

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
