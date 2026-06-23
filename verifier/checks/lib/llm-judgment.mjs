import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { truncate, workspacePath, writeTextArtifact } from "./result.mjs";

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
  const candidates = [trimmed, ...jsonObjectCandidates(trimmed)];
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }

    try {
      return JSON.parse(escapeRawControlCharsInStrings(candidate));
    } catch (error) {
      lastError = error;
    }
  }

  if (candidates.length === 1) throw new Error("LLM response did not contain a JSON object.");
  throw lastError ?? new Error("LLM response did not contain a parseable JSON object.");
}

function jsonObjectCandidates(text) {
  const candidates = [];
  for (let start = text.indexOf("{"); start !== -1; start = text.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return candidates;
}

function escapeRawControlCharsInStrings(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (!inString) {
      output += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaped = true;
    } else if (char === '"') {
      output += char;
      inString = false;
    } else if (char === "\n") {
      output += "\\n";
    } else if (char === "\r") {
      output += "\\r";
    } else if (char === "\t") {
      output += "\\t";
    } else if (char === "\b") {
      output += "\\b";
    } else if (char === "\f") {
      output += "\\f";
    } else if (char < " ") {
      output += `\\u${char.codePointAt(0).toString(16).padStart(4, "0")}`;
    } else {
      output += char;
    }
  }

  return output;
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

function defaultPiArgs(model, promptArtifactPath, explore) {
  const args = ["--print", "--no-session", "--no-context-files", "--mode", "text"];
  // Exploration leaves get read-only repository access so they can read the
  // project's docs from the README down and form a genuinely briefed judgment;
  // every other leaf stays fully sandboxed with no tools and only its prompt.
  if (explore) {
    args.push("--tools", "read,grep,find,ls");
  } else {
    args.push("--no-tools");
  }
  if (model) args.push("--model", model);
  args.push(`@${promptArtifactPath}`);
  return args;
}

function runCommand(command, args, input, timeoutMs, cwd = workspacePath()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
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
export async function getLlmResponse(prompt, params, promptArtifactPath, model, { fixtureEnvVar, commandEnvVar, explore = false } = {}) {
  if (fixtureEnvVar && process.env[fixtureEnvVar]) {
    return process.env[fixtureEnvVar];
  }

  const command = params.command ?? ((commandEnvVar && process.env[commandEnvVar]) || "pi");
  const usesCustomArgs = Array.isArray(params.args);
  // A check opts into exploration; params.explore === false force-disables it.
  const useExplore = explore && !usesCustomArgs && params.explore !== false;

  // Exploration leaves run from the repository root so the model can follow the
  // README's doc links naturally, and reference the prompt by absolute path
  // (the prompt artifact lives under the verifier workspace, not the root).
  const cwd = useExplore ? path.resolve(workspacePath(), "..") : workspacePath();
  const promptPathForArgs = useExplore ? path.resolve(workspacePath(), promptArtifactPath) : promptArtifactPath;

  const args = usesCustomArgs ? params.args : defaultPiArgs(model, promptPathForArgs, useExplore);
  const timeoutMs = Number(params.commandTimeoutMs ?? 600000);
  const { stdout } = await runCommand(command, args, usesCustomArgs ? prompt : "", timeoutMs, cwd);
  return stdout;
}

// Shared preamble for exploration-mode judgment leaves. Rather than pre-stuffing
// a bounded set of files into the prompt, we tell the model its role and purpose,
// point it at the project's single top-level entry point (README.md), and let it
// use its read-only tools to pull up exactly the documentation its purpose needs
// — the same way a briefed human in that role would. This makes the verifier a
// forcing function for documentation quality: if the model cannot find what it
// needs from the README down, that is a reportable docs-organization gap.
export function explorationBriefing({ role, purpose }) {
  return [
    `You are acting as a ${role} for the Commonality project. Your specific purpose right now is:`,
    "",
    purpose,
    "",
    "You have read-only access to the repository via the read, grep, find, and ls tools. Before judging anything, get yourself up to speed the way a thoughtful person in your role would:",
    "",
    "- Start at the top-level README.md. It is written as a hierarchical map: it links to role-based reading guidance (under workflow/roles/) and to the specs and docs that matter for different purposes.",
    "- Follow the links relevant to YOUR purpose and read them. The documentation is deliberately organized so someone with a specific purpose can find what they need and skip the rest.",
    "- Be disciplined about cost and focus: do NOT read large amounts of material that is obviously irrelevant to your purpose. Read what you need to judge well, and no more.",
    "- If you genuinely cannot find documentation you would need to do your job well, that is itself a finding worth reporting: it means the docs are not organized well enough for your purpose. Report it and proceed on your best understanding.",
    "",
    "When you have enough understanding of the project to judge well, carry out your purpose.",
    ""
  ].join("\n");
}

// The JSON envelope line that asks an exploration leaf to report which files it
// actually opened, so the reading trail is auditable. Drop this into each check's
// response-shape spec, and pass "filesRead" in validateJudgmentResponse's
// arrayFields so a malformed value is rejected.
export const FILES_READ_FIELD_SPEC =
  `  "filesRead": ["repo-relative paths of the docs/source files you actually opened to reach this judgment"],`;

// Persist the model's self-reported reading list as an artifact: the audit trail
// for whether the leaf genuinely briefed itself before judging. Self-reported, so
// it is evidence to inspect, not proof — but combined with the report it shows
// whether the model read the right things.
export async function writeFilesReadArtifact(filesRead) {
  const list = Array.isArray(filesRead) ? filesRead.filter((entry) => typeof entry === "string") : [];
  const body = list.length > 0
    ? `# Files the reviewer reported reading\n\n${list.map((entry) => `- ${entry}`).join("\n")}\n`
    : "# Files the reviewer reported reading\n\n_The reviewer did not report reading any files._\n";
  return writeTextArtifact(
    "files-read.md",
    body,
    "text/markdown",
    "Self-reported list of repository files the LLM read to brief itself before judging (audit trail for whether it understood the system)."
  );
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
