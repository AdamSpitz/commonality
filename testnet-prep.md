# Before testnet

Human/operator checklist before the first public/shared Base Sepolia deployment.

This file should contain only items that need human custody, external accounts, funds, dashboard access, or product judgment. LLM-executable deployment steps belong in [workflow/deployment.md](workflow/deployment.md).

## Accounts, keys, and funds

- [ ] Run `node scripts/generate-wallets.mjs`; save the printed secret block in your password manager. An LLM can run the command, but the human must store the secrets safely.
- [ ] Fund transaction-sending wallets in `deployments/wallets.env` with Base Sepolia ETH.
- [ ] Confirm `ENS_OWNER_PRIVATE_KEY` can manage `commonality.eth` on Ethereum mainnet and has enough mainnet ETH for ENS transactions.

## External services and secrets

Create/get credentials and put them in `.env.secrets`:

- [ ] GitHub repo connected/pushed for Render Blueprint deploys.
- [ ] Render account ready.
- [ ] RPC provider URLs, especially `BASE_SEPOLIA_RPC_URL` and preferably `MAINNET_RPC_URL`.
- [ ] `OPENROUTER_API_KEY`.
- [ ] `VITE_WALLETCONNECT_PROJECT_ID`.
- [ ] `PINATA_JWT`.
- [ ] `X_API_BEARER_TOKEN` for the US-politics beat-agent rehearsal.

## Browser/dashboard setup

- [ ] Create/sync the Render blueprint.
- [ ] Add Render custom domains.
- [ ] Copy required `sync: false` values into Render from `.env.secrets`, `deployments/wallets.env`, and `deployments/base-sepolia.env`.
- [ ] Configure Hostinger DNS for `commonality.works` using [workflow/hostinger-dns-setup.md](workflow/hostinger-dns-setup.md), unless DNS is automated through Cloudflare instead.

Once these are done, ask an LLM to follow the testnet procedure in [workflow/deployment.md](workflow/deployment.md).
