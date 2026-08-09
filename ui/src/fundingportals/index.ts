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
// Eager surface (components used at import time).
// - FundingPortalSummary — conceptspace statement page
// - AlignmentAttestationsSection — lazy-giving project-detail page
// - CauseBoard / CauseLeaderboard — Aligning routes + CauseStarter host
// Remaining components stay module-internal until an external consumer needs them.

export { FundingPortalSummary } from './components/FundingPortalSummary'
export { AlignmentAttestationsSection } from './components/AlignmentAttestationsSection'
export { CauseBoard } from './components/CauseBoard'
export type { CauseBoardProps, CauseBoardNavLink } from './components/CauseBoard'
export { CauseLeaderboard } from './components/CauseLeaderboard'
export type { CauseLeaderboardProps } from './components/CauseLeaderboard'
export { DelegatableNotesSection } from './components/DelegatableNotesSection'
export type { DelegatableNotesSectionProps } from './components/DelegatableNotesSection'

// Note on pages: the route components (StatementFundingPortalPage,
// CauseLeaderboardPage, ExplorerPage) are intentionally NOT re-exported here.
// Domain route wrappers load them directly via dynamic `import()` (see
// domains/alignment/manifest.tsx and domains/tally/manifest.tsx) so each route
// stays in its own code-split chunk; re-exporting them from this eager barrel
// would collapse those chunks. Those deep page imports are the second half of
// this module's public API and map to package *subpath* exports (e.g.
// `@commonality/fundingportals/pages/StatementFundingPortalPage`) once this
// becomes its own package.
