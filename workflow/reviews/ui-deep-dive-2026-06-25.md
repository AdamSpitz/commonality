# UI deep-dive — 2026-06-25

Follow-up to [`piece-by-piece-2026-06-25.md`](./piece-by-piece-2026-06-25.md), dig-deeper candidate #2: *ui — largest piece (59k LOC); assess internal modularity (feature modules vs `domains/` composition vs `shared/`). Does each feature module stand alone?* Same method as the [SDK dive](./sdk-deep-dive-2026-06-25.md): structure + internal import graph + size/test metrics, with targeted reads where a verdict needed evidence.

**Bottom line.** The UI is **internally healthy** and the modular intent is real, not aspirational. The feature modules map one-for-one onto the SDK subsystems and — the key finding — **do not cross-import each other**. Composition flows the right way: `domains/` (8 brand sites) composes the feature modules. The warts are minor and bounded: one small upward layering inversion (7 feature files import `getDomainUrl` from `domains/`), a `shared/` directory that's becoming a flat grab-bag (~30 entries), and a handful of oversized page files (top: `MyRefsPage.tsx` at 954 lines). None is systemic.

---

## Structure

| Layer | LOC | Role |
|---|---:|---|
| `content-funding/` | 4,491 | Feature module — creator/content pages |
| `shared/` | 3,473 | Cross-cutting utils, hooks, components, workers, caches |
| `lazy-giving/` | 3,439 | Feature module — assurance-contract projects |
| `conceptspace/` | 3,113 | Feature module — statements/beliefs/implications |
| `domains/` | 2,735 | Composition layer — 8 brand landing pages + manifests + routing |
| `fundingportals/` | 2,629 | Feature module — cause boards |
| `delegation/` | 2,092 | Feature module — notes/pledges |
| `mutable-refs/` | 955 | Feature module |
| `docs/`, `privy/`, `test/` | <400 | Small support dirs |

Test coverage: 107 test files against 166 source files — strong, consistent with the SDK's discipline.

---

## What's healthy (protect this)

- **Feature modules mirror SDK subsystems one-for-one** (`conceptspace`, `content-funding`, `delegation`, `fundingportals`, `lazy-giving`, `mutable-refs`). The vertical slice is consistent from contract → SDK subsystem → UI feature module. A reviewer who learned the SDK already knows the UI's layout.
- **Feature modules do not cross-import each other.** A scan for any `../<other-feature>/` import across all six modules found **zero** feature-to-feature edges. Each module stands alone on `shared/` + `@commonality/sdk/<subpath>`. This is the single best property and the thing most worth protecting.
- **Composition flows the right direction.** `domains/` imports *down* into features (11 imports of `content-funding`, 2 of `lazy-giving`) to assemble brand sites — exactly what a composition layer should do. Each domain dir (`commonality`, `civility`, `alignment`, `tally`, `conceptspace`, `content-funding`, `lazy-giving`, `delegation`, `common-sense-majority`) is a thin `LandingPage.tsx` + `manifest.tsx`.
- **Clean external boundary** (confirmed by the prior survey): UI depends only on `@commonality/sdk`, and now on its per-subsystem subpaths after the SDK migration.

---

## Issues, ranked

### 1. Feature modules import `getDomainUrl` *upward* from `domains/` — *low effort; the UI analog of the SDK conceptspace inversion*
Seven feature-module files reach up into the composition layer for one symbol — `getDomainUrl` from `domains/domainUrls`:
- `delegation/components/AvailableDelegatableFunding.tsx`
- `fundingportals/pages/StatementFundingPortalPage.tsx`, `fundingportals/components/{AlignedProjectCard,DelegatableNotesSection,SuccessfulProjectsList}.tsx`, `fundingportals/pages/ExplorerPage.tsx`
- `lazy-giving/components/BuyTokensSection.tsx`

`domains/` is supposed to compose features, not be a dependency *of* them. This is the same shape as the SDK's `conceptspace → content-funding` inversion — narrow, one feature that wandered into the wrong layer, not a cycle.

