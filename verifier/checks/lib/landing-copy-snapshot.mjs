import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { workspacePath } from "./result.mjs";

const LANDING_FILE = "LandingPage.tsx";
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const HUMAN_TEXT_KEYS = new Set(["title", "description", "cta", "eyebrow", "label", "text"]);

function unescapeLiteral(raw) {
  return raw
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, "`")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .trim();
}

function looksLikeHumanCopy(text) {
  if (!text) return false;
  if (text.startsWith("/")) return false;
  if (/^[a-zA-Z0-9_-]+$/.test(text) && text.length < 24) return false;
  return /[a-zA-Z]/.test(text);
}

function extractKeyedStrings(source) {
  const copy = [];
  const keyed = /\b(title|description|cta|eyebrow|label|text)\s*[:=]\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2/g;
  for (const match of source.matchAll(keyed)) {
    const key = match[1];
    const text = unescapeLiteral(match[3]);
    if (HUMAN_TEXT_KEYS.has(key) && looksLikeHumanCopy(text)) copy.push({ key, text });
  }
  return copy;
}

function extractFallbackStrings(source, keyedText) {
  const already = new Set(keyedText.map((entry) => entry.text));
  const fallback = [];
  for (const match of source.matchAll(STRING_LITERAL)) {
    const text = unescapeLiteral(match[2]);
    if (already.has(text) || !looksLikeHumanCopy(text)) continue;
    // Skip import specifiers and obvious route/config tokens. This snapshot is a
    // reviewer aid, not a parser; err on the side of keeping plausible visible copy.
    if (text.includes("/") && !text.includes(" ")) continue;
    fallback.push({ key: "other", text });
  }
  return fallback;
}

export async function collectLandingCopySnapshot() {
  const domainsDir = workspacePath("..", "ui", "src", "domains");
  const entries = await readdir(domainsDir, { withFileTypes: true });
  const domains = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(domainsDir, entry.name, LANDING_FILE);
    let source;
    try {
      source = await readFile(file, "utf8");
    } catch {
      continue;
    }
    const keyed = extractKeyedStrings(source);
    domains.push({
      domain: entry.name,
      file: path.relative(workspacePath(".."), file),
      copy: [...keyed, ...extractFallbackStrings(source, keyed)]
    });
  }

  domains.sort((a, b) => a.domain.localeCompare(b.domain));
  return domains;
}

export function renderLandingCopySnapshot(domains) {
  if (!domains.length) return "# Rendered landing-copy snapshot\n\n_No LandingPage.tsx files found._\n";

  const sections = domains.map((domain) => {
    const lines = domain.copy.length > 0
      ? domain.copy.map((entry) => `- **${entry.key}:** ${entry.text}`)
      : ["- _No static visible copy extracted._"];
    return [`## ${domain.domain}`, "", `Source: ${domain.file}`, "", ...lines].join("\n");
  });

  return [
    "# Rendered landing-copy snapshot",
    "",
    "This is a deterministic approximation of the text a visitor sees on each domain landing page. It extracts human-facing strings passed into `DomainLandingPage` and adjacent static landing-page copy, omitting route/import tokens where possible. Use this as rendered-copy evidence, then inspect source for layout/context when needed.",
    "",
    ...sections,
    ""
  ].join("\n");
}
