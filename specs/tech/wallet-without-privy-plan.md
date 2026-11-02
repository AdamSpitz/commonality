# Plan: drop Privy, let users bring a portable wallet

Status: **approved direction (Adam, 2026-11-01). Phase 1 local-owner spike done; browser questions still open.** Background and options:
[gas-sponsorship.md](./gas-sponsorship.md). Current design: [sponsored-gas.md](./sponsored-gas.md),
[ADR 0001](/specs/decisions/0001-custom-onchain-paymaster.md).

## Goal

A normie can make one Ethereum account that works on Commonality **and** on any other site, including our
separate-site verticals, and still get gasless contributions, refunds and statement signatures from the gas
tanks. We have no users yet, so we can remove Privy outright. We do not need a migration path.

## The key idea

Without Privy, **the user's wallet picks the smart-account type, not us.** Sponsorship then works like this:

1. The app sends calls with EIP-5792 `wallet_sendCalls` and adds
   `capabilities: { paymasterService: { url: <our /sponsored-gas/paymaster> } }` (ERC-7677).
2. A wallet that supports that capability calls our paymaster endpoint. The wallet's own bundler submits the
   UserOperation, and our onchain tank pays for it.
3. A wallet that does not support it (a plain EOA in MetaMask or Rabby) sends ordinary transactions and pays
   its own gas, which is fractions of a cent on Base. This fallback is fine for crypto-native users.

Supporting another wallet costs us, per **account family**:
- an execute-calldata decoder in `CreatorGasTank`, `StatementGasTank`, and the API's
  `platform-api-service/src/sponsoredGasPaymaster.ts`;
- a tank deployment that matches the wallet's **EntryPoint version** (both tanks are EntryPoint v0.7 today).

Keep the decoding **onchain**. Do not switch to a "verifying paymaster" where our server signs approvals.
That would make Commonality's server the thing that decides which tank pays for what, which conflicts with
[operator-posture.md](/specs/product/legal/operator-posture.md).

## Phases

Each phase is one PR into `dev` (see [branching.md](/workflow/branching.md)). Do them in order. Phase 1
decides the shape of Phase 3.

### Phase 1 — Spike: does Base Account work with our paymaster? (report results to Adam before Phase 3)

On Base Sepolia, connect a real Base Account (formerly Coinbase Smart Wallet) and answer these questions:

1. **Which EntryPoint version does it use?** Base's docs only show v0.6 examples. If it is v0.6 only, both
   tanks need a v0.6 variant (Phase 3b).
2. **Does it honor a third-party `paymasterService` URL** (ours), not only Coinbase's paymaster?
3. **What exact `userOp.callData` does it produce** for a single call and for an atomic batch? We expect
   `execute(address,uint256,bytes)` for a single call (same selector as SimpleAccount, already decoded) and
   `executeBatch((address,uint256,bytes)[])` for a batch (not decoded yet). Capture the real bytes.
4. **What do `wallet_getCapabilities` return** for Base Account, MetaMask and Rabby on Base Sepolia?
5. **Is Pimlico still needed?** The wallet's own bundler submits, so Pimlico may only matter for tests.

How to run it: passkey signup needs a human, so either ask Adam to do the browser part, or first try viem's
`toCoinbaseSmartAccount` with a local private-key owner plus a bundler. That exercises the same account
contract. A local-owner run answers 1, 3 and 5. Only a real wallet answers 2 and 4.

Record the findings in [sponsored-gas.md](/specs/tech/sponsored-gas.md), following the "Base Sepolia gas
measurements" section style, and keep any script under `hardhat/scripts/` or `spikes/`.

**Local-owner results (script `hardhat/scripts/spike-base-account-calldata.mjs`):** EntryPoint **v0.6**;
single `execute(address,uint256,bytes)` (`0xb61d27f6`); batch `executeBatch((address,uint256,bytes)[])`
(`0x34fcd5be`). Pimlico is not needed to encode these calls.

**Browser:** Base Account on Base Sepolia advertises `paymasterService` and atomic batches. Coinbase **does** honor a third-party paymaster URL; it must be **HTTPS** (`Paymaster URL must be a valid HTTPS URL` from `keys.coinbase.com` against the local HTTP echo). See [sponsored-gas.md](/specs/tech/sponsored-gas.md). MetaMask/Rabby capabilities not captured. Phase 1 spike is done enough to start Phase 2/3b.

### Phase 2 — Capability-driven sponsorship in the SDK/UI (works for any wallet)

In progress: `wallet_getCapabilities` + `VITE_SPONSORED_GAS_PAYMASTER_URL` on `wallet_sendCalls`; UI batching no longer keys off Privy.

- In `sdk/src/subsystems/lazy-giving/actions.ts` (`sendAtomicContractCalls`) and
  `ui/src/commonality/lib/causeRoster.ts` (`sendCallsPreferAtomic`), call `wallet_getCapabilities` once per
  account and chain. When `paymasterService` is supported, add our paymaster URL to `wallet_sendCalls`.
