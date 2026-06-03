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

The latest root report still says **not ready**. Continuity from the 2026-06-03 P1 session:

- `validation.pr` passed before the session.
- The four light-confidence report-attestation leaves were refreshed and now pass:
  - `workflow/reviews/manual-validation/demo-dry-run-2026-06-03.md`
  - `workflow/reviews/manual-validation/newcomer-touched-surface-2026-06-03.md`
  - `workflow/reviews/manual-validation/real-ui-touched-domain-2026-06-03.md`
  - `workflow/reviews/manual-validation/security-contracts-2026-06-03.md`
  Their verifier results are stored under `verifier/results/review.*`; the reports should remain fresh for 14 days except `review.security.contracts`, which is fresh for 30 days.
- `automated.test-full` was rerun several times. SDK, Hardhat, integration tests, UI Vitest, and the non-IPFS Playwright E2E flows now pass in the full wrapper; the old Ponder watcher-limit failure did not reproduce after the local watcher-limit increase.
  - Earlier failure: `indexer/start.sh` shell-sourced `/workspace/.env` and failed on `CONTENT_ATTESTER_PROMPT_TEMPLATE=Evaluate whether ...`. This was fixed by parsing `.env` as key/value lines instead of sourcing it.
  - Earlier failure: Ponder/indexer startup failed with `ENOSPC: System limit for number of file watchers reached, watch '/app/scripts'` (`verifier/artifacts/automated.test-full/2026-06-03T14-26-49.603Z-628873bf/command.log`). This appears resolved by the user's system watcher-limit increase; do not chase unless it recurs.
  - The previous full-wrapper IPFS artifact failure (`Channel metadata lookup is required for testnet...`) is fixed. Targeted `npm run test:e2e --workspace=ui -- --project=ipfs-domain-artifacts` passed.
  - A follow-up full-wrapper run then failed only in `cross-domain-persistence.spec.ts` because a transient content-funding event-cache fetch during the intentional indexer restart was emitted as a browser console error. That is now fixed by surfacing the hook failure as UI state plus `console.warn` instead of `console.error`; targeted `npm run test:e2e --workspace=ui -- --project=tally e2e/cross-domain-persistence.spec.ts` passed.
  - Latest `verifier-run automated.test-full` passed. Artifact: `verifier/artifacts/automated.test-full/2026-06-03T15-58-59.498Z-3cebe024/command.log`.
- Targeted UI tests for touched workflow files passed:
  - `npm run test:vitest --workspace=ui -- src/fundingportal/components/AlignedProjectCard.test.tsx src/conceptspace/pages/ExplorerPage.test.tsx src/fundingportal/pages/StatementFundingPortalPage.test.tsx`
- `review.docs-coherence` and `review.workflow-clarity` were rerun after partial fixes and remain advisory `uncertain`, but their findings have narrowed. Do not keep rerunning them blindly; triage one small finding at a time.
- `validation.light-confidence` was rerun after `automated.test-full` passed and is green. `root` was rerun and still says not ready because old `validation.release-candidate` / `validation.full-launch` results are red; continue with guarded release-candidate prerequisites or rerun those passes intentionally per Priority 2.
- The 2026-06-03 session left implementation/docs changes in the working tree. Important touched files include `indexer/start.sh`, `ui/playwright.config.ts`, `ui/src/domains/alignment/LandingPage.tsx`, `ui/src/conceptspace/pages/ExplorerPage.tsx`, `ui/src/conceptspace/pages/ExplorerPage.test.tsx`, `ui/src/fundingportal/components/AlignedProjectCard.tsx`, `ui/src/fundingportal/components/AlignmentAttestationsSection.tsx`, `ui/src/fundingportal/pages/StatementFundingPortalPage.tsx`, `verifier/checks/review/docs-coherence.mjs`, `verifier/checks/review/workflow-clarity.mjs`, `AGENTS.md`, `.env.example`, `ui/.env.example`, `ui/README.md`, `workflow/local-development.md`, `workflow/roles/end-user.md`, `workflow/roles/tech-lead.md`, `docs/dev/architecture.md`, and `specs/tech/ui-domains.md`.

Latest advisory LLM findings to keep in mind:

