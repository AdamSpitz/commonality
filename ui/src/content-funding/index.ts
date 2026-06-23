// Public API of the `content-funding` feature module.
//
// This is a package-boundary declaration (see
// docs/founder/standing-up-a-vertical.md and the `delegation` module for the
// landed pattern): external consumers — other feature modules and domain
// manifests — should import from this barrel ONLY, never from deep paths like
// `content-funding/channelDisplay`, `content-funding/components/...`, or
// `content-funding/hooks/...`. Everything not re-exported here is
// module-internal and may be moved/renamed freely. When this module becomes its
// own published package, this file becomes the package root
// (`@commonality/content-funding`).
//
// Eager surface (components + hooks + utils used at import time):

export { ContentAttestationSummary } from './components/ContentAttestationSummary'
export { ContentSubmissionForm } from './components/ContentSubmissionForm'
export { ContentFundingProjectSection } from './components/ContentFundingProjectSection'

export { useClaimFlow } from './hooks/useClaimFlow'
export { useContentFundingState } from './hooks/useContentFundingState'
export type { ContentAttestationInfo } from './hooks/useContentFundingState'

export {
  getChannelDisplayLabels,
  type ChannelDisplayLabels,
  type ChannelDisplayMetadata,
} from './channelDisplay'

// Note on pages: the route components (CreatorsLandingPage, BrowseCreatorsPage,
// ChannelPage, CreateContractPage, CreatorDashboardPage,
// MaterializeFutureContentPage) are intentionally NOT re-exported here. Domain
// route wrappers load them directly (see domains/content-funding/ContentPages.tsx
// and domains/civility/ContentPages.tsx) so each route stays in its own
// code-split chunk; re-exporting them from this eager barrel would collapse
// those chunks. Those deep page imports are the second half of this module's
// public API and map to package *subpath* exports (e.g.
// `@commonality/content-funding/pages/ChannelPage`) once this becomes its own
// package.
