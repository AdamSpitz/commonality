# Before testnet

Human/operator checklist before the first public/shared Base Sepolia deployment.

The detailed deployment procedure is in [workflow/deployment.md](workflow/deployment.md). A fresh LLM should use this file only to see what still needs human input, then follow `workflow/deployment.md` for exact commands and scripts.

## Accounts, keys, and funds

- [ ] Run `node scripts/generate-wallets.mjs`. Save the printed secret block in your password manager. Do not reuse a personal wallet key in Render.
- [ ] Get Base Sepolia ETH from faucets for every transaction-sending wallet listed in `deployments/wallets.env`, especially deployer and service wallets. Faucet/CAPTCHA work is intentionally manual.
- [ ] Make sure the `ENS_OWNER_PRIVATE_KEY` wallet owns or can manage `commonality.eth` on Ethereum mainnet L1 and has enough mainnet ETH for the one-time ENS subdomain/contenthash transactions.

## External services and secrets

Create accounts/projects and put the resulting secrets in `.env.secrets` as documented by `.env.secrets.example` and [workflow/deployment.md § One-time setup](workflow/deployment.md#one-time-setup):

- [ ] GitHub repo connected/pushed so Render Blueprint deploys can use it.
- [ ] Render account/blueprint ready for the testnet services.
- [ ] RPC provider account/API key, especially `BASE_SEPOLIA_RPC_URL` for app/indexer traffic and preferably `MAINNET_RPC_URL` for ENS writes.
- [ ] OpenRouter API key: `OPENROUTER_API_KEY`.
- [ ] WalletConnect Cloud project: `VITE_WALLETCONNECT_PROJECT_ID`.
- [ ] Pinata JWT: `PINATA_JWT`.

## Naming setup that still needs a human

Decisions are settled: DNS stays on Hostinger for now, ENS setup is in scope for testnet, UI hosts are under `<ui>.testnet.commonality.works` and `<ui>.testnet.commonality.eth.limo`, and Render services get custom domains. Exact procedures are in [workflow/deployment.md](workflow/deployment.md) and [workflow/hostinger-dns-setup.md](workflow/hostinger-dns-setup.md).

- [ ] Run `./scripts/setup-testnet-naming.sh` once locally. This creates/reuses IPNS keys, writes standard UI URLs to `.env.secrets`, and writes public IPNS names to `deployments/testnet-ipns.env`.
- [ ] Create the ENS subdomains/resolvers by running `./scripts/create-ens-subdomains.sh --yes`. To inspect whether names are wrapped before changing anything, run `./scripts/create-ens-subdomains.sh --inspect`.
- [ ] After ENS names/resolvers exist, run `./scripts/setup-testnet-naming.sh --ens --yes` to set ENS contenthashes to the generated IPNS names.
- [ ] Configure DNS for `commonality.works` in Hostinger by following [workflow/hostinger-dns-setup.md](workflow/hostinger-dns-setup.md), using IPNS names from `deployments/testnet-ipns.env`.

## Deployment configuration decisions

- [ ] Create the Render blueprint/services and add the Hostinger-backed custom domains in Render. Non-secret service URL defaults are already in `.env.secrets`, `.env.secrets.example`, and `render.yaml`; copy-pasteable Render values are in [workflow/testnet-render-env.md](workflow/testnet-render-env.md).
- [ ] Decide and configure initial content-attester policy: `ALIGNMENT_TOPIC_STATEMENT_CID`, `CONTENT_ATTESTER_NAME`, and `CONTENT_ATTESTER_PROMPT_TEMPLATE`.
- [ ] Copy generated private keys, payment addresses, and finder trust secrets from `.env.secrets` / `deployments/wallets.env` into the matching Render `sync: false` variables. The generated attester/finder trust-secret pairs already match; do not invent separate values in Render.
