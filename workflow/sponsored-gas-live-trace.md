# Sponsored-gas live-trace confirmation

Closing out the last real obligation of the Privy+Pimlico spike: confirm that
`CreatorGasTank`'s paymaster calldata decoder matches the calldata the **real**
Privy+Pimlico smart-account stack actually emits. The provider/account setup spike
is already done ([privy-pimlico-setup.md](privy-pimlico-setup.md)); this is the
byte-level validation that was deferred until there was a deployed paymaster + a
live UserOp to inspect.

Deployed paymaster: `CREATOR_GAS_TANK_ADDRESS` in
[deployments/base-sepolia.env](/deployments/base-sepolia.env)
(`0x7F74e2Ad6A7A8947386513A59060F2eBD40a3B04`), EntryPoint v0.7
(`0x0000000071727De22E5E9d8BAf0edAc6f37da032`).

## FINDING (2026-07-14): the decoder targets the wrong Kernel version

This is the bug the confirmation existed to catch, found before any live capture:

- The UI configures Privy with `smartWalletType: 'kernel'`
  ([ui/src/privy/PrivyAppProvider.tsx](/ui/src/privy/PrivyAppProvider.tsx)) on
  `@privy-io/react-auth` v3, and our deployment uses **EntryPoint v0.7**. That pairing
  is **Kernel v3 (0.3.x), which is ERC-7579**. The installed Privy `smart-wallets`
  bundle confirms it: `kernelVersion 0.3.0–0.3.3`, `execMode`, `CallType`,
  `encodeCallData`, and ERC-7579 markers throughout (`KERNEL_V2` appears only as
  legacy fallback).
- Kernel v3 routes **all** executions through a single
  `execute(bytes32 execMode, bytes executionCalldata)` function — selector
  **`0xe9ae5c53`** (and may be wrapped in `executeUserOp`). `execMode`'s first byte is
  the call type (`0x00` single, `0x01` batch); `executionCalldata` is
  **`abi.encodePacked(target, value, callData)`** for a single call, or an ABI-encoded
  `Execution[]` for a batch. It is *not* ABI-encoded head/tail for the single case.
- `CreatorGasTank`'s decoder
  ([hardhat/contracts/sponsored-gas/CreatorGasTank.sol](/hardhat/contracts/sponsored-gas/CreatorGasTank.sol),
  ~L240) keys on the **Kernel v2** selectors
  `execute(address,uint256,bytes,uint8)` = `0x51945447` and
  `executeBatch((address,uint256,bytes)[])` = `0x34fcd5be` (plus SimpleAccount
  `0xb61d27f6` / `0x47e1da2a`). None of these is `0xe9ae5c53`.

**Consequence:** every real Privy UserOp hits the final
`revert UnsupportedAccountCall(0xe9ae5c53)` — sponsorship is 100% non-functional
against the actually-configured wallet stack. Selectors verified with
`ethers.id(...)`.

## Checklist

- [x] Determine the real Kernel version Privy uses (→ **v3 / ERC-7579**, EntryPoint v0.7).
- [x] Prove the selector mismatch (`0xe9ae5c53` vs the decoder's v2 selectors).
- [x] **Rewrite the decoder for Kernel v3 / ERC-7579.** Done: `CreatorGasTank` now
      recognizes `execute(bytes32,bytes)` (`0xe9ae5c53`), branches on the `execMode[0]`
      CallType byte for single vs batch, parses the **packed** single `executionCalldata`
      (`target[20] || value[32] || callData`, via `_decodeErc7579SingleExecution`), and
      decodes the ABI-encoded batch `Execution[]`. SimpleAccount support retained for the
      reference tests.
- [x] **Unit test with generated v3 calldata.** Done: `CreatorGasTank.test.js` encodes
      real Kernel v3 single + batch `execute` for `buyERC1155` and a batched
      `approve`+`buy`, asserts the decoder validates them, and adds a negative test that a
      non-sponsored inner call reverts. All 11 tests pass.
      **Still to verify at capture time:** whether Privy wraps the call in
      `executeUserOp(...)` (rather than calling `execute` directly) and the exact
      `execMode` payload bytes — the two remaining unknowns the live trace resolves.
- [x] **Confirm the decoder against real permissionless/Privy Kernel v3 output (2026-07-14).**
      Done without a browser: [hardhat/scripts/confirm-kernel-v3-calldata.mjs](/hardhat/scripts/confirm-kernel-v3-calldata.mjs)
      builds a Kernel v3 account with the *same* `toEcdsaKernelSmartAccount` helper Privy wraps
      (permissionless, EntryPoint v0.7, kernelVersion 0.3.1) and prints the deterministic
      `account.encodeCalls(...)` output. Result: **selector `0xe9ae5c53`** for both single and batch;
      single `execMode` all-zeros (CallType `0x00`) with packed `target||value||callData`; batch
      `execMode` `0x01…` (CallType `0x01`); inner selector decodes to `buyERC1155`. **No
      `executeUserOp` wrapper.** This is byte-for-byte what the rewritten decoder and its unit tests
      expect. Run it with `set -a; source .env.secrets; set +a; node hardhat/scripts/confirm-kernel-v3-calldata.mjs`.
- [ ] **(Optional belt-and-suspenders) Capture a real on-chain UserOp trace via browser login.** Log into the
      testnet UI with Privy email OTP, fund the creator's tank via `fundTank`, submit a
      sponsored `buyERC1155`, and capture the actual `userOp.callData` from the
      Pimlico bundler / the on-chain `handleOps` tx. Diff it against the unit-test
      fixture to validate byte-for-byte (execMode layout, any `executeUserOp` wrapper,
      packed vs ABI encoding). This is the only step that isn't fully automatable — it
      needs an interactive email login and a funded tank.
- [ ] **Re-tune caps** from the measured full-UserOp overhead observed in that trace
      (sponsored-gas.md Decision 4 placeholders).
- [ ] Update the verifier sponsored-gas check if the paymaster ABI/config changes.

## What needs a human vs. what an LLM can do

- **Autonomous:** the decoder rewrite, the ERC-7579 spec cross-check, and the
  generated-calldata unit tests — none of which need Privy/Pimlico credentials or a
  browser. This gets us to "the decoder provably handles Kernel v3 calldata."
- **Needs Adam (or any human with the testnet app):** the final live capture, because
  it requires an interactive Privy email-OTP login. It validates the full path
  (bundler → EntryPoint → paymaster deposit → on-chain execution), not just the ABI.
