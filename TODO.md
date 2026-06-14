# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- [ ] **(Ask)** Choose an embedded-wallet provider for walletless contribution UX (Privy/Dynamic/Web3Auth/Coinbase Smart Wallet/etc.) and document the integration plan: email/social login, recovery model, address availability before on-ramp, transaction signing, and constraints for sponsored gas. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Choose a plain fiat on-ramp provider for USDC purchases into the contributor's own embedded wallet (not fiat-to-contract execution): compare Stripe crypto onramp, Coinbase Onramp, MoonPay, Transak vanilla, etc. Confirm Base/USDC support, embedded-wallet address support, country coverage, fees, callbacks, and compliance constraints. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; enforce minimum contribution floor; tune production caps from real UserOp overhead; add deployment/bundler/UI wiring and verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Build failed-project refund UX for embedded-wallet contributors: detect refundable positions, call `refundERC1155`, sponsor gas where appropriate, show refunded USDC in the user's wallet, and offer clear next steps (keep USDC, re-contribute, or use a licensed offramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Add contribution notifications for walletless/on-ramp users: confirmation email, transaction link, refund-available notice, and clear copy explaining that card contributions become onchain USDC/token transactions rather than Commonality-held funds. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Evaluate true bridge-operator and claim-link support separately from the default embedded-wallet path: document how charities/fiscal hosts/governments/licensed vendors can call `buyERC1155`, evaluate Linkdrop or similar for ERC-1155 claim links, and only then decide whether a custom `TradFiBridgeEscrow` contract is worth building. See [docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md](docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md).

- [ ] **(Ask)** Evaluate one-step fiat-to-contract vendors as a fallback path (Transak One, Wert, Crossmint): compare whitelisting burden, country coverage, UX control, costs, refund model, and how much custom infra they let us skip. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Implement "successful projects" on cause boards (see [specs/product/successful-projects.md](specs/product/successful-projects.md)): a `SuccessAttestation` claim type parallel to alignment attestations (same cause anchor, trust-graph filter, implication propagation), plus a Successful tab on the cause board filtered to proven projects with outstanding (not-yet-burnt) receipts. Resolve the three open questions in the spec before building.

- [ ] **(Tell)** Contract-versioning prep, indexer/SDK side (see [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md)): audit SDK folds and UI for anything keyed by a bare onchain auto-increment id (`noteId`, `pledgeId`, `saleListingId`, …) and re-key by `(contractAddress, id)`, so a future v2 deployment (where ids restart at 1) can't collide.

- [ ] **(Tell)** Contract-versioning prep, indexer config: replace one-env-var-per-contract with a per-chain deployment manifest supporting *lists* of `{address, startBlock}` per logical contract, so adding a v2 contract is a config change. `deployments/*.env` is halfway to being that manifest.

- [ ] **(Ask)** Contract-versioning prep, contract changes (do while testnet-only; see [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md)):
  - make `ChannelRegistry.factory` a plural authorized-factory set (currently single-slot; pointing it at a v2 factory breaks `vetoContract` for v1-factory contracts)
  - make `DelegatableNotes` secondary-market factories pluggable like its primary-market factories (currently a single `immutable`, so a MarketplaceFactory v2 forces a DelegatableNotes v2)

- [ ] **(Ask)** Governance/timelock story for the `Ownable` levers on `DelegatableNotes`, `ChannelRegistry`, `ContentRegistry` — they're the trust concentration points; needed before mainnet regardless of versioning.

- [ ] **(Tell)** Publish a deployment-manifest pointer onchain (MutableRefUpdater ref or ENS text record) so clients can discover current contract versions, per [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md).

- [ ] **(Tell)** Add "event-shape stability" to contract review practice (prefer new events over changed ones; rename on breaking change, e.g. `NoteCreatedV2`), and decide the versioning class for `ProspectiveContentTokens`/`MaterializedContentTokens` before wiring them up.

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone
migration project, not a dependency bump:
  - migrate `hardhat.config.cjs` to ESM `hardhat.config.ts`
  - replace `@nomicfoundation/hardhat-toolbox` with `@nomicfoundation/hardhat-toolbox-mocha-ethers`
  - update tests/deploy scripts for explicit Hardhat 3 network connections
  - replace/remove Hardhat-2-only plugins (`@typechain/hardhat`, `solidity-docgen`, `solidity-coverage`, `hardhat-gas-reporter` as
needed)
  - verify `compile`, `test`, contract docs, deployment scripts, and verifier checks
