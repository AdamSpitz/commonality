import { AccountAssertionsAbi } from '../../abis.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export interface DecodedAccountAssertionSetEvent {
  chainId?: number;
  user: `0x${string}`;
  asserted: boolean;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

/**
 * Decode an `AccountAssertionSet` event from the event cache.
 *
 * Emitted by `AccountAssertions.sol` when an account asserts (or revokes) that
 * this is its one Commonality account — the tier-0/1 proof-of-personhood
 * self-declaration. `asserted` is true for an assertion, false for a revocation.
 */
export function decodeAccountAssertionSetEvent(
  rawEvent: RawEventFromCache,
): DecodedAccountAssertionSetEvent | null {
  if (rawEvent.eventName !== 'AccountAssertionSet') return null;
  const args = decodeRawEventArgs(rawEvent, AccountAssertionsAbi);
  if (!args) return null;
  return {
    chainId: rawEvent.chainId,
    user: args.user as `0x${string}`,
    asserted: Boolean(args.asserted),
    ...decodedLogMeta(rawEvent),
  };
}
