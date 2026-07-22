const DAG_PB_CODE = 0x70;

/**
 * Branded string types for IPFS CIDs to prevent mixing up formats at the type level.
 */

/** CIDv1 in base32 encoding (starts with 'b', e.g. "bafybe..."). Used in SDK APIs. */
export type IpfsCidV1 = `b${string}`;

/** CID as a bytes32 hex string (e.g. "0xabcd..."). Used for on-chain storage. */
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

// Base58btc — used by CIDv0 (Qm...) parsing in normalizeCidV1
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(s: string): Uint8Array {
  const lookup: Record<string, number> = {};
  [...BASE58_ALPHABET].forEach((c, i) => { lookup[c] = i; });
  let num = 0n;
  for (const char of s) {
    if (!(char in lookup)) throw new Error(`Invalid base58 character: ${char}`);
    num = num * 58n + BigInt(lookup[char] as number);
  }
  let leadingZeros = 0;
  for (const char of s) { if (char === '1') leadingZeros++; else break; }
  const bytes: number[] = [];
  while (num > 0n) { bytes.unshift(Number(num & 0xffn)); num >>= 8n; }
  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
}

/**
 * Build a CIDv1 string from a multicodec code and a 32-byte sha2-256 digest.
 *
 * @param codec - Multicodec code (e.g. 0x70 for dag-pb, 0x55 for raw)
 * @param digest - The 32-byte sha2-256 hash digest
 * @returns CIDv1 in base32 encoding
 */
export function buildCidV1FromDigest(codec: number, digest: Uint8Array): IpfsCidV1 {
  const cidBytes = new Uint8Array([0x01, codec, 0x12, 0x20, ...digest]);
  return `b${base32Encode(cidBytes)}` as IpfsCidV1;
}

/**
 * Assert that a string is a valid CIDv1 and return it as the branded type.
 *
 * @param value - String to validate
 * @returns The value as IpfsCidV1
 * @throws Error if the value is not a valid CIDv1
 */
export function ensureIpfsCidV1(value: string): IpfsCidV1 {
  if (!isValidCidV1(value)) {
    throw new Error(`Invalid IPFS CIDv1: ${value}`);
  }
  return value;
}

/** Type guard: checks if a string looks like a bytes32 hex value (0x + 64 hex chars). */
export function isIpfsCidBytes32(value: string): value is IpfsCidBytes32 {
  return value.startsWith("0x") && value.length === 66;
}

/** Type guard: checks if a string is a valid CIDv1 (base32, version byte = 1). */
export function isValidCidV1(cid: string): cid is IpfsCidV1 {
  try {
    if (!cid.startsWith('b')) return false;
    const bytes = base32Decode(cid.slice(1));
    return bytes[0] === 1;
  } catch {
    return false;
  }
}

/**
 * Convert a CIDv1 string to a bytes32 hex string for on-chain storage.
 *
 * Extracts the 32-byte sha2-256 digest from the CID. Only works with
 * CIDv1 strings that use sha2-256 as the hash function.
 *
 * @param cid - CIDv1 string (base32, starts with 'b')
 * @returns 32-byte hex string (0x-prefixed, 66 chars total)
 * @throws Error if the CID is not CIDv1 or doesn't use sha2-256
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
 * Convert a bytes32 hex string back to a CIDv1 string.
 *
 * Wraps the 32-byte digest with CIDv1 headers (version=1, codec=dag-pb,
 * multihash=sha2-256) and encodes as base32.
 *
 * @param bytes32 - 32-byte hex string (0x-prefixed)
 * @returns CIDv1 string in base32 encoding
 */
export function bytes32ToCid(bytes32: `0x${string}`): IpfsCidV1 {
  const hex = bytes32.slice(2);
  const digest = new Uint8Array(32);
  for (let i = 0; i < 32; i++) digest[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return buildCidV1FromDigest(DAG_PB_CODE, digest);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize any CID format to CIDv1 base32.
 *
 * Accepts:
 * - CIDv1 base32 (starts with 'b') — returned as-is
 * - Bytes32 hex (starts with '0x', 66 chars) — converted via bytes32ToCid
 * - CIDv0 base58btc (starts with 'Qm') — converted to CIDv1 with dag-pb codec
 *
 * @param s - CID in any supported format
 * @returns CIDv1 in base32 encoding
 * @throws Error if the format is unrecognized or invalid
 */
export function normalizeCidV1(s: string): IpfsCidV1 {
  if (s.startsWith('0x') && s.length === 66) {
    return bytes32ToCid(s as `0x${string}`);
  }
  try {
    if (s.startsWith('b')) {
      if (!isValidCidV1(s)) throw new Error('Invalid CIDv1');
      return s as IpfsCidV1;
    } else if (s.startsWith('Qm')) {
      // CIDv0 base58btc — decode multihash and wrap in CIDv1 with dag-pb codec
      const multihash = base58Decode(s);
      const cidBytes = new Uint8Array([0x01, DAG_PB_CODE, ...multihash]);
      return `b${base32Encode(cidBytes)}` as IpfsCidV1;
    } else {
      throw new Error('Unrecognized CID format');
    }
  } catch {
    throw new Error(`Invalid statement ID format: ${s}`);
  }
}

/**
 * Normalize a CID reference that may be stored as a bare CID or an IPFS URI.
 *
 * Contract metadata events and ERC-1155 URI fields commonly use values such as
 * `ipfs://<cid>/` while document readers expect the bare CID. Query/fold code
 * should run user- or event-provided metadata references through this helper
 * before exposing them to display metadata readers.
 */
export function normalizeIpfsMetadataReference(reference: string): IpfsCidV1 {
  const trimmed = reference.trim();
  const cidCandidate = trimmed.startsWith('ipfs://')
    ? trimmed.slice('ipfs://'.length).split(/[/?#]/, 1)[0]
    : trimmed;
  return normalizeCidV1(cidCandidate);
}
