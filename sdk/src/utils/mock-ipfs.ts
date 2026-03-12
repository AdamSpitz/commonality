import { Buffer } from 'buffer';
import { IpfsCidV1, normalizeCidV1, buildCidV1FromDigest } from './cid-types';

const RAW_CODEC = 0x55;

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
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const digest = new Uint8Array(hashBuffer);
  const cid = buildCidV1FromDigest(RAW_CODEC, digest);
  const cidString = normalizeCidV1(cid);
  mockIPFSStore.set(cidString, content);
  return cidString;
}

/**
 * Upload a blob to mock IPFS store in memory
 * Generates deterministic CID based on blob content
 */
export async function uploadBlobToMockIPFS(blob: Blob): Promise<IpfsCidV1> {
  const bytes = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const digest = new Uint8Array(hashBuffer);
  const cid = buildCidV1FromDigest(RAW_CODEC, digest);
  return normalizeCidV1(cid);
}
