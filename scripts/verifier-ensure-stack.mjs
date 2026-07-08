#!/usr/bin/env node
// Ensure the local Docker stack satisfies a capability level, then exit.
//
//   node scripts/verifier-ensure-stack.mjs up|seeded|pristine
//   node scripts/verifier-ensure-stack.mjs --probe   (report current level only)
//
// Non-destructive by default; destructive wipe+reseed requires
// VERIFIER_STACK_ALLOW_DESTRUCTIVE_AUTOPROVISION=1 and no verifier/state/stack.held.
// See verifier/PLAN.md item "2b. Auto-provision the local Docker stack".

import { ensureCapability, probeLevel } from "./lib/stack-capability.mjs";

const arg = process.argv[2];

if (!arg || arg === "-h" || arg === "--help") {
  console.error("Usage: node scripts/verifier-ensure-stack.mjs <up|seeded|pristine|--probe>");
  process.exit(arg ? 0 : 2);
}

if (arg === "--probe") {
  const level = await probeLevel();
  console.log(level);
  process.exit(0);
}

const level = arg.startsWith("localStack:") ? arg.slice("localStack:".length) : arg;
const result = await ensureCapability(level);
console.error(`stack ${result.ok ? "ready" : "NOT ready"}: action=${result.action}, level=${result.level} — ${result.reason}`);
process.exit(result.ok ? 0 : 1);
