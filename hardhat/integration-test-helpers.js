import hre from 'hardhat';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test Helpers for Indexer Integration Tests
 *
 * Provides building blocks for scenario-based tests:
 * - Contract deployment and interaction
 * - Indexer lifecycle management
 * - GraphQL query utilities
 * - User and statement creation helpers
 */

export class TestHelpers {
  constructor() {
    this.contracts = {};
    this.indexerProcess = null;
    this.indexerPort = process.env.PONDER_PORT || 42069;
    this.indexerUrl = `http://localhost:${this.indexerPort}`;
    this.users = [];
    this.statements = new Map(); // CID -> statement data
  }

  // ============================================================================
  // Contract Deployment
  // ============================================================================

  /**
   * Deploy all core contracts needed for testing
   */
  async deployContracts() {
    console.log('Deploying contracts...');

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

    // Deploy factory contracts for projects (optional - only needed for project tests)
    // Note: MultiERC1155_AssuranceContract requires constructor arguments
    // Uncomment and provide arguments when needed for project-related tests
    // const MultiERC1155AssuranceContract = await ethers.getContractFactory('MultiERC1155_AssuranceContract');
    // this.contracts.assuranceContracts = await MultiERC1155AssuranceContract.deploy(/* constructor args */);
    // await this.contracts.assuranceContracts.waitForDeployment();
    // console.log(`  MultiERC1155_AssuranceContract: ${await this.contracts.assuranceContracts.getAddress()}`);

    return this.contracts;
  }

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Create test users (signers)
   */
  async createUsers(count) {
    const signers = await ethers.getSigners();
    this.users = signers.slice(0, count);
    console.log(`Created ${count} test users`);
    return this.users;
  }

  /**
   * Get a user by index
   */
  getUser(index) {
    return this.users[index];
  }

  // ============================================================================
  // Statement Helpers
  // ============================================================================

  /**
   * Create a statement and return its CID (bytes32)
   * For testing, we use keccak256 of the content as a mock CID
   */
  createStatementCID(content) {
    const statementData = {
      statementType: 'text',
      content: content,
      ...content
    };

    // Create a deterministic CID from the content
    const contentString = JSON.stringify(statementData);
    const cid = ethers.keccak256(ethers.toUtf8Bytes(contentString));

    this.statements.set(cid, statementData);
    return cid;
  }

  /**
   * Create multiple statements
   */
  createStatements(contents) {
    return contents.map(content => this.createStatementCID(content));
  }

  // ============================================================================
  // Belief Actions
  // ============================================================================

  /**
   * User expresses belief in a statement
   */
  async userBelieves(user, statementCID) {
    const tx = await this.contracts.beliefs.connect(user).setBelief(statementCID, 1);
    await tx.wait();
    return tx;
  }

  /**
   * User expresses disbelief in a statement
   */
  async userDisbelieves(user, statementCID) {
    const tx = await this.contracts.beliefs.connect(user).setBelief(statementCID, 2);
    await tx.wait();
    return tx;
  }

  /**
   * User removes their opinion
   */
  async userRemovesOpinion(user, statementCID) {
    const tx = await this.contracts.beliefs.connect(user).setBelief(statementCID, 0);
    await tx.wait();
    return tx;
  }

  /**
   * User sets beliefs in batch
   */
  async userSetsBeliefsInBatch(user, statementCIDs, beliefStates) {
    const tx = await this.contracts.beliefs.connect(user).setBeliefsInBatch(statementCIDs, beliefStates);
    await tx.wait();
    return tx;
  }

  // ============================================================================
  // Implication Actions
  // ============================================================================

  /**
   * Attester creates an implication relationship
   */
  async createImplication(attester, fromStatementCID, toStatementCID, strength = 100) {
    const tx = await this.contracts.implications
      .connect(attester)
      .attest(fromStatementCID, toStatementCID, strength);
    await tx.wait();
    return tx;
  }

  /**
   * Attester removes an implication
   */
  async removeImplication(attester, fromStatementCID, toStatementCID) {
    const tx = await this.contracts.implications
      .connect(attester)
      .removeAttestation(fromStatementCID, toStatementCID);
    await tx.wait();
    return tx;
  }

  // ============================================================================
  // Project Actions
  // ============================================================================

