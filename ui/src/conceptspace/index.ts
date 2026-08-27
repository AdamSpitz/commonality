// Public API of the `conceptspace` feature module.
//
// This is a package-boundary declaration (see
// docs/founder/standing-up-a-vertical.md and the `delegation`, `content-funding`,
// `lazy-giving`, and `fundingportals` modules for the landed pattern): external
// consumers — other feature modules and domain manifests — should import from
// this barrel ONLY, never from deep paths like `conceptspace/components` or
// `conceptspace/pages/...`. Everything not re-exported here is module-internal
// and may be moved/renamed freely. When this module becomes its own published
// package, this file becomes the package root (`@commonality/conceptspace`).
//
// Eager surface (components used at import time). External callers today:
// `StatementRenderer` (fundingportals Alignment Explorer) and the settings
// sections (CauseStarter SettingsPage). Other components stay module-internal.

export { StatementRenderer } from './components/StatementRenderer'
export { DirectTrustSettingsSection } from './components/DirectTrustSettingsSection'
export { NudgerSettingsSection } from './components/settings/NudgerSettingsSection'

// Note on pages: the route components (HomePage, BrowseStatementsPage,
// StatementPage, UserProfilePage, SettingsPage) are intentionally NOT
// re-exported here. Domain route wrappers load them directly via dynamic
// `import()` (see domains/tally/manifest.tsx) so each route stays in its own
// code-split chunk; re-exporting them from this eager barrel would collapse
// those chunks. Those deep page imports are the second half of this module's
// public API and map to package *subpath* exports (e.g.
// `@commonality/conceptspace/pages/StatementPage`) once this becomes its own
// package.