The wrinkle: `getDomainUrl(domainId, path)` is keyed on `DomainId` (from `domains/types.ts`) and resolves a per-brand URL from runtime config. It already depends *down* on `shared/` (`getRuntimeConfig`, `getAppUrl`, link-target helpers). So the cleanest fix is **move, not inject**: relocate `domainUrls.ts` (and likely the `DomainId` type) into `shared/`, since cross-brand URL resolution is a genuine cross-cutting concern that both features and domains legitimately need. `domains/` would then import it from `shared/` like everyone else, and the upward edge disappears.
**Fix:** move `domainUrls.ts` + `DomainId` → `shared/`; update imports (7 feature sites + domains' own). Low risk, mechanical. *Worth confirming `DomainId`'s other consumers before moving it.*

**RESOLVED 2026-06-25.** Moved `domainUrls.ts` → `shared/domainUrls.ts` and defined `DomainId` there (it's the brand enumeration that cross-brand URL resolution and `LinkTarget.domain` both key on). Discovered the inversion was actually *worse* than the survey found: `shared/components/{AppShell,NotFoundPage}.tsx` were *also* importing up into `domains/domainUrls` — i.e. the `shared` substrate depended on the composition layer above it. The move kills both edges.
- `getDomainUrl`/`resolveDomainUrlFromConfig`/`isDomainConfigured`/`resolveLinkHref` + `DomainId` now export from the `shared` barrel; all 17 outside-`shared` consumers import from `…/shared`, the 2 inside-`shared` ones import the sibling directly.
- `domains/types.ts` re-exports `DomainId` from `../shared`, so the ~6 domain-layer test files importing `DomainId from './types'` needed no change.
- `domains/` now has **zero** files imported by feature modules or `shared` — composition flows strictly downward.
- Verified: SDK build + UI typecheck clean; `eslint` 0 errors; domainUrls + all `domains/` tests (207) and all touched feature-module/shared tests (754) pass.

### 2. `shared/` is becoming a flat grab-bag — *medium; coherence/legibility*
`shared/` has ~30 top-level entries mixing several unrelated concerns at one level: routing (`routing.ts`, `chainAddressRoutes.ts`), caches (`foldCache`, `subjectivTrustCache`, `nudgeStore`, `contactStore`), subjectiv-trust computation (`subjectivTrust*`, 5 files + a worker client), runtime/config (`runtimeConfig`, `expectedChain`, `staleBuildRecovery`), currency, theming, plus `components/`, `hooks/`, `utils/`, `workers/` subdirs. It's not wrong, but "shared" is doing a lot of undifferentiated work — the same legibility problem the SDK's flat barrel had (issue #3 there), at smaller scale. The subjectiv-trust cluster (cache + computation + worker client + store) in particular looks like a coherent subsystem hiding inside `shared/`.
**Worth deciding:** whether to group `shared/` into a few named areas (e.g. `shared/routing`, `shared/trust`, `shared/caches`, `shared/config`). Not urgent; it's the main reason "is the shared layer coherent?" is hard to answer yes to today.

**RESOLVED 2026-06-25.** Grouped the ~19 flat top-level files into coherent sub-areas, so `shared/` now reads as a set of named subcomponents instead of a grab-bag:
- `config/` (runtimeConfig, expectedChain, staleBuildRecovery) · `routing/` (routing, domainUrls, linkTypes, chainAddressRoutes) · `currency/` (currency, usePaymentTokenCurrency) · `nudges/` (nudgeStore, csmMediatorNudger) · `stores/` (contactStore, foldCache) · `trust/` (subjectivTrust + computation + cache + workerClient + the worker, which moved out of the now-deleted `workers/`) · `theme/` (themeMode, landingStyles). The by-kind `components/`, `hooks/`, `utils/` dirs were left as-is (already coherent; `components/AppShell` + `components/WalletButton` are pinned by the ESLint deep-import exception, so they couldn't move anyway).
- **Public surface unchanged.** Everything still flows through the single `shared` barrel (`src/shared/index.ts`), now itself reorganized so its export blocks mirror the subdirectories. Because external consumers only import the barrel, *zero* feature-module imports changed — the reorg was contained to `shared/` internals + a handful of test files that deep-mock shared modules (`vi.mock('…/shared/runtimeConfig')` etc., updated to the new paths).
- The subjectiv-trust worker `new URL('./subjectivTrustWorker.ts', import.meta.url)` was updated for its new sibling location.
- Verified: SDK build + UI typecheck clean; `eslint` 0 errors; **full UI suite 1745/1745 pass** (the trust worker + cross-domain routing paths exercised).

### 3. A handful of oversized page/component files — *low; readability*
Top non-test files: `mutable-refs/MyRefsPage.tsx` (954), `content-funding/pages/CreateContractPage.tsx` (834), `delegation/pages/NoteDetailPage.tsx` (778), `content-funding/pages/ChannelPage.tsx` (629), `delegation/pages/MyNotesPage.tsx` (569), `content-funding/components/ContentAttestationSummary.tsx` (556). These are the UI's "big files" analog to `conceptspace/queries.ts`. Each is a single page so it's not a coherence violation, but the largest few likely have extractable sub-sections (forms, list rows, modals). Worth a glance at `MyRefsPage` specifically — 954 lines for one page is the standout.

**NOTED 2026-06-25 (not refactored, by request).** Left a `REFACTOR-WANTED` header comment at the top of all six files naming the likely extraction seams and pointing back to this issue. No code was restructured — the split happens when someone next does substantial work in each file.

---

## Suggested next actions

1. **Now (mechanical):** move `domainUrls.ts` (+ `DomainId`) into `shared/` to kill the upward edge (#1). Mirrors the SDK conceptspace fix; low blast radius.
2. **Deliberate:** decide whether to sub-group `shared/` (#2). Coherence win, no urgency.
3. **Opportunistic:** split the largest page files when next touched (#3); start with `MyRefsPage.tsx`.

*Verdicts from the internal import graph + size/test metrics, plus targeted reads of `domains/domainUrls.ts`, the `domains/` subdir shapes, and the feature/domains import edges. Line-level correctness of components and hooks was out of scope for this pass.*
