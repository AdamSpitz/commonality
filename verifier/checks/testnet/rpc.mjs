import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const chain = await rpcCall(rpcUrl, "eth_chainId");
  const block = await rpcCall(rpcUrl, "eth_blockNumber");
  const findings = { expectedChainId: config.chainId, chain, block };
  const actualChainId = chain.ok && typeof chain.result === "string" ? Number.parseInt(chain.result, 16) : null;
  const blockNumber = block.ok && typeof block.result === "string" ? Number.parseInt(block.result, 16) : null;
  const problems = [];
  if (!chain.ok || actualChainId !== config.chainId) problems.push(`chainId ${actualChainId ?? "unreadable"} != ${config.chainId}`);
  if (!block.ok || !Number.isFinite(blockNumber) || blockNumber <= 0) problems.push("blockNumber was not usable");
  if (problems.length > 0) return fail(`Testnet RPC failed: ${problems.join("; ")}.`, { findings });
  return pass(`Testnet RPC is on chain ${actualChainId} at block ${blockNumber}.`, { findings: { ...findings, actualChainId, blockNumber } });
});
