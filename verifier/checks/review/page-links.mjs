// review.page-links — deterministic per-page health check, and the worked
// template for "loop the on-the-fly page inventory and analyze each page".
//
// It derives every UI page from source (no committed list) via
// derivePageInventory(), then for each <Route> verifies the page is not a dead
// link: the component it points at must actually resolve to real, exported code.
//   - lazy routes:      lazyRoute(() => import('<spec>'), '<exportName>') — the
//                       imported file must exist and export <exportName>.
//   - component routes: element={<Name />} — <Name> must be imported in the
//                       manifest, and that import must exist and export it.
//
// No model calls: this is the cheap deterministic template that the LLM-based
// per-page analyses (copy sense, usability, visual appeal) can copy — same loop,
// different judgment. Returns pass/fail only.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass } from "../lib/result.mjs";
import { derivePageInventory } from "../lib/page-inventory.mjs";

const EXTENSION_CANDIDATES = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

async function resolveModuleFile(baseDir, specifier) {
  for (const suffix of EXTENSION_CANDIDATES) {
    const candidate = path.resolve(baseDir, specifier + suffix);
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

function fileExportsName(source, name) {
  if (name === "default") return /export\s+default\b/.test(source);
  const direct = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|class|let|var)\\s+${name}\\b`);
  if (direct.test(source)) return true;
  // export { Name } / export { X as Name } / export { Name } from '...'
  const list = new RegExp(`export\\s*(?:type\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}`);
  return list.test(source);
}

async function checkRoute(domain, route, manifestDir) {
  const { path: routePath, element } = route;
  const where = `${domain.id} ${routePath}`;

  if (element.kind === "redirect") {
    return { status: "redirect" };
  }
  if (element.kind === "unknown") {
    return { status: "unverifiable", note: `${where}: could not classify element \`${element.raw}\`.` };
  }
  if (!element.importSpecifier) {
    return { status: "broken", note: `${where}: component <${element.exportName}/> is not imported in the manifest.` };
  }

  const file = await resolveModuleFile(manifestDir, element.importSpecifier);
  if (!file) {
    return { status: "broken", note: `${where}: import target '${element.importSpecifier}' does not resolve to a file.` };
  }
  const source = await readFile(file, "utf8");
  if (!fileExportsName(source, element.exportName)) {
    return { status: "broken", note: `${where}: '${element.importSpecifier}' does not export '${element.exportName}'.` };
  }
  return { status: "ok" };
}

emit(async () => {
  const inventory = await derivePageInventory();

  const broken = [];
  const unverifiable = [];
  let checked = 0;
  let redirects = 0;

  for (const domain of inventory.domains) {
    const manifestDir = path.dirname(domain.manifestFile);
    for (const route of domain.routes) {
      checked += 1;
      const outcome = await checkRoute(domain, route, manifestDir);
      if (outcome.status === "broken") broken.push(outcome.note);
      else if (outcome.status === "unverifiable") unverifiable.push(outcome.note);
      else if (outcome.status === "redirect") redirects += 1;
    }
  }

  const findings = {
    source: inventory.source,
    checkedRoutes: checked,
    domains: inventory.domains.length,
    redirectRoutes: redirects,
    brokenCount: broken.length,
    broken,
    unverifiable,
  };

  if (broken.length > 0) {
    return fail(`${broken.length} of ${checked} page route(s) point at missing components or exports.`, { findings });
  }
  const note = unverifiable.length > 0 ? ` (${unverifiable.length} unverifiable element form(s) skipped)` : "";
  return pass(`All ${checked} page routes across ${inventory.domains.length} domains resolve to real exported components${note}.`, { findings });
});
