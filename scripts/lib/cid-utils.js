// CID encoding/decoding for the ENS update script.
// Handles CIDv0 (Qm...), CIDv1 base32 (b...), and CIDv1 base36 (k...) without
// external dependencies.

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

// Base36 (lowercase) — multibase prefix 'k', used by CIDv1 IPNS names like k51...
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function base36Decode(s) {
  const lookup = {};
  [...BASE36_ALPHABET].forEach((c, i) => { lookup[c] = i; });
  let num = 0n;
  for (const char of s) {
    if (!(char in lookup)) throw new Error(`Invalid base36 character: ${char}`);
    num = num * 36n + BigInt(lookup[char]);
  }
  let leadingZeros = 0;
  for (const char of s) { if (char === '0') leadingZeros++; else break; }
  const bytes = [];
  while (num > 0n) { bytes.unshift(Number(num & 0xffn)); num >>= 8n; }
  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
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
const LIBP2P_KEY_CODE = 0x72;

/**
 * Parse any IPFS CID (v0 or v1) and return the binary bytes of the equivalent CIDv1.
 * Used to encode the ENS contenthash IPFS namespace (0xe3) per EIP-1577.
 */
export function parseCidToV1Bytes(cid) {
  if (cid.startsWith('b')) {
    return base32Decode(cid.slice(1));
  } else if (cid.startsWith('Qm')) {
    const multihash = base58Decode(cid);
    return new Uint8Array([0x01, DAG_PB_CODE, ...multihash]);
  } else {
    throw new Error(`Unsupported IPFS CID format: ${cid}`);
  }
}

/**
 * Parse an IPNS name (a CIDv1 with libp2p-key codec, typically base36-encoded
 * starting with 'k') and return the binary CIDv1 bytes. Used to encode the
 * ENS contenthash IPNS namespace (0xe5) per EIP-1577.
 */
export function parseIpnsNameToBytes(name) {
  let bytes;
  if (name.startsWith('k')) {
    bytes = base36Decode(name.slice(1));
  } else if (name.startsWith('b')) {
    bytes = base32Decode(name.slice(1));
  } else {
    throw new Error(`Unsupported IPNS name format: ${name} (expected base36 'k...' or base32 'b...')`);
  }
  if (bytes[0] !== 0x01 || bytes[1] !== LIBP2P_KEY_CODE) {
    throw new Error(
      `IPNS name does not decode to a libp2p-key CIDv1 (expected codec 0x72, got 0x${bytes[1]?.toString(16)})`
    );
  }
  return bytes;
}
