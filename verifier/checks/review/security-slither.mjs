import { spawn } from "node:child_process";
import { emit, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function runSlither(command, cwd, timeoutMs) {
  const [program, ...args] = command;
  const started = Date.now();
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let child;
    try {
      child = spawn(program, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolve({ launchError: error, durationMs: Date.now() - started, stdout, stderr });
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ timedOut: true, durationMs: Date.now() - started, stdout, stderr });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ launchError: error, durationMs: Date.now() - started, stdout, stderr });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal, durationMs: Date.now() - started, stdout, stderr });
    });
  });
}

function summarizeDetector(detector) {
  const description = String(detector.description ?? "").trim().split(/\r?\n/)[0] ?? "";
  return {
    check: detector.check ?? "unknown",
    impact: detector.impact ?? "Unknown",
    confidence: detector.confidence ?? "Unknown",
    description: truncate(description, 240)
  };
}

function renderReport({ detectors, failing, uncertaining, failOnImpacts, uncertainOnImpacts, source }) {
  const lines = [
    "# Slither static analysis",
    "",
    "Deterministic smart-contract static analysis under `facet.security`. Severity gating is derived from detector impact, not a subjective read.",
    "",
    `- source: ${source}`,
    `- fail-on impacts: ${failOnImpacts.join(", ") || "(none)"}`,
    `- uncertain-on impacts: ${uncertainOnImpacts.join(", ") || "(none)"}`,
    `- total detectors: ${detectors.length}`,
    "",
    "## Gating detectors",
    ""
  ];
  const gating = [...failing, ...uncertaining];
  if (gating.length === 0) lines.push("_None._");
  else for (const d of gating) lines.push(`- [${d.impact}/${d.confidence}] ${d.check}: ${d.description}`);
  lines.push("", "## All detectors", "");
  if (detectors.length === 0) lines.push("_None._");
  else for (const d of detectors) lines.push(`- [${d.impact}/${d.confidence}] ${d.check}: ${d.description}`);
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const hardhatDir = params.hardhatDir ?? "hardhat";
  const command = Array.isArray(params.command) && params.command.length > 0 ? params.command : ["slither", ".", "--json", "-"];
  const commandTimeoutMs = params.commandTimeoutMs ?? 300_000;
  const failOnImpacts = params.failOnImpacts ?? ["High"];
  const uncertainOnImpacts = params.uncertainOnImpacts ?? ["Medium"];
  const jsonInput = findFileInput(inputs, "slitherJson");

  // Obtain slither JSON: from a supplied fixture (deterministic tests) or by running slither.
  let rawJson;
  let source;
  if (jsonInput) {
    if (jsonInput.content === null || jsonInput.content === undefined) {
      throw new Error(`Could not read slither JSON fixture: ${jsonInput.path}`);
    }
    rawJson = jsonInput.content;
    source = `fixture:${jsonInput.path ?? jsonInput.as}`;
  } else {
    const cwd = workspacePath("..", hardhatDir);
    const run = await runSlither(command, cwd, commandTimeoutMs);
    source = `command:${command.join(" ")} (in ${hardhatDir})`;
    if (run.launchError) {
      // Tooling unavailable is an honest unknown, never a security pass.
      return uncertain(`Slither could not be launched (${run.launchError.code ?? run.launchError.message}); static analysis did not run.`, {
        findings: { source, error: run.launchError.message, code: run.launchError.code, stderrTail: truncate(run.stderr, 2000) }
      });
    }
    if (run.timedOut) {
      return uncertain(`Slither timed out after ${commandTimeoutMs}ms; static analysis is unverified.`, {
        findings: { source, timedOut: true, durationMs: run.durationMs, stderrTail: truncate(run.stderr, 2000) }
      });
    }
    rawJson = run.stdout;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    return uncertain(`Slither output was not parseable JSON; static analysis is unverified.`, {
      findings: { source, parseError: error.message, stdoutTail: truncate(rawJson, 2000) }
    });
  }

  // slither's process exit code reflects detector count, not failure; `success` is the real signal.
  if (parsed.success === false) {
    return uncertain(`Slither reported it could not complete analysis; result is unverified.`, {
      findings: { source, slitherError: truncate(parsed.error ?? "(no error message)", 2000) }
    });
  }

  const detectors = (parsed.results?.detectors ?? []).map(summarizeDetector);
  const failOn = new Set(failOnImpacts);
  const uncertainOn = new Set(uncertainOnImpacts);
  const failing = detectors.filter((d) => failOn.has(d.impact));
  const uncertaining = detectors.filter((d) => uncertainOn.has(d.impact));

  const artifact = await writeTextArtifact(
    "slither.md",
    renderReport({ detectors, failing, uncertaining, failOnImpacts, uncertainOnImpacts, source }),
    "text/markdown",
    "Slither static-analysis report."
  );
  const findings = { source, total: detectors.length, failing, uncertaining, detectors };

  if (failing.length > 0) {
    return fail(`Slither found ${failing.length} ${failOnImpacts.join("/")}-impact finding(s) in the contracts.`, { findings, artifacts: [artifact] });
  }
  if (uncertaining.length > 0) {
    return uncertain(`Slither found ${uncertaining.length} ${uncertainOnImpacts.join("/")}-impact finding(s) worth human review (no ${failOnImpacts.join("/")}-impact).`, { findings, artifacts: [artifact] });
  }
  return pass(`Slither found no ${failOnImpacts.join("/")}- or ${uncertainOnImpacts.join("/")}-impact findings across ${detectors.length} detector(s).`, { findings, artifacts: [artifact] });
});
