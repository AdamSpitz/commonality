/**
 * Per-chain indexing watermarks.
 *
 * `indexedThrough` is the latest committed head, not the newest matching event.
 * Quiet blocks still advance it. `finalizedThrough` is the durable cursor.
 * Callers must not treat either as a durable upper bound while `ready` is false.
 * Checkpoint strings are 16-digit zero-padded block numbers.
 */

export type CheckpointRow = {
  chain_id: string | number | bigint;
  chain_name: string;
  indexedThrough: string | bigint;
  finalizedThrough: string | bigint;
};

export type ChainSyncWatermark = {
  chainId: string;
  chainName: string;
  indexedThrough: string;
  finalizedThrough: string;
  indexedCheckpoint: string;
  finalizedCheckpoint: string;
};

/** Fixed width so a growing head is never a shorter checkpoint string. */
export function checkpointFromBlock(block: bigint): string {
  if (block < 0n) throw new Error("checkpoint block is invalid");
  return block.toString().padStart(16, "0");
}

/** Ponder replaces `build_id` when the indexing database is rebuilt. */
export function upstreamIdFromAppMeta(value: unknown): string {
  if (value == null || typeof value !== "object") return "";
  const buildId = (value as { build_id?: unknown }).build_id;
  return typeof buildId === "string" ? buildId : "";
}

export function chainSyncWatermarks(rows: CheckpointRow[]): ChainSyncWatermark[] {
  return rows.map(row => ({
    chainId: BigInt(row.chain_id).toString(),
    chainName: row.chain_name,
    indexedThrough: BigInt(row.indexedThrough).toString(),
    finalizedThrough: BigInt(row.finalizedThrough).toString(),
    indexedCheckpoint: checkpointFromBlock(BigInt(row.indexedThrough)),
    finalizedCheckpoint: checkpointFromBlock(BigInt(row.finalizedThrough)),
  }));
}

/**
 * Followers may freeze a page at the indexed head only after Ponder reports
 * the app ready. Before that, the checkpoint can sit at the start block
 * while the first batch of logs is still uncommitted.
 */
export function followCheckpointFromSync(
  watermarks: ChainSyncWatermark[],
  chainId: string | undefined,
  ready: boolean,
): string | undefined {
  if (!ready || chainId == null || chainId === "") return undefined;
  return watermarks.find(row => row.chainId === chainId)?.indexedThrough;
}
