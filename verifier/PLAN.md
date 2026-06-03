# Plan: improving the Commonality verifier checks

This file is a backlog for verifier work that is **not already represented by current check definitions** under [`checks/`](./checks/). Current behavior is documented in [`README.md`](./README.md) and the actual `*.def.json` files.

The verifier already has a strong foundation: automated lint/build/test wrappers, validation-pass supervisors with freshness policies and dashboard classification, report-attestation checks, guarded local-stack/testnet smokes, `coverage.*` and `staleness.*` verifier-of-verifier checks, `known-bad.*` false-green guards, `meta.verifier-health` rollup, `operations.degradation-canary`, and `ai-fixtures.deterministic`.

Most of the original plan is done (see git history and `README.md`). What remains below is the genuinely open work.

## Start here (next task)

**Items 1 and 2 are now complete** (the operations/degradation canary set; and `ai-fixtures.deterministic` extended to `explorer-curator`, with `content-finder` evaluated and deliberately excluded as a no-own-model finder). **Item 3 is now complete:** all three standing qualitative-judgment leaves are done — `review.docs-coherence`, `review.landing-compelling`, and `review.workflow-clarity` (see below). They remain manual/advisory and are not yet wired into a gating rollup; promoting them (e.g. summarized under a validation pass) once cost and false-positive rates are understood is the natural next step.

The RPC slow/failing slice is **done**: `AttestAlignmentForm.test.tsx` has an `RPC degradation` describe block (read failure leaves the form usable; submission timeout surfaces an error and re-enables submit), wired into the canary's file list and `-t` filter.

The wrong-chain wallet-state slice is **done**: there was no chain-mismatch detection in the UI, so this required first building a minimal network-switch prompt. Added `ui/src/shared/expectedChain.ts` (derives the single expected chain id from `COMMONALITY_ENVIRONMENT`) and `ui/src/shared/components/NetworkSwitchPrompt.tsx` (`useIsWrongChain` hook + a "Wrong network / Switch network" `Alert`, with its own `NetworkSwitchPrompt.test.tsx`). `AttestAlignmentForm` now renders the prompt, disables submit, and guards `handleSubmit` when the wallet is on the wrong chain; its test has a `Wrong-chain degradation` describe block wired into the canary's `-t` filter.

Everything else (open design decisions) is lower priority and can wait.

## Remaining work

### 1. Finish the operations/degradation canary set — DONE

`operations.degradation-canary` now covers IPFS unavailable/malformed metadata, platform API network/malformed-response failures, personalization-service fallback, indexer empty/lagging/failing states, slow/failing chain RPC, and wrong-chain wallet state. The set is intentionally small (a representative canary per dependency, not a domain × dependency matrix). No remaining slices.

### 2. Extend `ai-fixtures.deterministic` to more AI services — mostly done

`ai-fixtures.deterministic` now wraps `content-attester`, `implication-attester`, **and `explorer-curator`** deterministic mock-LLM suites. The explorer-curator suite (`curator.test.ts`, `personalizer.test.ts`) mocks `requestJsonCompletion` and exercises curation/personalization prompt construction, suggestion filtering, and LLM-failure fallback — a genuine offline mock-LLM harness, so it belongs in this check.

`content-finder` was evaluated and **deliberately not added**: it is a finder that delegates evaluation to the `content-attester` service over HTTP and calls no model of its own, so its tests (submission-key/parse logic) are not a mock-LLM harness and the LLM behavior it depends on is already covered by the `content-attester` suite. Revisit only if `content-finder` grows direct model calls.

Remaining: downstream SDK/UI mock-LLM discoverability where applicable.

Separately, consider a distinct **explicitly opt-in live-model check** (blanked by default) if golden-corpus drift detection against real models is wanted. This is intentionally not part of routine `validation.pr` runs.

### 3. Standing qualitative-judgment review leaves (not just attestation)

Today the `review.*` checks are **attestation** checks: `report-attestation.mjs` verifies a fresh report exists with the required sections and no unresolved blockers. The actual qualitative judgment ("do the docs make sense", "is the landing page compelling", "does the UI offer a clear path through each workflow") happens out-of-band when a human or a skill (`demanding-newcomer`, `real-ui-user`, `intelligent-tester`, `cofounder`) runs a review and writes the report. The only check that invokes a model inline is `meta.llm-check-review`, and it reviews the verifier, not the product.

