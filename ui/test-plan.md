# UI Test Coverage

## Testing Stack

- **Unit tests:** Vitest + Testing Library — for components with logic, state, or conditional rendering
- **E2E tests:** Playwright — for complete user workflows end to end

## Unit Test Coverage Inventory

### Conceptspace
- `BeliefControls`, `SupportMetrics`, `StatementRenderer`, `CreateStatementForm`, `StatementSuggestions`, `StatementPage`, `BrowseStatementsPage`, `UserProfilePage`, `HomePage`, `SettingsPage`
- `HighProfileSigners` (14 tests — loading, empty, error, signer chips, follower formatting, ENS name fallback, Twitter link, profile navigation, minFollowers prop, follower count visibility)

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

### Content Funding
- `BrowseCreatorsPage` (15 tests — platform tabs, sort/status filters, loading/error/empty states)
- `ChannelPage` (10 tests — loading/error/not-found states, custom prop passthrough)
- `CreatorDashboardPage` (10 tests — loading/error/disconnected/empty states, custom props)
- `CreateContractPage` (4 tests — verified/unclaimed channel submission, third-party minimum, duplicate content blocking)
- `ClaimFlowModal` (35 tests)
- `ContentFundingProjectSection` (23 tests)

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

### Delegation / Mutable Ref
- `AvailableDelegatableFunding` (10 tests)

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
| `delegation-flow.spec.ts` | Delegatable notes and delegation chains |
| `content-funding-flow.spec.ts` | Creator verification and content contracts |
| `subjectiv-flow.spec.ts` | Trust network setup and filtering ⚠️ |

⚠️ `subjectiv-flow.spec.ts` has a known issue: the test times out waiting for `window._setupTestWallet` because the page never exposes it (blank-page / app-boot or test-wallet-harness failure). The rest of the Subjectiv implementation is verified via higher-level UI integration tests.

## Known Gaps

1. ~~**Cross-domain smoke suite:**~~ Done (94 tests — manifest structure, nav integrity, feature flag matrix, route coverage, landing page rendering, out-of-domain absence, shared route consistency).
2. **IPFS/hash routing E2E:** No Playwright coverage against `npm run build:ipfs:domains` artifacts.
3. ~~**Mobile/responsive AppShell:**~~ Done (35 tests — drawer open/close, primary and secondary navigation in drawer, selected-state behavior, custom branding/navigation in drawer, accessibility landmarks).
4. ~~**Domain-wrapper depth:**~~ Done (75 tests — 14 content-funding, 23 noninflammatory, 38 movement covering branded browse, channel, create-contract, dashboard, contract-detail, and movement project wrapper copy/link behavior).
5. **Content-funding full loop:** E2E stops at "contract appears on browse." Missing: create third-party contract for unclaimed channel, share/claim, verify ownership, view in dashboard, withdraw/manage funds, attestation summaries.
6. **Non-default domain E2E:** No smoke/navigation tests for Content Funding, Noninflammatory Content, or Common Sense Majority domains.
7. ~~**Accessibility assertions:**~~ Done (AppShell landmark tests for banner/main/contentinfo, ClaimFlowModal dialog role test, existing tests use accessible names for buttons/menus/drawers via Testing Library role queries).
8. **DocsPage external links:** No included doc has external URLs, so `target="_blank"` behavior is untested.
9. **Coverage inventory automation:** No helper or script that maps routes/components to their test files. Manual inventory above may drift.
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
