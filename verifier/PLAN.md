# Verifier to-do list

This is the backlog for **improving the verifier itself** — making it a more trustworthy answer to:

> Would we feel confident telling the world "come use this"?

Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files under [`checks/`](./checks/). Keep this file focused on **unfinished work**; prune completed implementation notes instead of letting them accumulate.

## Two kinds of work — don't confuse them

This file tracks only the second of these:

1. **Getting the project ready to launch** — "does the thing actually work, is it compelling, are the docs coherent, is the on-chain surface sound?" **This is not enumerated here.** The verifier's own outputs are what drive it:
   - the `root` dashboard and the four facets (`facet.functionality`, `facet.docs`, `facet.product`, `facet.security`);
   - `coverage.readiness` → the generated `readiness.md` (what remains before release-candidate / full-launch, grouped by target tier);
   - the QA-synthesis report-attestation checks;
   - the advisory/gating LLM findings (docs coherence, landing compellingness, workflow clarity).

   The workflow is: run the relevant facet or report, read what it says, fix the *project*, rerun. The list of what's left lives in those reports, not in this file. To earn release-candidate or full-launch confidence, work down `readiness.md` and run the guarded prerequisites (`artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, `stack.restart-consistency`, `testnet.environment`) with their explicit opt-ins — see README "Useful commands".

2. **Improving the verifier** — making the checks more comprehensive, more trustworthy, cheaper, or better-faceted, so that when they go green you can actually believe them. That is the backlog below.

## Current state

The verifier is structurally mature. The faceted gating dashboard is live: `root` rolls up `facet.functionality`, `facet.docs`, `facet.product`, `facet.security`, and `meta.verifier-health`. The fast PR loop, docs broken-reference scan, dependency audit, Slither, contract-invariant leg, report currency, liveness/freshness, flakiness/degradation detection, coverage maps, exploration-mode LLM judgment leaves, and many `known-bad.*` verifier-of-verifier fixtures are all wired.

That means most remaining verifier work is not about inventing the architecture. It is about making the strongest evidence **regular, live, and user-journey-shaped**. The biggest trust gap is still that the checks most directly proving "the product boots, writes, indexes, and reads back" are guarded/manual and do not yet have an installed cadence.

A prerequisite for closing that gap: the **local Dockerized stack must actually run on this machine.** The stack is plain `docker-compose` (`docker-compose.yml`, `scripts/services.sh --start/--status`) — Hardhat/Anvil, IPFS, the Ponder indexer, the platform API, and the UI dev servers. It is expected to be runnable here, not only in some far-away CI environment. If it is currently broken, that is a bug to fix, not a condition to work around. The verifier's deep checks all depend on this stack, so an unbootable local stack silently hollows out the entire functionality facet.

The backlog below is ordered by how much each item would move the "I actually believe it works" needle.

`operations.local-stack-health` is now the cheap unguarded canary for the local Dockerized stack: it probes Hardhat RPC, indexer GraphQL, platform API health, and the UI shell, then rolls into `functionality.deep-stack` so a down stack is an explicit functionality failure rather than hidden behind guarded-check staleness.

Nightly local deep cadence is installed on this machine as a user cron job (2:15am daily) via `scripts/verifier-nightly-deep-cadence.sh`. It runs `npm run verifier:deep-cadence` under `flock`, logs to `verifier/logs/nightly-deep-cadence.log`, and emits a log tail to cron stderr on fail/error. The first successful manual run was on 2026-07-06: `stack.fresh-seeded`, `operations.local-stack-health`, `stack.restart-consistency`, `operations.indexer-lag`, `artifact.ipfs-domain-smoke`, `stack.user-journeys`, and `stack.deployment-depth` all passed; functionality rollups remained `uncertain` only because unrelated testnet/ops signals are intentionally not part of the local-only cadence.

## P0 / P1 — Important remaining work

### 1. Get live testnet proof into the same cadence

**Why it matters:** release-candidate confidence needs proof against deployed public endpoints, not just local stack simulation.

Progress: read-only deployed testnet smoke is live and retained. On 2026-07-06, `testnet.dns`, `testnet.http`, `testnet.rpc`, `testnet.indexer`, `testnet.app-shell`, `testnet.app-config`, `testnet.contracts`, and advisory `testnet.sponsored-gas` all passed against Base Sepolia/deployed public endpoints. The same live run exposed a real deployed-browser failure in `testnet.website-journeys`: LazyGiving `/\#/projects` renders but logs four 500 resource errors, so `testnet.environment` is now correctly red instead of silently relying on stale browser evidence. The nightly deep-cadence wrapper now sources `.env`/`.env.secrets`, maps `BASE_SEPOLIA_RPC_URL` to `COMMONALITY_TESTNET_RPC_URL`, runs `npm run verifier:deep-cadence -- --testnet --browser-testnet`, and refreshes `testnet.environment`, `functionality.deep-stack`, and `facet.functionality`. Mutating testnet proof is included automatically only when both `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` and `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY` are present, so routine cron cannot accidentally spend gas.

