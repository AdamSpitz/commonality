import { emit, fail, pass, readInputs, writeTextArtifact } from "../lib/result.mjs";

function mergedParams() {
  return Object.assign({}, ...readInputs().filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

async function rpcCall(url, method, params = [], timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok && !payload?.error, status: response.status, result: payload?.result, error: payload?.error };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : error?.message ?? String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function graphqlQuery(url, query, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok && !payload?.errors, status: response.status, payload };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : error?.message ?? String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function extractIndexerBlock(meta, chainSlug) {
  const data = meta?.payload?.data?._meta;
  if (typeof data?.block?.number === "number") return data.block.number;
  const status = data?.status;
  const networkStatus = status?.[chainSlug] ?? Object.values(status ?? {})[0];
  return typeof networkStatus?.block?.number === "number" ? networkStatus.block.number : null;
}

function renderReport({ params, before, afterMine, samples, problems }) {
  const lines = [
    "# Indexer lag burst probe",
    "",
    "Guarded local-stack probe that advances the local chain by a small burst of blocks, then polls the indexer _meta block until it catches up or breaches the configured lag budget.",
    "",
    `- RPC URL: ${params.rpcUrl}`,
    `- GraphQL URL: ${params.graphqlUrl}`,
    `- Burst blocks: ${params.burstBlocks}`,
    `- Max lag blocks: ${params.maxLagBlocks}`,
    `- Polls: ${params.pollCount} every ${params.pollIntervalMs}ms`,
    "",
    "## Observations",
    "",
    `- Before: chain=${before.chainBlock ?? "n/a"}, indexer=${before.indexerBlock ?? "n/a"}, lag=${before.lag ?? "n/a"}`,
    `- After mining: chain=${afterMine.chainBlock ?? "n/a"}`,
    ...samples.map((sample, index) => `- Poll ${index + 1}: chain=${sample.chainBlock ?? "n/a"}, indexer=${sample.indexerBlock ?? "n/a"}, lag=${sample.lag ?? "n/a"}`),
    "",
    "## Problems",
    ""
  ];
  if (problems.length === 0) lines.push("_None._");
  else for (const problem of problems) lines.push(`- ${problem}`);
  lines.push("");
  return lines.join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sample(params) {
  const [rpc, meta] = await Promise.all([
    rpcCall(params.rpcUrl, "eth_blockNumber", [], params.timeoutPerRequestMs),
    graphqlQuery(params.graphqlUrl, "{ _meta { block { number } status } }", params.timeoutPerRequestMs)
  ]);
  const chainBlock = rpc.ok ? Number.parseInt(rpc.result, 16) : null;
  const indexerBlock = meta.ok ? extractIndexerBlock(meta, params.chainSlug) : null;
  const lag = Number.isFinite(chainBlock) && Number.isFinite(indexerBlock) ? chainBlock - indexerBlock : null;
  return { rpc, meta, chainBlock, indexerBlock, lag };
}

emit(async () => {
  const params = {
    requireEnv: "COMMONALITY_VERIFIER_ALLOW_E2E_STACK",
    rpcUrl: "http://127.0.0.1:8545",
    graphqlUrl: "http://localhost:42069/graphql",
    chainSlug: "foundry",
    burstBlocks: 20,
    maxLagBlocks: 5,
    pollCount: 10,
    pollIntervalMs: 1000,
    timeoutPerRequestMs: 5000,
    ...mergedParams()
  };

  if (params.requireEnv && !process.env[params.requireEnv]) {
    return {
      status: "error",
      summary: `Refusing to run indexer lag burst probe; missing required opt-in/env ${params.requireEnv}.`,
      findings: { requiredEnv: params.requireEnv }
    };
  }

  const before = await sample(params);
  const problems = [];
  if (!Number.isFinite(before.chainBlock)) problems.push("RPC eth_blockNumber was not usable before the burst.");
  if (!Number.isFinite(before.indexerBlock)) problems.push("Indexer GraphQL _meta block was not usable before the burst.");

  for (let index = 0; index < params.burstBlocks; index += 1) {
    const mined = await rpcCall(params.rpcUrl, "evm_mine", [], params.timeoutPerRequestMs);
    if (!mined.ok) {
      problems.push(`Could not mine burst block ${index + 1}/${params.burstBlocks}: ${mined.error?.message ?? mined.error ?? `HTTP ${mined.status}`}.`);
      break;
    }
  }

  const afterMine = await sample(params);
  const samples = [];
  for (let index = 0; index < params.pollCount; index += 1) {
    const current = index === 0 ? afterMine : await sample(params);
    samples.push(current);
    if (Number.isFinite(current.lag) && current.lag <= params.maxLagBlocks) break;
    if (index + 1 < params.pollCount) await sleep(params.pollIntervalMs);
  }

  const final = samples.at(-1) ?? afterMine;
  if (!Number.isFinite(final.chainBlock)) problems.push("RPC eth_blockNumber was not usable after the burst.");
  if (!Number.isFinite(final.indexerBlock)) problems.push("Indexer GraphQL _meta block was not usable after the burst.");
  if (Number.isFinite(final.lag) && final.lag > params.maxLagBlocks) {
    problems.push(`Indexer lag ${final.lag} blocks exceeds ${params.maxLagBlocks}-block budget after burst.`);
  }

  const findings = { params, before, afterMine, samples, problems };
  const artifact = await writeTextArtifact("indexer-lag.md", renderReport({ params, before, afterMine, samples, problems }), "text/markdown", "Indexer lag burst probe report.");
  if (problems.length > 0) return fail(`Indexer lag burst probe found ${problems.length} problem(s).`, { findings, artifacts: [artifact] });
  return pass(`Indexer caught up within ${final.lag} block(s) after a ${params.burstBlocks}-block burst.`, { findings, artifacts: [artifact] });
});
