// review.copy-encoding -- deterministic lint: no mojibake / encoding glitches in
// visible UI copy. Offloads a mechanical slice of the LLM copy review (which had
// been catching e.g. a mis-encoded em-dash rendering as garbled bytes on the
// delegation notes page). Pure string scan over the source-derived page
// inventory; no model.

import { emit, fail, pass } from "../lib/result.mjs";
import { collectPageCopy } from "../lib/page-copy.mjs";

// Signatures of UTF-8 text mis-decoded as Latin-1 (the usual mojibake), plus the
// Unicode replacement character. These do not occur in correctly-encoded copy;
// legitimate accented letters are intentionally NOT flagged.
//
// The most reliable signal is a C1 control character (U+0080-U+009F): when a
// multi-byte UTF-8 sequence is decoded as Latin-1, its continuation bytes
// (0x80-0xBF) surface as C1 controls, which never appear in real copy. E.g. an
// em-dash (E2 80 94) becomes a-circumflex + two C1 controls. We also catch the
// CP1252 variants (a-circumflex + euro, etc.) and the replacement char U+FFFD.
const MOJIBAKE_PATTERNS = [
  { name: "replacement-char", re: /\uFFFD/ },
  { name: "c1-control-char", re: /[\u0080-\u009F]/ },
  { name: "utf8-punctuation-as-latin1", re: /\u00E2\u20AC/ },
  { name: "stray-mojibake-prefix", re: /\u00C2(?=[\s\u00A0])|\u00E2(?=\s)/ },
];

function scan(text) {
  for (const { name, re } of MOJIBAKE_PATTERNS) {
    if (re.test(text)) return name;
  }
  return null;
}

async function main() {
  const { pages } = await collectPageCopy();
  const hits = [];
  for (const page of pages) {
    for (const snippet of page.copy) {
      const signature = scan(snippet.text);
      if (signature) {
        hits.push({
          domain: page.domain,
          routePath: page.routePath,
          file: page.file,
          line: snippet.line,
          signature,
          // Escape non-ASCII so the mojibake is legible in the JSON finding.
          text: JSON.stringify(snippet.text.slice(0, 160)),
        });
      }
    }
  }

  if (hits.length === 0) {
    return pass(`No encoding glitches in visible copy across ${pages.length} page(s).`, {
      findings: { pagesScanned: pages.length },
    });
  }
  return fail(`${hits.length} encoding glitch(es) in visible UI copy.`, {
    findings: {
      pagesScanned: pages.length,
      hits,
      recommendation:
        "Replace mojibake with the intended character (e.g. a real em-dash U+2014). These are almost always a paste/encoding accident in the source string.",
    },
  });
}

emit(main);
