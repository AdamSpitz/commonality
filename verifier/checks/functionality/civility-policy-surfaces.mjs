import { emit, fail, pass, readInputs } from "../lib/result.mjs";

function fileInput(inputs, alias) {
  const input = inputs.find((candidate) => candidate.kind === "file" && candidate.as === alias);
  if (!input || typeof input.content !== "string") throw new Error(`Missing file input '${alias}'.`);
  return input.content;
}

function manifestRoutes(source) {
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
}

emit(async () => {
  const inputs = readInputs();
  const inventory = JSON.parse(fileInput(inputs, "inventory"));
  const manifest = fileInput(inputs, "manifest");
  const files = new Map(
    inputs.filter((input) => input.kind === "file" && input.as?.startsWith("source:")).map((input) => [input.path, input.content]),
  );
  const problems = [];

  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.routes) || !Array.isArray(inventory.invariants)) {
    throw new Error("Civility policy surface inventory has an unsupported shape.");
  }

  const declaredRoutes = inventory.routes.map(({ path }) => path).sort();
  const actualRoutes = manifestRoutes(manifest).sort();
  for (const route of actualRoutes.filter((route) => !declaredRoutes.includes(route))) problems.push(`Unclassified Civility route: ${route}`);
  for (const route of declaredRoutes.filter((route) => !actualRoutes.includes(route))) problems.push(`Inventoried Civility route no longer exists: ${route}`);

  for (const route of inventory.routes) {
    if (route.classification === "governed" && (!Array.isArray(route.actions) || route.actions.length === 0)) {
      problems.push(`Governed route ${route.path} declares no policy actions.`);
    }
  }

  for (const invariant of inventory.invariants) {
    const content = files.get(invariant.file);
    if (typeof content !== "string") {
      problems.push(`Invariant source is not a declared verifier input: ${invariant.file}`);
      continue;
    }
    for (const marker of invariant.contains ?? []) {
      if (!content.includes(marker)) problems.push(`${invariant.file} is missing enforcement/coverage marker: ${marker}`);
    }
  }

  const findings = {
    scope: inventory.scope,
    routeCount: actualRoutes.length,
    governedRoutes: inventory.routes.filter(({ classification }) => classification === "governed").map(({ path, actions }) => ({ path, actions })),
    invariantCount: inventory.invariants.length,
    problems,
  };
  if (problems.length > 0) return fail(`Civility policy surface inventory has ${problems.length} drift problem(s).`, { findings });
  return pass(`All ${actualRoutes.length} Civility routes are classified and ${inventory.invariants.length} policy enforcement/coverage invariants are present.`, { findings });
});
