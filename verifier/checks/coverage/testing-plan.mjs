import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

const REQUIRED_ITEM_IDS = [
  "automated-feedback-loops",
  "smart-contracts",
  "sdk-data-aggregation",
  "indexer-chain-integration",
  "ui-unit-integration",
  "ui-e2e",
  "ai-services-generated-data",
  "operations-degradation",
  "performance-acceptability",
  "environments",
  "manual-llm-validation-roster",
  "cross-cutting-risks",
  "known-automated-test-gaps"
];

const VALID_COVERAGE = new Set([
  "automated-check",
  "report-attestation",
  "intentionally-manual",
  "known-gap",
  "not-applicable"
]);

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

async function collectCheckIds(dir) {
  const ids = new Set();

  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        return;
      }
      if (!entry.name.endsWith(".def.json")) return;
      const def = JSON.parse(await readFile(entryPath, "utf8"));
      if (typeof def.id === "string") ids.add(def.id);
    }));
  }

  await visit(dir);
  return ids;
}

function parseInventory(input) {
  if (!input) throw new Error("Missing testing-plan inventory file input.");
  if (input.content === null || input.content === undefined) throw new Error(`Could not read inventory file: ${input.path}`);
  const inventory = JSON.parse(input.content);
  if (!Array.isArray(inventory.items)) throw new Error("Inventory must contain an items array.");
  return inventory;
}

function summarizeCoverage(items) {
  return items.reduce((acc, item) => {
    acc[item.coverage] = (acc[item.coverage] ?? 0) + 1;
    return acc;
  }, {});
}

function validateItemShape(item, index) {
  const problems = [];
  const label = item?.id ?? `item at index ${index}`;

  if (!item || typeof item !== "object") return [`Inventory item at index ${index} is not an object.`];
  if (typeof item.id !== "string" || item.id.length === 0) problems.push(`${label}: missing id.`);
  if (typeof item.title !== "string" || item.title.length === 0) problems.push(`${label}: missing title.`);
  if (!VALID_COVERAGE.has(item.coverage)) problems.push(`${label}: invalid coverage '${item.coverage}'.`);
  if (!Array.isArray(item.checkIds)) problems.push(`${label}: checkIds must be an array, even when empty.`);

  if ((item.coverage === "known-gap" || item.coverage === "intentionally-manual") && typeof item.status !== "string") {
    problems.push(`${label}: ${item.coverage} items must explain current status.`);
  }
  if (item.coverage === "known-gap" && typeof item.owner !== "string") {
    problems.push(`${label}: known-gap items must name an owner.`);
  }
  if ((item.coverage === "automated-check" || item.coverage === "report-attestation") && Array.isArray(item.checkIds) && item.checkIds.length === 0) {
    problems.push(`${label}: ${item.coverage} items must reference at least one verifier check.`);
  }

  return problems;
}

function validateInventory(inventory, knownCheckIds) {
  const items = inventory.items;
  const problems = [];
  const ids = new Set();

  items.forEach((item, index) => {
    problems.push(...validateItemShape(item, index));
    if (!item?.id) return;
    if (ids.has(item.id)) problems.push(`${item.id}: duplicate inventory id.`);
    ids.add(item.id);

    for (const checkId of item.checkIds ?? []) {
      if (!knownCheckIds.has(checkId)) problems.push(`${item.id}: references nonexistent verifier check '${checkId}'.`);
    }
  });

  for (const requiredId of REQUIRED_ITEM_IDS) {
    if (!ids.has(requiredId)) problems.push(`Missing required testing-plan mapping '${requiredId}'.`);
  }

  return problems;
}

emit(async () => {
  const inputs = readInputs();
  const inventory = parseInventory(findFileInput(inputs, "testingPlanItems"));
  const knownCheckIds = await collectCheckIds(workspacePath("checks"));
  const problems = validateInventory(inventory, knownCheckIds);
  const items = inventory.items;
  const coverageCounts = summarizeCoverage(items);
  const knownGaps = items
    .filter((item) => item.coverage === "known-gap")
    .map((item) => ({ id: item.id, title: item.title, owner: item.owner, status: item.status, checkIds: item.checkIds }));
  const manualItems = items
    .filter((item) => item.coverage === "intentionally-manual")
    .map((item) => ({ id: item.id, title: item.title, owner: item.owner, status: item.status }));

  const findings = {
    source: inventory.source,
    scope: inventory.scope,
    requiredItemIds: REQUIRED_ITEM_IDS,
    coverageCounts,
    knownGaps,
    manualItems,
    problems
  };

  if (problems.length > 0) {
    return fail(`Testing-plan coverage inventory has ${problems.length} problem(s).`, { findings });
  }

  return pass(
    `Testing-plan coverage inventory maps ${items.length} release-confidence dimension(s): ${coverageCounts["automated-check"] ?? 0} automated, ${coverageCounts["known-gap"] ?? 0} known gaps, ${coverageCounts["intentionally-manual"] ?? 0} intentionally manual.`,
    { findings }
  );
});
