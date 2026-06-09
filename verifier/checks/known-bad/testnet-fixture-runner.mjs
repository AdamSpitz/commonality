import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { emit, fail, pass, readInputs, truncate, workspacePath } from "../lib/result.mjs";

function paramsInput(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function startServer(routes) {
  const server = createServer((req, res) => {
    const route = routes[req.url] ?? routes[req.url?.split("?")[0]] ?? routes["*"];
    const status = route ? (route.status ?? 200) : 404;
    const headers = route?.headers ?? { "content-type": "text/plain" };
    const body = typeof route?.body === "function" ? route.body(req) : (route?.body ?? "not found");
    res.writeHead(status, headers);
    res.end(body);
  });
  return listen(server).then((port) => ({ server, baseUrl: `http://127.0.0.1:${port}` }));
}

async function writeFixtureFiles(config, envText = "", label = "fixture") {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fixture";
  const dir = path.resolve(process.cwd(), "tmp", "verifier-known-bad-testnet", safeLabel);
  await mkdir(dir, { recursive: true });
  const configPath = `${dir}/testnet.fixture.json`;
  const envPath = `${dir}/contracts.fixture.env`;
  await writeFile(envPath, envText);
  await writeFile(configPath, JSON.stringify({ ...config, contractsEnvFile: envPath }, null, 2));
  return { configPath, envPath };
}

function runTarget(targetScript, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", [targetScript], {
      cwd: path.resolve(workspacePath()),
      env: { ...process.env, VERIFIER_WORKSPACE: path.resolve(workspacePath()), VERIFIER_INPUTS: "[]", VERIFIER_CHECK_ID: `known-bad-target:${targetScript}`, ...extraEnv },
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

function rpcBody(result) {
  return JSON.stringify({ jsonrpc: "2.0", id: 1, result });
}

async function runCase(testCase) {
  const { server, baseUrl } = await startServer(testCase.routes ?? {});
  try {
    const config = typeof testCase.config === "function" ? testCase.config(baseUrl) : testCase.config;
    const { configPath } = await writeFixtureFiles(config, testCase.envText ?? "", testCase.label);
    const run = await runTarget(testCase.targetScript, {
      COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: "1",
      COMMONALITY_TESTNET_RPC_URL: `${baseUrl}/rpc`,
      COMMONALITY_VERIFIER_TESTNET_CONFIG_PATH: configPath
    });
    if (run.error) throw new Error(run.error.message);
    const result = parseResult(run.stdout);
    const expectedStatuses = new Set(testCase.expectedStatuses ?? ["fail"]);
    const findings = { label: testCase.label, targetStatus: result.status, targetSummary: result.summary, targetFindings: result.findings, stderr: truncate(run.stderr) };
    return { ok: expectedStatuses.has(result.status), findings };
  } catch (error) {
    return { ok: false, findings: { label: testCase.label, error: error.message } };
  } finally {
    server.close();
  }
}

const baseConfig = (baseUrl) => ({
  schemaVersion: 1,
  name: "known-bad-testnet",
  chainId: 84532,
  rpcUrlEnv: "COMMONALITY_TESTNET_RPC_URL",
  graphqlUrl: `${baseUrl}/graphql`,
  appUrl: `${baseUrl}/`,
  appUrls: [`${baseUrl}/`],
  expectedHosts: [],
  serviceUrls: [],
  expectedConfig: { forbiddenText: ["localhost", "127.0.0.1", "31337"], requiredText: ["expected-indexer.example"] },
  contractAddressKeys: ["KNOWN_BAD_CONTRACT"]
});

const cannedCases = {
  "rpc-wrong-chain": {
    label: "testnet.rpc rejects the wrong chain id",
    targetScript: "checks/testnet/rpc.mjs",
    config: baseConfig,
    routes: { "/rpc": { headers: { "content-type": "application/json" }, body: rpcBody("0x1") } }
  },
  "indexer-stale": {
    label: "testnet.indexer rejects stale indexer lag",
    targetScript: "checks/testnet/indexer.mjs",
    config: (baseUrl) => ({ ...baseConfig(baseUrl), indexer: { maxLagBlocks: 10 } }),
    routes: {
      "/rpc": { headers: { "content-type": "application/json" }, body: rpcBody("0x3e8") },
      "/graphql": { headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { _meta: { block: { number: 1 } } } }) }
    }
  },
  "blank-app-shell": {
    label: "testnet.app-shell rejects blank HTML responses",
    targetScript: "checks/testnet/app-shell.mjs",
    config: baseConfig,
    routes: { "/": { headers: { "content-type": "text/html" }, body: "" } }
  },
  "forbidden-app-config": {
    label: "testnet.app-config rejects local-dev bundle config",
    targetScript: "checks/testnet/app-config.mjs",
    config: (baseUrl) => ({ ...baseConfig(baseUrl), expectedConfig: { forbiddenText: ["localhost"], requiredText: ["expected-indexer.example"] } }),
    routes: {
      "/": { headers: { "content-type": "text/html" }, body: "<html><script src='/app.js'></script></html>" },
      "/app.js": { headers: { "content-type": "application/javascript" }, body: "const rpc='http://localhost:8545';" }
    }
  },
  "contract-no-bytecode": {
    label: "testnet.contracts rejects configured address with no bytecode",
    targetScript: "checks/testnet/contracts.mjs",
    config: baseConfig,
    envText: "KNOWN_BAD_CONTRACT=0x0000000000000000000000000000000000000001\n",
    routes: { "/rpc": { headers: { "content-type": "application/json" }, body: rpcBody("0x") } }
  }
};

emit(async () => {
  const params = paramsInput(readInputs());
  const selected = params.cases ?? Object.keys(cannedCases);
  const results = await Promise.all(selected.map((name) => runCase(cannedCases[name])));
  const bad = results.filter((result) => !result.ok);
  const findings = { cases: results.map((result) => result.findings) };
  if (bad.length > 0) return fail(`Focused testnet known-bad fixtures missed ${bad.length}/${results.length} case(s).`, { findings });
  return pass(`Focused testnet checks rejected ${results.length} known-bad fixture(s).`, { findings });
});
