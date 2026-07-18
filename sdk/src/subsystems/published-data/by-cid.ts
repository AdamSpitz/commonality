import { getAddress, type Address } from 'viem';
import { fetchEvents, type RawEventFromCache } from '../../utils/eventCacheClient.js';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
import { decodePublishedContent } from './event-cache.js';
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
}

/** Address occupying an indexed 32-byte topic slot (last 20 bytes). */
function topicToAddress(topic: string | null): Address {
  return getAddress(`0x${topic!.slice(-40)}`);
}

function distinctPublishers(events: readonly RawEventFromCache[]): Address[] {
  return [...new Set(events.map((event) => topicToAddress(event.topic1)))];
}

function decodeAnyContent(publications: readonly RawEventFromCache[]): Uint8Array | null {
  for (const event of publications) {
    const content = decodePublishedContent(event);
    if (content) return content;
  }
  return null;
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

    const bytes = decodeAnyContent(publications);
    if (!bytes) return { status: 'not-published' };

    const retractors = new Set(distinctPublishers(retractions));

    // An honored non-publisher retractor suppresses the whole CID under this policy.
    const honoredRetraction = (policy.honoredRetractors ?? [])
      .map(getAddress)
      .some((retractor) => retractors.has(retractor));

    // Each publisher's own retraction removes only that publisher's copy (OR rule).
    const livePublishers = honoredRetraction
      ? []
      : distinctPublishers(publications).filter((publisher) => !retractors.has(publisher));

    return livePublishers.length > 0
      ? { status: 'active', data: bytes, livePublishers }
      : { status: 'retracted', retractedData: bytes };
  };
}
