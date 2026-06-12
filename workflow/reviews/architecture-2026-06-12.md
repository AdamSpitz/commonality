# Project-wide review — started 2026-06-12

**Scope**: Full project-wide review (requested as "architectural review of the entire system"). Chunked per the `project-wide-reviewer` skill; this file tracks all chunks.

**Commits since last review** (before-testnet.md, 2026-05-22): ~316, concentrated in `verifier` (new QA workspace), `ui`, `docs`, `specs`.

## Chunk plan

- [x] Orientation + scope setting (2026-06-12)
- [x] Architecture coherence (2026-06-12, this session)
- [x] Code quality patterns (2026-06-12)
- [x] Verifier workspace review (2026-06-12, this session)
- [x] Documentation completeness (2026-06-12)
- [x] Test coverage (2026-06-12)
- [x] Tech debt (2026-06-12, this session)
- [ ] Previous action items (before-testnet.md items 4–6: caching verification on testnet, USDC symbol check, wallet-connected smoke test)
- [ ] Synthesis

**How to continue (notes for a fresh LLM):** Use the `project-wide-reviewer` skill. Pick the next unchecked chunk above, review just that chunk, append a `## Chunk: …` section in this file (continue the finding numbering — last used: 23), check the box here, and record any actionable work in `TODO.md` (don't fix things mid-review beyond trivia). Context that will save you time: previous review is `workflow/reviews/before-testnet.md`; the verifier root report (`npm run verifier:report`) is the project's authoritative health view and is honestly red (see verifier chunk); for tech debt, note that finding 9 (dead GraphQL layer) already covers sdk dependency staleness's biggest item, and TODO.md already carries the review's accumulated cleanup items (don't re-list them — look for *untracked* debt: TODOs/FIXMEs/HACKs in code, stale deps, root clutter); for previous action items, before-testnet.md items 4–6 (caching verification, USDC symbol, wallet-connected smoke test) need a deployed-testnet session — if they can't be done locally, record that disposition rather than silently skipping. When all chunks are done, the Synthesis chunk should compile an overall summary at the top of this file and update `workflow/reviews/` conventions if any (check whether a reviews index exists).

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

## Chunk: Documentation completeness (2026-06-12)

Covered the README chain, role docs, package READMEs, workflow docs, and specs-vs-reality drift. The verifier's docs facet (`review.docs-coherence` + `review.docs-broken-refs`) already audits a 60+-file docs surface continuously, so this chunk's job was partly to audit the auditor.

### What's healthy

- **README coverage is complete**: all 17+ workspace packages have a README, sized sensibly (core libs ~15 lines; complex packages like `fake-data-generation` 528 lines). The top-level README → role docs → workflow docs navigation chain is coherent and all role-doc links resolve.
- **The big docs are current.** `workflow/local-development.md` matches reality (services.sh/data.sh flow, eight-domain IPFS publish, wipe semantics); `sdk/README.md` describes the event-cache+folds architecture with no GraphQL residue (the drift is only in the `indexerUrl` docstring, already finding 9); `CONTINUITY.md` is actively maintained with high-quality entries.
- **Recent cleanup already happened**: d4914797 (this morning) pruned stale spec versions (`ui-domains-may*.md`), old ai-critiques, and fixed cross-references — the specs-vs-reality drift the chunk plan worried about was largely already addressed.
- **`review.docs-broken-refs` passes**: all relative links in the docs surface resolve.

### Findings

14. **The verifier's `review.docs-coherence` check produces false positives** (the meta-finding of this chunk): of its 5 current findings, the two most severe are wrong — `verifier:state` *is* a real npm script (alias of `verifier:root`, in package.json since Jun 3) and `.env.secrets.example` *does* exist (tracked since Jun 1), both predating the check's Jun 11 run. Root cause: the check's input surface is markdown-only, so the LLM can't verify script names or file existence and infers staleness from cross-doc inconsistency. Recorded a mechanical fix (pre-verify script/file references like `checkBrokenRefs` does for links) in `verifier/PLAN.md` P2. Practical consequence: treat docs-coherence findings as leads to verify, not facts — and the root report's docs-fix item 4 is partly moot.
15. **Absolute `/home/adam/...` paths in docs** (the docs-coherence finding that *was* real): 8 links in `workflow/build.md` and 2 in `specs/tech/subsystems/conceptspace/seed-content/README.md` — **fixed 2026-06-12** (now repo-root-relative). The crontab example in `verifier/TOO-VERBOSE-README.md` keeps its literal path (it's an operator-machine crontab line; that doc is already acknowledged debt).
16. **`verifier:state`/`verifier:pr` aliases were undocumented** — deployment.md and verifier/testing-plan.md use `verifier:state` while the developer role doc only documented `verifier:status`, which is what misled the docs-coherence LLM. **Fixed 2026-06-12**: aliases now noted in `workflow/roles/developer.md`.
17. **Terminology drift "funding portal" vs "cause board" is real**: `specs/product/ui-domains.md` standardizes on "cause board" but `docs/end-user/` (22 files) and UI copy say "funding portal" throughout. Investigation showed the rename was *started but never finished*: domain landing pages/manifests (alignment, CSM) say "cause board", but the fundingportal/conceptspace/civility/content-funding page copy and the end-user docs don't — `ExplorerPage.tsx` even uses both terms. **Adam ruled 2026-06-12: "cause board" wins** (user-facing copy only; code identifiers/routes/dirs keep `fundingportal*`). Specific file list recorded in `TODO.md` ("Finish the funding portal → cause board rename").

### Action items

- [x] Fix absolute paths in build.md + seed-content README — done 2026-06-12
- [x] Document `verifier:state`/`verifier:pr` aliases in developer.md — done 2026-06-12
- [x] Record docs-coherence false-positive fix in verifier/PLAN.md P2 — done 2026-06-12
- [x] Update stale reviews-index entry in workflow/reviews/README.md — done 2026-06-12
- [x] Terminology unification (finding 17): Adam chose "cause board"; specific sweep recorded in TODO.md — 2026-06-12

**Overall health (this chunk)**: Good — docs coverage is unusually complete for a project this size and the navigation chain works; the notable issue is that the automated docs *auditor* needs ground truth, not that the docs themselves are rotten.

## Chunk: Test coverage (2026-06-12)

Per the chunk plan, started from the verifier's coverage layer rather than re-deriving coverage: 8 `coverage.*` checks (domains, pages, readiness, testing-plan, ui-test-plan, validation-roster, workflows, guarded-check-policy), all currently **pass** — where "pass" means *the map reconciles with reality*, not *coverage is complete*. The chunk's two jobs were (a) a broad adequacy judgment and (b) checking whether the maps are honest.

### What's healthy

- **The maps are honest** (the main thing this chunk needed to establish). `coverage/testing-plan-items.json` maps 13 release-confidence dimensions and openly carries **7 known gaps**, each with severity, owner, `lastReviewed`/`reviewAfterDays`, `nextAction`, and a target confidence tier. `coverage.readiness` rolls these up correctly: 6 open gaps before release-candidate (smart-contract leaf granularity, indexer reset/reorg canaries, degradation automation, performance thresholds, SDK invariant promotion, environment checks), 2 more before full-launch (AI-service golden corpora, manual-plan backlog). Spot-checks confirm the mechanical claims: `coverage.ui-test-plan` verifies all 42 referenced UI test files exist across 39 route rows; the 14 Playwright e2e specs claimed in the map exist in `ui/e2e/`; the readiness gap list matches the map exactly.
- **The test pyramid exists at every level**: contracts (39 Hardhat test files over a substantial contract surface, plus Slither), sdk (17 colocated test files / ~5.4k lines covering **all 8 subsystems** plus the utils), ui (98 unit/integration test files + 14 e2e specs), integration-tests (54 files), platform-api-service (20 test files for 11 source files), and the AI services each have colocated tests (beat-agent 16, bridge-creator 11, etc.).
- **Indexer's 0 unit tests are by design and honestly mapped**: it's the thin event cache (Client-Side Folding), exercised indirectly by `integration-tests` and `automated.indexer-integrity-canaries` (replay/resume/idempotent-duplicate folds); the map flags reset/reorg and live-replay as a *high-severity open gap* rather than pretending it's covered.
- **The verifier's own checks are tested via `known-bad.*` fixtures** (verifier-of-verifier), not unit tests — appropriate for subprocess-emits-JSON checks.

### Findings

18. **Adequacy verdict: broadly adequate for the current (pre-testnet) stage, and no deeper test-coverage audit is warranted** — the verifier's readiness tiers *are* that deeper audit, continuously. The genuine gaps are exactly the 6 release-candidate items in `coverage.readiness`; nothing new to add to them. Anyone asking "is coverage good enough to ship?" should read that check's output, not run a coverage tool.
19. **The adequacy claim is conditional on `automated.test-full` going green again** — it's currently red (1 failing suite, run 2026-06-11), already item 3 of the root report's priority list (see verifier chunk, finding 6 context). Tests that exist but fail don't count as coverage. Nothing new to track; just noting the dependency.
20. **Dev tooling is essentially untested and outside the maps' scope**: `fake-data-generation` (2 test files / 26 source), `scripts/` (0/16), `cloudflare-*-gateway` (1 trivial test each). The testing-plan map's scope statement excludes these, which is a reasonable disposition for dev tools — the gateways are exercised by deployment smoke checks — but recording it here so a future reviewer doesn't mistake the omission for an oversight. No action needed.

### Action items

- (none new — every real gap found is already a tracked open item in `verifier/coverage/testing-plan-items.json` with an owner and next action; duplicating them into TODO.md would violate the category separation noted in the verifier chunk)

**Overall health (this chunk)**: Good — coverage is broadly adequate and, more importantly, the project's coverage *accounting* is trustworthy: gaps are enumerated with severities and tiers rather than hidden.

## Chunk: Tech debt (2026-06-12)

Scope per the continuity notes: *untracked* debt only — code markers, dependency staleness, root clutter. (TODO.md and verifier/PLAN.md already carry the review's accumulated items; finding 9 already covers the sdk's biggest stale-dep item.)

### What's healthy

- **Code-marker debt is essentially zero.** One TODO in the entire non-test codebase (`sdk/src/utils/twitter.ts:105`, "check ENS verification status"); no FIXMEs, no HACKs. Shortcuts in this project get written into TODO.md/PLAN.md/coverage maps rather than left as comments — consistent with the category-separation discipline the verifier chunk observed.
- **Within-major dependency drift is small** (`npm outdated` wanted-vs-current is mostly patch-level), and the workspace pins are consistent across the 17+ packages (same eslint/@types/node/etc. everywhere).
- **Root-level markdown is mostly deliberate**: `TODO.md`, `inbox.md`, `CONTINUITY.md`, `testnet-prep.md` are all referenced by workflow docs and/or verifier checks (`meta.backlog-reminder`, `review.docs-coherence`).

### Findings

21. **`npm audit`: 79 vulns (2 critical, 15 high), and most of the direct-dependency ones are cheap to fix**: vitest <3.2.6 (critical, UI-server file read/exec — dev-time), vite ≤7.3.1 (high, path traversal; fix 7.3.5 non-major), react-router-dom (high, fixable), shell-quote (critical, transitive, fixable). A plain `npm audit fix` clears the worst of these without semver-major changes. The ponder "high" is a semver-range artifact (suggested fix is ponder@0.0.1 — ignore). These are dev-server-facing, not production-deploy-facing, so urgency is moderate — but there is **no verifier check covering dependency audit/staleness**, so nothing would have surfaced this; recorded a candidate `automated.dependency-audit` check in `verifier/PLAN.md`.
22. **Major-version lag is real but looks deliberate, with one decision worth making explicitly**: hardhat 2.28→3.x (whole toolbox/ignition stack, a genuine migration project), MUI 7→9, eslint 9→10, vitest 3→4, vite 7→8, TypeScript 5.9→6.0, express 4→5, mocha 10→11, ponder 0.15→0.16. None block testnet. The one to decide deliberately (rather than drift into) is **hardhat 3 before mainnet** — recorded in TODO.md. The `@graphql-codegen/*` staleness disappears with finding 9's teardown.
23. **Root-directory clutter** (the genuinely untracked debt):
    - `fable-critique.md` (42K, Jun 11, tracked, referenced by nothing) — the successor to the `ai-critiques/` directory that d4914797 deleted this morning. It's recent active reading, so disposition is Adam's: digest into inbox/TODO then archive or delete.
    - `testnet-verifier-todo.md` (16K, tracked) — implementation tracker whose "Done" list is complete; the 5 open boxes are live-environment runs (funded verifier wallet, guarded testnet checks) already echoed in CONTINUITY.md. Candidate: fold the open items into `verifier/PLAN.md` and delete the file.
    - Stale untracked dirs `output/` (empty, Apr 23) and `test-results/` (one Playwright artifact, May 4) — **removed 2026-06-12**.
    - `.codex` — empty tracked file accidentally committed in ced714a5 (Apr 1, unrelated contract change) — **removed 2026-06-12**.
    - `tmp/` holds ~20 accumulated debug scripts (render-* probes, logs). Gitignored, and some may still be useful for testnet ops, but CLAUDE.md says clean these up when done; worth a sweep next time someone confirms they're obsolete.

### Action items

- [x] Remove `output/`, `test-results/`, `.codex` — done 2026-06-12
- [ ] Run `npm audit fix` (non-breaking) — recorded in TODO.md
- [ ] Verifier candidate check `automated.dependency-audit` — recorded in verifier/PLAN.md
- [ ] Decide hardhat 2→3 migration timing before mainnet — recorded in TODO.md
- [ ] Disposition of `fable-critique.md` (Adam) and `testnet-verifier-todo.md` (fold into PLAN.md) — recorded in inbox.md / TODO.md respectively

**Overall health (this chunk)**: Good — almost no hidden debt; the debt that exists is *recorded* debt. The only blind spot found was the absence of any automated dependency-audit signal.

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
