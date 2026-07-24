# 0002. Code-quality metrics: adopt as advisory reports, not gates

- **Status:** Accepted
- **Date:** 2026-07-24
- **Related specs:** [`workflow/testing-inventory.md`](../../workflow/testing-inventory.md)

## Context

The project already carries an unusually heavy quality apparatus: a 107-check
verifier harness with four gating facets, layered conventional suites (~230+ test
files), husky pre-commit/pre-merge gates, and autonomy tiers. The question raised
was whether to additionally adopt the "Uncle Bob" menu — Gherkin/BDD tests,
mutation testing, and metrics like test coverage, dependency structure,
cyclomatic complexity, and module size.

Two forces shaped the answer. First, most of that machinery is *already* a gating
layer, so a second restrictive gate risks redundancy and friction more than it
adds confidence. Second — and decisively — the code is written largely by
ephemeral LLM agents who lack whole-repo context. That makes *objective
guardrails an agent can't rationalize past* unusually valuable, but it also means
anything subjective or threshold-based just becomes a number agents game or a
noise source they learn to ignore. The contracts additionally hold real money and
will reach mainnet, so contract-level confidence is worth more than elsewhere.

## Decision

Adopt four measures, all as **advisory reports or lint warnings — never as
gates**:

1. **Contract coverage** via `solidity-coverage` (`npm run hardhat:coverage`),
   config in [`hardhat/.solcover.js`](../../hardhat/.solcover.js) (skips
   `contracts/test/` mocks). Run on demand; no CI threshold.
2. **Cyclomatic complexity + module/function size** via ESLint, applied
   repo-wide as **warnings** through the shared fragment
   [`eslint.metrics.mjs`](../../eslint.metrics.mjs) (spread into every
   workspace's `eslint.config.js`). No lint script passes `--max-warnings`, so
   these never break a build. Thresholds live in that one file.
3. **Line/branch coverage** of the UI Vitest suite as a verifier check
   (`quality.line-coverage`) that reports percentages, returning `uncertain` if
   the instrumented test run does not complete successfully.
4. **Circular-dependency scan** via `madge` as a verifier check
   (`quality.circular-deps`) that reports cycles as `uncertain`, never `fail`.

Both verifier checks are wired into `facet.functionality` as **advisory**
children (`advisoryCheckIds`), so they surface on the dashboard but can never
turn the facet — or root — red.

## Alternatives considered

- **Gherkin / BDD (Cucumber) — rejected.** Its value is a shared spec language
  between non-technical stakeholders and developers; we don't have that
  translation problem, and we already have the executable-spec layer BDD reaches
  for (Playwright user-journeys, the verifier's product facet, ADRs, MVP specs).
  Adding feature-file → step-definition → code indirection is a third sync burden
  on ephemeral authors for a benefit we already get.
- **Mutation testing (Stryker / Solidity mutators) — rejected as standing
  infrastructure.** Slow and heavy to maintain at this repo's size; the JS-side
  payoff is marginal given existing coverage, and Solidity mutation tooling is
  weak. Left explicitly as an *optional one-time manual audit* of the SDK/contract
  core if we ever doubt a green suite — never a gate or a cron check.
- **Coverage/complexity as blocking gates with thresholds — rejected.** On an
  LLM-authored codebase, hard thresholds produce vacuous tests and per-file
  disable comments rather than better code. Reports and warnings inform where to
  invest without inviting that gaming. Our existing verifier + tiers already
  provide the gating layer.
- **Enforced dependency-boundary rules (dependency-cruiser regime) — rejected**
  in favor of a lightweight cycle *report*. Architectural intent already lives in
  ADRs and domain manifests; a full enforced-boundary config would duplicate that
  and add friction. A cycle scan catches the one objective failure (import
  cycles) cheaply.

## Consequences

- Buys a visible, objective read on contract coverage, code-structure smells
  (the first `quality.circular-deps` run already flagged two real cycles, in
  `beat-agent` and `service-host`), and UI coverage — aimed squarely at the
  god-function/mega-module failure mode of sliced-context authors.
- Costs almost nothing in friction: warnings and advisory checks can't block
  work, and thresholds are tunable in one place each.
- The metric warning population (UI alone starts at ~500 warnings) is *expected*
  and is a backlog signal, not a regression. If a threshold proves too noisy to
  be useful, tune it in `eslint.metrics.mjs` rather than disabling per file.
- **What would make us revisit:** if the advisory numbers get ignored to the
  point of being decorative, promote the highest-value one (likely contract
  coverage) to a real gate with a deliberately-chosen floor — but only then, and
  only for the contracts. Approaching mainnet is the natural trigger to reconsider
  contract-coverage gating specifically.
