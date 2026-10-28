import { SDKMachinery } from '../machinery.js';
import { cachedProjectLogs, projectLogCacheKey, storeProjectLogs } from './projectLogCache.js';
import { readProjectLogsFromNode } from './projectLogRead.js';

/**
 * A raw blockchain event as returned by the event cache API.
 *
 * Contains the full EVM log data (topics + data) along with block metadata.
 * Decoded into typed domain events by the event decoder before folding.
 */
export interface RawEventFromCache {
  /** Unique identifier assigned by the event cache. */
  id: string;
  /** EVM chain ID where the event was emitted. */
  chainId?: number;
  /** Address of the contract that emitted the event. */
  contractAddress: string;
  /** Solidity event name (e.g. "TrustSet", "Deposited"). */
  eventName: string;
  /** Block number as a decimal string. */
  blockNumber: string;
  /** Block timestamp as a decimal string (Unix seconds). */
  blockTimestamp: string;
  /** Hash of the transaction that emitted the event. */
  transactionHash: string;
  /** Log index within the transaction. */
  logIndex: number;
  /** Event signature hash (topic[0]). */
  topic0: string | null;
  /** First indexed parameter (topic[1]). */
  topic1: string | null;
  /** Second indexed parameter (topic[2]). */
  topic2: string | null;
  /** Third indexed parameter (topic[3]). */
  topic3: string | null;
  /** ABI-encoded non-indexed event parameters. */
  data: string;
}

export interface EventQueryParams {
  /** EVM chain ID to filter events by. */
  chainId?: number;
  /** Contract address to filter events by. */
  contractAddress?: string;
  /** Solidity event name to filter by. */
  eventName?: string;
  /** First indexed event topic to filter by. */
  topic1?: string;
  /** Second indexed event topic to filter by. */
  topic2?: string;
  /** Third indexed event topic to filter by. */
  topic3?: string;
  /** Comma-separated topic values (max 32) for an indexed parameter. */
  topic1_in?: string;
  topic2_in?: string;
  topic3_in?: string;
  /** Minimum block number, encoded as a decimal string. */
  blockNumber_gte?: string;
  /** Maximum block number, encoded as a decimal string. */
  blockNumber_lte?: string;
  /** Maximum number of events to return. Defaults to 1000. */
  limit?: number;
  /**
   * Return a full page even when older matches may have been dropped.
   * `fetchEventsComplete` sets this while it splits the block range.
   * Callers that want a sample must set it too; otherwise a page that
   * fills `limit` without a topic filter is treated as a silent truncation.
   */
  allowTruncation?: boolean;
}

