import { NudgePublicationsAbi } from '../../abis.js';
import { bytes32ToCid } from '../cid-types.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export interface DecodedNudgesPublishedEvent {
  chainId?: number;
  nudger: `0x${string}`;
  publicationCid: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export function decodeNudgesPublishedEvent(
  rawEvent: RawEventFromCache,
): DecodedNudgesPublishedEvent | null {
  if (rawEvent.eventName !== 'NudgesPublished') return null;
  const args = decodeRawEventArgs(rawEvent, NudgePublicationsAbi);
  if (!args) return null;
  return {
    chainId: rawEvent.chainId,
    nudger: args.nudger as `0x${string}`,
    publicationCid: bytes32ToCid(args.batchCid as `0x${string}`),
    ...decodedLogMeta(rawEvent),
  };
}
