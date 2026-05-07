# To Do

## Main list

- Fix `index.html` caching: local IPFS gateway serves it with `cache-control: immutable` (~337-day cache), so any rebuild breaks cached users. Serve `index.html` with `no-cache`; keep `immutable` only for content-addressed assets. Plan same fix for testnet hosting.

- Replace "0 ETH" labels in portal funding summary with the actual payment token symbol (uses USDZZZ / USDC, not ETH).

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary?

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. (I've just done a fresh local-deployment using `./scripts/data.sh --seed=demo`, so no need to do that again.) Put the notes in `workflow/reviews/before-testnet.md`.

- Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Register a single domain name (e.g. `commonality.xyz`) and set up subdomain-per-UI static hosting for testnet (e.g. `alignment.testnet.commonality.xyz`, `pubstarter.testnet.commonality.xyz`, etc.). No IPFS or ENS needed for testnet — just deploy the nine `dist/` directories to a static host (Render static sites, Netlify, etc.), configure DNS subdomains, and bake the `VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, `VITE_ALIGNMENT_URL`, `VITE_DELEGATION_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, and `VITE_CONCEPTSPACE_URL` env vars into the testnet build so cross-domain links resolve correctly. (For mainnet, register separate ENS names per domain so they're more independent.)

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read workflow/BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Using `cofounder` skill: Are we ready to launch?

## Before testnet

Manual setup and non-code decisions before the first public/shared testnet deployment:

- Accounts, keys, and funds
  - [ ] Decide and document the target testnet chain. Product/crypto-native docs say **Base Sepolia**, but current deployment scripts/config mostly say Ethereum Sepolia (`sepolia`, chain ID `11155111`). If the decision is Base Sepolia, update the deployment docs/config as a separate coding task before deploying.
  - [ ] Create separate wallets/private keys for each role that submits transactions: deployer, implication attester, content attester, worker/nudger roles (`IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY`, `BRIDGE_CREATOR_PRIVATE_KEY`, `EXPLORER_CURATOR_PRIVATE_KEY`), platform/channel verifier, and any payment-recipient/service-owner addresses. Store them in a password manager; do not reuse a personal wallet key in Render.
  - [ ] Get enough testnet ETH from faucets for every transaction-sending wallet, especially the deployer and service wallets. If using Base Sepolia, bridge/get Base Sepolia ETH rather than Ethereum Sepolia ETH.
  - [ ] Decide whether the testnet deployment needs a test USDC/settlement token for content funding. If yes, choose the canonical testnet USDC address or deploy/mint a test token and record the address.

- External services and secrets
  - [ ] Move/connect the repo to GitHub so Render Blueprint deploys can be connected to it.
  - [ ] Create/configure a Render account for the testnet blueprint and decide service names/URLs (indexer, attester host, worker host, platform API).
  - [ ] Create an RPC provider account/API key (Alchemy, Infura, etc.) for the chosen chain; public RPC may be too flaky for the indexer.
  - [ ] Create an OpenRouter API key for AI services.
  - [ ] Create a WalletConnect Cloud project and record `VITE_WALLETCONNECT_PROJECT_ID`.
  - [ ] Decide whether to enable Privy embedded-wallet onboarding for testnet. If yes, create a Privy app and collect the app ID/config; if no, testnet will be wallet-only via ConnectKit/WalletConnect.
  - [ ] Decide which platform integrations are enabled for first testnet. If Twitter/X or YouTube channel verification/content lookup is enabled, obtain `X_API_BEARER_TOKEN` and/or `YOUTUBE_API_KEY`; otherwise document that those features are disabled/degraded.
  - [ ] If using IPFS pinning for the testnet UI/content, create a Pinata account/JWT. If using only static hosting for the UI, still decide what IPFS pinning is required for app content (statements/project metadata) and configure accordingly.

- Names, hosting, and public URLs
  - [ ] Choose/register the public domain for testnet (e.g. `commonality.xyz`) and decide the subdomain scheme for the nine UI domains (`alignment.testnet...`, `pubstarter.testnet...`, etc.).
  - [ ] Decide testnet UI hosting strategy. Current TODO prefers static hosting + DNS for testnet; `workflow/deployment.md` still describes IPFS + ENS. If using static hosting, choose provider (Render static sites, Netlify, etc.) and configure DNS. If using IPFS + ENS, register/control an ENS name and fund the ENS-owner wallet.
  - [ ] Decide final public URLs for each service and UI domain, then bake/configure cross-domain UI URLs (`VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, etc.), `EVENT_CACHE_URL`, `VITE_PLATFORM_API_URL`, `CLAIM_PAGE_BASE_URL`, and `CORS_ALLOWED_ORIGINS`.

- Deployment-time operational decisions
  - [ ] Decide whether Render `autoDeploy: true` is acceptable for first testnet, or whether testnet should deploy only from a tagged/manual release.
  - [ ] Decide the initial content-attester policy: `ALIGNMENT_TOPIC_STATEMENT_CID`, `CONTENT_ATTESTER_NAME`, and `CONTENT_ATTESTER_PROMPT_TEMPLATE`.
  - [ ] Generate/share finder trust secrets (`*_TRUSTED_FINDER_KEY` and matching finder keys) between worker and attester services.
  - [ ] Decide initial content-funding economics before inviting users: settlement token, `thirdPartyMinPurchase`, and `thirdPartyMaxDuration`.
  - [ ] Decide whether the platform API should submit on-chain channel-verification transactions on testnet (`SUBMIT_VERIFICATION_TX=true`) and, if so, fund/configure `VERIFIER_PRIVATE_KEY` and `CHANNEL_REGISTRY_ADDRESS`.
  - [ ] Decide minimal monitoring for testnet: Render logs only vs. Sentry/alerts.

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
