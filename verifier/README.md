# Commonality verifier workspace

This directory is the project-specific workspace for the external `verifier` harness.

See the `using-verifier` AI skill for the harness model and [`PLAN.md`](./PLAN.md) for the incremental build-out plan.

## Current checks

- `automated.lint` — runs `npm run lint`.
- `automated.build` — runs `npm run build`.
- `automated.test-fast` — runs `npm run test:fast`.
- `automated.test-full` — runs `npm run test`.
- `automated.seed-implication-regression` — runs `npm run test:seed:implication-regression --workspace=fake-data-generation`.
- `validation.pr` — PR/change-local validation rollup over lint, build, fast tests, and fresh seed implication regression results when available.
- `coverage.testing-plan` — verifies that the big testing plan's major sections are represented in `coverage/testing-plan-items.json`.
- `review.*` report-attestation checks — verify that manual/LLM validation reports exist, are fresh, include the required sections, and do not name unresolved blocker findings.
- `meta.liveness` — watchdog for silent or overdue verifier checks.
- `root` — top-level rollup/dashboard over validation passes and meta checks.

## Useful commands

```sh
verifier-run --workspace verifier automated.lint
verifier-run --workspace verifier automated.build
verifier-run --workspace verifier automated.test-fast
verifier-run --workspace verifier automated.test-full
verifier-run --workspace verifier automated.seed-implication-regression
verifier-run --workspace verifier validation.pr
verifier-run --workspace verifier coverage.testing-plan
verifier-run --workspace verifier review.newcomer.touched-surface
verifier-run --workspace verifier review.real-ui.touched-domain
verifier-run --workspace verifier review.security.contracts
verifier-run --workspace verifier review.demo-dry-run
verifier-run --workspace verifier review.qa-synthesis.release-candidate
verifier-run --workspace verifier review.qa-synthesis.full-launch
verifier-run --workspace verifier meta.liveness
verifier-run --workspace verifier root
```

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions. Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.
