#!/usr/bin/env node
// verifier-cost.mjs — classify every verifier check by its refresh cost, so
// "refresh only the cheap stuff" is a one-glance decision and LLM spend is visible.
//
// Cost tiers:
//   deterministic  — no model call at all (automated tests, rollups/supervisors,
//                    canaries). Free to rerun as often as you like.
//   llm            — single-shot model judgment over a bounded prompt. Costs
//                    roughly one prompt+completion. Moderate.
//   llm-explore    — model judgment with read/grep/find/ls tools: a multi-turn
//                    agentic run that reads around the repo. The priciest tier;
//                    token cost is open-ended, not bounded by a fixed prompt.
//
// Detection is static: we resolve each check's command to its entry .mjs, walk
// the local import graph, and see whether the closure reaches the LLM libs
// (lib/llm-judgment.mjs, lib/narrative.mjs) or spawns `pi`. Exploration is
// detected from `explore: true` call sites / the explorationBriefing helper.
//
// Beyond the static tier, each LLM check now records the token/cost usage pi
// reports for its run (getLlmResponse parses pi's --mode json stream), so the
// table also shows the LAST run's measured spend ($ and tokens) next to the
// tier — turning "this tier is pricey" into "this run actually cost $X".
//
// Usage:
//   node scripts/verifier-cost.mjs                 # full table, grouped by tier
//   node scripts/verifier-cost.mjs --tier llm      # only that tier
//   node scripts/verifier-cost.mjs --stale <mins>  # flag results older than N minutes
//   node scripts/verifier-cost.mjs --json          # machine-readable

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = process.env.VERIFIER_WORKSPACE ?? "verifier";
const checksDir = path.join(root, workspace, "checks");
const resultsDir = path.join(root, workspace, "results");

const LLM_LIBS = ["llm-judgment.mjs", "narrative.mjs"];

// The harness's declarative cost field (Definition.cost) that a derived tier maps
// to: any LLM tier is an expensive "llm", everything else is "cheap".
function expectedCost(tier) {
  return tier === "deterministic" ? "cheap" : "llm";
}

function parseArgs(argv) {
  const opts = { tier: null, staleMinutes: null, json: false, writeDefs: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--tier") opts.tier = argv[++i];
    else if (a === "--stale") opts.staleMinutes = Number(argv[++i]);
    else if (a === "--json") opts.json = true;
    else if (a === "--write-defs") opts.writeDefs = true;
  }
  return opts;
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

// Walk the local (relative) import graph from an entry .mjs, returning the set of
// resolved files reachable. External / bare imports are ignored — they can't be a
// local LLM lib.
async function importClosure(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try {
      src = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const importRe = /(?:import|export)[^'"]*?['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = importRe.exec(src)) !== null) {
      const resolved = path.resolve(path.dirname(file), m[1]);
      queue.push(resolved.endsWith(".mjs") ? resolved : `${resolved}.mjs`);
    }
  }
  return seen;
}

async function classify(def) {
  const command = def.command ?? [];
  // Find the .mjs entry point in the command array, if any.
  const scriptArg = command.find((c) => typeof c === "string" && c.endsWith(".mjs"));
  if (!scriptArg) {
    // No node script (e.g. shell-only automated checks) → deterministic.
    return { tier: "deterministic", model: null };
  }
  const entry = path.resolve(root, workspace, scriptArg);
  const closure = await importClosure(entry);
  const files = [...closure];
  const usesLlm = files.some((f) => LLM_LIBS.some((lib) => f.endsWith(lib)));
  if (!usesLlm) return { tier: "deterministic", model: null };

  // Exploration = the check hands the model read-only repo tools (open-ended cost).
  let explore = false;
  for (const f of files) {
    let src = "";
    try {
      src = await fs.readFile(f, "utf8");
    } catch {
      continue;
    }
    if (/explore:\s*true|explorationBriefing/.test(src)) explore = true;
  }
  // A def can force-disable exploration via params.explore === false.
  const params = (def.inputs ?? []).filter((i) => i.kind === "params").map((i) => i.data ?? {});
  const merged = Object.assign({}, ...params);
  if (merged.explore === false) explore = false;
  const model = merged.model ?? merged.taskKind ?? null;
  return { tier: explore ? "llm-explore" : "llm", model };
}