Remaining:
- Provision and fund the verifier wallet behind `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`.
- Enable `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the deployment shell once that wallet exists.
- Run and retain `testnet.onchain-to-indexer` with mutation explicitly enabled.
- Confirm `testnet.environment` turns from skipped-by-policy/uncertain to pass after the mutating proof is retained.

Acceptance criteria:
- `testnet.environment` has a recent passing result before any release-candidate claim.
- Mutating on-chain-to-indexer proof has run with a funded verifier wallet.
- Skipped-by-policy testnet checks are no longer the normal release-candidate state.

### 2. Strengthen end-to-end user journeys

**Why it matters:** the existing `stack.user-journeys` path proves some write → index → UI readback behavior, but launch confidence needs journeys that resemble actual first-use moments.

Remaining journeys to add:
- **Newcomer donor funding/attestation**: a user discovers a project/cause, funds or attests, and sees the consequence reflected back in the relevant UI.
- **Common Sense Majority movement-to-action**: a user starts from the CSM movement surface and reaches a concrete action, with indexed state/readback where applicable.

Also tighten assertions in the existing `tally`, `lazyGiving`, and `content-funding` projects so they assert domain-specific outcomes, not just that some generic UI rendered. (Done for `tally`: `browse-statements.spec.ts` previously navigated to `/browse` — not a real route — and only checked `page.url()` stayed on it, so it never actually verified `BrowseStatementsPage` rendered. It now drives the real `/statements` route and asserts the heading, the sort control, and a terminal domain state — empty-state or statement cards — so a 404/blank/stuck-spinner page can no longer pass. The other `tally`/`lazyGiving`/`content-funding` specs already assert domain outcomes — supporter counts, `Fan-created` chips, `Root`/`Leaf`/`Active`, `exceeds note balance`, etc.)

Acceptance criteria:
- `stack.user-journeys` covers the named journeys.
- Each journey includes at least one state-changing step, waits for the indexer where relevant, and asserts rendered user-facing evidence of the change.
- Failures include enough artifacts/log tails to debug without rerunning blindly.

### 3. Keep dependency-audit allowlist current

**Why it matters:** the check is wired and fixture-backed, and it is now green only because the current high/direct/production findings have reviewed, narrow allowlist entries.

Remaining:
- Revisit `verifier/security-baselines/dependency-audit-allowlist.json` whenever npm audit reports a new package/range/advisory, or when the Privy/wagmi/viem, Ponder/indexer, Vite, or Hardhat tooling stacks are upgraded.
- Remove allowlist entries as upstream fixes become safe to adopt; do not widen entries just to keep the check green.

Acceptance criteria:
- `automated.dependency-audit` stays green for reviewed reasons.
- Any new allowlist entry names the affected package/range, review rationale, and expected revisit trigger.

### 4. Add service-specific AI-output checks when real services start seeing real data

**Why it matters:** the verifier has deterministic AI fixtures and an [`ai-service-watchlist.md`](./ai-service-watchlist.md), but production-ish AI services will fail in ways fixtures do not anticipate.

Remaining:
- Promote repeated watchlist observations into objective service-specific checks.
- Add fixture/regression coverage for prompt-injection, malformed citations, missing provenance, unsafe summaries, or stale source use as those failure modes become concrete.

Acceptance criteria:
- At least the first live AI service with real testnet/social data has a verifier leaf that checks its most important output contract.
- New checks are deterministic where possible; LLM judgment is reserved for bounded review of hard-to-formalize output quality.

## P2 — Make existing signals harder to fake

### 5. Upgrade indexer-lag from mined-block burst to real event-burst stress

`operations.indexer-lag` mines a guarded local block burst and verifies Ponder `_meta` catches up. The check now also supports an optional **data canary** (`params.dataCanary`: a GraphQL query + dot-path + minimum increase): when configured, the check requires a numeric indexed application value to actually advance, so an indexer that reports a caught-up `_meta` block without having processed the burst's events can no longer pass. The `known-bad.indexer-lag` fixture covers both the block-lag-only contract and the new canary path, including a "block advances but data stuck" case. This closes the harder-to-fake half of the item.

Progress: `operations.indexer-lag` now accepts an optional `params.eventBurstCommand` (argv array) that runs before the mined block burst, so the real check can use a compact SDK/raw-contract helper to emit indexed events without hard-coding project writes into the generic lag probe.

Remaining: the canary only proves something when the burst produces real indexed events. Once there is a compact, cheap fixture path to emit a burst of real relevant events against the local stack (SDK write helper or raw contract calls), wire that helper via `eventBurstCommand` and wire a real canary query into `operations.indexer-lag.def.json` so the data-advance check runs in the real deep cadence, not only under the mock fixture.

### 6. Decide whether screenshot evidence belongs in normal product-review cadence

`review.landing-compelling` can capture desktop landing screenshots behind `COMMONALITY_VERIFIER_CAPTURE_LANDING_SCREENSHOTS=1`; rendered-copy snapshotting is already deterministic.

Remaining:
- Observe runtime/flakiness/cost on a few opt-in runs.
- If stable, make screenshots part of the normal cadence for landing/product LLM leaves.
- Consider extending rendered/screenshot evidence to page-local leaves (`review.page-copy-sense`, `review.page-usability`, `review.page-visual-appeal`, `review.page-mobile-usability`) only if the evidence improves decisions enough to justify cost.

### 7. Deepen security invariants as new objective properties emerge

The current security facet has Slither plus focused Hardhat invariant/regression coverage. Remaining work is not a known hole so much as ongoing hardening:

- Add contract-specific property tests when an invariant can be stated objectively.
- Add a compact known-bad fixture for `security.contract-invariants` if/when a broken-contract fixture can be kept small and cheap.

### 8. Gate on every signal the static scans already collect

`operations.performance-source-canary` already scanned for synchronous `localStorage`/`sessionStorage` access in page/component render paths, but only the oversized-file finding could fail the check — the render-risk finding was rendered into the report artifact yet never gated, so a real render-blocking footgun could hide behind a green result.

Done: the check now fails on either oversized source files *or* synchronous storage-in-render findings, and `known-bad.performance-source-canary` proves all three paths (clean pass, oversized-file fail, synchronous-storage fail) without depending on the real UI source tree. The fixture is wired into `meta.verifier-health`.

Remaining: when another static scan grows a new finding column, gate on it from the start rather than reporting it advisory-only. `operations.performance-source-canary` now mirrors the `allowLargeFiles` pattern for synchronous-storage findings with `allowSynchronousStorageFiles`, so known-acceptable exceptions stay explicit while new render-risk storage reads still fail.

## P3 — Tuning and trust-over-time follow-ups

These are useful, but should not distract from the P0/P1 cadence and journey work.

- **Report currency push model:** `meta.report-currency` is useful but pull/advisory. Consider harness support for file-input content-change triggers or a git-surface trigger so currency becomes push-driven.
- **Freshness-window tuning:** root/facet/meta supervisors use explicit windows (mostly 7 days; 30 days for expensive meta LLM reviews). Tune per check/role once real cadence data exists.
- **Flakiness trend math:** current slow-degradation detection compares early-half vs recent-half mean duration. Revisit with a more robust slope/percentile method only if real drift observations make the simple method noisy.
- **Authoritative LLM file-read audit:** exploration-mode leaves write self-reported `files-read.md`. If that becomes important evidence, capture actual read-tool calls from a pi session export instead of trusting the model envelope.
- **Meta LLM noise threshold:** keep tuning `meta.llm-check-review` and `meta.llm-to-automated-candidates` so significant verifier-improvement findings gate, while low-severity nice-to-haves remain visible without blocking green.
- **Roster/source-of-truth ergonomics:** revisit `coverage.validation-roster` JSON+Markdown and `coverage.domains` source-of-truth choices only if maintaining them becomes painful.

## Operating notes for agents

- Do not treat this file as the launch punch list. For launch/product issues, run the relevant verifier facet or read `readiness.md`.
- Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes (SDK, Hardhat, integration stack, UI Vitest, Playwright). Run narrower verifier checks first (`verifier-run automated.test-full-sdk`, `verifier-run automated.test-full-hardhat`, `verifier-run automated.test-full-integration`, `verifier-run automated.test-full-ui`, or the failing package command) before rerunning the wrapper.
- Cheap reports are retained under `verifier/results/`; don't regenerate fresh ones unless they've gone stale or the surface meaningfully changed.
- Advisory LLM checks can be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here if it changes verifier-improvement priorities.
- Playwright: failed E2E runs used to hang by serving the HTML report. `ui/playwright.config.ts` should keep the HTML reporter at `open: 'never'`; if that regresses, run with `PLAYWRIGHT_HTML_OPEN=never` so the process exits and verifier waits don't stall.
