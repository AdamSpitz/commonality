import { getAddress, type Address, type Hash } from 'viem';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
import type { CidResolution, DisplayPolicy } from './by-cid.js';
import { createDefaultContentResolver } from './calldata-resolver.js';
import { ContentUnavailableError, resolvePublishedContent, type ContentResolver, type PublicationPointer } from './content-resolver.js';
import type { PublishedDataCache, PublishedDataId, PublishedDataReadResult } from './types.js';

function normalizeDataId(dataId: PublishedDataId): PublishedDataId {
  return dataId.toLowerCase() as PublishedDataId;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PublishedData API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<unknown>;
}

function isReadResult(value: unknown): value is PublishedDataReadResult {
  if (!value || typeof value !== 'object') return false;
  const status = (value as { status?: unknown }).status;
  return status === 'active' || status === 'retracted' || status === 'not-published';
}

/**
 * A publication pointer as the indexer serves it.
 *
 * The indexer holds no content, so this is all it can offer: where the publication happened.
 * `blockNumber` arrives as a decimal string because the API stringifies bigints.
 */
interface ApiPublicationPointer {
  publisher?: unknown;
  transactionHash?: unknown;
  blockNumber?: unknown;
  logIndex?: unknown;
}

function parsePointer(
  value: ApiPublicationPointer | undefined,
  dataId: PublishedDataId,
  fallbackPublisher?: Address,
): PublicationPointer | null {
  if (!value || typeof value !== 'object') return null;

  const publisher = typeof value.publisher === 'string' ? getAddress(value.publisher) : fallbackPublisher;
  const transactionHash = typeof value.transactionHash === 'string' ? value.transactionHash as Hash : undefined;
  if (!publisher || !transactionHash) return null;

  return {
    publisher,
    dataId: normalizeDataId(dataId),
    transactionHash,
    blockNumber: typeof value.blockNumber === 'string' ? BigInt(value.blockNumber) : undefined,
    logIndex: typeof value.logIndex === 'number' ? value.logIndex : undefined,
  };
}

function parsePointers(value: unknown, dataId: PublishedDataId): PublicationPointer[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => parsePointer(entry as ApiPublicationPointer, dataId))
    .filter((pointer): pointer is PublicationPointer => pointer !== null);
}

export interface PublishedDataApiCacheOptions {
  chainId?: number;
  includeContractAddress?: boolean;
  /**
   * Where content bytes come from. Defaults to calldata recovery via `machinery.publicClient`.
   * Override to point reads at a different storage backend.
   */
  contentResolver?: ContentResolver;
}

function apiRequestConfig(machinery: SDKMachinery, options: PublishedDataApiCacheOptions) {
  if (!machinery.eventCacheUrl) {
    throw new Error('eventCacheUrl is required to read PublishedData from the indexer API');
  }

  const chainId = options.chainId ?? machinery.defaultChainId;
  const publishedDataAddress = chainId === undefined
    ? machinery.contractAddresses?.publishedData
    : getContractAddressesForChain(machinery, chainId)?.publishedData;
  const includeContractAddress = options.includeContractAddress ?? Boolean(publishedDataAddress);
  return { chainId, publishedDataAddress, includeContractAddress };
}

function addApiRequestQuery(url: URL, config: ReturnType<typeof apiRequestConfig>) {
  if (config.chainId !== undefined) url.searchParams.set('chainId', String(config.chainId));
  if (config.includeContractAddress && config.publishedDataAddress) url.searchParams.set('contractAddress', config.publishedDataAddress);
}

function normalizedHonoredRetractors(policy: DisplayPolicy): Address[] {
  return (policy.honoredRetractors ?? []).map((address) => getAddress(address));
}

function addDisplayPolicyQuery(url: URL, policy: DisplayPolicy) {
  const honoredRetractors = normalizedHonoredRetractors(policy);
  if (honoredRetractors.length > 0) url.searchParams.set('honoredRetractors', honoredRetractors.join(','));
}

/** What the publisher-keyed API route can tell us: a status, and where to find the bytes. */
type PublicationStatus =
  | { status: 'active' | 'retracted'; pointer: PublicationPointer }
  | { status: 'not-published' };

/**
 * Build a PublishedDataCache backed by the indexer's dedicated PublishedData API.
 *
 * This is a higher-level alternative to createEventCachePublishedDataCache: the indexer applies
 * the library default policy (publisher self-retraction only) and returns a publication pointer,
 * while callers still get the same PublishedDataCache interface used by
 * readData/readActiveData/readRetractions.
 *
 * The indexer never returns content — it does not have any. Bytes come from the ContentResolver
 * and are verified against `dataId`.
 */
