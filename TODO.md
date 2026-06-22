# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- Do we still have some stuff configured to point to localhost (42069?)? This todo item may be stale; if there's nothing like that, just delete it. If there is, figure out how to fix it.

- Figure out the main UX use cases for each site. That is, I've already gone through the landing pages and docs; now it's time to make each site have a clear list of "here's the main use cases / workflows", so that we can think each of them through in terms of UX and also put checks into the verifier workspace to make sure they stay good. (I'm not sure to what extent we already have lists of use cases; if we already have that, great, but if not, let's add that to the specs so that we can easily find the lists and refer back to them later.)
  - Subtask: Which UI use cases (for all the various sites) are especially important to get right on mobile? (Maybe all of them? But also maybe there are some that we expect to be mostly done via desktop or mostly done via mobile or whatever.) In general, think through how we make the UI work for both desktop and mobile.

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Run the Privy + Pimlico embedded-wallet spike (provider is ratified — Privy, 2026-06-18 — this is feasibility, not a provider re-eval). Confirm the `[confirm in spike]` items in [specs/tech/bridges.md](specs/tech/bridges.md): (1) **load-bearing** — the chosen on-ramp will deliver USDC to a *counterfactual* (undeployed) EIP-4337 account address; if not, fall back to eagerly deploying the account via a tiny sponsored UserOp right after login; (2) Pimlico+Privy follow the `initCode`-on-first-UserOp deploy pattern and the paymaster sponsors that deploy-inclusive first op; (3) Privy key export works against a real account (pre-mainnet gate); (4) login/recovery modal UX holds the walletless framing end-to-end; and sanity-check per-wallet/MAU economics before mainnet. See also [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) §1.

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Build failed-project refund UX for embedded-wallet contributors: detect refundable positions, call `refundERC1155`, sponsor gas where appropriate, show refunded USDC in the user's wallet, and offer clear next steps (keep USDC, re-contribute, or use a licensed offramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Add contribution notifications for walletless/on-ramp users: confirmation email, transaction link, refund-available notice, and clear copy explaining that card contributions become onchain USDC/token transactions rather than Commonality-held funds. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish/polish "successful projects" on cause boards (see [specs/product/successful-projects.md](specs/product/successful-projects.md)). Remaining work: run/verify the end-to-end UI path with indexed data; consider replacing the crude trust/confidence score (attester count) with the intended trust-weighted score/discovery-slider behavior. Success-attestation branch UI tests for `AlignmentAttestationsSection` are done. Policy questions on open posting, reputation/decay, and domain-scoped success trust are decided in the spec. The card CTA now links directly to the LazyGiving secondary-market section instead of the old inert `?retro=1` placeholder.

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

- [ ] In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth. Take inventory on what kinds of testing we have, 

- [ ] Implement the [automation backlog extracted from the manual plan](./verifier/manual-validation-plan.md#11-automation-backlog-extracted-from-this-manual-plan), so LLM validation time is spent on judgment rather than mechanical checks. (Check first to make sure it hasn't been done already; the backlog may be out of date.)

- [ ] Make a list of things that we should be watching for as we start up some real AI services (still on testnet, but using real data from X and so on). Is the US Politics beat agent making reasonable evaluations, do its summaries make sense, etc.? Do the bridge-creator's bridges make sense and feel like each side would genuinely be willing to sign their half of it? Etc. Make sure that these are incorporated into the verifier workspace.
