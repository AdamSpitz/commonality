import { performance } from "node:perf_hooks";
import { emit, fail, pass, readInputs, writeTextArtifact } from "../lib/result.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function parseEndpoints(params) {
  const endpoints = params.endpoints ?? [];
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    throw new Error("params.endpoints must contain at least one endpoint.");
  }

  return endpoints.map((endpoint, index) => {
    if (typeof endpoint?.name !== "string" || endpoint.name.length === 0) {
      throw new Error(`Endpoint at index ${index} must have a non-empty name.`);
    }
    if (typeof endpoint?.url !== "string" || endpoint.url.length === 0) {
      throw new Error(`Endpoint ${endpoint.name} must have a non-empty url.`);
    }
    return {
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method ?? "GET",
      expectedStatus: endpoint.expectedStatus ?? 200,
      maxLatencyMs: endpoint.maxLatencyMs ?? params.maxLatencyMs ?? 1000
    };
  });
}

async function probe(endpoint, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(endpoint.url, { method: endpoint.method, signal: controller.signal });
    await response.arrayBuffer();
    return {
      ...endpoint,
      ok: response.status === endpoint.expectedStatus,
      status: response.status,
      latencyMs: Math.round(performance.now() - started)
    };
  } catch (error) {
    return {
      ...endpoint,
      ok: false,
      error: error?.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : error?.message ?? String(error),
      latencyMs: Math.round(performance.now() - started)
    };
  } finally {
    clearTimeout(timer);
  }
}

function problemsFor(results) {
  const problems = [];
  for (const result of results) {
    if (result.error) {
      problems.push(`${result.name}: ${result.error}`);
      continue;
    }
    if (result.status !== result.expectedStatus) {
      problems.push(`${result.name}: HTTP ${result.status}, expected ${result.expectedStatus}.`);
    }
    if (result.latencyMs > result.maxLatencyMs) {
      problems.push(`${result.name}: ${result.latencyMs}ms exceeds ${result.maxLatencyMs}ms budget.`);
    }
  }
  return problems;
}

function renderReport({ results, problems }) {
  const lines = [
    "# Seeded stack latency probe",
    "",
    "Cheap real HTTP latency/availability probe for a running seeded local stack. This complements the bundle-size performance budget with a live endpoint signal.",
    "",
    "## Endpoints",
    ""
  ];
  for (const result of results) {
    lines.push(`- ${result.name}: ${result.method} ${result.url} -> ${result.error ?? `HTTP ${result.status}`} in ${result.latencyMs}ms (budget ${result.maxLatencyMs}ms)`);
  }
  lines.push("", "## Problems", "");
  if (problems.length === 0) lines.push("_None._");
  else for (const problem of problems) lines.push(`- ${problem}`);
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const params = mergedParams(readInputs());
  if (params.requireEnv && !process.env[params.requireEnv]) {
    return {
      status: "error",
      summary: `Refusing to probe seeded stack; missing required opt-in/env ${params.requireEnv}.`,
      findings: { requireEnv: params.requireEnv }
    };
  }

  const endpoints = parseEndpoints(params);
  const timeoutMs = params.timeoutPerRequestMs ?? 5000;
  const results = await Promise.all(endpoints.map((endpoint) => probe(endpoint, timeoutMs)));
  const problems = problemsFor(results);
  const artifact = await writeTextArtifact(
    "seeded-stack-latency.md",
    renderReport({ results, problems }),
    "text/markdown",
    "Seeded local stack endpoint latency report."
  );
  const findings = { timeoutPerRequestMs: timeoutMs, results, problems };

  if (problems.length > 0) {
    return fail(`Seeded stack latency probe found ${problems.length} problem(s).`, { findings, artifacts: [artifact] });
  }

  return pass(`Seeded stack latency probe passed for ${results.length} endpoint(s).`, { findings, artifacts: [artifact] });
});
