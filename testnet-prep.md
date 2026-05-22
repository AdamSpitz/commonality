# Before testnet

Manual one-time setup and open decisions before the first public/shared testnet deployment. The full deployment workflow (scripts, IPNS/ENS naming, Render blueprint) is documented in [workflow/deployment.md](workflow/deployment.md).

## Accounts, keys, and funds

- [ ] Run `node scripts/generate-wallets.mjs` and paste the output into your password manager. Do not reuse a personal wallet key in Render.
- [ ] Get enough testnet ETH from faucets (e.g. coinbase.com/faucets) for every transaction-sending wallet, especially the deployer and service wallets (Base Sepolia ETH, not Ethereum Sepolia). (Do this manually. It's a one-time task, and the faucet limitations like CAPTCHAs make automation more trouble than it saves.)

## External services and secrets

- [ ] Move/connect the repo to GitHub so Render Blueprint deploys can be connected to it.
- [ ] Create/configure a Render account for the testnet blueprint; decide service names/URLs (indexer, attester host, worker host, platform API).
- [ ] Create an RPC provider account/API key (Alchemy, Infura, etc.); public RPC is too flaky for the indexer.
- [ ] Create an OpenRouter API key for AI services.
- [ ] Create a WalletConnect Cloud project and record `VITE_WALLETCONNECT_PROJECT_ID`.
- [ ] Create a Pinata account and JWT — needed for IPFS pinning before testnet launch.

## Hosting and naming (one-time setup)

See [workflow/deployment.md § One-time setup](workflow/deployment.md) for the full step-by-step. Summary:

- [ ] Create ENS subdomain tree under `testnet.commonality.eth` on mainnet L1 (each subdomain needs the public resolver set).
- [ ] Run `./scripts/setup-ipns-key.sh` once per UI; store keys in `.env.secrets` as `IPNS_PRIVATE_KEY_TESTNET_<DOMAIN>`.
- [ ] Set ENS contenthashes via `./scripts/update-ens.sh`.
- [ ] Configure CNAMEs + DNSLink TXT records on `commonality.works` subdomains.

Subdomain scheme: `alignment.testnet.commonality.works`, `pubstarter.testnet.commonality.works`, etc. (matching the eight UI domains listed in deployment.md).

## Configuration decisions still open

- [ ] Decide final public URLs for each service and UI domain, then bake/configure cross-domain env vars: `VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, `EVENT_CACHE_URL`, `VITE_PLATFORM_API_URL`, `CLAIM_PAGE_BASE_URL`, and `CORS_ALLOWED_ORIGINS`. (These get baked into the UI bundle at build time and set in Render for services.)
- [ ] Decide and configure initial content-attester policy: `ALIGNMENT_TOPIC_STATEMENT_CID`, `CONTENT_ATTESTER_NAME`, and `CONTENT_ATTESTER_PROMPT_TEMPLATE`. (Requires knowing which statement you want the attester to evaluate alignment against.)
- [ ] Generate/share finder trust secrets (`*_TRUSTED_FINDER_KEY` and matching finder keys) between worker and attester services.
