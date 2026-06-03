# Verifier to-do list

This file is the active backlog for making the Commonality verifier workspace a progressively more trustworthy answer to:

> Would we feel confident telling the world “come use this”?

Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files under [`checks/`](./checks/). Keep this file focused on **unfinished work**; prune completed implementation notes instead of letting them accumulate.

## Current state

As of the latest refresh, the verifier has the right overall shape:

- conventional wrappers: lint, build, fast/full tests, seed regression;
- validation-pass supervisors: PR, light-confidence, release-candidate, full-launch;
- manual/report-attestation checks for newcomer, real-UI, security, demo, and QA synthesis reviews;
- guarded stack/environment checks for IPFS artifacts, fresh local stack, restart consistency, and testnet smoke;
- operations/degradation and deterministic AI-fixture canaries;
- verifier-of-verifier checks: testing-plan coverage, domain coverage, roster coverage, known-gap staleness, readiness, liveness, known-bad fixtures;
- advisory LLM judgment leaves for docs coherence, landing-page compellingness, workflow clarity, verifier review, and candidates for conversion to deterministic tests.

**Priority 1 is complete.** The supervisors P1 gates on are all green: `validation.pr`, `validation.light-confidence`, `automated.test-full`, and `meta.verifier-health`. `root` still reports **not ready**, but the only failing children are now `validation.release-candidate` and `validation.full-launch` — i.e. P2/P3 work, not regressions. Next step is Priority 2.

The advisory LLM leaves are healthy (deepseek key restored 2026-06-03) and remain `uncertain` by design; do not rerun them blindly — triage one small finding at a time. Latest findings to keep in mind:

- `review.docs-coherence`: uncertain — variable-naming mismatch between the `.env.example` files, scattered verifier instructions with undocumented shape assumptions, and propagation of stale/inaccessible references a newcomer would trip over.
- `review.workflow-clarity`: uncertain — Alignment’s funding flow could preview the LazyGiving finish step/return path more clearly; remaining items are polish, not blockers.
- `meta.llm-check-review`: uncertain — verifier lacks objective performance/reliability checks and has blind spots around destructive-stack verification.
- `meta.llm-to-automated-candidates`: uncertain — suggests deterministic promotion candidates around report-attestation structure/freshness.

## How to work this list

1. Pick one item from the highest unfinished priority section.
2. Implement or run the needed verifier check/review.
3. Refresh the relevant supervisor, then `verifier-run root` or `npm run verifier:root`.
4. Update this file by deleting or revising the completed item.
5. If an item reveals a better conventional automated test, prefer adding that test over leaving the burden on an LLM/manual check.

### Lessons from the 2026-06-03 P1 session

“Do P1” is too large for one uninterrupted agent pass. Split future work into small subtasks/checkpoints:

1. Fix `automated.test-full` only. Run narrower commands first (`npm run sdk:test`, `npm run hardhat:test`, `npm run integration-tests`, `npm run ui:test` or even the failing package command) before rerunning the full verifier wrapper.
2. Refresh/report-attest missing light-confidence reports only. These are cheap and their results are retained under `verifier/results/`; do not regenerate fresh reports unless they go stale or the surface meaningfully changes.
3. Rerun `validation.light-confidence` and `root` only after prerequisites are green/current.
4. Triage `review.docs-coherence` one deterministic doc/link issue at a time. Prefer a docs-link check over repeated model calls.
5. Triage `review.workflow-clarity` one user-flow issue at a time. Prefer route/CTA/link tests for objective pieces.

Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes and includes SDK, Hardhat, integration stack startup, UI Vitest, and Playwright. Advisory LLM checks can also be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here.

Playwright note for agents: failed E2E runs used to hang after completion by serving the HTML report (`Serving HTML report at http://localhost:9323`). `ui/playwright.config.ts` should keep the HTML reporter configured with `open: 'never'`; if this regresses, run E2E commands with `PLAYWRIGHT_HTML_OPEN=never` or disable the auto-open report so the process exits and verifier/live-terminal waits do not stall.

## Priority 1 — fix concrete validation failures — DONE

All concrete P1 validation failures are fixed; `validation.pr`, `validation.light-confidence`, and `automated.test-full` are green. Remaining `review.docs-coherence` / `review.workflow-clarity` findings are advisory `uncertain` and tracked under Priority 4 (whether to promote them to gating). See "Current state" above for latest advisory findings.

## Priority 2 — earn release-candidate confidence

These are required before a credible testnet/release-candidate claim.

