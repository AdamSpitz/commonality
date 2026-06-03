import { spawn, execFileSync } from "node:child_process";
import { truncate, workspacePath } from "./result.mjs";

// Shared machinery for "standing LLM-judgment" verifier leaves: checks that ask a
// model to form a qualitative opinion over a bounded set of inputs and return a
// structured JSON verdict whose status is mapped deterministically (the model
// enriches the summary, it cannot talk a fail into a pass). Prompt construction
// and input collection stay in each check; everything reusable lives here.

export function paramsInputs(inputs) {
  return inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {});
}

export function mergedParams(inputs) {
  return Object.assign({}, ...paramsInputs(inputs));
}

export function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("LLM response did not contain a JSON object.");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

// Resolve the model the judgment should use, in priority order:
//   1. explicit override env var (options.modelEnvVar),
//   2. explicit params.model,
//   3. pi-model-router <taskKind> (params.taskKind, else options.defaultTaskKind).
// Returns null only if routing fails and no explicit model was given, in which
// case the underlying command falls back to its own default model.
export function resolveModel(params, { modelEnvVar, defaultTaskKind }) {
  const explicit = (modelEnvVar && process.env[modelEnvVar]) || params.model;
  if (explicit) return explicit;

  const taskKind = params.taskKind ?? defaultTaskKind;
  const router = process.env.COMMONALITY_VERIFIER_MODEL_ROUTER ?? "pi-model-router";
  try {
    return execFileSync(router, [taskKind], { encoding: "utf8" }).trim() || null;
  } catch {
    // Router unavailable or unknown task-kind: let the command pick its default.
    return null;
  }
}

function defaultPiArgs(model, promptArtifactPath) {
  const args = ["--print", "--no-session", "--no-tools", "--no-context-files", "--mode", "text"];
  if (model) args.push("--model", model);
  args.push(`@${promptArtifactPath}`);
  return args;
}

function runCommand(command, args, input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: workspacePath(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`LLM command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`LLM command exited ${code}. stderr: ${truncate(stderr, 2000)}`));
        return;
      }
      resolve({ stdout, stderr });
    });

    child.stdin.end(input);
  });
}

// Run the judgment prompt through the configured command and return raw stdout.
// options.fixtureEnvVar lets tests inject a canned response; options.commandEnvVar
// names the env var that overrides the command (default "pi").
export async function getLlmResponse(prompt, params, promptArtifactPath, model, { fixtureEnvVar, commandEnvVar } = {}) {
  if (fixtureEnvVar && process.env[fixtureEnvVar]) {
    return process.env[fixtureEnvVar];
  }

  const command = params.command ?? ((commandEnvVar && process.env[commandEnvVar]) || "pi");
  const usesCustomArgs = Array.isArray(params.args);
  const args = usesCustomArgs ? params.args : defaultPiArgs(model, promptArtifactPath);
  const timeoutMs = Number(params.commandTimeoutMs ?? 600000);
  const { stdout } = await runCommand(command, args, usesCustomArgs ? prompt : "", timeoutMs);
  return stdout;
}

// Validate the common { status, summary, reportMarkdown } envelope shared by
// judgment leaves. validStatuses defaults to the advisory pass/uncertain set so
// speculative findings never page directly. arrayFields names optional fields
// that must be arrays when present (e.g. structured findings lists).
export function validateJudgmentResponse(value, { validStatuses = ["pass", "uncertain"], arrayFields = [] } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("LLM response JSON must be an object.");
  for (const field of ["status", "summary", "reportMarkdown"]) {
    if (!(field in value)) throw new Error(`LLM response missing required field '${field}'.`);
  }
  if (!new Set(validStatuses).has(value.status)) {
    throw new Error(`LLM response status must be one of: ${validStatuses.join(", ")}.`);
  }
  if (typeof value.summary !== "string" || value.summary.length === 0) throw new Error("LLM response summary must be a non-empty string.");
  if (typeof value.reportMarkdown !== "string" || value.reportMarkdown.length === 0) throw new Error("LLM response reportMarkdown must be a non-empty string.");
  for (const field of arrayFields) {
    if (value[field] !== undefined && !Array.isArray(value[field])) {
      throw new Error(`LLM response ${field} must be an array when present.`);
    }
  }
  return value;
}

// Derive a gating check status deterministically from the model's structured
// findings rather than trusting its self-reported status. This keeps the
// existing "the model cannot talk a gap into a pass" principle and makes it
// symmetric: it also cannot downgrade a high-severity finding. A finding whose
// severity is in failSeverities turns the leaf red; any remaining findings make
// it uncertain (yellow); no findings means pass (green).
export function statusFromFindings(findings, { failSeverities = ["high"] } = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const failSet = new Set(failSeverities);
  if (list.some((finding) => failSet.has(finding?.severity))) return "fail";
  if (list.length > 0) return "uncertain";
  return "pass";
}
