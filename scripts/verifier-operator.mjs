#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchingPark } from "../verifier/checks/lib/parked-failures.mjs";
import { affectedChecks, filesNewerThan, fingerprintFiles, formatDuration, freshnessFor, presentationFor, profileFor, summarizeProfiles } from "./lib/verifier-operator.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(repoRoot, process.env.VERIFIER_WORKSPACE ?? "verifier");
const policyPath = path.join(workspace, "operator-policy.json");
const baselinesPath = path.join(workspace, "state", "operator-baselines.json");

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function definitions() {
  const map = new Map();
  for (const file of (await walk(path.join(workspace, "checks"))).filter((name) => name.endsWith(".def.json"))) {
    const def = await readJson(file);
    if (def?.id) map.set(def.id, def);
  }
  return map;
}

function leafIds(defs) {
  return [...defs.values()].filter((def) => !(def.inputs ?? []).some((input) => input.kind === "check")).map((def) => def.id);
}

async function latestResult(id) {
  const dir = path.join(workspace, "results", id);
  let files;
  try { files = await fs.readdir(dir); } catch { return null; }
  const latest = files.filter((file) => file.endsWith(".json")).sort().at(-1);
  return latest ? readJson(path.join(dir, latest)) : null;
}

function changedFiles(base) {
  const files = new Set();
  const add = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean).forEach((file) => files.add(file));
  try { add(git(["diff", "--name-only", `${base}..HEAD`])); }
  catch { add(git(["diff", "--name-only", "HEAD"])); }
  add(git(["diff", "--name-only"]));
  add(git(["diff", "--name-only", "--cached"]));
  add(git(["ls-files", "--others", "--exclude-standard"]));
  return [...files].sort();
}

function commitsSince(timestamp) {
  const commits = [];
  try {
    const log = git(["log", `--since=${timestamp}`, "--name-only", "--pretty=format:COMMIT:%cI"]);
    let current = null;
    for (const line of log.split("\n")) {
      if (line.startsWith("COMMIT:")) {
        if (current) commits.push(current);
        current = { at: line.slice("COMMIT:".length).trim(), files: [] };
      } else if (current && line.trim()) current.files.push(line.trim());
    }
    if (current) commits.push(current);
  } catch { /* working-tree changes still provide a conservative answer */ }
  return commits;
}

function fallbackBase() {
  for (const candidate of ["origin/dev", "dev", "HEAD^", "HEAD"]) {
    try { git(["rev-parse", "--verify", candidate]); return candidate; } catch { /* try next */ }
  }
  return "HEAD";
}

function labelFor(id, def, policy) {
  return policy.checkOverrides?.[id]?.label ?? policy.conclusions?.find((item) => item.id === id)?.label ?? def?.description ?? id;
}

async function viewPresentation(checks, defs, policy) {
  const results = new Map();
  await Promise.all(checks.map(async (id) => results.set(id, await latestResult(id))));
  const timestamps = [...results.values()].map((result) => result?.timestamp).filter(Boolean).sort();
  const commits = timestamps.length ? commitsSince(timestamps[0]) : [];
  const dirty = changedFiles("HEAD");
  const rules = policy.changeRules ?? [];
  const out = {};
  for (const id of checks) {
    const result = results.get(id);
    const profile = profileFor(id, defs.get(id), policy);
    const relevantChanges = result?.timestamp
      ? affectedChecks(filesNewerThan(result.timestamp, { dirty, commits }), rules).checks.includes(id)
      : false;
    out[id] = presentationFor(result, profile, freshnessFor(result, { codeChanged: relevantChanges }));
  }
  return out;
}

async function rowsFor(ids, defs, policy) {
  return Promise.all(ids.map(async (id) => {
    const result = await latestResult(id);
    const profile = profileFor(id, defs.get(id), policy);
    if (result?.status === "pass" && Number.isFinite(result.durationMs) && result.durationMs > 0) profile.observedSeconds = result.durationMs / 1000;
    return { id, def: defs.get(id), profile };
  }));
}

function printCampaign(rows, defs, policy) {
  const total = summarizeProfiles(rows);
  console.log(`${rows.length} checks · ${formatDuration(total.seconds)} · ${total.llmCount ? `${total.llmCount} LLM` : "no LLM"}`);
  if (total.requires.length) console.log(`Requires: ${total.requires.join(", ")}`);
  if (total.effects.length) console.log(`Effects: ${total.effects.join(", ")}`);
  for (const row of rows) {
    const timing = row.profile.observedSeconds ? `${formatDuration(row.profile.observedSeconds)} last run` : row.profile.label;
    const badges = [timing, row.profile.tokens !== "none" ? `tokens: ${row.profile.tokens}` : null, ...(row.profile.effects ?? [])].filter(Boolean);
    console.log(`- ${labelFor(row.id, defs.get(row.id), policy)} [${row.id}] — ${badges.join("; ")}`);
  }
}

function runCheck(id) {
  console.log(`\nRunning ${id}…`);
  const result = spawnSync("verifier-run", [id], { cwd: repoRoot, stdio: "inherit", env: process.env });
  return result.status ?? 1;
}