function buildEventCacheUrl(
  baseUrl: string,
  table: string,
  params: Record<string, string | number | undefined>
): string {
  const queryString = Object.entries(params)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${baseUrl.replace(/\/$/, '')}/api/${table}${queryString ? '?' + queryString : ''}`;
}

interface ListResponse<T> {
  items: T[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requireListResponse<T>(value: unknown, responseName: string): ListResponse<T> {
  if (isRecord(value) && Array.isArray(value.items)) {
    return value as unknown as ListResponse<T>;
  }
  throw new Error(`Malformed ${responseName}: expected object with items array`);
}

const TRANSIENT_EVENT_CACHE_FETCH_RETRY_DELAYS_MS = [100, 250, 500, 1000] as const;
const RETRIABLE_EVENT_CACHE_HTTP_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function failedFetchEventsError(response: Response): Error {
  return new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
}

async function fetchEventCacheResponse(url: string): Promise<Response> {
  for (let attempt = 0; attempt <= TRANSIENT_EVENT_CACHE_FETCH_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }

      const shouldRetry = RETRIABLE_EVENT_CACHE_HTTP_STATUS_CODES.has(response.status)
        && attempt < TRANSIENT_EVENT_CACHE_FETCH_RETRY_DELAYS_MS.length;
      if (!shouldRetry) {
        throw failedFetchEventsError(response);
      }
    } catch (error) {
      // Do not retry caller-visible HTTP errors such as 4xx responses.
      if (error instanceof Error && error.message.startsWith('Failed to fetch events:')) {
        throw error;
      }
      if (attempt >= TRANSIENT_EVENT_CACHE_FETCH_RETRY_DELAYS_MS.length) {
        throw error;
      }
    }

    await delay(TRANSIENT_EVENT_CACHE_FETCH_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error('Failed to fetch events');
}

/**
 * Fetch raw events from the event cache API.
 *
 * Queries the event cache HTTP endpoint with optional filters for contract address,
 * event name, indexed topics, and block range. Returns raw event data ready for
 * decoding by the event decoder.
 *
 * @param machinery - SDK machinery (must have `eventCacheUrl` configured)
 * @param params - Query filters (contract address, event name, topics, block range, limit)
 * @returns Array of raw cached events
 * @throws Error if `eventCacheUrl` is not configured or the HTTP request fails
 */
export async function fetchEvents(
  machinery: SDKMachinery,
  params: EventQueryParams
): Promise<RawEventFromCache[]> {
  if (machinery.eventCacheUrl == null) {
    throw new Error('eventCacheUrl not configured');
  }

  const limit = params.limit ?? 1000;
  const url = buildEventCacheUrl(machinery.eventCacheUrl, 'events', {
    chainId: params.chainId ?? machinery.defaultChainId,
    contractAddress: params.contractAddress,
    eventName: params.eventName,
    topic1: params.topic1,
    topic2: params.topic2,
    topic3: params.topic3,
    topic1_in: params.topic1_in,
    topic2_in: params.topic2_in,
    topic3_in: params.topic3_in,
    blockNumber_gte: params.blockNumber_gte,
    blockNumber_lte: params.blockNumber_lte,
    limit,
  });

  const response = await fetchEventCacheResponse(url);

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse event-cache response: ${message}`);
  }

  const items = requireListResponse<RawEventFromCache>(data, 'event-cache response').items;
  const narrowedByTopic = params.topic1 != null || params.topic2 != null || params.topic3 != null
    || params.topic1_in != null || params.topic2_in != null || params.topic3_in != null;
  // A full page at or above the default limit is the truncation signal. Smaller
  // explicit limits (a single creation event, a short sample) are left alone:
  // returning exactly one row is usually the complete set.
  if (!params.allowTruncation && !narrowedByTopic && limit >= 1000 && items.length >= limit) {
    throw new Error(
      `Event query returned ${items.length} rows, which meets the limit of ${limit}. Older matching events may be missing. Use fetchEventsComplete for a full result.`,
    );
  }
  return items;
}

const EVENT_API_CAP = 10_000;

type EventSegmentManifest = {
  finalizedThrough?: string;
  segments: Array<{ fromBlock: string; toBlock: string; count: number; sha256: string }>;
};

const manifestCache = new Map<string, { at: number; manifest: EventSegmentManifest }>();
const MANIFEST_TTL_MS = 5_000;

