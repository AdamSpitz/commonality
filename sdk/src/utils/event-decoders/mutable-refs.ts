import { MutableRefUpdaterAbi } from '../../abis.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export function decodeMutableRefEvent(rawEvent: RawEventFromCache): {
  owner: `0x${string}`;
  refName: string;
  currentRefValue: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
} | null {
  if (rawEvent.eventName !== 'RefUpdated') return null;
  const args = decodeRawEventArgs(rawEvent, MutableRefUpdaterAbi);
  if (!args) return null;
  return {
    owner: args.owner as `0x${string}`,
    refName: args.name as string,
    currentRefValue: args.currentRefValue as string,
    ...decodedLogMeta(rawEvent),
  };
}
