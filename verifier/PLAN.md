# Plan: build out the Commonality verifier workspace

Goal: turn the existing testing strategy in [`workflow/testing/README.md`](../workflow/testing/README.md) and [`workflow/testing/manual-tests/README.md`](../workflow/testing/manual-tests/README.md) into a structured verifier DAG that can answer:

- What checks should guard the project right now?
- Which checks ran recently, and what did they prove?
- Which validation pass is currently blocked?
- Which important manual/LLM reviews are missing, stale, or incomplete?
- Which known gaps are intentionally uncovered vs. accidentally forgotten?

Keep the workflow docs as the readable source of intent. Use `verifier/` as the operational workspace: check definitions, executable wrappers, result history, artifacts, state, and validation-pass supervisors.

## Design principles

1. **Start with cheap deterministic checks.** Wrap existing lint/build/test commands before adding fuzzy LLM or manual checks.
2. **Validation passes are supervisors.** Model PR, light-confidence, release-candidate, and full-launch passes as ordinary verifier checks that read lower-level check results.
3. **Manual/LLM work is report-producing or attestation-based.** Do not pretend subjective reviews are automated unless they really are. A verifier check can require a fresh report with required sections and no unresolved blockers.
4. **Avoid alert fatigue.** Not every checklist bullet should become an always-running cron check. Expensive or milestone-specific checks should be manual-triggered or self-scheduled rarely.
5. **Make skipped scope explicit.** Checks and supervisors should report what they actually covered, what they skipped, and why.
6. **Use deterministic status routing where possible.** LLMs may enrich summaries, but fixed rules should decide `pass`/`fail`/`uncertain` for supervisors and report attestations.
7. **Build coverage checks for the verifier itself.** The workspace should eventually flag silent checks, stale reports, and testing-plan items that lack a corresponding check/gap record.

## Target verifier DAG, roughly

```text
root
├── validation.pr
│   ├── automated.lint
│   ├── automated.build
│   ├── automated.test-fast
│   └── automated.seed-implication-regression   (conditional/manual until dependency detection exists)
├── validation.light-confidence
│   ├── validation.pr
│   ├── review.demo-dry-run
│   ├── review.newcomer.touched-surface
│   ├── review.real-ui.touched-domain
│   └── review.security.touched-contracts
├── validation.release-candidate
│   ├── automated.test-full
│   ├── artifact.ipfs-domain-smoke
│   ├── stack.fresh-seeded
│   ├── stack.restart-consistency
│   ├── coverage.manual-roster.release-candidate
│   └── review.qa-synthesis.release-candidate
├── validation.full-launch
│   ├── automated.test-full
│   ├── coverage.environments.full-launch
│   ├── coverage.manual-roster.full-launch
│   └── review.qa-synthesis.full-launch
├── coverage.testing-plan
├── coverage.validation-roster
├── staleness.known-gaps
└── meta.liveness
```

This is a target shape, not the initial implementation. Build it incrementally.

## Phase 1 — workspace skeleton and reusable helpers — DONE

Status: completed 2026-06-02. Implemented reusable Result and command helpers, generic supervisor, `meta.liveness`, `root`, runtime-data `.gitignore`, and README quickstart. Verified with `verifier-run --workspace verifier meta.liveness` and `verifier-run --workspace verifier root`.

Deliverables:

- `verifier/checks/supervisor.mjs`: generic deterministic supervisor for common rollup rules.
- `verifier/checks/lib/result.mjs`: small helper functions for emitting valid Result JSON, truncating command output, reading inputs, and handling errors. Checks still import only project-local helper code, not verifier harness code.
- `verifier/checks/lib/run-command.mjs`: helper for spawning commands, capturing stdout/stderr, mapping exit codes to verifier statuses, and writing optional log artifacts.
- `verifier/checks/meta/liveness.mjs` plus `meta.liveness.def.json`, adapted from the verifier README pattern.
- `verifier/checks/root.def.json` and a simple root supervisor.

Acceptance checks:

- `verifier-run --workspace verifier meta.liveness` emits one JSON Result.
- `verifier-run --workspace verifier root` works even before many child checks exist.
- All scripts log only to stderr and print exactly one JSON object to stdout.

## Phase 2 — wrap existing automated feedback loops — DONE

Status: completed 2026-06-02. Added generic `checks/automated/run-command-check.mjs` and verifier leaves for lint, build, fast tests, full tests, and seed implication regression. Verified all five checks by running them once. Latest results: `automated.lint` pass, `automated.build` pass, `automated.seed-implication-regression` pass, `automated.test-fast` fail, `automated.test-full` fail. The test failures are real project test failures captured by the verifier wrappers, not verifier harness errors; logs are available as verifier artifacts.

