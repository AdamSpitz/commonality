# Spike: Privy + Pimlico embedded-wallet / sponsored-UserOp feasibility

**Provider is already ratified (Privy, 2026-06-18; Kernel smart accounts; Pimlico
bundler). This is a hands-on *feasibility* spike, not a provider re-evaluation.**
Its job is to settle the handful of things about the walletless donor stack that
"no vendor documents and we refuse to guess" — the items flagged
**`[confirm in spike]`** in [`specs/tech/bridges.md`](../../specs/tech/bridges.md)
(§"Provider chosen") and [`specs/tech/sponsored-gas.md`](../../specs/tech/sponsored-gas.md)
(§1). Account/credential setup is a separate, already-good doc:
[`workflow/privy-pimlico-setup.md`](../../workflow/privy-pimlico-setup.md) — do that first.

> **Why it matters:** a donor logs in with Privy (email OTP), gets an EIP-4337
> **Kernel** smart account that is *not deployed onchain until their first
> `buyERC1155`*, and their contribution UserOp must (a) carry the account-deploy
> `initCode` on that first op and (b) be gas-sponsored by a paymaster. If any link
> in that chain doesn't hold, the "feels like a normal website, no gas, no
> seed phrase" promise breaks. Everything else (Base support, Kernel ABI on paper,
> economics) is known; this confirms the live behavior.

## The questions this spike must answer (the pass/fail checklist)

Each is a `[confirm in spike]` item today. Record the result of each in
`bridges.md` / `sponsored-gas.md` when done.

| # | Question | PASS looks like |
|---|----------|-----------------|
| 1 | **Counterfactual deploy pattern.** Does the first UserOp from a fresh Kernel account carry `initCode` and deploy the account inline? | ✅ **PASS 2026-07-10.** First UserOp had non-empty `factory`/`factoryData` (v0.7 `initCode` form); smart wallet `0xe16d…` now has bytecode on Base Sepolia. |
| 2 | **Paymaster sponsors the deploy-inclusive first op.** | ✅ **PASS 2026-07-10.** Mined op (`0xf59d2d4a…`) has populated `paymasterAndData` (Pimlico `0x7777…834C`); donor paid 0 gas. |
| 3 | **Kernel calldata matches our decoder.** The `execute`/`executeBatch` calldata Kernel produces matches what `CreatorGasTank` decodes. | ✅ **PASS 2026-07-10 after retarget.** Real calldata is **ERC-7579 `execute(bytes32,bytes)` (`0xe9ae5c53`)**, NOT the Kernel v2 `execute(address,uint256,bytes,uint8)` shape originally coded — that would have reverted `UnsupportedAccountCall`. `CreatorGasTank` was retargeted to ERC-7579 (single packed `target\|value\|callData`; batch `abi.encode(Execution[])`) with Hardhat coverage. |
| 4 | **Key export works.** Privy's user-key-export escape hatch functions against a real embedded account (anti-lock-in / pre-mainnet gate). | You can export the embedded wallet's private key from the Privy UI and it controls the same EOA signer. |
| 5 | **Login/recovery modal UX holds the walletless framing end-to-end.** | Email-OTP sign-in → wallet auto-created → contribute, with no seed-phrase / "connect a wallet" language leaking through. Note any wording that breaks the framing. |
| 6 | **Per-wallet / MAU economics sanity check** (before mainnet, not blocking). | Rough Privy MAU + Pimlico gas-sponsorship cost per donor is within the range assumed in `sponsored-gas.md`. |

## What's automated vs. what only you can do

Unlike [`spikes/coinbase-onramp/`](../coinbase-onramp/), this spike has **no
standalone script harness** — it runs against the **real UI** (the Privy provider,
smart-wallet config, and `buyProjectTokens` call all live in `ui/`), because the
thing under test *is* that integration. So the "automated" part is the app itself;
the human part is driving a browser and reading the bundler trace.

**A fresh LLM can do (no human/secrets needed):**
- Explain this spike and its checklist (this file).
- Do the **code wiring** step below (route contributions through the Privy
  smart-wallet client) — this is a prerequisite and is *not done yet* (see caveat).
- Help read a captured UserOp trace against the `CreatorGasTank` decoder (item 3).

**Only a human can do (needs real login + a browser + dashboards):**
- Complete the Privy **email-OTP** login in the browser.
- Read the live **UserOp trace** in the Pimlico dashboard / network tab.
- Exercise **key export** (item 4) and judge the **modal UX** (item 5).

## ✅ Update 2026-07-10: the contribution path now sends a sponsored UserOp

Items 1–3 are **confirmed** (see the table above). The wiring below is done: `useWriteClients`
returns the Privy Kernel smart-account client, and `buyProjectTokens` batches approve+buy into one
ERC-7579 UserOp. Items 4 (key export) and 5 (modal UX) remain human-only and open. The original
caveat is preserved below for historical context.

## ⚠️ Original load-bearing caveat (now resolved): the contribution path did not send a UserOp yet

