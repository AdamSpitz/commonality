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

console.log(`# Verifier report: ${checkId}`);
console.log(`status: ${result.status}`);
console.log(`summary: ${result.summary}`);
console.log(`timestamp: ${result.timestamp ?? "unknown"}`);
console.log(`result: ${resultPath}`);

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
