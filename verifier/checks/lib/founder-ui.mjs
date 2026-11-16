// Shared parsing for the founder-authored Commonality UI brief.
// The markdown is the spec. This module only extracts heading ids and
// checks that the sidecar points at real files. It does not rewrite prose.

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { workspacePath } from "./result.mjs";
import { derivePageInventory } from "./page-inventory.mjs";

export const FOUNDER_BRIEF_PATH = "checks/review/founder-e2e/commonality.md";
export const FOUNDER_SIDECAR_PATH = "coverage/founder-ui.json";

export function headingId(title) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseHeadings(markdown) {
  const headings = [];
  const seen = new Map();
  for (const line of markdown.split("\n")) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const title = match[2].trim();
    const id = headingId(title);
    const count = (seen.get(id) ?? 0) + 1;
    seen.set(id, count);
    headings.push({
      level: match[1].length,
      title,
      id: count === 1 ? id : `${id}-${count}`,
    });
  }
  return headings;
}

export function fileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

export async function readTextInput(inputs, inputName, fallbackRelativePath) {
  const input = fileInput(inputs, inputName);
  if (input && input.content !== null && input.content !== undefined) return input.content;
  return readFile(workspacePath(fallbackRelativePath), "utf8");
}

export async function fileExists(relativePath) {
  try {
    await access(workspacePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

const TEST_TITLE = /(?:^|\n)\s*(?:it|test)\(\s*['"`]([^'"`]+)['"`]/g;

export async function testTitles(relativePath) {
  const source = await readFile(workspacePath(relativePath), "utf8");
  const titles = [];
  for (const match of source.matchAll(TEST_TITLE)) titles.push(match[1]);
  return titles;
}

export function validateSidecar(sidecar, headings) {
  const problems = [];
  if (!sidecar || typeof sidecar !== "object") return ["Sidecar is not an object."];
  if (!Array.isArray(sidecar.headings)) return ["Sidecar must contain a headings array."];

  const byId = new Map();
  for (const entry of sidecar.headings) {
    if (!entry || typeof entry.id !== "string" || entry.id.length === 0) {
      problems.push("Sidecar heading is missing an id.");
      continue;
    }
    if (byId.has(entry.id)) problems.push(`${entry.id}: duplicate sidecar id.`);
    byId.set(entry.id, entry);
    const disposition = entry.disposition;
    if (disposition !== "tests" && disposition !== "untested-on-purpose") {
      problems.push(`${entry.id}: disposition must be "tests" or "untested-on-purpose".`);
    }
    if (disposition === "tests") {
      if (!Array.isArray(entry.tests) || entry.tests.length === 0) {
        problems.push(`${entry.id}: disposition "tests" needs a non-empty tests array.`);
      }
    }
    if (disposition === "untested-on-purpose" && (typeof entry.reason !== "string" || entry.reason.trim().length === 0)) {
      problems.push(`${entry.id}: untested-on-purpose needs a reason written for the founder, not a paraphrase of the heading.`);
    }
  }

  for (const heading of headings) {
    if (!byId.has(heading.id)) problems.push(`${heading.id}: heading "${heading.title}" has no sidecar entry.`);
  }
  for (const id of byId.keys()) {
    if (!headings.some((heading) => heading.id === id)) problems.push(`${id}: sidecar entry does not match a ## or ### heading.`);
  }
  return problems;
}

export async function missingTestFiles(sidecar) {
  const problems = [];
  for (const entry of sidecar.headings ?? []) {
    if (entry?.disposition !== "tests") continue;
    for (const testFile of entry.tests ?? []) {
      if (typeof testFile !== "string" || testFile.length === 0) {
        problems.push(`${entry.id}: tests entries must be non-empty paths.`);
      } else if (!await fileExists(testFile)) {
        problems.push(`${entry.id}: test file does not exist: ${testFile}`);
      }
    }
  }
  return problems;
}

export async function commonalityRoutes() {
  const inventory = await derivePageInventory({ inScopeOnly: false });
  const domain = inventory.domains.find((item) => item.id === "commonality" || item.kebabId === "commonality");
  if (!domain) throw new Error("Could not find the commonality domain in the page inventory.");
  return domain.routes
    .filter((route) => route.element.kind !== "redirect")
    .map((route) => ({
      path: route.path,
      exportName: route.element.exportName ?? null,
      importSpecifier: route.element.importSpecifier ?? null,
    }));
}

export function repoRelative(fromWorkspaceRelative) {
  return path.normalize(fromWorkspaceRelative).replace(/^(\.\.\/)+/, "");
}
