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
// Eager surface (components used at import time). Today only one component
// crosses the module boundary: `StatementRenderer` (rendered by the
// fundingportals Alignment Explorer to draw a statement from its CID). The rest
// of the component surface (CreateStatementForm, BeliefControls, SupportMetrics,
// StatementSuggestions, the settings sections, …) and the utils are consumed
// only by conceptspace's own pages/components, so they stay module-internal
// until an external consumer actually needs one. Promote a symbol here only when
// a real external caller appears.

export { StatementRenderer } from './components/StatementRenderer'

// Note on pages: the route components (HomePage, BrowseStatementsPage,
// StatementPage, UserProfilePage, SettingsPage) are intentionally NOT
// re-exported here. Domain route wrappers load them directly via dynamic
// `import()` (see domains/tally/manifest.tsx) so each route stays in its own
// code-split chunk; re-exporting them from this eager barrel would collapse
// those chunks. Those deep page imports are the second half of this module's
// public API and map to package *subpath* exports (e.g.
// `@commonality/conceptspace/pages/StatementPage`) once this becomes its own
// package.