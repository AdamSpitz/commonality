# Retired: Privy + Pimlico product login

**Retired 2026-11-02.** Product login is ConnectKit + Base Account. Sponsorship is our
ERC-7677 paymaster, not Pimlico as the product bundler. See
[wallet-without-privy-plan.md](/specs/tech/wallet-without-privy-plan.md) and
[ADR 0021](/specs/decisions/0021-portable-wallets-not-privy.md).

Coinbase Onramp (CDP) keys remain in `.env.secrets` as `COINBASE_CDP_API_KEY_ID` /
`COINBASE_CDP_API_KEY_SECRET` for the fiat→USDC session. Do not create a Privy app.
