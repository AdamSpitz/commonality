# PR #229 independent review checkpoint

## Task and current state

Adam requested an independent review and merge of [PR #229](https://github.com/AdamSpitz/commonality/pull/229), then asked to write up the remaining work and commit so a fresh LLM session can continue. This checkpoint does **not** merge the PR or choose the unresolved funding design.

Branch: `chore/gas-sponsorship-rethink`, targeting `dev`. Original reviewed head: `c2bfb37ceaa2160f490298200f7f5d54ab3f97c2`. Read `README.md`, `workflow/branching.md`, and `workflow/review-gate.md`. Do not confuse this with open PR #218. No review receipt was posted; finding threads remain open pending final verification and resolution. No testnet deployment or release was performed.

## Blocking decision: deposits must exist before validation

`fundTank` now keeps ETH on the vault. Both vaults call `GasTankEntryPointDeposits.ensureDeposit` inside their validation callback. The real EntryPoint checks and reserves the face's deposit **before** invoking that callback. Consequently, the first sponsored operation fails with `AA31 paymaster deposit too low` even when its sponsor has funded the vault. The existing `MockEntryPoint` tests bypass that ordering.

Reproduction: `hardhat/test/GasTankEntryPoint.test.js` deploys the installed account-abstraction package's real v0.7 EntryPoint bytecode and a deliberately signature-free test account. Both Creator and Statement cases originally failed when asserting successful execution. They now explicitly assert the observed AA31 failure, to preserve a runnable checkpoint. **Passing these two tests confirms the defect, not a working sponsorship path.** After fixing it, replace those expectations with successful `UserOperationEvent` assertions and check the event's success field. The test account must never be used in production.

Review thread: <https://github.com/AdamSpitz/commonality/pull/229#discussion_r4444791840>.

The prior plan explicitly says ETH remains on the vault, with peer faces sharing one pot. I asked Adam to choose between:

1. Automatically pre-fund the registered EntryPoint faces when funding a tank, retaining one shared sponsor-accounting ledger (my recommendation).
2. Keep ETH on the vault and add an operator process to pre-fund/rebalance faces before wallet submission.

**No answer was given.** The request to checkpoint is not approval of either choice. A fresh session should discuss this decision before implementing it. The physical deposits necessarily live separately at each EntryPoint, even with one accounting ledger. Decide allocation, replenishment, and rebalance authority; handle adding faces after funding, depleted faces, and amounts larger than one face's reserve. Do not leave ETH transfers/rebalancing inside validation: also verify bundler validation restrictions, not just direct on-chain execution. Validate v0.6 behavior as well; the new real-EntryPoint reproduction uses v0.7 only.

## Fixes included in this checkpoint

See the commit diff for implementation details:

- Purchases with sufficient existing allowance now still use `wallet_sendCalls` for capable wallets, preserving the supplied paymaster URL. Previously only approval-plus-purchase batches received sponsorship.
- Removed the paymaster capability from roster publication: PublishedData and MutableRefUpdater calls are outside this paymaster's allowlist, so attaching it breaks publication.
- Capability cache is scoped to wallet-client identity plus account/chain; transient failures are not cached permanently.
- Added owner-controlled stake management to both v0.6 faces via `PaymasterV06Stake`. A deployer cannot directly call EntryPoint.addStake on another contract's behalf. Tests exercise staking, unlocking, withdrawal, and unauthorized access using the real EntryPoint stake-manager ABI.
- Forwarded all four face-address environment variables through Docker Compose and Render configuration/template.
- Corrected the spike write-up: rejecting an HTTP URL proves HTTPS validation, not successful third-party sponsorship. No request reached the echo server.

Other review threads:

- Roster sponsorship: <https://github.com/AdamSpitz/commonality/pull/229#discussion_r4444803225>
- Existing allowance: <https://github.com/AdamSpitz/commonality/pull/229#discussion_r4444803510>
- Capability cache: <https://github.com/AdamSpitz/commonality/pull/229#discussion_r4444803786>
- v0.6 stake management: <https://github.com/AdamSpitz/commonality/pull/229#discussion_r4444834200>
- Deployment configuration: <https://github.com/AdamSpitz/commonality/pull/229#discussion_r4444840363>

## Remaining work after the deposit fix

Follow `specs/tech/wallet-without-privy-plan.md` and the relevant `TODO.md` entries rather than starting a parallel plan:

- Statement signatures still use `writeContract` (`believeStatement` / `setBeliefsBatch`), so they do not pass ERC-7677 sponsorship after Privy removal. A new root TODO records this gap. Eligibility must account for enrollment, support-only calls, and a shared sponsor within each batch. Donations and roster publication are outside the current sponsorship policy.
- Existing root TODOs already cover creator accounting oversubscription/postOp undercharging, statement maximum-cost overcharging, enrollment squatting, and account-implementation trust. These were not fixed here.
- Redeploy the changed vaults and both paymaster versions on Base Sepolia, configure addresses and stake/deposits, then prove an actual sponsored Base Account transaction through the HTTPS endpoint and wallet's bundler. Do not infer success from capability discovery or calldata encoding.
- Confirm Coinbase Onramp with a fresh Base Account and the same account on a separate vertical. Those browser/product checks remain incomplete.
- Re-review final code, push, update the PR description, resolve findings only after verification, post a receipt for the final head, and merge only when ready and authorized. Do not post a receipt suggesting this checkpoint is merge-ready. After merge, return to `dev` and delete this local feature branch per workflow.

## Validation

Before this checkpoint:

- SDK targeted tests: 15 passing (wallet capabilities and allowance handling).
- Platform API suite: 96 passing.
- UI focused tests: 97 passing across causeRoster, BuyTokensSection, RefundSection.
- SDK and UI builds passed.
- Existing gas-tank/funder tests: 26 passing.
- New stake-management tests: 2 passing.
- The two new actual-operation tests reproduced AA31; their checkpoint expectations deliberately document that failure as explained above.
- Solidity and SDK lint passed with warnings, no errors.
- Full integration suite passed through verifier: run `2026-11-02T16-20-36.433Z-d1a69eaf`, completed `2026-11-02T16:24:51.780Z`. It rebuilt local Docker images and started the local stack. This suite does not prove real-wallet sponsorship.

Set `VERIFIER_WORKSPACE=verifier` for shell checks: this tool environment did not automatically load `.envrc`; an initial invocation without it looked for a nonexistent root `checks/` directory. The corrected invocation passed.

Useful focused command: `npx --workspace=hardhat hardhat test test/GasTankEntryPoint.test.js`. Normal commit hooks run lint, build, and fast tests. The handoff commit's hook result should be checked separately from the earlier focused results above.

## Suggested skills

- `review-and-merge-pr` when resuming the review/merge task.
- `thorough-tester` if developing the deposit/bundler regression matrix.
- `browser-driving` for actual browser verification; a human may be needed for passkey signup.

No subagents were used. The session instructions disallowed proactive delegation.
