import { createPublicClient, createWalletClient, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { generateStatements } from './generateStatements.js';
import { loadEnv, RPC_URL } from './loadEnv.js';
import { BeliefsAbi, ImplicationsAbi, AlignmentAttestationsAbi, ProjectFactoryAbi, AssuranceContractAbi, ERC1155SecondaryMarketAbi, DelegatableNotesAbi } from '@commonality/sdk/abis';
import { uploadToIPFS } from '@commonality/sdk/utils';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { depositETH as sdkDepositETH, delegateNote as sdkDelegateNote, revokeNote as sdkRevokeNote, reclaimFunds as sdkReclaimFunds, purchaseFromPrimaryMarketWithNotes } from '@commonality/sdk/delegation';
import { createProject as sdkCreateProject, buyProjectTokens, withdrawProjectFunds as sdkWithdrawProjectFunds, createSaleListing, fulfillSaleListing, approveERC1155ForMarketplace } from '@commonality/sdk/lazy-giving';
import type { User, Statement, SimulationContracts } from './types.js';
import { parsePaymentTokenUnits } from './paymentTokenUnits.js';

loadEnv();

// suppress unused import warnings
void BeliefsAbi;
void ImplicationsAbi;
void AlignmentAttestationsAbi;

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

/**
 * Funding and Delegation Actions for Generative Testing
 *
 * This module provides actions for:
 * - Funding: Create projects, purchase tokens, trade on secondary market
 * - Delegation: Create notes, delegate, revoke, spend
 */

interface CreatedProject {
  owner: `0x${string}`;
  erc1155: `0x${string}`;
  marketplace: `0x${string}`;
  assuranceContract: `0x${string}`;
  threshold: string;
  deadline: number;
  tokenIds: number[];
  prices: string[];
  seedProjectIndex: number;
  seedProjectKind: string;
}

interface TokenRecord {
  erc1155: `0x${string}`;
  tokenId: number;
  count: number;
  listedCount: number;
}

interface NoteRecord {
  noteId: string;
  owner: `0x${string}`;
  amount: string;
  token: `0x${string}`;
  tokenType: number;
  tokenId: number;
  delegated: boolean;
  revoked: boolean;
  originalOwner: `0x${string}`;
}

type TxReceipt = { gasUsed: bigint; blockNumber: bigint };

export interface SeedProjectAlignmentRef {
  collectionId: string;
  groupId: string;
  statementId: string;
}

interface SeedProjectMetadataTemplate {
  name: string;
  description: string;
  kind: string;
  alignmentRef: SeedProjectAlignmentRef;
}

const PROJECT_SEED_METADATA: SeedProjectMetadataTemplate[] = [
  {
    name: 'Bridge-Building Workshop Series',
    description: 'Run small-group workshops that help people with different politics coordinate on shared goals.',
    kind: 'finding-common-ground',
    alignmentRef: {
      collectionId: 'fundable-projects',
      groupId: 'finding-common-ground',
      statementId: 'common-ground-across-divides',
    },
  },
  {
    name: 'Open Civic Data Toolkit',
    description: 'Build reusable data tools for local organizers tracking public budgets and outcomes.',
    kind: 'government-accountability',
    alignmentRef: {
      collectionId: 'fundable-projects',
      groupId: 'government-accountability',
      statementId: 'transparent-and-auditable-spending',
    },
  },
  {
    name: 'Critical Maintainer Fellowship',
    description: 'Provide stable funding for maintainers of open-source libraries used by public-interest software.',
    kind: 'open-source-and-public-infrastructure',
    alignmentRef: {
      collectionId: 'fundable-projects',
      groupId: 'open-source-and-public-infrastructure',
      statementId: 'fund-critical-maintainers',
    },
  },
  {
    name: 'Independent Replication Lab',
    description: 'Run and publish replication studies for high-impact scientific claims before they guide policy or care.',
    kind: 'scientific-research',
    alignmentRef: {
      collectionId: 'fundable-projects',
      groupId: 'scientific-research',
      statementId: 'independent-replication-studies',
    },
  },
  {
    name: 'Community Mental Health Access Fund',
    description: 'Help local clinics pilot affordable, evidence-based mental-health treatment and research programs.',
    kind: 'public-health',
    alignmentRef: {
      collectionId: 'fundable-projects',
      groupId: 'public-health',
      statementId: 'mental-health-treatment-and-research',
    },
  },
];

export function getSeedProjectAlignmentRef(projectIndex: number): SeedProjectAlignmentRef {
  return PROJECT_SEED_METADATA[projectIndex % PROJECT_SEED_METADATA.length].alignmentRef;
}

export function getSeedProjectMetadata(projectIndex: number) {
  const template = PROJECT_SEED_METADATA[projectIndex % PROJECT_SEED_METADATA.length];
  return {
    name: template.name,
    description: template.description,
    seedProjectIndex: projectIndex,
    seedProjectKind: template.kind,
    alignedStatementRefs: [template.alignmentRef],
  };
}

type ActionResult<T = Record<string, unknown>> =
  | { success: true; receipt: TxReceipt } & T
  | { success: false; error: string };

class FundingAndDelegationActions {
  contracts: SimulationContracts;
  users: User[];
  statements: Statement[];
  createdProjects: CreatedProject[];
  createdNotes: NoteRecord[];
  userTokens: Map<`0x${string}`, TokenRecord[]>;
  rpcUrl: string;

  constructor(contracts: SimulationContracts, users: User[], statements: Statement[]) {
    this.contracts = contracts;
    this.users = users;
    this.statements = statements;
    this.createdProjects = [];
    this.createdNotes = [];
    this.userTokens = new Map();
    this.rpcUrl = RPC_URL || 'http://localhost:8545';
  }

  createClientsForUser(user: User) {
    const account = privateKeyToAccount(user.privateKey);

    const walletClient = createWalletClient({
      account,
      chain: hardhat,
      transport: http(this.rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(this.rpcUrl),
    });

    return {
      walletClient,
      publicClient,
      account: account.address,
    };
  }

  getWalletForUser(user: User) {
    return this.createClientsForUser(user);
  }

  getRandomUser(): User {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  getRandomStatement(): Statement {
    return this.statements[Math.floor(Math.random() * this.statements.length)];
  }

  getUserNotes(user: User): NoteRecord[] {
    return this.createdNotes.filter(note => note.owner === user.address && !note.delegated && !note.revoked);
  }

  getDelegatableNotes(user: User): NoteRecord[] {
    return this.createdNotes.filter(note =>
      note.owner === user.address &&
      note.token === zeroAddress &&
      note.tokenType === 0 &&
      !note.delegated &&
      !note.revoked
    );
  }

  getDelegatableNotesExcluding(user: User, excludeAddresses: `0x${string}`[]): NoteRecord[] {
    return this.createdNotes.filter(note =>
      note.owner === user.address &&
      note.token === zeroAddress &&
      note.tokenType === 0 &&
      !note.delegated &&
      !note.revoked &&
      !excludeAddresses.includes(note.originalOwner) &&
      !excludeAddresses.includes(note.owner)
    );
  }

  getRevocableNotes(user: User): NoteRecord[] {
    return this.createdNotes.filter(note =>
      note.owner === user.address &&
      note.delegated === true &&
      !note.revoked
    );
  }

  getUserTokens(user: User): TokenRecord[] {
    return this.userTokens.get(user.address) || [];
  }

  getAvailableTokens(user: User): TokenRecord[] {
    const tokens = this.userTokens.get(user.address) || [];
    return tokens.filter(t => (t.listedCount || 0) < t.count);
  }

  /**
   * Funding Action: Create a new project using LazyGiving
   */
  async createProject(user: User): Promise<ActionResult<{ project: CreatedProject }>> {
    if (!this.contracts.projectFactory) {
      throw new Error('ProjectFactory contract not deployed');
    }

    const clients = this.getWalletForUser(user);

    const threshold = parsePaymentTokenUnits((Math.random() * 5 + 1).toFixed(2));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60));
    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
    const seedProjectIndex = this.createdProjects.length;
    const seedProjectMetadata = getSeedProjectMetadata(seedProjectIndex);
    const projectMetadataCid = await uploadToIPFS(
      ipfsConfig,
      seedProjectMetadata,
    );

    const tokenIds = [1n, 2n, 3n];
    const maxSupplies = [100n, 500n, 1000n];
    const prices = [
      parsePaymentTokenUnits('0.1'),
      parsePaymentTokenUnits('0.05'),
      parsePaymentTokenUnits('0.01')
    ];
    const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined

    if (!paymentToken) {
      throw new Error('PAYMENT_TOKEN_ADDRESS not configured');
    }

    try {
      const { hash, projectDetails } = await sdkCreateProject(
        clients,
        { address: this.contracts.projectFactory.address!, abi: this.contracts.projectFactory.abi },
        {
          metadataURI: `ipfs://${projectMetadataCid}/`,
          contractURI: `ipfs://${projectMetadataCid}`,
          owner: user.address,
          recipient: user.address,
          paymentToken,
          threshold,
          deadline,
          projectMetadataCid,
          tokenIds,
          tokenCounts: maxSupplies,
          tokenPrices: prices
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      const project: CreatedProject = {
        owner: user.address,
        erc1155: projectDetails.tokenAddress,
        marketplace: projectDetails.marketplaceAddress,
        assuranceContract: projectDetails.assuranceContractAddress,
        threshold: threshold.toString(),
        deadline: Number(deadline),
        tokenIds: tokenIds.map(n => Number(n)),
        prices: prices.map(p => p.toString()),
        seedProjectIndex,
        seedProjectKind: seedProjectMetadata.seedProjectKind,
      };

      this.createdProjects.push(project);
      return { success: true, project, receipt };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Funding Action: Purchase tokens from primary market
   */
  async purchaseFromPrimaryMarket(
    user: User,
    project: CreatedProject,
    tokenId: number,
    count: number
  ): Promise<ActionResult<{ totalCost: string }>> {
    const clients = this.getWalletForUser(user);

    try {
      const tokenIndex = project.tokenIds.indexOf(tokenId);
      if (tokenIndex === -1) {
        throw new Error('Invalid token ID');
      }

      const price = BigInt(project.prices[tokenIndex]);
      const totalCost = price * BigInt(count);

      const hash = await buyProjectTokens(
        clients,
        { address: project.assuranceContract, abi: AssuranceContractAbi },
        {
          buyer: user.address,
          tokenAddress: project.erc1155,
          tokenIds: [BigInt(tokenId)],
          tokenCounts: [BigInt(count)],
          totalCost
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      if (!this.userTokens.has(user.address)) {
        this.userTokens.set(user.address, []);
      }
      const userTokenList = this.userTokens.get(user.address)!;
      const existingToken = userTokenList.find(t => t.erc1155 === project.erc1155 && t.tokenId === tokenId);
      if (existingToken) {
        existingToken.count += count;
      } else {
        userTokenList.push({ erc1155: project.erc1155, tokenId, count, listedCount: 0 });
      }

      return { success: true, receipt, totalCost: totalCost.toString() };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Funding Action: Create a sale listing on secondary market
   */
  async createSecondaryMarketListing(
    user: User,
    project: CreatedProject,
    tokenId: number,
    count: number,
    pricePerToken: bigint
  ): Promise<ActionResult<{ listingId: string }>> {
    const clients = this.getWalletForUser(user);

    try {
      if (!project || !project.erc1155 || !project.marketplace) {
        throw new Error(`Invalid project: missing erc1155 or marketplace`);
      }

      if (tokenId === undefined) {
        throw new Error(`Invalid tokenId: ${tokenId}`);
      }

      if (!pricePerToken || typeof pricePerToken !== 'bigint') {
        throw new Error(`Invalid pricePerToken: ${pricePerToken}`);
      }

      await approveERC1155ForMarketplace(
        clients,
        project.erc1155,
        project.marketplace
      );

      const hash = await createSaleListing(
        clients,
        { address: project.marketplace, abi: ERC1155SecondaryMarketAbi },
        {
          tokenId: BigInt(tokenId),
          count: BigInt(count),
          pricePerToken
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      let listingId = 'unknown';
      try {
        const logs = receipt.logs as Array<{ topics?: string[] }>;
        for (const log of logs) {
          try {
            if (log.topics && log.topics.length > 0) {
              const topic = log.topics[0];
              if (topic?.includes('SaleListingCreated') || topic?.length === 66) {
                listingId = log.topics[1] ? BigInt(log.topics[1]).toString() : 'unknown';
              }
            }
          } catch { /* ignore parse errors */ }
        }
      } catch (eventError) {
        const err = eventError as Error;
        console.log('Event parsing warning:', err.message);
      }

      const userTokenList = this.userTokens.get(user.address);
      if (userTokenList) {
        const tokenIdx = userTokenList.findIndex(t => t.erc1155 === project.erc1155 && t.tokenId === tokenId);
        if (tokenIdx !== -1) {
          userTokenList[tokenIdx].listedCount = (userTokenList[tokenIdx].listedCount || 0) + count;
        }
      }

      return { success: true, receipt, listingId };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Funding Action: Purchase from secondary market
   */
  async purchaseFromSecondaryMarket(
    user: User,
    project: CreatedProject,
    listingId: string,
    count: number,
    pricePerToken: bigint
  ): Promise<ActionResult<{ totalCost: string }>> {
    const clients = this.getWalletForUser(user);

    try {
      if (!pricePerToken) {
        throw new Error('pricePerToken is required');
      }

      const totalCost = pricePerToken * BigInt(count);

      const hash = await fulfillSaleListing(
        clients,
        { address: project.marketplace, abi: ERC1155SecondaryMarketAbi },
        {
          saleListingId: BigInt(listingId),
          count: BigInt(count),
          totalCost,
          expectedPricePerToken: pricePerToken
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      if (!this.userTokens.has(user.address)) {
        this.userTokens.set(user.address, []);
      }
      const userTokenList = this.userTokens.get(user.address)!;
      const existingToken = userTokenList.find(t => t.erc1155 === project.erc1155);
      if (existingToken) {
        existingToken.count += count;
      } else {
        userTokenList.push({ erc1155: project.erc1155, tokenId: 0, count, listedCount: 0 });
      }

      return { success: true, receipt, totalCost: totalCost.toString() };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Funding Action: Withdraw funds from successful project
   */
  async withdrawProjectFunds(user: User, project: CreatedProject): Promise<ActionResult> {
    const clients = this.getWalletForUser(user);

    try {
      if (user.address.toLowerCase() !== project.owner.toLowerCase()) {
        throw new Error('Only project recipient can withdraw');
      }

      const hash = await sdkWithdrawProjectFunds(
        clients,
        { address: project.assuranceContract, abi: AssuranceContractAbi }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, receipt };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Delegation Action: Deposit ETH to create a note
   */
  async depositToNote(user: User, amount: bigint): Promise<ActionResult<{ note: NoteRecord }>> {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const clients = this.getWalletForUser(user);

    try {
      const { hash, noteId } = await sdkDepositETH(
        clients,
        { address: this.contracts.delegatableNotes.address!, abi: this.contracts.delegatableNotes.abi },
        { amount }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      const note: NoteRecord = {
        noteId: noteId.toString(),
        owner: user.address,
        amount: amount.toString(),
        token: zeroAddress,
        tokenType: 0,
        tokenId: 0,
        delegated: false,
        revoked: false,
        originalOwner: user.address
      };
      this.createdNotes.push(note);
      return { success: true, note, receipt };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Delegation Action: Delegate a note to another user
   */
  async delegateNote(
    user: User,
    noteId: string,
    delegateTo: `0x${string}`,
    amountToDelegate: bigint
  ): Promise<ActionResult<{ delegatedNoteId: string; remainderNoteId?: string }>> {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const clients = this.getWalletForUser(user);

    try {
      const note = this.createdNotes.find(n => n.noteId === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      if (note.owner !== user.address) {
        throw new Error('Not note owner');
      }

      const owners: `0x${string}`[] = [user.address];

      const { hash, delegatedNoteId, remainderNoteId } = await sdkDelegateNote(
        clients,
        { address: this.contracts.delegatableNotes.address!, abi: this.contracts.delegatableNotes.abi },
        {
          noteId: BigInt(noteId),
          owners,
          delegateTo,
          amount: amountToDelegate
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      if (remainderNoteId && remainderNoteId > 0n) {
        const splitAmount = (BigInt(note.amount) - (BigInt(note.amount) * amountToDelegate / BigInt(note.amount))).toString();
        note.amount = (BigInt(note.amount) - BigInt(splitAmount)).toString();

        this.createdNotes.push({
          noteId: delegatedNoteId.toString(),
          owner: delegateTo,
          amount: splitAmount,
          token: note.token,
          tokenType: note.tokenType,
          tokenId: note.tokenId,
          delegated: true,
          revoked: false,
          originalOwner: note.originalOwner || user.address
        });

        return {
          success: true,
          delegatedNoteId: delegatedNoteId.toString(),
          remainderNoteId: remainderNoteId.toString(),
          receipt
        };
      } else {
        note.owner = delegateTo;
        note.delegated = true;
        return { success: true, delegatedNoteId: delegatedNoteId.toString(), receipt };
      }
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Delegation Action: Revoke a delegation
   */
  async revokeDelegation(user: User, noteId: string): Promise<ActionResult> {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const clients = this.getWalletForUser(user);

    try {
      const note = this.createdNotes.find(n => n.noteId === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      const owners: `0x${string}`[] = [note.owner, user.address];

      const hash = await sdkRevokeNote(
        clients,
        { address: this.contracts.delegatableNotes.address!, abi: this.contracts.delegatableNotes.abi },
        {
          noteId: BigInt(noteId),
          owners
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      note.owner = user.address;
      note.revoked = true;

      return { success: true, receipt };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Delegation Action: Spend notes to purchase tokens from primary market
   */
  async spendNotesOnPrimaryMarket(
    user: User,
    noteIds: string[],
    project: CreatedProject,
    tokenIds: number[],
    counts: number[]
  ): Promise<ActionResult<{ totalCost: string }>> {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const clients = this.getWalletForUser(user);

    try {
      if (tokenIds.length !== 1 || counts.length !== 1) {
        throw new Error('Delegatable-note purchases support one token type per transaction');
      }

      const tokenIndex = project.tokenIds.indexOf(tokenIds[0]);
      if (tokenIndex === -1) {
        throw new Error(`Token ${tokenIds[0]} does not belong to project`);
      }

      const totalCost = BigInt(project.prices[tokenIndex]) * BigInt(counts[0]);
      const totalShares = BigInt(counts[0]);
      const baseShares = totalShares / BigInt(noteIds.length);
      const remainderShares = totalShares % BigInt(noteIds.length);
      const purchaseShares = noteIds.map((noteId, index) => ({
        noteId: BigInt(noteId),
        chain: [user.address] as `0x${string}`[],
        shares: baseShares + (BigInt(index) < remainderShares ? 1n : 0n)
      })).filter(share => share.shares > 0n);

      const hash = await purchaseFromPrimaryMarketWithNotes(
        clients,
        { address: this.contracts.delegatableNotes.address!, abi: this.contracts.delegatableNotes.abi },
        {
          purchaseShares,
          primaryMarket: project.assuranceContract,
          erc1155Contract: project.erc1155,
          tokenId: BigInt(tokenIds[0]),
          count: BigInt(counts[0])
        }
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      for (const noteId of noteIds) {
        const note = this.createdNotes.find(n => n.noteId === noteId);
        if (note) {
          const costPerNote = totalCost / BigInt(noteIds.length);
          note.amount = (BigInt(note.amount) - costPerNote).toString();
        }
      }

      return { success: true, receipt, totalCost: totalCost.toString() };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Delegation Action: Reclaim funds from a root note
   */
  async reclaimNoteFunds(user: User, noteId: string): Promise<ActionResult> {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const clients = this.getWalletForUser(user);

    try {
      const note = this.createdNotes.find(n => n.noteId === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      if (note.owner !== user.address) {
        throw new Error('Not note owner');
      }

      const hash = await sdkReclaimFunds(
        clients,
        { address: this.contracts.delegatableNotes.address!, abi: this.contracts.delegatableNotes.abi },
        BigInt(noteId)
      );

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

      this.createdNotes = this.createdNotes.filter(n => n.noteId !== noteId);

      return { success: true, receipt };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }
}

// suppress unused import
void generateStatements;
void DelegatableNotesAbi;
void ProjectFactoryAbi;

export { FundingAndDelegationActions };
export type { CreatedProject, NoteRecord, TokenRecord };
