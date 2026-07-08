#!/usr/bin/env node
// Stack-aware wrapper around `verifier-run`.
//
//   node scripts/verifier-run-stack.mjs <checkId> [extra verifier-run args]
//
// Reads the check's *.def.json `requires: { capability }`. If present, ensures
// the local Docker stack is at that capability level (probe → reuse if already
// satisfied, else provision) before delegating to `verifier-run`. Checks with
// no `requires` are passed straight through. See verifier/PLAN.md item
// "2b. Auto-provision the local Docker stack".

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { glob } from "node:fs/promises";
import { ensureCapability } from "./lib/stack-capability.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkId = process.argv[2];
const passthrough = process.argv.slice(3);

if (!checkId || checkId === "-h" || checkId === "--help") {
  console.error("Usage: node scripts/verifier-run-stack.mjs <checkId> [extra verifier-run args]");
  process.exit(checkId ? 0 : 2);
}

async function findDef(id) {
  for await (const entry of glob("verifier/checks/**/*.def.json", { cwd: REPO_ROOT })) {
    try {
      const def = JSON.parse(readFileSync(resolve(REPO_ROOT, entry), "utf8"));
      if (def.id === id) return def;
    } catch {
      // ignore malformed defs
    }
  }
  return null;
}

const def = await findDef(checkId);
if (!def) {
  console.error(`No *.def.json found with id "${checkId}" under verifier/checks/.`);
  process.exit(2);
}

const capability = def.requires?.capability;
const extraEnv = {};

if (typeof capability === "string" && capability.startsWith("localStack:")) {
  const level = capability.slice("localStack:".length);
  const result = await ensureCapability(level);
  console.error(`stack capability for ${checkId}: action=${result.action}, level=${result.level} — ${result.reason}`);
  if (!result.ok) {
    console.error(`Refusing to run ${checkId}: local stack not at ${capability}.`);
    process.exit(1);
  }
  // We've committed to driving the live stack; grant the read-only E2E opt-in
  // so stack checks don't separately refuse. Destructive/restart/testnet
  // opt-ins are intentionally NOT set here — those stay explicit.
  extraEnv.COMMONALITY_VERIFIER_ALLOW_E2E_STACK = "1";
}

const child = spawn("verifier-run", [checkId, ...passthrough], {
  cwd: REPO_ROOT,
  env: { ...process.env, ...extraEnv },
  stdio: "inherit",
});
child.on("close", (code, signal) => process.exit(signal ? 1 : code ?? 0));
child.on("error", (error) => {
  console.error(`Failed to start verifier-run: ${error.message}`);
  process.exit(1);
});
