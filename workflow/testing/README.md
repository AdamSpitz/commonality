# Big Test Plan

Goal: answer the founder's question: **would I feel confident telling the world "come see this, it's ready to be used"?**

This plan is intentionally organized as nested checklists. Use the smallest checklist that matches the moment, and record what was skipped. The operational verifier workspace in [`/verifier`](/verifier/README.md) mirrors this hierarchy as checks and validation-pass supervisors.

Verifier commands:

- `npm run verifier:report` prints the latest top-level dashboard result without running a new pass.
- `npm run verifier:root` refreshes the dashboard from latest stored child results.
- `npm run verifier:pr`, `npm run verifier:light-confidence`, `npm run verifier:release-candidate`, and `npm run verifier:full-launch` force the corresponding validation-pass supervisor.
- `verifier-run --workspace verifier <checkId>` forces any individual check.
- `npm run verifier:run` starts the due-only scheduler; by policy, only cheap liveness/coverage checks are automatic right now.

## Test-suite cost guardrails

Good automated coverage is worth having, but do not turn the slow suite into an exhaustive browser-click matrix.

- Prefer the cheapest layer that proves the behavior: pure/unit tests, contract tests, SDK/indexer integration tests, then Playwright only when browser + wallet + backend integration matters.
- Add assertions to an existing full-stack flow when possible; starting another fresh Playwright scenario is usually more expensive than checking one more outcome inside a flow that already paid the setup cost.
- Keep full-stack restart/persistence coverage as a few representative canaries, not one clone per domain or feature.
- Keep deployable-artifact/IPFS-domain smoke in the full/slow suite; dev-server tests do not cover that failure mode.
- Use fixture/golden tests for AI-service automation. Do not put live model calls in the fast or default full suite unless the run is explicitly intended to spend that money.
- If a checklist item is objective but expensive to automate end-to-end, automate a representative slice and leave broader judgment to the manual/LLM validation pass.

## 0. Which validation pass are we running?

### 0.1 PR / change-local pass

Run on ordinary implementation work. Verifier command: `npm run verifier:pr` after refreshing the relevant child checks, or force an individual wrapper such as `verifier-run --workspace verifier automated.lint`.

- [ ] `npm run lint` when lintable code changed.
- [ ] `npm run build` or narrower typecheck/build for the touched package.
- [ ] Relevant unit tests for changed code.
- [ ] Relevant e2e specs if a user flow changed.
- [ ] If contracts/indexing/routing/seed data/domain manifests changed, explicitly name the extra check in the PR/commit notes.

### 0.2 Light confidence pass

Run before a notable demo/change, or when something feels off. Verifier command: `npm run verifier:light-confidence` after writing/refreshing the relevant manual-validation reports under `workflow/reviews/manual-validation/`.

- [ ] PR / change-local pass.
- [ ] Demo dry-run on the touched surface: can an outsider understand the problem, approach, and working product?
- [ ] One cold-start newcomer test on the touched surface.
- [ ] One adversarial real-UI user test on the touched domain(s).
- [ ] Smart-contract security review for any touched contracts.

### 0.3 Release-candidate / testnet-ready pass