export function createPublishedDataApiCache(
  machinery: SDKMachinery,
  options: PublishedDataApiCacheOptions = {},
): PublishedDataCache {
  const config = apiRequestConfig(machinery, options);
  const contentResolver = options.contentResolver ?? createDefaultContentResolver(machinery, { chainId: config.chainId });
  const resultCache = new Map<string, Promise<PublicationStatus>>();

  async function load(publisher: Address, dataId: PublishedDataId): Promise<PublicationStatus> {
    const normalizedPublisher = getAddress(publisher);
    const normalizedDataId = normalizeDataId(dataId);
    const key = `${config.chainId ?? ''}:${config.publishedDataAddress ?? ''}:${normalizedPublisher}:${normalizedDataId}`;
    const existing = resultCache.get(key);
    if (existing) return existing;

    const request: Promise<PublicationStatus> = (async () => {
      const url = new URL(`${trimTrailingSlash(machinery.eventCacheUrl!)}/api/published-data/${normalizedPublisher}/${normalizedDataId}`);
      addApiRequestQuery(url, config);
      const json = await fetchJson(url);
      if (!isReadResult(json)) throw new Error('PublishedData API returned an invalid response');

      if (json.status === 'not-published') {
        resultCache.delete(key);
        return { status: 'not-published' } as const;
      }

      const pointer = parsePointer(
        (json as { publication?: ApiPublicationPointer }).publication,
        normalizedDataId,
        normalizedPublisher,
      );
      if (!pointer) throw new Error('PublishedData API response is missing a usable publication pointer');

      return { status: json.status, pointer } as const;
    })();

    resultCache.set(key, request);
    try {
      return await request;
    } catch (error) {
      resultCache.delete(key);
      throw error;
    }
  }

  return {
    async getPublishedData(publisher, dataId) {
      const result = await load(publisher, dataId);
      // Null is reserved for "never published". Bytes we cannot fetch throw instead.
      if (result.status === 'not-published') return null;

      if (!contentResolver) {
        throw new ContentUnavailableError(dataId, 'No ContentResolver is configured; PublishedData content cannot be read');
      }
      return resolvePublishedContent(contentResolver, dataId, [result.pointer]);
    },
    async isPublished(publisher, dataId) {
      return (await load(publisher, dataId)).status !== 'not-published';
    },
    async isRetracted(publisher, dataId) {
      return (await load(publisher, dataId)).status === 'retracted';
    },
  };
}

interface CidResolutionResponse {
  status: 'active' | 'retracted' | 'not-published';
  publications?: unknown;
  livePublishers?: unknown;
}

function isCidResolutionResponse(value: unknown): value is CidResolutionResponse {
  if (!value || typeof value !== 'object') return false;
  const status = (value as { status?: unknown }).status;
  return status === 'active' || status === 'retracted' || status === 'not-published';
}

/** What the CID-keyed API route can tell us: a status, and every place the bytes might be. */
type CidStatus =
  | { status: 'active'; pointers: PublicationPointer[]; livePublishers: Address[] }
  | { status: 'retracted'; pointers: PublicationPointer[] }
  | { status: 'not-published' };

export function createPublishedDataApiCidResolver(
  machinery: SDKMachinery,
  options: PublishedDataApiCacheOptions = {},
) {
  const config = apiRequestConfig(machinery, options);
  const contentResolver = options.contentResolver ?? createDefaultContentResolver(machinery, { chainId: config.chainId });
  const resultCache = new Map<string, Promise<CidStatus>>();

  async function load(dataId: PublishedDataId, policy: DisplayPolicy): Promise<CidStatus> {
    const normalizedDataId = normalizeDataId(dataId);
    const honoredRetractors = normalizedHonoredRetractors(policy).join(',');
    const key = `${config.chainId ?? ''}:${config.publishedDataAddress ?? ''}:${normalizedDataId}:${honoredRetractors}`;
    const existing = resultCache.get(key);
    if (existing) return existing;

    const request: Promise<CidStatus> = (async () => {
      const url = new URL(`${trimTrailingSlash(machinery.eventCacheUrl!)}/api/published-data/${normalizedDataId}`);
      addApiRequestQuery(url, config);
      addDisplayPolicyQuery(url, policy);
      const json = await fetchJson(url);
      if (!isCidResolutionResponse(json)) throw new Error('PublishedData by-CID API returned an invalid response');

      if (json.status === 'not-published') {
        resultCache.delete(key);
        return { status: 'not-published' } as const;
      }

      const pointers = parsePointers(json.publications, normalizedDataId);
      if (pointers.length === 0) throw new Error('PublishedData by-CID API response is missing usable publication pointers');

      if (json.status === 'retracted') return { status: 'retracted', pointers } as const;

      const livePublishers = Array.isArray(json.livePublishers)
        ? json.livePublishers.map((publisher) => getAddress(String(publisher)))
        : [];
      return { status: 'active', pointers, livePublishers } as const;
    })();

    resultCache.set(key, request);
    try {
      return await request;
    } catch (error) {
      resultCache.delete(key);
      throw error;
    }
  }

  return async function resolveByCid(dataId: PublishedDataId, policy: DisplayPolicy = {}): Promise<CidResolution> {
    const result = await load(dataId, policy);
    if (result.status === 'not-published') return { status: 'not-published' };

    if (!contentResolver) {
      throw new ContentUnavailableError(dataId, 'No ContentResolver is configured; PublishedData content cannot be read');
    }

    // Throws ContentUnavailableError when the bytes cannot be fetched; the DocumentStore adapter
    // maps that to `unavailable` rather than dropping the statement from aggregate counts.
    const bytes = await resolvePublishedContent(contentResolver, dataId, result.pointers);

    return result.status === 'active'
      ? { status: 'active', data: bytes, livePublishers: result.livePublishers }
      : { status: 'retracted', retractedData: bytes };
  };
}
