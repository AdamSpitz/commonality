import { SDKMachinery, type ContractAddresses } from '../machinery.js';

/**
 * A raw blockchain event as returned by the event cache API.
 *
 * Contains the full EVM log data (topics + data) along with block metadata.
 * Decoded into typed domain events by the event decoder before folding.
 */
export interface RawEventFromCache {
  /** Unique identifier assigned by the event cache. */
  id: string;
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
  /** Minimum block number, encoded as a decimal string. */
  blockNumber_gte?: string;
  /** Maximum block number, encoded as a decimal string. */
  blockNumber_lte?: string;
  /** Maximum number of events to return. Defaults to 1000. */
  limit?: number;
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

  const url = buildEventCacheUrl(machinery.eventCacheUrl, 'events', {
    contractAddress: params.contractAddress,
    eventName: params.eventName,
    topic1: params.topic1,
    topic2: params.topic2,
    topic3: params.topic3,
    blockNumber_gte: params.blockNumber_gte,
    blockNumber_lte: params.blockNumber_lte,
    limit: params.limit ?? 1000,
  });

  const response = await fetchEventCacheResponse(url);

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse event-cache response: ${message}`);
  }

  return requireListResponse<RawEventFromCache>(data, 'event-cache response').items;
}

/**
 * Get the configured contract addresses from SDK machinery.
 *
 * @param machinery - SDK machinery instance
 * @returns Contract addresses, or undefined if not configured
 */
export function getContractAddresses(machinery: SDKMachinery): ContractAddresses | undefined {
  return machinery.contractAddresses;
}

/**
 * Check whether the event cache is available and usable.
 *
 * Returns true only if both `eventCacheUrl` and `contractAddresses` are configured.
 *
 * @param machinery - SDK machinery instance
 * @returns True if event-cache queries can be made
 */
export function isEventCacheAvailable(machinery: SDKMachinery): boolean {
  return machinery.eventCacheUrl != null && !!machinery.contractAddresses;
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
 * @param options - Optional limit on the number of events to fetch
 * @returns Combined factory + contract events for the project
 */
export async function fetchLazyGivingProjectEvents(
  machinery: SDKMachinery,
  assuranceContractAddress: string,
  options: { limit?: number; blockNumber_gte?: string } = {}
): Promise<RawEventFromCache[]> {
  const contracts = machinery.contractAddresses!;
  const paddedAddress = padAddressAsTopic(assuranceContractAddress);

  const [factoryEvents, creatorFactoryEvents, contractEvents] = await Promise.all([
    fetchEvents(machinery, {
      contractAddress: contracts.assuranceContractFactory,
      eventName: 'LazyGivingAssuranceContractCreated',
      topic1: paddedAddress,
      limit: 10,
    }),
    contracts.creatorContractFactory
      ? fetchEvents(machinery, {
          contractAddress: contracts.creatorContractFactory,
          eventName: 'CreatorContractCreated',
          topic1: paddedAddress,
          limit: 10,
        })
      : Promise.resolve([]),
    fetchEvents(machinery, {
      contractAddress: assuranceContractAddress,
      blockNumber_gte: options.blockNumber_gte,
      limit: options.limit ?? 10000,
    }),
  ]);

  return [...factoryEvents, ...creatorFactoryEvents, ...contractEvents];
}

/**
 * Fetch all raw events for a secondary marketplace contract.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param marketplaceAddress - Address of the ERC-1155 secondary marketplace contract
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw marketplace events (listings, sales, cancellations)
 */
export async function fetchSecondaryMarketEvents(
  machinery: SDKMachinery,
  marketplaceAddress: string,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  return fetchEvents(machinery, {
    contractAddress: marketplaceAddress,
    limit: options.limit ?? 10000,
  });
}

/**
 * Fetch all raw delegation events from the DelegatableNotes contract.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw delegation events (note creation, delegation, revocation)
 */
export async function fetchAllDelegationEvents(
  machinery: SDKMachinery,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  return fetchEvents(machinery, {
    contractAddress: machinery.contractAddresses!.delegatableNotes,
    limit: options.limit ?? 10000,
  });
}

/**
 * Fetch NoteIntentAttested events filtered by noteContract address.
 *
 * Note: `noteId` filtering is done client-side after fetching, since the event
 * cache only supports filtering by indexed topics.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param noteContract - Address of the note contract to filter by (topic2)
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw NoteIntentAttested events
 */
export async function fetchNoteIntentEvents(
  machinery: SDKMachinery,
  noteContract: string,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  const paddedNoteContract = padAddressAsTopic(noteContract);
  return fetchEvents(machinery, {
    contractAddress: machinery.contractAddresses!.noteIntent,
    eventName: 'NoteIntentAttested',
    topic2: paddedNoteContract,
    limit: options.limit ?? 10000,
  });
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
    contractAddress: machinery.contractAddresses!.mutableRefUpdater,
    eventName: 'RefUpdated',
    topic1: paddedOwner,
    limit: options.limit ?? 1000,
  });
}

/**
 * Fetch all RefUpdated events across all owners.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw RefUpdated events from all owners
 */
export async function fetchAllRefUpdatedEvents(
  machinery: SDKMachinery,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  return fetchEvents(machinery, {
    contractAddress: machinery.contractAddresses!.mutableRefUpdater,
    eventName: 'RefUpdated',
    limit: options.limit ?? 10000,
  });
}

/**
 * Fetch ERC-1155 transfer events (TransferSingle + TransferBatch) for a specific contract.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param erc1155Address - Address of the ERC-1155 token contract
 * @param options - Optional limit on the number of events to fetch
 * @returns Combined single and batch transfer events
 */
export async function fetchERC1155TransferEvents(
  machinery: SDKMachinery,
  erc1155Address: string,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  const [singles, batches] = await Promise.all([
    fetchEvents(machinery, {
      contractAddress: erc1155Address,
      eventName: 'TransferSingle',
      limit: options.limit ?? 10000,
    }),
    fetchEvents(machinery, {
      contractAddress: erc1155Address,
      eventName: 'TransferBatch',
      limit: options.limit ?? 10000,
    }),
  ]);
  return [...singles, ...batches];
}

/**
 * Fetch all NoteIntentAttested events across all note contracts.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw NoteIntentAttested events from all note contracts
 */
export async function fetchAllNoteIntentEvents(
  machinery: SDKMachinery,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  return fetchEvents(machinery, {
    contractAddress: machinery.contractAddresses!.noteIntent,
    eventName: 'NoteIntentAttested',
    limit: options.limit ?? 10000,
  });
}

/**
 * Fetch all ERC1155Bought events across all contracts.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw ERC1155Bought events from the secondary marketplace
 */
export async function fetchAllBoughtEvents(
  machinery: SDKMachinery,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  return fetchEvents(machinery, {
    eventName: 'ERC1155Bought',
    limit: options.limit ?? 10000,
  });
}

/**
 * Fetch all ERC1155Sold events across all contracts.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Optional limit on the number of events to fetch
 * @returns Raw ERC1155Sold events from the secondary marketplace
 */
export async function fetchAllSoldEvents(
  machinery: SDKMachinery,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  return fetchEvents(machinery, {
    eventName: 'ERC1155Sold',
    limit: options.limit ?? 10000,
  });
}

// ============================================================================
// Content-funding event fetch helpers
// ============================================================================

/**
 * Fetch all content-funding events across all four contracts:
 * ContentRegistry, ChannelRegistry, ChannelEscrow, and CreatorAssuranceContractFactory.
 *
 * Returns a flat array of raw events ready for decoding and folding.
 * Returns an empty array if any of the four content-funding contract addresses
 * are not configured.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Optional limit on the number of events per contract
 * @returns Combined raw events from all four content-funding contracts
 */
export async function fetchAllContentFundingEvents(
  machinery: SDKMachinery,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  const contracts = machinery.contractAddresses;
  if (!contracts?.contentRegistry || !contracts?.channelRegistry || !contracts?.channelEscrow || !contracts?.creatorContractFactory) {
    return [];
  }

  const limit = options.limit ?? 10000;
  const [contentRegistryEvents, channelRegistryEvents, channelEscrowEvents, factoryEvents] = await Promise.all([
    fetchEvents(machinery, { contractAddress: contracts.contentRegistry, limit }),
    fetchEvents(machinery, { contractAddress: contracts.channelRegistry, limit }),
    fetchEvents(machinery, { contractAddress: contracts.channelEscrow, limit }),
    fetchEvents(machinery, { contractAddress: contracts.creatorContractFactory, limit }),
  ]);

  return [...contentRegistryEvents, ...channelRegistryEvents, ...channelEscrowEvents, ...factoryEvents];
}