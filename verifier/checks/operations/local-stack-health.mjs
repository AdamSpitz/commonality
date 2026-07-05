import { emit, fail, pass, readInputs, writeTextArtifact } from "../lib/result.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function parseServices(params) {
  const services = params.services ?? [];
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error("params.services must contain at least one service.");
  }
  return services.map((service, index) => {
    if (typeof service?.name !== "string" || service.name.length === 0) {
      throw new Error(`Service at index ${index} must have a non-empty name.`);
    }
    if (typeof service?.url !== "string" || service.url.length === 0) {
      throw new Error(`Service ${service.name} must have a non-empty url.`);
    }
    return {
      name: service.name,
      url: service.url,
      method: service.method ?? "GET",
      headers: service.headers ?? {},
      body: service.body,
      expectedStatus: service.expectedStatus ?? 200,
      requireJsonPath: service.requireJsonPath,
      requireText: service.requireText
    };
  });
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, part) => current?.[part], value);
}

async function probeService(service, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(service.url, {
      method: service.method,
      headers: service.headers,
      body: service.body === undefined ? undefined : JSON.stringify(service.body),
      signal: controller.signal
    });
    const text = await response.text();
    const result = { name: service.name, url: service.url, method: service.method, status: response.status, ok: response.status === service.expectedStatus };
    if (!result.ok) return { ...result, problem: `${service.name}: returned HTTP ${response.status}, expected ${service.expectedStatus}.` };
    if (service.requireText && !text.includes(service.requireText)) {
      return { ...result, ok: false, problem: `${service.name}: response did not contain required text ${JSON.stringify(service.requireText)}.` };
    }
    if (service.requireJsonPath) {
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return { ...result, ok: false, problem: `${service.name}: response was not valid JSON.` };
      }
      const value = getPath(json, service.requireJsonPath);
      if (value === undefined || value === null) {
        return { ...result, ok: false, problem: `${service.name}: JSON path ${service.requireJsonPath} was missing.` };
      }
      return { ...result, jsonPath: service.requireJsonPath, jsonPathValue: value };
    }
    return result;
  } catch (error) {
    const message = error?.name === "AbortError" ? `timed out after ${timeoutMs}ms` : error?.message ?? String(error);
    return { name: service.name, url: service.url, method: service.method, ok: false, problem: `${service.name}: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

function renderReport({ results, problems }) {
  const lines = [
    "# Local stack health",
    "",
    "Unguarded canary for the developer Dockerized stack. A failure means deep stack checks would be hollow until the named service is started or fixed.",
    "",
    "## Services",
    ""
  ];
  for (const result of results) {
    const status = result.status === undefined ? "no HTTP response" : `HTTP ${result.status}`;
    lines.push(`- ${result.name}: ${result.method} ${result.url} -> ${result.ok ? "ok" : "unhealthy"} (${status})`);
  }
  lines.push("", "## Problems", "");
  if (problems.length === 0) lines.push("_None._");
  else for (const problem of problems) lines.push(`- ${problem}`);
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const params = mergedParams(readInputs());
  const timeoutMs = params.timeoutPerRequestMs ?? 2000;
  const services = parseServices(params);
  const results = await Promise.all(services.map((service) => probeService(service, timeoutMs)));
  const problems = results.filter((result) => !result.ok).map((result) => result.problem ?? `${result.name}: unhealthy.`);
  const artifact = await writeTextArtifact("local-stack-health.md", renderReport({ results, problems }), "text/markdown", "Local stack health report.");
  const findings = { timeoutPerRequestMs: timeoutMs, results, problems };
  if (problems.length > 0) return fail(`Local stack health found ${problems.length} unhealthy service(s): ${problems.join("; ")}`, { findings, artifacts: [artifact] });
  return pass(`Local stack health passed for ${results.length} service(s).`, { findings, artifacts: [artifact] });
});
