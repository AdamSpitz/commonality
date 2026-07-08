// Local Docker stack "capability graph" support (verifier Tier A).
//
// Checks declare `requires: { capability: "localStack:<level>" }` in their
// *.def.json. This module probes the LIVE stack and, only when the required
// level isn't already satisfied, provisions it — preferring a non-destructive
// bring-up and refusing to wipe an up-and-healthy (or explicitly held) stack.
//
// See verifier/PLAN.md item "2b. Auto-provision the local Docker stack".

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOLD_LOCK = resolve(REPO_ROOT, "verifier/state/stack.held");

// Ladder, weakest → strongest. `pristine` is a provisioning goal, not a steady
// state a probe can observe, so it always provisions destructively.
export const LEVEL_RANK = { none: 0, up: 1, seeded: 2, pristine: 3 };

const UP_PROBES = [
  {
    name: "hardhat rpc",
    url: "http://localhost:8545/",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] },
    jsonPath: "result",
  },
  {
    name: "indexer graphql",
    url: "http://localhost:42069/graphql",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { query: "{ _meta { status } }" },
    jsonPath: "data._meta.status",
  },
  { name: "platform api health", url: "http://localhost:3001/health" },
  { name: "ui shell", url: "http://localhost:8088/", requireText: "<html" },
];

const SEEDED_PROBE = {
  name: "indexer events",
  url: "http://localhost:42069/api/events?limit=1",
  requireItems: true,
};

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, part) => current?.[part], value);
}

