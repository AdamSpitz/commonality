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

export interface StatementRegistryItem {
  cidV1: string;
  createdAtBlock: string;
  createdAtTimestamp: string;
}

export interface ProjectRegistryItem {
  id: string;
  factoryAddress: string;
  createdAtBlock: string;
  createdAtTimestamp: string;
}

export interface AlignmentAttestationRegistryItem {
  id: string;
  attester: string;
  subjectAddress: string;
  statementId: string;
  createdAtBlock: string;
}

export interface ImplicationRegistryItem {
  id: string;
  attester: string;
  fromStatementId: string;
  toStatementId: string;
  createdAtBlock: string;
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

export async function fetchStatementsRegistry(
  machinery: SDKMachinery,
  options: { limit?: number; offset?: number } = {}
): Promise<StatementRegistryItem[]> {
  if (!machinery.eventCacheUrl) {
    throw new Error('eventCacheUrl not configured');
  }

  const url = buildEventCacheUrl(machinery.eventCacheUrl, 'statements_registry', {
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch statements registry: ${response.status}`);
  }

  const data = (await response.json()) as ListResponse<StatementRegistryItem>;
  return data.items ?? [];
}

export async function fetchProjectsRegistry(
  machinery: SDKMachinery,
  options: { limit?: number; offset?: number } = {}
): Promise<ProjectRegistryItem[]> {
  if (!machinery.eventCacheUrl) {
    throw new Error('eventCacheUrl not configured');
  }

  const url = buildEventCacheUrl(machinery.eventCacheUrl, 'projects_registry', {
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects registry: ${response.status}`);
  }

  const data = (await response.json()) as ListResponse<ProjectRegistryItem>;
  return data.items ?? [];
}

export async function fetchAlignmentAttestationsRegistry(
  machinery: SDKMachinery,
  options: { statementId?: string; attester?: string; subjectAddress?: string; limit?: number; offset?: number } = {}
): Promise<AlignmentAttestationRegistryItem[]> {
  if (!machinery.eventCacheUrl) {
    throw new Error('eventCacheUrl not configured');
  }

  const url = buildEventCacheUrl(machinery.eventCacheUrl, 'alignment_attestations_registry', {
    statementId: options.statementId,
    attester: options.attester,
    subjectAddress: options.subjectAddress,
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch alignment attestations registry: ${response.status}`);
  }

  const data = (await response.json()) as ListResponse<AlignmentAttestationRegistryItem>;
  return data.items ?? [];
}

export async function fetchImplicationsRegistry(
  machinery: SDKMachinery,
  options: { fromStatementId?: string; toStatementId?: string; attester?: string; limit?: number; offset?: number } = {}
): Promise<ImplicationRegistryItem[]> {
  if (!machinery.eventCacheUrl) {
    throw new Error('eventCacheUrl not configured');
  }

  const url = buildEventCacheUrl(machinery.eventCacheUrl, 'implications_registry', {
    fromStatementId: options.fromStatementId,
    toStatementId: options.toStatementId,
    attester: options.attester,
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch implications registry: ${response.status}`);
  }

  const data = (await response.json()) as ListResponse<ImplicationRegistryItem>;
  return data.items ?? [];
}

export function getContractAddresses(machinery: SDKMachinery): ContractAddresses | undefined {
  return machinery.contractAddresses;
}

export function isEventCacheAvailable(machinery: SDKMachinery): boolean {
  return !!machinery.eventCacheUrl && !!machinery.contractAddresses;
}