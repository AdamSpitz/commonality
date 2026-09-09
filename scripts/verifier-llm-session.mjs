#!/usr/bin/env node
// Record a standing LLM-judgment check using this chat session (or a JSON file)
// instead of spawning `pi` against OpenRouter.
//
// Usage:
//   npm run verifier:llm -- --list
//   npm run verifier:llm -- <checkId> --dump-prompt
//   npm run verifier:llm -- <checkId> --response-file path.json
//   npm run verifier:llm -- <checkId> --stdin          # JSON envelope on stdin
//
// `--dump-prompt` runs the check far enough to write prompt.md (snapshots etc.),
// then stops without a model call. The recorded result is an error — not a verdict.
// Re-run with --response-file to store a real Result.
//
// The JSON envelope is whatever that check's prompt asks for (usually
// {status, summary, reportMarkdown, findings, filesRead}).

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = process.env.VERIFIER_WORKSPACE ?? "verifier";

function usage() {
  console.error(`Usage:
  node scripts/verifier-llm-session.mjs --list
  node scripts/verifier-llm-session.mjs <checkId> --dump-prompt
  node scripts/verifier-llm-session.mjs <checkId> --response-file <path.json>
  node scripts/verifier-llm-session.mjs <checkId> --stdin`);
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function listLlmChecks() {
  const checksDir = path.join(root, workspace, "checks");
  const files = (await walk(checksDir)).filter((f) => f.endsWith(".def.json"));
  const rows = [];
  for (const file of files) {
    const def = JSON.parse(await fs.readFile(file, "utf8"));
    if (def.cost !== "llm") continue;
    rows.push({
      id: def.id,
      trigger: def.trigger?.type ?? "?",
      description: def.description ?? ""
    });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return rows;
}

async function latestPrompt(checkId) {
  const dir = path.join(root, workspace, "artifacts", checkId);
  let runDirs;
  try {
    runDirs = (await fs.readdir(dir)).sort();
  } catch {
    return null;
  }
  for (const runId of runDirs.reverse()) {
    const promptPath = path.join(dir, runId, "prompt.md");
    try {
      const text = await fs.readFile(promptPath, "utf8");
      return { path: promptPath, text };
    } catch {
      // keep looking
    }
  }
  return null;
}

function runCheck(checkId, extraEnv = {}) {
  const res = spawnSync("verifier-run", [checkId], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv }
  });
  return res.status ?? 0;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help") || args.length === 0) {
    usage();
    process.exit(args.length === 0 ? 2 : 0);
  }
  if (args[0] === "--list") {
    const rows = await listLlmChecks();
    console.log(`${rows.length} LLM-cost checks (review/meta leaves are manual; root rolls up without a model unless ALLOW_LLM=1):\n`);
    const idWidth = Math.max(...rows.map((row) => row.id.length));
    for (const row of rows) {
      console.log(`${row.id.padEnd(idWidth)}  ${row.trigger.padEnd(14)}  ${row.description.slice(0, 90)}`);
    }
    return;
  }

  const checkId = args[0];
  const dump = args.includes("--dump-prompt");
  const stdin = args.includes("--stdin");
  const fileIdx = args.indexOf("--response-file");
  const responseFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

  if (!checkId || checkId.startsWith("-")) {
    usage();
    process.exit(2);
  }

  if (dump) {
    const code = runCheck(checkId, { COMMONALITY_VERIFIER_DUMP_PROMPT: "1" });
    const prompt = await latestPrompt(checkId);
    if (prompt) {
      console.log(`\n----- prompt (${prompt.path}) -----\n`);
      console.log(prompt.text);
      console.log("\n----- end prompt -----\n");
      console.log("This dump recorded an error result, not a verdict. After you write the JSON envelope:");
      console.log(`  npm run verifier:llm -- ${checkId} --response-file <your.json>`);
    } else {
      console.error("Dump finished but no prompt.md artifact was found.");
    }
    process.exit(code === 0 ? 1 : 0);
  }

  let extraEnv = { COMMONALITY_VERIFIER_ALLOW_LLM: "1" };
  if (stdin) {
    extraEnv.COMMONALITY_VERIFIER_LLM_RESPONSE = await readStdin();
  } else if (responseFile) {
    extraEnv.COMMONALITY_VERIFIER_LLM_RESPONSE_FILE = path.resolve(responseFile);
  } else {
    usage();
    process.exit(2);
  }

  process.exit(runCheck(checkId, extraEnv));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
