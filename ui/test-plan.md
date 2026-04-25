# UI Test Coverage

## Testing Stack

- **Unit tests:** Vitest + Testing Library — for components with logic, state, or conditional rendering
- **E2E tests:** Playwright — for complete user workflows end to end

## Unit Test Coverage Inventory

### Conceptspace
- `BeliefControls`, `SupportMetrics`, `StatementRenderer`, `CreateStatementForm`, `StatementSuggestions`, `StatementPage`, `BrowseStatementsPage`, `UserProfilePage`, `HomePage`, `SettingsPage`
- `HighProfileSigners` (14 tests — loading, empty, error, signer chips, follower formatting, ENS name fallback, Twitter link, profile navigation, minFollowers prop, follower count visibility)
- `twitterHandleHints` utility (13 tests — load/save, address normalization, handle normalization, localStorage error handling, multi-entry preservation)

### Docs
- `DocsPage` (13 tests — headings, paragraphs, lists, internal links, blockquotes, inline code, multiple doc paths, max-width styling, 404 handling)
- **Gap:** External link `target="_blank"` behavior untestable — no included doc (`docs/` minus `vision-and-strategy/` and `chats/`) contains external URLs. Would need a test-only fixture or doc with an external link.

### Shared Infrastructure
- `App` (15 tests — browser/hash routing modes, domain branding passthrough for all 4 domains, primary navigation rendering per domain, footer text, wallet button, children/route rendering; uses full mocking to avoid expensive dynamic imports)
- `AppShell` (35 tests — branding, primary/secondary navigation, More menu, footer, selected state, mobile drawer open/close, primary and secondary nav in drawer, selected-state behavior in drawer, custom navigation in drawer, accessibility landmarks for banner/main/contentinfo)
- `AddressDisplay` (9 tests — ENS name, Twitter handle, raw address fallback, showFullAddress, twitterHandleHint)
- `DomainLandingPage` (18 tests — hero section with eyebrow/title/description/action links, spotlight label/text conditional rendering, section cards with titles/descriptions/CTAs/eyebrows, children rendering, hero action variants, empty states)
- `PrivyWalletButtonImpl` (14 tests — sign-in before auth, loading while initializing, embedded wallet sync to wagmi, connected address menu, logout, link another wallet, create wallet state, address truncation, wagmi address preference, wallet readiness, menu close behavior, full address display, setActiveWallet error handling, embedded vs external wallet preference)
- `CreatorsLandingPage` (15 tests — default/custom title and descriptions, Twitter/YouTube/Substack platform cards with links and descriptions, learn more link, h1/h6 heading structure, clickable navigation)
- `CommonalityLandingPage` (13 tests — hero section with eyebrow/title/description/action links/spotlight, section cards with titles/descriptions/CTAs/eyebrows, focused domain entry points with three domain cards)
- `ContentFundingLandingPage` (10 tests — hero section with eyebrow/title/description/action links/spotlight, section cards with titles/descriptions/CTAs/eyebrows)
- `NoninflammatoryLandingPage` (10 tests — hero section with eyebrow/title/description/action links/spotlight, section cards with titles/descriptions/CTAs/eyebrows)
- `MovementLandingPage` (10 tests — hero section with eyebrow/title/description/action links/spotlight, section cards with titles/descriptions/CTAs/eyebrows)
- `routing.test.ts` (IPFS-mode hash routing fallback)
- `domainRoutes.test.tsx` (all four domain manifests)
- `ContentPages.test.tsx` (content-funding and noninflammatory branded wrappers)
- `MovementPages.test.tsx` (movement domain wrappers)
- `useTrustedAttesters` (15 tests — localStorage load/save, address validation/filtering, env default fallback, corrupted/non-array JSON handling, hook read-on-mount)
- `useNudgerMetadata` (9 tests — null URL, successful fetch, HTTP error, network error, malformed JSON, default field fallbacks, trailing slash stripping, serviceUrl change)
- `useCachedProjects` pure functions (16 tests — withMetrics: null filtering, funding progress calculation, zero threshold, overfunding, createdAtBlock mapping, bigint inputs; sortProjects: 5 sort fields × directions, immutability, empty array)

