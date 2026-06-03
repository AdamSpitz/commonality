# Commonality verifier workspace

This directory is the project-specific workspace for the external `verifier` harness.

See the `using-verifier` AI skill for the harness model. [`PLAN.md`](./PLAN.md) is now only the remaining backlog; current behavior is documented here and in the actual `*.def.json` files under `checks/`.

The substantive test strategy this workspace operationalizes lives alongside it:

- [`testing-plan.md`](./testing-plan.md) — the "big test plan": what launch confidence means, cost guardrails, the validation passes, and the component/environment/cross-cutting coverage checklists. `coverage/testing-plan-items.json` maps its major sections and explicit launch-confidence dimensions (including performance acceptability) to verifier check IDs or known-gap records.
- [`manual-validation-plan.md`](./manual-validation-plan.md) — the manual/LLM validation roster: the pass runbook, report template, per-domain and per-role checklists, and the automation backlog. `coverage/validation-roster.json` maps its role groups to checks or explicit exclusions.

## Big overarching goal

I want this verifier workspace to grow into something that could conceivably at some point start giving me confidence that this whole huge crazy project actually works.

That doesn't just mean "basic functionality tests pass", but also "docs make sense" and "landing pages are compelling" and "performance is acceptable" and "UI offers a clear way to complete all the various workflows we want to support" and meta-stuff like "we're actively looking for ways to improve this verification system" and "we're watching for tasks that are currently being done as part of the LLM-based checks and looking for opportunities to turn them into conventional automated tests" and whatever else you can think of that would be worthwhile.

If this project were being run as a startup company and I was the founder, I'd have employees - not just to implement the code (which is the main thing I've been using LLMs for), but also to test it and reassure me that the thing actually works. (Automated tests are fine and good and we've got lots of those, but the founder would still insist on humans actually using the software and thinking it through and so on.)

I don't want to hire any real human employees; I want to use LLMs instead. (Not necessarily running as long-running autonomous agents; I doubt that's necessary. I just mean: defining the "employees'" roles and using LLMs to carry out those roles.)

So if you're an AI who's been asked to help me design this system of verifier checks, the question to ask is: If you were the founder of this project, what kinds of roles would you want to see filled by intelligent employees, such that if they came to you and said "yup, the project works, it's doing what it's supposed to do", you'd be satisfied with that and you'd feel confident in going to the world and saying "come see this project, it's ready to be used"?


## Quick answers

- **"Give me a verifier report"** means: run `npm run verifier:report` from the repository root. This prints the latest `root` result: the top-level dashboard rollup, not a new long test run.
- **Refresh the top-level dashboard from latest child results:** run `npm run verifier:root` or `verifier-run root`. This is cheap; it reruns only the root supervisor and summarizes already-recorded child results.
- **"Run the verifier" idempotently** means: run `npm run verifier:run` (`verifier-scheduler`). The scheduler only runs checks that are due according to their triggers/state. Most expensive suites here are `manual`, so they will not rerun just because you started the scheduler twice; force them explicitly with `verifier-run <checkId>` when you really want them.
- **Force a specific facet or pass:** run `npm run verifier:pr` (fast functionality loop), `npm run verifier:functionality`, `npm run verifier:docs`, `npm run verifier:product`, `npm run verifier:security`, or `verifier-run <checkId>`. This is not due-only; it creates a new result for that named check.

The project `.envrc` sets `VERIFIER_WORKSPACE=verifier` so the `--workspace` flag is no longer needed when running from the repository root. If you're running from a different directory, pass `--workspace <path-to-workspace>` or set `VERIFIER_WORKSPACE`.

## Concern facets vs. confidence tiers

The dashboard is organized by **concern facet**, not by confidence tier. There are four gating facets, each answering one kind of question and each independently watchable:

- `facet.functionality` — does it work? (lint/build/tests, deployable artifacts, local stack, degradation, testnet)
- `facet.docs` — do the docs cohere?
- `facet.product` — is it compelling and usable?
- `facet.security` — is the on-chain surface sound?

`root` ("is this ready to deploy?") rolls up all four plus `meta.verifier-health`; any facet red makes `root` red. The point of faceting is isolation: while working on functionality you watch `facet.functionality` (or the fast `validation.pr` loop), and broken docs/product/security live in *other* facets that cannot turn it red.

