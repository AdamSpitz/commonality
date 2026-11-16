import {
  type Address,
  type Hex,
  bytesToHex,
  encodePacked,
  getAddress,
  hexToBytes,
  isAddress,
  keccak256,
  zeroAddress,
} from 'viem';

export const CLAIM_TICKET_CODE_PREFIX = 'ct1:';
const VERSION = 1;
const CHECKSUM_BYTES = 4;

export interface ClaimTicketCode {
  version: number;
  chainId: bigint;
  project: Address;
  transitKey: Hex;
}

export function encodeClaimTicketCode(input: {
  chainId: bigint;
  project: Address;
  transitKey: Hex;
}): string {
  if (input.chainId <= 0n || input.chainId > 0xffffffffffffffffn) {
    throw new Error('Claim ticket chain id does not fit the code.');
  }
  const body = encodePacked(
    ['uint8', 'uint64', 'address', 'bytes32'],
    [VERSION, input.chainId, getAddress(input.project), input.transitKey],
  );
  const checksum = hexToBytes(keccak256(body)).slice(0, CHECKSUM_BYTES);
  return CLAIM_TICKET_CODE_PREFIX + bytesToBase64Url(new Uint8Array([...hexToBytes(body), ...checksum]));
}

export function decodeClaimTicketCode(code: string): ClaimTicketCode {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CLAIM_TICKET_CODE_PREFIX)) {
    throw new Error('Claim codes start with ct1:. This is not a wallet seed.');
  }
  const bytes = base64UrlToBytes(trimmed.slice(CLAIM_TICKET_CODE_PREFIX.length));
  if (bytes.length !== 1 + 8 + 20 + 32 + CHECKSUM_BYTES) {
    throw new Error('This claim code is the wrong length.');
  }
  const body = bytes.slice(0, bytes.length - CHECKSUM_BYTES);
  const checksum = bytes.slice(bytes.length - CHECKSUM_BYTES);
  const expected = hexToBytes(keccak256(bytesToHex(body))).slice(0, CHECKSUM_BYTES);
  if (!bytesEqual(checksum, expected)) {
    throw new Error('This claim code has a transcription error.');
  }
  const version = body[0]!;
  if (version !== VERSION) throw new Error('This claim code version is not supported.');
  const chainId = bytesToBigInt(body.slice(1, 9));
  const project = getAddress(bytesToHex(body.slice(9, 29)));
  const transitKey = bytesToHex(body.slice(29, 61));
  if (!isAddress(project) || project === zeroAddress) throw new Error('This claim code has no project.');
  return { version, chainId, project, transitKey };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return bytes.reduce((value, byte) => (value << 8n) + BigInt(byte), 0n);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
