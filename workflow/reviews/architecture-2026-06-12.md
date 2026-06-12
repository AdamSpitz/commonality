# Project-wide review — started 2026-06-12

**Scope**: Full project-wide review (requested as "architectural review of the entire system"). Chunked per the `project-wide-reviewer` skill; this file tracks all chunks.

**Commits since last review** (before-testnet.md, 2026-05-22): ~316, concentrated in `verifier` (new QA workspace), `ui`, `docs`, `specs`.

## Chunk plan

- [x] Orientation + scope setting (2026-06-12)
- [x] Architecture coherence (2026-06-12, this session)
- [ ] Code quality patterns (recurring smells, consistency, accumulated complexity — esp. `ui` and `sdk`, the biggest packages)
- [ ] Verifier workspace review (biggest new subsystem since last review; check structure, doc accuracy, whether testing-plan.md/manual-validation-plan.md should be absorbed per verifier/README.md's own suggestion)
- [ ] Documentation completeness (README chain, role docs, specs vs. reality drift)
- [ ] Test coverage (broad adequacy check)
- [ ] Tech debt (TODOs/FIXMEs, dependency staleness, root-directory clutter)
- [ ] Previous action items (before-testnet.md items 4–6: caching verification on testnet, USDC symbol check, wallet-connected smoke test)
- [ ] Synthesis

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
