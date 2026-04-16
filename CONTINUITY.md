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

### What's Left

**Phase 2**: Split landing pages from feature modules
- Add domain landing pages under `ui/src/domains/<domain>/`
- Each landing page emphasizes the right entry points for that domain

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
- The domains system is ready for Phase 2 landing pages
- Landing pages should be added as `<domain>/LandingPage.tsx` and referenced in manifest
- Cross-domain linking infrastructure not yet implemented (Phase 2-4 will add landing pages with appropriate links)
