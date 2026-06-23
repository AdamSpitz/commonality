import { spawn } from "node:child_process";
import http from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for operations.seeded-stack-latency. Proves the
// live HTTP probe actually catches the failure modes it claims to, and does not
// false-fail against a healthy endpoint:
//   (a) a fast 200 endpoint passes (no false positive),
//   (b) a wrong-status (500) endpoint is flagged as a failure,
//   (c) a slow endpoint breaches the per-request and p95 latency budgets and is
//       flagged as a failure.
//
// Hermetic: spins up a local HTTP server on an ephemeral port and points the
// target's `endpoints` params at it, so no real stack has to be running.

const TARGET_SCRIPT = "checks/operations/seeded-stack-latency.mjs";

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/ok") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      }
      if (url.pathname === "/bad-status") {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("nope");
        return;
      }
      if (url.pathname === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("slow");
        }, 300);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function runTarget(inputs, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", [TARGET_SCRIPT], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(inputs),
        ...extraEnv
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

function parseSingleResult(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length !== 1) {
    throw new Error(`Target emitted ${lines.length} stdout line(s), expected exactly one JSON Result.`);
  }
  const result = JSON.parse(lines[0]);
  if (!result || typeof result.status !== "string" || typeof result.summary !== "string") {
    throw new Error("Target stdout was JSON but not a verifier Result with status and summary.");
  }
  return result;
}

function paramsInput(data) {
  return [{ kind: "params", data }];
}

function problemText(result) {
  const problems = Array.isArray(result.findings?.problems) ? result.findings.problems : [];
  return problems.join("\n");
}

async function runCase(testCase, port, fixtureArtifacts) {
  const targetArtifacts = path.join(fixtureArtifacts, testCase.name, "target-artifacts");
  await mkdir(targetArtifacts, { recursive: true });

  const inputs = paramsInput({
    timeoutPerRequestMs: 5000,
    sampleCount: 3,
    ...testCase.params(port)
  });

  const run = await runTarget(inputs, {
    VERIFIER_CHECK_ID: `known-bad-target:operations.seeded-stack-latency`,
    VERIFIER_RUN_ID: testCase.name,
    VERIFIER_ARTIFACTS_DIR: targetArtifacts
  });

  const base = {
    name: testCase.name,
    stdout: truncate(run.stdout),
    stderr: truncate(run.stderr),
    exitCode: run.exitCode,
    inputs
  };

  if (run.error) {
    return { ok: false, summary: `${testCase.name}: could not launch target`, findings: { ...base, error: run.error.message } };
  }

  let result;
  try {
    result = parseSingleResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target did not emit a parseable Result`, findings: { ...base, parseError: error.message } };
  }

  const problems = problemText(result);
  const findings = { ...base, targetStatus: result.status, targetSummary: result.summary, targetProblems: truncate(problems, 2000) };
  const ok = testCase.check(result, problems);
  return {
    ok,
    summary: ok
      ? `${testCase.name}: operations.seeded-stack-latency behaved as expected (${result.status}).`
      : `${testCase.name}: operations.seeded-stack-latency returned ${result.status}, not as expected.`,
    findings
  };
}

emit(async () => {
  const fixtureArtifacts = artifactsDir();
  const server = await startServer();
  const port = server.address().port;

  const cases = [
    {
      name: "healthy-endpoint-passes",
      params: (p) => ({
        maxLatencyMs: 1000,
        p95MaxLatencyMs: 1000,
        endpoints: [{ name: "ok", url: `http://127.0.0.1:${p}/ok`, expectedStatus: 200, maxLatencyMs: 1000, p95MaxLatencyMs: 1000 }]
      }),
      check: (result) => result.status === "pass"
    },
    {
      name: "wrong-status-fails",
      params: (p) => ({
        maxLatencyMs: 1000,
        p95MaxLatencyMs: 1000,
        endpoints: [{ name: "bad-status", url: `http://127.0.0.1:${p}/bad-status`, expectedStatus: 200, maxLatencyMs: 1000, p95MaxLatencyMs: 1000 }]
      }),
      check: (result, problems) =>
        result.status === "fail" && /returned HTTP 500/.test(problems)
    },
    {
      name: "latency-budget-fails",
      params: (p) => ({
        maxLatencyMs: 100,
        p95MaxLatencyMs: 100,
        endpoints: [{ name: "slow", url: `http://127.0.0.1:${p}/slow`, expectedStatus: 200, maxLatencyMs: 100, p95MaxLatencyMs: 100 }]
      }),
      check: (result, problems) =>
        result.status === "fail" && /exceeds \d+ms budget/.test(problems)
    }
  ];

  try {
    const results = [];
    for (const testCase of cases) {
      results.push(await runCase(testCase, port, fixtureArtifacts));
    }
    const failures = results.filter((r) => !r.ok);
    const findings = { cases: results.map((r) => r.findings) };
    if (failures.length > 0) {
      return fail(`operations.seeded-stack-latency known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
    }
    return pass(`operations.seeded-stack-latency known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
  } finally {
    await closeServer(server);
  }
});
