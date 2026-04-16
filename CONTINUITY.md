# Continuity notes for ephemeral AI instances

## Current Work: Multiple UI Domains Reorganization

### Completed: Phase 1

**Domain manifests and route composition** - Done ✓

Key files created/modified:
- `ui/src/domains/types.ts` - Domain type definitions
- `ui/src/domains/commonality/manifest.tsx` - Commonality manifest (full feature set)
- `ui/src/domains/content-funding/manifest.tsx` - Content Funding manifest
- `ui/src/domains/noninflammatory/manifest.tsx` - Noninflammatory Content manifest
- `ui/src/domains/movement/manifest.tsx` - Common Sense Majority manifest
- `ui/src/domains/index.ts` - Domain registry and VITE_DOMAIN resolution
- `ui/src/App.tsx` - Refactored to use manifest-based composition
- `ui/src/shared/components/AppShell.tsx` - Updated to accept configurable branding/navigation

**How to build a specific domain:**
```bash
VITE_DOMAIN=noninflammatory npm run build  # builds noninflammatory site
VITE_DOMAIN=content-funding npm run build  # builds content-funding site
VITE_DOMAIN=movement npm run build         # builds common-sense-majority site
VITE_DOMAIN=commonality npm run build     # builds commonality (default)
```

### Completed: Phase 2

**Split landing pages from feature modules** - Done ✓

Key files created/modified:
- `ui/src/domains/components/DomainLandingPage.tsx` - Shared landing-page primitive for domain hero/actions/section cards
- `ui/src/domains/commonality/LandingPage.tsx` - Commonality root landing page
- `ui/src/domains/content-funding/LandingPage.tsx` - Content Funding root landing page
- `ui/src/domains/noninflammatory/LandingPage.tsx` - Noninflammatory Content root landing page
- `ui/src/domains/movement/LandingPage.tsx` - Common Sense Majority root landing page
- `ui/src/domains/commonality/manifest.tsx` - `/` now renders `CommonalityLandingPage`; old conceptspace `HomePage` moved to `/start`
- `ui/src/domains/content-funding/manifest.tsx` - `/` now renders `ContentFundingLandingPage`
- `ui/src/domains/noninflammatory/manifest.tsx` - `/` now renders `NoninflammatoryLandingPage`
- `ui/src/domains/movement/manifest.tsx` - `/` now renders `MovementLandingPage`
- `ui/src/domains/domainRoutes.test.tsx` - Verifies each domain manifest resolves `/` to its own landing page

**What Phase 2 actually changed:**
- Each domain now owns its landing page under `ui/src/domains/<domain>/`
- Root routes are no longer borrowed from feature modules like `conceptspace/HomePage` or `content-funding/CreatorsLandingPage`
- Commonality now has the platform-level default home for the full system
- Existing feature routes remain intact; phase 2 changed composition, not the underlying content-funding/conceptspace implementations
- Commonality keeps the previous conceptspace home available at `/start`

**Validation run:**
```bash
npm test --workspace=ui -- domainRoutes.test.tsx
npm run build --workspace=ui
```

**Current state after Phase 2:**
- Phase 1 and Phase 2 are complete
- The manifests now support domain-owned landing pages plus shared feature routes
- Content Funding and Noninflammatory still share the same underlying content-funding route implementations below the landing page level
- Phase 3 is the next real chunk: specialize those branded surfaces without duplicating the shared `content-funding` implementation

### Completed: Phase 3

**Specialize content-funding into two branded surfaces** - Done ✓

Key files created/modified:
- `ui/src/content-funding/pages/CreatorsLandingPage.tsx` - shared landing page now accepts per-domain copy/CTA overrides
- `ui/src/content-funding/pages/BrowseCreatorsPage.tsx` - shared browse page now accepts per-domain headline/description overrides
- `ui/src/content-funding/pages/ChannelPage.tsx` - shared channel page now supports branded campaign copy plus domain-local contract links
- `ui/src/content-funding/pages/CreateContractPage.tsx` - shared contract-creation flow now supports branded framing and branded post-create links
- `ui/src/content-funding/pages/CreatorDashboardPage.tsx` - shared creator dashboard now supports branded headings/descriptions/empty states
- `ui/src/domains/content-funding/ContentPages.tsx` - Content Funding wrappers and in-domain contract view
- `ui/src/domains/noninflammatory/ContentPages.tsx` - Noninflammatory wrappers, in-domain contract view, and dedicated about page
- `ui/src/domains/content-funding/manifest.tsx` - content-funding routes now use branded wrappers plus `/content/contracts/:projectAddress`
- `ui/src/domains/noninflammatory/manifest.tsx` - noninflammatory routes now use branded wrappers plus `/content/contracts/:projectAddress` and `/about`
- `ui/src/domains/domainRoutes.test.tsx` - route coverage now includes the noninflammatory about page
- `ui/src/domains/content-funding/ContentPages.test.tsx` - wrapper-copy coverage for Content Funding
- `ui/src/domains/noninflammatory/ContentPages.test.tsx` - wrapper-copy coverage for Noninflammatory
- `specs/multiple-ui-domains.md` - Phase 3 marked done in the plan

