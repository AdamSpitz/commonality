import type { Catalog } from "./types";

export type LocalServeConfig = {
  fromBlock: bigint;
  intervalMs: number;
  finality: string;
  maxRequests: number;
  window: bigint;
  out: string;
};

/** Earliest configured source, clamped to the sync loop's block-1 anchor. */
export function earliestConfiguredBlock(catalog: Catalog): bigint {
  const starts = [
    ...catalog.sources.map(source => source.startBlock),
    ...catalog.factories.map(rule => rule.source.startBlock),
  ];
  if (!starts.length) throw new Error("No configured sources selected");
  return starts.reduce((min, start) => start < min ? start : min);
}

/**
 * Defaults for replacing the local Ponder process. Hardhat has no finalized
 * tag we can rely on, and its poll stays tight. This is not a hosted cutover.
 */
export function localServeConfig(env: NodeJS.ProcessEnv, earliest: bigint): LocalServeConfig {
  const chain = env.PONDER_CHAIN ?? "hardhat";
  const hardhat = chain === "hardhat";
  const interval = env.PONDER_POLL_INTERVAL_MS ?? (hardhat ? "100" : "12000");
  const window = env.PONDER_ETH_GET_LOGS_BLOCK_RANGE ?? "10000";
  if (!/^\d+$/.test(interval) || Number(interval) < 1) throw new Error("Invalid poll interval");
  if (!/^\d+$/.test(window) || Number(window) < 1) throw new Error("Invalid log window");
  const finality = env.INDEXER_FINALITY ?? (hardhat ? "depth:0" : "finalized");
  if (finality !== "finalized" && !/^depth:\d+$/.test(finality)) throw new Error("Invalid finality policy");
  const out = env.INDEXER_SNAPSHOT_PATH ?? "";
  if (!out) throw new Error("INDEXER_SNAPSHOT_PATH is required for --local");
  return {
    fromBlock: earliest < 1n ? 1n : earliest,
    intervalMs: Number(interval),
    finality,
    maxRequests: Number.MAX_SAFE_INTEGER,
    window: BigInt(window),
    out,
  };
}