Privy is configured for **Kernel smart wallets**
(`ui/src/privy/PrivyAppProvider.tsx`: `smartWalletType: 'kernel'`, bundler/paymaster
URLs wired from env), **but the transaction path still signs from the embedded EOA,
not the smart wallet.** `useWriteClients` (`ui/src/shared/hooks/useWriteClients.ts`)
returns wagmi's `useWalletClient()`, and nothing in `ui/src` uses Privy's
`useSmartWallets()` / a smart-wallet client. So **clicking "Give" today produces a
normal EOA transaction, not a sponsored 4337 UserOp** — items 1–3 will *not* appear
in Pimlico from the current button.

**Therefore step 1 of running the spike is a code change**, not a click:

- Add Privy smart-wallet client usage (`useSmartWallets` from
  `@privy-io/react-auth/smart-wallets`) and route `buyProjectTokens` /
  `buyERC1155` through the smart-account client so it sends a UserOp via the
  configured Pimlico bundler/paymaster, instead of the wagmi EOA `walletClient`.
- Scope it behind the existing `isPrivyEnabled` / smart-wallet-config presence so
  the ConnectKit/local-E2E path is untouched.
- This is the "move `buyProjectTokens` to the sponsored path" step called for in
  the 2026-07-09 continuity note and in TODO items 1 & 3.

Until that wiring exists, only items 4–5 (login, export, modal UX) are observable;
items 1–3 (initCode, sponsorship, Kernel calldata) require it.

## Running the spike

Prereq: [`workflow/privy-pimlico-setup.md`](../../workflow/privy-pimlico-setup.md)
done — `VITE_PRIVY_APP_ID` and `VITE_PRIVY_SMART_WALLET_BUNDLER_URL` (Pimlico
Base-Sepolia) present in `ui/.env` after `scripts/setup-env.sh`. Confirm the app is
in Privy mode: `isPrivyEnabled` true (i.e. `VITE_PRIVY_APP_ID` set).

1. **Wire the smart-wallet client** (see caveat above) — required for items 1–3.
2. **Serve the UI in a Privy-allowed origin.** Privy's allowed origins are
   `http://localhost:8088` and `https://*.testnet.commonality.works` (per the setup
   doc). `http://localhost:8088` is the local IPFS-gateway build served by
   `./scripts/services.sh` — use that origin (or a `*.testnet.commonality.works`
   deploy) rather than the raw `vite` dev port, which is not in Privy's allowlist.
   Open the **lazy-giving** domain and a project's Give page.
3. **Sign in (item 5).** Click **Sign In / Wallet** → enter email → paste the OTP.
   Confirm an embedded wallet is auto-created and its address appears. Note any
   copy that breaks the walletless framing.
4. **Contribute (items 1–3).** Enter an amount and click **Give**. This should now
   emit a **UserOperation** through Pimlico (only after step 1's wiring).
5. **Capture the UserOp trace.** Get the op from **either**:
   - the **Pimlico dashboard** (<https://dashboard.pimlico.io>) → your app → the
     recent UserOperation, or
   - the browser **Network tab**: the `eth_sendUserOperation` request/response and
     the follow-up `eth_getUserOperationReceipt` (the bundler RPC calls to
     `api.pimlico.io`).

   From it, read off: `initCode`/`factory` (item 1), `paymasterAndData`/`paymaster`
   (item 2), and `callData` (item 3). Cross-check the mined tx on
   <https://sepolia.basescan.org>.
6. **Key export (item 4).** From the wallet/account menu, export the embedded
   wallet's key per Privy's flow; confirm it controls the same signer.

## Reading the result

- **All of items 1–3 pass** → the sponsored-gas contribution architecture is
  confirmed live. Record the observed `callData` shape against the `CreatorGasTank`
  Kernel decoder in `sponsored-gas.md` and clear the `[confirm in spike]` flags in
  both specs.
- **initCode missing / not sponsored / calldata mismatch** → capture the exact
  UserOp JSON and error, and reconcile: the decoder targets a specific
  `execute`/`executeBatch` ABI (`sponsored-gas.md` §1), so a mismatch means either
  the decoder or the account config needs adjusting before mainnet.
- **Items 4–5** are independent gates: a broken key export or a framing leak is a
  pre-mainnet blocker even if 1–3 pass. Note findings in `bridges.md`.

## Where results go

- Clear each `[confirm in spike]` flag in
  [`bridges.md`](../../specs/tech/bridges.md) / [`sponsored-gas.md`](../../specs/tech/sponsored-gas.md)
  with the observed behavior.
- Tick the relevant boxes in [`testnet-prep.md`](../../testnet-prep.md).
- Update the two `(Tell)` TODO items (contribution sequencing; the spike itself).
- Append a CONTINUITY note with the captured UserOp trace summary.

## Notes / caveats

- **Base Sepolia**, not mainnet: contracts and UserOps are on Base Sepolia; only
  the fiat→USDC on-ramp leg is Base mainnet (that's the separate
  [`spikes/coinbase-onramp/`](../coinbase-onramp/) spike). You can run this
  login/UserOp spike without the Coinbase key.
- **Paymaster:** at the spike stage you can sponsor with **Pimlico's paymaster**
  (the `VITE_PRIVY_SMART_WALLET_PAYMASTER_URL`) before our own `CreatorGasTank`
  paymaster is deployed to testnet. Item 3's decoder confirmation only needs the
  *calldata* shape, which is independent of who pays.
- This spike deliberately overlaps `sponsored-gas.md`'s "Privy+Pimlico live UserOp
  confirmation" obligation — capturing one real trace satisfies both.
