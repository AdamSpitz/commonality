#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const workspace = process.env.VERIFIER_WORKSPACE ?? "verifier";
const checkId = process.argv[2] ?? "root";
const resultDir = path.join(workspace, "results", checkId);

async function latestResultFile(dir) {
  const entries = await fs.readdir(dir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return entries.filter((name) => name.endsWith(".json")).sort().at(-1);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function latestResult(checkId) {
  const dir = path.join(workspace, "results", checkId);
  const file = await latestResultFile(dir);
  if (!file) return null;
  return {
    file: path.join(dir, file),
    result: await readJsonIfExists(path.join(dir, file))
  };
}

async function checkInputsFor(checkId) {
  const defPath = path.join(workspace, "checks", ...checkId.split(".")) + ".def.json";
  const def = await readJsonIfExists(defPath);
  return (def?.inputs ?? []).filter((input) => input.kind === "check");
}

function timeOf(result) {
  const time = Date.parse(result?.timestamp ?? result?.runId ?? "");
  return Number.isNaN(time) ? null : time;
}

async function staleInputsFor(checkId, result) {
  const parentTime = timeOf(result);
  if (parentTime === null) return [];
  const staleInputs = [];
  for (const input of await checkInputsFor(checkId)) {
    const latest = await latestResult(input.id);
    const childTime = timeOf(latest?.result);
    if (childTime !== null && childTime > parentTime) {
      staleInputs.push({ id: input.id, timestamp: latest.result.timestamp ?? latest.result.runId, status: latest.result.status });
    }
  }
  return staleInputs;
}

function printChildTree(children, indent = "") {
  for (const child of children ?? []) {
    const role = child.role ? ` (${child.role})` : "";
    console.log(`${indent}- ${child.id}${role}: ${child.status} — ${child.summary}`);
  }
}

const file = await latestResultFile(resultDir);
if (!file) {
  console.error(`No verifier result found for ${checkId}. Try: verifier-run --workspace ${workspace} ${checkId}`);
  process.exit(2);
}

const resultPath = path.join(resultDir, file);
const result = JSON.parse(await fs.readFile(resultPath, "utf8"));
const staleInputs = await staleInputsFor(checkId, result);

console.log(`# Verifier report: ${checkId}`);
console.log(`status: ${result.status}`);
console.log(`summary: ${result.summary}`);
console.log(`timestamp: ${result.timestamp ?? "unknown"}`);
console.log(`result: ${resultPath}`);

if (staleInputs.length > 0) {
  console.log("\n## Staleness warning");
  console.log(`This ${checkId} report is older than ${staleInputs.length} direct input result(s). It may not reflect the current dashboard state.`);
  for (const input of staleInputs) {
    console.log(`- ${input.id}: ${input.status} at ${input.timestamp}`);
  }
  console.log(`Run: verifier-run --workspace ${workspace} ${checkId}`);
}

const children = result.findings?.children;
if (Array.isArray(children) && children.length > 0) {
  console.log("\n## Child checks");
  printChildTree(children);
}

const artifacts = result.artifacts;
if (Array.isArray(artifacts) && artifacts.length > 0) {
  console.log("\n## Artifacts");
  for (const artifact of artifacts) {
    console.log(`- ${artifact.name ?? "artifact"}: ${artifact.path}${artifact.description ? ` — ${artifact.description}` : ""}`);
  }
}