"Deployment depth" (full suite, local stack, testnet smoke) lives as children of `facet.functionality` with a 7-day freshness window; stale deep checks surface as `uncertain`, not red, so they do not block the fast inner loop. The old confidence-tier supervisors (`validation.light-confidence`, `validation.release-candidate`, `validation.full-launch`) have been retired; their tier vocabulary survives only as readiness *planning labels* (`targetConfidence` in `coverage/testing-plan-items.json`, `requiredPasses` in `coverage/validation-roster.json`), answering "before which milestone must this gap be fixed" independently of dashboard topology.

The three standing LLM-judgment leaves (`review.docs-coherence`, `review.landing-compelling`, `review.workflow-clarity`) are now **gating** within their facets. They still emit only `pass`/`uncertain` for their own opinion, but the harness derives the gating status from each finding's `severity`: any `high` finding → `fail` (red), any findings → `uncertain` (yellow), none → `pass`. So the model can neither talk a gap into a pass nor downgrade a high-severity finding.

## Scheduling and operating model

Initial policy:

- Run `validation.pr` manually during normal development (`npm run verifier:pr`) — the fast functionality loop.
- Run an individual facet manually when working in it: `npm run verifier:functionality`, `verifier:docs`, `verifier:product`, `verifier:security`.
- Run `root` (`npm run verifier:root`) for the "ready to deploy?" answer across all facets.
- Let the scheduler run only cheap operational checks automatically: `meta.liveness` every 30 minutes; `coverage.testing-plan`, `staleness.known-gaps`, `coverage.validation-roster`, `coverage.domains`, `coverage.readiness`, and `known-bad.*` fixture checks every 12 hours; and `meta.verifier-health` when those inputs change.
- Keep `meta.llm-check-review` and `meta.llm-to-automated-candidates` manual until cost/noise is understood; they spend model time and return advisory `uncertain` findings rather than direct pages.
- Keep slow, destructive, browser/E2E-stack, testnet, and manual/LLM attestation checks manual-triggered until their cost and side effects are better understood.
- Refresh `root` manually (`npm run verifier:root`) when you want the dashboard to summarize the latest scheduled coverage/liveness checks and manually forced facet results.

To operate continuously, run the scheduler under a real process supervisor:

```sh
npm run verifier:run
```

Then add an external heartbeat cron outside the scheduler, so scheduler death is visible:

```cron
*/5 * * * * cd /home/adam/Projects/commonality && npm run verifier:heartbeat
```

`heartbeat-check.sh` alerts if `verifier/state/heartbeat` is missing or older than `MAX_AGE_SEC` (default: 180 seconds). Wire that script's failure path to a real pager/webhook in deployed operation.

## Dashboard hierarchy

`root` is the big-summary-of-everything check ("is this ready to deploy?"). It reads the four concern facets plus verifier-health:

```text
root
├── facet.functionality
│   ├── validation.pr            (fast loop: lint, build, test-fast, ai-fixtures, seed regression)
│   ├── automated.test-full
│   ├── artifact.ipfs-domain-smoke
│   ├── stack.fresh-seeded
│   ├── stack.restart-consistency
│   ├── operations.degradation-canary
│   └── env.testnet-smoke
├── facet.docs
│   ├── review.docs-coherence    (gating; high-severity finding → red)
│   └── review.docs-broken-refs
├── facet.product
│   ├── review.landing-compelling (gating; high-severity finding → red)
│   ├── review.workflow-clarity   (gating; high-severity finding → red)
│   ├── review.real-ui.touched-domain
│   ├── review.newcomer.touched-surface
│   ├── review.demo-dry-run
│   ├── review.qa-synthesis.release-candidate
│   └── review.qa-synthesis.full-launch
├── facet.security
│   └── review.security.contracts
└── meta.verifier-health
    ├── meta.liveness
    ├── coverage.testing-plan
    ├── staleness.known-gaps
    ├── coverage.validation-roster
    ├── coverage.domains
    ├── coverage.readiness
    ├── review.docs-broken-refs
    ├── known-bad.testing-plan
    ├── known-bad.staleness-known-gaps
    ├── known-bad.report-attestation
    ├── known-bad.readiness
    ├── meta.llm-check-review (advisory; summarized but not status-setting)
    └── meta.llm-to-automated-candidates (advisory; summarized but not status-setting)
```

`validation.pr` is retained as the fast functionality entry point and is a child of `facet.functionality`. `review.docs-broken-refs` is shared between `facet.docs` and `meta.verifier-health`.

