/**
 * Common utilities for user actions
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  toBytes,
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
import { ensureIpfsCidV1, fakeIpfsCidV1, IpfsCidV1 } from '../cid-types';

// Safe environment variable access that works in both Node.js and browser
function getEnvVar(name: string): string | undefined {
  // Try Node.js process.env
  const proc = (globalThis as any).process;
  if (proc?.env?.[name]) {
    return proc.env[name];
  }
  // Try Vite's import.meta.env (available in browser builds)
  // In Node.js ESM, import.meta exists but import.meta.env is undefined
  const metaEnv = (import.meta as any).env;
  if (metaEnv?.[name]) {
    return metaEnv[name];
  }
  return undefined;
}

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
// Well-Known Topic Constants
// ============================================================================

/**
 * Well-known topic ID for project alignment attestations.
 * This is a deterministic bytes32 value: keccak256("project-alignment-attestations")
 *
 * TODO: Replace this with an actual IPFS CID of a statement that says
 * "This is the topic for project alignment attestations". This would allow
 * the topic itself to be fetched and displayed in UIs.
 */
export const PROJECT_ALIGNMENT_TOPIC: IpfsCidV1 = fakeIpfsCidV1('ProjectAlignmentTopic');

// ============================================================================
// IPFS Helpers
// ============================================================================

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
  const ipfsGateway = getEnvVar('IPFS_GATEWAY') || getEnvVar('VITE_IPFS_GATEWAY');

  if (ipfsGateway) {
    // Fetch from real IPFS gateway
    try {
      const url = `${ipfsGateway}/${cid}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        // Prevent following redirects to subdomain gateway format
        // which can cause DNS issues in test environments (*.ipfs.localhost)
        redirect: 'manual',
      });

      // Handle redirects manually - skip localhost subdomain redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        // Skip redirects to *.ipfs.localhost or *.ipns.localhost (subdomain gateway format)
        // These don't resolve properly in most test environments
        if (location && (location.includes('.ipfs.localhost') || location.includes('.ipns.localhost'))) {
          console.warn(`Skipping IPFS subdomain redirect for ${cid} - subdomain gateways not supported in this environment`);
          return null;
        }
        // Follow other redirects
        if (location) {
          const redirectResponse = await fetch(location, {
            signal: AbortSignal.timeout(timeoutMs),
            redirect: 'follow',
          });
          if (!redirectResponse.ok) {
            console.warn(`Failed to fetch IPFS content for ${cid}: ${redirectResponse.status}`);
            return null;
          }
          const content = await redirectResponse.json() as object;
          return content;
        }
      }

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
export async function uploadToIPFS(content: object): Promise<IpfsCidV1> {
  const ipfsApi = getEnvVar('IPFS_API') || getEnvVar('VITE_IPFS_API');

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
      return ensureIpfsCidV1(result.Hash);
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
export async function uploadToMockIPFS(content: object): Promise<IpfsCidV1> {
  const bytes = Buffer.from(JSON.stringify(content));
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, raw.code, hash);
  const cidString = ensureIpfsCidV1(cid.toString());
  // Store in mock IPFS so it can be fetched later
  mockIPFSStore.set(cidString, content);
  return cidString;
}
