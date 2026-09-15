#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: verifier-menu-command <command> [args...]");
  process.exit(2);
}

const result = spawnSync(command, args, {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

const exitCode = result.error ? 1 : (result.status ?? 1);
if (result.error) console.error(`Could not start ${command}: ${result.error.message}`);

// verifier-tree restores its alternate-screen menu as soon as a command exits.
// Keep successful reports, errors, and nested dashboards visible until the
// operator explicitly says they are finished reading them.
if (process.stdin.isTTY && process.stdout.isTTY) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  await prompt.question("\nPress Enter to return to the verifier menu…");
  prompt.close();
}

process.exitCode = exitCode;
