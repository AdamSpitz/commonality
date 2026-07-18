import { sha256, type Hex } from 'viem';
import { buildCidV1FromDigest, cidToBytes32, type IpfsCidV1 } from '../../utils/cid-types.js';
import type { PublishedDataId } from './types.js';

/** CIDv1 multicodec for raw binary payloads. */
export const PUBLISHED_DATA_CID_CODEC = 0x55;

export type PublishedDataCid = IpfsCidV1;

function bytes32HexToBytes(value: Hex): Uint8Array {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`Expected bytes32 hex value, got: ${value}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(value.slice(2 + i * 2, 4 + i * 2), 16);
  }
  return bytes;
}

/**
 * Compute the on-chain PublishedData identifier for content.
 *
 * The contract uses the same rule: `dataId = sha256(content)`.
 */
export function computePublishedDataId(content: Uint8Array | Hex): PublishedDataId {
  return sha256(content) as PublishedDataId;
}

/**
 * Convert an on-chain PublishedData `bytes32` id into the canonical user-facing CID.
 *
 * PublishedData pins CIDs to CIDv1/base32 + raw multicodec + sha2-256 multihash.
 */
export function publishedDataIdToCid(dataId: PublishedDataId): PublishedDataCid {
  return buildCidV1FromDigest(PUBLISHED_DATA_CID_CODEC, bytes32HexToBytes(dataId));
}

/** Extract the `bytes32` sha2-256 digest from a PublishedData CID. */
export function publishedDataCidToId(cid: PublishedDataCid | string): PublishedDataId {
  return cidToBytes32(cid) as PublishedDataId;
}
