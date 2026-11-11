import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, fetchText, readTestnetConfig, requireOptIn, rpcCall, testnetOptInSkipped } from "./lib.mjs";

function blockFromStatus(payload, chainSlug) {
  if (!payload || typeof payload !== "object") return null;
  const named = payload[chainSlug];
  const chain = named && typeof named === "object"
    ? named
    : Object.values(payload).find((value) => value && typeof value === "object" && value.block);
  const number = chain?.block?.number;
  return typeof number === "number" ? number : null;
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return testnetOptInSkipped(error); }
  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const statusUrl = config.statusUrl ?? new URL("/status", config.eventCacheUrl).toString();
  const status = await fetchText(statusUrl);
  let payload = null;
  try { payload = JSON.parse(status.rawBody ?? status.body); } catch { payload = null; }
  const rpcBlock = await rpcCall(rpcUrl, "eth_blockNumber");
  const indexerBlock = status.ok ? blockFromStatus(payload, config.chainSlug ?? "") : null;
  const chainBlock = rpcBlock.ok ? Number.parseInt(rpcBlock.result, 16) : null;
  const lag = Number.isFinite(indexerBlock) && Number.isFinite(chainBlock) ? chainBlock - indexerBlock : null;
  const findings = { statusUrl, status, rpcBlock, indexerBlock, chainBlock, lag, maxLagBlocks: config.indexer?.maxLagBlocks };
  const problems = [];
  if (!status.ok || typeof indexerBlock !== "number") problems.push("/status chain block.number was not usable");
  if (!rpcBlock.ok || !Number.isFinite(chainBlock)) problems.push("RPC block number was not usable for lag comparison");
  if (lag !== null && lag > (config.indexer?.maxLagBlocks ?? 300)) problems.push(`indexer lag ${lag} blocks exceeds budget`);
  if (problems.length > 0) return fail(`Testnet indexer failed: ${problems.join("; ")}.`, { findings });
  return pass(`Testnet indexer is at block ${indexerBlock} (${lag} blocks behind RPC).`, { findings });
});
