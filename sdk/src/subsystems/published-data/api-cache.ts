import { getAddress, hexToBytes, type Address } from 'viem';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
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

function decodeDataField(value: unknown): Uint8Array | null {
  return typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value) ? hexToBytes(value as `0x${string}`) : null;
}

export interface PublishedDataApiCacheOptions {
  chainId?: number;
  includeContractAddress?: boolean;
}

/**
 * Build a PublishedDataCache backed by the indexer's dedicated PublishedData API.
 *
 * This is a higher-level alternative to createEventCachePublishedDataCache: the
 * indexer decodes the DataPublished event body and applies the library default
 * policy (publisher self-retraction only), while callers still get the same
 * PublishedDataCache interface used by readData/readActiveData/readRetractions.
 */
export function createPublishedDataApiCache(
  machinery: SDKMachinery,
  options: PublishedDataApiCacheOptions = {},
): PublishedDataCache {
  if (!machinery.eventCacheUrl) {
    throw new Error('eventCacheUrl is required to read PublishedData from the indexer API');
  }

  const chainId = options.chainId ?? machinery.defaultChainId;
  const publishedDataAddress = chainId === undefined
    ? machinery.contractAddresses?.publishedData
    : getContractAddressesForChain(machinery, chainId)?.publishedData;
  const includeContractAddress = options.includeContractAddress ?? Boolean(publishedDataAddress);
  const resultCache = new Map<string, Promise<PublishedDataReadResult>>();

  async function load(publisher: Address, dataId: PublishedDataId): Promise<PublishedDataReadResult> {
    const normalizedPublisher = getAddress(publisher);
    const normalizedDataId = normalizeDataId(dataId);
    const key = `${chainId ?? ''}:${publishedDataAddress ?? ''}:${normalizedPublisher}:${normalizedDataId}`;
    const existing = resultCache.get(key);
    if (existing) return existing;

    const request: Promise<PublishedDataReadResult> = (async () => {
      const url = new URL(`${trimTrailingSlash(machinery.eventCacheUrl!)}/api/published-data/${normalizedPublisher}/${normalizedDataId}`);
      if (chainId !== undefined) url.searchParams.set('chainId', String(chainId));
      if (includeContractAddress && publishedDataAddress) url.searchParams.set('contractAddress', publishedDataAddress);
      const json = await fetchJson(url);
      if (!isReadResult(json)) throw new Error('PublishedData API returned an invalid response');

      if (json.status === 'not-published') return { status: 'not-published' } as const;
      if (json.status === 'active') {
        const data = decodeDataField((json as { data?: unknown }).data);
        if (!data) throw new Error('PublishedData API active response is missing hex data');
        return { status: 'active', data } as const;
      }

      const retractedData = decodeDataField((json as { retractedData?: unknown }).retractedData);
      if (!retractedData) throw new Error('PublishedData API retracted response is missing hex retractedData');
      return { status: 'retracted', retractedData } as const;
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
      if (result.status === 'active') return result.data;
      if (result.status === 'retracted') return result.retractedData;
      return null;
    },
    async isPublished(publisher, dataId) {
      return (await load(publisher, dataId)).status !== 'not-published';
    },
    async isRetracted(publisher, dataId) {
      return (await load(publisher, dataId)).status === 'retracted';
    },
  };
}
