import { createHash, randomBytes } from "node:crypto";
import { decodeEventLog, toEventSelector, type Hex } from "viem";
import { RpcFailure } from "./rpc";
import { admissionPlan, catalogSources, coverageOf } from "./coverage";
import { address, hex, json, type Catalog, type Child, type EventRow, type Header, type RawLog, type Rpc, type Snapshot, type Source, type SourceCoverage } from "./types";

export async function readHeader(rpc: Rpc, block: bigint | "latest" | "finalized"): Promise<Header> {
  const result = await rpc.request("eth_getBlockByNumber", [typeof block === "bigint" ? hex(block) : block, false]);
  const header = result as { number?: string; hash?: Hex; timestamp?: string } | null;
  if (!header || !header.number || !/^0x[0-9a-fA-F]{64}$/.test(header.hash ?? "") || !header.timestamp) {
    throw new Error("Missing or invalid block header");
  }
  const parsed = { number: BigInt(header.number), hash: header.hash!, timestamp: BigInt(header.timestamp) };
  if (typeof block === "bigint" && parsed.number !== block) throw new Error("RPC returned wrong block");
  return parsed;
}

async function queryLogs(rpc: Rpc, from: bigint, to: bigint, addresses: Hex[], topics: Hex[]): Promise<RawLog[]> {
  if (!addresses.length || !topics.length) return [];
  try {
    const result = await rpc.request("eth_getLogs", [{ fromBlock: hex(from), toBlock: hex(to), address: addresses, topics: [topics] }]);
    if (!Array.isArray(result)) throw new Error("Invalid logs response");
    for (const log of result as RawLog[]) {
      if (!log || typeof log.blockNumber !== "string" || typeof log.address !== "string" ||
          !Array.isArray(log.topics) || !log.topics.length || log.removed ||
          BigInt(log.blockNumber) < from || BigInt(log.blockNumber) > to ||
          !addresses.includes(address(log.address)) || !topics.includes(log.topics[0]!) ||
          !/^0x[0-9a-fA-F]{64}$/.test(log.blockHash) || !/^0x[0-9a-fA-F]{64}$/.test(log.transactionHash) ||
          !/^0x(?:[0-9a-fA-F]{2})*$/.test(log.data) || !/^0x[0-9a-fA-F]+$/.test(log.logIndex) ||
          log.topics.length > 4 || log.topics.some(topic => !/^0x[0-9a-fA-F]{64}$/.test(topic))) {
        throw new Error("RPC returned an invalid/out-of-scope log");
      }
    }
    return result as RawLog[];
  } catch (error) {
    if (!(error instanceof RpcFailure) || !error.rangeLimit) throw error;
    if (from < to) {
      const middle = (from + to) / 2n;
      return [...await queryLogs(rpc, from, middle, addresses, topics), ...await queryLogs(rpc, middle + 1n, to, addresses, topics)];
    }
    if (addresses.length > 1) {
      const middle = Math.ceil(addresses.length / 2);
      return [...await queryLogs(rpc, from, to, addresses.slice(0, middle), topics), ...await queryLogs(rpc, from, to, addresses.slice(middle), topics)];
    }
    if (topics.length > 1) {
      const middle = Math.ceil(topics.length / 2);
      return [...await queryLogs(rpc, from, to, addresses, topics.slice(0, middle)), ...await queryLogs(rpc, from, to, addresses, topics.slice(middle))];
    }
    throw new Error("Single-block single-filter log response exceeds provider limits; no coverage committed");
  }
}

async function scan(rpc: Rpc, sources: Source[], from: bigint, to: bigint, window: bigint): Promise<RawLog[]> {
  const active = sources.filter(source => source.startBlock <= to && source.events.length);
  if (!active.length || from > to) return [];
  const earliest = active.reduce((min, source) => source.startBlock < min ? source.startBlock : min, to);
  const logs: RawLog[] = [];
  for (let start = from > earliest ? from : earliest; start <= to; start += window) {
    const end = start + window - 1n < to ? start + window - 1n : to;
    for (let i = 0; i < active.length; i += 100) {
      const batch = active.slice(i, i + 100);
      const addresses = [...new Set(batch.map(source => source.address))];
      const topics = [...new Set(batch.flatMap(source => source.events.map(toEventSelector)))];
      logs.push(...await queryLogs(rpc, start, end, addresses, topics));
    }
  }
  return logs;
}

