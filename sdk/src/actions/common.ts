/**
 * Common utilities for user actions
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
  type Address,
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
