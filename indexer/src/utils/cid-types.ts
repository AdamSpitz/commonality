import { CID } from "multiformats";

/**
 * Different types for IPFS CIDs to prevent mixing up formats.
 *
 * - IpfsCidV1: CIDv1 string format (e.g., "bafybe...")
 * - IpfsCidBytes32: bytes32 hex format for onchain storage (e.g., "0xabcd...")
 */

export type IpfsCidV1 = `b${string}`;
export type IpfsCidBytes32 = `0x${string}`;

export function ensureIpfsCidV1(value: string): IpfsCidV1 {
  if (!isValidCidV1(value)) {
    throw new Error(`Invalid IPFS CIDv1: ${value}`);
  }
  return value;
}

export function isIpfsCidBytes32(value: string): value is IpfsCidBytes32 {
  return value.startsWith("0x") && value.length === 66;
}

export function isValidCidV1(cid: string): cid is IpfsCidV1 {
  try {
    return CID.parse(cid).version === 1;
  } catch {
    return false;
  }
}
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
 * Convert a bytes32 hex string to an IPFS CID string
 * Assumes CIDv1 with SHA-256 hash (32 bytes = 256 bits)
 */
export function bytes32ToCid(bytes32: IpfsCidBytes32): IpfsCidV1 {
  // Remove 0x prefix and convert to bytes
  const digestHex = bytes32.slice(2);
  const digestBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    digestBytes[i] = parseInt(digestHex.slice(i * 2, i * 2 + 2), 16);
  }

  // Create CIDv1 with:
  // - version: 1
  // - codec: 0x55 (raw) or 0x70 (dag-pb) - using dag-pb for JSON
  // - hash function: 0x12 (sha2-256)
  // - hash length: 0x20 (32 bytes)
  const multihash = new Uint8Array(34);
  multihash[0] = 0x12; // sha2-256
  multihash[1] = 0x20; // 32 bytes
  multihash.set(digestBytes, 2);

  // Create CID - using dag-pb codec (0x70) for JSON content
  const cid = CID.createV1(0x70, { code: 0x12, size: 32, digest: multihash.slice(2), bytes: multihash });
  return ensureIpfsCidV1(cid.toString());
}
