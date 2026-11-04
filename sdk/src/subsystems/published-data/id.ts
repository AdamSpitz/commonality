import { sha256, type Hex } from 'viem';
import { bytes32ToCid, RAW_CID_CODEC, cidToBytes32, type IpfsCidV1 } from '../../utils/cid-types.js';
import type { PublishedDataId } from './types.js';

/** CIDv1 multicodec for raw binary payloads. */
export const PUBLISHED_DATA_CID_CODEC = RAW_CID_CODEC;

export type PublishedDataCid = IpfsCidV1;

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
  return bytes32ToCid(dataId);
}

/** Extract the `bytes32` sha2-256 digest from a PublishedData CID. */
export function publishedDataCidToId(cid: PublishedDataCid | string): PublishedDataId {
  return cidToBytes32(cid) as PublishedDataId;
}
