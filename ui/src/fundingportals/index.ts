// Public API of the `fundingportals` feature module.
//
// This is a package-boundary declaration (see
// docs/founder/standing-up-a-vertical.md and the `delegation`, `content-funding`,
// and `lazy-giving` modules for the landed pattern): external consumers — other
// feature modules and domain manifests — should import from this barrel ONLY,
// never from deep paths like `fundingportals/components` or
// `fundingportals/utils`. Everything not re-exported here is module-internal
// and may be moved/renamed freely. When this module becomes its own published
// package, this file becomes the package root (`@commonality/fundingportals`).
//
// Eager surface (components used at import time). Today only two components
// cross the module boundary: `FundingPortalSummary` (rendered on the
// conceptspace statement page) and `AlignmentAttestationsSection` (rendered on
// the lazy-giving project-detail page). The rest of the component surface
// (AlignedProjectCard, AlignedProjectsList, AttestAlignmentForm,
// DelegatableNotesSection, SuccessfulProjectsList/Tab, DiscoverySlider, …) and
// all utils are consumed only by fundingportals' own pages/components, so they
// stay module-internal until an external consumer actually needs one. Promote
// a symbol here only when a real external caller appears.

export { FundingPortalSummary } from './components/FundingPortalSummary'
export { AlignmentAttestationsSection } from './components/AlignmentAttestationsSection'

// Note on pages: the route components (StatementFundingPortalPage,
// CauseLeaderboardPage, ExplorerPage) are intentionally NOT re-exported here.
// Domain route wrappers load them directly via dynamic `import()` (see
// domains/alignment/manifest.tsx and domains/tally/manifest.tsx) so each route
// stays in its own code-split chunk; re-exporting them from this eager barrel
// would collapse those chunks. Those deep page imports are the second half of
// this module's public API and map to package *subpath* exports (e.g.
// `@commonality/fundingportals/pages/StatementFundingPortalPage`) once this
// becomes its own package.
