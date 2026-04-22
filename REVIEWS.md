# General stuff to review every so often

I'm worried about this code base getting away from me. So let's try doing regular reviews of various components or aspects of the code base.

## Skills to use

Use the `project-wide-reviewer` skill, or whichever specific skills (mentioned inside the `project-wide-reviewer` skill) are relevant.

## Most recent reviews

## Review — 2026-04-22

**Scope**: First-ever project-wide review. Full codebase in scope (~1174 commits total; ~306 since April 2026 — a large burst covering the entire AI services ecosystem, nudge UX, content funding, multi-domain UI, trust network, and more).

**Chunks completed**:
- [x] Orientation + scope setting (this session)
- [x] Architecture coherence (quick pass)
- [x] Documentation completeness (quick pass)
- [x] Test coverage (breadth check)
- [x] Tech debt scan

**Chunks remaining** (for future review sessions):
- [ ] Smart contract audit pass (see TODO.md — this is flagged as a user task)
- [ ] Deeper UI code quality: pubstarter/delegation/fundingportal pages (not touched much recently)
- [ ] Indexer code quality (thin but worth a pass)
- [ ] SDK query/fold complexity — are there any abstraction opportunities?
- [ ] Security: AI service API exposure, rate limiting, authentication patterns
- [ ] Dependency freshness (check for stale/deprecated packages)

**Commits since last review**: ~1174 (first review; entire codebase is scope)

---

### Architecture coherence

**Overall: Good.** The client-side folding pattern is consistently applied across all subsystems. The AI services ecosystem (attesters, finders, nudgers, explorer-curator) follows a clean layered pattern with shared core libraries (attester-core, finder-core, nudger-core). Dependency injection for testability is used consistently across new AI service packages.

No circular dependencies observed. The monorepo workspace setup is well-structured; all new packages are correctly registered.

One minor note: `render.yaml` only defines the `commonality-attester` service. The 6+ newer services (bridge-creator, implication-graph-nudger, explorer-curator, content-finder, platform-api-service, etc.) are not in render.yaml. This is fine for now (not deployed yet), but will need attention before any of these go to production.

---

### Documentation completeness

**Some gaps to address:**

1. **UI README stale "Placeholder pages" entry** — `ui/README.md` still lists `BrowseStatementsPage` and `SettingsPage` as placeholder pages. `SettingsPage` is now 697 lines of real functionality (nudger settings, trust settings, intensity, muted topics, muted nudgers). `BrowseStatementsPage` is 187 lines. This note should be updated.

2. **DEPLOYMENT.md covers only the implication-attester** — The guide mentions "AI Attester Service" as one of the deployable components but lists no deployment instructions for the newer AI services (implication-graph-nudger, bridge-creator, explorer-curator, content-finder, content-attester, platform-api-service). Since the project hasn't deployed yet this isn't urgent, but DEPLOYMENT.md will need significant expansion before launch.

3. **render.yaml is incomplete** — Only `commonality-attester` is defined. Before deploying other services, render.yaml will need entries for each.

---

### Code quality patterns

**Good.** Very few in-code TODOs (only 2, both in `sdk/src/utils/twitter.ts` — one about switching to the real Twitter API, one about ENS verification). No FIXMEs or HACKs found in any source files.

UI code is organized cleanly: feature modules (conceptspace, pubstarter, delegation, fundingportal, content-funding) with shared utilities in `src/shared/`. Hooks are appropriately small and single-purpose.

The nudger preference hooks (useMutedTopics, useMutedNudgers, useNudgeIntensity, useTrustedNudgers) are consistent with each other and with the foldCache/subjectivTrustCache patterns.

---

### Test coverage

**Broadly adequate.** All major subsystems have tests:
- SDK: unit + integration tests
- Hardhat: smart contract tests
- Integration tests: cross-subsystem e2e
- UI: ~731 tests covering pages, components, hooks
- AI services: mocha tests for evaluators, finders, nudgers, explorer-curator

**Potential gaps (not verified, just noted for future investigation):**
- `implication-graph-nudger` has only `config.test.ts` — the nudger logic itself (`nudger.ts`) appears untested
- `content-finder` has only `submissions.test.ts` — the main finder loop logic may be untested
- `attester-core` has tests for errors, http, payment, and rate limiting but it's unclear if the core attester runner is tested

These are worth a deeper look in a future review chunk.

---

### Tech debt

**Low.** The codebase is in good shape. Main items:

1. **`foldVersion` wiring** (from TODO.md) — `useCachedProject` is wired for projects, but `BrowseProjectsPage` and `ProjectDetailPage` don't use it. The indexer spec says this is fine until fold latency becomes noticeable. Keep deferring.

2. **Twitter API** — `sdk/src/utils/twitter.ts` has a TODO to switch to the real Twitter API. Not urgent.

3. **ENS** — `sdk/src/utils/twitter.ts` has a TODO for ENS verification status. Matches TODO.md item about getting ENS names.

---

**Action items**:
- [ ] Fix UI README: remove "Placeholder pages" entry for BrowseStatementsPage and SettingsPage; update the components list to reflect current state
- [ ] (Future review chunk) Check implication-graph-nudger nudger.ts for test coverage
- [ ] (Future review chunk) Check content-finder main loop for test coverage
- [ ] (Pre-launch) Expand DEPLOYMENT.md to cover all AI services + render.yaml entries

**Overall health**: Good. The codebase is well-organized, consistently structured, and has good test coverage across its major components. The main concerns are documentation staleness (UI README, DEPLOYMENT.md) rather than code quality. The AI services ecosystem that's been built over the past sessions is coherent and follows established patterns.

