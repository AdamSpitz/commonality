import type { ChainSyncWatermark } from "./syncWatermark";

/** Raw `events` row as the REST API already returns it, before JSON bigint conversion. */
export type RawEvent = {
  id: string;
  chainId: number;
  contractAddress: string;
  eventName: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
  logIndex: number;
  topic0: string | null;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
  data: string | null;
};

export type EventQuery = {
  chainId?: number;
  contractAddress?: string;
  eventName?: string;
  eventNames?: string[];
  topic1?: string;
  topic2?: string;
  topic3?: string;
  topic1In?: string[];
  topic2In?: string[];
  topic3In?: string[];
  blockNumberGte?: bigint;
  blockNumberLte?: bigint;
  after?: { blockNumber: bigint; logIndex: number };
  order: "asc" | "desc";
  limit?: number;
};

export type SyncStatus = {
  ready: boolean;
  upstreamId: string;
  chains: ChainSyncWatermark[];
};

/**
 * Read surface shared by the Ponder routes and the raw-log prototype.
 * Filters match `GET /api/events`. `order: "desc"` returns chain order of the
 * newest `limit` rows (newest-first selection, then oldest-first).
 */
export type EventStore = {
  query(query: EventQuery): Promise<RawEvent[]>;
  maxBlock(chainId?: number): Promise<bigint | null>;
  sync(): Promise<SyncStatus>;
};
