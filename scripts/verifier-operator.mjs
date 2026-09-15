#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { affectedChecks, fingerprintFiles, formatDuration, profileFor, summarizeProfiles } from "./lib/verifier-operator.mjs";

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

function fallbackBase() {
  for (const candidate of ["origin/dev", "dev", "HEAD^", "HEAD"]) {
    try { git(["rev-parse", "--verify", candidate]); return candidate; } catch { /* try next */ }
  }
  return "HEAD";
}

function labelFor(id, def, policy) {
  return policy.checkOverrides?.[id]?.label ?? policy.conclusions?.find((item) => item.id === id)?.label ?? def?.description ?? id;
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

async function stand(args, policy, defs) {
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
  const visible = args.includes("--problems") ? rows.filter((row) => row.result?.status !== "pass") : rows;
  for (const row of visible) console.log(`- ${row.result?.status ?? "unknown"}: ${row.label} [${row.id}] — ${age(row.result)}${row.result?.summary ? `\n  ${row.result.summary}` : ""}`);
  const problems = rows.filter((row) => !["pass"].includes(row.result?.status));
  console.log(`\n${problems.length ? `${problems.length} conclusion(s) need attention or evidence.` : "All displayed conclusions currently pass."}`);
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

async function main() {
  const [command = "stand", ...args] = process.argv.slice(2);
  const policy = await readJson(policyPath);
  const defs = await definitions();
  if (command === "work") await work(args, policy, defs);
  else if (command === "stand") await stand(args, policy, defs);
  else if (command === "prepare") await prepare(args, policy, defs);
  else throw new Error(`Unknown action '${command}'. Use work, stand, or prepare.`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
