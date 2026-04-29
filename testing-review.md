# Testing Review

## Overview

The test suite is reasonably broad — ~290+ tests across five levels — but has significant performance problems and some reliability gaps that would block a confident "ready for testnet" verdict. The two core issues are:

1. **Speed**: The full suite takes many minutes and requires Docker startup every run. Most of that time is infrastructure, not actual test logic. The test pyramid is inverted in places.
2. **Reliability**: Several areas are undertested or have known fragility. A high-level LLM doing a testnet readiness check gets stuck because some real flows are broken or partially broken.

---

## What We Have

| Level | Tool | Count | Location |
|-------|------|-------|----------|
| Smart contract unit tests | Hardhat/Chai | ~524 cases, 6,741 lines | `hardhat/test/` (15 files) |
| SDK unit tests | Mocha | ~14 tests | `sdk/src/**/*.test.ts` |
| UI component tests | Vitest + RTL | ~94 tests | `ui/src/**/*.test.tsx` |
| Integration tests | Mocha + Docker | ~54 tests | `integration-tests/src/` |
| E2E browser tests | Playwright | ~10 tests | `ui/e2e/` |

The hardhat tests are by far the largest investment: 524 cases, covering Beliefs, Implications, ContentFunding, DelegatableNotes, AssuranceContracts, TrustRegistry, and others. That's genuinely good coverage of on-chain logic.

---

## Performance Problems

### The full `npm test` pipeline

Running everything sequentially:
1. SDK tests (Mocha) — fast, maybe 10–30s
2. Hardhat tests — moderate, maybe 2–5 min (524 cases)
3. Integration tests — slow: Docker spin-up + indexer readiness polling (90s max) + test execution
4. UI tests — runs Vitest (fast) then Playwright (slow, serial, 120s timeout per test)

Total: easily 10–20+ minutes. That's too slow for a feedback loop.

### Root causes

**Integration tests run at too high a level for what they're testing.** Many integration tests likely check things that could be verified with just the SDK + a local hardhat node (no Docker indexer needed). The integration test suite starts all of: hardhat-node, hardhat-deploy, IPFS, indexer, and platform-api-service. If a test only needs the SDK and chain state, spinning up all that infrastructure is waste.

**Playwright is serial by design.** `workers: 1, fullyParallel: false` because tests share blockchain state. This is architecturally correct given the current setup, but it means 10 tests at 120s each = 20 minutes worst case.

**Indexer wait is the main bottleneck.** The integration test script polls for the indexer at `localhost:42069/graphql` up to 90 times (3 minutes). This wait dominates everything. The Playwright global setup does the same thing.

**The SDK build runs before every integration test run.** `npm run build --filter=@commonality/sdk` is called in `run-integration-tests.sh`. Fine for CI, slow when iterating locally if the SDK hasn't changed.

### What to do about speed (prioritized)

1. **Separate "fast" and "slow" test commands.** Right now `npm test` runs everything. Add `npm run test:fast` that runs only Vitest + Hardhat (no Docker). This would give a sub-5-minute loop for the common case.

2. **Audit integration tests for level correctness.** The question for each integration test: does it actually need the indexer/GraphQL? If it only needs the contract + SDK, it could run against a local hardhat node with no Docker overhead. Move those tests to a lighter harness.

3. **Reduce the indexer wait.** 3 minutes is the worst-case ceiling but also what happens on a cold start. Building the Docker images incrementally (which the script already does via `docker-build-plan.mjs`) helps. But consider whether the indexer startup can be made faster, or whether some tests can use the contract directly instead of waiting for indexing.

4. **Playwright test fixtures over serial ordering.** If the E2E tests used isolated accounts/nonces rather than relying on cumulative blockchain state, some tests could run in parallel. This is a bigger refactor but would cut E2E time significantly.

---

## Thoroughness Problems

### Known broken things (from big-test.md and CONTINUITY.md)