`meta.llm-check-review` and `meta.llm-to-automated-candidates` are included under `meta.verifier-health` as advisory evidence: their latest results are visible in the verifier-health findings, but they do not make `root` red/uncertain unless later promoted to core health inputs. `meta.llm-to-automated-candidates` is the standing answer to "which subjective checks could become conventional tests": it scans the LLM-judgment and report-attestation checks and proposes deterministic tests that could replace or back them up, returning `uncertain` for plausible promotion candidates.

`coverage.readiness` is a cheap deterministic reporting leaf: it groups the open known-gaps in `coverage/testing-plan-items.json` by the `targetConfidence` tier each must clear, including explicit non-test gaps such as performance acceptability, and writes a `readiness.md` artifact answering "what remains before release-candidate / before full-launch". It passes as long as every open gap can be placed in a tier and fails only if a gap has no `targetConfidence`, which would leave the readiness narrative incomplete.

`review.docs-coherence`, `review.landing-compelling`, and `review.workflow-clarity` are standing **product** LLM-judgment leaves (vs. `meta.llm-check-review`, which judges the verifier). They read a bounded product surface and form the opinion themselves rather than attesting that a human did: `review.docs-coherence` judges whether the docs cohere, `review.landing-compelling` judges whether the landing/marketing copy lands the product's actual value proposition, and `review.workflow-clarity` judges whether the UI exposes a clear, completable path through a target workflow. All three are manual-triggered and now **gating** — `docs-coherence` in `facet.docs`, the other two in `facet.product`. The model still emits only `pass`/`uncertain` for its own opinion, but the harness derives the gating status from the structured findings' severities via `statusFromFindings` (`checks/lib/llm-judgment.mjs`): any `high`-severity finding → `fail` (red), any findings → `uncertain` (yellow), none → `pass`. So the model can neither talk a gap into a pass nor downgrade a high-severity finding into a non-blocking one. (`meta.llm-check-review` and `meta.llm-to-automated-candidates`, which judge the verifier rather than the product, remain advisory under `meta.verifier-health`.)

A supervisor summarizes the latest stored results from its children. Missing/stale/manual prerequisites should surface as `uncertain`, not be hidden as `pass`. Generic supervisor summaries also classify non-green children into `systemFailures`, `blindSpots`, `missingAttestations`, `skippedByPolicy`, `staleResults`, and `otherUncertain` findings so dashboards distinguish real product/test failures from missing reports, old prerequisite runs, or intentionally guarded checks. A child whose id is listed in the supervisor's `advisoryCheckIds` param is partitioned out of all of this: it is summarized under `advisoryChildren`/`advisoryCounts` and in the summary line (`… ; N advisory uncertain …`) but excluded from the rollup status, the core counts, the classification buckets, and missing/freshness gating. `facet.functionality` requires its deep child results from the last 7 days (stale ones surface as `uncertain`, not red); the other facets rely on their leaves' own freshness logic (the report-attestation checks already go `uncertain` when their reports are stale).

## Current checks