Add verifier leaves for the commands documented in [`workflow/roles/developer.md`](../workflow/roles/developer.md):

- `automated.lint`: runs `npm run lint`.
- `automated.build`: runs `npm run build`.
- `automated.test-fast`: runs `npm run test:fast`.
- `automated.test-full`: runs `npm run test`.
- `automated.seed-implication-regression`: runs `npm run test:seed:implication-regression --workspace=fake-data-generation`.

Suggested trigger policy:

- `lint`, `build`, `test-fast`: manual or infrequent cron initially; later cron if runtime/noise is acceptable.
- `test-full`: manual by default, because it is slow.
- `seed-implication-regression`: manual by default until a cheap changed-file detector is added.

Each wrapper should:

- report `pass` on exit code 0;
- report `fail` on nonzero test/lint/build exit;
- report `error` if the command cannot launch or times out;
- include a tail of output in `findings` and, for long output, a log artifact.

Acceptance checks:

- [x] Each command wrapper can be run once with `verifier-run --workspace verifier <id>`.
- [x] Nonzero test exits map to `fail` rather than `error` (`automated.test-fast` and `automated.test-full` currently demonstrate this with real failing tests).

## Phase 3 — PR/change-local validation supervisor — DONE

Status: completed 2026-06-02. Added `validation.pr` as a bespoke supervisor over required lint/build/fast-test results plus optional fresh seed implication regression results, and wired it into `root`. Its summary names every child check, status, and freshness.

Implemented `validation.pr` as a supervisor over:

- `automated.lint`
- `automated.build`
- `automated.test-fast`
- optionally `automated.seed-implication-regression`, but only if its result is fresh or explicitly relevant

Recommended status rule:

- any child `fail` => `fail`;
- any child `error` => `uncertain` or `error` depending on desired routing;
- stale/missing required child => `uncertain` initially, then possibly `fail` for release gates;
- all required children pass recently => `pass`.

Acceptance checks:

- [x] `verifier-run --workspace verifier validation.pr` gives a concise pass/fail/uncertain rollup.
- [x] The summary names child checks and freshness, not just status.

## Phase 4 — coverage mapping for the big test plan — DONE

Status: completed 2026-06-02. Added `verifier/coverage/testing-plan-items.json` for the major sections in `workflow/testing/README.md`, plus `coverage.testing-plan` to validate required mappings, verifier check references, and known-gap/manual status notes. Wired the check into `root`.

Added a structured coverage inventory:

- `verifier/coverage/testing-plan-items.json`
- or `verifier/checks/coverage/testing-plan.def.json` with `params` listing required items

For each major item in `workflow/testing/README.md`, record one of:

- covered by an automated verifier check;
- covered by a report/attestation check;
- intentionally manual for now;
- known gap with owner/status;
- not applicable yet.

Added `coverage.testing-plan` to verify this mapping exists and is internally consistent.

Initial scope should cover the headings, not every bullet:

- automated feedback loops;
- smart contracts;
- SDK/data aggregation;
- indexer/chain integration;
- UI unit/integration;
- UI e2e;
- AI services/generated data;
- operations/degradation;
- environments;
- manual/LLM validation roster;
- cross-cutting risks;
- known automated-test gaps.

Acceptance checks:

- [x] The check fails if a required major section has no mapping.
- [x] The check fails if a mapping points to a nonexistent verifier check id.
- [x] The check reports known gaps without pretending they are covered.

## Phase 5 — manual/LLM report attestation checks

Model the manual test roster as freshness/quality checks over reports under `workflow/reviews/`.

Add report attestation leaves such as:

- `review.newcomer.touched-surface`
- `review.real-ui.touched-domain`
- `review.security.contracts`
- `review.demo-dry-run`
- `review.qa-synthesis.release-candidate`
- `review.qa-synthesis.full-launch`

These should not necessarily run an LLM themselves at first. Instead, they should verify that a report exists and contains required sections from `workflow/testing/manual-tests/README.md`:

- scope actually covered;
- evidence used;
- attempts to break it;
- highest-severity finding;
- other findings;
- insider-knowledge caveats;
- confidence;
- recommended follow-up tests or automation.

Also define how unresolved findings affect status:

- unresolved blocker/high-confidence severe issue => `fail`;
- report missing/stale/incomplete => `uncertain` or `fail`, depending on validation pass;
- report present, fresh, complete, no blocking findings => `pass`.

Acceptance checks:

- A sample report fixture can be detected as complete.
- A missing required section is detected.
- A stale report is detected when a pass requires freshness.

## Phase 6 — environment and deployable-artifact checks

Add checks for release-candidate confidence:

