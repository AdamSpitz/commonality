import { createHash } from 'crypto';
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

export function ensureIpfsCidV1(value: string): IpfsCidV1 {
  if (!isValidCidV1(value)) {
    throw new Error(`Invalid IPFS CIDv1: ${value}`);
  }
  return value;
}

export function fakeIpfsCidV1(meaninglessValue: string): IpfsCidV1 {
  // TODO: remove all callers of this function.
  const digestHex = createHash('sha256').update(meaninglessValue).digest('hex');
  return bytes32ToCid(`0x${digestHex}`);
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
 * Convert bytes32 to IPFS CID
 */
export function bytes32ToCid(bytes32: `0x${string}`): IpfsCidV1 {
  const digestBytes = Buffer.from(bytes32.slice(2), 'hex');
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a statement ID from hex format (0x...) or CIDv0 format (Qm...) to CIDv1 format (bafy...)
 * for indexer queries. If already in CIDv1 format, returns as-is.
 */
export function normalizeCidV1(s: string): IpfsCidV1 {
  if (s.startsWith('0x') && s.length === 66) {
    return bytes32ToCid(s as `0x${string}`);
  } else {
    try {
      const cid = CID.parse(s);
      if (cid.version === 1) {
        return s as IpfsCidV1;
      } else if (cid.version === 0) {
        // Convert CIDv0 to CIDv1
        const cidV1 = CID.createV1(cid.code, cid.multihash);
        return cidV1.toString() as IpfsCidV1;
      }
    } catch {
      throw new Error(`Invalid statement ID format: ${s}`);
    }
  }
}
