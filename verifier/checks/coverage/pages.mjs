// coverage.pages — assert the (transiently derived) UI page inventory is sound
// and that every domain that exists in the app source also has a coverage story
// in the curated overlay (coverage/domains.json).
//
// The page list itself is NOT a committed artifact: it is derived on the fly from
// ui/src/domains via derivePageInventory(). This check both validates the
// inventory and demonstrates the intended consumption pattern for other checks
// (review.*, product.*) that want to loop over real pages.

import { emit, fail, pass, readInputs } from "../lib/result.mjs";
import { derivePageInventory, toKebabId } from "../lib/page-inventory.mjs";

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseJsonInput(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content == null) throw new Error(`Could not read ${label} file: ${input.path}`);
  return JSON.parse(input.content);
}

emit(async () => {
  const inputs = readInputs();
  const overlay = parseJsonInput(findFileInput(inputs, "domainsInventory"), "domains coverage overlay");
  const overlayIds = new Set((overlay.domains ?? []).map((d) => d.id));

  const inventory = await derivePageInventory();
  const problems = [];

  const inScopeIds = overlayIds;
  for (const domain of inventory.domains) {
    const inScope = inScopeIds.has(domain.kebabId) || inScopeIds.has(domain.id);
    if (inScope && domain.routePaths.length === 0) {
      problems.push(`${domain.id}: derived zero pages from its manifest (parse failure or empty route table?).`);
    }
  }

  // Reverse drift: an overlay domain that no longer exists in source.
  const derivedIds = new Set(inventory.domains.flatMap((d) => [d.id, d.kebabId, toKebabId(d.id)]));
  for (const id of overlayIds) {
    if (!derivedIds.has(id)) {
      problems.push(`Overlay domain '${id}' has no matching domain in app source.`);
    }
  }

  const findings = {
    source: inventory.source,
    totalPages: inventory.domains.reduce((sum, d) => sum + d.pageCount, 0),
    domains: inventory.domains.map((d) => ({ id: d.id, pageCount: d.pageCount, routePaths: d.routePaths })),
    problems,
  };

  if (problems.length > 0) return fail(`Page inventory has ${problems.length} problem(s).`, { findings });
  return pass(`Derived ${findings.totalPages} pages across ${inventory.domains.length} source domains; in-scope overlay domains exist in source.`, { findings });
});
