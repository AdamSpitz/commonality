/**
 * User actions for integration tests
 *
 * This module provides higher-level abstractions for interacting with the
 * Commonality system during integration tests.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
  type Address,
  type Hash,
} from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

// ============================================================================
// Client Setup
// ============================================================================

export interface TestClients {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: Address;
}

/**
 * Create test clients for a given private key
 */
export function createTestClients(privateKey: `0x${string}`, rpcUrl = 'http://localhost:8545'): TestClients {
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

// ============================================================================
// IPFS Helpers
// ============================================================================

/**
 * Convert IPFS CID to bytes32 for onchain storage
 */
export function cidToBytes32(cid: string): `0x${string}` {
  const parsed = CID.parse(cid);
  const digest = parsed.multihash.digest;

  if (digest.length !== 32) {
    throw new Error('CID digest must be 32 bytes for bytes32 conversion');
  }

  return `0x${Buffer.from(digest).toString('hex')}` as `0x${string}`;
}

/**
 * Convert bytes32 to IPFS CID
 */
export function bytes32ToCid(bytes32: `0x${string}`): string {
  const digest = Buffer.from(bytes32.slice(2), 'hex');
  const hash = sha256.digest(digest);
  const cid = CID.create(1, raw.code, hash);
  return cid.toString();
}

/**
 * Mock IPFS upload - in a real test, this would upload to Pinata or local IPFS
 * For now, we just create a CID from the content
 */
export async function uploadToIPFS(content: object): Promise<string> {
  const bytes = Buffer.from(JSON.stringify(content));
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, raw.code, hash);
  return cid.toString();
}

// ============================================================================
// Conceptspace Actions
// ============================================================================

export interface BeliefsContract {
  address: Address;
  abi: any;
}

// Belief state constants
export const NO_OPINION = 0;
export const BELIEVES = 1;
export const DISBELIEVES = 2;

/**
 * Express belief in a statement
 */
