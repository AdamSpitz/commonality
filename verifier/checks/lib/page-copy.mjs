// Shared deterministic extractor: pull the human-facing copy out of every UI
// page component, reusing the same source-derived page inventory the LLM page
// reviews use. This is the substrate for cheap lints (banned jargon, encoding
// glitches) that offload mechanical parts of the LLM copy/usability reviews.
//
// "Reviewer aid, not a parser": we err toward capturing plausibly-visible text
// (keyed config strings, JSX text nodes, and human-looking string literals) and
// toward NOT capturing identifiers, routes, and import specifiers. Each captured
// snippet carries its file + 1-based line so lints can emit precise evidence.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { derivePageInventory } from "./page-inventory.mjs";
import { workspacePath } from "./result.mjs";

const EXTENSION_CANDIDATES = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

async function resolveModuleFile(baseDir, specifier) {
  if (!specifier) return null;
  for (const suffix of EXTENSION_CANDIDATES) {
    const candidate = path.resolve(baseDir, specifier + suffix);
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      /* try next extension */
    }
  }
  return null;
}

function unescapeLiteral(raw) {
  return raw
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, "`")
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\\/g, "\\")
    .trim();
}

// A snippet looks like visible copy (vs. an identifier, route, or config token).
function looksLikeHumanCopy(text) {
  if (!text) return false;
  if (text.startsWith("/")) return false; // route/path
  if (text.startsWith("http")) return false; // url
  if (!/[a-zA-Z]/.test(text)) return false; // no letters
  // A single lowercase/camelCase token with no spaces is almost always an
  // identifier, prop key, or import specifier — not visible copy.
  if (!/\s/.test(text) && /^[a-zA-Z0-9_.$-]+$/.test(text)) return false;
  return true;
}

function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

// Extract candidate visible-copy snippets from one component source. Returns
// [{ text, line, kind }] where kind is "string" (a string/template literal) or
// "jsx" (text between JSX tags).
export function extractHumanCopy(source) {
  const out = [];
  const seen = new Set();
  const push = (text, index, kind) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!looksLikeHumanCopy(clean)) return;
    const key = `${kind}:${clean}:${lineAt(source, index)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: clean, line: lineAt(source, index), kind });
  };

  // 1. String and template literals (props like title=, description=, cta=,
  //    label=, placeholder=, and standalone strings).
  const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const m of source.matchAll(STRING_LITERAL)) {
    push(unescapeLiteral(m[2]), m.index ?? 0, "string");
  }

  // 2. JSX text nodes: text sitting between tags, e.g. <Typography>Hello</...>.
  //    We capture runs that contain no tag/brace characters.
  const JSX_TEXT = />([^<>{}]+)</g;
  for (const m of source.matchAll(JSX_TEXT)) {
    push(m[1], (m.index ?? 0) + 1, "jsx");
  }

  return out;
}

/**
 * Walk the source-derived page inventory and extract visible copy from each
 * resolvable page component.
 *
 * @returns {Promise<{ inventory: object, pages: Array<{ domain: string, routePath: string, file: string|null, copy: Array<{text:string,line:number,kind:string}> }> }>}
 */
export async function collectPageCopy() {
  const inventory = await derivePageInventory();
  const pages = [];
  const rootRel = (p) => path.relative(workspacePath(".."), p);

  for (const domain of inventory.domains) {
    const manifestDir = path.dirname(domain.manifestFile);
    for (const route of domain.routes) {
      if (route.element.kind === "redirect") continue;
      const componentFile = await resolveModuleFile(manifestDir, route.element.importSpecifier);
      if (!componentFile) {
        pages.push({ domain: domain.id, routePath: route.path, file: null, copy: [] });
        continue;
      }
      const source = await readFile(componentFile, "utf8");
      pages.push({
        domain: domain.id,
        routePath: route.path,
        file: rootRel(componentFile),
        copy: extractHumanCopy(source),
      });
    }
  }

  return { inventory, pages };
}
