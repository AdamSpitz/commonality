import type { Catalog, EventRow, Snapshot } from "./types";

const fields: (keyof EventRow)[] = ["id", "chainId", "contractAddress", "eventName", "blockNumber", "blockTimestamp", "transactionHash", "logIndex", "topic0", "topic1", "topic2", "topic3", "data"];

export function compareRows(actual: EventRow[], expected: EventRow[]) {
  const left = new Map(actual.map(row => [row.id, row]));
  const right = new Map(expected.map(row => [row.id, row]));
  if (left.size !== actual.length || right.size !== expected.length) throw new Error("Duplicate IDs in parity input");
  const missing = expected.filter(row => !left.has(row.id)).map(row => row.id);
  const extra = actual.filter(row => !right.has(row.id)).map(row => row.id);
  const changed = actual.filter(row => {
    const other = right.get(row.id);
    return other && fields.some(field => String(row[field]) !== String(other[field]));
  }).map(row => row.id);
  return { equal: !missing.length && !extra.length && !changed.length, actual: actual.length, expected: expected.length, missing, extra, changed };
}

/** Read-only REST comparison, bounded to 100 pages. Compare only durable ranges.
 *  Subset experiments may ignore other Ponder contracts. A full-catalog comparison must not:
 *  filtering those rows out would hide a missed factory child as a false match.
 */
export async function compareWithPonder(base: string, catalog: Catalog, snapshot: Snapshot, strict = false) {
  let calls = 0;
  const get = async (path: string) => {
    calls++;
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Ponder comparison returned HTTP ${response.status}`);
    return response.json();
  };
  type Sync = { ready: boolean; upstreamId: string; chains: { chainId: string; finalizedThrough: string }[] };
  const sync = await get("/api/sync") as Sync;
  const chain = sync.chains?.find((item: { chainId: string }) => String(item.chainId) === String(snapshot.chainId));
  if (!sync.ready || !chain || BigInt(chain.finalizedThrough) < snapshot.head.number || snapshot.durable.number < snapshot.head.number) {
    throw new Error("Parity requires the whole window durable in both indexers");
  }
  const baseline: EventRow[] = [];
  let after: string | null = null;
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ chainId: String(snapshot.chainId), follow: "1", checkpoint: String(snapshot.head.number),
      blockNumber_gte: String(snapshot.fromBlock), limit: "1000" });
    if (after) query.set("after", after);
    const result = await get(`/api/events?${query}`) as { items: EventRow[]; nextCursor: string | null; completeThroughCheckpoint: boolean };
    if (!Array.isArray(result.items)) throw new Error("Invalid Ponder event page");
    baseline.push(...result.items);
    if (result.completeThroughCheckpoint) break;
    if (!result.nextCursor || result.nextCursor === after || page === 99) throw new Error("Incomplete or oversized Ponder comparison");
    after = result.nextCursor;
  }
  // Factory discoveries are separately covered by tests; parity here is for the resulting source set.
  const sources = [...catalog.sources, ...snapshot.children];
  const inScope = (row: EventRow) => sources.some(source => source.address === row.contractAddress.toLowerCase() &&
    BigInt(row.blockNumber) >= source.startBlock && source.events.some(event => event.name === row.eventName));
  const excluded = baseline.filter(row => !inScope(row)).map(row => row.id);
  const expected = strict ? baseline : baseline.filter(inScope);
  const end = await get("/api/sync") as Sync;
  if (!end.ready || end.upstreamId !== sync.upstreamId) throw new Error("Ponder cache changed during comparison");
  return { ...compareRows(snapshot.rows, expected), excluded: strict ? [] : excluded, restRequests: calls,
    scope: strict ? "all Ponder rows in the durable window" : "configured and discovered addresses/events" };
}
