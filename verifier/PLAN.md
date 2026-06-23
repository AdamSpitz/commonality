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

That means most remaining verifier work is not about inventing the architecture. It is about making the strongest evidence **regular, live, and user-journey-shaped**. The biggest trust gap is still that the checks most directly proving "the product boots, writes, indexes, and reads back" are guarded/manual and do not yet have an installed cadence in the real CI/scheduler environment.

The backlog below is ordered by how much each item would move the "I actually believe it works" needle.

## P0 / P1 — Important remaining work

### 1. Install the deep end-to-end cadence in real infrastructure

**Why it matters:** this is the main difference between a well-designed verifier and a verifier that continuously proves launch readiness.

`npm run verifier:deep-cadence` now exists and opts into the guarded local deep checks:

- `stack.fresh-seeded`
- `stack.restart-consistency`
- `artifact.ipfs-domain-smoke`
- `stack.user-journeys`
- `operations.indexer-lag`
- rollups: `stack.deployment-depth`, `facet.functionality`

`npm run verifier:deep-cadence:full` also includes the testnet guarded checks.

**Remaining:** install one of these commands in the actual nightly/CI/scheduler environment, with logs/artifacts retained and a failure path someone will notice. Until this is deployed, `stack.deployment-depth` can only report stale/missing deep proof.

Acceptance criteria:
- A scheduled job runs the local deep cadence at least daily or weekly.
- Its environment has the required opt-ins and whatever local services/Docker/IPFS state it needs.
- Failures are visible outside the verifier state directory.
- `stack.deployment-depth` normally has a fresh passing local deep result on record.

### 2. Get live testnet proof into the same cadence

**Why it matters:** release-candidate confidence needs proof against deployed public endpoints, not just local stack simulation.

Remaining:
- Run all focused read-only `testnet.*` leaves live with `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` and the deployed/testnet env vars after config/runtime endpoint issues are fixed.
- Provision and fund the verifier wallet behind `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`.
- Run and retain `testnet.onchain-to-indexer` with mutation explicitly enabled.
- Run and retain `testnet.website-journeys` with browser journeys explicitly enabled.
- Ensure `testnet.environment` is part of the deep cadence in the deployment shell.

Acceptance criteria:
- `testnet.environment` has a recent passing result before any release-candidate claim.
- Mutating on-chain-to-indexer proof has run with a funded verifier wallet.
- Skipped-by-policy testnet checks are no longer the normal release-candidate state.

### 3. Strengthen end-to-end user journeys

**Why it matters:** the existing `stack.user-journeys` path proves some write → index → UI readback behavior, but launch confidence needs journeys that resemble actual first-use moments.

Remaining journeys to add:
- **Newcomer donor funding/attestation**: a user discovers a project/cause, funds or attests, and sees the consequence reflected back in the relevant UI.
- **Common Sense Majority movement-to-action**: a user starts from the CSM movement surface and reaches a concrete action, with indexed state/readback where applicable.

Also tighten assertions in the existing `tally`, `lazyGiving`, and `content-funding` projects so they assert domain-specific outcomes, not just that some generic UI rendered.

Acceptance criteria:
- `stack.user-journeys` covers the named journeys.
- Each journey includes at least one state-changing step, waits for the indexer where relevant, and asserts rendered user-facing evidence of the change.
- Failures include enough artifacts/log tails to debug without rerunning blindly.

### 4. Triage current dependency-audit findings

**Why it matters:** the check is wired and fixture-backed, but an untriaged audit finding is either a real security problem or verifier noise.

Remaining:
- For each current high/critical direct or production dependency finding, either upgrade/fix it or add a reviewed, narrow allowlist entry in `verifier/security-baselines/dependency-audit-allowlist.json`.
- Prefer structured allowlist entries (`package`, optional `severity`/`range`/`advisory`, plus `rationale` and `revisitWhen`); the check now matches those fields narrowly so future unrelated advisories still fail.

Acceptance criteria:
- `automated.dependency-audit` is green for reviewed reasons.
- Any allowlist entry names the advisory, affected package/range, review rationale, and expected revisit trigger.

### 5. Add service-specific AI-output checks when real services start seeing real data

**Why it matters:** the verifier has deterministic AI fixtures and an [`ai-service-watchlist.md`](./ai-service-watchlist.md), but production-ish AI services will fail in ways fixtures do not anticipate.

Remaining:
- Promote repeated watchlist observations into objective service-specific checks.
- Add fixture/regression coverage for prompt-injection, malformed citations, missing provenance, unsafe summaries, or stale source use as those failure modes become concrete.

Acceptance criteria:
- At least the first live AI service with real testnet/social data has a verifier leaf that checks its most important output contract.
- New checks are deterministic where possible; LLM judgment is reserved for bounded review of hard-to-formalize output quality.

## P2 — Make existing signals harder to fake

### 6. Upgrade indexer-lag from mined-block burst to real event-burst stress

`operations.indexer-lag` currently mines a guarded local block burst and verifies Ponder `_meta` catches up. That is useful, but it is not yet a realistic burst of indexed application events.

Remaining: once there is a compact, cheap fixture path, generate a burst of real relevant events and verify indexed application data catches up within budget.

### 7. Decide whether screenshot evidence belongs in normal product-review cadence

`review.landing-compelling` can capture desktop landing screenshots behind `COMMONALITY_VERIFIER_CAPTURE_LANDING_SCREENSHOTS=1`; rendered-copy snapshotting is already deterministic.

Remaining:
- Observe runtime/flakiness/cost on a few opt-in runs.
- If stable, make screenshots part of the normal cadence for landing/product LLM leaves.
- Consider extending rendered/screenshot evidence to page-local leaves (`review.page-copy-sense`, `review.page-usability`, `review.page-visual-appeal`, `review.page-mobile-usability`) only if the evidence improves decisions enough to justify cost.

### 8. Deepen security invariants as new objective properties emerge

The current security facet has Slither plus focused Hardhat invariant/regression coverage. Remaining work is not a known hole so much as ongoing hardening:

- Add contract-specific property tests when an invariant can be stated objectively.
- Add a compact known-bad fixture for `security.contract-invariants` if/when a broken-contract fixture can be kept small and cheap.

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
- Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes (SDK, Hardhat, integration stack, UI Vitest, Playwright). Run narrower commands first (`npm run sdk:test`, `npm run hardhat:test`, `npm run integration-tests`, `npm run ui:test`, or the failing package command) before rerunning the wrapper.
- Cheap reports are retained under `verifier/results/`; don't regenerate fresh ones unless they've gone stale or the surface meaningfully changed.
- Advisory LLM checks can be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here if it changes verifier-improvement priorities.
- Playwright: failed E2E runs used to hang by serving the HTML report. `ui/playwright.config.ts` should keep the HTML reporter at `open: 'never'`; if that regresses, run with `PLAYWRIGHT_HTML_OPEN=never` so the process exits and verifier waits don't stall.
