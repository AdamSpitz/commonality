import { SDKMachinery, type ContractAddresses } from '../machinery.js';

export interface RawEventFromCache {
  id: string;
  contractAddress: string;
  eventName: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  logIndex: number;
  topic0: string | null;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
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

export async function fetchEvents(
  machinery: SDKMachinery,
  params: EventQueryParams
): Promise<RawEventFromCache[]> {
  if (!machinery.eventCacheUrl) {
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

export function getContractAddresses(machinery: SDKMachinery): ContractAddresses | undefined {
  return machinery.contractAddresses;
}

export function isEventCacheAvailable(machinery: SDKMachinery): boolean {
  return !!machinery.eventCacheUrl && !!machinery.contractAddresses;
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
 * Returns events from both the factory contract (creation event) and the
 * assurance contract itself (initialized, metadata, tokens, contributions, etc.).
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
 * Fetch NoteIntentAttested events, optionally filtered by noteContract address.
 * noteId filtering is done client-side after fetching.
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
 * Fetch all RefUpdated events (across all owners).
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
 * Fetch ERC1155 transfer events (TransferSingle + TransferBatch) for a specific contract.
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
 * Fetch all NoteIntentAttested events across all noteContracts.
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