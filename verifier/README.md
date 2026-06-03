# Commonality verifier workspace

This directory is the project-specific workspace for the external `verifier` harness.

See the `using-verifier` AI skill for the harness model. [`PLAN.md`](./PLAN.md) is now only the remaining backlog; current behavior is documented here and in the actual `*.def.json` files under `checks/`.

## Quick answers

- **"Give me a verifier report"** means: run `npm run verifier:report` from the repository root. This prints the latest `root` result: the top-level dashboard rollup, not a new long test run.
- **Refresh the top-level dashboard from latest child results:** run `npm run verifier:root` or `verifier-run --workspace verifier root`. This is cheap; it reruns only the root supervisor and summarizes already-recorded child results.
- **"Run the verifier" idempotently** means: run `npm run verifier:run` (`verifier-scheduler --workspace verifier`). The scheduler only runs checks that are due according to their triggers/state. Most expensive suites here are `manual`, so they will not rerun just because you started the scheduler twice; force them explicitly with `verifier-run --workspace verifier <checkId>` when you really want them.
- **Force a specific validation pass:** run `npm run verifier:pr`, `npm run verifier:light-confidence`, `npm run verifier:release-candidate`, `npm run verifier:full-launch`, or `verifier-run --workspace verifier <checkId>`. This is not due-only; it creates a new result for that named check.

## Scheduling and operating model

Initial policy:

- Run `validation.pr` manually during normal development (`npm run verifier:pr`).
- Run `validation.light-confidence` manually before notable demos or when confidence feels shaky (`npm run verifier:light-confidence`).
- Run `validation.release-candidate` manually before testnet/deployment milestones (`npm run verifier:release-candidate`).
- Run `validation.full-launch` manually before real launch milestones (`npm run verifier:full-launch`).
- Let the scheduler run only cheap operational checks automatically: `meta.liveness` every 30 minutes; `coverage.testing-plan`, `staleness.known-gaps`, `coverage.validation-roster`, `coverage.domains`, and `known-bad.*` fixture checks every 12 hours; and `meta.verifier-health` when those inputs change.
- Keep `meta.llm-check-review` manual until cost/noise is understood; it spends model time and returns advisory `uncertain` findings rather than direct pages.
- Keep slow, destructive, browser/E2E-stack, testnet, and manual/LLM attestation checks manual-triggered until their cost and side effects are better understood.
- Refresh `root` manually (`npm run verifier:root`) when you want the dashboard to summarize the latest scheduled coverage/liveness checks and manually forced validation passes.

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

`root` is the big-summary-of-everything check. It reads validation-pass, coverage, and meta-check results:

```text
root
├── validation.pr
│   ├── automated.lint
│   ├── automated.build
│   ├── automated.test-fast
│   ├── ai-fixtures.deterministic
│   └── automated.seed-implication-regression
├── validation.light-confidence
│   ├── validation.pr
│   ├── review.demo-dry-run
│   ├── review.newcomer.touched-surface
│   ├── review.real-ui.touched-domain
│   └── review.security.contracts
├── validation.release-candidate
│   ├── automated.test-full
│   ├── artifact.ipfs-domain-smoke
│   ├── stack.fresh-seeded
│   ├── stack.restart-consistency
│   ├── operations.degradation-canary
│   └── review.qa-synthesis.release-candidate
├── validation.full-launch
│   ├── validation.release-candidate
│   ├── env.testnet-smoke
│   └── review.qa-synthesis.full-launch
└── meta.verifier-health
    ├── meta.liveness
    ├── coverage.testing-plan
    ├── staleness.known-gaps
    ├── coverage.validation-roster
    ├── coverage.domains
    ├── known-bad.testing-plan
    ├── known-bad.staleness-known-gaps
    ├── known-bad.report-attestation
    └── meta.llm-check-review (advisory; summarized but not status-setting)
```

`meta.llm-check-review` is included under `meta.verifier-health` as advisory evidence: its latest result is visible in the verifier-health findings, but it does not make `root` red/uncertain unless it is later promoted to a core health input.

A supervisor summarizes the latest stored results from its children. Missing/stale/manual prerequisites should surface as `uncertain`, not be hidden as `pass`. Generic supervisor summaries also classify non-green children into `systemFailures`, `blindSpots`, `missingAttestations`, `skippedByPolicy`, `staleResults`, and `otherUncertain` findings so dashboards distinguish real product/test failures from missing reports, old prerequisite runs, or intentionally guarded checks. `validation.release-candidate` requires child results from the last 7 days; `validation.full-launch` requires child results from the last 24 hours.

## Current checks

