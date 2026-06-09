// Transient UI page inventory.
//
// This module derives the list of UI domains and their pages (routes) directly
// from the app source at call time. Nothing is committed or cached: any check
// that wants the page list imports `derivePageInventory()` and produces it on
// the fly, so the inventory can never drift out of sync with the code.
//
// Source of truth, in order:
//   - ui/src/domains/index.ts  -> which manifests are real top-level domains
//                                  (deliberately excludes feature-only manifests
//                                   like `delegation` and `components`)
//   - ui/src/domains/<dir>/manifest.tsx -> each domain's id and its <Route> paths
//
// We parse the literal `<Route path="...">` declarations rather than executing
// the JSX, which keeps this dependency-free and runnable from a plain Node check.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { workspacePath } from "./result.mjs";

function domainsDir() {
  // The verifier workspace sits beside `ui/`; checks already read ../ui and ../specs.
  return workspacePath("..", "ui", "src", "domains");
}

// Pull the manifest identifiers referenced by the `domainManifests` record, in
// declaration order. These are the canonical top-level domains.
function parseDomainManifestIdentifiers(indexSource) {
  const blockMatch = indexSource.match(/domainManifests[^=]*=\s*{([\s\S]*?)}/);
  if (!blockMatch) throw new Error("Could not locate `domainManifests` record in domains/index.ts.");
  const identifiers = [];
  const entryRe = /(?:[\w-]+|'[^']+'|"[^"]+")\s*:\s*([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = entryRe.exec(blockMatch[1])) !== null) {
    identifiers.push(match[1]);
  }
  if (identifiers.length === 0) throw new Error("`domainManifests` record contained no manifest entries.");
  return identifiers;
}

// Map a manifest identifier (e.g. `alignmentManifest`) to its source file via its import line.
function resolveManifestImportPath(indexSource, identifier) {
  const importRe = new RegExp(`import\\s*{[^}]*\\b${identifier}\\b[^}]*}\\s*from\\s*['"]([^'"]+)['"]`);
  const match = indexSource.match(importRe);
  if (!match) throw new Error(`Could not find import for manifest identifier '${identifier}'.`);
  return match[1];
}

function extractDomainId(manifestSource) {
  const match = manifestSource.match(/\bid:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function extractRoutePaths(manifestSource) {
  const routeRe = /<Route\s+[^>]*?\bpath=["']([^"']+)["']/g;
  const paths = [];
  let match;
  while ((match = routeRe.exec(manifestSource)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/**
 * Derive the full page inventory from source. Returns:
 *   {
 *     source: string,                       // where this was derived from
 *     domains: Array<{
 *       id: string,                         // canonical manifest id (e.g. 'lazyGiving')
 *       kebabId: string,                    // normalized id for matching coverage maps (e.g. 'lazy-giving')
 *       manifestFile: string,               // workspace-relative path
 *       routePaths: string[],               // literal <Route path> values
 *       pageCount: number
 *     }>
 *   }
 */
export async function derivePageInventory() {
  const dir = domainsDir();
  const indexSource = await readFile(path.join(dir, "index.ts"), "utf8");
  const identifiers = parseDomainManifestIdentifiers(indexSource);

  const domains = [];
  for (const identifier of identifiers) {
    const importPath = resolveManifestImportPath(indexSource, identifier);
    // Imports look like './alignment/manifest.tsx' (sometimes without extension).
    const resolved = importPath.endsWith(".tsx") ? importPath : `${importPath}.tsx`;
    const manifestFile = path.join(dir, resolved);
    const manifestSource = await readFile(manifestFile, "utf8");
    const id = extractDomainId(manifestSource) ?? identifier;
    const routePaths = extractRoutePaths(manifestSource);
    domains.push({
      id,
      kebabId: toKebabId(id),
      manifestFile,
      routePaths,
      pageCount: routePaths.length,
    });
  }

  return { source: "ui/src/domains (derived on the fly)", domains };
}

export function toKebabId(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
