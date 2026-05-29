# Commonality UI

Web interface for the Commonality platform - a coordination platform for aligned people to track their numbers and crowdfund projects.

## Notes for AI working on this code

If you modify this code, please make sure "npm run build" (in the ui directory) succeeds when you're done.

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **UI Library:** Material UI (MUI)
- **Blockchain:** viem, wagmi, ConnectKit, Privy
- **State Management:** @tanstack/react-query

## Dev stuff you can do

    npm install
    npm run dev
    npm run build
    npm run build:domains
    npm run build:ipfs
    npm run build:ipfs:domains

`npm run build:ipfs` produces the static bundle intended for IPFS deployment. It switches the app to hash routing and emits relative asset URLs so the app still works when served from an IPFS CID path. The build also emits `dist/<domain>/config.json`; the app loads this file from the same IPFS directory before rendering, so deployers can publish separate local/testnet/mainnet IPFS directories with the same JS assets and different runtime URLs/contract addresses (notably `VITE_EVENT_CACHE_URL`). For testnet/mainnet, `COMMONALITY_ENVIRONMENT` must be `testnet`/`mainnet` and channel metadata lookup must be configured with `VITE_ENABLE_CHANNEL_METADATA_LOOKUP=true` plus `VITE_PLATFORM_API_URL`; local dev is the only environment where that lookup may remain disabled.

## Wallet onboarding

The UI now supports two wallet-onboarding modes:

- Default local-dev / test mode: if `VITE_PRIVY_APP_ID` is unset, the app keeps using the existing ConnectKit flow.
- Embedded-wallet mode: if `VITE_PRIVY_APP_ID` is set, the app uses Privy for email/social login plus embedded wallets while still allowing external Ethereum wallets.

This keeps local development and Playwright E2E tests working without requiring a Privy app, while giving deployed environments a path to mainstream-friendly onboarding.

To keep the initial app bundle smaller, the Privy provider tree and wallet button implementation now live behind lazy-loaded chunks. When `VITE_PRIVY_APP_ID` is unset, none of the Privy code is pulled into the ConnectKit path at runtime.

Cross-domain links can be configured at build time or in `dist/<domain>/config.json` with `VITE_COMMONALITY_URL`, `VITE_LAZYGIVING_URL`, `VITE_ALIGNMENT_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_CIVILITY_URL`, `VITE_COMMON_SENSE_MAJORITY_URL`, and `VITE_CONCEPTSPACE_URL`. Delegation is no longer a standalone domain build; its management routes live under `/delegation` in LazyGiving and Content Funding. When a URL is missing, components fall back to a local route or `#` placeholder so local builds still render.

`npm run build` now emits the active domain bundle to `dist/<domain>/` (`commonality` by default, or whichever `VITE_DOMAIN` you set). `npm run build:domains` emits all configured domain artifacts in one pass:

- `dist/commonality/`
- `dist/lazyGiving/`
- `dist/alignment/`
- `dist/tally/`
- `dist/content-funding/`
- `dist/civility/`
- `dist/common-sense-majority/`
- `dist/conceptspace/`

When you start the local docker-compose stack via `./scripts/services.sh --start`, the IPFS publisher services build all eight domains and add them to the local IPFS node. The CIDs and raw gateway URLs are written to `./data/ui-ipfs/<domain>/`. The stack also starts a local UI gateway that maps stable hostnames to the latest local CIDs, so the primary local entry points are `http://commonality.localhost:8088/#/`, `http://lazyGiving.localhost:8088/#/`, etc. `./scripts/services.sh --url` prints the full list, and `http://localhost:8088/admin` is a bookmarkable local admin page with links to all eight.

## Code organization

We use the "sdk" code at the root of this Git repo, for user actions and queries. (See sdk/README.md.) The idea is to share code with the integration tests and any other client code we may eventually have. (If you find yourself implementing any significant complexity in the UI code regarding queries or user actions, please make those changes in the UI code instead, and write integration-tests for your changes too.)

The UI is structured into feature modules (conceptspace, lazyGiving, delegation, fundingportal, content-funding) plus per-domain manifests under `src/domains/`. Shared utilities and components live in `src/shared/`. See [specs/tech/ui-domains.md](../specs/tech/ui-domains.md) for the full picture.


## UI components that have been implemented

Here's a list of what's done (please keep this list concise):
  - Navigation & Layout: AppShell component with responsive navigation bar, mobile drawer menu, wallet connection, footer
  - Routing: React Router setup with routes for main Concept Space pages (home, browse statements, statement detail, user profile, settings)
  - HomePage: Shows CreateStatementForm when logged in, link to user profile, quick actions
  - CreateStatementForm: Component for creating statements (uploads to IPFS, signs via Beliefs contract, updates MutableRefUpdater with created statements list)
  - StatementPage: Full page displaying statement content (rendered markdown), direct/indirect support metrics, belief controls for believe/disbelieve/clear opinion
  - ContentSubmissionForm: Statement-scoped form for queueing posts/videos/articles for content-attester review through the platform API
  - BeliefControls: Component for expressing belief/disbelief/clearing opinion on statements
  - SupportMetrics: Component displaying direct believers, indirect supporters, and disbelievers
  - StatementRenderer: Component for rendering statement content with markdown support, reference handling, and metadata display
  - StatementSuggestions: Component displaying trusted nudger suggestions for the current statement, sourced from folded `nudge-batch` publications
  - UserProfilePage: Displays user's beliefs, disbeliefs, and indirectly supported statements in tabs with clickable statement cards; shows "Create Statement" button for connected user's own profile
  - BrowseStatementsPage: Lists all statements with search/filter
  - SettingsPage: Nudger configuration (add/remove nudgers with service URL + metadata discovery), nudge intensity, muted topics, muted nudgers, and direct trust settings (Subjectiv)
  - ExplorerPage: Shows curated statement collection from explorer nudger, with per-user LLM personalization (reordering + reasons) when a service URL is configured
  - Directory structure: Organized into src/shared, src/conceptspace, src/lazyGiving, src/delegation, src/fundingportal
