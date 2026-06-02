# Plan: improving the Commonality verifier checks

This file is a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files.

I reviewed the current DAG, `workflow/testing/README.md`, `workflow/testing/manual-tests/README.md`, the domain docs, and recent verifier results. The verifier already has a good foundation: automated lint/build/test wrappers, validation-pass supervisors, report-attestation checks, guarded local-stack/testnet smokes, `coverage.testing-plan`, and `meta.liveness`.

The main opportunity is to make the verifier verify **its own coverage and freshness** more aggressively, then add a few high-signal objective canaries where the manual plan still names gaps.

## Highest-priority improvements

Recently completed:

- `meta.llm-check-review` now exists as a manual/advisory check. See [`checks/meta/llm-check-review.def.json`](./checks/meta/llm-check-review.def.json), [`checks/meta/llm-check-review.mjs`](./checks/meta/llm-check-review.mjs), and [`README.md`](./README.md).
- `staleness.known-gaps`, `coverage.validation-roster`, and `coverage.domains` now exist as cheap scheduled verifier-of-verifier checks. See [`checks/coverage/`](./checks/coverage/), [`coverage/testing-plan-items.json`](./coverage/testing-plan-items.json), [`coverage/validation-roster.json`](./coverage/validation-roster.json), [`coverage/domains.json`](./coverage/domains.json), and [`README.md`](./README.md).
- `meta.verifier-health` now rolls up verifier-of-verifier checks, and `root` reads it instead of reading each maintenance check directly. See [`checks/meta/verifier-health.def.json`](./checks/meta/verifier-health.def.json), [`checks/meta/verifier-health.mjs`](./checks/meta/verifier-health.mjs), and [`README.md`](./README.md).
- `known-bad.testing-plan`, `known-bad.staleness-known-gaps`, and `known-bad.report-attestation` now prove selected verifier checks reject deliberately broken fixtures. See [`checks/known-bad/`](./checks/known-bad/), [`fixtures/known-bad/`](./fixtures/known-bad/), and [`README.md`](./README.md).
- Generic supervisors now add dashboard classifications (`systemFailures`, `blindSpots`, `missingAttestations`, `skippedByPolicy`, `staleResults`, and `otherUncertain`) so red validation dashboards explain whether failures are product/test failures, missing reports, stale prerequisite runs, or intentionally guarded checks. See [`checks/supervisor.mjs`](./checks/supervisor.mjs) and [`README.md`](./README.md).

### 1. Promote deferred verifier-of-verifier checks into real definitions — done

`staleness.known-gaps`, `coverage.validation-roster`, and `coverage.domains` are now live scheduled checks and root inputs.

Acceptance checks covered:

- A known-gap item missing owner/status/review metadata fails through `staleness.known-gaps`.
- A required manual/LLM validation role missing a report-attestation check or explicit exclusion is visible through `coverage.validation-roster`.
- A domain missing smoke/review coverage is visible through `coverage.domains`.

### 2. Make known-gap metadata structured and stale-aware — done

`coverage/testing-plan-items.json` now includes structured known-gap metadata (`owner`, `status`, `severity`, `lastReviewed`, `reviewAfterDays`, `nextAction`, and `targetConfidence`), and `staleness.known-gaps` enforces it.

### 3. Build `coverage.validation-roster` from the manual validation plan

The manual/LLM roster is much larger than the current six `review.*` attestations. That is OK, but the omissions should be explicit rather than hidden.

The check should compare `workflow/testing/manual-tests/README.md` to a structured verifier roster, for example:

- role/domain/persona;
- required validation pass: light / release-candidate / full-launch;
- coverage mode: report-attestation / automated-check / explicitly-deferred;
- check id(s) or reason deferred;
- freshness requirement.

This would make it obvious, for example, whether per-domain validation for all eight domains is covered by one generic touched-domain attestation, by per-domain attestations, or by an explicit “not yet” entry.

### 4. Build `coverage.domains` from the eight-domain source of truth

Use `specs/product/ui-domains.md` or the live UI domain manifests as the canonical domain list. For each domain, track:

- Vitest/domain route smoke coverage;
- Playwright/IPFS artifact smoke coverage;
- manual/LLM real-user review coverage;
- docs/onboarding coverage where relevant;
- freshness of the latest review report.

