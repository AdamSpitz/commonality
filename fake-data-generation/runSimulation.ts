import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateUsers, HARDHAT_PRIVATE_KEYS } from './generateUsers.js';
import { generateStatements } from './generateStatements.js';
import { generateAttestations, loadAttestations, hasAttestations } from './generateAttestations.js';
import { FundingAndDelegationActions } from './fundingAndDelegationActions.js';
import { AttackScenarios } from './attackScenarios.js';
import { InvariantChecker } from './invariantChecker.js';
import { loadEnv, CONTRACT_ADDRESSES, RPC_URL } from './loadEnv.js';
import { generateContentFundingScenarios } from './contentFundingActions.js';
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
  cidToBytes32,
  type IpfsCidV1,
  type IPFSConfig,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  toSubjectId,
  PROJECT_ALIGNMENT_TOPIC,
} from '@commonality/sdk';
import type { User, Statement, SimulationContracts, StatementContent } from './types.js';
import type { Attestation } from './generateAttestations.js';

const erc20TransferAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

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

export async function uploadStatementToIPFS(ipfsConfig: IPFSConfig, content: StatementContent, domain: string, position: string, statementType: 'simple' | 'disjunction' | 'conjunction'): Promise<IpfsCidV1> {
  return await publishDocument(ipfsConfig, createStatement({
    content: content.text,
    topic: domain,
    extras: {
      domain: domain,
      position: position,
      statementType: statementType,
      references: content.references || [],
    },
  }));
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

async function attestImplication(
  clients: TestClients,
  contract: { address: `0x${string}` | undefined; abi: readonly unknown[] },
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  explanationCid: `0x${string}`
): Promise<`0x${string}`> {
  const fromBytes32 = cidToBytes32(fromStatementCid);
  const toBytes32 = cidToBytes32(toStatementCid);

  const hash = await clients.walletClient.writeContract({
    address: contract.address as `0x${string}`,
    abi: contract.abi,
    functionName: 'attestImplication',
    args: [fromBytes32, toBytes32, explanationCid],
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
    args: [toSubjectId(subjectAddress), cidToBytes32(statementCid), cidToBytes32(topicStatementCid)],
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

interface SimulationRunnerOptions {
  statementLimit?: number;
  maxActionsPerUserPerRound?: number;
}

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
  options: SimulationRunnerOptions;

  constructor(options: SimulationRunnerOptions = {}) {
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
    this.options = options;
  }

  async initialize(numUsers = 50): Promise<void> {
    console.log('=== Initializing Simulation ===\n');

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
    
    console.log('Loading contract addresses from .env...');
    this.loadContracts();

    // Generate or load users
    console.log('\nGenerating users...');
    try {
      const usersPath = join(__dirname, 'data', 'users.json');
      const data = await fs.readFile(usersPath, 'utf-8');
      this.users = JSON.parse(data) as User[];
      console.log(`Loaded ${this.users.length} existing users`);
      if (this.users.length > numUsers) {
        this.users = this.users.slice(0, numUsers);
        console.log(`Using first ${this.users.length} users for this run`);
      }
    } catch {
      this.users = await generateUsers(numUsers, { useHardhatAccounts: this.useHardhatAccounts });
    }

    if (this.options.maxActionsPerUserPerRound !== undefined) {
      this.users = this.users.map(user => ({
        ...user,
        actionsPerRound: Math.min(user.actionsPerRound, this.options.maxActionsPerUserPerRound!),
      }));
      console.log(`Capped user actions at ${this.options.maxActionsPerUserPerRound} per round`);
    }

    // Generate or load statements
    console.log('\nGenerating statements...');
    try {
      const stmtsPath = join(__dirname, 'data', 'statements.json');
      const data = await fs.readFile(stmtsPath, 'utf-8');
      this.statements = JSON.parse(data) as Statement[];
      console.log(`Loaded ${this.statements.length} existing statements`);
      if (this.options.statementLimit !== undefined && this.statements.length > this.options.statementLimit) {
        this.statements = this.statements.slice(0, this.options.statementLimit);
        console.log(`Using first ${this.statements.length} statements for this run`);
      }
    } catch {
      this.statements = await generateStatements(ipfsConfig, { limit: this.options.statementLimit });
    }

    // Upload statements to IPFS
    console.log('\nUploading statements to IPFS...');
    await this.uploadStatementsToIPFS(ipfsConfig);

    // Load pre-generated attestations
    console.log('\nLoading pre-generated attestations...');
    const attestationsExist = await hasAttestations();
    if (attestationsExist && this.usePreGeneratedAttestations) {
      this.attestations = await loadAttestations();
      console.log(`Loaded ${this.attestations.length} pre-generated attestations`);
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

  async uploadStatementsToIPFS(ipfsConfig: IPFSConfig): Promise<void> {
    let uploaded = 0;
    let failed = 0;

    for (const stmt of this.statements) {
      try {
        const cid: IpfsCidV1 = await uploadStatementToIPFS(
          ipfsConfig,
          stmt.content,
          stmt.domain,
          stmt.position,
          stmt.statementType,
        );
        stmt.cid = cid;
        uploaded++;

        if (uploaded % 10 === 0) {
          console.log(`  Uploaded ${uploaded}/${this.statements.length} statements...`);
        }
      } catch (err) {
        const error = err as Error;
        failed++;
        console.error(`  Failed to upload statement: ${error.message}`);
      }
    }

    console.log(`  Uploaded ${uploaded} statements to IPFS (${failed} failed)`);
  }

  async fundUsers(): Promise<void> {
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(RPC_URL)
    });

    // Use Hardhat's pre-funded default account as funder (starts with 10,000 ETH)
    const funderClient = createTestClients(HARDHAT_PRIVATE_KEYS[0], RPC_URL);

    const paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
    const paymentTokenAmount = parseEther('1000');
    let fundedCount = 0;
    let paymentTokenFundedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];

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

        if (paymentTokenAddress) {
          const paymentTokenHash = await funderClient.walletClient.writeContract({
            address: paymentTokenAddress,
            abi: erc20TransferAbi,
            functionName: 'transfer',
            args: [user.address, paymentTokenAmount],
            chain: funderClient.walletClient.chain,
            account: funderClient.walletClient.account!,
          });
          await publicClient.waitForTransactionReceipt({ hash: paymentTokenHash });
          paymentTokenFundedCount++;
        }

        fundedCount++;
      } catch (err) {
        const error = err as Error;
        failedCount++;
        if (failedCount <= 3) {
          console.log(`  Failed to fund user ${user.id}: ${error.message}`);
        }
      }
    }

    const paymentTokenSummary = paymentTokenAddress
      ? ` and ${paymentTokenFundedCount} users with payment tokens`
      : ' (PAYMENT_TOKEN_ADDRESS not set; skipped payment-token funding)';
    console.log(`  Funded ${fundedCount} users with ETH${paymentTokenSummary} (${failedCount} failed)`);
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
            console.warn(`  Statement has no CID, skipping`);
            break;
          }

          if (beliefState === 1) {
            hash = await believeStatement(clients, this.contracts.beliefs!, stmt.cid);
          } else {
            hash = await disbelieveStatement(clients, this.contracts.beliefs!, stmt.cid);
          }
          receipt = await publicClient.getTransactionReceipt({ hash });

          this.recordAction('setBelief', user, { statementId: stmt.cid, beliefState }, receipt);
          break;
        }

        case 'setBeliefsInBatch': {
          const statements = this.getRelevantStatements(user);
          const numStatements = Math.min(3, statements.length);
          const selected: IpfsCidV1[] = [];
          const beliefs: number[] = [];

          for (let i = 0; i < numStatements; i++) {
            const stmt = statements[Math.floor(Math.random() * statements.length)];
            if (!stmt.cid) {
              console.warn(`  Statement has no CID, skipping`);
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

          if (stmt1 !== stmt2 && stmt1.domain === stmt2.domain) {
            let implies = false;

            // Check pre-generated attestations first
            const preGen = this.getPreGeneratedAttestation(stmt1.cid!, stmt2.cid!);
            if (preGen) {
              implies = true;
              console.log(`  Using pre-generated attestation: ${preGen.id} (confidence: ${preGen.confidence})`);
            } else if (this.attestations.length > 0) {
              // Find any attestation where S1 appears as source
              const outbound = this.attestations.filter(a => a.fromStatementCid === stmt1.cid!);
              if (outbound.length > 0) {
                const randomAtt = outbound[Math.floor(Math.random() * outbound.length)];
                if (randomAtt.toStatementCid === stmt2.cid!) {
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
                stmt1.cid!,
                stmt2.cid!,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              );
              receipt = await publicClient.getTransactionReceipt({ hash });

              this.recordAction('attestImplication', user, { from: stmt1.cid, to: stmt2.cid }, receipt);
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
            stmt.cid!,
            PROJECT_ALIGNMENT_TOPIC
          );
          receipt = await publicClient.getTransactionReceipt({ hash });

          this.recordAction('attestProjectAlignment', user, { project: projectAddress, statement: stmt.cid }, receipt);
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

    // Ensure output directory exists
    await fs.mkdir(join(__dirname, 'output'), { recursive: true });

    // Save actions log
    const actionsPath = join(__dirname, 'output', 'actions.json');
    await fs.writeFile(actionsPath, JSON.stringify(this.actions, bigIntReplacer, 2));

    // Calculate and save metrics
    const metricsReport = {
      totalActions: this.actions.length,
      actionCounts: this.metrics.actionCounts,
      errors: this.metrics.errors
    };

    const metricsPath = join(__dirname, 'output', 'metrics.json');
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
  const skipInvariants = args.includes('--skip-invariants');
  const usePreGenerated = !args.includes('--no-pregenerated');
  const useHardhatAccounts = args.includes('--use-hardhat-accounts');
  const statementLimitArg = args.find(a => a.startsWith('--statement-limit='));
  const maxActionsArg = args.find(a => a.startsWith('--max-actions-per-user='));
  const statementLimit = statementLimitArg ? parseInt(statementLimitArg.split('=')[1]) : undefined;
  const maxActionsPerUserPerRound = maxActionsArg ? parseInt(maxActionsArg.split('=')[1]) : undefined;

  const simulation = new SimulationRunner({ statementLimit, maxActionsPerUserPerRound });
  simulation.usePreGeneratedAttestations = usePreGenerated;
  simulation.useHardhatAccounts = useHardhatAccounts;

  await simulation.initialize(numUsers);
  await simulation.runSimulation(numRounds);

  // Generate content-funding on-chain state (deterministic scenarios).
  const cfAddresses = {
    channelRegistry: CONTRACT_ADDRESSES.channelRegistry,
    channelVerifier: CONTRACT_ADDRESSES.channelVerifier,
    creatorContractFactory: CONTRACT_ADDRESSES.creatorContractFactory,
  };
  if (cfAddresses.channelRegistry && cfAddresses.channelVerifier && cfAddresses.creatorContractFactory) {
    await generateContentFundingScenarios(
      cfAddresses as {
        channelRegistry: `0x${string}`;
        channelVerifier: `0x${string}`;
        creatorContractFactory: `0x${string}`;
      },
      simulation.users,
    );
  } else {
    console.warn('Content-funding addresses not configured — skipping content-funding scenarios.');
    console.warn('  (Set CHANNEL_REGISTRY_ADDRESS, CHANNEL_VERIFIER_ADDRESS, CREATOR_CONTRACT_FACTORY_ADDRESS in .env)');
  }

  // Run attack scenarios if requested
  if (runAttacks) {
    await simulation.runAttackScenarios();
  }

  // Run invariant checks if requested
  if (runInvariants) {
    await simulation.runInvariantChecks();
  }

  // Always run invariant checks after simulation unless this is an intentionally tiny/dev seed.
  if (!skipInvariants) {
    await simulation.runInvariantChecks();
  } else {
    console.log('\nSkipping invariant checks (--skip-invariants).');
  }

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
