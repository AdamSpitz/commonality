/**
 * Per-chain indexing watermarks from Ponder's `_ponder_checkpoint`.
 *
 * `indexedThrough` is the latest committed checkpoint block, not the newest
 * matching event. Quiet blocks still advance it. `finalizedThrough` is
 * Ponder's finalized checkpoint for that chain. Callers must not treat either
 * as a durable upper bound while `ready` is false: the first checkpoint row
 * is written before historical backfill commits.
 */

const BLOCK_NUMBER_OFFSET = 26;
const BLOCK_NUMBER_DIGITS = 16;
const CHECKPOINT_LENGTH = 75;

export type CheckpointRow = {
  chain_id: string | number | bigint;
  chain_name: string;
  latest_checkpoint: string;
  finalized_checkpoint: string;
};

export type ChainSyncWatermark = {
  chainId: string;
  chainName: string;
  indexedThrough: string;
  finalizedThrough: string;
  indexedCheckpoint: string;
  finalizedCheckpoint: string;
};

export function blockFromPonderCheckpoint(checkpoint: string): string {
  if (!/^\d+$/.test(checkpoint) || checkpoint.length !== CHECKPOINT_LENGTH) {
    throw new Error("Ponder checkpoint is invalid");
  }
  return BigInt(checkpoint.slice(BLOCK_NUMBER_OFFSET, BLOCK_NUMBER_OFFSET + BLOCK_NUMBER_DIGITS)).toString();
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
    indexedThrough: blockFromPonderCheckpoint(row.latest_checkpoint),
    finalizedThrough: blockFromPonderCheckpoint(row.finalized_checkpoint),
    indexedCheckpoint: row.latest_checkpoint,
    finalizedCheckpoint: row.finalized_checkpoint,
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
