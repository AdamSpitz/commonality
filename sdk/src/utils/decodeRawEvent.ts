import { decodeEventLog } from 'viem';
import type { RawEventFromCache } from './eventCacheClient.js';

/**
 * Decode non-indexed + indexed args for a raw event-cache log against a
 * specific contract ABI. Callers pick the ABI; we do not scan by event name
 * (two contracts can share a name with different signatures).
 */
export function decodeRawEventArgs(
  rawEvent: RawEventFromCache,
  abi: readonly unknown[],
): Record<string, unknown> | null {
  try {
    const decoded = decodeEventLog({
      abi,
      data: rawEvent.data as `0x${string}`,
      topics: [
        rawEvent.topic0 as `0x${string}` | undefined,
        rawEvent.topic1 as `0x${string}` | undefined,
        rawEvent.topic2 as `0x${string}` | undefined,
        rawEvent.topic3 as `0x${string}` | undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ].filter((t): t is `0x${string}` => !!t) as unknown as any,
    }) as { args: Record<string, unknown> };
    return decoded.args;
  } catch (e) {
    console.warn(`Failed to decode event ${rawEvent.eventName}:`, e);
    return null;
  }
}

export function decodedLogMeta(rawEvent: RawEventFromCache) {
  return {
    contractAddress: rawEvent.contractAddress as `0x${string}`,
    blockNumber: BigInt(rawEvent.blockNumber),
    blockTimestamp: BigInt(rawEvent.blockTimestamp),
    transactionHash: rawEvent.transactionHash as `0x${string}`,
    logIndex: rawEvent.logIndex,
  };
}