async function recordBaseline(id, files) {
  const baselines = await readJson(baselinesPath, { schemaVersion: 1, checks: {} });
  baselines.checks[id] = {
    commit: git(["rev-parse", "HEAD"]),
    dependencyFingerprint: await fingerprintFiles(repoRoot, files),
    files,
    recordedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(baselinesPath), { recursive: true });
  await fs.writeFile(baselinesPath, `${JSON.stringify(baselines, null, 2)}\n`);
}

async function work(args, policy, defs) {
  const base = fallbackBase();
  const files = changedFiles(base);
  console.log(`# Check my current work\n\nBaseline: ${base}\nChanged paths: ${files.length}`);
  if (!files.length) { console.log("No committed or uncommitted changes to classify."); return; }
  const affected = affectedChecks(files, policy.changeRules ?? []);
  const baselines = await readJson(baselinesPath, { checks: {} });
  const perCheckFiles = new Map();
  for (const id of affected.checks) {
    const checkBase = baselines.checks?.[id]?.commit ?? base;
    const relevant = changedFiles(checkBase).filter((file) => affectedChecks([file], policy.changeRules ?? []).checks.includes(id));
    if (relevant.length) perCheckFiles.set(id, relevant);
  }
  const rows = await rowsFor([...perCheckFiles.keys()], defs, policy);
  printCampaign(rows, defs, policy);
  if (affected.unmapped.length) {
    console.log(`\nUnmapped paths (not assumed safe):\n${affected.unmapped.map((file) => `- ${file}`).join("\n")}`);
  }
  const selected = args.includes("--all") ? rows : rows.filter((row) => row.profile.autoSafe);
  const deferred = rows.filter((row) => !selected.includes(row));
  console.log(`\nDefault action: run ${selected.length} safe/short checks; defer ${deferred.length} costly or side-effectful checks.`);
  if (args.includes("--dry-run")) return;
  for (const row of selected) {
    const code = runCheck(row.id);
    if (code === 0) await recordBaseline(row.id, perCheckFiles.get(row.id) ?? []);
    else console.error(`${row.id} did not complete successfully; its baseline was not advanced.`);
  }
}

