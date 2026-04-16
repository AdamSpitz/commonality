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

### What's Left

**Phase 3**: Specialize content-funding into two branded surfaces
- Keep `content-funding` implementation as shared base
- Add Content Funding domain surface (branded wrapper)
- Layer Noninflammatory Content with attestation-focused views

**Phase 4**: Add Common Sense Majority on top
- Build movement landing page and basic organizing surfaces
- Reuse Noninflammatory Content + Commonality funding

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
- Cross-domain builds/URLs are still not implemented; the current landing pages describe focused domains within the shared app, but there is not yet a domain-aware link abstraction
- Phase 3 should focus on specialized content-funding and noninflammatory route surfaces, not on redoing the phase-2 landing-page work
