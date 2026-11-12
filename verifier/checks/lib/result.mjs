import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const VALID_STATUSES = new Set(["pass", "fail", "uncertain", "error", "skipped"]);

export function readInputs() {
  // Prefer the inline env var; fall back to the file the harness always writes
  // (used when the inputs payload is too large for an env var — e.g. supervisors
  // that inline many child results, which would otherwise spawn with E2BIG).
  let raw = process.env.VERIFIER_INPUTS;
  if (raw === undefined && process.env.VERIFIER_INPUTS_FILE) {
    try { raw = readFileSync(process.env.VERIFIER_INPUTS_FILE, "utf8"); } catch { raw = undefined; }
  }
  return JSON.parse(raw ?? "[]");
}

export function workspacePath(...parts) {
  return path.join(process.env.VERIFIER_WORKSPACE ?? process.cwd(), ...parts);
}

export function artifactsDir() {
  return process.env.VERIFIER_ARTIFACTS_DIR ?? workspacePath("artifacts", process.env.VERIFIER_CHECK_ID ?? "unknown", process.env.VERIFIER_RUN_ID ?? "manual");
}

export function workspaceRelative(filePath) {
  const workspace = process.env.VERIFIER_WORKSPACE ?? process.cwd();
  return path.relative(workspace, filePath);
}

export function truncate(value, maxChars = 4000) {
  const text = String(value ?? "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n… truncated ${text.length - maxChars} chars …`;
}

export function result(status, summary, extra = {}) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid verifier status: ${status}`);
  }
  return { status, summary, ...extra };
}

export function pass(summary, extra = {}) {
  return result("pass", summary, extra);
}

export function fail(summary, extra = {}) {
  return result("fail", summary, extra);
}

export function uncertain(summary, extra = {}) {
  return result("uncertain", summary, extra);
}

export function errorResult(summary, extra = {}) {
  return result("error", summary, extra);
}

/** Deliberately not run. `reason` says why; `enable` says how to turn it on. */
export function skipped(summary, { reason, enable, ...extra } = {}) {
  return result("skipped", summary, { skip: { reason: reason ?? summary, ...(enable ? { enable } : {}) }, ...extra });
}

/** A guarded check refusing to run because its opt-in env var is unset.
 *  The reason comes from coverage/guarded-check-policy.json (single source of truth). */
export function optInSkipped(summary, requiredEnv, { enable, ...extra } = {}) {
  const envs = (Array.isArray(requiredEnv) ? requiredEnv : [requiredEnv]).filter(Boolean).map((env) => env?.name ?? env);
  let item;
  try {
    const policy = JSON.parse(readFileSync(workspacePath("coverage", "guarded-check-policy.json"), "utf8"));
    item = policy.items?.find((entry) => entry.checkId === process.env.VERIFIER_CHECK_ID);
  } catch { /* fall back to a generic reason */ }
  const reason = item?.skipPolicyBeforeMandatory
    ?? "Guarded check: it has side effects or hits external services, so it only runs with an explicit opt-in.";
  return skipped(summary, {
    reason: item?.mandatoryBy ? `${reason} (Required fresh by ${item.mandatoryBy}.)` : reason,
    enable: enable ?? `Set ${envs.map((env) => `${env}=1`).join(" ")}.`,
    findings: { requiredEnv: envs, ...(extra.findings ?? {}) },
  });
}

export async function writeTextArtifact(name, content, mimeType = "text/plain", description) {
  const dir = artifactsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), content, "utf8");
  return {
    name,
    path: workspaceRelative(path.join(dir, name)),
    mimeType,
    ...(description ? { description } : {})
  };
}

export async function emit(main) {
  try {
    const value = await main();
    console.log(JSON.stringify(value));
  } catch (e) {
    console.log(JSON.stringify(errorResult(`Could not run check: ${e?.message ?? String(e)}`)));
    process.exitCode = 1;
  }
}