function usesEventArchive(
  params: Omit<EventQueryParams, 'limit' | 'blockNumber_gte' | 'blockNumber_lte'>,
  fromBlock: bigint,
): boolean {
  return fromBlock === 0n
    && params.eventName != null
    && params.contractAddress == null
    && params.topic1 == null
    && params.topic2 == null
    && params.topic3 == null
    && params.topic1_in == null
    && params.topic2_in == null
    && params.topic3_in == null;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function decodeEventSegment(text: string, chainId: number, eventName: string): RawEventFromCache[] {
  const tuples: unknown = JSON.parse(text);
  if (!Array.isArray(tuples)) throw new Error('Malformed event segment');
  return tuples.map(tuple => {
    if (!Array.isArray(tuple) || tuple.length !== 11) throw new Error('Malformed event segment row');
    return {
      id: String(tuple[0]),
      chainId,
      contractAddress: String(tuple[1]),
      eventName,
      blockNumber: String(tuple[2]),
      blockTimestamp: String(tuple[3]),
      transactionHash: String(tuple[4]),
      logIndex: Number(tuple[5]),
      topic0: tuple[6] == null ? null : String(tuple[6]),
      topic1: tuple[7] == null ? null : String(tuple[7]),
      topic2: tuple[8] == null ? null : String(tuple[8]),
      topic3: tuple[9] == null ? null : String(tuple[9]),
      data: String(tuple[10]),
    };
  });
}

/** Block through which the indexer treats this chain's logs as finalized. */
export async function readFinalizedThrough(
  machinery: SDKMachinery,
  eventName: string,
): Promise<bigint | null> {
  const chainId = machinery.defaultChainId;
  if (chainId == null || machinery.eventCacheUrl == null) return null;
  const manifestUrl = buildEventCacheUrl(machinery.eventCacheUrl, 'event-segments/manifest', {
    chainId,
    eventName,
  });
  try {
    const response = await fetchEventCacheResponse(manifestUrl);
    const manifest = await response.json() as EventSegmentManifest;
    if (typeof manifest.finalizedThrough !== 'string') return null;
    return BigInt(manifest.finalizedThrough);
  } catch {
    return null;
  }
}

function compareRawEvents(a: RawEventFromCache, b: RawEventFromCache): number {
  const blockDelta = BigInt(a.blockNumber) - BigInt(b.blockNumber);
  if (blockDelta !== 0n) return blockDelta < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

async function readEventArchive(
  machinery: SDKMachinery,
  params: Omit<EventQueryParams, 'limit' | 'blockNumber_gte' | 'blockNumber_lte'>,
): Promise<RawEventFromCache[] | null> {
  const chainId = params.chainId ?? machinery.defaultChainId;
  const eventName = params.eventName;
  if (chainId == null || eventName == null || machinery.eventCacheUrl == null) return null;
  const manifestUrl = buildEventCacheUrl(machinery.eventCacheUrl, 'event-segments/manifest', {
    chainId,
    eventName,
  });
  const cached = manifestCache.get(manifestUrl);
  let manifest: EventSegmentManifest;
  if (cached && Date.now() - cached.at < MANIFEST_TTL_MS) {
    manifest = cached.manifest;
  } else {
    let response: Response;
    try {
      response = await fetchEventCacheResponse(manifestUrl);
    } catch {
      return null;
    }
    try {
      manifest = await response.json() as EventSegmentManifest;
    } catch {
      return null;
    }
    if (!Array.isArray(manifest.segments)) return null;
    manifestCache.set(manifestUrl, { at: Date.now(), manifest });
  }
  if (manifest.segments.length === 0) return null;

  let archived: RawEventFromCache[];
  try {
    const pages = await Promise.all(manifest.segments.map(async segment => {
      const url = `${machinery.eventCacheUrl!.replace(/\/$/, '')}/api/event-segments/${chainId}/${encodeURIComponent(eventName)}/${segment.fromBlock}`;
      const response = await fetchEventCacheResponse(url);
      const text = await response.text();
      if (await sha256Hex(text) !== segment.sha256) {
        throw new Error(`Event segment ${segment.fromBlock} failed its sha256 check`);
      }
      const rows = decodeEventSegment(text, chainId, eventName);
      if (rows.length !== segment.count) {
        throw new Error(`Event segment ${segment.fromBlock} has ${rows.length} rows, manifest says ${segment.count}`);
      }
      return rows;
    }));
    archived = pages.flat();
  } catch {
    return null;
  }

  const tailFrom = BigInt(manifest.segments[manifest.segments.length - 1]!.toBlock) + 1n;
  const tail = await fetchEventsBySplitting(machinery, params, tailFrom);
  return [...archived, ...tail].sort(compareRawEvents);
}

/** Fetch a complete event set by recursively splitting capped block ranges. */
export async function fetchEventsComplete(
  machinery: SDKMachinery,
  params: Omit<EventQueryParams, 'limit' | 'blockNumber_gte' | 'blockNumber_lte'>,
  fromBlock = 0n,
): Promise<RawEventFromCache[]> {
  if (usesEventArchive(params, fromBlock)) {
    const archived = await readEventArchive(machinery, params);
    if (archived) return archived;
  }
  return fetchEventsBySplitting(machinery, params, fromBlock);
}

async function fetchEventsBySplitting(
  machinery: SDKMachinery,
  params: Omit<EventQueryParams, 'limit' | 'blockNumber_gte' | 'blockNumber_lte'>,
  fromBlock: bigint,
): Promise<RawEventFromCache[]> {
  const newest = await fetchEvents(machinery, {
    ...params,
    blockNumber_gte: fromBlock.toString(),
    limit: EVENT_API_CAP,
    allowTruncation: true,
  });
  if (newest.length < EVENT_API_CAP) return newest;

  const endBlock = newest.reduce((max, event) => {
    const block = BigInt(event.blockNumber);
    return block > max ? block : max;
  }, fromBlock);

  const fetchRange = async (start: bigint, end: bigint): Promise<RawEventFromCache[]> => {
    const events = await fetchEvents(machinery, {
      ...params,
      blockNumber_gte: start.toString(),
      blockNumber_lte: end.toString(),
      limit: EVENT_API_CAP,
      allowTruncation: true,
    });
    if (events.length < EVENT_API_CAP) return events;
    if (start === end) {
      throw new Error(`Event-cache block ${start} contains at least ${EVENT_API_CAP} matching events; complete retrieval is impossible without log pagination`);
    }
    const midpoint = start + (end - start) / 2n;
    const [left, right] = await Promise.all([
      fetchRange(start, midpoint),
      fetchRange(midpoint + 1n, end),
    ]);
    return [...left, ...right];
  };

  return fetchRange(fromBlock, endBlock);
}

// ============================================================================
// Topic helpers
// ============================================================================

/**
 * Pad an Ethereum address to a 32-byte topic value for event filtering.
 * e.g. 0xAbCd... → 0x000000000000000000000000abcd...
 */
export function padAddressAsTopic(address: string): string {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  return `0x${'0'.repeat(24)}${normalized}`;
}

/** Pad a uint256 to a 32-byte topic value. */
export function padUintAsTopic(value: bigint): string {
  return `0x${value.toString(16).padStart(64, '0')}`;
}

const TOPIC_IN_CHUNK = 32;

/** Fetch one event name for many topic values, chunked to the API bound. */
export async function fetchEventsByTopicList(
  machinery: SDKMachinery,
  eventName: string,
  topic: 'topic1' | 'topic2' | 'topic3',
  values: string[],
): Promise<RawEventFromCache[]> {
  if (values.length === 0) return [];
  const unique = [...new Set(values)];
  const pages: RawEventFromCache[] = [];
  for (let i = 0; i < unique.length; i += TOPIC_IN_CHUNK) {
    const chunk = unique.slice(i, i + TOPIC_IN_CHUNK).join(',');
    pages.push(...await fetchEventsComplete(machinery, { eventName, [`${topic}_in`]: chunk }));
  }
  return pages;
}

// ============================================================================
// Domain-specific event fetch helpers
// ============================================================================

/**
 * Fetch all raw events for a lazyGiving project.
 *
 * Returns events from both the factory contract (creation event) and the
 * assurance contract itself (initialized, metadata, tokens, contributions, etc.).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param assuranceContractAddress - Address of the project's assurance contract
 * @param options - Optional block cursor for the assurance-contract logs
 * @returns Combined factory + contract events for the project
 */
export async function fetchLazyGivingProjectEvents(
  machinery: SDKMachinery,
  assuranceContractAddress: string,
  options: { blockNumber_gte?: string } = {}
): Promise<RawEventFromCache[]> {
  const paddedAddress = padAddressAsTopic(assuranceContractAddress);

  const [factoryEvents, projectFactoryEvents, creatorFactoryEvents, cachedContractEvents] = await Promise.all([
    fetchEvents(machinery, {
      eventName: 'LazyGivingAssuranceContractCreated',
      topic1: paddedAddress,
      limit: 10,
    }),
    fetchEvents(machinery, {
      eventName: 'ProjectCreated',
      topic3: paddedAddress,
      limit: 10,
    }),
    fetchEvents(machinery, {
      eventName: 'CreatorContractCreated',
      topic1: paddedAddress,
      limit: 10,
    }),
    fetchEventsComplete(
      machinery,
      { contractAddress: assuranceContractAddress },
      options.blockNumber_gte ? BigInt(options.blockNumber_gte) : 0n,
    ),
  ]);

  const contractEvents = cachedContractEvents.length > 0 || !machinery.publicClient
    ? cachedContractEvents
    : await readUnindexedProjectLogs(machinery, assuranceContractAddress, options.blockNumber_gte);

  return [...factoryEvents, ...projectFactoryEvents, ...creatorFactoryEvents, ...contractEvents];
}

async function readUnindexedProjectLogs(
  machinery: SDKMachinery,
  assuranceContractAddress: string,
  fromBlock: string | undefined,
): Promise<RawEventFromCache[]> {
  const key = projectLogCacheKey(machinery.defaultChainId, assuranceContractAddress, fromBlock);
  const cached = cachedProjectLogs(key);
  if (cached) return cached;

  try {
    const events = await readProjectLogsFromNode(
      machinery.publicClient!,
      machinery.defaultChainId,
      assuranceContractAddress,
      fromBlock ? BigInt(fromBlock) : 0n,
    );
    storeProjectLogs(key, events);
    return events;
  } catch {
    return [];
  }
}

/**
 * Fetch all raw delegation events from every indexed DelegatableNotes contract version.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Raw delegation events (note creation, delegation, revocation)
 */
export async function fetchAllDelegationEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  const eventNames = [
    'NoteCreated',
    'NoteDelegated',
    'ChainSplit',
    'NoteSplitSameChain',
    'NoteRevoked',
    'NotePartiallyTakenBack',
    'FundsReclaimed',
    'NoteConsumed',
    'ERC1155Purchased',
    'RefundedIntoNote',
    'ReimbursementClaimedIntoNote',
  ];
  return (await Promise.all(eventNames.map(eventName => fetchEventsComplete(machinery, { eventName })))).flat();
}

/**
 * Fetch every NoteIntentAttested event.
 *
 * There is no indexed filter for `noteContract`. Callers that know a statement
 * or a set of note ids should use `fetchNoteIntentsForStatement` or
 * `fetchNoteIntentsForNoteIds` in `scopedNotes.ts` instead of this.
 */
export async function fetchAllNoteIntentEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  return fetchEventsComplete(machinery, { eventName: 'NoteIntentAttested' });
}

