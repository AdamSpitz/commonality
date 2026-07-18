import { decodeEventLog, getAddress, type Address } from 'viem';
import { PublishedDataAbi } from '../../../abis/PublishedDataAbi.js';
import { fetchEvents, padAddressAsTopic, type RawEventFromCache } from '../../utils/eventCacheClient.js';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
import type { PublishedDataCache, PublishedDataId } from './types.js';

function normalizeDataId(dataId: PublishedDataId): PublishedDataId {
  return dataId.toLowerCase() as PublishedDataId;
}

function dataIdAsTopic(dataId: PublishedDataId): `0x${string}` {
  return normalizeDataId(dataId) as `0x${string}`;
}

function orderEvents(a: RawEventFromCache, b: RawEventFromCache): number {
  const blockDelta = BigInt(a.blockNumber) - BigInt(b.blockNumber);
  if (blockDelta !== 0n) return blockDelta < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

function decodePublishedContent(event: RawEventFromCache): Uint8Array | null {
  try {
    const decoded = decodeEventLog({
      abi: PublishedDataAbi,
      eventName: 'DataPublished',
      data: event.data as `0x${string}`,
      topics: [
        event.topic0 as `0x${string}`,
        event.topic1 as `0x${string}`,
        event.topic2 as `0x${string}`,
      ],
    }) as { args: { content: `0x${string}` } };

    const hex = decoded.args.content.slice(2);
    return Uint8Array.from(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
  } catch {
    return null;
  }
}

export interface EventCachePublishedDataOptions {
  chainId?: number;
  limit?: number;
}

/**
 * Build a PublishedDataCache backed by the indexer's raw event-cache API.
 *
 * The default reader semantics still honor only the publisher's own retraction;
 * callers that want vertical policy retractors should use readRetractions with
 * explicit retractor addresses.
 */
export function createEventCachePublishedDataCache(
  machinery: SDKMachinery,
  options: EventCachePublishedDataOptions = {},
): PublishedDataCache {
  const chainId = options.chainId ?? machinery.defaultChainId;
  const limit = options.limit ?? 1000;
  const publishedDataAddress = getContractAddressesForChain(machinery, chainId)?.publishedData;

  async function publicationEvents(publisher: Address, dataId: PublishedDataId): Promise<RawEventFromCache[]> {
    return fetchEvents(machinery, {
      chainId,
      contractAddress: publishedDataAddress,
      eventName: 'DataPublished',
      topic1: padAddressAsTopic(getAddress(publisher)),
      topic2: dataIdAsTopic(dataId),
      limit,
    });
  }

  async function retractionEvents(retractor: Address, dataId: PublishedDataId): Promise<RawEventFromCache[]> {
    return fetchEvents(machinery, {
      chainId,
      contractAddress: publishedDataAddress,
      eventName: 'DataRetracted',
      topic1: padAddressAsTopic(getAddress(retractor)),
      topic2: dataIdAsTopic(dataId),
      limit,
    });
  }

  return {
    async getPublishedData(publisher, dataId) {
      const events = (await publicationEvents(publisher, dataId)).sort(orderEvents);
      const latest = events.at(-1);
      return latest ? decodePublishedContent(latest) : null;
    },
    async isPublished(publisher, dataId) {
      return (await publicationEvents(publisher, dataId)).length > 0;
    },
    async isRetracted(publisher, dataId) {
      return (await retractionEvents(publisher, dataId)).length > 0;
    },
  };
}
