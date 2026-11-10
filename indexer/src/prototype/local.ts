import type { Catalog } from "./types";

export type LocalServeConfig = {
  fromBlock: bigint;
  intervalMs: number;
  finality: string;
  maxRequests: number;
  window: bigint;
  out: string;
};

export type HostedStoreConfig = { url: string; schema: string };

/**
 * Hosted raw-log start. Uses the indexer Postgres URL but never Ponder's schema.
 * The spend guard cannot be turned off on this path.
 */
export function hostedStoreConfig(env: NodeJS.ProcessEnv): HostedStoreConfig {
  const url = env.INDEXER_PROTOTYPE_DATABASE_URL || env.DATABASE_URL || "";
  if (!url) throw new Error("Hosted raw-log start requires DATABASE_URL; it will not adopt a snapshot file or Ponder tables");
  const schema = env.INDEXER_PROTOTYPE_SCHEMA || "raw_log";
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error("Invalid prototype schema name");
  if (env.DATABASE_SCHEMA && schema === env.DATABASE_SCHEMA) {
    throw new Error("Refusing to open Ponder DATABASE_SCHEMA; hosted raw-log needs its own fresh schema");
  }
  if (env.INDEXER_SPEND_GUARD === "0") throw new Error("Hosted raw-log start cannot disable the spend guard");
  return { url, schema };
}

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
