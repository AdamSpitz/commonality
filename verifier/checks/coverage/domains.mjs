import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

const EXPECTED_DOMAIN_NAMES = [
  "Commonality",
  "LazyGiving",
  "Alignment",
  "Tally",
  "Content Funding",
  "Civility",
  "Common Sense Majority",
  "Conceptspace"
];

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseJsonInput(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content === null || input.content === undefined) throw new Error(`Could not read ${label} file: ${input.path}`);
  return JSON.parse(input.content);
}

function fileContent(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content === null || input.content === undefined) throw new Error(`Could not read ${label} file: ${input.path}`);
  return input.content;
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

function allCheckIds(domain) {
  const coverage = domain.coverage ?? {};
  return [
    ...(coverage.routeSmokeCheckIds ?? []),
    ...(coverage.artifactSmokeCheckIds ?? []),
    ...(coverage.manualReviewCheckIds ?? [])
  ];
}

function validateDomain(domain, index, knownCheckIds, productDoc) {
  const problems = [];
  const label = domain?.id ?? `domain at index ${index}`;
  if (!domain || typeof domain !== "object") return [`Domain inventory item at index ${index} is not an object.`];
  if (typeof domain.id !== "string" || domain.id.length === 0) problems.push(`${label}: missing id.`);
  if (typeof domain.name !== "string" || domain.name.length === 0) problems.push(`${label}: missing name.`);
  if (domain.name && !productDoc.includes(domain.name)) problems.push(`${label}: domain name '${domain.name}' was not found in product domain source doc.`);

  const coverage = domain.coverage ?? {};
  if (!Array.isArray(coverage.routeSmokeCheckIds)) problems.push(`${label}: routeSmokeCheckIds must be an array.`);
  if (!Array.isArray(coverage.artifactSmokeCheckIds)) problems.push(`${label}: artifactSmokeCheckIds must be an array.`);
  if (!Array.isArray(coverage.manualReviewCheckIds)) problems.push(`${label}: manualReviewCheckIds must be an array.`);
  if (typeof coverage.docsCoverage !== "string" || coverage.docsCoverage.length === 0) problems.push(`${label}: docsCoverage must explain documentation/onboarding coverage.`);

  const checkIds = allCheckIds(domain);
  if (checkIds.length === 0) problems.push(`${label}: domain has no verifier check coverage story.`);
  if ((coverage.routeSmokeCheckIds ?? []).length === 0 && (coverage.artifactSmokeCheckIds ?? []).length === 0) {
    problems.push(`${label}: domain has no automated route or artifact smoke coverage.`);
  }
  if ((coverage.manualReviewCheckIds ?? []).length === 0 && (!Array.isArray(domain.deferred) || domain.deferred.length === 0)) {
    problems.push(`${label}: domain has no manual/review coverage or explicit deferral.`);
  }
  for (const checkId of checkIds) {
    if (!knownCheckIds.has(checkId)) problems.push(`${label}: references nonexistent verifier check '${checkId}'.`);
  }
  return problems;
}

emit(async () => {
  const inputs = readInputs();
  const inventory = parseJsonInput(findFileInput(inputs, "domainsInventory"), "domains inventory");
  const productDoc = fileContent(findFileInput(inputs, "uiDomainsDoc"), "UI domains source doc");
  if (!Array.isArray(inventory.domains)) throw new Error("Domains inventory must contain a domains array.");

  const knownCheckIds = await collectCheckIds(workspacePath("checks"));
  const ids = new Set();
  const names = new Set();
  const problems = [];

  for (const [index, domain] of inventory.domains.entries()) {
    problems.push(...validateDomain(domain, index, knownCheckIds, productDoc));
    if (domain?.id) {
      if (ids.has(domain.id)) problems.push(`${domain.id}: duplicate domain id.`);
      ids.add(domain.id);
    }
    if (domain?.name) names.add(domain.name);
  }

  for (const expectedName of EXPECTED_DOMAIN_NAMES) {
    if (!productDoc.includes(expectedName)) problems.push(`Product domain source doc no longer names expected domain '${expectedName}'. Update the verifier's expected domain list.`);
    if (!names.has(expectedName)) problems.push(`Domains inventory is missing '${expectedName}'.`);
  }

  const findings = {
    source: inventory.source,
    scope: inventory.scope,
    expectedDomains: EXPECTED_DOMAIN_NAMES,
    domains: inventory.domains.map((domain) => ({
      id: domain.id,
      name: domain.name,
      routeSmokeCheckIds: domain.coverage?.routeSmokeCheckIds ?? [],
      artifactSmokeCheckIds: domain.coverage?.artifactSmokeCheckIds ?? [],
      manualReviewCheckIds: domain.coverage?.manualReviewCheckIds ?? [],
      docsCoverage: domain.coverage?.docsCoverage,
      deferred: domain.deferred ?? []
    })),
    problems
  };

  if (problems.length > 0) return fail(`Domain coverage inventory has ${problems.length} problem(s).`, { findings });
  return pass(`Domain coverage inventory maps all ${EXPECTED_DOMAIN_NAMES.length} product domains.`, { findings });
});
