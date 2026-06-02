# Plan: remaining Commonality verifier work

This file is now only a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Completed build-out details were pruned; use [`README.md`](./README.md) and the actual `*.def.json` files as the source of truth for the current DAG, commands, trigger policy, report-attestation rules, and destructive-check opt-ins.

## Remaining work — known gaps, stale risks, and verifier-of-verifier checks

Add maintenance checks that keep the testing system itself honest:

- `staleness.known-gaps`: verify known-gap records have `owner`, `status`, and `lastReviewed` fields, and become `uncertain` or `fail` when stale.
- `coverage.validation-roster`: verify manual/LLM validation roster roles have corresponding verifier checks or explicit exclusions.
- `coverage.domains`: verify all eight product domains have at least smoke/review coverage records.
- `known-bad.*`: optional fixtures that intentionally violate important invariants to prove checks can fail.

Acceptance checks:

- Adding a new major testing-plan item without coverage causes `coverage.testing-plan` to fail.
- A stale known gap causes `staleness.known-gaps` to fail or become uncertain.
- Missing manual/LLM roster coverage is visible through `coverage.validation-roster` rather than hidden in prose.
- Missing per-domain smoke/review coverage is visible through `coverage.domains` rather than hidden in prose.

## Suggested execution order

1. Decide where structured known-gap metadata should live. The current coarse inventory is [`coverage/testing-plan-items.json`](./coverage/testing-plan-items.json); either extend it or add a sibling file.
2. Add `staleness.known-gaps` and wire it into `root` once it runs successfully.
3. Add `coverage.validation-roster` and wire it into `root` once it runs successfully.
4. Add `coverage.domains` and wire it into `root` once it runs successfully.
5. Add one or more `known-bad.*` fixture checks only where they provide real confidence rather than noise.

## Open design decisions

- How stale is too stale for known gaps?
- Should `coverage.validation-roster` read only report-attestation check definitions, or also parse `workflow/testing/manual-tests/README.md`?
- Should `coverage.domains` derive the canonical domain list from `specs/product/ui-domains.md`, UI domain config, or a verifier-local coverage inventory?
- Should these maintenance checks be scheduled automatically, or kept manual until their noise level is known?
