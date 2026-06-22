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

The faceted gating dashboard is live and documented in [`README.md`](./README.md): `root` rolls up `facet.functionality`, `facet.docs`, `facet.product`, `facet.security`, and `meta.verifier-health`. The standing product LLM-judgment leaves (`review.docs-coherence`, `review.landing-compelling`, and the `review.workflow-clarity*` workflow targets) are **gating** via finding severity. The old confidence-tier supervisors were retired; `validation.pr` survives as the fast functionality loop. The two `meta.*` LLM leaves (`meta.llm-check-review`, `meta.llm-to-automated-candidates`) are gating inside `meta.verifier-health` when they find significant unresolved verifier improvements.

The meta LLM leaves can make `meta.verifier-health` non-green when they identify significant unresolved verifier improvements; don't rerun them blindly — triage one small finding at a time, and prefer adding a deterministic test/check over leaving the burden on the model. The two `meta.*` leaves' standing suggestions are folded into the backlog below; the product leaves' findings surface through their facets (category 1).

## Backlog — improving the verifier

Honest read of where the workspace stands (June 2026): the *architecture* is unusually mature — real automated backing (lint/build/tests, SDK replay/idempotency canaries, seed regression, AI-fixture prompt-injection harnesses, UI degradation canaries), a well-guarded LLM-judgment layer where gating is derived from finding severity rather than the model's self-report, a genuine verifier-of-verifier layer (`known-bad.*` fixtures that prove each check rejects bad input), coverage/drift maps, and a meta layer. That is the skeleton of a real QA org, and the fact that `root` is honestly red right now (dangling doc refs, dormant deep checks) is itself evidence the thing is working rather than rubber-stamping.

But the checks that would most directly justify telling the world "come use this" are the ones we have least of: nothing actually *drives the running product end-to-end*. The backlog below is ordered by how much each item would move the "I actually believe it works" needle.

### P1 — Prove the whole thing boots and reads back correctly

- **The deep boot signal runs on no cadence.** `stack.fresh-seeded`, `stack.restart-consistency`, `artifact.ipfs-domain-smoke`, and `testnet.environment` are the checks that actually boot the stack and hit real endpoints — and in normal operation they never run (manual + opt-in env). The visibility/freshness gate is solved: `stack.deployment-depth` reads the deep checks' retained history, reports "last end-to-end boot: N days ago", and ages `facet.functionality` toward yellow when that proof is stale (>7d) or never happened (backed by `known-bad.deployment-depth`).
  - **Remaining: the cadence itself.** Still need a scheduled/CI path (e.g. nightly) that actually *runs* the deep checks with their opt-ins (`COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1`, `COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1`, etc.) so `stack.deployment-depth` can flip green. That is infra outside this repo's check graph — wire it where the scheduler lives, and have it drive `stack.user-journeys` alongside the other deep checks.
  - **Remaining live testnet proof:** fold the funded-wallet/guarded deployed-environment follow-ups into that cadence instead of tracking them in a separate scratch file: (1) make the full harness graph validation runnable from the documented verifier commands in the deployment shell, (2) rerun all focused `testnet.*` leaves live with `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` and `COMMONALITY_TESTNET_RPC_URL` after the deployed config/runtime endpoints are fixed, (3) provision and fund the verifier wallet behind `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`, (4) run the mutating `testnet.onchain-to-indexer` canary live and retain the result, and (5) extend `testnet.website-journeys` into wallet-backed/domain-specific user paths once the wallet is available.
- **End-to-end round-trip E2E is wired (`stack.user-journeys`) but assertions are weak.** The UI Playwright journey projects (`tally`, `lazyGiving`, `content-funding`) write on-chain via the SDK, wait for the Ponder indexer, then assert the rendered UI — the full round-trip — and now run as a guarded (`COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1`), manual, release-candidate check under `facet.functionality`. Remaining: (a) strengthen at least one journey from *presence* assertions to strict *value-equality* — read a rendered value and assert it equals the same field fetched directly from indexer GraphQL, so it catches wrong-but-present values; (b) add the two named-but-missing journeys (newcomer donor funding/attestation, CSM movement-to-action).

**AI-service watchlist is documented.** [`ai-service-watchlist.md`](./ai-service-watchlist.md) captures what to watch as real AI services start processing real testnet/social data, and the manual validation roster points to it. Remaining verifier-improvement work from that list belongs in existing backlog items: the uniform AI-service fixture harness, AI-output automation candidates, and service-specific checks promoted when repeated observations become objective.

**Report currency is solved (`meta.report-currency`).** Remaining follow-ups worth considering: (a) feed the model a rough cost/tier per check so rerun recommendations weight expensive checks; (b) let Layer A consume the verdict to auto-mark a check `uncertain` in facet rollups rather than only reporting it; (c) upstream harness generalization — extend `onInputChange` to fire on `file`-input content change, or add a `git-surface` trigger, so currency becomes push-driven.

### P2 — Make the existing signals less fakeable / more real

