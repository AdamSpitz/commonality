import { spawn } from "node:child_process";
import http from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

const TARGET_SCRIPT = "checks/operations/local-stack-health.mjs";

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ healthy: true }));
        return;
      }
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("unhealthy");
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function runTarget(inputs, artifacts, runId) {
  return new Promise((resolve) => {
    const child = spawn("node", [TARGET_SCRIPT], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(inputs),
        VERIFIER_CHECK_ID: "known-bad-target:operations.local-stack-health",
        VERIFIER_RUN_ID: runId,
        VERIFIER_ARTIFACTS_DIR: artifacts
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ error, stdout, stderr, exitCode: null }));
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
  });
}

function parseResult(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw new Error(`Target emitted ${lines.length} stdout line(s), expected one.`);
  return JSON.parse(lines[0]);
}

async function runCase(testCase, port, fixtureArtifacts) {
  const targetArtifacts = path.join(fixtureArtifacts, testCase.name, "target-artifacts");
  await mkdir(targetArtifacts, { recursive: true });
  const inputs = [{ kind: "params", data: { timeoutPerRequestMs: 500, services: testCase.services(port) } }];
  const run = await runTarget(inputs, targetArtifacts, testCase.name);
  const base = { name: testCase.name, stdout: truncate(run.stdout), stderr: truncate(run.stderr), exitCode: run.exitCode, inputs };
  if (run.error) return { ok: false, summary: `${testCase.name}: target launch failed`, findings: { ...base, error: run.error.message } };
  let result;
  try {
    result = parseResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target output was not parseable`, findings: { ...base, parseError: error.message } };
  }
  const problems = (result.findings?.problems ?? []).join("\n");
  const ok = testCase.check(result, problems);
  return { ok, summary: `${testCase.name}: operations.local-stack-health returned ${result.status}.`, findings: { ...base, targetStatus: result.status, targetSummary: result.summary, targetProblems: truncate(problems, 2000) } };
}

emit(async () => {
  const fixtureArtifacts = artifactsDir();
  const server = await startServer();
  const port = server.address().port;
  const cases = [
    {
      name: "healthy-service-passes",
      services: (p) => [{ name: "fixture api", url: `http://127.0.0.1:${p}/ok`, expectedStatus: 200, requireJsonPath: "healthy" }],
      check: (result) => result.status === "pass"
    },
    {
      name: "unreachable-service-fails-by-name",
      services: () => [{ name: "missing rpc", url: "http://127.0.0.1:9/", expectedStatus: 200 }],
      check: (result, problems) => result.status === "fail" && /missing rpc/.test(problems)
    },
    {
      name: "unhealthy-service-fails-by-name",
      services: (p) => [{ name: "bad api", url: `http://127.0.0.1:${p}/bad`, expectedStatus: 200 }],
      check: (result, problems) => result.status === "fail" && /bad api/.test(problems) && /HTTP 503/.test(problems)
    }
  ];
  try {
    const results = [];
    for (const testCase of cases) results.push(await runCase(testCase, port, fixtureArtifacts));
    const failures = results.filter((result) => !result.ok);
    const findings = { cases: results.map((result) => result.findings) };
    if (failures.length > 0) return fail(`operations.local-stack-health known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
    return pass(`operations.local-stack-health known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
  } finally {
    await closeServer(server);
  }
});
