# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Build the PublishedData subsystem technical spike + first implementation: pin the CID representation, benchmark calldata-only vs calldata+event bytes for representative content sizes on the intended L2, then implement the admin-less `PublishedData` contract (`publishData`, `retractData`, publication/retraction views) plus SDK reader types/helpers. Keep `supportStatement` ungated, library defaults honoring only publisher self-retraction, and document any remaining indexer/UI integration work. See [specs/tech/subsystems/published-data/README.md](specs/tech/subsystems/published-data/README.md).

- [ ] **(Tell)** Finish sponsored-gas support. Code foundation is in place (`CreatorGasTank`, Kernel/SimpleAccount decoding, verifier smoke, `GasTankFunder`) and the UI now has an ERC-7677 paymaster endpoint path (`/sponsored-gas/paymaster`) for Privy/Pimlico to attach the custom onchain paymaster to Kernel v3 UserOps. Remaining: deploy/test the platform API paymaster endpoint in the real Privy flow, confirm against a live Privy+Pimlico UserOp trace, tune production caps from real overhead, and deploy/exercise `GasTankFunder` with testnet swap addresses. (Kernel-v3/ERC-7579 decoder bug found + fixed + confirmed against real permissionless output on 2026-07-14 — see [workflow/sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md); an on-chain browser trace remains the final end-to-end check.) See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) for implementation status/details.

- [ ] **(Tell)** Live-verify embedded-wallet failed-project refunds against a Privy embedded wallet on testnet once the Privy/Pimlico paymaster endpoint and an enrolled funded gas tank are available. Code wiring is in place: refund UX now runs the required ERC-1155 project approval before `refundERC1155`, and both calls match the sponsored-gas allowlist. See [specs/tech/bridges.md](specs/tech/bridges.md) and [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Ask)** Before adopting CADC as the post-MVP CAD settlement token, two Adam-only steps remain: (1) one real Paytrie→Base→offramp [round trip](spikes/cad-stablecoins/paytrie-round-trip.md) with a small amount, and (2) review/send [spikes/cad-stablecoins/loon-email-draft.md](spikes/cad-stablecoins/loon-email-draft.md) asking Loon about their process for wrongly blacklisted contracts. (Done 2026-07-14 by LLM: CADC's Base address confirmed from loon.finance itself; real depth quotes via `quote-swaps.mjs` show even C$10k swaps at <0.5% impact — see the spike README's updated "Still open" section. CADD's issuer publishes no addresses; only matters if CADD is ever adopted.)

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] **(Tell)** Continue investigating the remaining `functionality.deep-stack` failures. `stack.fresh-seeded` was fixed on 2026-07-14 by letting the guarded fresh-seed cadence proceed past clean deployment/indexer events before fake-data seeding; a focused `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1 verifier-run stack.fresh-seeded` now passes. A follow-up `artifact.ipfs-domain-smoke` still fails: all eight domain artifacts render with console errors from `PrivyAppProvider` (`TypeError: Failed to fetch`, and for some domains a Privy iframe CSP/frame-ancestors error), and `stack.user-journeys` timed out during the earlier full `npm run verifier:deep-cadence` run. Next: fix or explicitly tolerate the non-fatal Privy network/CSP noise in artifact smoke, rerun `stack.user-journeys`, then refresh `functionality.deep-stack`/`testnet.environment` as appropriate.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).


