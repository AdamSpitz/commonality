// review.ui-banned-terms — deterministic lint: crypto/web3 jargon in
// visitor-facing UI copy. This offloads the *mechanical* part of the LLM
// review.not-crypto-scary check (literal occurrences of an enumerated blocklist)
// so the model can focus on the genuinely qualitative residue: trading-terminal
// patterns, raw protocol data shown without a banned word, borderline vibes.
//
// The blocklist matches review.not-crypto-scary's high-severity term list. Some
// occurrences are legitimate (a page whose deliberate subject is wallets, or the
// ERC-1155 "giving tokens" naming), so hits can be excused via an allow-list in
// the params input. The allow-list was seeded 2026-07-06 (deliberate wallet-connect
// CTAs, the honest "do I need crypto?" copy, on-chain/IPFS technical disclosures,
// and error strings), and the def now sets `failOnHit: true` so a *new*, un-excused
// occurrence pages. Triage a new hit by either rewriting the copy in plain language
// or, if the term is the page's deliberate subject, adding an allow-list rule. The
// LLM review.not-crypto-scary still owns the qualitative "is it scary" judgment.

import { emit, fail, pass, uncertain, readInputs } from "../lib/result.mjs";
import { collectPageCopy } from "../lib/page-copy.mjs";

// High-severity crypto/web3 terms from review.not-crypto-scary's prompt.
const DEFAULT_BLOCKLIST = [
  "wallet", "gas", "token", "chain", "on-chain", "onchain", "smart contract",
  "protocol", "mint", "NFT", "DAO", "IPFS", "hash", "transaction hash",
  "blockchain", "crypto", "web3", "gwei", "ERC-1155", "ERC1155",
];

function buildTermRegexes(terms) {
  return terms.map((term) => {
    // Word-boundary-ish match, case-insensitive. Terms with hyphens/spaces are
    // matched literally; \b around the whole phrase catches standalone use.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { term, re: new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i") };
  });
}

// An allow-list entry excuses a hit. Shape: { routePath?, term?, textIncludes? }.
// An entry matches a hit when every present field matches (routePath exact,
// term case-insensitive equal, textIncludes is a case-insensitive substring).
function isAllowed(hit, allow) {
  return allow.some((rule) => {
    if (rule.routePath && rule.routePath !== hit.routePath) return false;
    if (rule.term && rule.term.toLowerCase() !== hit.term.toLowerCase()) return false;
    if (rule.textIncludes && !hit.text.toLowerCase().includes(rule.textIncludes.toLowerCase())) return false;
    return rule.routePath || rule.term || rule.textIncludes; // ignore empty rule
  });
}

// The source-derived copy extraction occasionally over-captures a code-ish span
// (a template literal or JSX run that swallowed surrounding TSX). Those can carry
// a blocklist word that is an identifier, not visible copy, so we skip snippets
// bearing code punctuation. Encoding detection stays sensitive elsewhere; here
// precision matters because a hit asks a human to act.
const CODEISH = /=>|[;{}]|\bconst\b|\breturn\b|sx=|className=|=\s*\{|\)\s*=>/;

async function main() {
  const params = (readInputs().find((i) => i.kind === "params")?.data) ?? {};
  const blocklist = params.blocklist ?? DEFAULT_BLOCKLIST;
  const allow = params.allow ?? [];
  const failOnHit = params.failOnHit === true;
  const regexes = buildTermRegexes(blocklist);

  const { pages } = await collectPageCopy();
  const hits = [];
  for (const page of pages) {
    for (const snippet of page.copy) {
      if (CODEISH.test(snippet.text)) continue;
      for (const { term, re } of regexes) {
        if (re.test(snippet.text)) {
          const hit = {
            domain: page.domain,
            routePath: page.routePath,
            file: page.file,
            line: snippet.line,
            term,
            text: snippet.text.slice(0, 160),
          };
          if (!isAllowed(hit, allow)) hits.push(hit);
        }
      }
    }
  }

  if (hits.length === 0) {
    return pass(`No un-excused crypto jargon in visible copy across ${pages.length} page(s).`, {
      findings: { pagesScanned: pages.length, blocklistSize: blocklist.length, allowRules: allow.length },
    });
  }

  const summary = `${hits.length} crypto-jargon occurrence(s) in visible UI copy across ${new Set(hits.map((h) => h.routePath)).size} page(s).`;
  const findings = {
    pagesScanned: pages.length,
    hits,
    recommendation:
      "For each hit, either rewrite the copy in plain language, or (if the term is the page's deliberate subject) add an allow-list rule { routePath, term, textIncludes? } to this check's params. The LLM review.not-crypto-scary still owns the qualitative judgment.",
  };
  return (failOnHit ? fail : uncertain)(summary, { findings });
}

emit(main);
