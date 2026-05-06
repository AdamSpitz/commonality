# Commonality smart contracts

This is a single hardhat project containing smart contracts for several logical subsystems: `statements/` (Beliefs, Implications), `individual-projects/` (assurance contracts and primary market), `marketplace/` (secondary market), `delegation/` (DelegatableNotes, NoteIntent), `alignment-attestations/`, and `utils/`. Someday it might make sense to split these into separate projects, but for now one project is simpler.

## Deployment/security notes

- Content-funding settlement tokens must be vetted, standard ERC-20s: no fee-on-transfer behavior, no rebasing, no callbacks, and standard `transfer`/`transferFrom` semantics. The MVP is intended for USDC only; do not broaden token support without re-auditing escrow/accounting assumptions.
- Before production deployment, configure `CreatorAssuranceContractFactory.thirdPartyMinPurchase` to a meaningful economic amount for the settlement token. The constructor default is deliberately only a safe placeholder for local/test deployments.
- Third-party content-funding contracts are bounded by `thirdPartyMaxDuration` (default: 7 days, matching the default creator veto window) and their success is gated until the channel creator has taken control and the veto window has expired. UI/docs should explain that third-party funding can collect purchases before then, but cannot finalize/withdraw until the creator's veto opportunity has elapsed.

## Dev stuff you can do:

    npm run build
    npm run test
