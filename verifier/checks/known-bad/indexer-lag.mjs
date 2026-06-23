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

async function runCase(testCase, artifactRoot) {
  let chainBlock = 100;
  let indexerBlock = 100;
  const rpc = await startJsonServer((payload) => {
    if (payload.method === "eth_blockNumber") return { jsonrpc: "2.0", id: payload.id, result: `0x${chainBlock.toString(16)}` };
    if (payload.method === "evm_mine") {
      chainBlock += 1;
      if (testCase.catchesUp) indexerBlock = chainBlock;
      return { jsonrpc: "2.0", id: payload.id, result: "0x0" };
    }
    return { jsonrpc: "2.0", id: payload.id, error: { message: `unsupported ${payload.method}` } };
  });
  const gql = await startJsonServer((payload) => ({
    data: { _meta: { block: { number: indexerBlock }, status: { foundry: { block: { number: indexerBlock } } } } }
  }));
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
  const cases = [
    { name: "caught-up-passes", catchesUp: true, expect: (result) => result.status === "pass" },
    { name: "stuck-indexer-fails", catchesUp: false, expect: (result) => result.status === "fail" && /lag/i.test(result.summary) }
  ];
  const results = [];
  for (const testCase of cases) results.push(await runCase(testCase, artifactRoot));
  const failures = results.filter((result) => !result.ok);
  const findings = { cases: results.map((result) => result.findings) };
  if (failures.length > 0) return fail(`operations.indexer-lag known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  return pass(`operations.indexer-lag known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
