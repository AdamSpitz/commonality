# 0021. Portable wallets (Base Account) instead of Privy

- **Status:** Accepted
- **Date:** 2026-11-02
- **Related specs:** [`specs/tech/wallet-without-privy-plan.md`](../tech/wallet-without-privy-plan.md),
  [`specs/tech/sponsored-gas.md`](../tech/sponsored-gas.md)

Supersedes ADR 0001's **wallet-provider** decision (Privy + Pimlico as the product login). ADR 0001's
**onchain paymaster / per-creator tanks** decision still stands.

## Context

We had no users. Privy embedded wallets made one login that did not travel to separate-site
verticals. Sponsorship was wired to Privy's Kernel account instead of whatever wallet the user
brought. We needed one Ethereum account that works on Commonality and on other sites, with gas
tanks that still sponsor wallets that speak ERC-7677.

## Decision

Drop Privy. The user's wallet picks the smart-account type. The UI uses ConnectKit with Base Account
as the passkey "create an account" path, plus ordinary injected wallets. Sponsorship is
capability-driven: `wallet_sendCalls` with `paymasterService` pointing at our ERC-7677 endpoint.
Keep decoding execute calldata **onchain**; do not become a verifying paymaster.

## Alternatives considered

- **Keep Privy, add global wallets** — still vendor login; verticals would share Privy, not a
  portable Ethereum account.
- **Verifying paymaster signed by our server** — rejected; the operator would decide which tank
  pays, against operator-posture.

## Consequences

Normie signup is a Coinbase passkey popup, not email. Wallets without `paymasterService` pay their
own (tiny) Base gas. Base Account uses EntryPoint v0.6, so tanks need a v0.6 paymaster face.
Revisit if Base native account abstraction (EIP-8130) makes ERC-4337 sponsorship unnecessary, or if
a widely used wallet needs another execute-calldata family.
