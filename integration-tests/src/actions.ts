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
