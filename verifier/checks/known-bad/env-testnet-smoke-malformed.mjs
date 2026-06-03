import { spawn } from "node:child_process";
import http from "node:http";
import { emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function makeServer() {
  return http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/rpc") {
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: null }));
    } else if (req.url === "/graphql") {
      res.end(JSON.stringify({ errors: [{ message: "indexer exploded" }] }));
    } else if (req.url === "/app") {
      res.setHeader("content-type", "text/html");
      res.end("");
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    }
  });
}

function runTarget(port) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/env/testnet-smoke.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: "[]",
        VERIFIER_CHECK_ID: "known-bad-target:env.testnet-smoke-malformed",
        COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: "1",
        COMMONALITY_TESTNET_RPC_URL: `http://127.0.0.1:${port}/rpc`,
        COMMONALITY_TESTNET_GRAPHQL_URL: `http://127.0.0.1:${port}/graphql`,
        COMMONALITY_TESTNET_APP_URL: `http://127.0.0.1:${port}/app`
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
  if (lines.length !== 1) throw new Error(`Target emitted ${lines.length} stdout line(s), expected exactly one.`);
  return JSON.parse(lines[0]);
}

emit(async () => {
  const server = makeServer();
  const port = await listen(server);
  try {
    const run = await runTarget(port);
    if (run.error) throw run.error;
    const targetResult = parseResult(run.stdout);
    const findings = {
      targetStatus: targetResult.status,
      targetSummary: targetResult.summary,
      targetFindings: targetResult.findings,
      targetExitCode: run.exitCode,
      targetStderr: truncate(run.stderr)
    };

    if (targetResult.status === "fail") {
      return pass("env.testnet-smoke malformed-success fixtures were rejected.", { findings });
    }

    return fail(`env.testnet-smoke malformed-success fixtures unexpectedly returned ${targetResult.status}.`, { findings });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