- `automated.lint` — runs `npm run lint`.
- `automated.build` — runs `npm run build`.
- `automated.test-fast` — runs `npm run test:fast`.
- `automated.test-full` — runs `npm run test`.
- `automated.seed-implication-regression` — runs `npm run test:seed:implication-regression --workspace=fake-data-generation`.
- `ai-fixtures.deterministic` — runs the AI services' deterministic mock-LLM fixture harnesses (`content-attester`, `implication-attester`, and `explorer-curator` `npm test`): benign + prompt-injection inputs, untrusted-data wrapping/delimiter stripping, schema/confidence normalization, publication shape, and (for the personalization service) curation/personalization prompt construction plus LLM-failure fallback. Live-model credentials are blanked so no live model calls happen in routine runs.
- `validation.pr` — PR/change-local validation rollup over lint, build, fast tests, deterministic AI-service fixtures, and fresh seed implication regression results when available. The fast functionality loop; also a child of `facet.functionality`.
- `facet.functionality` — concern facet: does it work? Rolls up `validation.pr`, full suite, deployable-artifact/local-stack checks, degradation canaries, and testnet smoke; deep children older than 7 days surface as `uncertain` unless already a concrete `fail`/`error`.
- `facet.docs` — concern facet: do the docs cohere? Rolls up gating `review.docs-coherence` and deterministic `review.docs-broken-refs`.
- `facet.product` — concern facet: is it compelling and usable? Rolls up gating `review.landing-compelling` and `review.workflow-clarity`, plus touched-surface UI/newcomer attestations, demo dry-run, and QA synthesis.
- `facet.security` — concern facet: is the on-chain surface sound? Rolls up `review.security.contracts`.
- `coverage.testing-plan` — verifies that the big testing plan's major sections plus explicit launch-confidence dimensions such as performance acceptability are represented in `coverage/testing-plan-items.json`; scheduled every 12 hours because it is cheap.
- `staleness.known-gaps` — verifies that known-gap records in `coverage/testing-plan-items.json` have owner/status/severity/review metadata and are not stale; scheduled every 12 hours because it is cheap.
- `coverage.validation-roster` — verifies that manual/LLM validation role groups from `manual-validation-plan.md` are represented in `coverage/validation-roster.json` with verifier checks or explicit exclusions; scheduled every 12 hours because it is cheap.
- `coverage.domains` — verifies that all eight product domains from `specs/product/ui-domains.md` are represented in `coverage/domains.json` with smoke/review/docs coverage stories; scheduled every 12 hours because it is cheap.
- `coverage.readiness` — aggregates the open known-gaps in `coverage/testing-plan-items.json` by `targetConfidence` tier into a single go-live readiness narrative (writes `readiness.md`), including the explicit performance-acceptability gap; passes unless an open gap has no target tier. Scheduled every 12 hours because it is cheap and deterministic (no model calls).
- `review.docs-broken-refs` — deterministic broken-reference scan over the bounded docs-coherence surface: extracts relative Markdown links from each file and verifies the target path exists. No model calls; always returns `pass` or `fail`. Scheduled every 12 hours. Wired into `meta.verifier-health` as a coverage input.
- `review.*` report-attestation checks — verify that manual/LLM validation reports exist, are fresh, include the required sections, and do not name unresolved blocker findings.
- `artifact.ipfs-domain-smoke` — guarded IPFS-mode domain artifact Playwright smoke; requires `COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1` because Playwright global setup may clean/restart local E2E stack state.
- `stack.fresh-seeded` — guarded destructive local-stack smoke; requires `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1` before it will wipe local data.
- `stack.restart-consistency` — guarded local service restart smoke; requires `COMMONALITY_VERIFIER_ALLOW_RESTART=1` before it will restart services.
- `operations.degradation-canary` — cheap targeted Vitest canaries for representative dependency degradation: unavailable/malformed IPFS metadata, platform API network/malformed-response failures, personalization-service fallback behavior, indexer empty/lagging/failing states (empty result sets, loading-spinner teardown, and query-failure error surfaces across browse pages), and slow/failing chain RPC (read failure leaves the attest form usable; submission timeout surfaces an error and re-enables submit).
- `env.testnet-smoke` — guarded configured testnet/staging endpoint smoke; requires `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` plus endpoint env vars.
- `meta.liveness` — watchdog for silent or overdue verifier checks. It ignores the initial never-run state for `meta.llm-check-review` because that check is optional/manual and spends model time.
- `known-bad.*` fixture checks — run synthetic bad inputs against selected verifier-of-verifier scripts and pass only if those target checks reject the fixtures. `known-bad.report-attestation` covers incomplete, stale, and blocker-naming report fixtures.
- `meta.verifier-health` — rollup over liveness, coverage, staleness, domain, roster, known-bad, and advisory verifier-review checks. `root` reads this one verifier-health input instead of every verifier-of-verifier check directly.
- `meta.llm-check-review` — manual adversarial LLM review of the verifier check system; writes prompt/raw-response/report artifacts and returns `uncertain` for plausible coverage gaps needing human triage. By default it resolves its model by task-kind via `pi-model-router` (`taskKind` param, default `big-picture-thinking`) rather than pinning a model string; override with `COMMONALITY_VERIFIER_LLM_REVIEW_MODEL` for an explicit model, or `COMMONALITY_VERIFIER_MODEL_ROUTER` to point at a different router.
- `review.docs-coherence` — manual standing LLM-judgment leaf over the product/docs surface (`README.md`, `AGENTS.md`, `docs/dev/architecture.md`, `docs/end-user/tldr-for-llms.md`, `docs/founder/christian-pitch.md`, `ui/README.md`, the testing READMEs); flags contradictions, stale instructions, conceptual incoherence, broken references, and unfollowable steps, and returns `uncertain` for plausible coherence gaps (never `fail`). Resolves its model by task-kind via `pi-model-router` (`taskKind` param, default `clear-communication`); override with `COMMONALITY_VERIFIER_DOCS_COHERENCE_MODEL`. The generic LLM-call machinery it shares with `meta.llm-check-review` lives in `checks/lib/llm-judgment.mjs`.
- `review.landing-compelling` — manual standing LLM-judgment leaf that reads the landing/marketing copy (`docs/end-user/common-sense-majority/elevator-pitch.md`, `docs/end-user/tldr-for-llms.md`, `docs/founder/csm/pitching-reference.md`, the commonality and CSM `LandingPage.tsx`) against the product's value-prop ground truth (`docs/founder/christian-pitch.md`, `docs/founder/csm/README.md`) and flags value-prop misalignment, unconvincing claims, weak ledes, voice violations (recognition-over-persuasion), and unfinished copy; returns `uncertain` for plausible problems (never `fail`). Resolves its model by task-kind via `pi-model-router` (`taskKind` param, default `big-picture-thinking`); override with `COMMONALITY_VERIFIER_LANDING_COMPELLING_MODEL`. Shares the `checks/lib/llm-judgment.mjs` machinery.
- `review.workflow-clarity` — manual standing LLM-judgment leaf that, given a target workflow (`targetWorkflow` param: home domain, goal, and the surface files to read; defaults to an Alignment newcomer-funding workflow over that domain's `manifest.tsx` + `LandingPage.tsx`), uses the `coverage/domains.json` inventory as the surface enumerator and judges whether the UI exposes a clear, completable path; flags dead ends, missing steps, ambiguous navigation, unexplained cross-domain hops, and onboarding gaps, returning `uncertain` for plausible gaps (never `fail`). Resolves its model by task-kind via `pi-model-router` (`taskKind` param, default `big-picture-thinking`); override with `COMMONALITY_VERIFIER_WORKFLOW_CLARITY_MODEL`. Shares the `checks/lib/llm-judgment.mjs` machinery.
- `meta.llm-to-automated-candidates` — manual advisory LLM review that scans the subjective checks (LLM-judgment leaves built on `checks/lib/llm-judgment.mjs` and report-attestation checks) and proposes which have objective enough criteria to be promoted to conventional deterministic tests (full/partial/support-only), naming the mechanizable sub-criterion and a concrete test for each; returns `uncertain` for plausible promotion candidates (never `fail`). Resolves its model by task-kind via `pi-model-router` (`taskKind` param, default `big-picture-thinking`); override with `COMMONALITY_VERIFIER_LLM_TO_AUTOMATED_MODEL`.
- `root` — top-level "ready to deploy?" rollup/dashboard over the four concern facets and `meta.verifier-health`.

## Deferred checks

No verifier maintenance checks are currently listed here; deferred verifier work remains in [`PLAN.md`](./PLAN.md).

## Useful commands

```sh
npm run verifier:report
npm run verifier:root
npm run verifier:pr
npm run verifier:functionality
npm run verifier:docs
npm run verifier:product
npm run verifier:security
npm run verifier:run
npm run verifier:heartbeat

verifier-run automated.lint
verifier-run automated.build
verifier-run automated.test-fast
verifier-run automated.test-full
verifier-run automated.seed-implication-regression
verifier-run coverage.testing-plan
verifier-run staleness.known-gaps
verifier-run coverage.validation-roster
verifier-run coverage.domains
verifier-run known-bad.testing-plan
verifier-run known-bad.staleness-known-gaps
verifier-run known-bad.report-attestation
verifier-run review.docs-broken-refs
verifier-run review.newcomer.touched-surface
verifier-run review.real-ui.touched-domain
verifier-run review.security.contracts
verifier-run review.demo-dry-run
verifier-run review.qa-synthesis.release-candidate
verifier-run review.qa-synthesis.full-launch
COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1 verifier-run artifact.ipfs-domain-smoke
COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1 verifier-run stack.fresh-seeded
COMMONALITY_VERIFIER_ALLOW_RESTART=1 verifier-run stack.restart-consistency
verifier-run operations.degradation-canary
COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1 \
  COMMONALITY_TESTNET_RPC_URL=https://... \
  COMMONALITY_TESTNET_GRAPHQL_URL=https://... \
  COMMONALITY_TESTNET_APP_URL=https://... \
  verifier-run env.testnet-smoke
verifier-run meta.liveness
verifier-run meta.llm-check-review
verifier-run review.docs-coherence
verifier-run meta.verifier-health
verifier-run root
```

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions. Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.