Run before a testnet deployment or comparable milestone. Verifier command: `npm run verifier:release-candidate` after forcing any guarded prerequisites you intend to claim, such as `automated.test-full`, `artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, and `stack.restart-consistency`.

- [ ] Full automated suite.
- [ ] IPFS/domain Playwright smoke against deployable artifacts.
- [ ] Fresh local stack seeded with demo data.
- [ ] Restart self-consistency check after representative mutations.
- [ ] Most relevant half of the manual validation roster in [manual-tests/README.md](./manual-tests/README.md).
- [ ] Final report lists skipped roles/environments explicitly.

### 0.4 Full launch pass

Run before a real launch milestone. Verifier command: `npm run verifier:full-launch` after release-candidate confidence, configured testnet smoke, and final QA synthesis are current.

- [ ] Full automated suite.
- [ ] All validation environments in §2.
- [ ] Entire manual validation roster in [manual-tests/README.md](./manual-tests/README.md).
- [ ] QA-lead synthesis report with launch recommendation.

## 1. Automated test checklist

See [developer docs](/workflow/roles/developer.md#feedback-loops-aka-tests) for exact commands.

### 1.1 Always-green feedback loops

- [ ] **Lint:** `npm run lint` — style/static checks; expected pre-commit.
- [ ] **Build/typecheck:** `npm run build` — all packages compile; expected pre-commit.
- [ ] **Fast suite:** `npm run test:fast` — SDK unit, Hardhat contract tests, integration harness unit tests, UI Vitest; expected on every commit to `dev`.
- [ ] **Full suite:** `npm run test` — fast suite + integration tests + UI Playwright e2e; expected before merging to `master`.
- [ ] **Seed regression:** `npm run test:seed:implication-regression --workspace=fake-data-generation` after editing curated seed statements/variants.

### 1.2 Component coverage checklist

#### Smart contracts

- [ ] Contract unit tests in `hardhat/test/` cover happy paths.
- [ ] Refund correctness.
- [ ] Exact goal boundaries.
- [ ] Deadline boundaries.
- [ ] Reentrancy guards.
- [ ] Access control.
- [ ] ERC-1155 token math.
- [ ] Secondary-market settlement.
- [ ] Delegation-chain authority and revocation.

#### SDK / data aggregation

- [ ] Attestation reads and writes.
- [ ] Implication-derived support.
- [ ] Nudges.
- [ ] Alignment filtering.
- [ ] Trusted-set configurations: empty, corrupted, conflicting, and very large datasets.

#### Indexer / chain integration

- [ ] Replay from block zero.
- [ ] Restart/resume.
- [ ] Duplicate event handling.
- [ ] Chain reset detection.
- [ ] Local re-org/fork simulation if feasible.
- [ ] Cross-domain money/data flow persists correctly after restart.

#### UI unit/integration tests

- [ ] Each route has Vitest or Playwright coverage; detailed inventory lives in [`/ui/test-plan.md`](/ui/test-plan.md).
- [ ] Each domain manifest has smoke coverage.
- [ ] Shared shell/nav/footer behavior is covered.
- [ ] Accessibility landmarks and role-based interactions are covered.

#### UI e2e tests

Use Playwright for user-critical flows and integration canaries. Avoid expanding this into every UI-state permutation; cover matrices with Vitest, SDK/integration, or Hardhat tests where possible.

- [ ] Statement browsing/creation/signing.
- [ ] Wallet connection/disconnection.
- [ ] User profile rendering.
- [ ] LazyGiving project create/fund/refund/withdraw flows.
- [ ] Delegation deposit/delegate/spend/revoke/reclaim flows.
- [ ] Content Funding creator verification, claim/control, supporter purchase, escrow withdrawal.
- [ ] Negative paths and validation errors.
- [ ] Per-domain smoke for all eight domains.
- [ ] IPFS/hash-router production artifacts from `npm run build:ipfs:domains` served through local gateway.

#### AI services / generated data

- [ ] Implication attester adversarial corpus.
- [ ] Content attester adversarial corpus.
- [ ] Implication/content finders budget/flooding corpus.
- [ ] Nudger output sanity and manipulation checks.
- [ ] Bridge creator and explorer curator snapshots.
- [ ] Beat agent behavior snapshots.
- [ ] Platform API identity mapping fixtures.
- [ ] Golden tests avoid live model calls on every commit unless explicitly intended.

#### Operations / degradation automation

- [ ] IPFS unavailable or malformed metadata.
- [ ] Lagging/empty indexer.
- [ ] Platform API unavailable.
- [ ] RPC failure/slow response.
- [ ] AI service returns malformed/hostile output.
- [ ] Wallet on wrong chain.

## 2. Environment checklist

A release-quality report must say which environments were covered.

- [ ] **Unit/in-memory:** fast regressions — `npm run test:fast`, targeted package tests.
- [ ] **Fresh local stack:** `./scripts/data.sh --wipe`; `./scripts/services.sh --start`; `./scripts/data.sh --seed=demo`; Playwright + manual roles.
- [ ] **Restarted local stack:** stop/start after mutations; verify balances, attestations, support counts, profiles, project views, creator dashboards.
- [ ] **IPFS domain artifacts:** local gateway stable `*.localhost:8088` URLs; deep links and refreshes.
- [ ] **Testnet staging:** real RPC/hosted services/real wallets; deployment checklist; smoke funding/signing/attesting with small test funds; Render/log monitoring.

## 3. Manual / LLM-driven validation checklist

The detailed role prompts are in [manual-tests/README.md](./manual-tests/README.md). At this level, make sure the roster includes:

- [ ] Per-domain validation for all eight domains.
- [ ] End-user persona simulations.
- [ ] Cold-start newcomer tests: developer-side and user-side.
- [ ] Documentation audit.
- [ ] Layer-2 AI-service validation.
- [ ] Layer-3 AI-skill validation, if any user-facing skills exist.
- [ ] Cross-domain integration / dirty-world longitudinal test.
- [ ] Smart-contract security review.
- [ ] Demo dry-run / whole-system narrative test.
- [ ] Operations / chaos test.
- [ ] QA-lead synthesis, run last.

## 4. Cross-cutting risks checklist

A Full pass is not complete unless some role owns each concern:

- [ ] **Incentive / mechanism-design attacks:** money, voting, reputation, ranking, assurance contracts, support counts, retroactive funding, attester trust.
- [ ] **Trust & safety / adversarial input:** prompt injection, abusive content, malicious metadata, hostile AI-service output.
- [ ] **Long-term data integrity:** on-chain/indexed history, re-orgs, indexer drift, migrations, restart consistency.
- [ ] **Accessibility & cognitive load:** especially non-expert and non-crypto users.
- [ ] **Operations / degradation / chaos:** dependency slow/down/wrong; fail loudly and safely.
- [ ] **Hostile-analyst narrative review:** skeptical reviewer tries to puncture the story, not just click the happy path.

## 5. Known automated-test gaps to keep filling

Keep filling these with the cheapest useful test type; only promote to Playwright when lower-level tests cannot catch the failure.

- [ ] Wrong-domain deployable-artifact routes either work intentionally or fail with a clear not-found state.
- [ ] Deeper smart-contract edge-case tests listed in §1.2.
- [ ] Indexer correctness over time: replay, resume, duplicates, reset, re-org simulation.
- [ ] SDK aggregation edge cases for trust/alignment/implication data.
- [ ] AI-service golden/adversarial corpora that do not require live model calls in ordinary runs.
- [ ] Representative operations/degradation smoke tests for IPFS, indexer, platform API, RPC, and wrong-chain behavior.