async function probe(spec, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(spec.url, {
      method: spec.method ?? "GET",
      headers: spec.headers ?? {},
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      signal: controller.signal,
    });
    if (response.status !== (spec.expectedStatus ?? 200)) return false;
    const text = await response.text();
    if (spec.requireText && !text.includes(spec.requireText)) return false;
    if (spec.jsonPath) {
      const json = JSON.parse(text);
      const value = getPath(json, spec.jsonPath);
      if (value === undefined || value === null) return false;
    }
    if (spec.requireItems) {
      const json = JSON.parse(text);
      const items = json?.items;
      if (!Array.isArray(items) || items.length === 0) return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Highest currently-satisfied level: "none" | "up" | "seeded". */
export async function probeLevel(timeoutMs = 2000) {
  const ups = await Promise.all(UP_PROBES.map((p) => probe(p, timeoutMs)));
  if (!ups.every(Boolean)) return "none";
  const seeded = await probe(SEEDED_PROBE, timeoutMs);
  return seeded ? "seeded" : "up";
}

function log(logger, message) {
  (logger ?? ((m) => process.stderr.write(`${m}\n`)))(message);
}

function runScript(argv, { env, logger } = {}) {
  return new Promise((resolvePromise) => {
    log(logger, `+ ${argv.join(" ")}`);
    const child = spawn(argv[0], argv.slice(1), {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("close", (code, signal) => resolvePromise({ code, signal }));
    child.on("error", (error) => {
      log(logger, `failed to spawn ${argv[0]}: ${error.message}`);
      resolvePromise({ code: 1, signal: null });
    });
  });
}

async function pollUntil(targetRank, deadline) {
  while (Date.now() < deadline) {
    const level = await probeLevel();
    if (LEVEL_RANK[level] >= targetRank) return level;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return probeLevel();
}

/**
 * Ensure the local stack satisfies `required` ("up" | "seeded" | "pristine").
 * Returns { ok, level, action, reason }. `action` is one of
 * "reused" | "started" | "seeded" | "wiped-reseeded" | "refused" | "failed".
 */
export async function ensureCapability(required, opts = {}) {
  const {
    allowDestructive = process.env.VERIFIER_STACK_ALLOW_DESTRUCTIVE_AUTOPROVISION === "1" ||
      process.env.COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE === "1",
    logger,
    startTimeoutMs = 240000,
    seedTimeoutMs = 300000,
    wipeTimeoutMs = 1200000,
  } = opts;

  const requiredRank = LEVEL_RANK[required];
  if (requiredRank === undefined) {
    return { ok: false, level: "unknown", action: "failed", reason: `unknown capability level "${required}"` };
  }

  const held = existsSync(HOLD_LOCK);
  const current = await probeLevel();
  log(logger, `stack capability: required=${required}, current=${current}${held ? " (held)" : ""}`);

  // Steady-state levels can be reused if already satisfied. `pristine` cannot.
  if (required !== "pristine" && LEVEL_RANK[current] >= requiredRank) {
    return { ok: true, level: current, action: "reused", reason: "already satisfied" };
  }

  // The hold lock means "hands off the stack entirely" — refuse ALL
  // provisioning (not just destructive), so a debugging session is never
  // disturbed by an unexpected boot/build. A reused healthy stack above is fine.
  if (held) {
    return {
      ok: false,
      level: current,
      action: "refused",
      reason: `stack at "${current}" but ${required} required; ${HOLD_LOCK} exists (stack held for debugging). Run 'npm run verifier:stack:unhold' or provision manually.`,
    };
  }

  const doDestructive = async (reason) => {
    if (held) {
      return {
        ok: false,
        level: current,
        action: "refused",
        reason: `${reason}, but ${HOLD_LOCK} exists (stack held for debugging). Run 'npm run verifier:stack:unhold' or provision manually.`,
      };
    }
    if (!allowDestructive) {
      return {
        ok: false,
        level: current,
        action: "refused",
        reason: `${reason}, which requires wiping local data. Re-run with VERIFIER_STACK_ALLOW_DESTRUCTIVE_AUTOPROVISION=1, or use 'npm run verifier:deep-cadence'.`,
      };
    }
    log(logger, `provisioning destructively: ${reason}`);
    const res = await runScript(
      ["./scripts/stop-wipe-restart.sh", "--seed=tiny", "--use-hardhat-accounts"],
      { env: { COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE: "1" }, logger },
    );
    if (res.code !== 0) return { ok: false, level: await probeLevel(), action: "failed", reason: "stop-wipe-restart.sh failed" };
    const level = await pollUntil(LEVEL_RANK.seeded, Date.now() + wipeTimeoutMs);
    return LEVEL_RANK[level] >= LEVEL_RANK.seeded
      ? { ok: true, level, action: "wiped-reseeded", reason }
      : { ok: false, level, action: "failed", reason: "stack did not reach seeded after wipe+reseed" };
  };

  if (required === "pristine") {
    return doDestructive("pristine baseline requested");
  }

  // Non-destructive path first: bring services up, then seed if needed.
  if (current === "none") {
    await runScript(["./scripts/services.sh", "--start"], { logger });
    const level = await pollUntil(LEVEL_RANK.up, Date.now() + startTimeoutMs);
    if (LEVEL_RANK[level] < LEVEL_RANK.up) {
      // Started but never healthy → inconsistent; destructive repair.
      return doDestructive("stack did not come up cleanly");
    }
  }

  const afterStart = await probeLevel();
  if (LEVEL_RANK[afterStart] >= requiredRank) {
    return { ok: true, level: afterStart, action: "started", reason: "brought services up" };
  }

  // Need seeded but stack is up and unseeded → non-destructive seed.
  if (required === "seeded") {
    await runScript(["./scripts/data.sh", "--seed=tiny", "--use-hardhat-accounts"], { logger });
    const level = await pollUntil(LEVEL_RANK.seeded, Date.now() + seedTimeoutMs);
    if (LEVEL_RANK[level] >= LEVEL_RANK.seeded) {
      return { ok: true, level, action: "seeded", reason: "seeded a tiny dataset" };
    }
    // Seeding on top of a live-but-inconsistent stack didn't take → repair.
    return doDestructive("stack did not reach seeded via non-destructive seed");
  }

  return { ok: false, level: afterStart, action: "failed", reason: `could not reach ${required}` };
}
