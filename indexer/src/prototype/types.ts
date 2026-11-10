import type { AbiEvent, Hex } from "viem";

export type Header = { number: bigint; hash: Hex; timestamp: bigint };
export type RawLog = {
  address: Hex; blockNumber: Hex; blockHash: Hex; transactionHash: Hex;
  logIndex: Hex; topics: Hex[]; data: Hex; removed?: boolean;
};
export type Source = { name: string; address: Hex; startBlock: bigint; events: AbiEvent[] };
export type FactoryRule = {
  source: Source; event: AbiEvent; parameter: string; childName: string; childEvents: AbiEvent[];
};
export type Catalog = { sources: Source[]; factories: FactoryRule[] };
export type Child = Source & { creationHash: Hex };
export type SourceCoverage = { address: Hex; startBlock: bigint; selectors: Hex[] };
export type EventRow = {
  id: string; chainId: number; contractAddress: Hex; eventName: string;
  blockNumber: string; blockTimestamp: string; transactionHash: Hex; logIndex: number;
  topic0: string | null; topic1: string | null; topic2: string | null; topic3: string | null;
  data: string;
};
export type Snapshot = {
  version: 1; chainId: number; scope: string; fromBlock: bigint;
  /** Cache epoch. Stable across polls; a new value invalidates SDK folds and segments. */
  upstreamId?: string;
  head: Header; durable: Header; rows: EventRow[]; children: Child[];
  /** Addresses already backfilled. Absent on snapshots written before source admission. */
  coverage?: SourceCoverage[];
  /**
   * False while a cursor exists but historical backfill has not committed.
   * Absent means a snapshot written before this flag; those are treated as committed.
   */
  backfillCommitted?: boolean;
};
export type Rpc = { request(method: string, params: unknown[]): Promise<unknown> };

export function json(value: unknown): string {
  return JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v, 2);
}

export function hex(value: bigint): Hex { return `0x${value.toString(16)}`; }

export function address(value: string): Hex {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("Invalid source/child address");
  return value.toLowerCase() as Hex;
}
