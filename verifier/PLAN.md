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

- [x] **Gating decision for the two `meta.*` LLM leaves** (`meta.llm-check-review`, `meta.llm-to-automated-candidates`). They now feed `meta.verifier-health` as core health inputs. Their prompts/status mapping distinguish significant recommendations from nice-to-have ideas: significant meta-improvements make the dashboard non-green, while nitpicks are recorded without blocking.
- [x] **Broaden the UI workflow-coverage story** beyond the single default `review.workflow-clarity` target. `coverage.workflows` now tracks required key workflows, their bounded UI surface files, their objective smoke/regression backing checks, and their workflow-clarity review leaves. `facet.product` now gates on the default Alignment workflow plus separate LazyGiving, Content Funding, and Common Sense Majority workflow-clarity targets.
- [x] **Reduce `ui/test-plan.md` drift.** Added `coverage.ui-test-plan`, a deterministic check that verifies referenced Vitest/Playwright test files still exist under `ui/src`/`ui/e2e`, route-mapping rows are well formed, and the main inventory sections remain present. It is wired into `meta.verifier-health` and backed by `known-bad.ui-test-plan`.
- [ ] **Promote more `meta.llm-to-automated-candidates` suggestions** to deterministic checks or explicit known-gap records. Done so far: `review.docs-broken-refs` (wired into `meta.verifier-health`), `known-bad.report-attestation` coverage for incomplete/stale/blocker reports, and the `performance-acceptability` known-gap record. Keep mining future advisory suggestions for objective sub-criteria.
- [ ] **Add more `known-bad.*` fixtures** for checks that are easy to accidentally make too forgiving. Done so far in this area: `known-bad.ui-test-plan` proves stale UI test-plan references are rejected, `known-bad.workflows` proves unbacked/missing-surface workflow inventory is rejected, `known-bad.docs-broken-refs` proves missing relative Markdown links are rejected, `known-bad.env-testnet-smoke` proves unreachable configured testnet endpoints are rejected when the guarded smoke is explicitly enabled, `known-bad.env-testnet-smoke-malformed` proves HTTP-200-but-semantically-bad testnet responses are rejected, `known-bad.validation-roster` proves broken manual/LLM roster coverage is rejected, `known-bad.domains` proves broken domain coverage inventories are rejected, `known-bad.meta-verifier-health-significance` proves the meta LLM gating threshold, `known-bad.llm-json-parsing` proves the actual LLM judgment path parses/rejects tricky JSON output, and `known-bad.supervisor-freshness` proves stale green child results cannot roll up as green. Concrete remaining candidates:
  - [x] `known-bad.env-testnet-smoke-malformed`: prove `env.testnet-smoke` rejects HTTP-200-but-bad responses, such as RPC responses without a usable `result`, GraphQL responses with `errors`, and app URLs serving an error/blank shell. The current unreachable-endpoint canary does not prove semantic validation of successful HTTP responses.
  - [x] `known-bad.validation-roster`: proves `coverage.validation-roster` rejects a required manual/LLM role group that is missing, points at a nonexistent check id, or is deferred without an explicit policy.
  - [x] `known-bad.domains`: proves `coverage.domains` rejects a missing product domain or missing smoke/review/docs coverage story. (It does not yet validate bounded surface files or live route manifests, because the domain inventory does not currently model them.)
  - [x] `known-bad.meta-verifier-health-significance`: prove the gating threshold for meta LLM outputs is stable — high/medium verifier recommendations or significant automation candidates must make `meta.verifier-health` non-green, while low/nice-to-have-only output must remain visible but non-gating.
  - [x] `known-bad.supervisor-freshness`: proves a supervisor with a freshness policy turns stale-but-passing child results into `uncertain`, not `pass`, while preserving concrete child `fail`/`error` rollup behavior.
  - [x] `known-bad.llm-json-parsing`: add verifier-level canaries around the LLM judgment wrapper so prose/fenced output, multiple JSON-looking objects, malformed result shapes, and raw control characters are either parsed correctly or rejected as check errors instead of silently producing false confidence. Unit coverage exists for `parseJsonObject`; this would exercise the actual verifier check path.
  - [x] `known-bad.stack-guarded-command`: stack guarded commands now require structured health evidence, and the known-bad fixture proves an exit-0 command with unhealthy service/data evidence is rejected instead of passing from exit code alone.
- [ ] **Indexer-integrity canaries as tracked checks.** If replay/resume/duplicate/reset/reorg coverage is added to the project, wrap or reference it in `coverage/testing-plan-items.json` so the readiness narrative reflects it.
- [ ] **Decide mandatory-vs-skipped policy for guarded/deep checks** (local-stack, testnet smoke): which must be current for a credible release-candidate/full-launch status vs. explicitly skipped-by-policy. (Related to the guarded-check dashboard-semantics decision below.)

## Operating notes for agents

- Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes (SDK, Hardhat, integration stack, UI Vitest, Playwright). Run narrower commands first (`npm run sdk:test`, `npm run hardhat:test`, `npm run integration-tests`, `npm run ui:test`, or the failing package command) before rerunning the wrapper.
- Cheap reports are retained under `verifier/results/`; don't regenerate fresh ones unless they've gone stale or the surface meaningfully changed.
- Advisory LLM checks can be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here.
- Playwright: failed E2E runs used to hang by serving the HTML report. `ui/playwright.config.ts` should keep the HTML reporter at `open: 'never'`; if that regresses, run with `PLAYWRIGHT_HTML_OPEN=never` so the process exits and verifier waits don't stall.

## Open design decisions

- **Noise threshold for the gating `meta.*` leaves:** keep tuning prompts/status mapping so only significant verifier-improvement recommendations block green; low-severity/nice-to-have ideas should stay visible without creating dashboard churn.
- **Guarded-check status:** guarded checks currently surface as skipped-by-policy/error-ish in supervisors. Decide whether that is the right dashboard semantics once release-candidate runs become routine.
- **Roster source format:** `coverage.validation-roster` cross-references a structured JSON roster against Markdown. Revisit only if maintaining both becomes painful.
- **Domain source of truth:** `coverage.domains` uses live manifests for implemented routes and product docs for intended boundaries. Revisit if domain manifests stop being a good bounded surface.
