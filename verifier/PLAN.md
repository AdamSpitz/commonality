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

The faceted gating dashboard is live and documented in [`README.md`](./README.md): `root` rolls up `facet.functionality`, `facet.docs`, `facet.product`, `facet.security`, and `meta.verifier-health`. The three standing product LLM-judgment leaves (`review.docs-coherence`, `review.landing-compelling`, `review.workflow-clarity`) are **gating** via finding severity. The old confidence-tier supervisors were retired; `validation.pr` survives as the fast functionality loop. The two `meta.*` LLM leaves (`meta.llm-check-review`, `meta.llm-to-automated-candidates`) remain advisory.

The advisory leaves are `uncertain` by design; don't rerun them blindly — triage one small finding at a time, and prefer adding a deterministic test/check over leaving the burden on the model. The two `meta.*` leaves' standing suggestions are folded into the backlog below; the product leaves' findings surface through their facets (category 1).

## Backlog — improving the verifier

- [ ] **Gating decision for the two `meta.*` advisory leaves** (`meta.llm-check-review`, `meta.llm-to-automated-candidates`). The three *product* leaves are already gating; decide whether either meta leaf should become a health input rather than advisory, after observing cost and false-positive rates.
- [ ] **Add a performance/"performance is acceptable" check** or an explicit known-gap record. Current coverage has degradation canaries but no serious performance check. (`meta.llm-check-review` flagged this and the destructive-stack blind spot.)
- [ ] **Broaden the UI workflow-coverage story** beyond the single default `review.workflow-clarity` target:
  - multiple parametrized workflow-clarity checks for key workflows;
  - and/or a coverage inventory of required workflows;
  - and/or conventional route/CTA/link tests for the objective pieces.
- [ ] **Reduce `ui/test-plan.md` drift.** Options: generate parts of the route/component inventory; add a coverage check that verifies listed test files/routes still exist; or move key UI plan items into structured verifier coverage data.
- [ ] **Promote more `meta.llm-to-automated-candidates` suggestions** to deterministic checks. Done so far: `review.docs-broken-refs` (wired into `meta.verifier-health`). Still open: report-attestation structure/freshness checks as conventional tests.
- [ ] **Add more `known-bad.*` fixtures** for checks that are easy to accidentally make too forgiving.
- [ ] **Indexer-integrity canaries as tracked checks.** If replay/resume/duplicate/reset/reorg coverage is added to the project, wrap or reference it in `coverage/testing-plan-items.json` so the readiness narrative reflects it.
- [ ] **Decide mandatory-vs-skipped policy for guarded/deep checks** (local-stack, testnet smoke): which must be current for a credible release-candidate/full-launch status vs. explicitly skipped-by-policy. (Related to the guarded-check dashboard-semantics decision below.)

## Operating notes for agents

- A whole priority tier is too large for one uninterrupted pass. Split into small subtasks and checkpoint.
- Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes (SDK, Hardhat, integration stack, UI Vitest, Playwright). Run narrower commands first (`npm run sdk:test`, `npm run hardhat:test`, `npm run integration-tests`, `npm run ui:test`, or the failing package command) before rerunning the wrapper.
- Cheap reports are retained under `verifier/results/`; don't regenerate fresh ones unless they've gone stale or the surface meaningfully changed.
- Advisory LLM checks can be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here.
- Playwright: failed E2E runs used to hang by serving the HTML report. `ui/playwright.config.ts` should keep the HTML reporter at `open: 'never'`; if that regresses, run with `PLAYWRIGHT_HTML_OPEN=never` so the process exits and verifier waits don't stall.

## Open design decisions

- **Advisory vs. gating for the `meta.*` leaves:** promote only after real runs show they are useful and not too noisy.
- **Guarded-check status:** guarded checks currently surface as skipped-by-policy/error-ish in supervisors. Decide whether that is the right dashboard semantics once release-candidate runs become routine.
- **Roster source format:** `coverage.validation-roster` cross-references a structured JSON roster against Markdown. Revisit only if maintaining both becomes painful.
- **Domain source of truth:** `coverage.domains` uses live manifests for implemented routes and product docs for intended boundaries. Revisit if domain manifests stop being a good bounded surface.