### Content Funding
- `BrowseCreatorsPage` (15 tests — platform tabs, sort/status filters, loading/error/empty states)
- `ChannelPage` (10 tests — loading/error/not-found states, custom prop passthrough)
- `CreatorDashboardPage` (10 tests — loading/error/disconnected/empty states, custom props)
- `CreateContractPage` (4 tests — verified/unclaimed channel submission, third-party minimum, duplicate content blocking)
- `ClaimFlowModal` (35 tests)
- `ContentFundingProjectSection` (23 tests)
- `useClaimFlow` (18 tests — getChallenge: success/loading/error states, HTTP/network failures, non-Error thrown, request payload, error clearing; confirmVerification: success/error states, request payload; clearError; base URL env/default)
- `usePlatformApi` (15 tests — resolveChannel/resolveContent/submitContentSubmission: success/error/loading states, HTTP failures, fallback errors, request payloads; clearError; base URL env/default)

### Pubstarter
- `BuyTokensSection` (direct ETH purchase, delegatable note mode, token images, error/success states)
- `BurnTokensSection` (100 tests across 8 components — token balance display, burn flow, token images, error/success states)
- `Leaderboard` (contributor stats, sorting, delegation chains, deduplication)
- `ProjectHeader` (metadata rendering, status badges, progress bar, deadline formatting)
- `RefundSection` (refundable token display, refund flow, error/success states)
- `SecondaryMarketSection` (sale listings, buy orders, create order form, fulfill actions, token images)
- `TradeHistory` (accordion rendering, trade details table)
- `WithdrawSection` (withdraw flow, error/success states)
- `ConnectWalletPrompt` (4 tests — wallet prompt message, Paper wrapper, typography styling, padding/margin styles)

### Funding Portal
- `AttestAlignmentForm` (18 tests)
- `AlignedProjectCard` (19 tests)
- `computeAvailableDelegatableFunding` utility (7 tests — empty attestations, inactive notes, fetch failures, single-currency sum, multi-currency grouping, null filtering, mixed active/inactive)
- **Gap:** `alignmentContract.ts` utility (trivial env var reader, low risk)

### Delegation / Mutable Ref
- `AvailableDelegatableFunding` (10 tests)
- `MyNotesPage` (27 tests — wallet-not-connected, loading, error, empty states, summary cards, owned/deposited notes sections, delegated/undelegated chips, delegate/revoke/reclaim buttons, inactive note filtering, delegate counting, delegate dialog opening/inputs/cancellation, action flows with wallet client mocking, error dismissal)
- `NoteDetailPage` (30 tests — loading/error/null states, note metadata display, active/inactive/ETH/token/delegated chips, delegation chain visualization, intended purpose attestations, action button visibility, delegate/spend dialog opening and cancellation, delegate/revoke/reclaim/spend action flows)
- `DepositPage` (36 tests — unauthenticated state, form rendering, validation, submission states, delegation during deposit, statement attestation, statement autocomplete loading/options, edge cases for zero amount/missing contract/non-Error exceptions/error dismissal)

## E2E Test Coverage (Playwright)

Located in `ui/e2e/`. Tests run against a full local stack (Hardhat + indexer + UI).

| Spec file | What it covers |
|---|---|
| `browse-statements.spec.ts` | App loads, routing works |
| `statement-creation.spec.ts` | Creating a statement end-to-end |
| `statement-creation-form.spec.ts` | Statement creation form validation |
| `belief-expression.spec.ts` | Signing/expressing belief in a statement |
| `user-profile.spec.ts` | User profile page rendering |
| `wallet-connection.spec.ts` | Wallet connect/disconnect flow |
| `pubstarter-flow.spec.ts` | Create and fund a project |
| `delegation-flow.spec.ts` | Deposit → delegate → spend on project (full delegation lifecycle) |
| `content-funding-flow.spec.ts` | Creator verification, content contract creation, third-party contract creation, channel claim/control, creator dashboard, supporter purchase, escrow withdrawal |
| `subjectiv-flow.spec.ts` | Trust network setup and filtering ⚠️ |

