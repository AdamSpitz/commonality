// Public API of the `lazy-giving` feature module.
//
// This is a package-boundary declaration (see
// docs/founder/standing-up-a-vertical.md and the `delegation` and
// `content-funding` modules for the landed pattern): external consumers — other
// feature modules and domain manifests — should import from this barrel ONLY,
// never from deep paths like `lazy-giving/utils` or `lazy-giving/components/...`.
// Everything not re-exported here is module-internal and may be moved/renamed
// freely. When this module becomes its own published package, this file becomes
// the package root (`@commonality/lazy-giving`).
//
// Eager surface (utils used at import time). The project-status helpers are
// shared with `fundingportals`, which renders aligned-project cards on cause
// boards; the component surface (BuyTokensSection, ProjectHeader, Leaderboard,
// …) is module-internal today — those are only consumed by lazy-giving's own
// pages/landing, so they are not part of the public contract yet. Promote a
// component here only when an external consumer actually needs it.

export {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeDeadline,
  type ProjectStatus,
} from './utils'

// Note on pages: the route components (BrowseProjectsPage, CreateProjectPage,
// ProjectDetailPage) are intentionally NOT re-exported here. Domain route
// wrappers load them directly (see domains/lazy-giving/manifest.tsx and the
// content-funding/civility ContentPages wrappers) so each route stays in its
// own code-split chunk; re-exporting them from this eager barrel would collapse
// those chunks. Those deep page imports are the second half of this module's
// public API and map to package *subpath* exports (e.g.
// `@commonality/lazy-giving/pages/ProjectDetailPage`) once this becomes its own
// package.
