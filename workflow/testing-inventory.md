# Testing inventory

This is a quick map of the testing and verification layers that already exist in Commonality, plus the main gaps that still need attention. It is intended as an orientation aid before adding more tests or asking an LLM to do manual validation.

## Fast local feedback loops

Run these from the repository root:

- `npm run lint` — workspace linting, including Solidity checks via the Hardhat workspace.
- `npm run build` — workspace builds/type-checking through Turbo.
- `npm run test:fast` — the default cheap confidence loop: docs inventory, SDK tests, Hardhat tests, integration-test harness unit tests, and UI Vitest.
- `npm run test` — the fuller conventional suite: SDK, Hardhat, integration tests, and UI tests.
- `npm run verifier:fast` / `npm run verifier:report` — verifier-oriented PR/status loops.

The root `package.json` is the source of truth for exact script composition.

## Conventional automated tests by area

Approximate test-file inventory as of 2026-06-22, excluding generated `dist/` and `node_modules/`:

| Area | Main command(s) | Test files | What it mostly covers |
| --- | --- | ---: | --- |
| `hardhat` | `npm run hardhat:test` | 21 | Contract behavior, accounting, deadlines/refunds/withdrawals, security edge cases. |
| `sdk` | `npm run sdk:test` | 17 | Client-side folding, query/write helpers, event-cache behavior, SDK invariants. |
| `integration-tests` | `npm run integration-tests`, `npm run integration-tests:test:harness` | 27 | Local end-to-end contract + indexer + SDK flows, plus harness unit tests. |
| `ui` Vitest | `npm run test:vitest --workspace=ui` | 103 | React components/pages, domain route/link smoke, wallet/UI state, copy/affordance regressions. |
| `ui` Playwright | `npm run test:e2e --workspace=ui` | 13 specs | Browser journeys against local services, including cross-domain and IPFS-domain artifact smoke. |
| AI/service workspaces | workspace `test` scripts | 50+ combined | Service routes, fixture handling, prompt/evaluator helpers, config parsing, publisher/finder/nudger behavior. |
| `fake-data-generation` | seed regression scripts | 2 | Seed worker-output and implication-decision regression fixtures. |
| Docs inventory | `npm run check:docs-inventory` | script check | Required newcomer docs and key references. |

Most TypeScript workspaces also expose `typecheck`, `build`, and `lint` scripts for narrower debugging.

## Verifier coverage

The verifier workspace adds a retained, dashboard-oriented layer on top of conventional tests:

- 107 check definitions under `verifier/checks/`.
- 70 project-specific checker scripts under `verifier/checks/`.
- Facets: functionality, docs, product, security, plus verifier-health meta checks.
- Guarded deep checks for fresh seeded stacks, restart consistency, IPFS artifacts, deployed testnet, and mutating testnet canaries.
- Known-bad fixtures/checks that prove several verifier leaves reject intentionally bad inputs.
- Manual/LLM validation roster in `verifier/coverage/validation-roster.json` and launch-confidence coverage mapping in `verifier/coverage/testing-plan-items.json` (testing philosophy and validation-pass runbook in `verifier/DESIGN.md`).

Use `npm run verifier:tree`, `npm run verifier:report`, and `verifier/PLAN.md` when deciding which verifier gap to close next.

## What is already notably covered

- Contract-level accounting and boundary behavior is better covered than most UI workflows.
- SDK folding/idempotency and malformed event-cache handling have explicit tests/checks.
- UI has broad component/page coverage and a smaller number of Playwright journeys.
- Domain link/route smoke coverage exists, including deployable artifact/deep-link checks.
- Several AI-service helpers and deterministic fixtures are tested; some prompt-injection and malformed-output paths already exist.
- The verifier has explicit checks for docs coherence, product judgment, security/static analysis, report currency, liveness, flakiness, and deep-stack freshness.

## Main remaining testing gaps

These match the open backlog in `TODO.md` and `verifier/coverage/validation-roster.json`:

1. **Whole-product E2E depth:** `stack.user-journeys` exists, but at least one journey should assert strict rendered-value equality against indexer data, and the named newcomer donor / CSM movement-to-action journeys are still missing.
2. **Operations/degradation canaries:** there are focused negative-path tests, but deliberate end-to-end dependency-failure coverage across IPFS, indexer, RPC, platform API, and wrong-chain state remains thin.
3. **Uniform AI-service fixture harness:** individual services have tests, but there is not yet one consistent cross-service fixture harness that proves schema validity, publication shape, and downstream discoverability without live model calls.
4. **Rendered-product judgment:** some product LLM checks still judge source/docs rather than rendered pages or screenshots.
5. **Performance beyond bundle size:** real latency/throughput/page-interactivity probes against a running stack remain a known gap.
6. **Domain UI-state matrices:** LazyGiving, Aligning, Tally, Content Funding, Civility, CSM, and Conceptspace all have partial coverage; the remaining gaps are mostly end-user affordance/state matrices rather than core contract logic.

When adding new coverage, prefer extending the cheapest existing layer that proves the behavior before adding a new slow Playwright/verifier/LLM check.
