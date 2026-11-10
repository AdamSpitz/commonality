import { toEventSelector } from "viem";
import { address, type Catalog, type Source, type SourceCoverage } from "./types";

/** Alchemy weights checked 2026-11-09. Header 20 CU, eth_getLogs 60 CU. */
export const ALCHEMY_CU = { eth_getBlockByNumber: 20, eth_getLogs: 60 } as const;

export function catalogSources(catalog: Catalog): Source[] {
  const byAddress = new Map<string, Source>();
  const add = (source: Source, extra = source.events) => {
    const events = [...source.events, ...extra].filter((event, index, all) =>
      all.findIndex(item => item.name === event.name) === index);
    const key = address(source.address);
    const existing = byAddress.get(key);
    if (!existing) {
      byAddress.set(key, { ...source, address: key, events });
      return;
    }
    if (existing.startBlock !== source.startBlock) {
      throw new Error("Changed source start block or event selection requires an explicit coverage plan");
    }
    for (const event of events) {
      if (!existing.events.some(item => item.name === event.name)) existing.events.push(event);
    }
  };
  for (const source of catalog.sources) add(source);
  for (const rule of catalog.factories) add(rule.source, [rule.event]);
  return [...byAddress.values()];
}

export function coverageOf(catalog: Catalog): SourceCoverage[] {
  return catalogSources(catalog).map(source => ({
    address: source.address,
    startBlock: source.startBlock,
    selectors: [...new Set(source.events.map(event => toEventSelector(event)))].sort(),
  })).sort((a, b) => a.address < b.address ? -1 : 1);
}

export type Admission = { backfill: SourceCoverage[]; removed: SourceCoverage[] };

/** New addresses are backfilled. A changed start block or event set is refused. Removed addresses keep their rows. */
export function admissionPlan(previous: SourceCoverage[] | undefined, next: SourceCoverage[]): Admission {
  if (!previous) return { backfill: [], removed: [] };
  const nextByAddress = new Map(next.map(source => [source.address, source]));
  for (const old of previous) {
    const current = nextByAddress.get(old.address);
    if (!current) continue;
    const sameStart = current.startBlock === old.startBlock;
    const sameEvents = current.selectors.join() === old.selectors.join();
    if (!sameStart || !sameEvents) {
      throw new Error("Changed source start block or event selection requires an explicit coverage plan");
    }
  }
  const previousAddresses = new Set(previous.map(source => source.address));
  return {
    backfill: next.filter(source => !previousAddresses.has(source.address)),
    removed: previous.filter(source => !nextByAddress.has(source.address)),
  };
}

/**
 * Arithmetic only. One combined eth_getLogs per window per 100-address batch,
 * from the earliest source start through head, plus one header per event-bearing block.
 * Factory children are not included; their count is unknown until the replay.
 */
export function estimateReplay(input: {
  sources: { startBlock: bigint }[];
  head: bigint;
  window?: bigint;
  eventBearingBlocks?: bigint;
}): { logQueries: bigint; headerReads: bigint; cu: bigint; note: string } {
  const window = input.window ?? 10_000n;
  if (window < 1n || !input.sources.length) throw new Error("Replay estimate needs sources and a positive window");
  const earliest = input.sources.reduce((min, source) => source.startBlock < min ? source.startBlock : min, input.head);
  if (input.head < earliest) throw new Error("Replay head is behind the earliest source");
  const windows = (input.head - earliest) / window + 1n;
  const batches = BigInt(Math.ceil(input.sources.length / 100));
  const logQueries = windows * batches;
  const headerReads = input.eventBearingBlocks ?? 0n;
  const cu = logQueries * BigInt(ALCHEMY_CU.eth_getLogs) + headerReads * BigInt(ALCHEMY_CU.eth_getBlockByNumber);
  return {
    logQueries, headerReads, cu,
    note: "Excludes factory-child backfill, retries, and live polls. eventBearingBlocks must be supplied; it is not estimated.",
  };
}
