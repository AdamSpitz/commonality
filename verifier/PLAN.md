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

The latest root report still says **not ready**:

- `validation.pr` passes.
- `validation.light-confidence` is uncertain because required light-confidence reports are missing.
- `validation.release-candidate` and `validation.full-launch` fail.
- `meta.verifier-health` passes; its advisory LLM children are current and uncertain, not missing.

Latest advisory LLM findings to keep in mind:

- `review.docs-coherence`: uncertain — docs are mostly coherent, but the check flagged broken/missing spec references and undefined/stale newcomer-facing terms.
- `review.workflow-clarity`: uncertain — Alignment sends users into a cross-domain delegation route without enough explanation.
- `meta.llm-check-review`: uncertain — verifier lacks objective performance/reliability checks and has blind spots around destructive-stack verification.
- `meta.llm-to-automated-candidates`: uncertain — suggests deterministic promotion candidates around report-attestation structure/freshness and docs broken-reference checks.

## How to work this list

1. Pick one item from the highest unfinished priority section.
2. Implement or run the needed verifier check/review.
3. Refresh the relevant supervisor, then `verifier-run root` or `npm run verifier:root`.
4. Update this file by deleting or revising the completed item.
5. If an item reveals a better conventional automated test, prefer adding that test over leaving the burden on an LLM/manual check.

## Priority 1 — fix concrete validation failures

These are direct blockers in the current report.

- [ ] Investigate and fix the current `automated.test-full` failure, then rerun `verifier-run automated.test-full`.
- [ ] Produce or refresh the missing light-confidence review reports under `workflow/reviews/manual-validation/`, then rerun their attestation checks:
  - [ ] `review.demo-dry-run`
  - [ ] `review.newcomer.touched-surface`
  - [ ] `review.real-ui.touched-domain`
  - [ ] `review.security.contracts`
- [ ] Rerun `verifier-run validation.light-confidence` after the PR child and report attestations are fresh.
- [ ] Triage the advisory `review.docs-coherence` findings, then rerun `review.docs-coherence`:
  - [ ] Fix or correct the stale/missing `specs/tech/ui-domains.md` / `specs/product/ui-domains.md` references.
  - [ ] Define or replace newcomer-facing jargon such as “Subjectiv”.
  - [ ] Verify README role-guidance links are real and included in the review surface, or fix stale links.
  - [ ] Add/point to central environment and local-dev script documentation for env vars and `scripts/data.sh` / `scripts/services.sh`.
- [ ] Triage the advisory `review.workflow-clarity` finding: the Alignment workflow sends users to a cross-domain delegation route without enough explanation. Either fix the UI/copy or document why the hand-off is acceptable, then rerun `review.workflow-clarity`.

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
- [ ] Convert at least one `meta.llm-to-automated-candidates` suggestion into a deterministic test or check. Initial candidates from the first run:
  - report-attestation structure/freshness checks as conventional tests;
  - docs broken-reference checks for the bounded docs-coherence surface.
- [ ] Add more `known-bad.*` fixtures for checks that are easy to accidentally make too forgiving.

## Open design decisions

- **Advisory vs. gating LLM checks:** The product/meta LLM judgment leaves are currently advisory. Promote only after real runs show they are useful and not too noisy.
- **Guarded-check status:** Guarded checks currently surface as skipped-by-policy/error-ish results in supervisors. Decide whether that is the right dashboard semantics once release-candidate runs become routine.
- **Roster source format:** `coverage.validation-roster` currently cross-references a structured JSON roster against Markdown. Revisit only if maintaining both becomes painful.
- **Domain source of truth:** `coverage.domains` currently uses live manifests for implemented routes and product docs for intended boundaries. Revisit if domain manifests stop being a good bounded surface.
