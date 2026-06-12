# Project-wide review — started 2026-06-12

**Scope**: Full project-wide review (requested as "architectural review of the entire system"). Chunked per the `project-wide-reviewer` skill; this file tracks all chunks.

**Commits since last review** (before-testnet.md, 2026-05-22): ~316, concentrated in `verifier` (new QA workspace), `ui`, `docs`, `specs`.

## Chunk plan

- [x] Orientation + scope setting (2026-06-12)
- [x] Architecture coherence (2026-06-12, this session)
- [x] Code quality patterns (2026-06-12)
- [x] Verifier workspace review (2026-06-12, this session)
- [ ] Documentation completeness (README chain, role docs, specs vs. reality drift)
- [ ] Test coverage (broad adequacy check)
- [ ] Tech debt (TODOs/FIXMEs, dependency staleness, root-directory clutter)
- [ ] Previous action items (before-testnet.md items 4–6: caching verification on testnet, USDC symbol check, wallet-connected smoke test)
- [ ] Synthesis

**How to continue (notes for a fresh LLM):** Use the `project-wide-reviewer` skill. Pick the next unchecked chunk above, review just that chunk, append a `## Chunk: …` section in this file (continue the finding numbering — last used: 13), check the box here, and record any actionable work in `TODO.md` (don't fix things mid-review beyond trivia). Context that will save you time: previous review is `workflow/reviews/before-testnet.md`; the verifier root report (`npm run verifier:report`) is the project's authoritative health view and is honestly red (see verifier chunk); for the docs chunk, start from README.md's role-based links and verifier/README.md's self-acknowledged stale docs; for tech debt, note that finding 9 (dead GraphQL layer) already covers sdk dependency staleness's biggest item. When all chunks are done, the Synthesis chunk should compile an overall summary at the top of this file and update `workflow/reviews/` conventions if any (check whether a reviews index exists).

## Chunk: Architecture coherence (2026-06-12)

### What's healthy

- **Dependency layering is clean and matches the docs.** `sdk` and the three core libs (`attester-core`, `finder-core`, `nudger-core`) sit at the base; the eight AI services depend only on cores + sdk; `service-host` aggregates the services; `ui`, `integration-tests`, `platform-api-service` depend only on sdk. No cycles, no service-to-service deps.
- **Client-Side Folding pattern is intact.** Indexer `src/` remains a thin event cache (tiny `index.ts`, `events-cache/`, `api/`) with no business logic, exactly as `docs/dev/architecture.md` and `specs/tech/` claim.
- **UI domain architecture is coherent**: explicit manifest registry in `ui/src/domains/index.ts`, eight registered domains matching the product spec, cross-domain smoke/crawler tests living alongside.
- **Service-host bundling** preserves logical-service separation as designed in `specs/tech/artifacts.md`.

### Findings

1. **Dead code in `ui/src/domains/delegation/`**: `manifest.tsx` and `SupportedSitesPage.tsx` survived the fold-into-LazyGiving (b9fc6f1) but were unregistered and unreferenced — **removed 2026-06-12** (201 domain tests pass). `LandingPage.tsx` is still live (lazy-loaded by the content-funding manifest's `/delegation` route) and was kept. Note for future reviewers: domain manifests lazy-load pages via *relative* dynamic imports, so a grep for `domains/delegation` misses them — grep for `../delegation/` too.
2. **`docs/dev/architecture.md` and `specs/tech/artifacts.md` omit deployed artifacts**: `cloudflare-service-gateway` and `cloudflare-ui-gateway` (real, deployed, tested Workers) appear only in `workflow/deployment.md`; the verifier workspace also isn't mentioned in the architecture doc (arguably fine since it's QA tooling, but the gateways are production artifacts).
3. **Minor coupling: `fake-data-generation` imports `@commonality/implication-attester/api`** (`evaluateImplicationWithLLM`, the evaluator system prompt) to generate/verify seed implication evaluations. Reuse is via an explicit `/api` export, so it's deliberate — but if more tools need the evaluator, that logic belongs in `attester-core`. Low priority; just watch it.
4. **Empty untracked directory `christian-vertical/`** at the repo root (the real sketch lives in `christian-commonality/`, which is documented as throwaway). Trivial cleanup.
5. **Minor inconsistency among core libs**: `nudger-core` depends on `@commonality/sdk` while `attester-core`/`finder-core` don't. Not wrong (nudgers genuinely need SDK types), just worth knowing when reasoning about the layering.

### Action items

- [x] Delete dead files in `ui/src/domains/delegation/` (manifest.tsx, SupportedSitesPage.tsx) — done 2026-06-12
- [x] Add the two Cloudflare gateways to `docs/dev/architecture.md` / `specs/tech/artifacts.md` — done 2026-06-12
- [x] Remove empty `christian-vertical/` directory — done 2026-06-12

**Overall health (this chunk)**: Good — the architecture has held its shape through 316 commits; findings are housekeeping, not drift.

## Chunk: Verifier workspace (2026-06-12)

### What's healthy

- **Git hygiene is right**: `results/`, `artifacts/` (38M), and `state/` are untracked; only check definitions (98 `.def.json` + 61 `.mjs`), coverage maps, fixtures, and docs are in git.
- **The architecture is genuinely mature** (matching PLAN.md's own "honest read"): faceted gating dashboard (`root` → functionality/docs/product/security facets + `meta.verifier-health`), gating derived from finding severity rather than LLM self-report, `known-bad.*` verifier-of-verifier fixtures, coverage/drift maps, and a meta layer that flags its own silent/stale checks.
- **Self-assessment is accurate and current.** Root ran 2026-06-11 and is honestly **red** — and spot-checking confirms the failures are real project work, not check noise. The synthesized report's prioritized list is coherent: (1) fix `meta.liveness` (5 silent/overdue checks), (2) re-run the 10 checks staled by commit 1ae4055, (3) resolve `automated.test-full` failures, (4) docs-coherence fixes, (5) product workflow gaps.
- **Category separation works**: project-readiness work intentionally lives in verifier reports (not TODO.md); PLAN.md tracks only verifier-improvement work. The two don't leak into each other.

### Findings

6. **The biggest trust gap is already PLAN.md's P1**: the deep end-to-end checks (`stack.fresh-seeded`, `stack.restart-consistency`, `artifact.ipfs-domain-smoke`, `testnet.environment`, `stack.user-journeys`) run on no cadence — manual + opt-in only — so "the whole thing boots" is never proven automatically. The freshness *gate* exists (`stack.deployment-depth`); the scheduled runner does not. Nothing to add beyond endorsing its priority.
7. **Doc consolidation pending, self-acknowledged**: `testing-plan.md` (199 lines) and `manual-validation-plan.md` (539 lines) are "a bit old" per verifier/README.md, which already suggests absorbing them into checks; `TOO-VERBOSE-README.md` (305 lines) is named as debt. Coverage maps (`coverage/testing-plan-items.json`, `coverage/validation-roster.json`) keep them honest meanwhile, so this is low-urgency.
8. **Current root-red items are the project's standing priorities** — anyone picking up work should start from the latest root report (`npm run verifier:report`), not from TODO.md.

### Action items

- (none new — this chunk's gaps are all already tracked in verifier/PLAN.md or the root report; the review's job here was to confirm the self-assessment is trustworthy, and it is)

**Overall health (this chunk)**: Good — the workspace audits itself accurately; root being red reflects real project work, not verifier rot.

## Chunk: Code quality patterns (2026-06-12)

Focused on `ui` (~51k lines) and `sdk` (~22k lines), the two biggest packages.

### What's healthy

- **SDK subsystem layout is highly consistent**: all eight subsystems follow the same `actions / events / folds / queries / types / index` file pattern with colocated `.test.ts` files. Easy to navigate by analogy.
- **Lint/type suppressions are concentrated, not scattered**: 37 non-test suppressions total, half in one file (`sdk/src/utils/chain-reads.ts`, 18× `@ts-expect-error` for a known viem generic-Abi inference limitation, each individually commented).
- **Tx-flow boilerplate is not duplicated** the way it often is in dapp UIs — only one file calls `waitForTransactionReceipt` directly; submit-state handling appears in just 5 files.

### Findings

9. **Dead GraphQL layer in `sdk`** (biggest finding): `sdk/src/generated/` (`graphql.ts` 2582 lines + `gql.ts`) is imported by *nothing* — queries have fully migrated to event-cache + folds. Yet `npm run build` still runs `codegen` (requiring a live indexer schema?) and `@graphql-codegen/*` remain devDependencies. `machinery.indexerUrl` survives only so `indexer-sync.ts:55` can extract the origin, while its docstring still calls it "the GraphQL indexer". The migration finished but the scaffolding wasn't torn down.
10. **`TestClients` is the production write-path type** (`sdk/src/utils/ethereum.ts:20`): every SDK action takes `clients: TestClients`, and the UI hand-builds it at ~22 call sites across 12+ files with the same double cast (`walletClient: walletClient as any, publicClient: publicClient as any`). Two smells in one: a misleading name for a production type (it sits next to the genuinely-test-only `createTestClients()`), and a repeated cast that belongs in one shared hook (e.g. `useWriteClients()` beside `useMachinery()` in `ui/src/shared/hooks/`). This accounts for most of the ~50 `any`-casts in non-test code.
11. **Accumulated-complexity hotspots in `ui`**: `conceptspace/pages/SettingsPage.tsx` (971 lines, a *single* component with 24 `useState`s — the worst offender); `mutablerefs/MyRefsPage.tsx` (966 lines but internally factored into 13 components — splitting the file would suffice); `content-funding/pages/CreateContractPage.tsx` (849); `delegation/pages/NoteDetailPage.tsx` (786). SDK's big files (`conceptspace/queries.ts` 1375, `eventDecoder.ts` 1256) are mechanical query/decoder collections and less concerning.
12. **Minor naming drift between packages**: ui `mutablerefs/` vs sdk `mutable-refs/`; ui `fundingportal/` vs sdk `fundingportals/`; camelCase `lazyGiving` vs kebab-case everywhere else. Cosmetic, but it defeats grep-by-name across packages.
13. **Small DRY miss**: `truncateAddress` is implemented 4× in `ui` (`delegation/utils.ts` exports one; `CauseLeaderboardPage`, `PrivyWalletButtonImpl`, and `Leaderboard` each hand-roll their own).

### Action items

All recorded in `TODO.md` under "Code-quality cleanups (from project-wide review 2026-06-12)" — 2026-06-12:
- Tear down the dead GraphQL layer in sdk (finding 9)
- Rename `TestClients` + shared `useWriteClients()` hook (finding 10)
- Split `SettingsPage.tsx` (finding 11)
- Consolidate `truncateAddress` (finding 13)
- Naming-drift note (finding 12, cosmetic)

**Overall health (this chunk)**: Good — consistent conventions and contained suppressions; the debt is localized (one dead layer, one mis-named type, a few oversized pages) rather than systemic.