export type SyncOptions = {
  chainId: number; fromBlock: bigint; toBlock: bigint; finalizedBlock: bigint;
  maxBlocks?: bigint; window?: bigint;
  /** Headers already read this poll. Steady state must not re-read them. */
  head?: Header; durable?: Header;
  /** Set after a startup eth_chainId check so later polls skip it. */
  chainVerified?: boolean;
};

/** Pure snapshot transition: failures never mutate the previous committed state. */
export async function syncWindow(rpc: Rpc, catalog: Catalog, options: SyncOptions, previous?: Snapshot): Promise<Snapshot> {
  const { chainId, fromBlock, toBlock, finalizedBlock } = options;
  const window = options.window ?? 10_000n;
  if (fromBlock < 1n || toBlock < fromBlock || toBlock - fromBlock + 1n > (options.maxBlocks ?? 10_000n) || window < 1n) {
    throw new Error("Invalid or oversized prototype window (fromBlock must be >= 1)");
  }
  if (!options.chainVerified && Number(BigInt(await rpc.request("eth_chainId", []) as string)) !== chainId) {
    throw new Error("RPC chain ID mismatch");
  }
  const scope = createHash("sha256").update(json(catalog)).digest("hex");
  const coverage = coverageOf(catalog);
  const knownCoverage: SourceCoverage[] | undefined = previous
    ? previous.coverage ?? (previous.scope === scope ? coverage : undefined)
    : undefined;
  if (previous && !knownCoverage) {
    throw new Error("Snapshot predates source coverage; cannot admit a changed catalog");
  }
  const admission = admissionPlan(knownCoverage, coverage);
  if (previous && previous.chainId !== chainId) throw new Error("Snapshot chain changed; use a separate output for this experiment");
  if (previous && fromBlock > previous.fromBlock) throw new Error("Refusing to raise the snapshot start block");
  if (previous && fromBlock < previous.fromBlock && !admission.backfill.some(source => source.startBlock < previous.fromBlock)) {
    throw new Error("Snapshot start block changed without a new earlier source");
  }
  if (!previous && catalog.factories.some(rule => rule.source.startBlock < fromBlock)) {
    throw new Error("Window omits factory history; start at/before factory deployment or select fixed contracts only");
  }
  const backfillSpan = admission.backfill.reduce((max, source) => {
    const span = toBlock - source.startBlock + 1n;
    return span > max ? span : max;
  }, 0n);
  if (backfillSpan > (options.maxBlocks ?? 10_000n)) throw new Error("Invalid or oversized prototype window (fromBlock must be >= 1)");
  if (admission.backfill.some(source => source.startBlock < fromBlock)) {
    throw new Error("Window omits new source history; start at/before the new source");
  }
  const anchor = previous?.durable ?? await readHeader(rpc, fromBlock - 1n);
  if (toBlock < anchor.number || finalizedBlock < anchor.number) throw new Error("Head/finality regressed behind durable anchor");
  const head = options.head?.number === toBlock ? options.head : await readHeader(rpc, toBlock);
  const durableNumber = finalizedBlock < toBlock ? finalizedBlock : toBlock;
  const durable = options.durable?.number === durableNumber ? options.durable : await readHeader(rpc, durableNumber);
  if (durable.hash !== anchor.hash && durable.number === anchor.number) {
    throw new Error("Deep reorg at durable anchor; refusing to rewrite history");
  }
  const headers = new Map<bigint, Header>([[head.number, head], [anchor.number, anchor], [durable.number, durable]]);
  const headerFor = async (log: RawLog) => {
    const number = BigInt(log.blockNumber);
    if (!headers.has(number)) headers.set(number, await readHeader(rpc, number));
    const header = headers.get(number)!;
    if (header.hash !== log.blockHash) throw new Error("Log belongs to a noncanonical block");
    return header;
  };
  const from = anchor.number + 1n;
  const children: Child[] = (previous?.children ?? []).filter(child => child.startBlock <= anchor.number);
  const backfillAddresses = new Set(admission.backfill.map(source => source.address));
  const watched = catalogSources(catalog).filter(source => !backfillAddresses.has(source.address));
  const known = [...watched, ...children];
  const logs = await scan(rpc, known, from, toBlock, window);
  if (admission.backfill.length) {
    const added = catalogSources(catalog).filter(source => backfillAddresses.has(source.address));
    const earliest = added.reduce((min, source) => source.startBlock < min ? source.startBlock : min, toBlock);
    logs.push(...await scan(rpc, added, earliest, toBlock, window));
  }
  const seenAddresses = new Set(known.map(source => source.address));
  for (const log of logs) {
    const header = await headerFor(log);
    for (const rule of catalog.factories) {
      if (rule.source.address !== address(log.address) || header.number < rule.source.startBlock || toEventSelector(rule.event) !== log.topics[0]) continue;
      const decoded = decodeEventLog({ abi: [rule.event], data: log.data, topics: log.topics as [Hex, ...Hex[]], strict: true });
      const childAddress = address(String((decoded.args as Record<string, unknown>)[rule.parameter]));
      if (!children.some(child => child.name === rule.childName && child.address === childAddress)) {
        children.push({ name: rule.childName, address: childAddress, startBlock: header.number, events: rule.childEvents, creationHash: header.hash });
      }
    }
  }
  const born = children.filter(child => !seenAddresses.has(child.address));
  if (born.length) {
    const bornFrom = born.reduce((min, child) => child.startBlock < min ? child.startBlock : min, from);
    logs.push(...await scan(rpc, born, bornFrom, toBlock, window));
  }
  const sources = [...catalog.sources, ...children];
  const removed = new Set(admission.removed.map(source => source.address));
  const rows = new Map((previous?.rows ?? []).filter(row =>
    BigInt(row.blockNumber) <= anchor.number || removed.has(row.contractAddress)).map(row => [row.id, row]));
  for (const log of logs) {
    const sourceEvents = sources.filter(source => source.address === address(log.address) && source.startBlock <= BigInt(log.blockNumber))
      .flatMap(source => source.events).filter(event => toEventSelector(event) === log.topics[0]);
    if (!sourceEvents.length) continue; // Address/topic cross product may include unregistered combinations.
    const eventNames = new Set(sourceEvents.map(event => event.name));
    if (eventNames.size !== 1) throw new Error("Ambiguous event name at source");
    decodeEventLog({ abi: [sourceEvents[0]!], data: log.data, topics: log.topics as [Hex, ...Hex[]], strict: true });
    const header = await headerFor(log);
    const logIndex = Number(BigInt(log.logIndex));
    if (!Number.isSafeInteger(logIndex)) throw new Error("Invalid log index");
    const row: EventRow = {
      id: `${chainId}-${log.transactionHash}-${logIndex}`, chainId,
      contractAddress: address(log.address), eventName: sourceEvents[0]!.name,
      blockNumber: header.number.toString(), blockTimestamp: header.timestamp.toString(),
      transactionHash: log.transactionHash, logIndex, topic0: log.topics[0] ?? null,
      topic1: log.topics[1] ?? null, topic2: log.topics[2] ?? null, topic3: log.topics[3] ?? null, data: log.data,
    };
    const existing = rows.get(row.id);
    if (existing && json(existing) !== json(row)) throw new Error("Conflicting duplicate event");
    rows.set(row.id, row);
  }
  const historical = previous != null && [...rows.values()].some(row =>
    BigInt(row.blockNumber) <= previous.durable.number && !previous.rows.some(old => old.id === row.id));
  const upstreamId = historical || !/^[0-9a-f]{64}$/.test(previous?.upstreamId ?? "")
    ? randomBytes(32).toString("hex") : previous!.upstreamId;
  const committedFrom = previous && previous.fromBlock < fromBlock ? previous.fromBlock : fromBlock;
  return { version: 1, chainId, scope, fromBlock: committedFrom, upstreamId, coverage, head, durable, children,
    rows: [...rows.values()].sort((a, b) => BigInt(a.blockNumber) < BigInt(b.blockNumber) ? -1 : BigInt(a.blockNumber) > BigInt(b.blockNumber) ? 1 : a.logIndex - b.logIndex) };
}