Consider adding standing **LLM-judgment leaves** that form the opinion themselves, on the model of `meta.llm-check-review` (bounded inputs, adversarial prompt, structured findings, deterministic status mapping, model resolved by `taskKind` via `pi-model-router`):

- `review.docs-coherence` — **DONE.** Reads the bounded product/docs surface (`README.md`, `AGENTS.md`, `docs/dev/architecture.md`, `docs/end-user/tldr-for-llms.md`, `docs/founder/christian-pitch.md`, `ui/README.md`, the testing READMEs) and flags contradictions, stale instructions, conceptual incoherence, broken references, and unfollowable steps. `taskKind: clear-communication`, status mapped deterministically to `pass`/`uncertain` (never `fail`). Manual-triggered and not yet wired into a gating rollup (advisory at first). The generic LLM-call machinery (`getLlmResponse`, `resolveModel`, `parseJsonObject`, `validateJudgmentResponse`) was extracted into `checks/lib/llm-judgment.mjs` and `meta.llm-check-review` refactored onto it, so the remaining leaves below are mostly prompt + input-collection.
- `review.landing-compelling` — **DONE.** Reads the landing/marketing copy (`docs/end-user/common-sense-majority/elevator-pitch.md`, `docs/end-user/tldr-for-llms.md`, `docs/founder/csm/pitching-reference.md`, the commonality and CSM `LandingPage.tsx`) against the value-prop ground truth (`docs/founder/christian-pitch.md`, `docs/founder/csm/README.md`), supplied as two separate prompt sections so it judges alignment rather than just internal polish. Flags value-prop misalignment, unconvincing claims, weak ledes, voice violations, and unfinished copy. The prompt encodes the [[feedback_csm_copy_voice]] guidance (recognition over persuasion; lead with the synthesis/flywheel, not a single mechanism or the frustration angle). `taskKind: big-picture-thinking`, status mapped deterministically to `pass`/`uncertain` (never `fail`), built on `checks/lib/llm-judgment.mjs`. Manual-triggered and advisory at first, not wired into a gating rollup.
- `review.workflow-clarity` — **DONE.** Given a target workflow (`targetWorkflow` param: home domain, goal, surface files; defaults to an Alignment newcomer-funding workflow), uses the `coverage/domains.json` inventory as the surface enumerator and reads the workflow's domain `manifest.tsx` (routes + navigation) and `LandingPage.tsx` (entry-point copy/CTAs) to judge whether the UI exposes a clear, completable path. Flags dead ends, missing steps, ambiguous navigation, unexplained cross-domain hops, and onboarding gaps. The manifest turned out to be a clean bounded surface enumerator (routes + nav, no raw page-component churn). `taskKind: big-picture-thinking`, status mapped deterministically to `pass`/`uncertain` (never `fail`), built on `checks/lib/llm-judgment.mjs`. Manual-triggered and advisory at first.

Keep these **manual/advisory at first** (like `meta.llm-check-review`): summarized under their validation pass, returning `uncertain` for plausible gaps rather than status-setting `root`, until cost and false-positive rates are understood. Status should be mapped deterministically from structured findings, with the model only enriching the summary, so it can't talk a fail into a pass.

## Open design decisions

- **Roster source format:** Should `coverage.validation-roster` keep cross-referencing `workflow/testing/manual-tests/README.md` against a structured roster, or parse the Markdown directly? Current approach uses a structured JSON roster cross-referenced to the Markdown.
- **Domain source of truth:** Should `coverage.domains` track live UI manifests, product docs, or both? Current default: live manifests for implemented routes, product docs for intended boundaries.
- **`meta.llm-check-review` shape:** It currently calls `pi` directly with no tools and bounded prompt inputs, with the model resolved by task-kind via `pi-model-router` (`taskKind`, default `big-picture-thinking`). Revisit if an agentic tool-using call becomes more useful than a direct read-only model call.
- **Guarded-check status:** Should guarded checks lacking opt-in env vars be `error`, `uncertain`, or a distinct structured `skippedByPolicy` finding inside `uncertain`? Current behavior is the conservative `skippedByPolicy`-in-`uncertain`, which keeps release dashboards explainable but slightly noisy.
