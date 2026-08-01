import { getAddress, type Address, type Hash } from 'viem';
import { fetchEvents, padAddressAsTopic, type RawEventFromCache } from '../../utils/eventCacheClient.js';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
import { createDefaultContentResolver } from './calldata-resolver.js';
import { ContentUnavailableError, resolvePublishedContent, type ContentResolver, type PublicationPointer } from './content-resolver.js';
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

/**
 * Turn a cached `DataPublished` log into a pointer the ContentResolver can act on.
 *
 * The log itself is pure pointer — `(publisher, dataId)` topics and an empty body — so everything
 * needed to go find the bytes comes from the log's position in the chain.
 */
export function publicationPointerFromEvent(
  event: RawEventFromCache,
  dataId: PublishedDataId,
): PublicationPointer {
  return {
    publisher: getAddress(`0x${event.topic1!.slice(-40)}`),
    dataId: normalizeDataId(dataId),
    chainId: event.chainId,
    transactionHash: event.transactionHash as Hash,
    blockNumber: BigInt(event.blockNumber),
    logIndex: event.logIndex,
  };
}

export interface EventCachePublishedDataOptions {
  chainId?: number;
  limit?: number;
  /**
   * Where content bytes come from. Defaults to calldata recovery via `machinery.publicClient`.
   * Override to point reads at a different storage backend.
   */
  contentResolver?: ContentResolver;
}

/**
 * Build a PublishedDataCache backed by the indexer's raw event-cache API.
 *
 * The event cache supplies publication and retraction *facts* only; content comes from the
 * ContentResolver and is verified against `dataId`. The indexer is never asked for bytes because
 * it does not have any — see content-resolver.ts.
 *
 * The default reader semantics still honor only the publisher's own retraction; callers that want
 * vertical policy retractors should use readRetractions with explicit retractor addresses.
 */
export function createEventCachePublishedDataCache(
  machinery: SDKMachinery,
  options: EventCachePublishedDataOptions = {},
): PublishedDataCache {
  const chainId = options.chainId ?? machinery.defaultChainId;
  const limit = options.limit ?? 1000;
  const publishedDataAddress = getContractAddressesForChain(machinery, chainId)?.publishedData;
  const contentResolver = options.contentResolver ?? createDefaultContentResolver(machinery, { chainId });

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
      // Null means "no such publication". A publication whose bytes cannot be fetched throws
      // instead, so an unreachable RPC can never be mistaken for content that was never published.
      if (events.length === 0) return null;

      if (!contentResolver) {
        throw new ContentUnavailableError(dataId, 'No ContentResolver is configured; PublishedData content cannot be read');
      }

      // Most recent publication first, then older ones as fallbacks.
      const pointers = events.reverse().map((event) => publicationPointerFromEvent(event, dataId));
      return resolvePublishedContent(contentResolver, dataId, pointers);
    },
    async isPublished(publisher, dataId) {
      return (await publicationEvents(publisher, dataId)).length > 0;
    },
    async isRetracted(publisher, dataId) {
      return (await retractionEvents(publisher, dataId)).length > 0;
    },
  };
}
