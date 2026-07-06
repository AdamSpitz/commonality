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

`npm run build:ipfs` produces the static bundle intended for IPFS deployment. It switches the app to hash routing and emits relative asset URLs so the app still works when served from an IPFS CID path. The build also emits `dist/<domain>/config.json`; the app loads this file from the same IPFS directory before rendering, so deployers can publish separate local/testnet/mainnet IPFS directories with the same JS assets and different runtime URLs/contract addresses (notably `VITE_EVENT_CACHE_URL`). For testnet/mainnet, `COMMONALITY_ENVIRONMENT` must be `testnet`/`mainnet` and channel metadata lookup must be configured with `VITE_ENABLE_CHANNEL_METADATA_LOOKUP=true` plus `VITE_PLATFORM_API_URL`; local dev is the only environment where that lookup may remain disabled. See [`../workflow/local-development.md`](../workflow/local-development.md), [`../.env.example`](../.env.example), and [`./.env.example`](./.env.example) for the central local-dev commands and environment variable reference.

## Wallet onboarding

The UI now supports two wallet-onboarding modes:

- Default local-dev / test mode: if `VITE_PRIVY_APP_ID` is unset, the app keeps using the existing ConnectKit flow.
- Embedded-wallet mode: if `VITE_PRIVY_APP_ID` is set, the app uses Privy for email/social login plus embedded wallets while still allowing external Ethereum wallets.

This keeps local development and Playwright E2E tests working without requiring a Privy app, while giving deployed environments a path to mainstream-friendly onboarding.

To keep the initial app bundle smaller, the Privy provider tree and wallet button implementation now live behind lazy-loaded chunks. When `VITE_PRIVY_APP_ID` is unset, none of the Privy code is pulled into the ConnectKit path at runtime.

Cross-domain links can be configured at build time or in `dist/<domain>/config.json` with `VITE_COMMONALITY_URL`, `VITE_LAZYGIVING_URL`, `VITE_ALIGNMENT_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_CIVILITY_URL`, `VITE_COMMON_SENSE_MAJORITY_URL`, and `VITE_CONCEPTSPACE_URL`. Delegation is no longer a standalone domain build; its management routes live under `/delegation` in LazyGiving and Content Funding. When a URL is missing, components fall back to a local route or `#` placeholder so local builds still render. Explicit path/hash URLs such as `../alignment/#/` or `https://commonality.eth.limo/testnet/alignment/#/` are preserved, which lets the same standalone app bundles run either under subdomains or inside an uber IPFS directory.

`npm run build` now emits the active domain bundle to `dist/<domain>/` (`commonality` by default, or whichever `VITE_DOMAIN` you set). `npm run build:domains` emits all configured domain artifacts in one pass:

- `dist/commonality/`
- `dist/lazyGiving/`
- `dist/alignment/`
- `dist/tally/`
- `dist/content-funding/`
- `dist/civility/`
- `dist/common-sense-majority/`
- `dist/conceptspace/`

When you start the local docker-compose stack via `./scripts/services.sh --start`, the IPFS publisher services build all eight domains and add them to the local IPFS node. The CIDs and raw gateway URLs are written to `./data/ui-ipfs/<domain>/`. The stack also starts a local UI gateway that maps stable hostnames to the latest local CIDs, so the primary local entry points are `http://commonality.localhost:8088/#/`, `http://lazygiving.localhost:8088/#/`, etc. `./scripts/services.sh --url` prints the full list, and `http://localhost:8088/admin` is a bookmarkable local admin page with links to all eight.

## Code organization

We use the "sdk" code at the root of this Git repo for user actions and queries. (See sdk/README.md.) The idea is to share code with the integration tests and any other client code we may eventually have. If you find yourself implementing significant query/action complexity directly in the UI, prefer moving that logic into the SDK and writing integration tests for it too.

The UI is structured into feature modules (`conceptspace`, `lazy-giving`, `delegation`, `fundingportals`, `content-funding`, `mutable-refs`) plus per-domain manifests under `src/domains/`. Shared utilities and components live in `src/shared/`. See [specs/tech/ui-domains.md](../specs/tech/ui-domains.md) for the technical/build picture and [specs/product/ui-domains.md](../specs/product/ui-domains.md) for the product-domain boundaries.

