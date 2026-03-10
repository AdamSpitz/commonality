// CID encoding/decoding for the ENS update script.
// Handles CIDv0 (Qm...) and CIDv1 (b...) without external dependencies.

// Base32 (lowercase RFC 4648, no padding) — multibase prefix 'b' used by CIDv1
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32Decode(s) {
  const lookup = {};
  [...BASE32_ALPHABET].forEach((c, i) => { lookup[c] = i; });
  let bits = 0, value = 0;
  const output = [];
  for (const char of s) {
    if (!(char in lookup)) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | lookup[char];
    bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(output);
}

// Base58btc — used by CIDv0 (Qm...) strings
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(s) {
  const lookup = {};
  [...BASE58_ALPHABET].forEach((c, i) => { lookup[c] = i; });
  let num = 0n;
  for (const char of s) {
    if (!(char in lookup)) throw new Error(`Invalid base58 character: ${char}`);
    num = num * 58n + BigInt(lookup[char]);
  }
  let leadingZeros = 0;
  for (const char of s) { if (char === '1') leadingZeros++; else break; }
  const bytes = [];
  while (num > 0n) { bytes.unshift(Number(num & 0xffn)); num >>= 8n; }
  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
}

const DAG_PB_CODE = 0x70;

/**
 * Parse any IPFS CID (v0 or v1) and return the binary bytes of the equivalent CIDv1.
 * Used to encode the ENS contenthash per EIP-1577.
 */
export function parseCidToV1Bytes(cid) {
  if (cid.startsWith('b')) {
    // CIDv1 base32 — decode directly
    return base32Decode(cid.slice(1));
  } else if (cid.startsWith('Qm')) {
    // CIDv0 base58btc — decode multihash and prepend CIDv1 header
    const multihash = base58Decode(cid);
    return new Uint8Array([0x01, DAG_PB_CODE, ...multihash]);
  } else {
    throw new Error(`Unsupported CID format: ${cid}`);
  }
}
