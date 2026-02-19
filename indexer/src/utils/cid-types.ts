/**
 * Branded types for IPFS CIDs to prevent mixing up formats.
 *
 * - IpfsCidV1: CIDv1 string format (e.g., "bafybe...")
 * - IpfsCidBytes32: bytes32 hex format for onchain storage (e.g., "0xabcd...")
 */

export type IpfsCidV1 = string & { readonly __brand: unique symbol };
export type IpfsCidBytes32 = `0x${string}` & { readonly __brand: unique symbol };

export function isIpfsCidV1(value: string): value is IpfsCidV1 {
  return value.startsWith("bafy") || value.startsWith("Qm");
}

export function isIpfsCidBytes32(value: string): value is IpfsCidBytes32 {
  return value.startsWith("0x") && value.length === 66;
}

export function isValidCidV1(cid: string): boolean {
  return /^Qm[a-zA-Z0-9]{44}$/.test(cid) || /^baf[a-zA-Z0-9]{59}$/.test(cid);
}