- `automated.lint` — runs `npm run lint`.
- `automated.build` — runs `npm run build`.
- `automated.test-fast` — runs `npm run test:fast`.
- `automated.test-full` — runs `npm run test`.
- `automated.seed-implication-regression` — runs `npm run test:seed:implication-regression --workspace=fake-data-generation`.
- `ai-fixtures.deterministic` — runs the AI attestation services' deterministic mock-LLM fixture harnesses (`content-attester` and `implication-attester` `npm test`): benign + prompt-injection inputs, untrusted-data wrapping/delimiter stripping, schema/confidence normalization, and publication shape. Live-model credentials are blanked so no live model calls happen in routine runs.
- `validation.pr` — PR/change-local validation rollup over lint, build, fast tests, deterministic AI-service fixtures, and fresh seed implication regression results when available.
- `validation.light-confidence` — light confidence rollup over PR validation plus touched-surface report attestations.
- `validation.release-candidate` — release-candidate/testnet-ready rollup over full suite, deployable-artifact/local-stack checks, operations/degradation canaries, and QA synthesis; child results older than 7 days make the pass `uncertain` unless they are already a concrete `fail`/`error`.
- `validation.full-launch` — full launch rollup over release-candidate confidence, configured testnet smoke, and final QA synthesis; child results older than 24 hours make the pass `uncertain` unless they are already a concrete `fail`/`error`.
- `coverage.testing-plan` — verifies that the big testing plan's major sections are represented in `coverage/testing-plan-items.json`; scheduled every 12 hours because it is cheap.
- `staleness.known-gaps` — verifies that known-gap records in `coverage/testing-plan-items.json` have owner/status/severity/review metadata and are not stale; scheduled every 12 hours because it is cheap.
- `coverage.validation-roster` — verifies that manual/LLM validation role groups from `workflow/testing/manual-tests/README.md` are represented in `coverage/validation-roster.json` with verifier checks or explicit exclusions; scheduled every 12 hours because it is cheap.
- `coverage.domains` — verifies that all eight product domains from `specs/product/ui-domains.md` are represented in `coverage/domains.json` with smoke/review/docs coverage stories; scheduled every 12 hours because it is cheap.
- `review.*` report-attestation checks — verify that manual/LLM validation reports exist, are fresh, include the required sections, and do not name unresolved blocker findings.
- `artifact.ipfs-domain-smoke` — guarded IPFS-mode domain artifact Playwright smoke; requires `COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1` because Playwright global setup may clean/restart local E2E stack state.
- `stack.fresh-seeded` — guarded destructive local-stack smoke; requires `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1` before it will wipe local data.
- `stack.restart-consistency` — guarded local service restart smoke; requires `COMMONALITY_VERIFIER_ALLOW_RESTART=1` before it will restart services.
- `operations.degradation-canary` — cheap targeted Vitest canaries for representative dependency degradation: unavailable/malformed IPFS metadata, platform API network/malformed-response failures, personalization-service fallback behavior, indexer empty/lagging/failing states (empty result sets, loading-spinner teardown, and query-failure error surfaces across browse pages), and slow/failing chain RPC (read failure leaves the attest form usable; submission timeout surfaces an error and re-enables submit).
- `env.testnet-smoke` — guarded configured testnet/staging endpoint smoke; requires `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` plus endpoint env vars.
- `meta.liveness` — watchdog for silent or overdue verifier checks. It ignores the initial never-run state for `meta.llm-check-review` because that check is optional/manual and spends model time.
- `known-bad.*` fixture checks — run synthetic bad inputs against selected verifier-of-verifier scripts and pass only if those target checks reject the fixtures.
- `meta.verifier-health` — rollup over liveness, coverage, staleness, domain, roster, known-bad, and advisory verifier-review checks. `root` reads this one verifier-health input instead of every verifier-of-verifier check directly.
- `meta.llm-check-review` — manual adversarial LLM review of the verifier check system; writes prompt/raw-response/report artifacts and returns `uncertain` for plausible coverage gaps needing human triage. By default it resolves its model by task-kind via `pi-model-router` (`taskKind` param, default `big-picture-thinking`) rather than pinning a model string; override with `COMMONALITY_VERIFIER_LLM_REVIEW_MODEL` for an explicit model, or `COMMONALITY_VERIFIER_MODEL_ROUTER` to point at a different router.
- `root` — top-level rollup/dashboard over validation passes and meta checks.

## Deferred checks

No verifier maintenance checks are currently listed here; deferred verifier work remains in [`PLAN.md`](./PLAN.md).

## Useful commands

```sh
npm run verifier:report
npm run verifier:root
npm run verifier:pr
npm run verifier:light-confidence
npm run verifier:release-candidate
npm run verifier:full-launch
npm run verifier:run
npm run verifier:heartbeat

verifier-run --workspace verifier automated.lint
verifier-run --workspace verifier automated.build
verifier-run --workspace verifier automated.test-fast
verifier-run --workspace verifier automated.test-full
verifier-run --workspace verifier automated.seed-implication-regression
verifier-run --workspace verifier coverage.testing-plan
verifier-run --workspace verifier staleness.known-gaps
verifier-run --workspace verifier coverage.validation-roster
verifier-run --workspace verifier coverage.domains
verifier-run --workspace verifier known-bad.testing-plan
verifier-run --workspace verifier known-bad.staleness-known-gaps
verifier-run --workspace verifier known-bad.report-attestation
verifier-run --workspace verifier review.newcomer.touched-surface
verifier-run --workspace verifier review.real-ui.touched-domain
verifier-run --workspace verifier review.security.contracts
verifier-run --workspace verifier review.demo-dry-run
verifier-run --workspace verifier review.qa-synthesis.release-candidate
verifier-run --workspace verifier review.qa-synthesis.full-launch
COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1 verifier-run --workspace verifier artifact.ipfs-domain-smoke
COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1 verifier-run --workspace verifier stack.fresh-seeded
COMMONALITY_VERIFIER_ALLOW_RESTART=1 verifier-run --workspace verifier stack.restart-consistency
verifier-run --workspace verifier operations.degradation-canary
COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1 \
  COMMONALITY_TESTNET_RPC_URL=https://... \
  COMMONALITY_TESTNET_GRAPHQL_URL=https://... \
  COMMONALITY_TESTNET_APP_URL=https://... \
  verifier-run --workspace verifier env.testnet-smoke
verifier-run --workspace verifier meta.liveness
verifier-run --workspace verifier meta.llm-check-review
verifier-run --workspace verifier meta.verifier-health
verifier-run --workspace verifier root
```

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions. Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.