- `stack.fresh-seeded`: verifies a fresh local stack can be wiped, started, seeded, and smoke-tested. Keep this manual or carefully guarded because it mutates local data.
- `stack.restart-consistency`: after representative mutations, restart services and verify core state still renders/queries correctly.
- `artifact.ipfs-domain-smoke`: builds IPFS/domain artifacts, serves them through the local gateway, and checks reload/deep-link/domain routing behavior.
- `env.testnet-smoke`: later, for real testnet staging with small funds and deployed services.

Be careful with destructive checks:

- require explicit params or environment variable opt-in before wiping data;
- report `error` rather than silently skipping if required services or opt-in are missing;
- document exactly what state was mutated.

Acceptance checks:

- Destructive checks cannot accidentally wipe data unless explicitly enabled.
- Release-candidate supervisor can include these checks as manual-triggered prerequisites.

## Phase 7 — validation-pass supervisors beyond PR

Add supervisors:

- `validation.light-confidence`
- `validation.release-candidate`
- `validation.full-launch`

Each supervisor should encode the checklist from `workflow/testing/README.md` section 0.

Suggested behavior:

- `light-confidence`: tolerates skipped unrelated scope if explicitly recorded; fails on touched-surface blockers.
- `release-candidate`: requires full automated suite, deployable artifact smoke, fresh seeded stack, restart consistency, relevant manual roster, and final skipped-scope report.
- `full-launch`: requires all validation environments, full manual roster, and QA-lead launch recommendation.

Acceptance checks:

- Running each supervisor tells the user exactly what is missing for that pass.
- Missing prerequisite checks are not hidden as `pass`.

## Phase 8 — known gaps, stale risks, and verifier-of-verifier checks

Add checks that help maintain the testing system:

- `staleness.known-gaps`: verifies known gaps have owner/status/last-reviewed fields and are not stale.
- `coverage.validation-roster`: verifies manual roster roles have corresponding verifier checks or explicit exclusions.
- `coverage.domains`: verifies all eight domains have at least smoke/review coverage records.
- `known-bad.*`: optional fixtures that intentionally violate invariants to prove checks can fail.
- `meta.liveness`: already added in phase 1, but wire it into `root` and external heartbeat later.

Acceptance checks:

- Adding a new major testing-plan item without coverage causes `coverage.testing-plan` to fail.
- A stale known gap causes `staleness.known-gaps` to fail or become uncertain.

## Phase 9 — scheduling and operating model

Once the check graph is useful, decide what should run automatically.

Suggested initial operations:

- Run `validation.pr` manually during normal development.
- Run `validation.release-candidate` manually before testnet/deployment milestones.
- Run cheap liveness/coverage checks on cron.
- Keep slow/destructive/browser/manual checks manual-triggered until their cost and side effects are well understood.

Later:

- Run `verifier-scheduler --workspace verifier` under a process supervisor.
- Add external heartbeat cron, per verifier README guidance.
- Tune `nextRun` and retention based on observed noise/cost.

## Phase 10 — documentation and workflow integration

Update docs so future agents and humans know how to use this.

Likely docs to update:

- `verifier/README.md`: workspace-specific quickstart and check inventory.
- `workflow/testing/README.md`: note that verifier is the operational runner/coverage tracker.
- `workflow/roles/developer.md`: add optional verifier commands for PR validation.
- `workflow/deployment.md`: add release-candidate/full-launch verifier commands when those checks exist.

Minimum useful command examples:

```sh
verifier-run --workspace verifier automated.lint
verifier-run --workspace verifier validation.pr
verifier-run --workspace verifier validation.release-candidate
verifier-run --workspace verifier root
```

## Suggested execution order

If executing one piece at a time, do it in this order:

1. Build reusable helpers and generic supervisor.
2. Add `automated.lint` wrapper and verify it runs.
3. Add `automated.build` wrapper.
4. Add `automated.test-fast` wrapper.
5. Add `validation.pr` supervisor.
6. Add `root` supervisor and `meta.liveness`.
7. Add `automated.test-full` as manual-triggered.
8. Add `coverage.testing-plan` with a coarse inventory.
9. Add first manual report attestation check, probably newcomer or QA synthesis.
10. Add release-candidate supervisor.
11. Add IPFS/deployable artifact smoke.
12. Add fresh-stack/restart consistency checks with explicit destructive opt-in.
13. Expand manual/LLM roster attestations.
14. Add known-gaps/staleness checks.
15. Decide scheduler/heartbeat policy.

## Open design decisions

These should be resolved as implementation proceeds:

- Should `validation.pr` treat child `error` as `error` or `uncertain`?
- What freshness window is required for each validation pass?
- Where should validation-pass report directories live under `workflow/reviews/`?
- Should manual attestation checks parse Markdown conventions or use a small JSON metadata file beside each report?
- Which slow checks are safe to schedule, and which should remain manual?
- What exact opt-in should destructive stack checks require before wiping local data?
