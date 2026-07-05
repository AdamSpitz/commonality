import { spawn } from "node:child_process";
import { emit, fail, pass, readInputs, truncate, writeTextArtifact } from "../lib/result.mjs";

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

// Navigate a dot path (e.g. "canary.count") into the GraphQL response `data`
// object and return the numeric value there, or null if absent/non-numeric.
// This is what makes the data canary hard to fake: the check requires not just
// that _meta.block.number caught up, but that a real indexed application value
// actually advanced — so an indexer that reports a caught-up block number
// without having processed the burst's events cannot pass.
function readNumberAtPath(graphqlResponse, dotPath) {
  const segments = String(dotPath ?? "").split(".").filter(Boolean);
  let node = graphqlResponse?.payload?.data;
  for (const segment of segments) {
    if (node === null || typeof node !== "object") return null;
    node = node?.[segment];
  }
  return Number.isFinite(node) ? Number(node) : null;
}

function renderReport({ params, before, eventBurst, afterMine, samples, problems, canary }) {
  const lines = [
    "# Indexer lag burst probe",
    "",
    "Guarded local-stack probe that advances the local chain by a small burst of blocks, then polls the indexer _meta block until it catches up or breaches the configured lag budget.",
    "",
    `- RPC URL: ${params.rpcUrl}`,
    `- GraphQL URL: ${params.graphqlUrl}`,
    `- Burst blocks: ${params.burstBlocks}`,
    `- Max lag blocks: ${params.maxLagBlocks}`,
    `- Polls: ${params.pollCount} every ${params.pollIntervalMs}ms`
  ];
  if (params.dataCanary) {
    lines.push(
      `- Data canary: query \`${params.dataCanary.graphqlQuery}\` at \`${params.dataCanary.resultPath}\`, required increase ≥ ${params.dataCanary.minIncrease ?? 1}`
    );
  }
  if (params.eventBurstCommand) {
    lines.push(`- Event burst command: \`${params.eventBurstCommand.join(" ")}\``);
    lines.push(`- Event burst timeout: ${params.eventBurstTimeoutMs ?? params.timeoutPerRequestMs}ms`);
  }
  lines.push("", "## Observations", "");
  lines.push(`- Before: chain=${before.chainBlock ?? "n/a"}, indexer=${before.indexerBlock ?? "n/a"}, lag=${before.lag ?? "n/a"}`);
  if (canary) lines.push(`- Before canary: ${canary.before ?? "n/a"}`);
  if (eventBurst) lines.push(`- Event burst command: ${eventBurst.ok ? "ok" : "failed"} (exit ${eventBurst.exitCode ?? "n/a"})`);
  lines.push(`- After mining: chain=${afterMine.chainBlock ?? "n/a"}`);
  for (const [index, sample] of samples.entries()) {
    const canaryPart = canary ? `, canary=${canary.samples[index] ?? "n/a"}` : "";
    lines.push(`- Poll ${index + 1}: chain=${sample.chainBlock ?? "n/a"}, indexer=${sample.indexerBlock ?? "n/a"}, lag=${sample.lag ?? "n/a"}${canaryPart}`);
  }
  if (canary) lines.push(`- After canary: ${canary.after ?? "n/a"}, delta=${canary.delta ?? "n/a"}`);
  lines.push("", "## Problems", "");
  if (problems.length === 0) lines.push("_None._");
  else for (const problem of problems) lines.push(`- ${problem}`);
  lines.push("");
  return lines.join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactEventBurstResult(result) {
  return { ...result, stdout: truncate(result.stdout ?? ""), stderr: truncate(result.stderr ?? "") };
}

function runEventBurstCommand(command, timeoutMs) {
  if (!Array.isArray(command) || command.length === 0 || !command.every((part) => typeof part === "string" && part.length > 0)) {
    return Promise.resolve({ ok: false, error: "eventBurstCommand must be a non-empty string array." });
  }
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ ok: false, timedOut: true, error: `Timed out after ${timeoutMs}ms.`, stdout, stderr });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish({ ok: false, error: error.message, stdout, stderr });
    });
    child.on("close", (exitCode, signal) => {
      finish({ ok: exitCode === 0, exitCode, signal, stdout, stderr, error: exitCode === 0 ? null : `Exited with code ${exitCode ?? "n/a"}.` });
    });
  });
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

