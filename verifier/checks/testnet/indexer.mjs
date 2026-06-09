import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, graphqlQuery, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const meta = await graphqlQuery(config.graphqlUrl, "{ _meta { block { number } } }");
  const rpcBlock = await rpcCall(rpcUrl, "eth_blockNumber");
  const indexerBlock = meta.ok ? meta.payload?.data?._meta?.block?.number : null;
  const chainBlock = rpcBlock.ok ? Number.parseInt(rpcBlock.result, 16) : null;
  const lag = Number.isFinite(indexerBlock) && Number.isFinite(chainBlock) ? chainBlock - indexerBlock : null;
  const findings = { graphqlUrl: config.graphqlUrl, meta, rpcBlock, indexerBlock, chainBlock, lag, maxLagBlocks: config.indexer?.maxLagBlocks };
  const problems = [];
  if (!meta.ok || typeof indexerBlock !== "number") problems.push("GraphQL _meta.block.number was not usable");
  if (!rpcBlock.ok || !Number.isFinite(chainBlock)) problems.push("RPC block number was not usable for lag comparison");
  if (lag !== null && lag > (config.indexer?.maxLagBlocks ?? 300)) problems.push(`indexer lag ${lag} blocks exceeds budget`);
  if (problems.length > 0) return fail(`Testnet indexer failed: ${problems.join("; ")}.`, { findings });
  return pass(`Testnet indexer is at block ${indexerBlock} (${lag} blocks behind RPC).`, { findings });
});
