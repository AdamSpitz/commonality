import { decodeDirectSupportEvent, fetchFromIPFS, type IPFSConfig } from '@commonality/sdk/utils';
import { extractTextFromStructuredContent } from './content.js';
import type { BeatIngestedItem, BeatSource, BeatSourceAdapter, BeatSourceCursor, BeatSourceFetchResult } from './ingestion.js';

interface RawIndexerEventsResponse {
  items?: RawIndexerEvent[];
}

interface RawIndexerEvent {
  id?: string;
  eventName: string;
  contractAddress: string;
  blockNumber: string | number | bigint;
  blockTimestamp: string | number | bigint;
  transactionHash: string;
  logIndex: number;
  topic0?: string | null;
  topic1?: string | null;
  topic2?: string | null;
  topic3?: string | null;
  data: string;
}

export interface TallyIndexerBeatSourceAdapterConfig {
  /** Optional default indexer base URL. A source locator overrides this when present. */
  indexerBaseUrl?: string;
  /** Used to fetch statement display documents by CID. */
  ipfsGatewayUrl?: string;
  /** Maximum DirectSupport events fetched per source poll. Default 100. */
  limit?: number;
  fetch?: typeof fetch;
  fetchStatementText?: (statementCid: string) => Promise<string | null>;
}

export class TallyIndexerBeatSourceAdapter implements BeatSourceAdapter {
  private readonly indexerBaseUrl?: string;
  private readonly ipfsConfig: IPFSConfig;
  private readonly limit: number;
  private readonly fetchImpl: typeof fetch;
  private readonly fetchStatementTextOverride?: (statementCid: string) => Promise<string | null>;

  constructor(config: TallyIndexerBeatSourceAdapterConfig = {}) {
    this.indexerBaseUrl = config.indexerBaseUrl;
    this.ipfsConfig = { gatewayUrl: config.ipfsGatewayUrl };
    this.limit = config.limit ?? 100;
    this.fetchImpl = config.fetch ?? fetch;
    this.fetchStatementTextOverride = config.fetchStatementText;
  }

  async fetchSource(source: BeatSource, cursor: BeatSourceCursor | undefined): Promise<BeatSourceFetchResult> {
    const baseUrl = normalizeBaseUrl(source.locator || this.indexerBaseUrl);
    const url = new URL('/api/events', baseUrl);
    url.searchParams.set('eventName', 'DirectSupport');
    url.searchParams.set('limit', String(this.limit));
    if (cursor?.cursor) {
      url.searchParams.set('blockNumber_gte', String(BigInt(cursor.cursor) + 1n));
    }

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Tally indexer request failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json() as RawIndexerEventsResponse;
    const rawEvents = Array.isArray(body.items) ? body.items : [];
    const items: BeatIngestedItem[] = [];
    let maxBlockNumber = cursor?.cursor ? BigInt(cursor.cursor) : 0n;

    for (const rawEvent of rawEvents) {
      const decoded = decodeDirectSupportEvent({
        id: `${rawEvent.transactionHash}-${rawEvent.logIndex}`,
        ...rawEvent,
        blockNumber: String(rawEvent.blockNumber),
        blockTimestamp: String(rawEvent.blockTimestamp),
        topic0: rawEvent.topic0 ?? null,
        topic1: rawEvent.topic1 ?? null,
        topic2: rawEvent.topic2 ?? null,
        topic3: rawEvent.topic3 ?? null,
      });
      if (!decoded) continue;
      if (decoded.blockNumber > maxBlockNumber) maxBlockNumber = decoded.blockNumber;

      const statementText = await this.fetchStatementText(decoded.statementId);
      const beliefLabel = formatBeliefState(decoded.beliefState);
      items.push({
        contentCanonicalId: `tally:direct-support:${decoded.transactionHash}:${decoded.logIndex}`,
        sourceId: source.id,
        platform: source.platform ?? 'tally',
        authorId: decoded.user,
        text: statementText
          ? `${decoded.user} ${beliefLabel} statement ${decoded.statementId}: ${statementText}`
          : `${decoded.user} ${beliefLabel} statement ${decoded.statementId}. Statement text was unavailable from IPFS.`,
        observedAt: new Date(Number(decoded.blockTimestamp) * 1000).toISOString(),
        ingestedAt: new Date().toISOString(),
        raw: {
          statementCid: decoded.statementId,
          beliefState: decoded.beliefState,
          transactionHash: decoded.transactionHash,
          logIndex: decoded.logIndex,
          blockNumber: decoded.blockNumber.toString(),
        },
      });
    }

    return {
      items,
      cursor: maxBlockNumber > 0n ? maxBlockNumber.toString() : cursor?.cursor,
    };
  }

  private async fetchStatementText(statementCid: string): Promise<string | null> {
    if (this.fetchStatementTextOverride) {
      return this.fetchStatementTextOverride(statementCid);
    }
    const document = await fetchFromIPFS(this.ipfsConfig, statementCid);
    if (!document) return null;
    return extractTextFromStructuredContent(JSON.stringify(document)) || null;
  }
}

export function createTallyIndexerBeatSourceAdapter(config: TallyIndexerBeatSourceAdapterConfig = {}): TallyIndexerBeatSourceAdapter {
  return new TallyIndexerBeatSourceAdapter(config);
}

function normalizeBaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('Tally indexer source requires a locator URL or indexerBaseUrl');
  }
  return value.endsWith('/') ? value : `${value}/`;
}

function formatBeliefState(beliefState: number): string {
  if (beliefState === 1) return 'signed/believes';
  if (beliefState === 2) return 'disbelieves';
  return 'cleared opinion on';
}
