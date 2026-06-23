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
    const sampleCount = endpoint.sampleCount ?? params.sampleCount ?? 5;
    if (!Number.isInteger(sampleCount) || sampleCount < 1) {
      throw new Error(`Endpoint ${endpoint.name} sampleCount must be a positive integer.`);
    }
    return {
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method ?? "GET",
      expectedStatus: endpoint.expectedStatus ?? 200,
      maxLatencyMs: endpoint.maxLatencyMs ?? params.maxLatencyMs ?? 1000,
      sampleCount,
      p95MaxLatencyMs: endpoint.p95MaxLatencyMs ?? params.p95MaxLatencyMs ?? endpoint.maxLatencyMs ?? params.maxLatencyMs ?? 1000
    };
  });
}

async function probeOnce(endpoint, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(endpoint.url, { method: endpoint.method, signal: controller.signal });
    await response.arrayBuffer();
    return {
      ok: response.status === endpoint.expectedStatus,
      status: response.status,
      latencyMs: Math.round(performance.now() - started)
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : error?.message ?? String(error),
      latencyMs: Math.round(performance.now() - started)
    };
  } finally {
    clearTimeout(timer);
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function probe(endpoint, timeoutMs) {
  const samples = [];
  for (let index = 0; index < endpoint.sampleCount; index += 1) {
    samples.push(await probeOnce(endpoint, timeoutMs));
  }

  const successfulLatencies = samples.filter((sample) => !sample.error && sample.status === endpoint.expectedStatus).map((sample) => sample.latencyMs);
  return {
    ...endpoint,
    samples,
    ok: samples.every((sample) => sample.ok),
    status: samples.at(-1)?.status,
    error: samples.find((sample) => sample.error)?.error,
    latencyMs: Math.max(...samples.map((sample) => sample.latencyMs)),
    p95LatencyMs: percentile(successfulLatencies, 95)
  };
}

function problemsFor(results) {
  const problems = [];
  for (const result of results) {
    if (result.error) {
      problems.push(`${result.name}: ${result.error}`);
      continue;
    }
    const badStatuses = result.samples.filter((sample) => !sample.error && sample.status !== result.expectedStatus);
    if (badStatuses.length > 0) {
      const statuses = [...new Set(badStatuses.map((sample) => sample.status))].join(", ");
      problems.push(`${result.name}: ${badStatuses.length}/${result.samples.length} sample(s) returned HTTP ${statuses}, expected ${result.expectedStatus}.`);
    }
    if (result.latencyMs > result.maxLatencyMs) {
      problems.push(`${result.name}: worst sample ${result.latencyMs}ms exceeds ${result.maxLatencyMs}ms per-request budget.`);
    }
    if (result.p95LatencyMs !== null && result.p95LatencyMs > result.p95MaxLatencyMs) {
      problems.push(`${result.name}: p95 ${result.p95LatencyMs}ms exceeds ${result.p95MaxLatencyMs}ms budget.`);
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
    const sampleSummary = result.samples.map((sample) => sample.error ?? `HTTP ${sample.status} in ${sample.latencyMs}ms`).join("; ");
    lines.push(`- ${result.name}: ${result.method} ${result.url} -> p95 ${result.p95LatencyMs ?? "n/a"}ms (budget ${result.p95MaxLatencyMs}ms), worst ${result.latencyMs}ms (budget ${result.maxLatencyMs}ms), samples: ${sampleSummary}`);
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
