# Before testnet

Human/operator checklist before the first public/shared Base Sepolia deployment.

The detailed deployment procedure is in [workflow/deployment.md](workflow/deployment.md). A fresh LLM should use this file only to see what still needs human input, then follow `workflow/deployment.md` for exact commands and scripts.

## Accounts, keys, and funds

- [ ] Run `node scripts/generate-wallets.mjs`; save the printed secret block in your password manager.
- [ ] Fund transaction-sending wallets in `deployments/wallets.env` with Base Sepolia ETH.
- [ ] Confirm `ENS_OWNER_PRIVATE_KEY` can manage `commonality.eth` on Ethereum mainnet and has enough mainnet ETH for ENS transactions.

## External services and secrets

Create/get credentials and put them in `.env.secrets`:

- [ ] GitHub repo connected/pushed for Render Blueprint deploys.
- [ ] Render account/blueprint ready.
- [ ] RPC provider URLs, especially `BASE_SEPOLIA_RPC_URL` and preferably `MAINNET_RPC_URL`.
- [ ] `OPENROUTER_API_KEY`.
- [ ] `VITE_WALLETCONNECT_PROJECT_ID`.
- [ ] `PINATA_JWT`.
- [ ] `X_API_BEARER_TOKEN` for the US-politics beat-agent rehearsal.

## Naming setup

- [ ] Run `./scripts/setup-testnet-naming.sh`.
- [ ] Run `./scripts/create-ens-subdomains.sh --inspect`, then `./scripts/create-ens-subdomains.sh --yes`.
- [ ] Run `./scripts/setup-testnet-naming.sh --ens --yes`.
- [ ] Configure Hostinger DNS for `commonality.works` using [workflow/hostinger-dns-setup.md](workflow/hostinger-dns-setup.md).

## Deployment configuration

- [ ] Choose the noninflammatory/civility topic statement CID.
- [ ] Run `./scripts/setup-testnet-ai-policy.mjs --alignment-topic-statement-cid=<CID>`.
- [ ] Create/sync the Render blueprint, add custom domains, and copy required `sync: false` values from `.env.secrets`, `deployments/wallets.env`, and `deployments/base-sepolia.env`.
