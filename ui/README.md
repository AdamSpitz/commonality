# Commonality UI

Web interface for the Commonality platform - a coordination platform for aligned people to track their numbers and crowdfund projects.

## Notes for AI working on this code

If you modify this code, please make sure "npm run build" (in the ui directory) succeeds when you're done.

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **UI Library:** Material UI (MUI)
- **Blockchain:** viem, wagmi, ConnectKit (Base Account + injected wallets)
- **State Management:** @tanstack/react-query

## Dev stuff you can do

    npm install
    npm run dev
    npm run build
    npm run build:domains
    npm run build:ipfs
    npm run build:ipfs:domains

`npm run build:ipfs` produces the static bundle intended for IPFS deployment. It switches the app to hash routing and emits relative asset URLs so the app still works when served from an IPFS CID path. The build also emits `dist/<domain>/config.json`; the app loads this file from the same IPFS directory before rendering, so deployers can publish separate local/testnet/mainnet IPFS directories with the same JS assets and different runtime URLs/contract addresses (notably `VITE_EVENT_CACHE_URL` and the stable `VITE_DISPLAY_DENYLIST_URL`). The denylist contents themselves must remain at that runtime-fetched URL, not embedded in the immutable bundle. For testnet/mainnet, `COMMONALITY_ENVIRONMENT` must be `testnet`/`mainnet` and channel metadata lookup must be configured with `VITE_ENABLE_CHANNEL_METADATA_LOOKUP=true` plus `VITE_PLATFORM_API_URL`; local dev is the only environment where that lookup may remain disabled. See [`../workflow/local-development.md`](../workflow/local-development.md), [`../.env.example`](../.env.example), and [`./.env.example`](./.env.example) for the central local-dev commands and environment variable reference.

## Wallet onboarding

ConnectKit is the only login path. Base Account (passkey smart wallet) is the preferred "create an account" option; MetaMask, Rabby, and WalletConnect remain for people who already have a wallet. Local Hardhat accounts still replace browser wallets on a local-dev host. Playwright E2E uses the mock connector (`VITE_E2E=true`). Wallets that advertise ERC-7677 `paymasterService` get `VITE_SPONSORED_GAS_PAYMASTER_URL` on `wallet_sendCalls`.

Cross-domain links can be configured at build time or in `dist/<domain>/config.json` with `VITE_COMMONALITY_URL`, `VITE_LAZYGIVING_URL`, `VITE_ALIGNMENT_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_CIVILITY_URL`, `VITE_COMMON_SENSE_MAJORITY_URL`, and `VITE_CONCEPTSPACE_URL`. Delegation is no longer a standalone domain build; its management routes live under `/delegation` in LazyGiving and Content Funding. When a URL is missing, components fall back to a local route or `#` placeholder so local builds still render. Explicit path/hash URLs such as `../alignment/#/` or `https://commonality.eth.limo/testnet/alignment/#/` are preserved, which lets the same standalone app bundles run either under subdomains or inside an uber IPFS directory.

`npm run build` now emits the active domain bundle to `dist/<domain>/` (`commonality` by default, or whichever `VITE_DOMAIN` you set). The LazyGiving build still uses the legacy `VITE_DOMAIN=lazyGiving` id and `dist/lazyGiving/` output, while its source folder is `src/domains/lazy-giving/`. `npm run build:domains` emits all configured domain artifacts in one pass:

- `dist/commonality/`
- `dist/lazyGiving/`
- `dist/alignment/`
- `dist/tally/`
- `dist/content-funding/`
- `dist/conceptspace/`

When you start the local docker-compose stack via `./scripts/services.sh --start`, it publishes Commonality by default. Set `LOCAL_UI_DOMAINS=all` to publish all six domains. The CIDs and raw gateway URLs are written to `./data/ui-ipfs/<domain>/`. The local UI gateway maps stable hostnames to the latest local CIDs; the primary entry point is `http://commonality.localhost:8088/#/`. `./scripts/services.sh --url` prints the links, and `http://localhost:8088/admin` is the local admin page.

## External verticals

Civility and Common Sense Majority live in the sibling `common-sense-politics` repo. Their pages and manifests belong there; reusable funding pages, wallet providers, routing shell, and runtime configuration remain here. External entry points import `DomainManifest`, `injectActiveDomain`, and `bootUi` from `@commonality/ui/vertical`, inject their manifest, then call `bootUi()`.

The exports in `package.json` expose TypeScript source for a Vite consumer, including separate page subpaths for lazy routes. This is currently a local checkout integration, not a published, independently installable UI distribution. The sibling consumer still requires Commonality's dependencies, docs, and build aliases. Cross-site URL settings remain here so shared features can link to those external sites.

## Code organization

We use the "sdk" code at the root of this Git repo for user actions and queries. (See sdk/README.md.) The idea is to share code with the integration tests and any other client code we may eventually have. If you find yourself implementing significant query/action complexity directly in the UI, prefer moving that logic into the SDK and writing integration tests for it too.

The UI is structured into feature modules (`conceptspace`, `lazy-giving`, `delegation`, `fundingportals`, `content-funding`, `mutable-refs`) plus per-domain manifests under `src/domains/` (including `src/domains/lazy-giving/`, not `lazyGiving/`). Shared utilities and components live in `src/shared/`. See [specs/tech/ui-domains.md](../specs/tech/ui-domains.md) for the technical/build picture and [specs/product/ui-domains.md](../specs/product/ui-domains.md) for the product-domain boundaries.

