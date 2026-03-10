const DAG_PB_CODE = 0x70;

/**
 * Different types for IPFS CIDs to prevent mixing up formats.
 *
 * - IpfsCidV1: CIDv1 string format (e.g., "bafybe...")
 * - IpfsCidBytes32: bytes32 hex format for onchain storage (e.g., "0xabcd...")
 */

export type IpfsCidV1 = `b${string}`;
export type IpfsCidBytes32 = `0x${string}`;

// Base32 (lowercase RFC 4648, no padding) — multibase prefix 'b' used by CIDv1
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32Decode(s: string): Uint8Array {
  const lookup: Record<string, number> = {};
  [...BASE32_ALPHABET].forEach((c, i) => { lookup[c] = i; });
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of s) {
    if (!(char in lookup)) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | (lookup[char] as number);
    bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(output);
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function isIpfsCidBytes32(value: string): value is IpfsCidBytes32 {
  return value.startsWith("0x") && value.length === 66;
}

export function isValidCidV1(cid: string): cid is IpfsCidV1 {
  try {
    if (!cid.startsWith('b')) return false;
    const bytes = base32Decode(cid.slice(1));
    return bytes[0] === 1;
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
  if (!cid.startsWith('b')) throw new Error(`Expected CIDv1 (base32, starts with 'b'), got: ${cid}`);
  const cidBytes = base32Decode(cid.slice(1));
  // CID bytes: [version=1, codec, 0x12 (sha2-256), 0x20 (32 bytes), ...digest]
  if (cidBytes[0] !== 1) throw new Error('Not a CIDv1');
  if (cidBytes[2] !== 0x12 || cidBytes[3] !== 0x20) throw new Error('Expected sha2-256 multihash');
  const digest = cidBytes.slice(4, 36);
  if (digest.length !== 32) throw new Error('CID digest must be 32 bytes for bytes32 conversion');
  return `0x${Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

/**
 * Convert bytes32 to IPFS CID
 */
export function bytes32ToCid(bytes32: `0x${string}`): IpfsCidV1 {
  const hex = bytes32.slice(2);
  const digest = new Uint8Array(32);
  for (let i = 0; i < 32; i++) digest[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  // CIDv1 bytes: [version=1, dag-pb codec, sha2-256 code, 32-byte length, ...digest]
  const cidBytes = new Uint8Array([0x01, DAG_PB_CODE, 0x12, 0x20, ...digest]);
  return `b${base32Encode(cidBytes)}` as IpfsCidV1;
}
