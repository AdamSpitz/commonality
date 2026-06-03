# Plan: improving the Commonality verifier checks

This file is a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files.

The verifier already has a strong foundation: automated lint/build/test wrappers, validation-pass supervisors with freshness policies and dashboard classification, report-attestation checks, guarded local-stack/testnet smokes, `coverage.*` and `staleness.*` verifier-of-verifier checks, `known-bad.*` false-green guards, `meta.verifier-health` rollup, `operations.degradation-canary`, and `ai-fixtures.deterministic`.

Most of the original plan is done (see git history and `README.md`). What remains below is the genuinely open work.

## Start here (next task)

**Finish the operations/degradation canary set — item 1 below — specifically the wrong-chain wallet-state slice.**

This is the highest-value remaining work because the manual test plan still flags dependency-degradation as a major gap. Note this is **not** just verifier config: the slice has no existing UI test to wrap, so the task **begins in `ui/`** by writing a representative fault-injection test (unsupported/mismatched chain prompting a network switch), and only then wires it into `operations.degradation-canary` the same way the IPFS/platform-API/indexer/RPC slices already are. See item 1 for details.

The RPC slow/failing slice is **done**: `AttestAlignmentForm.test.tsx` now has an `RPC degradation` describe block (read failure leaves the form usable; submission timeout surfaces an error and re-enables submit), wired into the canary's file list and `-t` filter.

Caveat for the wrong-chain slice: there is currently **no chain-mismatch detection in the UI at all** (no `useChainId`/`useSwitchChain`/"wrong network" surface — see `ui/src/wagmi.ts`, `WalletButton.tsx`). So this slice cannot be a pure test-then-wrap exercise like RPC was; it requires first building a minimal network-switch prompt before a fault-injection test can assert against it. Scope that product change deliberately rather than treating it as verifier config.

Everything else (item 2, open design decisions) is lower priority and can wait.

## Remaining work

### 1. Finish the operations/degradation canary set

`operations.degradation-canary` now covers IPFS unavailable/malformed metadata, platform API network/malformed-response failures, personalization-service fallback, indexer empty/lagging/failing states, and slow/failing chain RPC.

Still uncovered:

- **wrong-chain wallet state** — assert the UI detects an unsupported/mismatched chain and prompts a network switch instead of issuing calls against the wrong chain. There is no chain-mismatch UI today, so this requires building a minimal network-switch prompt before a fault-injection test can wrap it (see the caveat in "Start here").

Keep this a small canary set, not a domain × dependency matrix. Prefer wrapping existing lower-level tests; for the remaining slice there is none yet, so add a representative test in `ui/` before wiring it into the canary.

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
