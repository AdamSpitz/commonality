# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- Drive a browser and make sure connecting a wallet actually works on testnet. (Feel free to just use a Hardhat wallet.)

- Rename the Alignment site to aligning.works. (This is partially done, and also I'm not too worried about renaming every single internal file or whatever. But the site name should be Aligning, and the DNS name should be aligning.works.)

- [ ] **(Tell)** Finish sponsored-gas support. Code foundation is in place (`CreatorGasTank`, Kernel/SimpleAccount decoding, verifier smoke, `GasTankFunder`) and the UI now has an ERC-7677 paymaster endpoint path (`/sponsored-gas/paymaster`) for Privy/Pimlico to attach the custom onchain paymaster to Kernel v3 UserOps. The platform API paymaster endpoint is now deployed and responding at the configured Base Sepolia URL: a 2026-07-22 live probe confirmed ERC-7677 JSON-RPC handling and `pm_getPaymasterStubData` request validation, and `testnet.sponsored-gas` now continuously guards that the endpoint returns the configured paymaster and correctly inferred project. Remaining: test it in the real Privy flow, confirm against a live Privy+Pimlico UserOp trace, tune production caps from real overhead, and deploy/exercise `GasTankFunder` with testnet swap addresses. (Kernel-v3/ERC-7579 decoder bug found + fixed + confirmed against real permissionless output on 2026-07-14 — see [workflow/sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md); an on-chain browser trace remains the final end-to-end check.) See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) for implementation status/details.

- [ ] **(Tell)** Live-verify embedded-wallet failed-project refunds against a Privy embedded wallet on testnet once the Privy/Pimlico paymaster endpoint and an enrolled funded gas tank are available. Code wiring is in place: refund UX now runs the required ERC-1155 project approval before `refundERC1155`, and both calls match the sponsored-gas allowlist. See [specs/tech/bridges.md](specs/tech/bridges.md) and [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- Refresh the stale product/docs judgments the RF redesign invalidated: `product.workflows` and `product.manual-attestations` are ~14 days old (07-08) and predate the removal of the token-burn/secondary-market flows; `review.docs-coherence` is flagged by `meta.report-currency` as invalidated by the RF docs-rollout commit. Re-run those, then `npm run verifier:product` / `npm run verifier:docs`. (Note: the `review.not-crypto-scary` / landing-copy product fails are a *standing* product-copy issue, not RF fallout, and are already tracked in [inbox.md](/inbox.md) — the "LazyGiving donor-page de-crypto pass" and Commonality front-door items — so they're not duplicated here.)

- Regenerate the top-level verifier narrative: the stored `root` report is a degraded artifact ("narrative generation failed; rollup status is still authoritative"). Once the above refreshes land, run `npm run verifier:go` to re-derive a real narrative. (Context: the recent RF redesign itself landed cleanly — the scary `new-diagnostics` banner about removed `TokenBurn`/secondary-market symbols was stale mid-edit editor snapshots; current `ui/src` + tests grep clean and `ui` typechecks.)

- Improve `quality.line-coverage` from one aggregate UI percentage into an actionable report. Keep the non-gating totals, but include the lowest-covered production files/modules and uncovered branch counts (excluding generated code, tests, and fixtures), plus change from the previous run. Also make sure the full instrumented suite completes reliably and returns `pass`: its initial run found ~80% line / ~83% branch coverage but exposed timeout sensitivity, and a failed test run must remain `uncertain` rather than publishing a reassuring pass. Add focused tests only where the report exposes meaningful behavior gaps, not to inflate the aggregate.

- Establish and review a Solidity coverage baseline before mainnet. Run `npm run hardhat:coverage`, preserve a compact per-contract/function/branch summary, and prioritize missing branches in money-moving and authorization-sensitive contracts (paymaster/gas tanks, recurring pledges, delegation/notes, assurance and retroactive-funding flows). Add substantive tests for important gaps and document any intentionally unreachable paths. Keep this advisory for now as required by [ADR 0002](specs/decisions/0002-code-quality-metrics.md); use the resulting baseline to make a later explicit decision about whether a narrowly scoped contract-coverage floor is warranted near mainnet.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).


