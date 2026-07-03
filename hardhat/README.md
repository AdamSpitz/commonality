# Commonality smart contracts

This is a single hardhat project containing smart contracts for several logical subsystems: `statements/` (Beliefs, Implications), `individual-projects/` (assurance contracts and primary market), `marketplace/` (secondary market), `delegation/` (DelegatableNotes, NoteIntent), `alignment-attestations/`, and `utils/`. Someday it might make sense to split these into separate projects, but for now one project is simpler.

## Deployment/security notes

- Use `../scripts/deploy-contracts.sh <network>` for operator deployments. It runs the incremental deployment script, reusing on-chain contracts when the recorded `deployments/<network>.contracts-manifest.json` fingerprint still matches the current bytecode/ABI/constructor arguments. Commit the manifest together with `deployments/<network>.env`; without it, the next run must conservatively redeploy.
- Content-funding settlement tokens must be vetted, standard ERC-20s: no fee-on-transfer behavior, no rebasing, no callbacks, and standard `transfer`/`transferFrom` semantics. The MVP is intended for USDC only; do not broaden token support without re-auditing escrow/accounting assumptions.
- Before production deployment, configure `CreatorAssuranceContractFactory.thirdPartyMinPurchase` to a meaningful economic amount for the settlement token. The constructor default is deliberately only a safe placeholder for local/test deployments.
- Third-party content-funding contracts are bounded by `thirdPartyMaxDuration` (default: 7 days, matching the default creator veto window) and their success is gated until the channel creator has taken control and the veto window has expired. UI/docs should explain that third-party funding can collect purchases before then, but cannot finalize/withdraw until the creator's veto opportunity has elapsed.

## Contract test coverage status

The Hardhat suite is intentionally broad enough to count as the project's routine smart-contract safety backstop. It covers the major deployed subsystems and the historical security/edge-case regressions:

- statements and belief graph: `Beliefs.test.js`, `Implications.test.js`, `TrustRegistry.test.js`, `MutableRefUpdater.test.js`
- assurance/project funding: `AssuranceContracts.test.js`, `AssuranceContractProperties.test.js`, `PremintingERC1155.test.js`
- content funding and creator/channel controls: `ContentFunding.test.js`, `ProspectiveContentFunding.test.js`, `ChannelVerifier.test.js`
- secondary market: `ERC1155SecondaryMarket.js`, `ERC1155SecondaryMarket.edge.test.js`
- delegation/notes/recurring pledges: `DelegatableNotes.*.test.js`, `NoteIntent.test.js`, `RecurringPledges.test.js`
- alignment attestations: `AlignmentAttestations.test.js`
- cross-cutting security regressions: `SecurityRegression.test.js`

Verifier visibility: `automated.hardhat-contracts` runs the full Hardhat suite directly, `review.security.slither` runs Slither static analysis, and `facet.security` rolls those together with the contract security review/testnet contract smoke. `verifier-run automated.test-fast` also includes `verifier-run automated.test-full-hardhat`, so a future LLM should not treat “add basic Hardhat coverage” as an open gap unless a specific uncovered contract path is identified.

## Dev stuff you can do:

    npm run build
    npm run test