**What Phase 3 actually changed:**
- Content Funding and Noninflammatory still reuse the same `content-funding` logic, but now route through domain-owned wrapper components instead of the same generic page instances
- Both domains now have their own branded contract route at `/content/contracts/:projectAddress`, so contract links stay inside the focused surface instead of dropping users into generic `/projects/...`
- Noninflammatory now has its own `/about` page rather than reusing the generic creators page
- The specialization is still UI-level composition; no duplication of the underlying fetch/fold/contract logic was introduced

**Validation run:**
```bash
npm test --workspace=ui -- domainRoutes.test.tsx ContentPages.test.tsx
npm run build --workspace=ui
```

**Current state after Phase 3:**
- Phase 1, Phase 2, and Phase 3 are complete
- The content-focused domains now have distinct branded surfaces and canonical in-domain contract links
- The remaining reorganization work is Phase 4 (movement layering) and Phase 5 (separate build outputs)

### Completed: Phase 4

**Add Common Sense Majority on top of the Noninflammatory foundation** - Done ✓

Key files created/modified:
- `ui/src/domains/movement/MovementPages.tsx` - movement-owned wrappers for content, contracts, organizing playbook, and project funding surfaces
- `ui/src/domains/movement/manifest.tsx` - movement routes now point at movement-owned wrappers plus `/about` and `/organize`
- `ui/src/domains/movement/LandingPage.tsx` - landing page now pushes users into a dedicated organizing playbook
- `ui/src/domains/movement/MovementPages.test.tsx` - wrapper-copy coverage for movement content surfaces
- `ui/src/domains/domainRoutes.test.tsx` - route coverage for movement `/about` and `/organize`
- `specs/multiple-ui-domains.md` - Phase 4 marked done in the plan

**What Phase 4 actually changed:**
- The movement domain is no longer just a landing page plus generic shared routes; it now owns wrapper surfaces for its content and project flows
- Movement content reuses the content-funding base, but contract links now stay inside the movement domain at `/content/contracts/:projectAddress`
- Movement project browsing/creation/detail views now layer organizing-specific framing on top of the shared pubstarter implementation
- The movement domain now has two static movement-specific pages: `/about` and `/organize`

**Validation run:**
```bash
npm test --workspace=ui -- domainRoutes.test.tsx MovementPages.test.tsx
npm run build --workspace=ui
```

**Current state after Phase 4:**
- Phase 1, Phase 2, Phase 3, and Phase 4 are complete
- All four domains now have domain-owned landing/surface composition while still reusing shared feature implementations underneath
- Remaining reorganization work is Phase 5: separate build outputs from the manifests

### What's Left

**Phase 5**: Package separate builds from manifests
- Parameterize Vite build output by domain

### Architecture Notes

- Domain manifests define: branding, shell/nav config, feature flags, routes, base path
- `App.tsx` calls `getActiveDomain()` which reads `VITE_DOMAIN` env var
- AppShell accepts optional `branding` and `navigation` props (uses defaults if missing)
- Routes in manifests are ReactNode (using `<Route>` components), not RouteObject[]
- Feature modules stay in place: `conceptspace`, `pubstarter`, `delegation`, `fundingportal`, `content-funding`, `mutablerefs`, `shared`

### Key Technical Details

- Default domain is `commonality` if VITE_DOMAIN not set
- Domain landing pages now exist at `ui/src/domains/<domain>/LandingPage.tsx` and are wired from each manifest's `/` route
- `DomainLandingPage.tsx` is the shared primitive for hero copy, CTA buttons, and entry-point cards
- Content Funding and Noninflammatory now each own wrapper components in `ui/src/domains/<domain>/ContentPages.tsx` while reusing the shared `ui/src/content-funding/pages/*` implementations underneath
- Movement now owns wrapper components in `ui/src/domains/movement/MovementPages.tsx` for both the content layer and the organizing/project layer
- Domain-local contract viewing currently uses `/content/contracts/:projectAddress` on the focused content domains, including movement; separate origins/build outputs are still phase-5 work