This should not require full Playwright flows for every domain; it should enforce that every domain has some intentional coverage story.

## High-signal objective checks to add next

### 5. Operations/degradation canary check(s)

The test plan still names dependency-degradation coverage as a major pending gap. Add one or a few guarded checks that deliberately simulate representative failures and assert safe UI/service behavior:

- IPFS unavailable or malformed metadata;
- indexer empty/lagging;
- platform API unavailable or malformed response;
- RPC slow/failing;
- wrong-chain wallet state.

Keep this as a small canary set, not a domain × dependency matrix. Prefer existing lower-level tests where possible, and wrap only the highest-value end-to-end smoke in verifier.

### 6. AI-service fixture harness check

The manual plan repeatedly says live-model checks should be explicit and expensive, while routine checks should use fixtures/golden corpora. Add a verifier check around a deterministic AI-service fixture harness once that harness exists.

Scope:

- curated benign inputs;
- adversarial/prompt-injection inputs;
- schema validity;
- publication shape;
- downstream SDK/UI discoverability where applicable;
- no live model calls in routine runs unless explicitly opted in.

### 7. Known-bad fixture checks — done

`known-bad.testing-plan`, `known-bad.staleness-known-gaps`, and `known-bad.report-attestation` now run synthetic bad fixtures against the target checks and pass only when the target rejects the fixture. These checks are core inputs to `meta.verifier-health`, so false-green verifier logic bubbles up to `root`.

## Supervisor and dashboard improvements

### 8. Add `meta.verifier-health` supervisor — done

`meta.verifier-health` now rolls up liveness, coverage, known-gap staleness, validation-roster coverage, domain coverage, and the advisory LLM check-review. `root` now reads validation passes plus `meta.verifier-health`.

### 9. Separate “validation failed” from “validation missing/stale” more clearly — done

Generic supervisors now keep deterministic status rollup while adding structured dashboard classifications:

- `systemFailures`: child checks that ran and found product/test failures;
- `blindSpots`: child checks that errored or could not run for reasons other than explicit guard policy;
- `missingAttestations`: required manual/QA reports absent, stale, or incomplete;
- `skippedByPolicy`: guarded checks not run because the pass did not opt in;
- `otherUncertain`: uncertain children that do not fit the missing-attestation bucket.

The classification appears both in the one-line summary counts and in `findings.classification`.

### 10. Add freshness policy to more validation passes — done

`checks/supervisor.mjs` now accepts a `freshness` params object with `requiredMaxAgeMinutes` / `maxAgeMinutes` plus optional `byIdMinutes` and `byRoleMinutes` overrides. Stale non-failing child results make the supervisor `uncertain` and appear in the `staleResults` dashboard classification.

`validation.release-candidate` requires child results from the last 7 days. `validation.full-launch` requires child results from the last 24 hours. A six-month-old passing `automated.test-full` result no longer satisfies a release-candidate pass.

## Suggested execution order

1. Add structured known-gap metadata and `staleness.known-gaps`. — done
2. Add `coverage.validation-roster`. — done
3. Add `coverage.domains`. — done
4. Add `meta.verifier-health` and wire it into `root`. — done
5. Add 1–3 `known-bad.*` fixture checks. — done
6. Add the operations/degradation canary set.
7. Add the AI-service fixture harness check.
8. Improve supervisor freshness and dashboard classification. — done

## Open design decisions

- How stale is too stale for known gaps? Suggested default: 30 days for high-severity, 90 days for medium/low.
- Should `coverage.validation-roster` parse Markdown directly, or should we create a structured `coverage/manual-roster.json` and merely cross-reference the Markdown?
- Should `coverage.domains` use product docs or live UI manifests as the canonical domain list? Suggested: live manifests for implemented routes, product docs for intended product boundaries.
- `meta.llm-check-review` currently calls `pi` directly with no tools and bounded prompt inputs; revisit if an agentic tool becomes more useful than a direct read-only model call.
- Should guarded checks that lack opt-in env vars be `error`, `uncertain`, or a distinct structured `skippedByPolicy` finding inside `uncertain`? Current behavior is conservative, but it makes release dashboards noisy.