// Read the latest persisted result for a check: its age and, for LLM checks,
// the measured token/cost usage the check now records (findings.usage for
// judgment leaves, top-level usage for the narrative synthesis). Returns null
// when there is no result; usage fields are null when the run recorded none.
async function latestResult(id) {
  const dir = path.join(resultsDir, id);
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    return null;
  }
  const file = names.filter((n) => n.endsWith(".json")).sort().at(-1);
  if (!file) return null;
  try {
    const r = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
    if (!r.timestamp) return null;
    const usage = r.findings?.usage ?? r.usage ?? null;
    return {
      ageMin: (Date.now() - Date.parse(r.timestamp)) / 60000,
      costUsd: usage?.costUsd ?? null,
      totalTokens: usage?.totalTokens ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const defFiles = (await walk(checksDir)).filter((f) => f.endsWith(".def.json"));
  const rows = [];
  for (const defPath of defFiles) {
    let def;
    try {
      def = JSON.parse(await fs.readFile(defPath, "utf8"));
    } catch {
      continue;
    }
    if (!def.id) continue;
    const { tier, model } = await classify(def);
    const latest = await latestResult(def.id);
    const declared = def.cost ?? "cheap";
    const expected = expectedCost(tier);
    rows.push({
      id: def.id,
      tier,
      model,
      ageMin: latest?.ageMin ?? null,
      costUsd: latest?.costUsd ?? null,
      totalTokens: latest?.totalTokens ?? null,
      declared,
      expected,
      defPath,
      def,
    });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));

  if (opts.writeDefs) {
    await writeDefs(rows);
    return;
  }

  const filtered = opts.tier ? rows.filter((r) => r.tier === opts.tier) : rows;

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  const tiers = ["deterministic", "llm", "llm-explore"];
  const counts = Object.fromEntries(tiers.map((t) => [t, rows.filter((r) => r.tier === t).length]));
  console.log(
    `Checks: ${rows.length}  |  deterministic ${counts.deterministic}  |  llm ${counts.llm}  |  llm-explore ${counts["llm-explore"]}\n`,
  );

  // Audit: the harness's declared def.cost must match the derived tier, or the
  // tree badge / confirm prompt will mislead. Flag drift; `--write-defs` fixes it.
  const mismatched = rows.filter((r) => r.declared !== r.expected);
  if (mismatched.length) {
    console.log(`⚠ ${mismatched.length} def(s) whose declared cost != derived cost — run \`--write-defs\` to fix:`);
    for (const r of mismatched) {
      console.log(`  ${r.id.padEnd(48)} declared=${r.declared} derived=${r.expected}`);
    }
    console.log();
  } else {
    console.log("✓ all def.cost declarations match derived cost.\n");
  }
  for (const tier of tiers) {
    const group = filtered.filter((r) => r.tier === tier);
    if (!group.length) continue;
    console.log(`## ${tier} (${group.length})`);
    for (const r of group) {
      const age =
        r.ageMin == null
          ? "no-result"
          : opts.staleMinutes != null && r.ageMin > opts.staleMinutes
            ? `STALE ${Math.round(r.ageMin / 1440)}d`
            : `${Math.round(r.ageMin / 1440)}d`;
      const model = r.model ? `  [${r.model}]` : "";
      // Show the last run's measured spend for LLM checks, so "what did this
      // actually cost" is visible alongside the static tier.
      const spend = r.costUsd != null
        ? `  $${r.costUsd.toFixed(4)}${r.totalTokens != null ? ` / ${r.totalTokens}tok` : ""}`
        : "";
      console.log(`  ${r.id.padEnd(48)} ${age}${spend}${model}`);
    }
    console.log();
  }
}

// Stamp def.cost so the harness's declarative field matches the derived tier.
// Surgical text edit (not JSON re-serialize) so diffs are a single line and the
// author's existing formatting / unicode is untouched: insert `"cost": "llm",`
// on its own line right after the `"description":` line, or drop a stale cost
// line on a cheap check.
async function writeDefs(rows) {
  let changed = 0;
  for (const r of rows) {
    const raw = await fs.readFile(r.defPath, "utf8");
    const hasField = /^\s*"cost":/m.test(raw);
    let next = raw;
    if (r.expected === "llm") {
      if (r.declared === "llm") continue;
      // Insert after the description line, matching its indentation.
      const m = raw.match(/^([ \t]*)"description":.*,[ \t]*$/m);
      if (!m) {
        console.log(`skip (no single-line description): ${r.id}`);
        continue;
      }
      next = raw.replace(m[0], `${m[0]}\n${m[1]}"cost": "llm",`);
    } else {
      if (!hasField) continue;
      next = raw.replace(/^[ \t]*"cost":\s*"[^"]*",?[ \t]*\r?\n/m, "");
    }
    await fs.writeFile(r.defPath, next);
    changed += 1;
    console.log(`${r.expected === "llm" ? "set   cost=llm  " : "removed cost    "} ${r.id}`);
  }
  console.log(`\n${changed} def(s) updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
