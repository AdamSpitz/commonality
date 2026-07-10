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

### 1. Account model — EIP-4337 with Privy (ratified)

**Embedded-wallet provider: Privy — ratified 2026-06-18.** Best-in-class normie onboarding,
provider-agnostic, and advertises key export (so we're not hard-locked — see lock-in note below).
The provider choice is settled; the remaining Privy work is the hands-on feasibility spike (the
`[confirm in spike]` items in [bridges.md](/specs/tech/bridges.md)) and the per-wallet economics
sanity-check before mainnet — neither reopens *which* provider.

**Account model: EIP-4337 smart accounts.** Universally supported and what the custom paymaster
below already assumes. (EIP-7702 remains a possible future lighter-weight path; revisit only if
there's a concrete reason and confirm Privy support first.)

The **Privy** wallet provider is ratified (2026-06-18). The account model (EIP-4337) and bundler
(Pimlico) remain working choices to unblock implementation, not irreversible commitments — the
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
account-model axis. **Choices: Privy (wallet) — ratified; Pimlico (bundler) + EIP-4337 — working.**
This table records the alternatives we weighed and why, and is the input to revisit if we ever migrate.

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

(A *per-session cap* tying sponsorship to a Commonality-signed contribution session was considered
but **deferred** — it requires a backend co-signature in `paymasterAndData`, which is the gated-tank
mode below. v1 is **open-with-caps**: the two onchain caps above plus tank balance, no off-chain
session dependency.)

`buyERC1155` is partly self-protecting: to get sponsored gas you must actually transfer USDC into
the contract, so spam is bounded by the attacker's own USDC outlay.

**Values: configurable params with conservative placeholder defaults for v1.** The two caps are
owner-settable storage params, seeded with conservative testnet placeholders, so the *mechanism*
ships now and the *numbers* are tuned after measuring full UserOp overhead (account validation +
paymaster + execution) under real Base fee conditions before mainnet. Do not treat the placeholders
as production constants.

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

## Implementation status

As of 2026-06-14, the provider-independent `CreatorGasTank` foundation has been implemented as a
Hardhat contract spike:

- Contract: [`hardhat/contracts/sponsored-gas/CreatorGasTank.sol`](/hardhat/contracts/sponsored-gas/CreatorGasTank.sol)
- Test harness: [`hardhat/contracts/test/MockEntryPoint.sol`](/hardhat/contracts/test/MockEntryPoint.sol)
- Tests: [`hardhat/test/CreatorGasTank.test.js`](/hardhat/test/CreatorGasTank.test.js)
- Dependency added: `@account-abstraction/contracts` EntryPoint v0.7 interfaces/base paymaster.

Implemented and tested:

- per-creator `tankBalance` accounting;
- anyone-can-fund `fundTank(creator)` with ETH forwarded into the shared EntryPoint deposit;
- creator self-enrollment via `enroll(project)`;
- configurable per-wallet sponsored-wei cap/window;
- validation against enrolled project + tank balance + wallet cap;
- configurable minimum contribution floor for sponsored `buyERC1155` calls;
- `postOp` debiting by actual gas cost;
- SimpleAccount and ERC-7579 (Kernel v3) calldata decoding for `execute`/`executeBatch`;
- sponsorship allowlist for `buyERC1155`, `refundERC1155`, settlement-token `approve(project, amount)`,
  and ERC-1155 `setApprovalForAll(project, true)`;
- incremental deployment-script wiring for `CreatorGasTank` and local mock EntryPoint deployment;
- guarded verifier check for deployed sponsored-gas paymaster/EntryPoint config and bytecode.

Not done yet / not production-ready:

- **Privy+Pimlico live UserOp confirmation — DONE 2026-07-10.** Confirmed live on Base Sepolia
  (mined tx `0xf59d2d4aaf6ba8dc5d51ee04cf9f1903cdc6e7f19d5133c017dafba7e6d94799`, smart wallet
  `0xe16dA231F6db5398C8343df199fBdeADd01B1F13`). **Finding:** the real Kernel v3 account emits the
  **ERC-7579 `execute(bytes32 mode, bytes executionCalldata)` (selector `0xe9ae5c53`)**, *not* the
  Kernel v2 `execute(address,uint256,bytes,uint8)` shape the decoder originally targeted — those
  would have hit `UnsupportedAccountCall`. The decoder has been **retargeted** to ERC-7579: single
  mode (`mode` byte 0 = `0x00`) parses the packed `target|value|callData`; batch mode (`0x01`) decodes
  `abi.encode(Execution[])`. Verified live: `factory`/`factoryData` non-empty on the first op
  (counterfactual inline deploy), Pimlico paymaster (`0x7777…834C`) populated `paymasterAndData` and
  sponsored the op (donor paid 0 gas).
- **Mainnet cap tuning.** Placeholder configurable caps exist, but production values still need real
  UserOp overhead measurements.
- **Deployment/wiring.** The incremental deployment script can deploy `CreatorGasTank` and write
  paymaster config to env files, but there is no testnet deployed paymaster address, bundler config,
  UI flow, or behavioral verifier monitoring yet. A guarded static testnet check now verifies the
  configured paymaster and EntryPoint bytecode once deployed.
- **`GasTankFunder`.** The USDC→ETH swap adapter has not been implemented.
- **Gated/session mode.** Still deferred.

## Contracts to write / finish

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
  - **Calldata decoding — pin one account type.** In ERC-4337 `userOp.callData` calls the *smart
    account's* `execute`/`executeBatch`, with the real `buyERC1155`/`refundERC1155` call wrapped
    inside. The paymaster must decode that wrapper to extract the inner target + selector, and the
    wrapper encoding is account-implementation-specific. **For v1 we standardize on Kernel**, the
    Privy smart-wallet implementation selected for Commonality. Kernel v3 uses the **ERC-7579**
    unified entrypoint `execute(bytes32 mode, bytes executionCalldata)` (selector `0xe9ae5c53`),
    confirmed against a real Privy+Pimlico UserOp on 2026-07-10. `CreatorGasTank` decodes it: single
    mode parses the packed `target|value|callData`, batch mode decodes `abi.encode(Execution[])`. It
    retains SimpleAccount `execute`/`executeBatch` support for local/reference tests. (The earlier
    Kernel v2 `execute(address,uint256,bytes,uint8)` shape was a wrong guess and has been removed.)
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

- **Privy+Pimlico spike (blocks finishing `validatePaymasterUserOp`):** confirm which smart-account
  implementation the Pimlico SDK wraps the Privy signer in, and capture its exact
  `execute`/`executeBatch` ABI so the paymaster's calldata decoder matches. Also: verify Privy key
  export works, eyeball the wallet UX, and sanity-check per-active-wallet economics. Everything
  *except* `validatePaymasterUserOp`'s decoder is provider-independent and can be built first
  (`fundTank`, `enroll`, tank accounting, caps, `postOp` shape, `GasTankFunder`) against the
  EntryPoint v0.7 interface.
- ~~Add the ERC-4337 dependency to `hardhat/package.json` (`@account-abstraction/contracts`, EntryPoint
  v0.7) when implementation starts.~~ Done in the initial `CreatorGasTank` spike.
- `GasTankFunder` DEX specifics: Uniswap v3 router + USDC/WETH addresses + fee tier on Base /
  Base Sepolia, and a fork/mock test strategy. Comes after `CreatorGasTank`; does not block it.
- Tune cap/minimum-contribution values from real UserOp overhead before mainnet (placeholders ship
  for testnet — see Decision 4).
- Gated-tank co-signature mode (deferred anti-abuse lever; this is also where a per-session cap would
  live if we ever add one).
- The broader "gather USDC, convert/route it" infrastructure that `GasTankFunder` is the first
  instance of — including the genuinely hard USDC→fiat offramp case.

## I asked another AI whether we were ready to implement, and it said

Short answer: **ready to start implementation as a testnet/contract spike, but not ready to ship the full sponsored-gas product end-to-end.**

I read:

- `specs/tech/sponsored-gas.md`
- `specs/tech/bridges.md`
- `hardhat/contracts/individual-projects/ERC1155PrimaryMarket.sol`
- relevant project TODO / Privy / factory references

### What is ready

The spec is unusually concrete now. These pieces are implementable:

1. **Custom `CreatorGasTank` paymaster**
   - Per-creator ETH accounting.
   - Anyone-can-fund `fundTank(creator)`.
   - `enroll(project)` keyed by deployer/creator.
   - `postOp` debiting actual gas.
   - Sponsorship limited to contribution/refund-ish calls.

2. **Basic testnet-only enrollment/funding flow**
   - Creator deploys a project.
   - Creator enrolls its assurance/market project address.
   - Someone funds the creator tank.
   - UserOps for contribution/refund can be sponsored until balance is depleted.

3. **Privy as wallet provider**
   - The UI already has Privy integration scaffolding.
   - The spec has ratified Privy as the embedded-wallet provider (2026-06-18).

4. **Gas measurements**
   - The spec now has Base Sepolia measurements for approval/buy/refund, enough to pick initial conservative caps.

### What is not fully resolved

There are a few important gaps before calling this “ready” in the production sense.

#### 1. Paymaster calldata validation depends on the smart-account implementation

The spec says:

> verify the UserOp callData targets that project's `buy`/`refundERC1155`

But in EIP-4337, `userOp.callData` usually targets the **smart account**, not the market contract directly. The paymaster must decode the smart account’s execution format, e.g. `execute(address,uint256,bytes)` or batch execution format.

That means the paymaster cannot be truly generic unless we standardize which account implementation Privy/Pimlico will use, or we explicitly support a small set of account call formats.

**Before production:** confirm Privy + Pimlico account type and execution calldata format.

#### 2. The account-abstraction dependency is not in `hardhat/package.json`

`hardhat` currently has OpenZeppelin contracts, but not the ERC-4337 account-abstraction package/interfaces. We need to add the appropriate dependency, probably `@account-abstraction/contracts` or equivalent, matching **EntryPoint v0.7**.

#### 3. Caps are still product/security TODOs

The spec says exact numbers are TODO. We can implement configurable caps, but we still need initial values for:

- per-wallet sponsored ops/window
- per-wallet gas/window or spend/window
- minimum contribution amount
- session expiry / session count if we implement session gating now

For testnet, placeholder constants are fine. For mainnet, not fine.

#### 4. “Per-session cap” is underspecified

The spec mentions:

> tie sponsorship to an active contribution session

But the chosen v1 paymaster says “open-with-caps” and defers co-signature mode.

So we need to decide whether v1 includes:

- no session gating, just onchain caps; or
- signed `paymasterAndData` sessions from Commonality backend; or
- defer sessions entirely.

I’d recommend **defer session signatures for v1** and implement the contract so a gated mode can be added later.

#### 5. `GasTankFunder` needs DEX-specific design

`GasTankFunder` is conceptually straightforward, but implementation needs concrete choices:

- Uniswap v3 router address on Base/Base Sepolia
- USDC/token addresses
- WETH address
- swap path/fee tier
- test strategy with mocks/forking

This can be implemented after `CreatorGasTank`; it should not block the paymaster spike.

### Recommended implementation plan

I think we are ready to implement in this order:

1. **Add ERC-4337 dependency and write `CreatorGasTank` skeleton**
   - EntryPoint v0.7 interface.
   - `fundTank`
   - `enroll`
   - tank accounting
   - owner/admin config for caps

2. **Write Hardhat unit tests for non-4337 logic**
   - funding credits tank
   - enrollment works
   - tank debits cannot underflow
   - unauthorized/invalid cases

3. **Add paymaster validation/postOp tests**
   - likely with a mock EntryPoint / minimal UserOp harness first
   - then real EntryPoint-style tests if dependency supports it cleanly

4. **Decide/confirm Privy/Pimlico smart account calldata format**
   - only then finalize `validatePaymasterUserOp` decoding.

5. **Implement `GasTankFunder` separately**
   - probably with a mock swap router first, then Base Sepolia integration.

6. **Add verifier check**
   - after there is something deployed/observable.

### Verdict

**Ready to start:** yes, for a scoped testnet implementation of `CreatorGasTank`.

**Ready to fully implement the whole sponsored-gas product:** not quite. The main blocker is the smart-account calldata format and provider/account details. Without that, we can build most of the paymaster, but not safely finish the “only sponsor `buyERC1155`/refund paths” validation.