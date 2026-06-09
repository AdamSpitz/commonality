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

// Find the import specifier a named binding was imported from, e.g. for
// `import { FooPage } from './ContentPages'` -> './ContentPages'.
function findNamedImportSpecifier(manifestSource, name) {
  const re = new RegExp(`import\\s*(?:[\\w$]+\\s*,\\s*)?{[^}]*\\b${name}\\b[^}]*}\\s*from\\s*['"]([^'"]+)['"]`);
  const match = manifestSource.match(re);
  return match ? match[1] : null;
}

// Parse each <Route path=... element={...}> and classify how it resolves to a
// component, so callers can verify the page actually wires to real code:
//   - lazy:      element={lazyRoute(() => import('<spec>'), '<exportName>')}
//   - component: element={<ComponentName />}  (resolved via its manifest import)
//   - unknown:   anything we couldn't classify (callers may skip or warn)
function extractRoutes(manifestSource) {
  const routeRe = /<Route\s+[^>]*?\bpath=["']([^"']+)["'][^>]*?\belement=\{([^}]*)\}/g;
  const lazyRe = /lazyRoute\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\s*,\s*['"]([^'"]+)['"]\s*\)/;
  const redirectRe = /^<\s*Navigate\b[^>]*?\bto=["']([^"']+)["']/;
  const componentRe = /^<\s*([A-Za-z_$][\w$]*)\b/;
  const routes = [];
  let match;
  while ((match = routeRe.exec(manifestSource)) !== null) {
    const path = match[1];
    const element = match[2].trim();
    const lazy = element.match(lazyRe);
    if (lazy) {
      routes.push({ path, element: { kind: "lazy", importSpecifier: lazy[1], exportName: lazy[2] } });
      continue;
    }
    const redirect = element.match(redirectRe);
    if (redirect) {
      routes.push({ path, element: { kind: "redirect", to: redirect[1] } });
      continue;
    }
    const comp = element.match(componentRe);
    if (comp) {
      const name = comp[1];
      routes.push({
        path,
        element: { kind: "component", exportName: name, importSpecifier: findNamedImportSpecifier(manifestSource, name) },
      });
      continue;
    }
    routes.push({ path, element: { kind: "unknown", raw: element } });
  }
  return routes;
}

/**
 * Derive the full page inventory from source. Returns:
 *   {
 *     source: string,                       // where this was derived from
 *     domains: Array<{
 *       id: string,                         // canonical manifest id (e.g. 'lazyGiving')
 *       kebabId: string,                    // normalized id for matching coverage maps (e.g. 'lazy-giving')
 *       manifestFile: string,               // absolute path to the manifest .tsx
 *       routes: Array<{                     // one per <Route> in the manifest
 *         path: string,                     // literal <Route path> value
 *         element:                          // how the route resolves to a component
 *           | { kind: 'lazy', importSpecifier: string, exportName: string }
 *           | { kind: 'component', exportName: string, importSpecifier: string | null }
 *           | { kind: 'redirect', to: string }   // <Navigate to=... />
 *           | { kind: 'unknown', raw: string }
 *       }>,
 *       routePaths: string[],               // literal <Route path> values (convenience)
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
    const routes = extractRoutes(manifestSource);
    domains.push({
      id,
      kebabId: toKebabId(id),
      manifestFile,
      routes,
      routePaths: routes.map((r) => r.path),
      pageCount: routes.length,
    });
  }

  return { source: "ui/src/domains (derived on the fly)", domains };
}

export function toKebabId(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
