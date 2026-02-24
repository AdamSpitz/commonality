import { CID } from "multiformats";

const DAG_PB_CODE = 0x70;

/**
 * Different types for IPFS CIDs to prevent mixing up formats.
 *
 * - IpfsCidV1: CIDv1 string format (e.g., "bafybe...")
 * - IpfsCidBytes32: bytes32 hex format for onchain storage (e.g., "0xabcd...")
 */

export type IpfsCidV1 = `b${string}`;
export type IpfsCidBytes32 = `0x${string}`;

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

export function ensureIpfsCidV1(value: string): IpfsCidV1 {
  if (!isValidCidV1(value)) {
    throw new Error(`Invalid IPFS CIDv1: ${value}`);
  }
  return value;
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

  const hex = Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}` as `0x${string}`;
}

/**
 * Convert bytes32 to IPFS CID
 */
export function bytes32ToCid(bytes32: `0x${string}`): IpfsCidV1 {
  const hexString = bytes32.slice(2);
  const digestBytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    digestBytes[i / 2] = parseInt(hexString.slice(i, i + 2), 16);
  }
  // Create a MultihashDigest directly from the bytes
  const hash = {
    code: 0x12, // sha2-256
    digest: digestBytes,
    size: digestBytes.length,
    bytes: new Uint8Array([0x12, 0x20, ...digestBytes]) // 0x12 = sha256 code, 0x20 = 32 bytes
  };
  const cid = CID.create(1, DAG_PB_CODE, hash);
  return ensureIpfsCidV1(cid.toString());
}
