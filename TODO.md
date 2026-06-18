# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Build failed-project refund UX for embedded-wallet contributors: detect refundable positions, call `refundERC1155`, sponsor gas where appropriate, show refunded USDC in the user's wallet, and offer clear next steps (keep USDC, re-contribute, or use a licensed offramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Add contribution notifications for walletless/on-ramp users: confirmation email, transaction link, refund-available notice, and clear copy explaining that card contributions become onchain USDC/token transactions rather than Commonality-held funds. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish/polish "successful projects" on cause boards (see [specs/product/successful-projects.md](specs/product/successful-projects.md)). Remaining work: run/verify the end-to-end UI path with indexed data; add/confirm UI tests for `SuccessfulProjectsList` and the success-attestation branch of `AlignmentAttestationsSection`; improve the card to show current receipt price and a real buy-and-burn path rather than just linking to LazyGiving with `?retro=1`; decide/document the spec's unresolved policy questions (open posting vs friction, vouch decay/reputation damage, whether success trust should be distinct/domain-scoped); consider replacing the crude trust/confidence score (attester count) with the intended trust-weighted score/discovery-slider behavior.

- [ ] **(Tell)** Contract-versioning prep, indexer/SDK side (see [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md)): audit SDK folds and UI for anything keyed by a bare onchain auto-increment id (`noteId`, `pledgeId`, …) and re-key by `(contractAddress, id)`, so a future v2 deployment (where ids restart at 1) can't collide. Secondary-market `saleListingId`/`buyOrderId` fold keys are done. Delegation note and recurring-pledge fold internals now use contract-scoped keys with backwards-compatible bare-id lookup for single-contract callers.

- [ ] **(Tell)** Contract-versioning prep, indexer config: replace one-env-var-per-contract with a per-chain deployment manifest supporting *lists* of `{address, startBlock}` per logical contract, so adding a v2 contract is a config change. `deployments/*.env` is halfway to being that manifest.

- [ ] **(Tell)** Publish a deployment-manifest pointer onchain (MutableRefUpdater ref or ENS text record) so clients can discover current contract versions, per [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

- [ ] Do another smart-contract audit pass.

- [ ] **(Tell)** Make the LazyGiving recipient field foolproof — replace the raw `0x…` text box in `ui/src/lazy-giving/pages/CreateProjectPage.tsx` with a layered picker (see [specs/product/foolproof-project-creation.md](specs/product/foolproof-project-creation.md)): (1) explicit "Send to me / my account" default; (2) pick from a saved contact list of previously-vetted recipients, persisted client-side and appended to whenever a new recipient is confirmed; (3) ENS name resolution with a plain-language "this resolves to X — is that right?" confirmation, plus an optional tiny test transaction before committing. Adam explicitly asked for the contact list and ENS support. (Do NOT build the donation-first reframe or embedded-wallet claim path here — those are Ask items in [inbox.md](/inbox.md).)

- [ ] Build LLM-based per-page verifier checks that loop the derived page inventory, one per analysis kind: "is the page usable?", "does it look visually appealing?", "does it work well on mobile?", etc. The sampled/manual checks `review.page-copy-sense` ("does the copy make sense?") and `review.page-usability` ("is the page usable?") are wired into `product.messaging`. The deterministic `review.page-links` check is the worked template — same `derivePageInventory()` loop (`verifier/checks/lib/page-inventory.mjs`), just swap dead-route resolution for a model judgment per page. Reuse the `checks/lib/llm-judgment.mjs` machinery and the pass/uncertain + severity-derived gating pattern the other `review.*` LLM leaves use. Keep cost guardrails manual-triggered and/or sampled (these spend model time per page across 73 pages × N analyses), not on every fast loop. Remaining analysis kinds include visual appeal and mobile usability.