/**
 * Fetch RefUpdated events for a specific owner address.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param owner - Ethereum address of the ref owner (topic1)
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw RefUpdated events for the owner
 */
export async function fetchRefUpdatedEvents(
  machinery: SDKMachinery,
  owner: string,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  const paddedOwner = padAddressAsTopic(owner);
  return fetchEvents(machinery, {
    eventName: 'RefUpdated',
    topic1: paddedOwner,
    limit: options.limit ?? 1000,
  });
}

/**
 * Fetch all RefUpdated events across all owners.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Raw RefUpdated events from all owners
 */
export async function fetchAllRefUpdatedEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  return fetchEventsComplete(machinery, { eventName: 'RefUpdated' });
}

/**
 * Fetch ERC-1155 transfer events (TransferSingle + TransferBatch) for a specific contract.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param erc1155Address - Address of the ERC-1155 token contract
 * @returns Combined single and batch transfer events
 */
export async function fetchERC1155TransferEvents(
  machinery: SDKMachinery,
  erc1155Address: string,
): Promise<RawEventFromCache[]> {
  const [singles, batches] = await Promise.all([
    fetchEventsComplete(machinery, {
      contractAddress: erc1155Address,
      eventName: 'TransferSingle',
    }),
    fetchEventsComplete(machinery, {
      contractAddress: erc1155Address,
      eventName: 'TransferBatch',
    }),
  ]);
  return [...singles, ...batches];
}