- `review.docs-coherence`: uncertain — current remaining findings include missing/unsupplied end-user `shared/key-ideas` docs in the review surface, an overstated “core pipeline is complete” architecture claim relative to known validation gaps, top-level README links omitted from the checked surface, and a stale/incomplete UI implemented-component inventory.
- `review.workflow-clarity`: uncertain — current remaining findings include Alignment’s funding flow needing a clearer preview of the LazyGiving finish step/return path, vouching not carrying the selected cause into LazyGiving, the empty Explore state dead-ending to Tally, and wallet requirements being mostly disabled controls rather than active onboarding.
- `meta.llm-check-review`: uncertain — verifier lacks objective performance/reliability checks and has blind spots around destructive-stack verification.
- `meta.llm-to-automated-candidates`: uncertain — suggests deterministic promotion candidates around report-attestation structure/freshness and docs broken-reference checks.

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

## Priority 1 — fix concrete validation failures

These are direct blockers in the current report.

- [ ] Finish fixing the current `automated.test-full` failure, then rerun `verifier-run automated.test-full`.
  - [x] Fixed the `.env` shell-sourcing failure in `indexer/start.sh`.
  - [x] Confirmed the Ponder watcher-limit failure no longer reproduces after the local system limit increase.
  - [x] Confirmed `npm run integration-tests` passes.
  - [x] Confirmed targeted content-funding E2E passes after local E2E env fixes.
  - [x] Fix or confirm the remaining IPFS domain artifact smoke failure (`Channel metadata lookup is required for testnet...` in built artifacts), then rerun `npm run test:e2e --workspace=ui -- --project=ipfs-domain-artifacts`.
  - [x] After the narrow IPFS artifact fix passes, rerun the full verifier wrapper.
- [x] Produce or refresh the missing light-confidence review reports under `workflow/reviews/manual-validation/`, then rerun their attestation checks:
  - [x] `review.demo-dry-run`
  - [x] `review.newcomer.touched-surface`
  - [x] `review.real-ui.touched-domain`
  - [x] `review.security.contracts`
- [x] Rerun `verifier-run validation.light-confidence` after the PR child and report attestations are fresh.
- [ ] Continue triaging the advisory `review.docs-coherence` findings, then rerun `review.docs-coherence` only when the next coherent batch is fixed:
  - [x] Fix or correct the stale/missing `specs/tech/ui-domains.md` / `specs/product/ui-domains.md` references.
  - [x] Define or replace newcomer-facing jargon such as “Subjectiv”.
  - [x] Verify README role-guidance links are real and included in the review surface, or fix stale links.
  - [x] Add/point to central environment and local-dev script documentation for env vars and `scripts/data.sh` / `scripts/services.sh`.
  - [x] Decide whether end-user `shared/key-ideas` docs should be added to the review surface or relinked to existing public docs. (Decision: existing `docs/end-user/` files cover the conceptual surface; no new files needed.)
  - [x] Qualify `docs/dev/architecture.md` “core pipeline is complete” wording so it does not imply full validation/operational readiness.
  - [x] Either include top-level README targets (`CONTINUITY.md`, `TODO.md`, project status, reviews, verifier README) in `review.docs-coherence` or make the checked surface intentionally narrower. (Decision: `README.md` is already in the surface and links to those files; the bounded surface is intentional.)
  - [x] Update/remove the stale implemented-component inventory at the end of `ui/README.md`.
- [ ] Continue triaging `review.workflow-clarity` for Alignment. The original unexplained delegation hand-off was partially addressed, but latest findings remain:
  - [x] Explain that delegation/funding hand off to LazyGiving from the Alignment landing page.
  - [x] Add/clarify visible project-card CTA to “Fund on LazyGiving”.
  - [x] Make the Explorer empty-state Tally hand-off explicit instead of linking to a missing Alignment `/statements` route.
  - [x] Replace duplicate “Navigate” / “Funding Portal” CTAs with one “Open Funding Portal” CTA.
  - [x] Show disabled “Connect wallet to sign/vouch” labels instead of silent disabled actions.
  - [x] Add clearer copy on Alignment portal/project cards explaining the exact LazyGiving completion steps and return path.
  - [x] Preserve the originating cause statement into the LazyGiving vouch flow, or add a direct “Vouch for this cause” CTA from the portal/project card. (`causeCid` passed as query param + “Vouch for this project” button added to `AlignedProjectCard`.)
  - [x] Provide an Alignment-native fallback when Explore has no curated collection, rather than only sending users to Tally. (Added “Add a nudger in Settings” CTA alongside the Tally link in the empty state.)
  - [x] Consider an active connect-wallet CTA near the first action, not just disabled buttons. (Added info Alert on ExplorerPage pointing to the top-right wallet button.)

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
