# Verifier to-do list

This is the backlog for **improving the verifier itself** — making it a more trustworthy answer to:

> Would we feel confident telling the world "come use this"?

Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files under [`checks/`](./checks/). Keep this file focused on **unfinished work**; prune completed implementation notes instead of letting them accumulate.

## Two kinds of work — don't confuse them

This file tracks only the second of these:

1. **Getting the project ready to launch** — "does the thing actually work, is it compelling, are the docs coherent, is the on-chain surface sound?" **This is not enumerated here.** The verifier's own outputs are what drive it:
   - the `root` dashboard and the four facets (`facet.functionality`, `facet.docs`, `facet.product`, `facet.security`);
   - `coverage.readiness` → the generated `readiness.md` (what remains before release-candidate / full-launch, grouped by target tier);
   - the QA-synthesis report-attestation checks;
   - the advisory/gating LLM findings (docs coherence, landing compellingness, workflow clarity).

   The workflow is: run the relevant facet or report, read what it says, fix the *project*, rerun. The list of what's left lives in those reports, not in this file. To earn release-candidate or full-launch confidence, work down `readiness.md` and run the guarded prerequisites (`artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, `stack.restart-consistency`, `env.testnet-smoke`) with their explicit opt-ins — see README "Useful commands".

2. **Improving the verifier** — making the checks more comprehensive, more trustworthy, cheaper, or better-faceted, so that when they go green you can actually believe them. That is the backlog below.

## Current state

The faceted gating dashboard is live and documented in [`README.md`](./README.md): `root` rolls up `facet.functionality`, `facet.docs`, `facet.product`, `facet.security`, and `meta.verifier-health`. The standing product LLM-judgment leaves (`review.docs-coherence`, `review.landing-compelling`, and the `review.workflow-clarity*` workflow targets) are **gating** via finding severity. The old confidence-tier supervisors were retired; `validation.pr` survives as the fast functionality loop. The two `meta.*` LLM leaves (`meta.llm-check-review`, `meta.llm-to-automated-candidates`) are gating inside `meta.verifier-health` when they find significant unresolved verifier improvements.

The meta LLM leaves can make `meta.verifier-health` non-green when they identify significant unresolved verifier improvements; don't rerun them blindly — triage one small finding at a time, and prefer adding a deterministic test/check over leaving the burden on the model. The two `meta.*` leaves' standing suggestions are folded into the backlog below; the product leaves' findings surface through their facets (category 1).

## Backlog — improving the verifier

- [ ] **Promote more `meta.llm-to-automated-candidates` suggestions** to deterministic checks or explicit known-gap records. Done so far: `review.docs-broken-refs` (wired into `meta.verifier-health`), `known-bad.report-attestation` coverage for incomplete/stale/blocker reports, `known-bad.llm-judgment-gating` coverage for structured-finding status mapping, and the `performance-acceptability` known-gap record. Keep mining future advisory suggestions for objective sub-criteria. `meta.llm-to-automated-candidates` is the standing check for this: it dynamically scans LLM-judgment and report-attestation defs, asks which objective sub-criteria could be conventional tests, and gates `meta.verifier-health` on significant candidates. It intentionally should not include deterministic `review.*` checks unless they import the LLM judgment helper or run the report-attestation script.
- [ ] **Indexer-integrity canaries as tracked checks.** Done so far: `automated.indexer-integrity-canaries` wraps the existing SDK fold replay/resume/idempotent duplicate canaries and is referenced from `coverage/testing-plan-items.json`. Still needed: reset/reorg and live chain/indexer replay coverage as dedicated tracked checks when those tests exist.
- [x] **Decide mandatory-vs-skipped policy for guarded/deep checks** (local-stack, testnet smoke): `coverage/guarded-check-policy.json` now says `artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, `stack.restart-consistency`, and `env.testnet-smoke` are all mandatory by release-candidate with 7-day freshness, while skipped-by-policy is acceptable only during ordinary development. `coverage.guarded-check-policy` and `known-bad.guarded-check-policy` guard that policy against drift.

## Operating notes for agents

- Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes (SDK, Hardhat, integration stack, UI Vitest, Playwright). Run narrower commands first (`npm run sdk:test`, `npm run hardhat:test`, `npm run integration-tests`, `npm run ui:test`, or the failing package command) before rerunning the wrapper.
- Cheap reports are retained under `verifier/results/`; don't regenerate fresh ones unless they've gone stale or the surface meaningfully changed.
- Advisory LLM checks can be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here.
- Playwright: failed E2E runs used to hang by serving the HTML report. `ui/playwright.config.ts` should keep the HTML reporter at `open: 'never'`; if that regresses, run with `PLAYWRIGHT_HTML_OPEN=never` so the process exits and verifier waits don't stall.

## Open design decisions

- **Noise threshold for the gating `meta.*` leaves:** keep tuning prompts/status mapping so only significant verifier-improvement recommendations block green; low-severity/nice-to-have ideas should stay visible without creating dashboard churn.
- **Guarded-check status:** ordinary development may leave guarded checks skipped-by-policy/error-ish, but release-candidate readiness requires fresh passing results for each check listed in `coverage/guarded-check-policy.json`. Revisit dashboard semantics only if the skipped-by-policy classification is still confusing after release-candidate rehearsals.
- **Roster source format:** `coverage.validation-roster` cross-references a structured JSON roster against Markdown. Revisit only if maintaining both becomes painful.
- **Domain source of truth:** `coverage.domains` uses live manifests for implemented routes and product docs for intended boundaries. Revisit if domain manifests stop being a good bounded surface.
