# Plan: improving the Commonality verifier checks

This file is a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files.

I reviewed the current DAG, `workflow/testing/README.md`, `workflow/testing/manual-tests/README.md`, the domain docs, and recent verifier results. The verifier already has a good foundation: automated lint/build/test wrappers, validation-pass supervisors, report-attestation checks, guarded local-stack/testnet smokes, `coverage.testing-plan`, and `meta.liveness`.

The main opportunity is to make the verifier verify **its own coverage and freshness** more aggressively, then add a few high-signal objective canaries where the manual plan still names gaps.

## Highest-priority improvements

### 1. Add `meta.llm-check-review` — periodic adversarial review of the verifier itself

There is not currently a live check that asks an LLM to review the verifier system and suggest improvements. Add one.

Suggested behavior:

- Runs on a slow cadence, e.g. every 1–4 weeks, or manual until cost/noise is understood.
- Reads bounded inputs:
  - `verifier/README.md`
  - `verifier/PLAN.md`
  - all `checks/**/*.def.json`
  - `coverage/testing-plan-items.json`
  - `workflow/testing/README.md`
  - `workflow/testing/manual-tests/README.md`
  - latest `root` result, if available
- Prompts a model as an adversarial verifier architect: “What important system risks are not represented by checks, which checks are stale/noisy, which supervisors hide missing coverage, and which objective checks should replace manual judgment?”
- Writes a Markdown report artifact.
- Emits:
  - `pass` if it found no material new recommendations;
  - `uncertain` if it found plausible coverage gaps needing human triage;
  - `error` if the model/tooling could not run or produced unparseable output.
- Does **not** page directly for speculative recommendations; wire it into `root` with role `meta` once stable, or into a new `meta.verifier-health` supervisor.

Acceptance check: deleting an obvious verifier coverage area from the prompt inputs causes the LLM review to produce an `uncertain` result with a report artifact naming the missing area.

### 2. Promote deferred verifier-of-verifier checks into real definitions

`verifier/README.md` still lists these as deferred, and old ignored results exist for some names, but there are no current `*.def.json` files:

- `staleness.known-gaps`
- `coverage.validation-roster`
- `coverage.domains`

Implement them as cheap scheduled checks and wire them into `root` once they pass.

Recommended order:

1. `staleness.known-gaps`
2. `coverage.validation-roster`
3. `coverage.domains`

Acceptance checks:

- A known-gap item missing owner/status/review metadata fails or becomes uncertain.
- A required manual/LLM validation role missing a report-attestation check or explicit exclusion is visible through `coverage.validation-roster`.
- A domain missing smoke/review coverage is visible through `coverage.domains`.

### 3. Make known-gap metadata structured and stale-aware

`coverage/testing-plan-items.json` already records several `known-gap` items, but not all include `lastReviewed`, `severity`, `owner`, `nextAction`, or `targetConfidence`.

Add a verifier-local gap inventory, or extend `testing-plan-items.json`, with fields like:

```json
{
  "id": "operations-degradation-canaries",
  "title": "Representative dependency failure canaries",
  "owner": "engineering",
  "severity": "high",
  "status": "open",
  "lastReviewed": "2026-06-02",
  "reviewAfterDays": 30,
  "nextAction": "Add small IPFS/indexer/RPC/platform API failure canary set."
}
```

Then let `staleness.known-gaps` enforce it.

### 4. Build `coverage.validation-roster` from the manual validation plan

The manual/LLM roster is much larger than the current six `review.*` attestations. That is OK, but the omissions should be explicit rather than hidden.

The check should compare `workflow/testing/manual-tests/README.md` to a structured verifier roster, for example:

- role/domain/persona;
- required validation pass: light / release-candidate / full-launch;
- coverage mode: report-attestation / automated-check / explicitly-deferred;
- check id(s) or reason deferred;
- freshness requirement.

This would make it obvious, for example, whether per-domain validation for all eight domains is covered by one generic touched-domain attestation, by per-domain attestations, or by an explicit “not yet” entry.

### 5. Build `coverage.domains` from the eight-domain source of truth

Use `specs/product/ui-domains.md` or the live UI domain manifests as the canonical domain list. For each domain, track:

- Vitest/domain route smoke coverage;
- Playwright/IPFS artifact smoke coverage;
- manual/LLM real-user review coverage;
- docs/onboarding coverage where relevant;
- freshness of the latest review report.