⚠️ `subjectiv-flow.spec.ts` has a known issue: the test times out waiting for `window._setupTestWallet` because the page never exposes it (blank-page / app-boot or test-wallet-harness failure). The rest of the Subjectiv implementation is verified via higher-level UI integration tests.

## Route-to-Test Mapping

Maps each route surface to its Vitest and/or Playwright coverage.

### Commonality domain (default)

| Route | Vitest | Playwright |
|---|---|---|
| `/` (landing) | `domains/commonality/LandingPage.test.tsx`, `domains/CrossDomainSmoke.test.tsx` | — |
| `/start` | `conceptspace/pages/HomePage.test.tsx` | `wallet-connection.spec.ts`, `delegation-flow.spec.ts` |
| `/browse` | `conceptspace/pages/BrowseStatementsPage.test.tsx` | `browse-statements.spec.ts` |
| `/statement/:cid` | `conceptspace/pages/StatementPage.test.tsx` | `statement-creation.spec.ts`, `belief-expression.spec.ts` |
| `/profile` | `conceptspace/pages/UserProfilePage.test.tsx` | `user-profile.spec.ts` |
| `/user/:address` | `conceptspace/pages/UserProfilePage.test.tsx` | — |
| `/docs` | `docs/DocsPage.test.tsx` | — |
| `/docs/*` | `docs/DocsPage.test.tsx` | — |
| `/notes` | `delegation/pages/MyNotesPage.test.tsx` | `delegation-flow.spec.ts` |
| `/notes/:id` | `delegation/pages/NoteDetailPage.test.tsx` | `delegation-flow.spec.ts` |
| `/deposit` | `delegation/pages/DepositPage.test.tsx` | — |
| `/projects` | `pubstarter/pages/BrowseProjectsPage.test.tsx` | `pubstarter-flow.spec.ts` |
| `/projects/new` | `pubstarter/pages/CreateProjectPage.test.tsx` | `pubstarter-flow.spec.ts` |
| `/projects/:address` | `pubstarter/pages/ProjectDetailPage.test.tsx` | `pubstarter-flow.spec.ts` |
| `/portal/:cid` | `fundingportal/pages/StatementFundingPortalPage.test.tsx` | — |
| `/portal/:cid/leaderboard` | `fundingportal/pages/CauseLeaderboardPage.test.tsx` | — |

### Content Funding domain routes (wrapped)

| Route | Vitest | Playwright |
|---|---|---|
| `/content` | `domains/content-funding/ContentPages.test.tsx` | `content-funding-flow.spec.ts` |
| `/content/twitter` | `content-funding/pages/BrowseCreatorsPage.test.tsx`, `domains/content-funding/ContentPages.test.tsx` | `content-funding-flow.spec.ts` |
| `/content/youtube` | `content-funding/pages/BrowseCreatorsPage.test.tsx` | — |
| `/content/substack` | `content-funding/pages/BrowseCreatorsPage.test.tsx` | — |
| `/content/:platform/:channelId` | `content-funding/pages/ChannelPage.test.tsx`, `domains/content-funding/ContentPages.test.tsx` | `content-funding-flow.spec.ts` |
| `/content/:platform/:channelId/new` | `content-funding/pages/CreateContractPage.test.tsx` | — |
| `/content/dashboard` | `content-funding/pages/CreatorDashboardPage.test.tsx`, `domains/content-funding/ContentPages.test.tsx` | `content-funding-flow.spec.ts` |
| `/content/contracts/:address` | `content-funding/components/ContentFundingProjectSection.test.tsx`, `domains/content-funding/ContentPages.test.tsx` | — |

### Noninflammatory domain routes (wrapped)

