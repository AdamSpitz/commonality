# UI Test Coverage

## Testing Stack

- **Unit tests:** Vitest + Testing Library — for components with logic, state, or conditional rendering
- **E2E tests:** Playwright — for complete user workflows end to end

## Unit Test Coverage

All major pages and components across all subsystems have unit tests. Coverage includes:

**Conceptspace:** BeliefControls, SupportMetrics, StatementRenderer, CreateStatementForm, StatementSuggestions, StatementPage, BrowseStatementsPage, UserProfilePage, HomePage, SettingsPage

**Domain routing and composition:** `domainRoutes.test.tsx` (all four domain manifests), `ContentPages.test.tsx` (content-funding and noninflammatory branded wrappers), `MovementPages.test.tsx` (movement domain wrappers)

**Shared infrastructure:** `routing.test.ts` (IPFS-mode hash routing fallback), `AppShell.test.tsx` (branding, primary/secondary navigation, More menu, footer, selected state), `AddressDisplay.test.tsx` (ENS name, Twitter handle, raw address fallback, showFullAddress, twitterHandleHint)

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

## Running Tests

```bash
# Unit tests
npm run test           # run once
npm run test:watch     # watch mode

# E2E tests
npm run test:e2e       # headless
npm run test:e2e:ui    # Playwright UI
```
