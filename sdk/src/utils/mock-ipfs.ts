import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';
import { Buffer } from 'buffer';
import { IpfsCidV1, normalizeCidV1 } from './cid-types';


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
 * Clear the mock IPFS store
 * Useful for cleaning up between tests
 */
export function clearMockIPFS(): void {
  mockIPFSStore.clear();
}

/**
 * Upload content to mock IPFS store in memory
 * Generates deterministic CID based on content
 */
export async function uploadToMockIPFS(content: object): Promise<IpfsCidV1> {
  const bytes = Buffer.from(JSON.stringify(content));
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, raw.code, hash);
  const cidString = normalizeCidV1(cid.toString());
  // Store in mock IPFS so it can be fetched later
  mockIPFSStore.set(cidString, content);
  return cidString;
}
