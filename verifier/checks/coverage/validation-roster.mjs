import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

const REQUIRED_ITEM_IDS = [
  "per-domain-validation",
  "persona-validation",
  "newcomer-validation",
  "documentation-validation",
  "ai-service-validation",
  "cross-domain-dirty-world",
  "smart-contract-security",
  "demo-dry-run",
  "operations-chaos",
  "qa-lead-synthesis"
];
const VALID_MODES = new Set(["report-attestation", "automated-check", "mixed", "explicitly-deferred"]);

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseInventory(input) {
  if (!input) throw new Error("Missing validation roster inventory file input.");
  if (input.content === null || input.content === undefined) throw new Error(`Could not read inventory file: ${input.path}`);
  const inventory = JSON.parse(input.content);
  if (!Array.isArray(inventory.items)) throw new Error("Validation roster inventory must contain an items array.");
  return inventory;
}

async function collectCheckIds(dir) {
  const ids = new Set();
  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) return visit(entryPath);
      if (!entry.name.endsWith(".def.json")) return undefined;
      const def = JSON.parse(await readFile(entryPath, "utf8"));
      if (typeof def.id === "string") ids.add(def.id);
      return undefined;
    }));
  }
  await visit(dir);
  return ids;
}

function validateItem(item, index, knownCheckIds) {
  const problems = [];
  const label = item?.id ?? `item at index ${index}`;
  if (!item || typeof item !== "object") return [`Inventory item at index ${index} is not an object.`];
  if (typeof item.id !== "string" || item.id.length === 0) problems.push(`${label}: missing id.`);
  if (typeof item.title !== "string" || item.title.length === 0) problems.push(`${label}: missing title.`);
  if (typeof item.sourceSection !== "string" || item.sourceSection.length === 0) problems.push(`${label}: missing sourceSection.`);
  if (!Array.isArray(item.requiredPasses) || item.requiredPasses.length === 0) problems.push(`${label}: requiredPasses must list at least one validation pass.`);
  if (!VALID_MODES.has(item.coverageMode)) problems.push(`${label}: invalid coverageMode '${item.coverageMode}'.`);
  if (!Array.isArray(item.checkIds)) problems.push(`${label}: checkIds must be an array.`);
  if (typeof item.owner !== "string" || item.owner.length === 0) problems.push(`${label}: missing owner.`);
  if (!Number.isFinite(Number(item.freshnessDays)) || Number(item.freshnessDays) <= 0) problems.push(`${label}: freshnessDays must be a positive number.`);

  const checkIds = item.checkIds ?? [];
  if (["report-attestation", "automated-check", "mixed"].includes(item.coverageMode) && checkIds.length === 0) {
    problems.push(`${label}: ${item.coverageMode} items must reference at least one verifier check.`);
  }
  if (item.coverageMode === "explicitly-deferred" && (!Array.isArray(item.exclusions) || item.exclusions.length === 0)) {
    problems.push(`${label}: explicitly-deferred items must name the exclusion/defer reason.`);
  }
  for (const checkId of checkIds) {
    if (!knownCheckIds.has(checkId)) problems.push(`${label}: references nonexistent verifier check '${checkId}'.`);
  }
  return problems;
}

emit(async () => {
  const inventory = parseInventory(findFileInput(readInputs(), "validationRoster"));
  const knownCheckIds = await collectCheckIds(workspacePath("checks"));
  const ids = new Set();
  const problems = [];
  for (const [index, item] of inventory.items.entries()) {
    problems.push(...validateItem(item, index, knownCheckIds));
    if (item?.id) {
      if (ids.has(item.id)) problems.push(`${item.id}: duplicate roster id.`);
      ids.add(item.id);
    }
  }
  for (const requiredId of REQUIRED_ITEM_IDS) {
    if (!ids.has(requiredId)) problems.push(`Missing required manual/LLM roster mapping '${requiredId}'.`);
  }

  const coverageCounts = inventory.items.reduce((acc, item) => {
    acc[item.coverageMode] = (acc[item.coverageMode] ?? 0) + 1;
    return acc;
  }, {});
  const deferred = inventory.items
    .filter((item) => item.coverageMode === "explicitly-deferred")
    .map((item) => ({ id: item.id, title: item.title, owner: item.owner, exclusions: item.exclusions }));
  const findings = {
    source: inventory.source,
    scope: inventory.scope,
    requiredItemIds: REQUIRED_ITEM_IDS,
    coverageCounts,
    deferred,
    roster: inventory.items.map((item) => ({
      id: item.id,
      coverageMode: item.coverageMode,
      requiredPasses: item.requiredPasses,
      checkIds: item.checkIds,
      exclusions: item.exclusions ?? [],
      freshnessDays: item.freshnessDays,
      owner: item.owner
    })),
    problems
  };

  if (problems.length > 0) return fail(`Manual/LLM validation roster has ${problems.length} coverage problem(s).`, { findings });
  return pass(`Manual/LLM validation roster maps ${inventory.items.length} role group(s): ${coverageCounts["report-attestation"] ?? 0} attested, ${coverageCounts["automated-check"] ?? 0} automated, ${coverageCounts.mixed ?? 0} mixed, ${coverageCounts["explicitly-deferred"] ?? 0} explicitly deferred.`, { findings });
});
