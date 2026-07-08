# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md). (Progress 2026-07-06: the "handle allowance if needed" piece is done at the SDK layer — `buyProjectTokens`/marketplace buys now read the ERC20 allowance and skip the `approve` tx when it already covers the cost, so repeat contributions and the sponsored-gas path don't eat a redundant UserOp. The on-ramp session + USDC-arrival detection still depend on the Privy/Pimlico spike below.)

- [ ] **(Tell)** Run the Privy + Pimlico embedded-wallet spike (provider is ratified — Privy, 2026-06-18 — this is feasibility, not a provider re-eval). Confirm the `[confirm in spike]` items in [specs/tech/bridges.md](specs/tech/bridges.md): (1) **load-bearing** — the chosen on-ramp will deliver USDC to a *counterfactual* (undeployed) EIP-4337 account address; if not, fall back to eagerly deploying the account via a tiny sponsored UserOp right after login; (2) Pimlico+Privy follow the `initCode`-on-first-UserOp deploy pattern and the paymaster sponsors that deploy-inclusive first op; (3) Privy key export works against a real account (pre-mainnet gate); (4) login/recovery modal UX holds the walletless framing end-to-end; and sanity-check per-wallet/MAU economics before mainnet. See also [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) §1.

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Finish embedded-wallet failed-project refund support: wire sponsored gas where appropriate, then verify the existing refund UX against a Privy embedded wallet on testnet. The UI already detects refundable positions, calls `refundERC1155`, links the transaction, explains that refunded USDC returns to the user's wallet, and offers next steps (keep USDC, re-contribute, or use a licensed off-ramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Verify the already-deployed `AccountAssertions` testnet UX: use a test wallet to assert single-account status, then confirm the tier-1 line appears on a statement after asserting. `AccountAssertions` is deployed on Base Sepolia at `0x3991162F03F888f52FB2C655024Ba787F39A1367` and wired into `deployments/base-sepolia.env`/`render.yaml`; this item is only the live UX/indexer verification. See [specs/tech/shared/unique-human-id.md](specs/tech/shared/unique-human-id.md).

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

- [ ] **(Tell)** Investigate and fix local deep-stack verifier failures: `artifact.ipfs-domain-smoke`, `stack.user-journeys`, and `stack.restart-consistency` exit 7. Since `stack.fresh-seeded` and `operations.local-stack-health` pass, start from route/journey/restart-specific evidence rather than assuming the whole stack is broken.

