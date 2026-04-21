# Commonality UI

Web interface for the Commonality platform - a coordination platform for aligned people to track their numbers and crowdfund projects.

## Notes for AI working on this code

If you modify this code, please make sure "npm run build" (in the ui directory) succeeds when you're done.

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **UI Library:** Material UI (MUI)
- **Blockchain:** viem, wagmi, ConnectKit
- **State Management:** @tanstack/react-query

## Dev stuff you can do

    npm install
    npm run dev
    npm run build
    npm run build:domains
    npm run build:ipfs
    npm run build:ipfs:domains

`npm run build:ipfs` produces the static bundle intended for IPFS deployment. It switches the app to hash routing and emits relative asset URLs so the app still works when served from an IPFS CID path.

`npm run build` now emits the active domain bundle to `dist/<domain>/` (`commonality` by default, or whichever `VITE_DOMAIN` you set). `npm run build:domains` emits all four domain artifacts in one pass:

- `dist/commonality/`
- `dist/content-funding/`
- `dist/noninflammatory/`
- `dist/movement/`

When you start the local docker-compose stack via `./services.sh --start`, four one-shot `ui-ipfs-publisher-<domain>` services build each domain's IPFS-friendly bundle in parallel and add them to the local IPFS node. The CIDs and gateway URLs are written to `./data/ui-ipfs/<domain>/`, and those IPFS URLs are the primary local entry points for the app.

## Code organization

We use the "sdk" code at the root of this Git repo, for user actions and queries. (See sdk/README.md.) The idea is to share code with the integration tests and any other client code we may eventually have. (If you find yourself implementing any significant complexity in the UI code regarding queries or user actions, please make those changes in the UI code instead, and write integration-tests for your changes too.)

The UI is structured into feature modules (conceptspace, pubstarter, delegation, fundingportal, content-funding) plus per-domain manifests under `src/domains/`. Shared utilities and components live in `src/shared/`. See [specs/tech/ui-domains.md](../specs/tech/ui-domains.md) for the full picture.


## UI components that have been implemented

Here's a list of what's done (please keep this list concise):
  - Navigation & Layout: AppShell component with responsive navigation bar, mobile drawer menu, wallet connection, footer
  - Routing: React Router setup with routes for main Concept Space pages (home, browse statements, statement detail, user profile, settings)
  - HomePage: Shows CreateStatementForm when logged in, link to user profile, quick actions
  - CreateStatementForm: Component for creating statements (uploads to IPFS, signs via Beliefs contract, updates MutableRefUpdater with created statements list)
  - StatementPage: Full page displaying statement content (rendered markdown), direct/indirect support metrics, belief controls for believe/disbelieve/clear opinion
  - BeliefControls: Component for expressing belief/disbelief/clearing opinion on statements
  - SupportMetrics: Component displaying direct believers, indirect supporters, and disbelievers
  - StatementRenderer: Component for rendering statement content with markdown support, reference handling, and metadata display
  - StatementSuggestions: Component displaying trusted nudger suggestions for the current statement, sourced from folded `nudge-batch` publications
  - UserProfilePage: Displays user's beliefs, disbeliefs, and indirectly supported statements in tabs with clickable statement cards; shows "Create Statement" button for connected user's own profile
  - Placeholder pages: BrowseStatementsPage, SettingsPage
  - Directory structure: Organized into src/shared, src/conceptspace, src/pubstarter, src/delegation, src/fundingportal
