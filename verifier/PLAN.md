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

   The workflow is: run the relevant facet or report, read what it says, fix the *project*, rerun. The list of what's left lives in those reports, not in this file. To earn release-candidate or full-launch confidence, work down `readiness.md` and run the guarded prerequisites (`artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, `stack.restart-consistency`, `env.testnet-smoke`) with their explicit opt-ins — see README "Useful commands".

2. **Improving the verifier** — making the checks more comprehensive, more trustworthy, cheaper, or better-faceted, so that when they go green you can actually believe them. That is the backlog below.

## Current state

The faceted gating dashboard is live and documented in [`README.md`](./README.md): `root` rolls up `facet.functionality`, `facet.docs`, `facet.product`, `facet.security`, and `meta.verifier-health`. The standing product LLM-judgment leaves (`review.docs-coherence`, `review.landing-compelling`, and the `review.workflow-clarity*` workflow targets) are **gating** via finding severity. The old confidence-tier supervisors were retired; `validation.pr` survives as the fast functionality loop. The two `meta.*` LLM leaves (`meta.llm-check-review`, `meta.llm-to-automated-candidates`) are gating inside `meta.verifier-health` when they find significant unresolved verifier improvements.

The meta LLM leaves can make `meta.verifier-health` non-green when they identify significant unresolved verifier improvements; don't rerun them blindly — triage one small finding at a time, and prefer adding a deterministic test/check over leaving the burden on the model. The two `meta.*` leaves' standing suggestions are folded into the backlog below; the product leaves' findings surface through their facets (category 1).

## Backlog — improving the verifier

Honest read of where the workspace stands (June 2026): the *architecture* is unusually mature — real automated backing (lint/build/tests, SDK replay/idempotency canaries, seed regression, AI-fixture prompt-injection harnesses, UI degradation canaries), a well-guarded LLM-judgment layer where gating is derived from finding severity rather than the model's self-report, a genuine verifier-of-verifier layer (`known-bad.*` fixtures that prove each check rejects bad input), coverage/drift maps, and a meta layer. That is the skeleton of a real QA org, and the fact that `root` is honestly red right now (dangling doc refs, dormant deep checks) is itself evidence the thing is working rather than rubber-stamping.

But the checks that would most directly justify telling the world "come use this" are the ones we have least of: nothing actually *drives the running product end-to-end*. The backlog below is ordered by how much each item would move the "I actually believe it works" needle.

### P1 — Prove the whole thing boots and reads back correctly

- **The deepest functionality signal is dormant.** `stack.fresh-seeded`, `stack.restart-consistency`, `artifact.ipfs-domain-smoke`, and `env.testnet-smoke` are the only checks that actually boot the stack and hit real endpoints — and in normal operation they never run (manual + opt-in env). On the dashboard "4 skipped by policy" is indistinguishable from "we have never once proven the whole system boots." Add a tracked **deployment-depth cadence**: a scheduled/CI path (e.g. nightly) that actually runs these with their opt-ins, plus a freshness gate so `facet.functionality` ages toward yellow when the last *real* stack pass is old, instead of resting on fast unit tests. Record "last end-to-end boot: N days ago" somewhere visible.
- **No end-to-end data-correctness check (highest-value gap).** "Does it work" ultimately means: an attestation written on-chain flows correctly through indexer → API → UI and reads back identically. We have replay/idempotency canaries at the SDK level only. Add a check that, against the seeded local stack, writes through every layer and asserts the round-trip (on-chain event → indexed row → GraphQL/_API_ response → rendered UI value) is consistent. This is the single most convincing "it actually works" check we don't have.
- **No real user-journey E2E.** `review.workflow-clarity*` *reads UI source* and judges clarity; it does not drive the UI. `review.real-ui.touched-domain` is a human/LLM attestation. Playwright already exists (`artifact.ipfs-domain-smoke`). Promote 3–4 canonical journeys (newcomer donor funding/attestation, LazyGiving project create+back, content-funding creator+supporter, CSM movement-to-action) to actual headless browser journeys against the seeded stack, asserting the user can complete them — not just that the source looks completable.

**Report currency (git-aware staleness) — DONE.** `meta.report-currency` now answers "is the latest report still good, or should I re-run?" by combining elapsed-time (each check's own cadence) with work-done: it watermarks the commit it last evaluated, returns "current" model-free when HEAD hasn't moved, and otherwise asks a model which checks the commits since the watermark invalidate (verdict derived from the structured `invalidatedChecks` list, advisory under `meta.verifier-health`, backed by `known-bad.report-currency`). See README. Remaining follow-ups worth considering: (a) feed the model a rough cost/tier per check so its rerun recommendations weight expensive checks; (b) optionally let Layer A consume the verdict to auto-mark a check `uncertain` in facet rollups rather than only reporting it; (c) upstream harness generalization — extend `onInputChange` to fire on `file`-input content change, or add a `git-surface` trigger, so currency can become push-driven instead of asked-for.

### P2 — Make the existing signals less fakeable / more real

- **Health evidence theater — DONE.** `stack/fresh-seeded.sh` and `stack/restart-consistency.sh` previously emitted a *hardcoded* all-`pass` JSON regardless of probe results, defeating the structured-evidence mechanism in `guarded-command-check.mjs`. Both scripts now probe each endpoint without aborting, capture each probe's real pass/fail, and emit per-probe evidence (and exit non-zero on any failure). The evidence layer is no longer trivially satisfiable, and `known-bad.stack-guarded-command` already proves a degraded-but-exit-0 stack is caught via the evidence layer.
- **Performance is only bundle size.** `operations.performance-budget` checks client asset size; `testing-plan.md` names performance acceptability as a launch dimension but nothing measures real latency/throughput against the running stack (API p95, indexer lag under a burst of events, page TTI). Add a cheap but *real* latency probe against the seeded stack rather than leaving perf as a pure known-gap.
- **Product LLM leaves judge source, not the rendered product.** `review.landing-compelling` and `review.docs-coherence` read files; "is the landing page compelling" really wants the rendered page/screenshots. Feed rendered HTML and/or Playwright screenshots into the product judgment leaves so they assess what a visitor actually sees.

### P3 — Trust the green more over time

- **Security facet is thin for an on-chain product.** `facet.security` rolls up only `review.security.contracts` (one attestation/LLM judgment). For the scariest surface, add deterministic backing: a static analyzer (e.g. slither) as an automated check, and contract access-control / invariant property tests surfaced as their own leaf, so security isn't resting on a single subjective report.
- **Flakiness / trend awareness — DONE.** `meta.flakiness` reads each check's retained result history and flags leaves whose history flips pass↔fail (≥2 transitions), surfacing them as `uncertain` under `meta.verifier-health` so a flaky green is not trusted — a currently-green flapping leaf is `high` severity precisely because the dashboard would otherwise invite unjustified trust. It is deterministic (reads stored results only); `uncertain` is treated as neutral so the advisory pass/uncertain leaves are not mistaken for flaky. Backed by `known-bad.flakiness`. Remaining follow-up: slow-degradation/latency-trend detection (gradual drift, not just pass/fail flips) is still open.
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
