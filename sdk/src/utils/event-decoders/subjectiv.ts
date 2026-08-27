import { TrustRegistryAbi } from '../../abis.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export function decodeTrustSetEvent(rawEvent: RawEventFromCache): {
  truster: `0x${string}`;
  trustee: `0x${string}`;
  score: number;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'TrustSet') return null;
  const args = decodeRawEventArgs(rawEvent, TrustRegistryAbi);
  if (!args) return null;
  return {
    truster: args.truster as `0x${string}`,
    trustee: args.trustee as `0x${string}`,
    score: Number(args.score),
    ...decodedLogMeta(rawEvent),
  };
}
