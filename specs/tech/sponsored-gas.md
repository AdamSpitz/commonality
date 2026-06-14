# Sponsored gas / paymaster support for contributions

This is workstream #4 from [bridges.md](/specs/tech/bridges.md). It covers how a card-paying
("walletless") contributor signs the `buyERC1155` call from their own embedded wallet without
holding ETH and without ever seeing a gas prompt.

Scope note: gas sponsorship is decided **at the paymaster**, not inside the assurance/market
contract. `buyERC1155`/`refundERC1155` (see
[ERC1155PrimaryMarket.sol](/hardhat/contracts/individual-projects/ERC1155PrimaryMarket.sol)) do
not know or care whether gas was sponsored.

**Chosen direction:** a **custom onchain paymaster with per-creator gas tanks**, fundable by
anyone (creator, Commonality, or believers in the project), dog-fooding the donation ethos. This
promotes what an earlier draft called the "deferred end-state (B2)" to *the plan*. We're doing it
now while we're testnet-only with no users, so the contract isn't frozen.

## Decisions

### 1. Account model — defer to the embedded-wallet provider

EIP-4337 smart accounts vs. EIP-7702 EOA-delegation: pick whichever our chosen embedded-wallet
provider (TODO line 9) does best. Downstream of the wallet-provider choice. (The custom paymaster
below is EIP-4337; if we go 7702 the paymaster integration is equivalent but check provider
support.)

### 2. Bundler — dedicated infra vendor; paymaster — our own contract

Use a vendor bundler (Pimlico / Alchemy / ZeroDev) for mempool + bundling, but the **paymaster is
our own contract** (below), because the per-creator-tank / anyone-can-fund / dog-fooded design is
exactly the thing off-chain vendor paymasters can't express. Vendor paymasters do per-policy
balances on a dashboard; they don't do open onchain funding by arbitrary contributors.

### 3. Sponsorship policy — *who* and *which projects*

**Which actions.** Sponsor only contribution-path calls, enforced by the paymaster checking the
UserOp's call target + selector:

- `buyERC1155` (the contribution)
- the USDC `approve`/allowance call, if the flow needs one
- `refundERC1155` (a normie must not need ETH to get their money back)

Sponsor only **embedded-wallet (card) contributors**; native crypto users already hold ETH.

**Which projects — per-creator gas tanks.** A creator has a persistent ETH tank usable across
**all** their projects. A project is *enrolled* to a creator's tank; sponsorship for a `buyERC1155`
against that project draws from the creator's tank. Because tanks are per-creator and persistent,
there is no per-project "leftover reclaim" problem — unused balance simply rolls into the creator's
next project.

Funding a tank is **non-refundable** (it's a donation to that creator's accessibility). Anyone may
fund any creator's tank: the creator themselves, Commonality (we're the initial funder, but via a
mechanism open to all, not a privileged path), or supporters who believe in Commonality / a cause.

### 4. Budget caps and rate limits

The per-creator tank balance is the primary cap — sponsorship stops when a creator's tank is empty.
On top of that, in the paymaster:

- **Per-wallet cap** — N sponsored ops (or X gas) per wallet per window. Backstop against one wallet
  draining a tank.
- **Minimum-contribution check** — only sponsor a `buyERC1155` whose USDC value clears a floor, so
  an attacker can't drain a tank via many dust contributions paying per-tx overhead.
- **Per-session cap** — tie sponsorship to an active contribution session (off-chain sequencing).

`buyERC1155` is partly self-protecting: to get sponsored gas you must actually transfer USDC into
the contract, so spam is bounded by the attacker's own USDC outlay. **Exact numbers (per-wallet
cap, minimum contribution) are TODO** — set them after measuring real `buyERC1155`/`refundERC1155`
gas on Base testnet.

### 5. Abuse monitoring — verifier check

Add a verifier check (skill: using-verifier) covering: tank drain rate vs. expected, ratio of
sponsored ops to completed on-ramp purchases (divergence ⇒ bypassing the on-ramp coupling),
per-wallet anomalies (repeated failures, wallets hitting caps).

## Contracts to write

### `CreatorGasTank` (EIP-4337 paymaster)

- One ETH deposit at the EntryPoint (all tanks share it physically; per-creator split is internal
  accounting).
- `tankBalance[creator]` and `creatorOf[project]` (enrollment) — both in the paymaster's **own
  storage**, so reads stay within ERC-7562 validation storage rules.
- `fundTank(creator) payable` — anyone deposits ETH; forwards to the EntryPoint deposit, credits
  `tankBalance[creator]`.
- `enroll(project, creator)` — registers a project to a creator's tank. Decide permissioning:
  creator-only vs. open vs. driven by an indexer/keeper off the `ProjectCreated` event (factory
  already emits `(creator, token, assuranceContract, marketplace, condition)`).
- `validatePaymasterUserOp`: read the project address from `paymasterAndData`, verify the UserOp
  callData targets that project's `buy`/`refundERC1155`, verify enrollment + tank balance + caps —
  all from own storage + calldata (no external-contract storage reads at validation time).
- `postOp`: debit the creator's tank by actual gas used.
- **Open-with-caps for v1.** Optional future lever: per-tank "gated" mode requiring a Commonality
  session co-signature in `paymasterAndData` (a light anti-abuse gate, no custody). Deferred.

### `GasTankFunder` (USDC → ETH swap adapter)

Lets USDC fund an (ETH) gas tank — the concrete first instance of a pattern we'll need broadly
under the USDC-only plan ("gather USDC, then do something else with it").

- `fundTankWithUSDC(creator, usdcAmount, minEthOut)` — pulls USDC, swaps USDC→ETH on a Base DEX
  (Uniswap), deposits the ETH into `CreatorGasTank` crediting `creator`. `minEthOut` for slippage.
- **Decoupled from the source of the USDC** — it doesn't touch assurance-contract internals. The
  USDC can come from a creator's *withdrawn* project proceeds, a donation earmarked for gas, or a
  purpose-built "fund the gas commons" cause. This keeps dog-fooding clean without entangling the
  funder with LazyGiving's contracts.

**Do not siphon in-flight backer contributions.** USDC sitting in a live assurance contract is the
backers' refundable money; it must not be routed to gas before the project resolves. Tank funding
comes only from withdrawn proceeds, earmarked donations, or a dedicated gas-funding cause.

**USDC→ETH is onchain-easy (a DEX swap). USDC→fiat (e.g. CAD for Canadian projects) is NOT this** —
that's the regulated offramp direction from [bridges.md](/specs/tech/bridges.md) (KYC-gated,
licensed) and `GasTankFunder` is not a template for it. Same words ("do something with the USDC"),
very different problem.

## Open / deferred

- Pick caps + minimum-contribution from a measured Base-testnet `buyERC1155` gas cost (Decision 4).
- Enrollment permissioning (creator-only vs. open vs. keeper-driven).
- Whether to let a creator/funder withdraw a tank (currently non-refundable; revisit if it deters
  funding).
- Gated-tank co-signature mode (deferred anti-abuse lever).
- The broader "gather USDC, convert/route it" infrastructure that `GasTankFunder` is the first
  instance of — including the genuinely hard USDC→fiat offramp case.