function age(result) {
  const time = Date.parse(result?.timestamp ?? result?.runId ?? "");
  if (Number.isNaN(time)) return "never run";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

async function parkedItems() {
  const parsed = await readJson(path.join(workspace, "parked-failures.json"), { items: [] });
  return parsed.items ?? [];
}

function displayedStatus(id, result, parks, missing = "unknown") {
  const park = matchingPark(parks, id, result);
  return park ? "parked" : (result?.status ?? missing);
}

async function stand(args, policy, defs) {
  const parks = await parkedItems();
  let focusLabel = policy.focus.label;
  try {
    const focusText = await fs.readFile(path.resolve(workspace, policy.focus.source), "utf8");
    const firstFocus = focusText.match(/^- \*\*(.+?)\*\*/m)?.[1];
    if (firstFocus) focusLabel = `Current work: ${firstFocus.replace(/\.$/, "")}`;
  } catch { /* the policy label remains an explicit fallback */ }
  console.log(`# Tell me where we stand\n\n${focusLabel}\n`);
  const focusItems = [...new Set([...(policy.focus.checks ?? []), "validation.pr", "meta.verifier-health"])]
    .map((id) => ({ id, label: labelFor(id, defs.get(id), policy) }));
  const items = args.includes("--all") ? policy.conclusions ?? [] : focusItems;
  const rows = [];
  for (const item of items) rows.push({ ...item, result: await latestResult(item.id) });
  const visible = args.includes("--problems") ? rows.filter((row) => !["pass", "parked"].includes(displayedStatus(row.id, row.result, parks))) : rows;
  for (const row of visible) {
    const status = displayedStatus(row.id, row.result, parks);
    const park = matchingPark(parks, row.id, row.result);
    const note = park ? `\n  Parked until ${park.reviewAfter}: ${park.reason}` : (row.result?.summary ? `\n  ${row.result.summary}` : "");
    console.log(`- ${status}: ${row.label} [${row.id}] — ${age(row.result)}${note}`);
  }
  const parked = rows.filter((row) => displayedStatus(row.id, row.result, parks) === "parked");
  const problems = rows.filter((row) => !["pass", "parked"].includes(displayedStatus(row.id, row.result, parks)));
  console.log(`\n${problems.length ? `${problems.length} conclusion(s) need attention or evidence.` : "All displayed conclusions currently pass."}`);
  if (parked.length) console.log(`${parked.length} known failure(s) are parked, not forgotten. They return to the problem list on their review date or if the failure changes.`);
  if (!args.includes("--all")) console.log("Showing current-focus evidence. Add --all for every top-level concern or --problems to hide passing rows.");
  console.log("Read-only: no checks were run and no model was called.");
}

async function prepare(args, policy, defs) {
  const name = args.find((arg) => !arg.startsWith("--")) ?? "testnet-simulation";
  const milestone = policy.milestones?.[name];
  if (!milestone) throw new Error(`Unknown milestone '${name}'. Choose: ${Object.keys(policy.milestones ?? {}).join(", ")}`);
  console.log(`# Prepare for: ${milestone.label}\n`);
  const rows = (milestone.steps ?? []).map((step) => ({
    id: step.command.join(" "),
    def: null,
    profile: { ...(policy.costProfiles[step.cost] ?? {}), label: policy.costProfiles[step.cost]?.label, stepLabel: step.label, command: step.command },
  }));
  const total = summarizeProfiles(rows);
  console.log(`${rows.length} steps · ${formatDuration(total.seconds)} · ${total.llmCount ? `${total.llmCount} LLM` : "no LLM"}`);
  if (total.requires.length) console.log(`Requires: ${total.requires.join(", ")}`);
  if (total.effects.length) console.log(`Effects: ${total.effects.join(", ")}`);
  for (const row of rows) console.log(`- ${row.profile.stepLabel} — ${row.profile.label}\n  ${row.profile.command.join(" ")}`);
  if (!args.includes("--run")) { console.log("\nPreview only. Add --run to execute; existing guarded-check opt-ins still apply."); return; }
  for (const row of rows) {
    console.log(`\nRunning ${row.profile.stepLabel}…`);
    const result = spawnSync(row.profile.command[0], row.profile.command.slice(1), { cwd: repoRoot, stdio: "inherit", env: process.env });
    if ((result.status ?? 1) !== 0) { console.error(`Stopped after ${row.profile.stepLabel}.`); process.exitCode = 1; break; }
  }
}

async function view(args, policy, defs) {
  const name = args[0] ?? "current-work";
  if (name === "current-work") {
    const base = fallbackBase();
    const files = changedFiles(base);
    const affected = affectedChecks(files, policy.changeRules ?? []);
    const baselines = await readJson(baselinesPath, { checks: {} });
    const checks = affected.checks.filter((id) => {
      const checkBase = baselines.checks?.[id]?.commit ?? base;
      return changedFiles(checkBase).some((file) => affectedChecks([file], policy.changeRules ?? []).checks.includes(id));
    });
    const suffix = affected.unmapped.length ? `; ${affected.unmapped.length} unmapped path(s)` : "";
    console.log(JSON.stringify({ checks, presentation: await viewPresentation(checks, defs, policy), summary: `${files.length} changed path(s) · ${checks.length} relevant check(s)${suffix}` }));
    return;
  }
  if (name === "where-we-stand") {
    const checks = [...new Set([...(policy.focus.checks ?? []), "validation.pr", "meta.verifier-health"])];
    console.log(JSON.stringify({ checks, presentation: await viewPresentation(checks, defs, policy), summary: `${policy.focus.label} · stored evidence only` }));
    return;
  }
  if (name === "milestone") {
    const milestoneName = args[1] ?? "testnet-simulation";
    const milestone = policy.milestones?.[milestoneName];
    if (!milestone) throw new Error(`Unknown milestone '${milestoneName}'`);
    const checks = milestone.checks ?? [];
    console.log(JSON.stringify({ checks, presentation: await viewPresentation(checks, defs, policy), summary: `${milestone.label} · required evidence and campaign preview` }));
    return;
  }
  if (name === "leaves") {
    const leaves = leafIds(defs);
    const parks = await parkedItems();
    const presentation = await viewPresentation(leaves, defs, policy);
    const results = new Map(await Promise.all(leaves.map(async (id) => [id, await latestResult(id)])));
    for (const id of leaves) {
      const park = matchingPark(parks, id, results.get(id));
      if (park) presentation[id] = { ...presentation[id], parked: { reviewAfter: park.reviewAfter, reason: park.reason } };
    }
    const rank = (id) => {
      const status = displayedStatus(id, results.get(id), parks, "never run");
      if (status === "fail" || status === "error") return 0;
      if (status === "never run") return 2;
      if (status === "parked") return 4;
      if (status === "skipped") return 4;
      return presentation[id]?.freshness?.changed ? 1 : 3;
    };
    const checks = leaves.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const counts = checks.reduce((acc, id) => { const s = displayedStatus(id, results.get(id), parks, "never run"); acc[s] = (acc[s] ?? 0) + 1; return acc; }, {});
    const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ") + " · failing first, then code-changed, never-run, passing, parked or intentionally skipped";
    console.log(JSON.stringify({ checks, presentation, summary }));
    return;
  }
  if (name === "all-checks") {
    const checks = [...defs.keys()];
    console.log(JSON.stringify({ checks: ["root"], presentation: await viewPresentation(checks, defs, policy), summary: "Complete evidence DAG" }));
    return;
  }
  throw new Error(`Unknown view '${name}'`);
}

async function main() {
  const [command = "stand", ...args] = process.argv.slice(2);
  const policy = await readJson(policyPath);
  const defs = await definitions();
  if (command === "work") await work(args, policy, defs);
  else if (command === "stand") await stand(args, policy, defs);
  else if (command === "prepare") await prepare(args, policy, defs);
  else if (command === "view") await view(args, policy, defs);
  else throw new Error(`Unknown action '${command}'. Use work, stand, or prepare.`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
