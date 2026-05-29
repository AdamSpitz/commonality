# Before testnet

Human/operator checklist before the first public/shared Base Sepolia deployment.

This file should contain only items that need human custody, external accounts, funds, dashboard access, or product judgment. LLM-executable deployment steps belong in [workflow/deployment.md](workflow/deployment.md).

## Accounts, keys, and funds

- [ ] Run `node scripts/generate-wallets.mjs`; save the printed secret block in your password manager.
- [ ] Fund only `DEPLOYER_ADDRESS` in `deployments/wallets.env` with Base Sepolia ETH from a faucet. The Coinbase Developer Platform faucet's `0.1 ETH` daily allowance should be plenty for testnet deployment plus many transactions. An LLM can then run `scripts/fund-base-sepolia-wallets.mjs` to spread small balances to the other operational wallets automatically. (See https://docs.base.org/base-chain/network-information/network-faucets for faucets.)

## External services and secrets

Create/get credentials and put them in `.env.secrets`:

- [x] GitHub repo connected/pushed for Render Blueprint deploys.
- [x] Render account ready.
- [x] RPC provider URLs, especially `BASE_SEPOLIA_RPC_URL` and preferably `MAINNET_RPC_URL`.
- [x] `ENS_OWNER_PRIVATE_KEY` (should be the private key for `commonality.eth`; confirm that it has enough *mainnet* ETH for ENS transactions)
- [x] `OPENROUTER_API_KEY`.
- [x] `VITE_WALLETCONNECT_PROJECT_ID`.
- [x] `PINATA_JWT`.
- [x] `X_API_BEARER_TOKEN` for the US-politics beat-agent rehearsal.

## Browser/dashboard setup

- [ ] Create/sync the Render blueprint.
- [ ] Add Render custom domains.
- [ ] Copy required `sync: false` values into Render from `.env.secrets`, `deployments/wallets.env`, and `deployments/base-sepolia.env`.
- [ ] Configure Hostinger DNS for `commonality.works` using [workflow/hostinger-dns-setup.md](workflow/hostinger-dns-setup.md), unless DNS is automated through Cloudflare instead.

Once these are done, ask an LLM to follow the testnet procedure in [workflow/deployment.md](workflow/deployment.md).
