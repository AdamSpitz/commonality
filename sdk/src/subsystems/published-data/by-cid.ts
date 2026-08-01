import { getAddress, type Address } from 'viem';
import { fetchEvents, type RawEventFromCache } from '../../utils/eventCacheClient.js';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
import { createDefaultContentResolver } from './calldata-resolver.js';
import { ContentUnavailableError, resolvePublishedContent, type ContentResolver } from './content-resolver.js';
import { publicationPointerFromEvent } from './event-cache.js';
import type { PublishedDataId } from './types.js';

/**
 * Display-layer policy for CID-first reads.
 *
 * Retraction is honored for each publication's own publisher by default (a
 * publisher's self-retraction removes only that publisher's copy). Additional
 * honored retractors — a vertical's denylist keeper, a regulator — are explicit
 * per-display-layer configuration; an honored non-publisher retractor suppresses
 * the whole CID under that policy. See
 * specs/tech/subsystems/published-data/README.md § "Honored retractors".
 */
export interface DisplayPolicy {
  /** Retractors honored beyond each publication's own publisher. Default: none. */
  honoredRetractors?: readonly Address[];
}

/**
 * Result of resolving a CID across every publisher under a display policy.
 *
 * Content is content-addressed, so `data`/`retractedData` are the same bytes for
 * every publication of the CID — `livePublishers` records which publishers keep
 * it live. Transient unavailability is NOT represented here: a failed fetch
 * throws, and the caller (the DocumentStore adapter) maps that to `unavailable`.
 */
export type CidResolution =
  | { status: 'active'; data: Uint8Array; livePublishers: Address[] }
  | { status: 'retracted'; retractedData: Uint8Array }
  | { status: 'not-published' };

export interface EventCacheCidResolverOptions {
  chainId?: number;
  limit?: number;
  /**
   * Where content bytes come from. Defaults to calldata recovery via `machinery.publicClient`.
   * Override to point reads at a different storage backend.
   */
  contentResolver?: ContentResolver;
}

/** Address occupying an indexed 32-byte topic slot (last 20 bytes). */
function topicToAddress(topic: string | null): Address {
  return getAddress(`0x${topic!.slice(-40)}`);
}

function distinctPublishers(events: readonly RawEventFromCache[]): Address[] {
  return [...new Set(events.map((event) => topicToAddress(event.topic1)))];
}

/**
 * Build a CID-first resolver over the indexer's raw event cache.
 *
 * Unlike the (publisher, cid)-keyed PublishedDataCache, this enumerates every
 * publisher of a CID (querying by dataId topic without a publisher filter) and
 * composes their live publications by OR, so callers name content by CID alone.
 */
export function createEventCacheCidResolver(
  machinery: SDKMachinery,
  options: EventCacheCidResolverOptions = {},
) {
  const chainId = options.chainId ?? machinery.defaultChainId;
  const limit = options.limit ?? 1000;
  const contractAddress = getContractAddressesForChain(machinery, chainId)?.publishedData;
  const contentResolver = options.contentResolver ?? createDefaultContentResolver(machinery, { chainId });

  function query(eventName: 'DataPublished' | 'DataRetracted', dataId: PublishedDataId) {
    return fetchEvents(machinery, {
      chainId,
      contractAddress,
      eventName,
      // Deliberately no topic1 (publisher) filter: resolve across every publisher.
      topic2: dataId.toLowerCase(),
      limit,
    });
  }

  return async function resolveByCid(
    dataId: PublishedDataId,
    policy: DisplayPolicy = {},
  ): Promise<CidResolution> {
    const [publications, retractions] = await Promise.all([
      query('DataPublished', dataId),
      query('DataRetracted', dataId),
    ]);

    if (publications.length === 0) return { status: 'not-published' };

    const retractors = new Set(distinctPublishers(retractions));

    // An honored non-publisher retractor suppresses the whole CID under this policy.
    const honoredRetraction = (policy.honoredRetractors ?? [])
      .map(getAddress)
      .some((retractor) => retractors.has(retractor));

    // Each publisher's own retraction removes only that publisher's copy (OR rule).
    const livePublishers = honoredRetraction
      ? []
      : distinctPublishers(publications).filter((publisher) => !retractors.has(publisher));

    // Status is decided purely from pointers, before any content is fetched. Only then do we go
    // and get the bytes — from the live publications when there are any, so the content comes
    // from a publisher this policy actually honors.
    const sources = livePublishers.length > 0
      ? publications.filter((event) => livePublishers.includes(topicToAddress(event.topic1)))
      : publications;

    if (!contentResolver) {
      throw new ContentUnavailableError(dataId, 'No ContentResolver is configured; PublishedData content cannot be read');
    }

    // Throws ContentUnavailableError if the bytes cannot be fetched, which the DocumentStore
    // adapter maps to `unavailable`. It must never degrade to `not-published`: that would drop
    // the statement out of aggregate counts on nothing but an infrastructure hiccup.
    const bytes = await resolvePublishedContent(
      contentResolver,
      dataId,
      sources.map((event) => publicationPointerFromEvent(event, dataId)),
    );

    return livePublishers.length > 0
      ? { status: 'active', data: bytes, livePublishers }
      : { status: 'retracted', retractedData: bytes };
  };
}