/**
 * Fetch all ERC1155Bought events across all contracts.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Raw ERC1155Bought events from the secondary marketplace
 */
export async function fetchAllBoughtEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  return fetchEventsComplete(machinery, { eventName: 'ERC1155Bought' });
}

/**
 * Fetch all ERC1155Sold events across all contracts.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Raw ERC1155Sold events from the secondary marketplace
 */
export async function fetchAllSoldEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  return fetchEventsComplete(machinery, { eventName: 'ERC1155Sold' });
}

// ============================================================================
// Content-funding event fetch helpers
// ============================================================================

/**
 * Fetch all content-funding events across every indexed version of the relevant
 * contracts: ContentRegistry, BeneficiaryRegistry, BeneficiaryEscrow, and
 * CreatorAssuranceContractFactory.
 *
 * Returns a flat array of raw events ready for decoding and folding.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @returns Combined raw events from all four content-funding contracts
 */
export async function fetchAllContentFundingEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  const eventNames = [
    'ContentItemRegistered',
    'ContentItemReleased',
    'BeneficiaryVerified',
    'BeneficiaryControlTaken',
    'BeneficiaryControlReleased',
    'ProjectDisavowed',
    'ProjectDisavowalWithdrawn',
    'PayoutAddressRotated',
    'ContractVetoed',
    'Deposited',
    'Withdrawn',
    'CreatorContractCreated',
    'ProspectiveRoundCreated',
    'ProspectiveRoundMaterialized',
    'ContentMaterialized',
    'ContentTokenClaimed',
  ];
  const eventGroups = await Promise.all(eventNames.map(eventName => fetchEventsComplete(machinery, { eventName })));
  return eventGroups.flat();
}
