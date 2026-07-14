# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Finish sponsored-gas support. Code foundation is in place (`CreatorGasTank`, Kernel/SimpleAccount decoding, verifier smoke, `GasTankFunder`). Remaining: confirm against a live Privy+Pimlico UserOp trace, tune production caps from real overhead, deploy/exercise `GasTankFunder` with testnet swap addresses, and wire/verify the UI+bundler sponsored-UserOp contribution flow. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) for implementation status/details.

- [ ] **(Tell)** Finish embedded-wallet failed-project refund support: wire sponsored gas where appropriate, then verify the existing refund UX against a Privy embedded wallet on testnet. The UI already detects refundable positions, calls `refundERC1155`, links the transaction, explains that refunded USDC returns to the user's wallet, and offers next steps (keep USDC, re-contribute, or use a licensed off-ramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Add local-fiat display conversion (starting with CAD): show amounts as "≈ C$205" with the true "US$150 USDC" clearly visible, using a daily off-chain FX rate with its timestamp shown. Display-only — settlement stays USDC. Amount-entry fields must always show the USDC amount actually being committed. See the "MVP display: local-fiat estimate" decision in [specs/product/currency.md](specs/product/currency.md).

- [ ] **(Ask)** Spike: evaluate CAD stablecoins on Base (CADD, QCAD, CADC) for post-MVP per-project settlement — check on-Base liquidity depth, real-world acquisition ease for ordinary Canadians (especially CADD via Wealthsimple), and blacklist/pause behavior vs. our escrow safety constraints. See [specs/product/currency.md](specs/product/currency.md). Ask-tier because it informs a product decision, not because the spike itself is risky.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] **(Tell)** Investigate the `functionality.deep-stack` failures (`stack.fresh-seeded`, `stack.restart-consistency`, `stack.user-journeys`, `artifact.ipfs-domain-smoke`, plus `testnet.environment`). A bad `fresh-seeded` boot cascades into the others, so start with a single clean `npm run verifier:deep-cadence` run to determine whether this is a real breakage or just a stale/un-booted local stack, then fix accordingly.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).