async function sampleCanary(params) {
  const response = await graphqlQuery(params.graphqlUrl, params.dataCanary.graphqlQuery, params.timeoutPerRequestMs);
  if (!response.ok) return { ok: false, value: null, response };
  const value = readNumberAtPath(response, params.dataCanary.resultPath);
  return { ok: Number.isFinite(value), value, response };
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

  const requestedCanary = params.dataCanary !== null && params.dataCanary !== undefined;
  const canaryMinIncrease = Number(params.dataCanary?.minIncrease ?? 1);
  const canaryConfigProblems = requestedCanary
    ? [
        ...(typeof params.dataCanary?.graphqlQuery === "string" && params.dataCanary.graphqlQuery.trim().length > 0
          ? []
          : ["Data canary is configured but missing a non-empty `graphqlQuery`."]),
        ...(typeof params.dataCanary?.resultPath === "string" && params.dataCanary.resultPath.trim().length > 0
          ? []
          : ["Data canary is configured but missing a non-empty `resultPath`."]),
        ...(Number.isFinite(canaryMinIncrease) && canaryMinIncrease > 0 ? [] : ["Data canary `minIncrease` must be a positive finite number."])
      ]
    : [];
  const useCanary = requestedCanary && canaryConfigProblems.length === 0;
  const canaryParams = useCanary
    ? { graphqlQuery: params.dataCanary.graphqlQuery, resultPath: params.dataCanary.resultPath, minIncrease: canaryMinIncrease }
    : null;

  const before = await sample(params);
  const problems = [...canaryConfigProblems];
  if (!Number.isFinite(before.chainBlock)) problems.push("RPC eth_blockNumber was not usable before the burst.");
  if (!Number.isFinite(before.indexerBlock)) problems.push("Indexer GraphQL _meta block was not usable before the burst.");

  let canary = null;
  if (useCanary) {
    const beforeCanary = await sampleCanary({ ...params, dataCanary: canaryParams });
    canary = { before: beforeCanary.value, after: null, delta: null, samples: [], beforeOk: beforeCanary.ok };
    if (!beforeCanary.ok) problems.push(`Data canary value at \`${canaryParams.resultPath}\` was not usable before the burst.`);
  }

  let eventBurst = null;
  if (params.eventBurstCommand) {
    eventBurst = await runEventBurstCommand(params.eventBurstCommand, params.eventBurstTimeoutMs ?? params.timeoutPerRequestMs);
    if (!eventBurst.ok) problems.push(`Event burst command failed: ${eventBurst.error ?? "unknown error"}`);
  }

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
    if (useCanary) {
      const canaryNow = await sampleCanary({ ...params, dataCanary: canaryParams });
      canary.samples.push(canaryNow.value);
    }
    if (Number.isFinite(current.lag) && current.lag <= params.maxLagBlocks) break;
    if (index + 1 < params.pollCount) await sleep(params.pollIntervalMs);
  }

  const final = samples.at(-1) ?? afterMine;
  if (!Number.isFinite(final.chainBlock)) problems.push("RPC eth_blockNumber was not usable after the burst.");
  if (!Number.isFinite(final.indexerBlock)) problems.push("Indexer GraphQL _meta block was not usable after the burst.");
  if (Number.isFinite(final.lag) && final.lag > params.maxLagBlocks) {
    problems.push(`Indexer lag ${final.lag} blocks exceeds ${params.maxLagBlocks}-block budget after burst.`);
  }

  if (useCanary) {
    const afterCanary = await sampleCanary({ ...params, dataCanary: canaryParams });
    canary.after = afterCanary.value;
    canary.delta = Number.isFinite(canary.before) && Number.isFinite(canary.after) ? canary.after - canary.before : null;
    if (!afterCanary.ok) {
      problems.push(`Data canary value at \`${canaryParams.resultPath}\` was not usable after the burst.`);
    } else if (canary.delta === null || canary.delta < canaryParams.minIncrease) {
      problems.push(
        `Data canary at \`${canaryParams.resultPath}\` advanced by ${canary.delta ?? "n/a"}, below the required ${canaryParams.minIncrease}; the indexer reported a caught-up block but did not reflect the burst's events in indexed application data.`
      );
    }
  }

  const findings = { params, before, ...(eventBurst ? { eventBurst: compactEventBurstResult(eventBurst) } : {}), afterMine, samples, problems, ...(canary ? { canary } : {}) };
  const artifact = await writeTextArtifact("indexer-lag.md", renderReport({ params, before, eventBurst, afterMine, samples, problems, canary }), "text/markdown", "Indexer lag burst probe report.");
  if (problems.length > 0) return fail(`Indexer lag burst probe found ${problems.length} problem(s).`, { findings, artifacts: [artifact] });
  const canaryNote = useCanary ? ` and indexed data advanced by ${canary.delta}` : "";
  return pass(`Indexer caught up within ${final.lag} block(s) after a ${params.burstBlocks}-block burst${canaryNote}.`, { findings, artifacts: [artifact] });
});
