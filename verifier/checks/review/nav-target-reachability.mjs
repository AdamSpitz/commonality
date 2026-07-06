// review.nav-target-reachability — deterministic lint: every static internal
// navigation target in the UI source points at a route that actually exists.
//
// Sibling of review.page-links: where page-links verifies each declared <Route>
// resolves to real code (are the pages we ship reachable?), this verifies the
// reverse direction — that the links/CTAs we render point at declared routes (do
// our buttons lead somewhere real?). It catches the "Verify or claim" →
// /content/new mismatch class: a static target that matches no route at all.
//
// We derive the full route inventory from source (union across all domains, all
// of which mount at basePath '/'), then scan every UI source file for static
// internal targets in three forms:
//   - to="/…"          (react-router <Link>/<Navigate to>)
//   - href="/…"        (anchors and MUI link-likes)
//   - navigate("/…")   (useNavigate programmatic navigation)
// Only string literals starting with '/' are checked; dynamic template-literal
// targets (containing `${…}`) can't be verified statically and are skipped. A
// target is reachable if it matches any declared route pattern (`:param`
// segments match one path segment; a trailing `*` splat matches the rest).
//
// No model calls: pure string scan. Returns pass/fail only.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, workspaceRelative } from "../lib/result.mjs";
import { derivePageInventory } from "../lib/page-inventory.mjs";

function uiSrcDir() {
  return path.join(process.env.VERIFIER_WORKSPACE ?? process.cwd(), "..", "ui", "src");
}

// Turn a declared route path (e.g. '/content/:platform/:channelId' or '/docs/*')
// into a RegExp that matches concrete link targets. `:param` matches exactly one
// non-empty segment; a trailing `*` matches the remainder (splat routes).
function routeToRegex(routePath) {
  const segments = routePath.split("/").filter((s) => s.length > 0);
  let pattern = "^";
  for (const segment of segments) {
    if (segment === "*") {
      pattern += "(?:/.*)?"; // splat: match this and any deeper path (or nothing)
      return new RegExp(pattern + "$");
    }
    if (segment.startsWith(":")) {
      pattern += "/[^/]+";
    } else {
      pattern += "/" + segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  // Root route '/' has no segments; allow an optional trailing slash everywhere.
  if (segments.length === 0) pattern += "/?";
  return new RegExp(pattern + "/?$");
}

// Match static internal targets. We deliberately match only single- or
// double-quoted string literals so template literals with interpolation never
// slip through as false "unreachable" hits.
const TARGET_RES = [
  /\b(?:to|href)\s*=\s*(?:\{\s*)?["'](\/[^"']*)["']/g,
  /\bnavigate\s*\(\s*["'](\/[^"']*)["']/g,
];

// Strip query string / hash fragment before matching against routes.
function normalizeTarget(raw) {
  return raw.replace(/[?#].*$/, "");
}

async function collectSourceFiles(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      await collectSourceFiles(full, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !/\.(test|spec|d)\.[jt]sx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

async function main() {
  const inventory = await derivePageInventory();
  const matchers = [];
  const routePaths = new Set();
  for (const domain of inventory.domains) {
    for (const routePath of domain.routePaths) {
      if (!routePaths.has(routePath)) {
        routePaths.add(routePath);
        matchers.push(routeToRegex(routePath));
      }
    }
  }

  const isReachable = (target) => matchers.some((re) => re.test(target));

  const files = await collectSourceFiles(uiSrcDir(), []);
  const hits = [];
  let targetsChecked = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const re of TARGET_RES) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(source)) !== null) {
        const target = normalizeTarget(match[1]);
        // Skip protocol-relative ('//host') and bare-root-with-query already normalized.
        if (target.startsWith("//")) continue;
        targetsChecked += 1;
        if (!isReachable(target)) {
          hits.push({
            file: workspaceRelative(file),
            line: lineOf(source, match.index),
            target,
          });
        }
      }
    }
  }

  const findings = {
    source: inventory.source,
    routePatterns: routePaths.size,
    filesScanned: files.length,
    targetsChecked,
    unreachableCount: hits.length,
    unreachable: hits,
  };

  if (hits.length > 0) {
    return fail(`${hits.length} static navigation target(s) point at no declared route.`, {
      findings: {
        ...findings,
        recommendation:
          "Each listed target is a link/CTA that leads nowhere: either fix the path to a real route, add the missing route, or (if intentionally dynamic) build the target from a variable so it isn't a static literal.",
      },
    });
  }
  return pass(`All ${targetsChecked} static internal nav target(s) across ${files.length} file(s) match a declared route.`, {
    findings,
  });
}

emit(main);
