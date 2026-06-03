# Plan: improving the Commonality verifier checks

This file is a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files.

The verifier already has a strong foundation: automated lint/build/test wrappers, validation-pass supervisors with freshness policies and dashboard classification, report-attestation checks, guarded local-stack/testnet smokes, `coverage.*` and `staleness.*` verifier-of-verifier checks, `known-bad.*` false-green guards, `meta.verifier-health` rollup, `operations.degradation-canary`, and `ai-fixtures.deterministic`.

Most of the original plan is done (see git history and `README.md`). What remains below is the genuinely open work.

## Start here (next task)

**Item 1 (the operations/degradation canary set) is now complete.** The next task is **item 2 — extend `ai-fixtures.deterministic` to more AI services.**

The RPC slow/failing slice is **done**: `AttestAlignmentForm.test.tsx` has an `RPC degradation` describe block (read failure leaves the form usable; submission timeout surfaces an error and re-enables submit), wired into the canary's file list and `-t` filter.

The wrong-chain wallet-state slice is **done**: there was no chain-mismatch detection in the UI, so this required first building a minimal network-switch prompt. Added `ui/src/shared/expectedChain.ts` (derives the single expected chain id from `COMMONALITY_ENVIRONMENT`) and `ui/src/shared/components/NetworkSwitchPrompt.tsx` (`useIsWrongChain` hook + a "Wrong network / Switch network" `Alert`, with its own `NetworkSwitchPrompt.test.tsx`). `AttestAlignmentForm` now renders the prompt, disables submit, and guards `handleSubmit` when the wallet is on the wrong chain; its test has a `Wrong-chain degradation` describe block wired into the canary's `-t` filter.

Everything else (open design decisions) is lower priority and can wait.

## Remaining work

### 1. Finish the operations/degradation canary set — DONE

`operations.degradation-canary` now covers IPFS unavailable/malformed metadata, platform API network/malformed-response failures, personalization-service fallback, indexer empty/lagging/failing states, slow/failing chain RPC, and wrong-chain wallet state. The set is intentionally small (a representative canary per dependency, not a domain × dependency matrix). No remaining slices.

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