- **Performance is only bundle size.** `operations.performance-budget` checks client asset size; `testing-plan.md` names performance acceptability as a launch dimension but nothing measures real latency/throughput against the running stack (API p95, indexer lag under a burst of events, page TTI). Add a cheap but *real* latency probe against the seeded stack rather than leaving perf as a pure known-gap.
- **Product LLM leaves judge source, not the rendered product.** `review.landing-compelling` and `review.docs-coherence` read files; "is the landing page compelling" really wants the rendered page/screenshots. Feed rendered HTML and/or Playwright screenshots into the product judgment leaves so they assess what a visitor actually sees.
- **`review.docs-coherence` produces false positives because its surface is markdown-only** (found in the 2026-06-12 project-wide review). The 2026-06-11 run flagged `verifier:state` as a "stale script name" (high) and `.env.secrets.example` as non-existent (medium) — both have existed in the repo since early June, but the check can't see `package.json` or the file tree, so the LLM infers staleness from cross-doc inconsistency and guesses wrong. Fix mechanically, not by prompt: pre-verify `npm run <script>` references against root/workspace `package.json` scripts and stat file paths referenced in docs (the same way `checkBrokenRefs` already verifies markdown links), and feed the verified facts into the prompt so the LLM only judges genuine incoherence. (The real residue of those findings — `verifier:state` being undocumented in the READMEs it appears next to — is a docs fix, not a check fix.)

- **No dependency-audit signal** (found in the 2026-06-12 project-wide review tech-debt chunk). `npm audit` currently reports 2 critical / 15 high (mostly dev-server-facing: vitest UI server, vite path traversal, react-router-dom, shell-quote), and nothing in the verifier would ever surface it. Add a cheap deterministic `automated.dependency-audit` leaf: run `npm audit --json`, gate on critical/high in *direct or production* deps, record the rest. Needs an allowlist mechanism for known semver-range artifacts (e.g. ponder's bogus "fix at 0.0.1" suggestion).

### P3 — Trust the green more over time

- **Security facet rests on too few legs.** `review.security.slither` is wired as a deterministic automated leaf under `facet.security` (gating derived from detector impact: `High` → red, `Medium` → yellow, lower recorded but green; `uncertain` — never a silent pass — when the tool is missing/times out/emits unparseable output; backed by `known-bad.security-slither`). The 2 Medium findings are now resolved: the `unused-return` was in a test-only attack helper (`contracts/test/`, now excluded via `filter_paths` since it is never deployed), and the `incorrect-equality` in `DelegatableNotes._consumeExactPaymentNotes` was a false positive (the prior `-=` reverts on underflow under Solidity 0.8, so `remainingAmount == 0` is an exact ledger comparison, not a manipulable balance snapshot — suppressed inline with rationale). Slither is green. **Remaining:** add contract access-control / invariant property tests surfaced as their own leaf, so security isn't resting on a single subjective report plus one static analyzer.
- **Flakiness is solved (`meta.flakiness`)** for pass↔fail flips. Remaining follow-up: slow-degradation/latency-trend detection (gradual drift, not just binary flips) is still open.
- **Generalize freshness.** The 7-day window for functionality deep children is good but ad hoc. Give every gating leaf an explicit evidence-age model so the dashboard consistently ages stale green toward yellow rather than showing confidently-green stale results.

New items also come from `meta.llm-to-automated-candidates` advisory findings or triage of `meta.verifier-health` non-green states.

## Operating notes for agents

- Avoid repeated expensive full runs while debugging. `automated.test-full` takes several minutes (SDK, Hardhat, integration stack, UI Vitest, Playwright). Run narrower commands first (`npm run sdk:test`, `npm run hardhat:test`, `npm run integration-tests`, `npm run ui:test`, or the failing package command) before rerunning the wrapper.
- Cheap reports are retained under `verifier/results/`; don't regenerate fresh ones unless they've gone stale or the surface meaningfully changed.
- Advisory LLM checks can be slow/noisy and may depend on model/router credentials; use explicit model env overrides only when needed and record the result here.
- Playwright: failed E2E runs used to hang by serving the HTML report. `ui/playwright.config.ts` should keep the HTML reporter at `open: 'never'`; if that regresses, run with `PLAYWRIGHT_HTML_OPEN=never` so the process exits and verifier waits don't stall.

## Open design decisions

- **Noise threshold for the gating `meta.*` leaves:** keep tuning prompts/status mapping so only significant verifier-improvement recommendations block green; low-severity/nice-to-have ideas should stay visible without creating dashboard churn.
- **Guarded-check status:** ordinary development may leave guarded checks skipped-by-policy/error-ish, but release-candidate readiness requires fresh passing results for each check listed in `coverage/guarded-check-policy.json`. Revisit dashboard semantics only if the skipped-by-policy classification is still confusing after release-candidate rehearsals.
- **Roster source format:** `coverage.validation-roster` cross-references a structured JSON roster against Markdown. Revisit only if maintaining both becomes painful.
- **Domain source of truth:** `coverage.domains` uses live manifests for implemented routes and product docs for intended boundaries. Revisit if domain manifests stop being a good bounded surface.
