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
- `AppShell` (18 tests — branding, primary/secondary navigation, More menu, footer, selected state)
- `AddressDisplay` (9 tests — ENS name, Twitter handle, raw address fallback, showFullAddress, twitterHandleHint)
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
- `ConnectWalletPrompt` (wallet prompt message)

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

1. **Cross-domain smoke suite:** No test runs the app with each `VITE_DOMAIN` (`commonality`, `content-funding`, `noninflammatory`, `movement`) verifying landing page, nav, footer, and absence of out-of-domain features.
2. **IPFS/hash routing E2E:** No Playwright coverage against `npm run build:ipfs:domains` artifacts.
3. **Mobile/responsive AppShell:** No tests for drawer open/close, navigation in drawer, selected-state behavior, or layout across domain shells.
4. **Domain-wrapper depth:** Content Funding, Noninflammatory Content, and Common Sense Majority only have landing-page and one creators-page tests. Missing: branded browse, channel, create-contract, dashboard, contract-detail, and movement project wrapper copy/link behavior.
5. **Content-funding full loop:** E2E stops at "contract appears on browse." Missing: create third-party contract for unclaimed channel, share/claim, verify ownership, view in dashboard, withdraw/manage funds, attestation summaries.
6. **Non-default domain E2E:** No smoke/navigation tests for Content Funding, Noninflammatory Content, or Common Sense Majority domains.
7. **Accessibility assertions:** No systematic coverage of headings/landmarks, accessible names for icon buttons, focus movement for dialogs/menus/drawers, or form validation messages.
8. **DocsPage external links:** No included doc has external URLs, so `target="_blank"` behavior is untested.
9. **Coverage inventory automation:** No helper or script that maps routes/components to their test files. Manual inventory above may drift.

## Running Tests

```bash
# Unit tests
npm run test           # run once
npm run test:watch     # watch mode

# E2E tests
npm run test:e2e       # headless
npm run test:e2e:ui    # Playwright UI
```
