# Plan: improving the Commonality verifier checks

This file is a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files.

The verifier already has a strong foundation: automated lint/build/test wrappers, validation-pass supervisors with freshness policies and dashboard classification, report-attestation checks, guarded local-stack/testnet smokes, `coverage.*` and `staleness.*` verifier-of-verifier checks, `known-bad.*` false-green guards, `meta.verifier-health` rollup, `operations.degradation-canary`, and `ai-fixtures.deterministic`.

Most of the original plan is done (see git history and `README.md`). What remains below is the genuinely open work.

## Remaining work

### 1. Finish the operations/degradation canary set

`operations.degradation-canary` now covers IPFS unavailable/malformed metadata, platform API network/malformed-response failures, personalization-service fallback, and indexer empty/lagging/failing states.

Still uncovered, and currently **lacking any UI test to wrap**, so each needs new fault-injection tests written first:

- **RPC slow/failing** — assert the UI degrades safely (timeouts, retry/error surfaces) rather than hanging or crashing.
- **wrong-chain wallet state** — assert the UI detects an unsupported/mismatched chain and prompts a network switch instead of issuing calls against the wrong chain.

Keep this a small canary set, not a domain × dependency matrix. Prefer wrapping existing lower-level tests; here there are none yet, so the first step is adding representative tests in `ui/` before wiring them into the canary.

### 2. Extend `ai-fixtures.deterministic` to more AI services

`ai-fixtures.deterministic` currently wraps the `content-attester` and `implication-attester` deterministic mock-LLM suites. Extend coverage to:

- `content-finder` and `explorer-curator` (personalization) fixture harnesses, where deterministic mock-LLM suites exist or can be added;
- downstream SDK/UI discoverability where applicable.

Separately, consider a distinct **explicitly opt-in live-model check** (blanked by default) if golden-corpus drift detection against real models is wanted. This is intentionally not part of routine `validation.pr` runs.

## Open design decisions

- **Roster source format:** Should `coverage.validation-roster` keep cross-referencing `workflow/testing/manual-tests/README.md` against a structured roster, or parse the Markdown directly? Current approach uses a structured JSON roster cross-referenced to the Markdown.
- **Domain source of truth:** Should `coverage.domains` track live UI manifests, product docs, or both? Current default: live manifests for implemented routes, product docs for intended boundaries.
- **`meta.llm-check-review` shape:** It currently calls `pi` directly with no tools and bounded prompt inputs. Revisit if an agentic tool-using call becomes more useful than a direct read-only model call.
- **Guarded-check status:** Should guarded checks lacking opt-in env vars be `error`, `uncertain`, or a distinct structured `skippedByPolicy` finding inside `uncertain`? Current behavior is the conservative `skippedByPolicy`-in-`uncertain`, which keeps release dashboards explainable but slightly noisy.
