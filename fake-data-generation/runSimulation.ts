import { createPublicClient, createWalletClient, http, parseEther, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateUsers } from './generateUsers.js';
import { generateStatements } from './generateStatements.js';
import { generateAttestations, loadAttestations, hasAttestations } from './generateAttestations.js';
import { FundingAndDelegationActions } from './fundingAndDelegationActions.js';
import { AttackScenarios } from './attackScenarios.js';
import { InvariantChecker } from './invariantChecker.js';
import { loadEnv, CONTRACT_ADDRESSES, RPC_URL } from './loadEnv.js';
import {
  BeliefsAbi,
  ImplicationsAbi,
  AlignmentAttestationsAbi,
  PubstarterAbi,
  AssuranceContractAbi,
  ERC1155SecondaryMarketAbi,
  DelegatableNotesAbi,
  createStatement,
  publishDocument,
  type IpfsCidV1,
} from '@commonality/sdk';
import type { User, Statement, SimulationContracts } from './types.js';
import type { Attestation } from './generateAttestations.js';

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
} as const;

const BELIEVES = 1;
const DISBELIEVES = 2;

function cidToBytes32(cid: string): `0x${string}` {
  return keccak256(toBytes(cid));
}

function createTestClients(privateKey: `0x${string}`, rpcUrl = 'http://localhost:8545') {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(rpcUrl),
  });

  return {
    walletClient,
    publicClient,
    account: account.address,
  };
}

type TestClients = ReturnType<typeof createTestClients>;

