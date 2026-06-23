// Public API of the `shared` module.
//
// This is a package-boundary declaration (see
// docs/founder/standing-up-a-vertical.md and the `delegation`, `content-funding`,
// `lazy-giving`, `fundingportals`, and `conceptspace` modules for the landed
// pattern): external consumers — every other feature module, the domain
// manifests, and the top-level app entry (`App.tsx`/`main.tsx`) — should import
// from this barrel ONLY, never from deep paths like `shared/hooks/useMachinery`
// or `shared/currency`. Everything not re-exported here is module-internal and
// may be moved/renamed freely. When this module becomes its own published
// package, this file becomes the package root (`@commonality/shared`).
//
// `shared` is the substrate module that every other feature module builds on, so
// unlike the feature modules its public surface is wide and purely *eager*:
// there are no lazy route pages under `shared/` (it owns no routes), so there is
// no `pages/*` subpath half of the public API — every external consumer is an
// eager import. The boundary rule (see the `shared` block in
// `ui/eslint.config.js`) therefore forbids *all* deep paths into `shared/`,
// with no pages exception. Promote a symbol here only when a real external
// caller needs it; the list below is exactly the set of symbols other modules
// and the app entry already import today (captured by scanning the tree), so the
// barrel is behavior-preserving on landing.

// --- chain address routing ---
export {
  contentContractPathForAddress,
  projectPathForAddress,
  tryParseChainAddressRef,
} from './chainAddressRoutes'

// --- shared UI components ---
//
// `AppShell` and `WalletButton` are intentionally NOT re-exported here. Both
// transitively import `src/wagmi.ts`, whose top level eagerly calls `http()`
// (and builds the wagmi `config`). Putting them in this eager barrel would pull
// the entire wagmi/connectkit config into every consumer's module graph —
// bloating every feature bundle that imports a light hook like `useMachinery`,
// and breaking tests that partially mock `wagmi` (no `http` export). They are
// the subpath half of this module's public API, like `pages/*` for the feature
// modules: external consumers (`App.tsx` for AppShell, `ConnectWalletPrompt`
// for WalletButton) import them via deep paths allowed by the boundary rule.
export { AddressDisplay } from './components/AddressDisplay'
export { CrossDomainUnavailablePage } from './components/CrossDomainUnavailablePage'
export { NetworkSwitchPrompt, useIsWrongChain } from './components/NetworkSwitchPrompt'
export { NotFoundPage } from './components/NotFoundPage'

// --- contacts ---
export { addContact, getContacts } from './contactStore'
export type { SavedContact } from './contactStore'

// --- CSM mediator nudger ---
export { getCsmMediatorNudger, getTallyMediatorOptInPath } from './csmMediatorNudger'

// --- currency formatting ---
export {
  DEFAULT_PAYMENT_CURRENCY,
  formatCurrencyAmount,
  formatCurrencyProgress,
  formatCurrencyRaised,
  formatCurrencyTotals,
  getConfiguredPaymentCurrency,
  getCurrencyForNote,
} from './currency'

// --- hooks ---
export {
  BEAT_AGENT_TRUST_POLICY_KEY,
  checkTrustPolicyViolation,
  loadBeatAgentTrustPolicy,
  saveBeatAgentTrustPolicy,
  useBeatAgentTrustPolicy,
} from './hooks/useBeatAgentTrustPolicy'
export type { BeatAgentTrustPolicy } from './hooks/useBeatAgentTrustPolicy'

export { useCachedProject } from './hooks/useCachedProject'
export { useCachedProjects } from './hooks/useCachedProjects'
export { useMachinery } from './hooks/useMachinery'
export { useMutedNudgers } from './hooks/useMutedNudgers'
export { useMutedTopics } from './hooks/useMutedTopics'
export { useNudgeIntensity } from './hooks/useNudgeIntensity'
export type { NudgeIntensity } from './hooks/useNudgeIntensity'

export {
  loadTrustedAttesters,
  saveTrustedAttesters,
  useTrustedAttesters,
} from './hooks/useTrustedAttesters'

export {
  TRUSTED_CONTENT_ATTESTERS_KEY,
  loadDefaultTrustedContentAttesters,
  loadTrustedContentAttesters,
  saveTrustedContentAttesters,
  useTrustedContentAttesters,
} from './hooks/useTrustedContentAttesters'
export type {
  TrustedContentAttesterEntry,
  TrustedContentAttesterKind,
} from './hooks/useTrustedContentAttesters'

export {
  TRUSTED_NUDGERS_KEY,
  addTrustedNudger,
  isTrustedNudger,
  isValidNudgerAddress,
  loadDefaultNudgers,
  loadTrustedNudgers,
  removeTrustedNudger,
  saveTrustedNudgers,
  useTrustedNudgers,
} from './hooks/useTrustedNudgers'
export type { TrustedNudgerEntry } from './hooks/useTrustedNudgers'

export { useTrustedSet } from './hooks/useTrustedSet'
export { useWriteClients } from './hooks/useWriteClients'

// --- landing styles ---
export { landingHeroContainedButtonSx, landingHeroPaperSx } from './landingStyles'

// --- link types ---
export {
  getLinkHref,
  getLinkKey,
  isCrossDomainLinkTarget,
  isExternalLinkTarget,
} from './linkTypes'
export type { LabeledLinkTarget, LinkTarget } from './linkTypes'

// --- nudge store ---
export { dismissNudge, getDismissedNudges } from './nudgeStore'

// --- routing ---
export { getAppUrl, isHashRouting } from './routing'

// --- runtime config ---
export {
  getRuntimeConfig,
  getRuntimeConfigValue,
  loadRuntimeConfig,
} from './runtimeConfig'
export type { UiRuntimeConfig } from './runtimeConfig'

// --- stale-build recovery ---
export { installStaleBuildRecovery } from './staleBuildRecovery'

// --- subjectiv trust ---
export { notifySubjectivTrustNetworkInvalidated } from './subjectivTrust'

// --- theme mode ---
export { ThemeModeContext } from './themeMode'

// --- payment-token currency hook ---
export { usePaymentTokenCurrency } from './usePaymentTokenCurrency'

// --- address utilities ---
export { truncateAddress } from './utils/address'