export async function believeStatement(
  clients: TestClients,
  beliefsContract: BeliefsContract,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: beliefsContract.address,
    abi: beliefsContract.abi,
    functionName: 'setBelief',
    args: [statementId, BELIEVES],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Express disbelief in a statement
 */
export async function disbelieveStatement(
  clients: TestClients,
  beliefsContract: BeliefsContract,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: beliefsContract.address,
    abi: beliefsContract.abi,
    functionName: 'setBelief',
    args: [statementId, DISBELIEVES],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Remove opinion on a statement
 */
export async function clearOpinion(
  clients: TestClients,
  beliefsContract: BeliefsContract,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: beliefsContract.address,
    abi: beliefsContract.abi,
    functionName: 'setBelief',
    args: [statementId, NO_OPINION],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Implications Actions
// ============================================================================

export interface ImplicationsContract {
  address: Address;
  abi: any;
}

/**
 * Attest that one statement implies another
 */
export async function attestImplication(
  clients: TestClients,
  implicationsContract: ImplicationsContract,
  fromStatementCid: string,
  toStatementCid: string
): Promise<Hash> {
  const fromStatementId = cidToBytes32(fromStatementCid);
  const toStatementId = cidToBytes32(toStatementCid);

  const hash = await clients.walletClient.writeContract({
    address: implicationsContract.address,
    abi: implicationsContract.abi,
    functionName: 'attestImplication',
    args: [fromStatementId, toStatementId],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple implications
 */
export async function attestImplicationsBatch(
  clients: TestClients,
  implicationsContract: ImplicationsContract,
  fromStatementCids: string[],
  toStatementCids: string[]
): Promise<Hash> {
  const fromStatementIds = fromStatementCids.map(cidToBytes32);
  const toStatementIds = toStatementCids.map(cidToBytes32);

  const hash = await clients.walletClient.writeContract({
    address: implicationsContract.address,
    abi: implicationsContract.abi,
    functionName: 'attestImplicationsInBatch',
    args: [fromStatementIds, toStatementIds],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Pubstarter Actions
// ============================================================================

export interface PubstarterContract {
  address: Address;
  abi: any;
}

export interface AssuranceContract {
  address: Address;
  abi: any;
}

export interface ProjectDetails {
  tokenAddress: Address;
  marketplaceAddress: Address;
  assuranceContractAddress: Address;
}

/**
 * Create a new crowdfunding project with ERC1155 tokens, marketplace, and assurance contract
 */
export async function createProject(
  clients: TestClients,
  pubstarterContract: PubstarterContract,
  params: {
    metadataURI: string;
    contractURI: string;
    owner: Address;
    recipient: Address;
    threshold: bigint;
    deadline: bigint;
    projectMetadataCid: string;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    tokenPrices: bigint[];
  }
): Promise<{ hash: Hash; projectDetails: ProjectDetails }> {
  const hash = await clients.walletClient.writeContract({
    address: pubstarterContract.address,
    abi: pubstarterContract.abi,
    functionName: 'createERC1155AndMarketplaceAndAssuranceContract',
    args: [
      params.metadataURI,
      params.contractURI,
      params.owner,
      params.recipient,
      params.threshold,
      params.deadline,
      params.projectMetadataCid,
      params.tokenIds,
      params.tokenCounts,
      params.tokenPrices,
    ],
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the events to get the created contract addresses using the correct event signatures
  // Event signatures (keccak256 of event signature string):
  const TOKEN_EVENT_SIG = '0xb19b1e716b2442a282f6c0a8070d29d679fafef0ffe820b8d57e8cffb23baf74'; // PubstarterERC1155ContractCreated(address)
  const MARKETPLACE_EVENT_SIG = '0xffbbed5570d9ef9bfcd7f36845d1c453eb9b6a1866a22f3124e606c19bc62259'; // PubstarterERC1155SecondaryMarketCreated(address)
  const ASSURANCE_EVENT_SIG = '0xce37cb32adaee3ca1e28b96585d947e318568558ee75f07562f230ffb35bd645'; // PubstarterAssuranceContractCreated(address)

  let tokenAddress: Address | undefined;
  let marketplaceAddress: Address | undefined;
  let assuranceContractAddress: Address | undefined;

  // Find each event by its signature
  for (const log of receipt.logs) {
    if (log.topics[0] === TOKEN_EVENT_SIG && log.topics[1]) {
      tokenAddress = `0x${log.topics[1].slice(26)}` as Address;
    } else if (log.topics[0] === MARKETPLACE_EVENT_SIG && log.topics[1]) {
      marketplaceAddress = `0x${log.topics[1].slice(26)}` as Address;
    } else if (log.topics[0] === ASSURANCE_EVENT_SIG && log.topics[1]) {
      assuranceContractAddress = `0x${log.topics[1].slice(26)}` as Address;
    }
  }

  if (!tokenAddress || !marketplaceAddress || !assuranceContractAddress) {
    throw new Error(`Failed to extract contract addresses from transaction logs. Found: token=${tokenAddress}, marketplace=${marketplaceAddress}, assurance=${assuranceContractAddress}`);
  }

  return {
    hash,
    projectDetails: {
      tokenAddress,
      marketplaceAddress,
      assuranceContractAddress,
    },
  };
}

/**
 * Buy tokens from a project's assurance contract
 */
export async function buyProjectTokens(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  params: {
    buyer: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    totalCost: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'buyERC1155',
    args: [
      params.buyer,
      params.tokenAddress,
      params.tokenIds,
      params.tokenCounts,
      '0x', // data parameter
    ],
    value: params.totalCost,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Refund tokens back to the assurance contract
 */
export async function refundProjectTokens(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  params: {
    holder: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'refundERC1155',
    args: [
      params.holder,
      params.tokenAddress,
      params.tokenIds,
      params.tokenCounts,
      '0x', // data parameter
    ],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Withdraw funds from a successful project
 */
export async function withdrawProjectFunds(
  clients: TestClients,
  assuranceContract: AssuranceContract
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'withdraw',
    args: [],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Delegation Actions
// ============================================================================

export interface DelegatableNotesContract {
  address: Address;
  abi: any;
}

export enum TokenType {
  ERC20 = 0,
  ERC1155 = 1,
}

/**
 * Deposit ETH into a delegatable note
 */
export async function depositETH(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    amount: bigint;
    intendedStatementId: `0x${string}`;
  }
): Promise<{ hash: Hash; noteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'deposit',
    args: [
      '0x0000000000000000000000000000000000000000', // address(0) for ETH
      TokenType.ERC20, // TokenType.ERC20 for ETH
      0n, // tokenId (unused for ETH)
      0n, // amount parameter (unused for ETH, use msg.value)
      params.intendedStatementId,
    ],
    value: params.amount,
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the NoteCreated event to get the noteId
  const noteCreatedEventSig = '0x1a2a0b1d6b65f8d90bc804c7b1e3c8d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9'; // NoteCreated event signature

  // Find the NoteCreated event
  let noteId: bigint | undefined;
  for (const log of receipt.logs) {
    // The noteId is the first indexed parameter in NoteCreated event
    if (log.topics[0] && log.topics[1]) {
      noteId = BigInt(log.topics[1]);
      break;
    }
  }

  if (noteId === undefined) {
    throw new Error('Failed to extract noteId from transaction logs');
  }

  return { hash, noteId };
}

/**
 * Delegate a note to another address
 */
export async function delegateNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    owners: Address[]; // Delegation chain (leaf first, root last)
    delegateTo: Address;
    amount: bigint;
  }
): Promise<{ hash: Hash; delegatedNoteId: bigint; remainderNoteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'delegate',
    args: [params.noteId, params.owners, params.delegateTo, params.amount],
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the NoteDelegated event to get the delegated note ID
  // The event could be a ChainSplit (partial delegation) or NoteDelegated (full delegation)
  let delegatedNoteId = params.noteId; // Default to same note for full delegation
  let remainderNoteId = 0n;

  // Look for ChainSplit event first (partial delegation)
  for (const log of receipt.logs) {
    if (log.topics[0] && log.topics.length >= 3) {
      // ChainSplit has originalLeafId, splitLeafId, remainderLeafId as indexed params
      const possibleDelegatedId = BigInt(log.topics[2] || 0);
      const possibleRemainderID = BigInt(log.topics[3] || 0);
      if (possibleDelegatedId > 0n) {
        delegatedNoteId = possibleDelegatedId;
        remainderNoteId = possibleRemainderID;
        break;
      }
    }
  }

  return { hash, delegatedNoteId, remainderNoteId };
}

/**
 * Revoke a delegated note back to a position in the chain
 */
export async function revokeNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    owners: Address[]; // Current delegation chain (leaf first, root last)
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'revoke',
    args: [params.noteId, params.owners],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Reclaim funds from a root note (non-delegated)
 */
export async function reclaimFunds(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  noteId: bigint
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'reclaimFunds',
    args: [noteId],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Purchase from primary market using delegatable notes
 */
export async function purchaseFromPrimaryMarketWithNotes(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteIds: bigint[];
    chains: Address[][]; // Array of delegation chains (one per note)
    paymentAmount: bigint;
    primaryMarket: Address;
    erc1155Contract: Address;
    tokenIds: bigint[];
    counts: bigint[];
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'purchaseFromPrimaryMarket',
    args: [
      params.noteIds,
      params.chains,
      params.paymentAmount,
      params.primaryMarket,
      params.erc1155Contract,
      params.tokenIds,
      params.counts,
    ],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