- Creator display names show raw UIDs/channel IDs (`@111111111`, `UCaaaaaa...`) instead of human-readable handles. The bug is documented but unfixed.
- Funding portal cause leaderboard says "No contributions yet" even with aligned projects funded. Unclear if intentional.
- Statement discovery only works once a user has believed/disbelieved a statement (no `StatementCreated` event). This is by design but means a fresh chain shows empty state and may confuse a testnet reviewer.
- `VITE_EVENT_CACHE_URL` is baked in at IPFS build time and currently hardcoded to `localhost:42069`. Testnet deploy would need this fixed.

### Gaps in the automated tests

**AI services (attesters/finders/nudgers) are nearly untested.** There are 4–7 test files total across 7+ packages, mostly testing HTTP infrastructure and rate limiting — not the actual AI logic or end-to-end attester flows. The TODO explicitly notes "I want to do more testing on the whole ecosystem of attesters and finders and nudgers."

**Fake-data seeding** has only 2 tests (added recently after issues were found). The seeder is complex and was generating broken IPFS metadata; more coverage here would pay off.

**No smoke test for the deployed stack.** There's no quick "is everything up and the basic flows work?" script. A high-level LLM trying to do testnet validation has to discover the stack's health organically, which means discovering bugs rather than a checklist passing first.

**E2E test count is thin.** 10 Playwright tests for the following flows: belief expression, browse statements, content funding flow, delegation flow, pubstarter flow, statement creation (two variants), subjectiv flow, user profile, and wallet connection. That's reasonable coverage of happy paths but there's almost nothing testing error states, empty states, or edge cases.

**No test for the "is this ready to deploy" scenario specifically.** The big-test.md report is a one-off manual run by an LLM. It found real bugs. We should have an automated pass that catches those classes of issues.

---

## Structural Observations

**Four different test frameworks** (Hardhat/Chai, Mocha, Vitest, Playwright) is unavoidable given the stack, but it means test infrastructure knowledge is spread thin. Each package has its own `.mocharc.json` with varying timeouts (5s for SDK, 30s for integration). That's fine but worth documenting.

**The pre-commit hook runs the full test suite** (`npm run lint && npm run build && npm test`). With a 10–20 minute suite, that's punishing. Once `test:fast` exists, the hook should use that instead and leave the full suite for CI.

**Coverage is not measured anywhere.** `@vitest/coverage-v8` is installed but not wired up. No thresholds, no reports. We have no idea what percentage of UI or SDK code is covered.

**Docker image incremental builds** are handled by `docker-build-plan.mjs` which checksums declared build inputs. That's smart — it avoids unnecessary rebuilds. But it's only as good as the declared input list. If the list is wrong, stale images run silently.

---

## Priorities

### For "ready to deploy" confidence

1. **Fix the known UI bugs** (creator names, leaderboard semantics) before any testnet reviewer pass. A reviewer hitting those issues on the first screen will lose confidence in the whole system.

2. **Write a "pre-testnet smoke test" script** — a short Playwright or CLI script that starts the stack, runs through the 5–6 core flows (browse statements, create a statement/belief, browse projects, fund a project, delegation), and verifies no console errors and expected data appears. This is the "go/no-go" checkpoint before a human or LLM does a full review.

3. **Add at least a few negative-path E2E tests.** What happens if you try to fund with insufficient funds? What if you navigate to a nonexistent statement?

### For performance

4. **Create `npm run test:fast`** = Vitest + Hardhat only (no Docker). Use this in the pre-commit hook.

5. **Audit integration tests** for which ones truly need the indexer vs. just the chain. Move chain-only tests to a lighter harness.

6. **Consider reducing `npm test` in the pre-commit hook** to `test:fast` and running the full suite only on CI pushes.

### For long-term health

7. **Enable coverage reporting** in Vitest with a minimum threshold.

8. **Add integration-level tests for the attester/finder/nudger flows.** Even a synthetic test that runs the attester with fake inputs and checks outputs would catch regressions.

9. **Document the test strategy** in AGENTS.md or a TESTING.md: which level tests what, how to run subsets, what the expected times are.
