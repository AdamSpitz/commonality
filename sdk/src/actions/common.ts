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
import { Buffer } from 'buffer';

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

  // @ts-ignore - viem type inference issue with publicClient
  const publicClient: PublicClient = createPublicClient({
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
  const digestBytes = Buffer.from(bytes32.slice(2), 'hex');
  // Create a MultihashDigest directly from the bytes
  const hash = {
    code: sha256.code,
    digest: digestBytes,
    size: digestBytes.length,
    bytes: new Uint8Array([0x12, 0x20, ...digestBytes]) // 0x12 = sha256 code, 0x20 = 32 bytes
  };
  const cid = CID.create(1, raw.code, hash);
  return cid.toString();
}

/**
 * In-memory mock IPFS storage for unit tests
 * Maps CID -> content
 */
const mockIPFSStore = new Map<string, object>();

/**
 * Fetch content from mock IPFS store
 * Used when IPFS_API is not configured
 */
export function fetchFromMockIPFS(cid: string): object | null {
  return mockIPFSStore.get(cid) || null;
}

/**
 * Fetch content from IPFS
 *
 * Modes:
 * - Real IPFS: When IPFS_GATEWAY env var is set, fetches from IPFS gateway
 * - Mock mode: Otherwise, fetches from in-memory mock store
 *
 * @param cid - IPFS CID to fetch
 * @param timeoutMs - Optional timeout in milliseconds (default: 10000)
 * @returns Content object or null if not found/failed
 */
export async function fetchFromIPFS(
  cid: string,
  timeoutMs: number = 10000
): Promise<object | null> {
  const ipfsGateway = process.env.IPFS_GATEWAY || process.env.VITE_IPFS_GATEWAY;

  if (ipfsGateway) {
    // Fetch from real IPFS gateway
    try {
      const url = `${ipfsGateway}/${cid}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        console.warn(`Failed to fetch IPFS content for ${cid}: ${response.status}`);
        return null;
      }

      const content = await response.json() as object;
      return content;
    } catch (error) {
      console.warn(`Error fetching IPFS content for ${cid}:`, error);
      return null;
    }
  } else {
    // Fetch from mock store
    return fetchFromMockIPFS(cid);
  }
}


/**
 * Clear the mock IPFS store
 * Useful for cleaning up between tests
 */
export function clearMockIPFS(): void {
  mockIPFSStore.clear();
}

/**
 * Upload content to IPFS
 *
 * Modes:
 * - Real IPFS: When IPFS_API env var is set, uploads to actual IPFS node
 * - Mock mode: Otherwise, stores in-memory and returns deterministic CID
 *
 * Mock mode is useful for unit tests that don't want external dependencies.
 * The mock store allows fetching content back via fetchFromMockIPFS().
 */
export async function uploadToIPFS(content: object): Promise<string> {
  const ipfsApi = process.env.IPFS_API || process.env.VITE_IPFS_API;

  if (ipfsApi) {
    // Upload to actual IPFS node
    const jsonContent = JSON.stringify(content);

    try {
      const formData = new FormData();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      formData.append('file', blob);

      const response = await fetch(`${ipfsApi}/api/v0/add?pin=true`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as { Hash: string };
      return result.Hash;
    } catch (error) {
      console.warn('IPFS upload failed, falling back to mock mode:', error);
      // Fall through to mock mode
    }
  }

  // Mock mode: create deterministic CID and store content in memory
  return uploadToMockIPFS(content);
}

/**
 * Upload content to mock IPFS store in memory
 * Generates deterministic CID based on content
 */
export async function uploadToMockIPFS(content: object): Promise<string> {
  const bytes = Buffer.from(JSON.stringify(content));
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, raw.code, hash);
  const cidString = cid.toString();

  // Store in mock IPFS so it can be fetched later
  mockIPFSStore.set(cidString, content);

  return cidString;
}
