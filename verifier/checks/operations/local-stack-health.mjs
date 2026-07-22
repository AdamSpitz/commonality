import { spawn } from "node:child_process";

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
      requireText: service.requireText,
      recoveryHint: service.recoveryHint
    };
  });
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, part) => current?.[part], value);
}

function excerpt(text, maxLength = 500) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function describeFetchError(error) {
  if (error?.name === "AbortError") return null;
  const message = error?.message ?? String(error);
  const cause = error?.cause;
  const details = [cause?.code, cause?.address, cause?.port === undefined ? undefined : `port ${cause.port}`].filter(Boolean).join(" ");
  return details.length > 0 ? `${message} (${details})` : message;
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
    const responseExcerpt = excerpt(text);
    const result = { name: service.name, url: service.url, method: service.method, status: response.status, ok: response.status === service.expectedStatus };
    if (!result.ok) return { ...result, responseExcerpt, problem: `${service.name}: returned HTTP ${response.status}, expected ${service.expectedStatus}.` };
    if (service.requireText && !text.includes(service.requireText)) {
      return { ...result, ok: false, responseExcerpt, problem: `${service.name}: response did not contain required text ${JSON.stringify(service.requireText)}.` };
    }
    if (service.requireJsonPath) {
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return { ...result, ok: false, responseExcerpt, problem: `${service.name}: response was not valid JSON.` };
      }
      const value = getPath(json, service.requireJsonPath);
      if (value === undefined || value === null) {
        return { ...result, ok: false, responseExcerpt, problem: `${service.name}: JSON path ${service.requireJsonPath} was missing.` };
      }
      return { ...result, jsonPath: service.requireJsonPath, jsonPathValue: value };
    }
    return result;
  } catch (error) {
    const message = error?.name === "AbortError" ? `timed out after ${timeoutMs}ms` : describeFetchError(error);
    return { name: service.name, url: service.url, method: service.method, ok: false, problem: `${service.name}: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

function recoveryHintFor(result) {
  return typeof result.recoveryHint === "string" && result.recoveryHint.length > 0 ? result.recoveryHint : null;
}

function runCommand(command, timeoutMs) {
  return new Promise((resolve) => {
    const [program, ...args] = command;
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ command, exitCode: null, signal: null, timedOut, stdout, stderr, error: error.message });
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ command, exitCode, signal, timedOut, stdout, stderr });
    });
  });
}

function renderCommandLog(commands) {
  if (commands.length === 0) return "No recovery commands were run.\n";
  return commands.map((result, index) => [
    `# Command ${index + 1}: ${result.command.join(" ")}`,
    `exitCode: ${result.exitCode}`,
    `signal: ${result.signal ?? "none"}`,
    `timedOut: ${result.timedOut}`,
    result.error ? `error: ${result.error}` : null,
    "",
    "## stdout",
    "```",
    result.stdout.trimEnd(),
    "```",
    "",
    "## stderr",
    "```",
    result.stderr.trimEnd(),
    "```",
    ""
  ].filter((line) => line !== null).join("\n")).join("\n");
}

function renderReport({ results, problems, recoveryAttempts }) {
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
    if (!result.ok && result.responseExcerpt) lines.push(`  - Response excerpt: ${JSON.stringify(result.responseExcerpt)}`);
  }
  if (recoveryAttempts.length > 0) {
    lines.push("", "## Automatic recovery", "");
    for (const attempt of recoveryAttempts) {
      lines.push(`- ${attempt.label}: ${attempt.command.join(" ")} -> exit ${attempt.exitCode}${attempt.timedOut ? " (timed out)" : ""}`);
    }
  }
  lines.push("", "## Problems", "");
  if (problems.length === 0) lines.push("_None._");
  else for (const problem of problems) lines.push(`- ${problem}`);
  const hints = results.filter((result) => !result.ok).map(recoveryHintFor).filter(Boolean);
  if (hints.length > 0) {
    lines.push("", "## Recovery hints", "");
    for (const hint of [...new Set(hints)]) lines.push(`- ${hint}`);
  }
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const params = mergedParams(readInputs());
  const timeoutMs = params.timeoutPerRequestMs ?? 2000;
  const services = parseServices(params);
  const recoveryAttempts = [];
  const commandTimeoutMs = params.recoveryCommandTimeoutMs ?? 600_000;
  const probeAllServices = async () => Promise.all(services.map(async (service) => ({ ...(await probeService(service, timeoutMs)), recoveryHint: service.recoveryHint })));

  let results = await probeAllServices();
  let problems = results.filter((result) => !result.ok).map((result) => result.problem ?? `${result.name}: unhealthy.`);

  if (problems.length > 0 && params.autoStartOnFailure !== false) {
    const startCommand = params.startCommand ?? ["./scripts/services.sh", "--start"];
    console.error(`Local stack health failed; attempting automatic start: ${startCommand.join(" ")}`);
    const startResult = await runCommand(startCommand, commandTimeoutMs);
    recoveryAttempts.push({ label: "start", ...startResult });
    results = await probeAllServices();
    problems = results.filter((result) => !result.ok).map((result) => result.problem ?? `${result.name}: unhealthy.`);
  }

  if (problems.length > 0 && params.allowDestructiveRecovery === true) {
    const wipeCommand = params.wipeCommand ?? ["./scripts/data.sh", "--wipe"];
    const startCommand = params.startCommand ?? ["./scripts/services.sh", "--start"];
    console.error(`Local stack still unhealthy; attempting destructive recovery: ${wipeCommand.join(" ")} && ${startCommand.join(" ")}`);
    const wipeResult = await runCommand(wipeCommand, commandTimeoutMs);
    recoveryAttempts.push({ label: "wipe", ...wipeResult });
    if (wipeResult.exitCode === 0) {
      const restartResult = await runCommand(startCommand, commandTimeoutMs);
      recoveryAttempts.push({ label: "restart", ...restartResult });
    }
    results = await probeAllServices();
    problems = results.filter((result) => !result.ok).map((result) => result.problem ?? `${result.name}: unhealthy.`);
  }

  const artifacts = [await writeTextArtifact("local-stack-health.md", renderReport({ results, problems, recoveryAttempts }), "text/markdown", "Local stack health report.")];
  if (recoveryAttempts.length > 0) {
    artifacts.push(await writeTextArtifact("local-stack-recovery.log", renderCommandLog(recoveryAttempts), "text/plain", "Automatic local stack recovery command output."));
  }
  const findings = { timeoutPerRequestMs: timeoutMs, recoveryAttempts, results, problems };
  if (problems.length > 0) return fail(`Local stack health found ${problems.length} unhealthy service(s): ${problems.join("; ")}`, { findings, artifacts });
  const recoverySummary = recoveryAttempts.length > 0 ? ` after ${recoveryAttempts.length} automatic recovery command(s)` : "";
  return pass(`Local stack health passed for ${results.length} service(s)${recoverySummary}.`, { findings, artifacts });
});