This should not require full Playwright flows for every domain; it should enforce that every domain has some intentional coverage story.

## High-signal objective checks to add next

### 6. Operations/degradation canary check(s)

The test plan still names dependency-degradation coverage as a major pending gap. Add one or a few guarded checks that deliberately simulate representative failures and assert safe UI/service behavior:

- IPFS unavailable or malformed metadata;
- indexer empty/lagging;
- platform API unavailable or malformed response;
- RPC slow/failing;
- wrong-chain wallet state.

Keep this as a small canary set, not a domain × dependency matrix. Prefer existing lower-level tests where possible, and wrap only the highest-value end-to-end smoke in verifier.

### 7. AI-service fixture harness check

The manual plan repeatedly says live-model checks should be explicit and expensive, while routine checks should use fixtures/golden corpora. Add a verifier check around a deterministic AI-service fixture harness once that harness exists.

Scope:

- curated benign inputs;
- adversarial/prompt-injection inputs;
- schema validity;
- publication shape;
- downstream SDK/UI discoverability where applicable;
- no live model calls in routine runs unless explicitly opted in.

### 8. Known-bad fixture checks

Add a small number of `known-bad.*` checks proving important verifier checks can actually fail. Good candidates:

- a deliberately incomplete manual-validation report fixture should make `report-attestation.mjs` fail/uncertain;
- a synthetic missing testing-plan mapping should make `coverage.testing-plan` fail;
- a stale known-gap fixture should make `staleness.known-gaps` fail/uncertain.

Do not overbuild this; two or three known-bad checks are enough to catch false-green verifier logic.

## Supervisor and dashboard improvements

### 9. Add `meta.verifier-health` supervisor

Rather than wiring every verifier-of-verifier check directly into `root`, add:

```text
meta.verifier-health
├── meta.liveness
├── coverage.testing-plan
├── staleness.known-gaps
├── coverage.validation-roster
├── coverage.domains
├── meta.llm-check-review
└── known-bad.*
```

Then `root` can read validation passes plus `meta.verifier-health`.

### 10. Separate “validation failed” from “validation missing/stale” more clearly

Recent `root` results roll up real failures, stale/missing manual reports, and guarded checks that errored because opt-in env vars were absent. That is honest, but the dashboard summary is hard to interpret.

Possible improvement: add richer structured findings in supervisors:

- `systemFailures`: child checks that ran and found product/test failures;
- `blindSpots`: child checks that errored or could not run;
- `missingAttestations`: required manual reports absent/stale;
- `skippedByPolicy`: guarded/manual checks not run because the pass did not opt in.

Status can still be deterministic, but humans will understand why the dashboard is red.

### 11. Add freshness policy to more validation passes

`validation.pr` has explicit freshness windows. Generic supervisors currently roll up latest child results without pass-specific freshness rules. For release-candidate/full-launch confidence, stale child results are often as bad as missing ones.

Either:

- extend `checks/supervisor.mjs` to accept freshness requirements in params; or
- write bespoke supervisors for `validation.release-candidate` and `validation.full-launch`.

Acceptance check: a six-month-old passing `automated.test-full` result does not satisfy a release-candidate pass.

## Suggested execution order

1. Add structured known-gap metadata and `staleness.known-gaps`.
2. Add `coverage.validation-roster`.
3. Add `coverage.domains`.
4. Add `meta.verifier-health` and wire it into `root`.
5. Add `meta.llm-check-review` as manual or monthly, producing a report artifact.
6. Add 1–3 `known-bad.*` fixture checks.
7. Add the operations/degradation canary set.
8. Add the AI-service fixture harness check.
9. Improve supervisor freshness and dashboard classification.

## Open design decisions

- How stale is too stale for known gaps? Suggested default: 30 days for high-severity, 90 days for medium/low.
- Should `coverage.validation-roster` parse Markdown directly, or should we create a structured `coverage/manual-roster.json` and merely cross-reference the Markdown?
- Should `coverage.domains` use product docs or live UI manifests as the canonical domain list? Suggested: live manifests for implemented routes, product docs for intended product boundaries.
- Should `meta.llm-check-review` call a model directly, or invoke an agentic coding/review tool that can inspect files and write an artifact?
- Should guarded checks that lack opt-in env vars be `error`, `uncertain`, or a distinct structured `skippedByPolicy` finding inside `uncertain`? Current behavior is conservative, but it makes release dashboards noisy.
