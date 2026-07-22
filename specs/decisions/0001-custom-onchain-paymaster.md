# 0001. Custom onchain paymaster with per-creator gas tanks

- **Status:** Accepted
- **Date:** 2026-06-18 (wallet provider ratified; paymaster direction set)
- **Related specs:** [`specs/tech/sponsored-gas.md`](../tech/sponsored-gas.md),
  [`specs/tech/bridges.md`](../tech/bridges.md)

## Context

Card-paying ("walletless") contributors need to sign `buyERC1155` from their own
embedded wallet without holding ETH and without ever seeing a gas prompt. That requires
three separable choices: an embedded-wallet provider, an ERC-4337 account model +
bundler, and *who pays for gas* (the paymaster).

The gas-sponsorship decision lives **at the paymaster**, not inside the assurance/market
contract — `buyERC1155`/`refundERC1155` don't know or care whether gas was sponsored.
This meant we could pick the paymaster design independently of the contract surface. We
made these choices while still testnet-only with no users, so nothing is frozen.

## Decision

- **Embedded wallet: Privy** (ratified) — best-in-class normie onboarding,
  provider-agnostic, advertises key export so we're not hard-locked.
- **Account model: EIP-4337 smart accounts; bundler: Pimlico** (working choices) —
  standards-pure 4337 with bring-your-own-paymaster as a first-class story, trivially
  swappable since it speaks vanilla 4337.
- **Paymaster: our own onchain contract** with **per-creator gas tanks, fundable by
  anyone** (creator, Commonality, or believers in the project) — dog-fooding the
  donation ethos. This is the decision this ADR primarily records.

## Alternatives considered

- **Vendor off-chain paymaster (Alchemy Account Kit / ZeroDev / Pimlico hosted)** —
  rejected for the paymaster itself. Vendor paymasters do per-policy balances on a
  dashboard; they *can't* express open onchain funding by arbitrary contributors, which
  is the whole point of the per-creator-tank design. Alchemy in particular steers toward
  its own hosted paymaster, fighting this design.
- **Coinbase CDP / Dynamic / Turnkey (wallet)** — weighed against Privy. Coinbase is the
  tightest Base fit but more Coinbase-opinionated and harder to swap; Dynamic is another
  lock-in with a smaller ecosystem; Turnkey means building most of the UX ourselves.
- **EIP-7702 account model** — a possible lighter-weight future path, deferred. EIP-4337
  is universally supported and is what the custom paymaster already assumes.

## Consequences

We own more of the stack (we assemble the paymaster contract ourselves rather than
buying it), in exchange for a funding model no vendor offers and that embodies the
product's ethos. The bundler and account-model choices are deliberately kept swappable.

**What would make us revisit:**
- **Before mainnet** — sanity-check per-wallet economics, and run the hands-on Privy
  feasibility spike (the `[confirm in spike]` items in `bridges.md`). Neither reopens
  *which* provider; they gate go-live.
- A concrete reason to move to **EIP-7702** (confirm Privy support first).
- A vendor migration — the comparison tables in `sponsored-gas.md` are the input to that
  decision.