- Replace the `isPrivySmartWalletEnabled` gates (for example `batchApproval` in
  `ui/src/lazy-giving/components/BuyTokensSection.tsx`, plus `RefundSection.tsx`) with "the wallet
  supports atomic batches" / "the wallet supports paymasterService".
- Add a config value for the paymaster URL that is not Privy-named (for example `VITE_SPONSORED_GAS_PAYMASTER_URL`).
- Tests: unit tests for both capability branches. Existing mocks of `wallet_sendCalls` live in
  `sdk/src/subsystems/lazy-giving/actions.allowance.test.ts`.

### Phase 3 — Account-family support in the tanks and the paymaster endpoint

3a. **Coinbase / Base Account decoder.** Add `executeBatch((address,uint256,bytes)[])` decoding next to the
existing SimpleAccount and ERC-7579 branches in `CreatorGasTank._validateAccountCall` and the equivalent in
`StatementGasTank`. Teach `sponsoredGasPaymaster.ts` (which accepts only Kernel v3 today) the same formats.
Keep ERC-7579, which covers Kernel v3, Biconomy Nexus and Safe7579. Unknown formats must still revert or 400.
Test with real calldata captured in Phase 1.

3b. **Only if Phase 1 says v0.6:** build v0.6 versions of both tanks. Pull the policy logic (tank balances,
enrollment, caps, allowed selectors) into shared internal code. Each EntryPoint version gets a thin paymaster
wrapper with its own `UserOperation` struct and base contract. The API endpoint must then return v0.6-shaped
data (`paymasterAndData`) or v0.7-shaped data (`paymaster` + `paymasterData` + gas limits), depending on the
request's EntryPoint (ERC-7677 requires this). Funders currently fund one tank contract. Decide with Adam
whether two contracts per tank type is acceptable, or whether funding should be split by EntryPoint version.
**Ask before choosing.**

Redeploy to Base Sepolia with the incremental deploy script, and update the verifier's sponsored-gas config check.

### Phase 4 — Connect Wallet UX

- Make **Base Account** the main "create an account" path (passkey, no extension), and keep ConnectKit's
  usual list (MetaMask, Rabby, WalletConnect) for people who already have a wallet. Check whether ConnectKit's
  Coinbase connector can be set to smart-wallet-only or prefer it. If not, add wagmi's `baseAccount` /
  `coinbaseWallet({ preference: 'smartWalletOnly' })` connector.
- Wording for normies: "Create an account" / "I already have a wallet". Don't say "Connect Wallet" to
  first-time card payers.
- Coinbase Onramp (card → USDC) stays and works with any address. Re-check that the walletless contribution
  flow still works end to end with a fresh Base Account.
- Separate-site verticals: the same Base Account appears on every site. Confirm with the vertical repo
  mentioned in [inbox.md](/inbox.md).

### Phase 5 — Remove Privy and update the docs

- Delete `ui/src/privy/`, `ui/src/shared/components/PrivyWalletButtonImpl.tsx`, the Privy branches in
  `ui/src/wagmi.ts`, `ui/src/main.tsx`, `ui/src/shared/components/WalletButton.tsx` and the LazyGiving
  components and tests, plus `@privy-io/react-auth` and `@privy-io/wagmi` in `ui/package.json`, the
  `VITE_PRIVY_*` vars in `ui/.env.example` / `scripts/setup-env.sh`, and the Privy console-error
  allowlist entries in `ui/e2e/fixtures/benign-console-errors.ts`. Drop Pimlico too if Phase 1 shows it is
  unused outside tests.
- Write a **new ADR** (copy `specs/decisions/0000-template.md`) that supersedes ADR 0001's wallet-provider
  decision. ADRs are immutable, so do not edit 0001's decision text. Only add a "Superseded in part by
  00NN" line.
- Update [sponsored-gas.md](/specs/tech/sponsored-gas.md) (Decision 1, provider tables, "pin one account
  type"), retire or rewrite [privy-pimlico-setup.md](/workflow/privy-pimlico-setup.md) and
  [sponsored-gas-live-trace.md](/workflow/sponsored-gas-live-trace.md), and grep `specs/` and `docs/` for
  remaining "Privy" references.
- Remove this item from [focus.md](/focus.md) and the inbox item that points at [gas-sponsorship.md](./gas-sponsorship.md).

## Later, not now

- **Add more account families only when a real wallet needs one** (for example MetaMask's EIP-7702 smart
  account, whose execute format is unverified). Each one is a decoder plus tests, as in Phase 3a.
- **Base native account abstraction (EIP-8130)** may later make sponsorship a chain feature instead of
  ERC-4337. Watch it. Don't build for it yet.

## Trade-offs Adam accepted

- No email login. Passkeys only for the normie path, which some users find confusing.
- A Coinbase popup (keys.coinbase.com) appears during signup and signing, so we depend on Coinbase's key
  infrastructure for normie accounts.
- Users of wallets without `paymasterService` pay their own (tiny) gas.
