# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- [x] Figure out the main UX use cases for each site. Added the site-by-site primary workflow list and mobile-priority notes to [specs/product/ui-domains.md](specs/product/ui-domains.md#primary-ux-workflows), so future UX work and verifier journeys have a single product-level checklist.

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Run the Privy + Pimlico embedded-wallet spike (provider is ratified — Privy, 2026-06-18 — this is feasibility, not a provider re-eval). Confirm the `[confirm in spike]` items in [specs/tech/bridges.md](specs/tech/bridges.md): (1) **load-bearing** — the chosen on-ramp will deliver USDC to a *counterfactual* (undeployed) EIP-4337 account address; if not, fall back to eagerly deploying the account via a tiny sponsored UserOp right after login; (2) Pimlico+Privy follow the `initCode`-on-first-UserOp deploy pattern and the paymaster sponsors that deploy-inclusive first op; (3) Privy key export works against a real account (pre-mainnet gate); (4) login/recovery modal UX holds the walletless framing end-to-end; and sanity-check per-wallet/MAU economics before mainnet. See also [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) §1.

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Build failed-project refund UX for embedded-wallet contributors: detect refundable positions, call `refundERC1155`, sponsor gas where appropriate, show refunded USDC in the user's wallet, and offer clear next steps (keep USDC, re-contribute, or use a licensed offramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Add contribution notifications for walletless/on-ramp users: confirmation email, transaction link, refund-available notice, and clear copy explaining that card contributions become onchain USDC/token transactions rather than Commonality-held funds. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish/polish "successful projects" on cause boards (see [specs/product/successful-projects.md](specs/product/successful-projects.md)). Remaining work: ~~run/verify the end-to-end UI path with indexed data~~ (done 2026-06-22 — demo seed now publishes deterministic `SuccessAttestation`s for 2 funded seed projects; verified `getSuccessfulProjectsForCause` returns populated data against a live stack); consider replacing the first-pass direct-vs-indirect success confidence score with richer trust-graph weighting/discovery-slider behavior. Success-attestation branch UI tests for `AlignmentAttestationsSection` are done. Policy questions on open posting, reputation/decay, and domain-scoped success trust are decided in the spec. The card CTA now links directly to the LazyGiving secondary-market section instead of the old inert `?retro=1` placeholder, and successful-project sorting/UI now uses an explicit success confidence score instead of raw attester count.

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

- [x] Took inventory of the testing ecosystem in [workflow/testing-inventory.md](workflow/testing-inventory.md): conventional tests by package, verifier coverage, what is already notably covered, and the main remaining testing gaps for attesters/finders/nudgers and whole-product validation.

- [ ] **(Tell)** Continue the [automation backlog extracted from the manual plan](./verifier/manual-validation-plan.md#11-automation-backlog-extracted-from-this-manual-plan). Triage/restructure is done: the backlog is now split into already adequately covered, small standalone, coherent chunk/harness project, and defer/manual-only work. Next, pick one coherent chunk to implement rather than nibbling random tiny slices. Candidate chunks: CSM movement-count propagation once the count feature exists; per-domain explanatory-affordance gaps. The operations/degradation canary expansion, AI-service fixture harness v1, and LazyGiving remaining UI-state matrix chunks are done at representative/compact coverage scope. Keep the old goal: LLM validation time should be spent on judgment rather than mechanical checks.

- [x] Make a list of things that we should be watching for as we start up some real AI services (still on testnet, but using real data from X and so on). Added [`verifier/ai-service-watchlist.md`](verifier/ai-service-watchlist.md), linked it from the manual AI-service validation roster, and noted verifier-promotion follow-ups in [`verifier/PLAN.md`](verifier/PLAN.md).
