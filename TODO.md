# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

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