| Route | Vitest | Playwright |
|---|---|---|
| `/` (landing) | `domains/noninflammatory/LandingPage.test.tsx`, `domains/CrossDomainSmoke.test.tsx` | — |
| `/about` | `domains/noninflammatory/ContentPages.test.tsx` | — |
| `/content/*` | `domains/noninflammatory/ContentPages.test.tsx` | — |

### Movement domain routes (wrapped)

| Route | Vitest | Playwright |
|---|---|---|
| `/` (landing) | `domains/movement/LandingPage.test.tsx`, `domains/CrossDomainSmoke.test.tsx` | — |
| `/organize` | `domains/movement/MovementPages.test.tsx` | — |
| `/about` | `domains/movement/MovementPages.test.tsx` | — |
| `/projects` | `domains/movement/MovementPages.test.tsx` | — |
| `/projects/new` | `domains/movement/MovementPages.test.tsx` | — |
| `/projects/:address` | `domains/movement/MovementPages.test.tsx` | — |
| `/content/*` | `domains/movement/MovementPages.test.tsx` | — |
| `/portal/:cid` | `domains/movement/MovementPages.test.tsx` | — |
| `/portal/:cid/leaderboard` | `domains/movement/MovementPages.test.tsx` | — |

### Shared routes (all domains)

| Route | Vitest | Playwright |
|---|---|---|
| `/statements` | `domains/CrossDomainSmoke.test.tsx` | `browse-statements.spec.ts` |
| `/statement/:cid` | `domains/CrossDomainSmoke.test.tsx` | `statement-creation.spec.ts` |
| `/profile` | `domains/CrossDomainSmoke.test.tsx` | `user-profile.spec.ts` |

## Known Gaps

1. ~~**Cross-domain smoke suite:**~~ Done (98 tests — manifest structure with domain-specific expected values, nav integrity, feature flag matrix, route coverage, landing page rendering with exact hero titles, out-of-domain absence, shared route consistency).
2. ~~**Domain-wrapper depth:**~~ Done (75 tests — 14 content-funding, 23 noninflammatory, 38 movement). These are prop-wiring tests that mock underlying pages; they verify branded copy and prop passthrough, not full integration.
3. **IPFS/hash routing E2E:** No Playwright coverage against `npm run build:ipfs:domains` artifacts.
4. ~~**Mobile/responsive AppShell:**~~ Done (35 tests — drawer open/close, primary and secondary navigation in drawer, selected-state behavior, custom branding/navigation in drawer, accessibility landmarks).
5. ~~**Content-funding full loop:**~~ Done (expanded `content-funding-flow.spec.ts` — third-party contract creation, channel verification, channel control/takeover, creator dashboard viewing, supporter purchase with delegatable notes, escrow withdrawal, post-withdrawal UI verification).
6. **Non-default domain E2E:** No smoke/navigation tests for Content Funding, Noninflammatory Content, or Common Sense Majority domains. Requires separate builds with different `VITE_DOMAIN` values.
7. ~~**Accessibility assertions:**~~ Done (AppShell landmark tests for banner/main/contentinfo, ClaimFlowModal dialog role test, existing tests use accessible names for buttons/menus/drawers via Testing Library role queries).
8. **DocsPage external links:** No included doc has external URLs, so `target="_blank"` behavior is untested.
9. **Coverage inventory automation:** Manual inventory above may drift. No script regenerates it from source.
10. ~~**PrivyWalletButtonImpl:**~~ Done (14 tests — sign-in, loading, embedded wallet sync, connected address menu, logout, link wallet, create wallet, address truncation, wagmi preference, wallet readiness, menu close, address display, error handling, wallet preference).
11. ~~**CreatorsLandingPage:**~~ Done (15 tests — default/custom title and descriptions, Twitter/YouTube/Substack platform cards with links, learn more link, heading structure, clickable navigation).

## Running Tests

```bash
# Unit tests
npm run test           # run once
npm run test:watch     # watch mode

# E2E tests
npm run test:e2e       # headless
npm run test:e2e:ui    # Playwright UI
```
