import { emit, errorResult, fail, pass, truncate } from "../lib/result.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    return { url, ok: response.ok, status: response.status, body: truncate(body, 1000) };
  } finally {
    clearTimeout(timeout);
  }
}

emit(async () => {
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE !== "1") {
    return errorResult("Refusing to run testnet smoke without COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1.", {
      findings: { requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE", "COMMONALITY_TESTNET_RPC_URL", "COMMONALITY_TESTNET_GRAPHQL_URL", "COMMONALITY_TESTNET_APP_URL"] }
    });
  }

  let rpcUrl;
  let graphqlUrl;
  let appUrl;
  try {
    rpcUrl = requiredEnv("COMMONALITY_TESTNET_RPC_URL");
    graphqlUrl = requiredEnv("COMMONALITY_TESTNET_GRAPHQL_URL");
    appUrl = requiredEnv("COMMONALITY_TESTNET_APP_URL");
  } catch (e) {
    return errorResult(`Testnet smoke is missing configuration: ${e.message}`);
  }

  const rpc = await fetchText(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })
  });
  const graphql = await fetchText(graphqlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "{ _meta { block { number } } }" })
  });
  const app = await fetchText(appUrl);

  const probes = { rpc, graphql, app };
  const failed = Object.entries(probes).filter(([, probe]) => !probe.ok);
  if (failed.length > 0) {
    return fail(`Testnet smoke failed: ${failed.map(([name, probe]) => `${name} HTTP ${probe.status}`).join(", ")}.`, { findings: probes });
  }

  return pass("Testnet smoke passed for configured RPC, GraphQL, and app URL.", { findings: probes });
});
