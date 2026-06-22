# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Run the Privy + Pimlico embedded-wallet spike (provider is ratified — Privy, 2026-06-18 — this is feasibility, not a provider re-eval). Confirm the `[confirm in spike]` items in [specs/tech/bridges.md](specs/tech/bridges.md): (1) **load-bearing** — the chosen on-ramp will deliver USDC to a *counterfactual* (undeployed) EIP-4337 account address; if not, fall back to eagerly deploying the account via a tiny sponsored UserOp right after login; (2) Pimlico+Privy follow the `initCode`-on-first-UserOp deploy pattern and the paymaster sponsors that deploy-inclusive first op; (3) Privy key export works against a real account (pre-mainnet gate); (4) login/recovery modal UX holds the walletless framing end-to-end; and sanity-check per-wallet/MAU economics before mainnet. See also [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) §1.

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Build failed-project refund UX for embedded-wallet contributors: detect refundable positions, call `refundERC1155`, sponsor gas where appropriate, show refunded USDC in the user's wallet, and offer clear next steps (keep USDC, re-contribute, or use a licensed offramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Add contribution notifications for walletless/on-ramp users: confirmation email, transaction link, refund-available notice, and clear copy explaining that card contributions become onchain USDC/token transactions rather than Commonality-held funds. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish/polish "successful projects" on cause boards (see [specs/product/successful-projects.md](specs/product/successful-projects.md)): replace the first-pass direct-vs-indirect success confidence score with richer trust-graph weighting/discovery-slider behavior. Trust-graph **weighting** is done (success confidence now scales each vouch by the viewer's transitive trust score for the attester, plumbed from the Subjectiv worker through `useTrustedSet` → cause board → `SuccessfulProjectsList`; falls back to the flat 2:1 count when no trust network is available). Remaining: an explicit **discovery-slider UI control** ("my network → +1 hop → anyone") surfacing the existing `maxHops` trust-traversal knob on the Successful tab, mirroring the alignment view once that control exists there too. Policy questions on open posting, reputation/decay, and domain-scoped success trust are decided in the spec.

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Compute and store `anonymized_ID = hash(anchor_address, app_salt)` for every Sybil-relevant action (Tally signing, etc.) from day one. This is the set-union/dedupe key; storing it from the first signature makes dedupe work retroactively and lets later proof-of-personhood attach additively. No ZK, no provider — just one hash. Model proof-strength as a tier/value, not a binary `is_verified` flag, to avoid a later schema migration. See [specs/tech/shared/unique-human-id.md](specs/tech/shared/unique-human-id.md).

- [ ] **(Tell)** Ship proof-of-personhood tiers 0–1 (zero crypto): a per-account self-declaration ("this is my one Commonality account") that moves an account from tier 0 → 1, plus Tally counts that **group by tier** and a UI that renders the tiered head-count string. Makes the "sign once, we union your signatures" pitch demonstrable before any provider exists. Copy must read "asserted" as "they claim," never "we checked" (caveat #1). See [specs/tech/shared/unique-human-id.md](specs/tech/shared/unique-human-id.md).

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).
