# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Finish sponsored-gas support. Code foundation is in place (`CreatorGasTank`, Kernel/SimpleAccount decoding, verifier smoke, `GasTankFunder`) and the UI now has an ERC-7677 paymaster endpoint path (`/sponsored-gas/paymaster`) for Privy/Pimlico to attach the custom onchain paymaster to Kernel v3 UserOps. The platform API paymaster endpoint is now deployed and responding at the configured Base Sepolia URL: a 2026-07-22 live probe confirmed ERC-7677 JSON-RPC handling and `pm_getPaymasterStubData` request validation, and `testnet.sponsored-gas` now continuously guards that the endpoint returns the configured paymaster and correctly inferred project. Remaining: test it in the real Privy flow, confirm against a live Privy+Pimlico UserOp trace, tune production caps from real overhead, and deploy/exercise `GasTankFunder` with testnet swap addresses. (Kernel-v3/ERC-7579 decoder bug found + fixed + confirmed against real permissionless output on 2026-07-14 — see [workflow/sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md); an on-chain browser trace remains the final end-to-end check.) See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) for implementation status/details.

- [ ] **(Tell)** Live-verify embedded-wallet failed-project refunds against a Privy embedded wallet on testnet once the Privy/Pimlico paymaster endpoint and an enrolled funded gas tank are available. Code wiring is in place: refund UX now runs the required ERC-1155 project approval before `refundERC1155`, and both calls match the sponsored-gas allowlist. See [specs/tech/bridges.md](specs/tech/bridges.md) and [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).


