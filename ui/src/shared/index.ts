// Public API of the `shared` module.
//
// This is a package-boundary declaration (see
// docs/founder/standing-up-a-vertical.md and the `delegation`, `content-funding`,
// `lazy-giving`, `fundingportals`, and `conceptspace` modules for the landed
// pattern): external consumers — every other feature module, the domain
// manifests, and the top-level app entry (`App.tsx`/`main.tsx`) — should import
// from this barrel ONLY, never from deep paths like `shared/hooks/useMachinery`
// or `shared/currency/currency`. Everything not re-exported here is module-internal and
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

// The export blocks below are grouped to mirror the on-disk subdirectories
// (`config/`, `routing/`, `currency/`, `nudges/`, `stores/`, `trust/`, `theme/`,
// plus the by-kind `hooks/`, `components/`, `utils/`). Each subdirectory is a
// coherent sub-area of the substrate; this barrel is the only public entry.

// === config/ — runtime config + chain expectations + build recovery ===
export {
  getRuntimeConfig,
  getRuntimeConfigValue,
  loadRuntimeConfig,
} from './config/runtimeConfig'
export type { UiRuntimeConfig } from './config/runtimeConfig'
export { installStaleBuildRecovery } from './config/staleBuildRecovery'

// === routing/ — app URLs, cross-brand domain URLs, link types, chain-address routes ===
export { getAppUrl, isHashRouting } from './routing/routing'
export {
  getDomainUrl,
  isDomainConfigured,
  resolveDomainUrlFromConfig,
  resolveLinkHref,
} from './routing/domainUrls'
export type { DomainId } from './routing/domainUrls'
export {
  getLinkHref,
  getLinkKey,
  isCrossDomainLinkTarget,
  isExternalLinkTarget,
} from './routing/linkTypes'
export type { LabeledLinkTarget, LinkTarget } from './routing/linkTypes'
export {
  contentContractPathForAddress,
  projectPathForAddress,
  tryParseChainAddressRef,
} from './routing/chainAddressRoutes'

// === currency/ — payment-token currency formatting + hook ===
export {
  DEFAULT_PAYMENT_CURRENCY,
  formatCurrencyAmount,
  formatCurrencyProgress,
  formatCurrencyRaised,
  formatCurrencyTotals,
  getConfiguredPaymentCurrency,
  getCurrencyForNote,
} from './currency/currency'
export { usePaymentTokenCurrency } from './currency/usePaymentTokenCurrency'

// === nudges/ — dismissed-nudge store + CSM mediator nudger ===
export { dismissNudge, getDismissedNudges } from './nudges/nudgeStore'
export { getCsmMediatorNudger, getTallyMediatorOptInPath } from './nudges/csmMediatorNudger'

// === stores/ — client-side persistence (contacts; folded-state cache via hooks) ===
export { addContact, getContacts } from './stores/contactStore'
export type { SavedContact } from './stores/contactStore'

// === trust/ — subjectiv trust network (computation + cache + worker live behind hooks) ===
export { notifySubjectivTrustNetworkInvalidated } from './trust/subjectivTrust'

// === theme/ — theme mode + landing-page styles ===
export { ThemeModeContext } from './theme/themeMode'
export { landingHeroContainedButtonSx, landingHeroPaperSx } from './theme/landingStyles'

// === hooks/ — React hooks over the above sub-areas + machinery/write clients ===
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
export { useIsWrongChain } from './hooks/useIsWrongChain'

// === components/ — shared UI components ===
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
export { NetworkSwitchPrompt } from './components/NetworkSwitchPrompt'
export { NotFoundPage } from './components/NotFoundPage'

// === utils/ — small pure helpers ===
export { truncateAddress } from './utils/address'
