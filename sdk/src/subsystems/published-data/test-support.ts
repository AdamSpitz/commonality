/**
 * Shared fixtures for PublishedData tests.
 *
 * Since the pointer-only change, no test can get content out of an event any more: publication
 * logs are pointers, and bytes come from a ContentResolver. These helpers build both halves.
 */

import { encodeEventTopics, sha256, toHex, type Address } from 'viem';
import { PublishedDataAbi } from '../../../abis/PublishedDataAbi.js';
import type { ContentResolver, PublicationPointer } from './content-resolver.js';
import type { PublishedDataId } from './types.js';

/** The dataId rule the contract uses: sha2-256 over the raw content bytes. */
export function dataIdOf(content: Uint8Array): PublishedDataId {
  return sha256(toHex(content)) as PublishedDataId;
}

export interface RawEventOptions {
  publisher: Address;
  dataId: PublishedDataId;
  contractAddress: Address;
  logIndex?: number;
  blockNumber?: string;
  transactionHash?: string;
  chainId?: number;
}

/**
 * Build a raw cached log for PublishedData.
 *
 * Both `DataPublished` parameters are indexed, so `data` is always `'0x'` — there is deliberately
 * no way to smuggle content in through this helper.
 */
export function makeRawEvent(
  eventName: 'DataPublished' | 'DataRetracted',
  options: RawEventOptions,
) {
  const { publisher, dataId, contractAddress } = options;
  const logIndex = options.logIndex ?? 0;
  const topics = encodeEventTopics({ abi: PublishedDataAbi, eventName, args: { publisher, dataId } });

  return {
    id: `${eventName}-${logIndex}`,
    chainId: options.chainId ?? 31337,
    contractAddress,
    eventName,
    blockNumber: options.blockNumber ?? '1',
    blockTimestamp: '2',
    transactionHash: options.transactionHash ?? `0x${String(logIndex + 1).padStart(64, '0')}`,
    logIndex,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: topics[3] ?? null,
    data: '0x',
  };
}

/**
 * A ContentResolver backed by an in-memory map, standing in for calldata recovery.
 *
 * Keyed by dataId alone, because content addressing means the bytes for a dataId are the same
 * whichever publication pointer you arrive through.
 */
export function fakeContentResolver(
  contents: Iterable<Uint8Array>,
  options: { onResolve?: (pointer: PublicationPointer) => void } = {},
): ContentResolver {
  const byDataId = new Map<string, Uint8Array>();
  for (const content of contents) byDataId.set(dataIdOf(content).toLowerCase(), content);

  return {
    async resolve(pointer) {
      options.onResolve?.(pointer);
      return byDataId.get(pointer.dataId.toLowerCase()) ?? null;
    },
  };
}

/** A ContentResolver that always fails, for exercising the `unavailable` path. */
export function failingContentResolver(message = 'RPC unreachable'): ContentResolver {
  return {
    async resolve() {
      throw new Error(message);
    },
  };
}
