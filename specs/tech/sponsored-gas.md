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

## Terminology: creator vs. runner

`ProjectFactory.createERC1155AndMarketplaceAndAssuranceContract(...)` emits
`ProjectCreated(creator, token, assuranceContract, marketplace, condition)` where **`creator` is
`msg.sender` — the account that deployed the project**, not a separately-specified field. The
deployer *separately* passes `owner` (who receives ownership of the assurance contract) and
`recipient` (who receives the funds on success); both can be different accounts.

So throughout this doc:

- **creator** = the deploying account (`ProjectCreated.creator` = `msg.sender`). This is the account
  a gas tank is keyed to. It is by definition gas-capable (it just sent a deploy tx).
- **runner / beneficiary** = the `owner` / `recipient` the deployer designates — possibly a
  non-technical person the project is *for*. A tech-savvy creator can deploy and fund a tank on a
  runner's behalf.

This is why gas tanks and enrollment key off the **creator/deployer**, never the runner: the
deployer can always transact, the runner may not be able to.

## Decisions

### 1. Account model — EIP-4337 with Privy (working choice)

**Embedded-wallet provider: Privy.** Best-in-class normie onboarding, provider-agnostic, and
advertises key export (so we're not hard-locked — see lock-in note below).

**Account model: EIP-4337 smart accounts.** Universally supported and what the custom paymaster
below already assumes. (EIP-7702 remains a possible future lighter-weight path; revisit only if
there's a concrete reason and confirm Privy support first.)

These are working choices to unblock implementation, not irreversible commitments — the
embedded-wallet UX is still worth a hands-on spike, and the per-wallet economics should be
sanity-checked before mainnet.

### 2. Bundler — Pimlico (working choice); paymaster — our own contract

Use a vendor bundler for mempool + bundling — **Pimlico** is the working choice: standards-pure
ERC-4337 with bring-your-own-paymaster as a first-class story, and trivially swappable since it
speaks vanilla 4337. (Alchemy / ZeroDev remain alternatives; see the comparison table below.) The
**paymaster is our own contract** (below), because the per-creator-tank / anyone-can-fund / dog-fooded design is
exactly the thing off-chain vendor paymasters can't express. Vendor paymasters do per-policy
balances on a dashboard; they don't do open onchain funding by arbitrary contributors.

#### Provider options — reference comparison

These are the two *separate* vendor choices (embedded wallet + bundler) plus the cross-cutting
account-model axis. **Working choices: Privy (wallet) + Pimlico (bundler) + EIP-4337.** This table
records the alternatives we weighed and why, and is the input to revisit if we ever migrate.

**Embedded-wallet provider** (the normie's invisible wallet):

| Provider | Strengths | Trade-offs |
| --- | --- | --- |
| **Privy** | Best-in-class normie onboarding (email/social), provider-agnostic, huge consumer-crypto adoption, clean card-onramp story | Third-party dependency; pricing scales with MAUs |
| **Coinbase CDP / Smart Wallet** | Tightest **Base** fit (we're on Base), Coinbase brand trust for normies, passkey-based smart wallet | More Coinbase-opinionated; smart-wallet model can be harder to swap out |
| **Dynamic** | Similar to Privy, strong dashboards / multi-chain, good dev UX | Smaller ecosystem than Privy; another vendor lock-in |
| **Turnkey** | Low-level key management, maximum control | We build most of the UX ourselves — more work, fewer batteries included |

**Bundler / AA infra** (mempool + UserOp bundling):

| Vendor | Strengths | Trade-offs |
| --- | --- | --- |
| **Pimlico** | Standards-pure ERC-4337, **bring-your-own-paymaster is first-class** (matches our custom paymaster), easy to swap | Bundler-focused — we assemble more of the stack ourselves |
| **ZeroDev** | Strong smart-account SDK (Kernel), good **EIP-7702** support, custom-paymaster friendly | SDK is somewhat opinionated around their account |
| **Alchemy (Account Kit)** | Full-stack, excellent docs, RPC + bundler + paymaster in one | Steers toward *their* hosted paymaster — fights our "own paymaster" design |

**Account model** (cross-cutting):

- **EIP-4337** (smart accounts) — universally supported, what the paymaster below already assumes.
  Safe default.
- **EIP-7702** (EOA acts as smart account) — newer/lighter, but support is uneven; verify the chosen
  *wallet* provider supports it before betting on it.

**Chosen for now (Base + normies + own paymaster): Privy + Pimlico + EIP-4337** — Pimlico is most
neutral toward our custom paymaster and trivially swappable; Privy gives the best normie wallet UX
with key export. Still worth a hands-on spike of the Privy flow before mainnet, since the embedded
wallet is the piece users actually feel.

**Lock-in note.** What an embedded-wallet provider really sells is secure, *recoverable*,
non-custodial key management run as a 24/7 service (MPC/TSS or enclave-based), plus auth→wallet
binding and recovery — not the trivial parts (key generation, signing). The strategic risk is
portability, not monthly price: Privy advertises **key export**, so users aren't stranded if we
leave. Preserve that property in any integration (don't build flows that assume keys can never
leave Privy), and re-confirm export works as part of the pre-mainnet spike.

### 3. Sponsorship policy — *who* and *which projects*

**Which actions.** Sponsor only contribution/refund-path calls, enforced by the paymaster checking
the UserOp's call target + selector:

- `buyERC1155` (the contribution)
- the USDC `approve`/allowance call, if the flow needs one
- `refundERC1155` (a normie must not need ETH to get their money back)
- the ERC-1155 `setApprovalForAll(market, true)` call needed before refunding, unless the refund
  contract flow changes. Current `refundERC1155(holder, ...)` pulls receipts from `holder` with
  `safeBatchTransferFrom(holder, address(this), ...)`, so the assurance contract must be approved as
  an ERC-1155 operator before the refund transaction can succeed.

Sponsor only **embedded-wallet (card) contributors**; native crypto users already hold ETH.

**Which projects — per-creator gas tanks.** A creator has a persistent ETH tank usable across
**all** their projects. A project is *enrolled* to a creator's tank; sponsorship for a `buyERC1155`
against that project draws from the creator's tank. Because tanks are per-creator and persistent,
there is no per-project "leftover reclaim" problem — unused balance simply rolls into the creator's
next project.

Funding a tank is **non-refundable for v1** (it's a donation to that creator's accessibility), but
the accounting (`tankBalance[creator]` plus the shared EntryPoint deposit) is structured so a
governed withdraw path could be *added* later without migration if non-refundability proves to
deter funding. We start strict because it's simpler and safer, and because per-transaction gas is a
fraction of a cent — seeding a tank with a few cents at a time and letting the dust be lost when a
project wraps is a perfectly acceptable model. Anyone may fund any creator's tank: the creator
themselves, Commonality (we're the initial funder, but via a mechanism open to all, not a privileged
path), or supporters who believe in Commonality / a cause.

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
cap, minimum contribution) are TODO** — set them from the measured gas below, current Base fee
conditions, and a product decision about how much tank-drain risk is acceptable.

### Base Sepolia gas measurements, 2026-06-14

Measured with `hardhat/scripts/measure-primary-market-gas.js` against the deployed Base Sepolia
contracts in `deployments/base-sepolia.env`, using the test payment token (`USDZZZ`). The script
creates a temporary project, mints test payment tokens, buys one ERC-1155 receipt, waits for the
project to fail, approves the receipt transfer back to the assurance contract, and refunds.

Actual gas used in the successful run:

| Operation | Gas used |
| --- | ---: |
| Create temporary measurement project | 3,598,571 |
| Test payment-token mint setup | 33,559 |
| ERC-20 `approve(assuranceContract, amount)` | 45,921 |
| `buyERC1155` | 127,370 |
| ERC-1155 `setApprovalForAll(assuranceContract, true)` for refund | 46,161 |
| `refundERC1155` | 88,575 |

At current gas/ETH prices, creating a project is a few cents, and each within-project action is a fraction of a cent. Very manageable.

Implications for sponsorship budgeting:

- First-time contribution flow, if a separate ERC-20 approval is needed: about **173k gas** for
  `approve + buyERC1155`, before EIP-4337 account/paymaster overhead.
- Refund flow, if ERC-1155 operator approval is not already set: about **135k gas** for
  `setApprovalForAll + refundERC1155`, before EIP-4337 account/paymaster overhead.
- Contract-call gas is small enough that the remaining cap decision is mostly economic/product:
  choose how many failed attempts or low-value attempts a creator tank should tolerate.
- Do not hard-code these as mainnet/Base production constants without remeasuring after any contract
  change and after choosing the account-abstraction provider, because UserOp validation/execution
  overhead is provider/account-model dependent.

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
- `enroll(project)` — registers a project to the calling creator's tank, i.e.
  `creatorOf[project] = msg.sender`. **Creator-only (self-enrollment).** Because the gas tank is
  keyed to the deployer (see Terminology) and the deployer is always gas-capable, requiring the
  creator to call `enroll` does *not* push a gas step onto a non-technical runner — it lands on the
  same technical account that deployed the project. Self-enrollment is also spoofing-proof: a caller
  can only bind a project to their *own* tank, so no one can point someone else's project at a rival
  tank to drain it.
  - Optional convenience (deferred): a keeper that mirrors `ProjectCreated(creator, project, ...)`
    into the paymaster's storage so enrollment is automatic. Safe because the event's `creator` is
    authoritative, but it adds a trusted off-chain liveness dependency; not needed for v1 since
    self-enrollment is cheap and the deployer is already transacting.
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

- Pick final caps + minimum-contribution from measured gas costs plus current Base fee conditions
  (Decision 4). Initial Base Sepolia measurements are recorded in Decision 4 above.
- Pre-mainnet spike of the Privy embedded-wallet flow (UX + confirm key export works) and a
  sanity-check of per-active-wallet economics. Working choices (Privy + Pimlico + EIP-4337) unblock
  implementation now; the 4337-specific half of the paymaster
  (`validatePaymasterUserOp`/`postOp`, `paymasterAndData` layout) targets EntryPoint v0.7, and the
  funding/accounting/enrollment logic plus `GasTankFunder` are provider-independent.
- Gated-tank co-signature mode (deferred anti-abuse lever).
- The broader "gather USDC, convert/route it" infrastructure that `GasTankFunder` is the first
  instance of — including the genuinely hard USDC→fiat offramp case.
