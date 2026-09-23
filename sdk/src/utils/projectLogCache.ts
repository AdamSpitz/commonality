import type { RawEventFromCache } from './eventCacheClient.js';

const PROJECT_LOG_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PROJECT_LOG_CACHE_ENTRIES = 200;

interface CacheEntry {
  storedAt: number;
  events: RawEventFromCache[];
}

const cache = new Map<string, CacheEntry>();

export function projectLogCacheKey(chainId: number | undefined, address: string, fromBlock: string | undefined): string {
  return `${chainId ?? 0}:${address.toLowerCase()}:${fromBlock ?? '0'}`;
}

export function resetProjectLogCache(): void {
  cache.clear();
}

export function cachedProjectLogs(key: string, now = Date.now()): RawEventFromCache[] | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (now - entry.storedAt > PROJECT_LOG_CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.events;
}

export function storeProjectLogs(key: string, events: RawEventFromCache[], now = Date.now()): void {
  if (cache.size >= MAX_PROJECT_LOG_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { storedAt: now, events });
}
