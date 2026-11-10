import { checkpointFromBlock, type ChainSyncWatermark } from "../api/syncWatermark";

export { checkpointFromBlock };
import type { EventQuery, EventStore, RawEvent, SyncStatus } from "../api/eventStore";
import type { Snapshot } from "./types";
import { getIndexerChainName } from "../utils/chain";
import type { ParkedSync } from "./spend";

export function rowsFromSnapshot(snapshot: Snapshot): RawEvent[] {
  return snapshot.rows.map(row => ({
    id: row.id,
    chainId: row.chainId,
    contractAddress: row.contractAddress,
    eventName: row.eventName,
    blockNumber: BigInt(row.blockNumber),
    blockTimestamp: BigInt(row.blockTimestamp),
    transactionHash: row.transactionHash,
    logIndex: row.logIndex,
    topic0: row.topic0,
    topic1: row.topic1,
    topic2: row.topic2,
    topic3: row.topic3,
    data: row.data,
  }));
}

function matches(row: RawEvent, query: EventQuery): boolean {
  if (query.chainId != null && row.chainId !== query.chainId) return false;
  if (query.contractAddress && row.contractAddress !== query.contractAddress) return false;
  if (query.eventName && row.eventName !== query.eventName) return false;
  if (query.eventNames && !query.eventNames.includes(row.eventName)) return false;
  if (query.topic1 && row.topic1 !== query.topic1) return false;
  if (query.topic2 && row.topic2 !== query.topic2) return false;
  if (query.topic3 && row.topic3 !== query.topic3) return false;
  if (query.topic1In && !query.topic1In.includes(row.topic1 ?? "")) return false;
  if (query.topic2In && !query.topic2In.includes(row.topic2 ?? "")) return false;
  if (query.topic3In && !query.topic3In.includes(row.topic3 ?? "")) return false;
  if (query.blockNumberGte != null && row.blockNumber < query.blockNumberGte) return false;
  if (query.blockNumberLte != null && row.blockNumber > query.blockNumberLte) return false;
  if (query.after) {
    const afterBlock = row.blockNumber > query.after.blockNumber;
    const sameBlock = row.blockNumber === query.after.blockNumber && row.logIndex > query.after.logIndex;
    if (!afterBlock && !sameBlock) return false;
  }
  return true;
}

function byChain(a: RawEvent, b: RawEvent): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  return a.logIndex - b.logIndex;
}

export function syncFromSnapshot(snapshot: Snapshot | undefined, chainName: string = getIndexerChainName()): SyncStatus {
  if (!snapshot) return { ready: false, upstreamId: "", chains: [] };
  const indexedThrough = snapshot.head.number.toString();
  const finalizedThrough = snapshot.durable.number.toString();
  const chain: ChainSyncWatermark = {
    chainId: String(snapshot.chainId),
    chainName,
    indexedThrough,
    finalizedThrough,
    indexedCheckpoint: checkpointFromBlock(snapshot.head.number),
    finalizedCheckpoint: checkpointFromBlock(snapshot.durable.number),
  };
  return { ready: true, upstreamId: snapshot.upstreamId ?? "", chains: [chain] };
}

/** In-memory EventStore over the latest committed prototype snapshot. */
export function snapshotEventStore(current: () => Snapshot | undefined, chainName?: string, parked: () => ParkedSync = () => undefined): EventStore {
  return {
    async query(query) {
      const snapshot = current();
      const rows = (snapshot ? rowsFromSnapshot(snapshot) : []).filter(row => matches(row, query));
      rows.sort(byChain);
      if (query.order === "desc") {
        const selected = query.limit != null ? rows.slice(-query.limit) : rows;
        return selected;
      }
      return query.limit != null ? rows.slice(0, query.limit) : rows;
    },
    async maxBlock(chainId) {
      const rows = current() ? rowsFromSnapshot(current()!) : [];
      const matching = chainId == null ? rows : rows.filter(row => row.chainId === chainId);
      if (matching.length === 0) return null;
      return matching.reduce((max, row) => row.blockNumber > max ? row.blockNumber : max, matching[0]!.blockNumber);
    },
    async sync() {
      const status = syncFromSnapshot(current(), chainName);
      if (parked()) return { ...status, ready: false };
      return status;
    },
  };
}
