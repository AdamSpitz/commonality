import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

/** Blocks in one immutable segment. The manifest reports the live value. */
export const DEFAULT_EVENT_SEGMENT_BLOCKS = 50_000n;

/** Blocks behind the indexed head before a range may become a segment. */
export const DEFAULT_EVENT_SEGMENT_CONFIRMATIONS = 12n;

export function eventSegmentBlocks(): bigint {
  return readPositiveBigInt(process.env.EVENT_SEGMENT_BLOCKS, DEFAULT_EVENT_SEGMENT_BLOCKS);
}

export function eventSegmentConfirmations(): bigint {
  return readPositiveBigInt(process.env.EVENT_SEGMENT_CONFIRMATIONS, DEFAULT_EVENT_SEGMENT_CONFIRMATIONS);
}

function readPositiveBigInt(raw: string | undefined, fallback: bigint): bigint {
  if (raw == null || raw === "") return fallback;
  if (!/^\d+$/.test(raw) || raw === "0") {
    throw new Error(`Invalid event-segment setting "${raw}". Expected a positive integer.`);
  }
  return BigInt(raw);
}

/**
 * Complete windows whose last block is already finalized.
 * A short tail stays out of the archive so a segment's bytes never change.
 * The caller fetches that tail, including the finalized-but-incomplete window,
 * from `/api/events` starting at the last segment's `toBlock + 1`.
 */
export function immutableSegmentRanges(
  finalizedThrough: bigint,
  segmentSize: bigint,
): Array<{ fromBlock: bigint; toBlock: bigint }> {
  if (segmentSize <= 0n || finalizedThrough < segmentSize - 1n) return [];
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let fromBlock = 0n; fromBlock + segmentSize - 1n <= finalizedThrough; fromBlock += segmentSize) {
    ranges.push({ fromBlock, toBlock: fromBlock + segmentSize - 1n });
  }
  return ranges;
}

export function finalizedThroughBlock(indexedHead: bigint | null, confirmations: bigint): bigint {
  if (indexedHead == null || indexedHead < confirmations) return -1n;
  return indexedHead - confirmations;
}

export type SegmentEventRow = {
  id: string;
  contractAddress: string;
  blockNumber: bigint | string;
  blockTimestamp: bigint | string;
  transactionHash: string;
  logIndex: number;
  topic0: string | null;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
  data: string | null;
};

/** Tuple order is the segment wire format. Path supplies chainId and eventName. */
export function encodeSegmentTuples(rows: SegmentEventRow[]): string {
  const tuples = rows.map(row => [
    row.id,
    row.contractAddress,
    String(row.blockNumber),
    String(row.blockTimestamp),
    row.transactionHash,
    row.logIndex,
    row.topic0,
    row.topic1,
    row.topic2,
    row.topic3,
    row.data ?? "0x",
  ]);
  return JSON.stringify(tuples);
}

export function segmentSha256(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export function segmentResponseHeaders(sha256: string, immutable: boolean): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=30",
    "x-content-sha256": sha256,
  };
}

export function maybeGzip(body: string, acceptEncoding: string | undefined): { payload: Uint8Array; encoding?: string } {
  if (acceptEncoding?.includes("gzip")) {
    return { payload: gzipSync(Buffer.from(body)), encoding: "gzip" };
  }
  return { payload: Buffer.from(body) };
}
