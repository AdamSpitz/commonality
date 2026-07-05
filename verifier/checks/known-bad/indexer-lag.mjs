import { spawn } from "node:child_process";
import http from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

const TARGET_SCRIPT = "checks/operations/indexer-lag.mjs";

function startJsonServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        Promise.resolve(handler(JSON.parse(body || "{}"))).then((payload) => {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(payload));
        }).catch((error) => {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        });
      });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function runTarget(params, runId, artifactRoot) {
  return new Promise((resolve) => {
    const child = spawn("node", [TARGET_SCRIPT], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_CHECK_ID: "known-bad-target:operations.indexer-lag",
        VERIFIER_RUN_ID: runId,
        VERIFIER_ARTIFACTS_DIR: path.join(artifactRoot, runId, "target-artifacts"),
        VERIFIER_INPUTS: JSON.stringify([{ kind: "params", data: { ...params, requireEnv: "COMMONALITY_VERIFIER_ALLOW_E2E_STACK" } }]),
        COMMONALITY_VERIFIER_ALLOW_E2E_STACK: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
    child.on("error", (error) => resolve({ stdout, stderr, error }));
  });
}

function parse(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw new Error(`expected one stdout line, got ${lines.length}`);
  return JSON.parse(lines[0]);
}

// Build a pair of mock servers sharing one mutable state object. The RPC server
// advances the chain (and, when `catchesUp`/`dataAdvances` are set, the indexer
// block and the data-canary value) on each evm_mine. The GraphQL server returns
// both the _meta block and the canary field, so the same endpoint serves the
// block-lag sample and the data-canary sample the target issues.
async function startMockPair({ catchesUp, dataAdvances }) {
  const state = { chainBlock: 100, indexerBlock: 100, dataValue: 100 };
  const rpc = await startJsonServer((payload) => {
    if (payload.method === "eth_blockNumber") return { jsonrpc: "2.0", id: payload.id, result: `0x${state.chainBlock.toString(16)}` };
    if (payload.method === "evm_mine") {
      state.chainBlock += 1;
      if (catchesUp) state.indexerBlock = state.chainBlock;
      if (dataAdvances) state.dataValue += 1;
      return { jsonrpc: "2.0", id: payload.id, result: "0x0" };
    }
    return { jsonrpc: "2.0", id: payload.id, error: { message: `unsupported ${payload.method}` } };
  });
  const gql = await startJsonServer(() => ({
    data: {
      _meta: { block: { number: state.indexerBlock }, status: { foundry: { block: { number: state.indexerBlock } } } },
      canary: { count: state.dataValue }
    }
  }));
  return { rpc, gql };
}

async function runCase(testCase, artifactRoot) {
  const { rpc, gql } = await startMockPair(testCase);
  try {
    const params = {
      rpcUrl: `http://127.0.0.1:${rpc.address().port}`,
      graphqlUrl: `http://127.0.0.1:${gql.address().port}`,
      chainSlug: "foundry",
      burstBlocks: 5,
      maxLagBlocks: 1,
      pollCount: 2,
      pollIntervalMs: 1,
      timeoutPerRequestMs: 1000
    };
    if (testCase.dataCanary) {
      params.dataCanary = { graphqlQuery: "{ canary { count } }", resultPath: "canary.count", minIncrease: 1 };
    }
    if (testCase.eventBurstCommand) params.eventBurstCommand = testCase.eventBurstCommand;
    await mkdir(path.join(artifactRoot, testCase.name), { recursive: true });
    const run = await runTarget(params, testCase.name, artifactRoot);
    const result = parse(run.stdout);
    const ok = testCase.expect(result);
    return { ok, findings: { name: testCase.name, targetStatus: result.status, targetSummary: result.summary, stdout: truncate(run.stdout), stderr: truncate(run.stderr), exitCode: run.exitCode } };
  } finally {
    await close(rpc);
    await close(gql);
  }
}

emit(async () => {
  const artifactRoot = artifactsDir();
  // Match against findings.problems (the per-problem text) rather than the
  // generic summary, which always contains the word "lag" because the probe
  // itself is named "indexer lag burst probe".
  const hasProblem = (result, re) => (result.findings?.problems ?? []).some((p) => re.test(p));
  const cases = [
    // Block-lag-only behaviour (no data canary): the original contract.
    { name: "caught-up-passes", catchesUp: true, dataAdvances: false, expect: (result) => result.status === "pass" },
    { name: "stuck-indexer-fails", catchesUp: false, dataAdvances: false, expect: (result) => result.status === "fail" && hasProblem(result, /exceeds .* budget/i) },
    // Data-canary behaviour: a caught-up block number is not enough — the
    // indexed application value must actually advance, or the check fails.
    { name: "canary-caught-up-passes", catchesUp: true, dataAdvances: true, dataCanary: true, expect: (result) => result.status === "pass" && /advanced by/i.test(result.summary) },
    { name: "canary-block-advances-data-stuck-fails", catchesUp: true, dataAdvances: false, dataCanary: true, expect: (result) => result.status === "fail" && hasProblem(result, /data canary/i) && !hasProblem(result, /exceeds .* budget/i) },
    // Event-burst command behaviour: command failure is a concrete failed probe,
    // not a silent pass hidden behind block-lag catch-up.
    { name: "event-command-failure-fails", catchesUp: true, dataAdvances: false, eventBurstCommand: ["/bin/false"], expect: (result) => result.status === "fail" && hasProblem(result, /Event burst command failed/i) }
  ];
  const results = [];
  for (const testCase of cases) results.push(await runCase(testCase, artifactRoot));
  const failures = results.filter((result) => !result.ok);
  const findings = { cases: results.map((result) => result.findings) };
  if (failures.length > 0) return fail(`operations.indexer-lag known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  return pass(`operations.indexer-lag known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