  /**
   * Create a crowdfunding project
   */
  async createProject(creator, metadata, threshold, deadline, tokenTypes) {
    // metadata is a mock IPFS CID for the project description
    const metadataCID = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));

    const tx = await this.contracts.assuranceContracts
      .connect(creator)
      .createContract(
        await creator.getAddress(),
        threshold,
        deadline,
        metadataCID,
        tokenTypes
      );

    const receipt = await tx.wait();

    // Extract the project address from the event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contracts.assuranceContracts.interface.parseLog(log);
        return parsed && parsed.name === 'ContractCreated';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('ContractCreated event not found');
    }

    const parsed = this.contracts.assuranceContracts.interface.parseLog(event);
    const projectAddress = parsed.args.contractAddress;

    return { tx, receipt, projectAddress };
  }

  /**
   * Contribute to a project
   */
  async contributeToProject(projectAddress, contributor, tokenId, amount) {
    // Get the project contract
    const project = await ethers.getContractAt('ERC1155PrimaryMarket', projectAddress);

    // Get the price for this token type
    const price = await project.getPrice(tokenId);
    const totalCost = price * BigInt(amount);

    const tx = await project.connect(contributor).buy(tokenId, amount, { value: totalCost });
    await tx.wait();
    return tx;
  }

  /**
   * Attest that a subject aligns with a statement
   */
  async attestAlignment(attester, subjectAddress, statementCID, topicStatementCID) {
    const tx = await this.contracts.alignmentAttestations
      .connect(attester)
      .attestAlignment(subjectAddress, statementCID, topicStatementCID);
    await tx.wait();
    return tx;
  }

  // ============================================================================
  // Delegation Actions
  // ============================================================================

  /**
   * Create a delegatable note
   */
  async createDelegatableNote(owner, amount, intendedStatementCID) {
    const tx = await this.contracts.delegatableNotes
      .connect(owner)
      .create(intendedStatementCID, { value: amount });

    const receipt = await tx.wait();

    // Extract noteId from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contracts.delegatableNotes.interface.parseLog(log);
        return parsed && parsed.name === 'NoteCreated';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('NoteCreated event not found');
    }

    const parsed = this.contracts.delegatableNotes.interface.parseLog(event);
    const noteId = parsed.args.noteId;

    return { tx, receipt, noteId };
  }

  /**
   * Delegate a note to another user
   */
  async delegateNote(noteId, delegator, delegatee, commissionBasisPoints = 0) {
    const tx = await this.contracts.delegatableNotes
      .connect(delegator)
      .delegate(noteId, await delegatee.getAddress(), commissionBasisPoints);
    await tx.wait();
    return tx;
  }

  // ============================================================================
  // Indexer Management
  // ============================================================================

  /**
   * Start the Ponder indexer in a separate process
   */
  async startIndexer() {
    console.log('\nStarting indexer...');

    return new Promise((resolve, reject) => {
      const indexerDir = join(__dirname, '../indexer');

      // Set environment variables for the indexer
      const env = {
        ...process.env,
        BELIEFS_CONTRACT_ADDRESS: '',
        IMPLICATIONS_CONTRACT_ADDRESS: '',
        ALIGNMENT_ATTESTATIONS_ADDRESS: '',
        DELEGATABLE_NOTES_ADDRESS: '',
        ASSURANCE_CONTRACTS_ADDRESS: '',
        PONDER_RPC_URL_31337: 'http://localhost:8545',
        START_BLOCK: '0',
        PONDER_PORT: this.indexerPort.toString()
      };

      // Set contract addresses if they exist
      if (this.contracts.beliefs) {
        env.BELIEFS_CONTRACT_ADDRESS = this.contracts.beliefs.target;
      }
      if (this.contracts.implications) {
        env.IMPLICATIONS_CONTRACT_ADDRESS = this.contracts.implications.target;
      }
      if (this.contracts.alignmentAttestations) {
        env.ALIGNMENT_ATTESTATIONS_ADDRESS = this.contracts.alignmentAttestations.target;
      }
      if (this.contracts.delegatableNotes) {
        env.DELEGATABLE_NOTES_ADDRESS = this.contracts.delegatableNotes.target;
      }
      if (this.contracts.assuranceContracts) {
        env.ASSURANCE_CONTRACTS_ADDRESS = this.contracts.assuranceContracts.target;
      }

      // Start the indexer
      this.indexerProcess = spawn('npm', ['run', 'dev'], {
        cwd: indexerDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let hasResolved = false;
      let outputBuffer = '';

      this.indexerProcess.stdout.on('data', (data) => {
        const str = data.toString();
        outputBuffer += str;

        // Only log important lines to reduce noise
        const lines = str.split('\n');
        for (const line of lines) {
          if (line.includes('ERROR') ||
              line.includes('WARN') ||
              line.includes('INFO') ||
              line.includes('Live at') ||
              line.includes('Ready') ||
              line.includes('Started') ||
              line.includes('Connected')) {
            console.log('[Indexer]', line.trim());
          }
        }

        // Check if indexer is ready
        if (!hasResolved && (str.includes('Started listening on') || str.includes('Ready') || str.includes('Live at http'))) {
          hasResolved = true;
          resolve();
        }
      });

      this.indexerProcess.stderr.on('data', (data) => {
        const str = data.toString();
        console.error('[Indexer Error]', str.trim());
      });

      this.indexerProcess.on('error', (error) => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Failed to start indexer: ${error.message}`));
        }
      });

      this.indexerProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`Indexer exited with code ${code}`);
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error('Indexer failed to start within 60 seconds'));
        }
      }, 60000);
    });
  }

  /**
   * Stop the indexer process
   */
  async stopIndexer() {
    if (this.indexerProcess) {
      console.log('\nStopping indexer...');
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
   */
  async waitForSync(targetBlockNumber, timeoutMs = 60000) {
    console.log(`\nWaiting for indexer to sync to block ${targetBlockNumber}...`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try GraphQL _meta query
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

          if (blockNumber !== undefined) {
            console.log(`  Indexer at block ${blockNumber} / ${targetBlockNumber}`);

            if (blockNumber >= targetBlockNumber) {
              console.log(`✓ Indexer synced to block ${targetBlockNumber}`);
              return true;
            }
          }
        }
      } catch (error) {
        // Indexer might not be ready yet
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Indexer failed to sync to block ${targetBlockNumber} within ${timeoutMs}ms`);
  }

  /**
   * Wait for indexer to catch up to current blockchain height
   */
  async waitForIndexerSync(timeoutMs = 60000) {
    const currentBlock = await ethers.provider.getBlockNumber();
    return this.waitForSync(currentBlock, timeoutMs);
  }

  // ============================================================================
  // GraphQL Query Helpers
  // ============================================================================

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
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
    }

    return result.data;
  }

  /**
   * Get all beliefs from the indexer
   */
  async getBeliefs() {
    const data = await this.queryGraphQL(`
      query {
        beliefs(limit: 10000) {
          items {
            user
            statementId
            beliefState
            blockNumber
          }
        }
      }
    `);
    return data.beliefs.items;
  }

  /**
   * Get beliefs for a specific statement
   */
  async getBeliefsForStatement(statementCID) {
    const data = await this.queryGraphQL(`
      query($statementId: String!) {
        beliefs(where: { statementId: $statementId }, limit: 10000) {
          items {
            user
            beliefState
            blockNumber
          }
        }
      }
    `, { statementId: statementCID });
    return data.beliefs.items;
  }

  /**
   * Get all statements from the indexer
   */
  async getStatements() {
    const data = await this.queryGraphQL(`
      query {
        statements(limit: 10000) {
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
    return data.statements.items;
  }

  /**
   * Get a specific statement by ID
   */
  async getStatement(statementCID) {
    const data = await this.queryGraphQL(`
      query($id: String!) {
        statement(id: $id) {
          id
          cid
          contentFetched
          statementType
          title
          believerCount
          disbelieverCount
        }
      }
    `, { id: statementCID });
    return data.statement;
  }

  /**
   * Get all implications from the indexer
   */
  async getImplications() {
    const data = await this.queryGraphQL(`
      query {
        implications(limit: 10000) {
          items {
            attester
            fromStatementId
            toStatementId
            strength
            blockNumber
          }
        }
      }
    `);
    return data.implications.items;
  }

  /**
   * Get all users from the indexer
   */
  async getUsers() {
    const data = await this.queryGraphQL(`
      query {
        users(limit: 10000) {
          items {
            id
            beliefCount
            disbeliefCount
          }
        }
      }
    `);
    return data.users.items;
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Get current block number
   */
  async getCurrentBlock() {
    return await ethers.provider.getBlockNumber();
  }

  /**
   * Mine blocks (advance time in Hardhat)
   */
  async mineBlocks(count) {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send('evm_mine', []);
    }
  }

  /**
   * Advance time in Hardhat
   */
  async advanceTime(seconds) {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine', []);
  }

  /**
   * Get current timestamp
   */
  async getCurrentTimestamp() {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
  }
}
