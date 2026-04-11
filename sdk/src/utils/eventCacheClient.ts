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

interface EventQueryParams {
  contractAddress?: string;
  eventName?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  blockNumber_gte?: string;
  blockNumber_lte?: string;
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

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ListResponse<RawEventFromCache>;
  return data.items ?? [];
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
 * Fetch all raw events for a pubstarter project.
 *
 * Returns events from both the factory contract (creation event) and the
 * assurance contract itself (initialized, metadata, tokens, contributions, etc.).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param assuranceContractAddress - Address of the project's assurance contract
 * @param options - Optional limit on the number of events to fetch
 * @returns Combined factory + contract events for the project
 */
export async function fetchPubstarterProjectEvents(
  machinery: SDKMachinery,
  assuranceContractAddress: string,
  options: { limit?: number } = {}
): Promise<RawEventFromCache[]> {
  const contracts = machinery.contractAddresses!;
  const paddedAddress = padAddressAsTopic(assuranceContractAddress);

  const [factoryEvents, contractEvents] = await Promise.all([
    fetchEvents(machinery, {
      contractAddress: contracts.assuranceContractFactory,
      eventName: 'PubstarterAssuranceContractCreated',
      topic1: paddedAddress,
      limit: 10,
    }),
    fetchEvents(machinery, {
      contractAddress: assuranceContractAddress,
      limit: options.limit ?? 10000,
    }),
  ]);

  return [...factoryEvents, ...contractEvents];
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