import { readFile } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, readInputs, errorResult } from "../lib/result.mjs";
import { runCommand } from "../lib/run-command.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function missingRequiredEnv(requireEnv = []) {
  return requireEnv.filter((requirement) => {
    if (!requirement || typeof requirement.name !== "string") return true;
    const actual = process.env[requirement.name];
    if ("equals" in requirement) return actual !== String(requirement.equals);
    return !actual;
  });
}

function validateHealthEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || !Array.isArray(evidence.checks)) {
    return [{ name: "health-evidence", status: "fail", summary: "Health evidence must be an object with a checks array." }];
  }

  return evidence.checks.filter((check) => check?.status !== "pass").map((check) => ({
    name: typeof check?.name === "string" ? check.name : "<unnamed>",
    status: typeof check?.status === "string" ? check.status : "missing-status",
    summary: typeof check?.summary === "string" ? check.summary : "Structured health evidence item did not pass."
  }));
}

async function applyStructuredHealthEvidence(commandResult, evidenceFile, params) {
  if (commandResult.status !== "pass") {
    return commandResult;
  }

  let evidence;
  try {
    evidence = JSON.parse(await readFile(evidenceFile, "utf8"));
  } catch (error) {
    if (!params.requireHealthEvidence) return commandResult;
    return fail(`${params.label ?? "guarded command"} did not write parseable structured health evidence.`, {
      findings: { ...commandResult.findings, healthEvidenceFile: evidenceFile, healthEvidenceError: error.message },
      artifacts: commandResult.artifacts
    });
  }

  const unhealthy = validateHealthEvidence(evidence);
  const findings = { ...commandResult.findings, healthEvidence: evidence };
  if (unhealthy.length === 0) {
    return { ...commandResult, findings };
  }

  return fail(`${params.label ?? "guarded command"} reported unhealthy structured evidence despite exit ${commandResult.findings?.exitCode ?? "unknown"}.`, {
    findings: { ...findings, unhealthyHealthEvidence: unhealthy },
    artifacts: commandResult.artifacts
  });
}

emit(async () => {
  const params = mergedParams(readInputs());
  const missing = missingRequiredEnv(params.requireEnv);
  if (missing.length > 0) {
    return errorResult(`Refusing to run guarded command; missing required opt-in: ${missing.map((item) => item.name ?? "<invalid>").join(", ")}.`, {
      findings: { requireEnv: params.requireEnv, mutatesState: params.mutatesState }
    });
  }

  const command = params.command;
  if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== "string")) {
    return errorResult("Guarded command check is missing a params.command string array.", { findings: { params } });
  }

  const workspace = process.env.VERIFIER_WORKSPACE ?? process.cwd();
  const cwd = params.cwd ? path.resolve(workspace, params.cwd) : path.resolve(workspace, "..");
  const evidenceFile = path.join(artifactsDir(), "health-evidence.json");
  const [program, ...args] = command;
  const commandResult = await runCommand(program, args, {
    cwd,
    timeoutMs: params.commandTimeoutMs ?? 120000,
    label: params.label ?? command.join(" "),
    env: { ...(params.env ?? {}), COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE: evidenceFile },
    artifactOutputLimit: params.artifactOutputLimit ?? 12000,
    findingOutputLimit: params.findingOutputLimit ?? 3000
  });

  return await applyStructuredHealthEvidence(commandResult, evidenceFile, params);
});
