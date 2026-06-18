# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- [ ] **(Tell)** Redesign the Alignment Explorer curator cadence for real cost control. The current launch-responsiveness patch lowered the full curator interval and added a fingerprint fast-path, but in production small support/content changes may be frequent enough that this still re-runs the expensive curator too often. Design/implement a tiered cadence: frequent cheap intake pass over new/changed statements/support signals (cheap model or heuristics) that accumulates potentially-important candidates; infrequent full-strength map review every ~6h or when pending importance crosses a threshold; `POST /curate` should be able to force intake vs full review explicitly. Keep the existing `/explore` sparse/empty UI and on-demand trigger. See [Alignment Explorer](specs/tech/subsystems/conceptspace/explorer.md).

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Build failed-project refund UX for embedded-wallet contributors: detect refundable positions, call `refundERC1155`, sponsor gas where appropriate, show refunded USDC in the user's wallet, and offer clear next steps (keep USDC, re-contribute, or use a licensed offramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Add contribution notifications for walletless/on-ramp users: confirmation email, transaction link, refund-available notice, and clear copy explaining that card contributions become onchain USDC/token transactions rather than Commonality-held funds. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish/polish "successful projects" on cause boards (see [specs/product/successful-projects.md](specs/product/successful-projects.md)). Remaining work: run/verify the end-to-end UI path with indexed data; add/confirm UI tests for `SuccessfulProjectsList` and the success-attestation branch of `AlignmentAttestationsSection`; improve the card to show current receipt price and a real buy-and-burn path rather than just linking to LazyGiving with `?retro=1`; decide/document the spec's unresolved policy questions (open posting vs friction, vouch decay/reputation damage, whether success trust should be distinct/domain-scoped); consider replacing the crude trust/confidence score (attester count) with the intended trust-weighted score/discovery-slider behavior.

- [ ] **(Tell)** Contract-versioning prep, indexer/SDK side (see [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md)): audit SDK folds and UI for anything keyed by a bare onchain auto-increment id (`noteId`, `pledgeId`, `saleListingId`, …) and re-key by `(contractAddress, id)`, so a future v2 deployment (where ids restart at 1) can't collide.

- [ ] **(Tell)** Contract-versioning prep, indexer config: replace one-env-var-per-contract with a per-chain deployment manifest supporting *lists* of `{address, startBlock}` per logical contract, so adding a v2 contract is a config change. `deployments/*.env` is halfway to being that manifest.

- [ ] **(Tell)** Publish a deployment-manifest pointer onchain (MutableRefUpdater ref or ENS text record) so clients can discover current contract versions, per [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

- [ ] Do another smart-contract audit pass.

- [ ] Build LLM-based per-page verifier checks that loop the derived page inventory, one per analysis kind: "does the copy make sense?", "is the page usable?", "does it look visually appealing?", "does it work well on mobile?", etc. The deterministic `review.page-links` check is the worked template — same `derivePageInventory()` loop (`verifier/checks/lib/page-inventory.mjs`), just swap dead-route resolution for a model judgment per page. Reuse the `checks/lib/llm-judgment.mjs` machinery and the pass/uncertain + severity-derived gating pattern the other `review.*` LLM leaves use. Decide cost guardrails (these spend model time per page across 73 pages × N analyses) — probably manual-triggered and/or sampled, not on every fast loop.
