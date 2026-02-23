import { CID } from "multiformats";
import { sha256 } from 'multiformats/hashes/sha2';

const DAG_PB_CODE = 0x70;

/**
 * Different types for IPFS CIDs to prevent mixing up formats.
 *
 * - IpfsCidV1: CIDv1 string format (e.g., "bafybe...")
 * - IpfsCidBytes32: bytes32 hex format for onchain storage (e.g., "0xabcd...")
 */

export type IpfsCidV1 = `b${string}`;
export type IpfsCidBytes32 = `0x${string}`;

export function isIpfsCidV1(value: string): value is IpfsCidV1 {
  return value.startsWith("bafy") || value.startsWith("Qm");
}

export function ensureIpfsCidV1(value: string): IpfsCidV1 {
  if (!isIpfsCidV1(value)) {
    throw new Error(`Invalid IPFS CIDv1: ${value}`);
  }
  return value;
}

export function isIpfsCidBytes32(value: string): value is IpfsCidBytes32 {
  return value.startsWith("0x") && value.length === 66;
}

export function isValidCidV1(cid: string): boolean {
  return /^baf[a-zA-Z0-9]{59}$/.test(cid);
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
 * Convert bytes32 to IPFS CID
 */
export function bytes32ToCid(bytes32: `0x${string}`): IpfsCidV1 {
  const digestBytes = Buffer.from(bytes32.slice(2), 'hex');
  // Create a MultihashDigest directly from the bytes
  const hash = {
    code: sha256.code,
    digest: digestBytes,
    size: digestBytes.length,
    bytes: new Uint8Array([0x12, 0x20, ...digestBytes]) // 0x12 = sha256 code, 0x20 = 32 bytes
  };
  const cid = CID.create(1, DAG_PB_CODE, hash);
  if (!isValidCidV1(cid.toString())) {
    throw new Error(`Invalid CID generated from bytes32: ${cid.toString()}`);
  }
  return cid.toString() as IpfsCidV1;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a statement ID from hex format (0x...) to CIDv1 format (bafy...)
 * for indexer queries. If already in CIDv1 format, returns as-is.
 */
export function normalizeCidV1(statementId: string): IpfsCidV1 {
  if (statementId.startsWith('0x') && statementId.length === 66) {
    return bytes32ToCid(statementId as `0x${string}`);
  } else if (isValidCidV1(statementId)) {
    return statementId as IpfsCidV1;
  } else {
    throw new Error(`Invalid statement ID format: ${statementId}`);
  }
}
