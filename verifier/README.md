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
- `artifact.ipfs-domain-smoke` — guarded IPFS-mode domain artifact Playwright smoke; requires `COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1` because Playwright global setup may clean/restart local E2E stack state.
- `stack.fresh-seeded` — guarded destructive local-stack smoke; requires `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1` before it will wipe local data.
- `stack.restart-consistency` — guarded local service restart smoke; requires `COMMONALITY_VERIFIER_ALLOW_RESTART=1` before it will restart services.
- `env.testnet-smoke` — guarded configured testnet/staging endpoint smoke; requires `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` plus endpoint env vars.
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
COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1 verifier-run --workspace verifier artifact.ipfs-domain-smoke
COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1 verifier-run --workspace verifier stack.fresh-seeded
COMMONALITY_VERIFIER_ALLOW_RESTART=1 verifier-run --workspace verifier stack.restart-consistency
COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1 \
  COMMONALITY_TESTNET_RPC_URL=https://... \
  COMMONALITY_TESTNET_GRAPHQL_URL=https://... \
  COMMONALITY_TESTNET_APP_URL=https://... \
  verifier-run --workspace verifier env.testnet-smoke
verifier-run --workspace verifier meta.liveness
verifier-run --workspace verifier root
```

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions. Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.