async function believeStatement(
  clients: TestClients,
  contract: { address: `0x${string}` | undefined; abi: readonly unknown[] },
  statementCid: IpfsCidV1
): Promise<`0x${string}`> {
  const hash = await clients.walletClient.writeContract({
    address: contract.address as `0x${string}`,
    abi: contract.abi,
    functionName: 'setBelief',
    args: [cidToBytes32(statementCid), BELIEVES],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function disbelieveStatement(
  clients: TestClients,
  contract: { address: `0x${string}` | undefined; abi: readonly unknown[] },
  statementCid: IpfsCidV1
): Promise<`0x${string}`> {
  const hash = await clients.walletClient.writeContract({
    address: contract.address as `0x${string}`,
    abi: contract.abi,
    functionName: 'setBelief',
    args: [cidToBytes32(statementCid), DISBELIEVES],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// I got this by running:
// echo -n "project-alignment-attestations" | ipfs add --cid-version=1 --raw-leaves --only-hash -Q
// TODO: This is not actually right. Replace this with the CID of a real statement.
const PROJECT_ALIGNMENT_TOPIC = "bafkreifgwnffoo523mfqv6v6w5f4qhja2ugcgjxpobjbqd7azef7jbgsdm";

async function attestImplication(
  clients: TestClients,
  contract: { address: `0x${string}` | undefined; abi: readonly unknown[] },
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  explanationCid: IpfsCidV1
): Promise<`0x${string}`> {
  const fromStatementCid = cidToBytes32(fromStatementCid);
  const toStatementCid = cidToBytes32(toStatementCid);

  const hash = await clients.walletClient.writeContract({
    address: contract.address as `0x${string}`,
    abi: contract.abi,
    functionName: 'attestImplication',
    args: [fromStatementCid, toStatementCid, explanationCid],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function attestAlignment(
  clients: TestClients,
  contract: { address: `0x${string}` | undefined; abi: readonly unknown[] },
  subjectAddress: `0x${string}`,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1
): Promise<`0x${string}`> {

  const hash = await clients.walletClient.writeContract({
    address: contract.address as `0x${string}`,
    abi: contract.abi,
    functionName: 'attestAlignment',
    args: [subjectAddress, cidToBytes32(statementCid), cidToBytes32(topicStatementCid)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

loadEnv();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main simulation runner
 * Deploys contracts, generates data, executes random user actions
 */

class SimulationRunner {
  clients: Record<string, TestClients>;
  contracts: SimulationContracts;
  users: User[];
  statements: Statement[];
  attestations: Attestation[];
  actions: Array<Record<string, unknown>>;
  metrics: {
    gasUsed: Record<string, number[]>;
    actionCounts: Record<string, number>;
    errors: Array<Record<string, unknown>>;
  };
  fundingDelegation: FundingAndDelegationActions | null;
  attackScenarios: AttackScenarios | null;
  invariantChecker: InvariantChecker | null;
  usePreGeneratedAttestations: boolean;
  useHardhatAccounts: boolean;

  constructor() {
    this.clients = {};
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
    this.useHardhatAccounts = false;
  }

  async initialize(numUsers = 50): Promise<void> {
    console.log('=== Initializing Simulation ===\n');

    console.log('Loading contract addresses from .env...');
    this.loadContracts();

    // Generate or load users
    console.log('\nGenerating users...');
    try {
      const usersPath = join(__dirname, 'users.json');
      const data = await fs.readFile(usersPath, 'utf-8');
      this.users = JSON.parse(data) as User[];
      console.log(`Loaded ${this.users.length} existing users`);
    } catch {
      this.users = await generateUsers(numUsers, { useHardhatAccounts: this.useHardhatAccounts });
    }

    // Generate or load statements
    console.log('\nGenerating statements...');
    try {
      const stmtsPath = join(__dirname, 'statements.json');
      const data = await fs.readFile(stmtsPath, 'utf-8');
      this.statements = JSON.parse(data) as Statement[];
      console.log(`Loaded ${this.statements.length} existing statements`);
    } catch {
      this.statements = await generateStatements();
    }

    // Upload statements to IPFS
    console.log('\nUploading statements to IPFS...');
    await this.uploadStatementsToIPFS();

    // Load pre-generated attestations
    console.log('\nLoading pre-generated attestations...');
    const attestationsExist = await hasAttestations();
    if (attestationsExist && this.usePreGeneratedAttestations) {
      this.attestations = await loadAttestations();
      console.log(`Loaded ${this.attestations.length} pre-generated attestations`);
    } else if (this.usePreGeneratedAttestations) {
      console.log('No pre-generated attestations found. Set OPENROUTER_API_KEY and run:');
      console.log('  npx tsx generateAttestations.ts');
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

  loadContracts(): void {
    this.contracts = {
      beliefs: {
        address: CONTRACT_ADDRESSES.beliefs as `0x${string}` | undefined,
        abi: BeliefsAbi
      },
      implications: {
        address: CONTRACT_ADDRESSES.implications as `0x${string}` | undefined,
        abi: ImplicationsAbi
      },
      alignmentAttestations: {
        address: CONTRACT_ADDRESSES.alignmentAttestations as `0x${string}` | undefined,
        abi: AlignmentAttestationsAbi
      },
      delegatableNotes: {
        address: CONTRACT_ADDRESSES.delegatableNotes as `0x${string}` | undefined,
        abi: DelegatableNotesAbi
      },
      pubstarter: {
        address: CONTRACT_ADDRESSES.pubstarter as `0x${string}` | undefined,
        abi: PubstarterAbi
      },
      assuranceContract: {
        address: undefined,
        abi: AssuranceContractAbi
      },
      erc1155SecondaryMarket: {
        address: undefined,
        abi: ERC1155SecondaryMarketAbi
      }
    };

    console.log(`  Beliefs: ${this.contracts.beliefs?.address}`);
    console.log(`  Implications: ${this.contracts.implications?.address}`);
    console.log(`  AlignmentAttestations: ${this.contracts.alignmentAttestations?.address}`);
    console.log(`  DelegatableNotes: ${this.contracts.delegatableNotes?.address}`);
    console.log(`  Pubstarter: ${this.contracts.pubstarter?.address}`);
  }

  getClientsForUser(user: User): TestClients {
    return createTestClients(user.privateKey, RPC_URL);
  }

  async uploadStatementsToIPFS(): Promise<void> {
    const statementsWithCid = this.statements.filter(s => s.cid);
    if (statementsWithCid.length === this.statements.length) {
      console.log(`  All ${this.statements.length} statements already have CIDs, skipping upload`);
      return;
    }

    let uploaded = 0;
    let failed = 0;

    for (const stmt of this.statements) {
      if (stmt.cid) continue;

      try {
        const doc = createStatement({
          content: stmt.content.text,
          topic: stmt.domain,
          extras: {
            domain: stmt.domain,
            position: stmt.position,
            statementType: stmt.statementType,
            references: stmt.content.references,
          },
        });

        const cid = await publishDocument(doc);
        stmt.cid = cid;
        uploaded++;

        if (uploaded % 10 === 0) {
          console.log(`  Uploaded ${uploaded}/${this.statements.length} statements...`);
        }
      } catch (err) {
        const error = err as Error;
        failed++;
        console.error(`  Failed to upload statement ${stmt.id}: ${error.message}`);
      }
    }

    console.log(`  Uploaded ${uploaded} statements to IPFS (${failed} failed)`);

    if (uploaded > 0) {
      const stmtsPath = join(__dirname, 'statements.json');
      await fs.writeFile(stmtsPath, JSON.stringify(this.statements, null, 2));
      console.log(`  Saved statements with CIDs to ${stmtsPath}`);
    }
  }

  async fundUsers(): Promise<void> {
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(RPC_URL)
    });

    const funders = this.users.slice(0, 5);
    const funderClients = funders.map(u => this.getClientsForUser(u));

    let fundedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      const funderClient = funderClients[i % funderClients.length];

      const baseAmount = parseEther('1');
      const wealthAmount = parseEther(user.wealth.toString());
      const gasBuffer = parseEther('0.5');
      const totalAmount = baseAmount + wealthAmount + gasBuffer;

      try {
        const hash = await funderClient.walletClient.sendTransaction({
          to: user.address,
          value: totalAmount
        });
        await publicClient.waitForTransactionReceipt({ hash });
        fundedCount++;
      } catch (err) {
        const error = err as Error;
        failedCount++;
        if (failedCount <= 3) {
          console.log(`  Failed to fund user ${user.id}: ${error.message}`);
        }
      }
    }

    console.log(`  Funded ${fundedCount} users (${failedCount} failed)`);
  }

  getRandomUser(): User {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  getRandomStatement(): Statement {
    return this.statements[Math.floor(Math.random() * this.statements.length)];
  }

  getPreGeneratedAttestation(fromStatementCid: IpfsCidV1, toStatementCid: IpfsCidV1): Attestation | undefined {
    if (!this.usePreGeneratedAttestations || this.attestations.length === 0) {
      return undefined;
    }
    return this.attestations.find(a =>
      a.fromStatementCid === fromStatementCid && a.toStatementCid === toStatementCid
    );
  }

  getRelevantStatements(user: User): Statement[] {
    // Get statements matching user's interests
    const relevant = this.statements.filter(stmt => {
      const interests = user.interests as Record<string, unknown>;
      if (!interests[stmt.domain]) return false;

      const userPosition = interests[stmt.domain];
      const stmtPosition = stmt.position;

      // For categorical domains, exact match
      if (typeof userPosition === 'string') {
        return stmtPosition === userPosition || stmtPosition === 'coalition' || stmtPosition === 'commonality';
      }

      // For spectrum domains, check if any axis matches
      if (typeof userPosition === 'object' && userPosition !== null) {
        for (const [axis, value] of Object.entries(userPosition as Record<string, string>)) {
          if (stmtPosition.includes(`${axis}-${value}`)) {
            return true;
          }
        }
      }

      return false;
    });

    return relevant.length > 0 ? relevant : this.statements;
  }

  async performAction(actionType: string, user: User): Promise<void> {
    const clients = this.getClientsForUser(user);
    const publicClient = clients.publicClient;

    try {
      let hash: `0x${string}` | undefined;
      let receipt: Awaited<ReturnType<typeof publicClient.getTransactionReceipt>> | undefined;

      switch (actionType) {
        case 'setBelief': {
          const statements = this.getRelevantStatements(user);
          const stmt = statements[Math.floor(Math.random() * statements.length)];
          const beliefState = Math.random() > 0.1 ? 1 : 2; // 90% believe, 10% disbelieve

          if (!stmt.cid) {
            console.warn(`  Statement ${stmt.id} has no CID, skipping`);
            break;
          }

          if (beliefState === 1) {
            hash = await believeStatement(clients, this.contracts.beliefs!, stmt.cid);
          } else {
            hash = await disbelieveStatement(clients, this.contracts.beliefs!, stmt.cid);
          }
          receipt = await publicClient.getTransactionReceipt({ hash });

          this.recordAction('setBelief', user, { statementId: stmt.id, beliefState }, receipt);
          break;
        }

        case 'setBeliefsInBatch': {
          const statements = this.getRelevantStatements(user);
          const numStatements = Math.min(3, statements.length);
          const selected: string[] = [];
          const beliefs: number[] = [];

          for (let i = 0; i < numStatements; i++) {
            const stmt = statements[Math.floor(Math.random() * statements.length)];
            if (!stmt.cid) {
              console.warn(`  Statement ${stmt.id} has no CID, skipping`);
              continue;
            }
            selected.push(stmt.cid);
            beliefs.push(Math.random() > 0.1 ? 1 : 2);
          }

          if (selected.length === 0) {
            console.warn(`  No statements with CIDs available, skipping batch`);
            break;
          }

          // Use SDK's believeStatement for each - batch not in SDK yet, call individually
          for (let i = 0; i < selected.length; i++) {
            if (beliefs[i] === 1) {
              hash = await believeStatement(clients, this.contracts.beliefs!, selected[i]);
            } else {
              hash = await disbelieveStatement(clients, this.contracts.beliefs!, selected[i]);
            }
          }
          if (hash) {
            receipt = await publicClient.getTransactionReceipt({ hash });
            this.recordAction('setBeliefsInBatch', user, { count: selected.length }, receipt);
          }
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
              const outbound = this.attestations.filter(a => a.fromStatementCid === stmt1.statementId);
              if (outbound.length > 0) {
                const randomAtt = outbound[Math.floor(Math.random() * outbound.length)];
                if (randomAtt.toStatementCid === stmt2.statementId) {
                  implies = true;
                }
              }
            } else {
              // Fallback to random for testing without LLM
              implies = Math.random() > 0.7; // 30% chance of implication
            }

            if (implies) {
              hash = await attestImplication(
                clients,
                this.contracts.implications!,
                stmt1.statementId,
                stmt2.statementId,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              );
              receipt = await publicClient.getTransactionReceipt({ hash });

              this.recordAction('attestImplication', user, { from: stmt1.id, to: stmt2.id }, receipt);
            }
          }
          break;
        }

        case 'attestProjectAlignment': {
          // Mock project address - generate from private key
          const randKey = ('0x' + Math.random().toString(16).slice(2).padStart(64, '0')) as `0x${string}`;
          const mockWallet = privateKeyToAccount(randKey);
          const projectAddress = mockWallet.address;
          const stmt = this.getRandomStatement();

          hash = await attestAlignment(
            clients,
            this.contracts.alignmentAttestations!,
            projectAddress,
            stmt.statementId,
            PROJECT_ALIGNMENT_TOPIC
          );
          receipt = await publicClient.getTransactionReceipt({ hash });

          this.recordAction('attestProjectAlignment', user, { project: projectAddress, statement: stmt.id }, receipt);
          break;
        }

        // Funding actions
        case 'createProject': {
          const result = await this.fundingDelegation!.createProject(user);
          if (result.success) {
            this.recordAction('createProject', user, { project: result.project }, result.receipt);
          } else {
            this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
          }
          break;
        }

        case 'purchaseFromPrimaryMarket': {
          const balance = await publicClient.getBalance({ address: user.address });
          const estimatedCost = parseEther('2');

          if (this.fundingDelegation!.createdProjects.length > 0 && balance > estimatedCost) {
            try {
              const project = this.fundingDelegation!.createdProjects[
                Math.floor(Math.random() * this.fundingDelegation!.createdProjects.length)
              ];
              if (!project || !project.tokenIds || !project.tokenIds.length) break;
              const tokenId = project.tokenIds[Math.floor(Math.random() * project.tokenIds.length)];
              const count = Math.floor(Math.random() * 2) + 1; // 1-2 tokens only

              const result = await this.fundingDelegation!.purchaseFromPrimaryMarket(user, project, tokenId, count);
              if (result.success) {
                this.recordAction('purchaseFromPrimaryMarket', user, { project: project.erc1155, tokenId, count }, result.receipt);
              } else {
                this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
              }
            } catch (err) {
              const error = err as Error;
              this.metrics.errors.push({ action: actionType, user: user.id, error: error.message });
            }
          }
          break;
        }

        case 'createSecondaryMarketListing': {
          const userTokens = this.fundingDelegation!.getAvailableTokens(user);
          const balance = await publicClient.getBalance({ address: user.address });

          if (userTokens.length > 0 && this.fundingDelegation!.createdProjects.length > 0 && balance > parseEther('0.1')) {
            try {
              const userToken = userTokens[Math.floor(Math.random() * userTokens.length)];
              if (!userToken || !userToken.tokenId || !userToken.count || userToken.count <= 0) break;

              const project = this.fundingDelegation!.createdProjects.find(p => p.erc1155 === userToken.erc1155);
              if (!project || !project.marketplace) break;

              const available = userToken.count - (userToken.listedCount || 0);
              if (available <= 0) break;

              const count = Math.floor(Math.random() * available) + 1;
              if (count <= 0) break;

              const pricePerToken = parseEther((Math.random() * 0.05 + 0.01).toFixed(4));
              if (!pricePerToken || pricePerToken <= 0n) break;

              const result = await this.fundingDelegation!.createSecondaryMarketListing(
                user, project, userToken.tokenId, count, pricePerToken
              );
              if (result.success) {
                this.recordAction('createSecondaryMarketListing', user, {
                  project: userToken.erc1155,
                  tokenId: userToken.tokenId,
                  count,
                  listingId: result.listingId
                }, result.receipt);
              } else {
                this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
              }
            } catch (err) {
              const error = err as Error;
              this.metrics.errors.push({ action: actionType, user: user.id, error: error.message });
            }
          }
          break;
        }

        // Delegation actions
        case 'depositToNote': {
          const balance = await publicClient.getBalance({ address: user.address });
          const amount = parseEther((Math.random() * 0.3 + 0.05).toFixed(2)); // 0.05-0.35 ETH
          const needed = amount + parseEther('1'); // amount + larger gas buffer

          if (balance > needed) {
            try {
              const result = await this.fundingDelegation!.depositToNote(user, amount);
              if (result.success) {
                this.recordAction('depositToNote', user, { noteId: result.note?.noteId, amount: amount.toString() }, result.receipt);
              } else {
                this.metrics.errors.push({ action: actionType, user: user.id, error: result.error });
              }
            } catch (err) {
              const error = err as Error;
              this.metrics.errors.push({ action: actionType, user: user.id, error: error.message });
            }
          }
          break;
        }

        case 'delegateNote': {
          const userNotes = this.fundingDelegation!.getDelegatableNotesExcluding(user, [user.address]);
          if (userNotes.length > 0) {
            const note = userNotes[Math.floor(Math.random() * userNotes.length)];
            const delegateTo = this.getRandomUser().address;
            const amountToDelegate = BigInt(note.amount) / BigInt(2); // Delegate half

            const result = await this.fundingDelegation!.delegateNote(user, note.noteId, delegateTo, amountToDelegate);
            if (result.success) {
              this.recordAction('delegateNote', user, {
                noteId: note.noteId,
                delegateTo,
                amount: amountToDelegate.toString()
              }, result.receipt);
            } else {
              this.metrics.errors.push({ action: actionType, user: user.id, error: result.error, noteId: note.noteId });
            }
          }
          break;
        }

        case 'revokeDelegation': {
          const userNotes = this.fundingDelegation!.getRevocableNotes(user);
          if (userNotes.length > 0) {
            const note = userNotes[Math.floor(Math.random() * userNotes.length)];
            const result = await this.fundingDelegation!.revokeDelegation(user, note.noteId);
            if (result.success) {
              this.recordAction('revokeDelegation', user, { noteId: note.noteId }, result.receipt);
            } else {
              this.metrics.errors.push({ action: actionType, user: user.id, error: result.error, noteId: note.noteId });
            }
          }
          break;
        }

        default:
          console.log(`Unknown action type: ${actionType}`);
      }
    } catch (error) {
      const err = error as Error;
      this.metrics.errors.push({
        action: actionType,
        user: user.id,
        error: err.message
      });
      console.log(`  Error in ${actionType} for user ${user.id}: ${err.message}`);
    }
  }

  recordAction(
    actionType: string,
    user: User,
    data: Record<string, unknown>,
    receipt: { gasUsed: bigint; blockNumber: bigint } | undefined
  ): void {
    this.actions.push({
      timestamp: Date.now(),
      actionType,
      userId: user.id,
      data,
      gasUsed: receipt?.gasUsed?.toString(),
      blockNumber: receipt?.blockNumber
    });

    if (receipt) {
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
  }

  async runSimulation(rounds = 5): Promise<void> {
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

  async saveResults(): Promise<void> {
    const bigIntReplacer = (_key: string, value: unknown) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    // Save actions log
    const actionsPath = join(__dirname, 'actions.json');
    await fs.writeFile(actionsPath, JSON.stringify(this.actions, bigIntReplacer, 2));

    // Calculate and save metrics
    const metricsReport = {
      totalActions: this.actions.length,
      actionCounts: this.metrics.actionCounts,
      errors: this.metrics.errors
    };

    const metricsPath = join(__dirname, 'metrics.json');
    await fs.writeFile(metricsPath, JSON.stringify(metricsReport, bigIntReplacer, 2));

    console.log('Results Summary:');
    console.log(`  Total actions: ${metricsReport.totalActions}`);
    console.log(`  Action breakdown:`);
    for (const [type, count] of Object.entries(metricsReport.actionCounts)) {
      console.log(`    ${type}: ${count}`);
    }
    if (metricsReport.errors.length > 0) {
      console.log(`\n  Errors: ${metricsReport.errors.length}`);
      const errorsByType: Record<string, number> = {};
      for (const err of metricsReport.errors) {
        const action = err.action as string;
        errorsByType[action] = (errorsByType[action] || 0) + 1;
      }
      console.log(`  Errors by type:`, errorsByType);
      console.log(`  Error details:`);
      for (const err of metricsReport.errors.slice(0, 15)) {
        console.log(`    - ${err.action} (user ${err.user}): ${err.error}`);
        if (err.noteId) {
          console.log(`      noteId: ${err.noteId}`);
        }
      }
      if (metricsReport.errors.length > 15) {
        console.log(`    ... and ${metricsReport.errors.length - 15} more`);
      }
    }

    // Show hardhat account[0] actions if using hardhat accounts
    if (this.useHardhatAccounts && this.users.length > 0) {
      const hardhatAccount0Address = this.users[0].address;
      const hardhat0Actions = this.actions.filter(a => a.userId === this.users[0].id);
      console.log(`\n  Hardhat account[0] (${hardhatAccount0Address.slice(0, 10)}...) actions: ${hardhat0Actions.length}`);
      if (hardhat0Actions.length > 0) {
        const actionsByType: Record<string, number> = {};
        for (const action of hardhat0Actions) {
          const type = action.actionType as string;
          actionsByType[type] = (actionsByType[type] || 0) + 1;
        }
        console.log(`    Breakdown:`, actionsByType);
      }
    }
  }

  async runAttackScenarios(): Promise<{
    attackResults: ReturnType<AttackScenarios['getResults']>;
    detectionResults: Awaited<ReturnType<AttackScenarios['detectAttacks']>>;
  } | undefined> {
    console.log('\n=== Running Attack Scenarios ===\n');

    if (!this.attackScenarios) {
      console.log('Attack scenarios not initialized');
      return;
    }

    // Take snapshot before attacks
    await this.invariantChecker!.takeSnapshot('before_attacks');

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
    await this.invariantChecker!.takeSnapshot('after_attacks');

    return {
      attackResults: this.attackScenarios.getResults(),
      detectionResults
    };
  }

  async runInvariantChecks(): Promise<Awaited<ReturnType<InvariantChecker['runAllChecks']>> | undefined> {
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
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const numUsers = parseInt(args.find(a => !a.startsWith('--')) ?? '50');
  const numRounds = parseInt(args.find((a, i) => i > 0 && !args[i-1].startsWith('--') && !a.startsWith('--')) ?? '5');
  const runAttacks = args.includes('--attacks');
  const runInvariants = args.includes('--invariants');
  const usePreGenerated = !args.includes('--no-pregenerated');
  const useHardhatAccounts = args.includes('--use-hardhat-accounts');

  const simulation = new SimulationRunner();
  simulation.usePreGeneratedAttestations = usePreGenerated;
  simulation.useHardhatAccounts = useHardhatAccounts;

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

// suppress unused imports warning for generateAttestations
void generateAttestations;

export { SimulationRunner };
