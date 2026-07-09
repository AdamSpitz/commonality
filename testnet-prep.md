# Before testnet

Human/operator checklist before the first public/shared Base Sepolia deployment.

This file should contain only items that need human custody, external accounts, funds, dashboard access, or product judgment. LLM-executable deployment steps belong in [workflow/deployment.md](workflow/deployment.md).

## Accounts, keys, and funds

- [x] Run `node scripts/generate-wallets.mjs`; save the printed secret block in your password manager.
- [x] Fund only `DEPLOYER_ADDRESS` in `deployments/operator-addresses.env` with Base Sepolia ETH from a faucet. The Coinbase Developer Platform faucet's `0.1 ETH` daily allowance should be plenty for testnet deployment plus many transactions. (See https://docs.base.org/base-chain/network-information/network-faucets for faucets.) (I ended up using Alchemy's faucet.)

## External services and secrets

Create/get credentials and put them in `.env.secrets`:

- [x] GitHub repo connected/pushed for Render Blueprint deploys.
- [x] Render account ready.
- [x] RPC provider URLs, especially `BASE_SEPOLIA_RPC_URL` and preferably `MAINNET_RPC_URL`.
- [x] `ENS_OWNER_PRIVATE_KEY` (should be the private key for `commonality.eth`; confirm that it has enough *mainnet* ETH for ~9 ENS transactions: one to create `testnet.commonality.eth` plus sub-subdomains, then one per UI subdomain to set contenthashes)
- [x] `OPENROUTER_API_KEY`.
- [x] `VITE_WALLETCONNECT_PROJECT_ID`.
- [x] `PINATA_JWT`.
- [x] `X_API_BEARER_TOKEN` for the US-politics beat-agent rehearsal.
- [ ] **Privy app** (embedded-wallet provider, ratified). Create a dev app and put `VITE_PRIVY_APP_ID` (and optionally `VITE_PRIVY_CLIENT_ID`) in the `ui` env. Unblocks the whole embedded-wallet cluster in [TODO.md](/TODO.md) (contribution sequencing, the Privy+Pimlico spike, sponsored gas, refund verification). Step-by-step: [workflow/privy-pimlico-setup.md](workflow/privy-pimlico-setup.md).
- [ ] **Pimlico API key** (EIP-4337 bundler + paymaster infra, ratified). Create an account, get an API key, and put the bundler/paymaster URLs in `.env.secrets`. Same guide: [workflow/privy-pimlico-setup.md](workflow/privy-pimlico-setup.md).

## Browser/dashboard setup

- [x] Go to the Render dashboard and create a new Blueprint deployment, pointing it at your GitHub repo
- [x] Copy required `sync: false` values into Render. (Run node scripts/generate-render-secrets.mjs to generate the .env blocks.)
- [ ] Put `commonality.works` on Cloudflare DNS, or otherwise make Cloudflare able to serve Worker routes for the zone. Friend/operator instructions: [workflow/commonality-works-setup.md](workflow/commonality-works-setup.md).
- [ ] Deploy the Cloudflare service gateway from [cloudflare-service-gateway/](cloudflare-service-gateway/) and verify `https://services.testnet.commonality.works/*` routes.
- [ ] Configure DNSLink UI records for `commonality.works` using Cloudflare automation, [workflow/commonality-works-setup.md](workflow/commonality-works-setup.md), or the transitional [workflow/hostinger-dns-setup.md](workflow/hostinger-dns-setup.md) instructions if DNS is still on Hostinger.

Once these are done, ask an LLM to follow the testnet procedure in [workflow/deployment.md](workflow/deployment.md).