- [ ] Run the guarded release-candidate prerequisites intentionally, with explicit opt-ins and notes about side effects:
  - [ ] `COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1 verifier-run artifact.ipfs-domain-smoke`
  - [ ] `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1 verifier-run stack.fresh-seeded`
  - [ ] `COMMONALITY_VERIFIER_ALLOW_RESTART=1 verifier-run stack.restart-consistency`
- [ ] Produce a release-candidate QA synthesis report, then rerun `review.qa-synthesis.release-candidate`.
- [ ] Rerun `verifier-run validation.release-candidate` and inspect classified findings.
- [ ] Work down the release-candidate readiness gaps from `coverage.readiness`:
  - [ ] Smart contracts: decide which edge cases need dedicated tests/checks beyond the current Hardhat suite and `review.security.contracts`.
  - [ ] SDK/data aggregation: identify high-value trust/alignment/large-dataset invariants worth promoting from broad test-suite coverage into dedicated checks or tests.
  - [ ] Indexer/chain integration: add or identify replay/resume/duplicate/reset/reorg canaries and reference them in `coverage/testing-plan-items.json`.
  - [ ] Operations/degradation: update the coverage record now that RPC and wrong-chain slices exist; add only genuinely missing high-value canaries.
  - [ ] Environments: decide which local-stack/staging checks must be mandatory for release-candidate status versus explicitly skipped by policy.

## Priority 3 — earn full-launch confidence

These should wait until release-candidate confidence is credible.

- [ ] Configure and run `env.testnet-smoke` against real staging/testnet endpoints:
  - `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1`
  - `COMMONALITY_TESTNET_RPC_URL`
  - `COMMONALITY_TESTNET_GRAPHQL_URL`
  - `COMMONALITY_TESTNET_APP_URL`
- [ ] Produce a full-launch QA synthesis report, then rerun `review.qa-synthesis.full-launch`.
- [ ] Rerun `verifier-run validation.full-launch` and inspect classified findings.
- [ ] Work down the full-launch readiness gaps from `coverage.readiness`:
  - [ ] AI services / generated data: broaden deterministic adversarial/golden corpora without live model calls in ordinary verifier runs.
  - [ ] Known automated-test gaps: promote the highest-value remaining manual-plan gaps into conventional tests or explicit verifier checks.

## Priority 4 — improve the verifier as a confidence system

These make the verifier better at answering the “huge crazy project actually works” question rather than merely reporting test pass/fail.

- [ ] Decide whether any advisory LLM judgment checks should become gating children after observing cost and false-positive rates:
  - [ ] `review.docs-coherence`
  - [ ] `review.landing-compelling`
  - [ ] `review.workflow-clarity`
  - [ ] `meta.llm-check-review`
  - [ ] `meta.llm-to-automated-candidates`
- [ ] Add a performance/readiness check or explicit known-gap record. Current verifier coverage has degradation canaries, but no serious “performance is acceptable” check.
- [ ] Add a clearer UI workflow-coverage story beyond the single default `review.workflow-clarity` target. Options:
  - multiple parametrized workflow-clarity checks for key workflows;
  - a coverage inventory of required workflows;
  - conventional route/CTA/link tests for objective pieces.
- [ ] Make `ui/test-plan.md` drift less manual. Options:
  - generate parts of the route/component inventory;
  - add a coverage check that verifies listed test files/routes still exist;
  - move key UI plan items into structured verifier coverage data.
- [x] Convert at least one `meta.llm-to-automated-candidates` suggestion into a deterministic test or check. Initial candidates from the first run:
  - [ ] report-attestation structure/freshness checks as conventional tests;
  - [x] docs broken-reference checks for the bounded docs-coherence surface. (`review.docs-broken-refs` — passes, wired into `meta.verifier-health`.)
- [ ] Add more `known-bad.*` fixtures for checks that are easy to accidentally make too forgiving.

## Open design decisions

- **Advisory vs. gating LLM checks:** The product/meta LLM judgment leaves are currently advisory. Promote only after real runs show they are useful and not too noisy.
- **Guarded-check status:** Guarded checks currently surface as skipped-by-policy/error-ish results in supervisors. Decide whether that is the right dashboard semantics once release-candidate runs become routine.
- **Roster source format:** `coverage.validation-roster` currently cross-references a structured JSON roster against Markdown. Revisit only if maintaining both becomes painful.
- **Domain source of truth:** `coverage.domains` currently uses live manifests for implemented routes and product docs for intended boundaries. Revisit if domain manifests stop being a good bounded surface.
