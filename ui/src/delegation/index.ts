// Public API of the `delegation` feature module.
//
// This is the package-boundary spike (see docs/founder/standing-up-a-vertical.md):
// external consumers — other feature modules and domain manifests — should import
// from this barrel ONLY, never from deep paths like `delegation/utils` or
// `delegation/components/...`. Everything not re-exported here is module-internal
// and may be moved/renamed freely. When this module becomes its own published
// package, this file becomes the package root (`@commonality/delegation`).
//
// Eager surface (components + utils used at import time):

export { AvailableDelegatableFunding } from './components'

export {
  formatNoteAmount,
  isDelegate,
  noteScopedKey,
  noteDetailPath,
  noteIntentLookupKey,
} from './utils'

// Note on pages: the route components (MyNotesPage, DepositPage, NoteDetailPage,
// DelegateProfilePage, LandingPage) are intentionally NOT re-exported here. Domain
// manifests load them via dynamic `import()` to keep each route in its own code-split
// chunk; re-exporting them from this eager barrel would pull them all into one chunk.
// Those deep dynamic imports are the second half of this module's public API and map
// to package *subpath* exports (e.g. `@commonality/delegation/pages/MyNotesPage`)
// once this becomes its own package.
