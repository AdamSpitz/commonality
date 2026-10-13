# Work items

A work item is an optional identity for a piece of fundable work, separate from the assurance contract that requests money for it. The product rules are in [structured fundable work](../../product/structured-fundable-work.md). This note is the on-chain format those rules use.

## Identity

A local work id is a nonempty UTF-8 string of at most 512 bytes. Ordinary work identity is its stable beneficiary plus that local id. Its registry/attestation hash is `keccak256(abi.encode(beneficiaryId, keccak256(bytes(workId))))`. Nothing trims or lowercases the string; normalization belongs to helpers for particular conventions.

Named beneficiaries use their existing registry identity, so payout-wallet rotation does not change work identity. Direct wallet recipients use `keccak256(abi.encode("wallet", recipient))` as their scope. The initiator and project owner do not affect identity. A wallet identity and a named identity controlled by that wallet are separate scopes.

Content canonical ids already identify their channel and retain `keccak256(bytes(canonicalId))`. `twitter:uid:12345:67890` hashes identically through the content helper and `workIdHash` without a beneficiary argument. Using that text as an ordinary project's local id gives it a beneficiary-scoped identity; it does not reserve that content-funding item.

When a creator supplies no ids, `ProjectFactory` reserves one generated id: `project:` plus the lowercase `0x` address of the new assurance contract. A client that wants a stable id before the transaction is mined, such as `urn:uuid:...`, must create that string once and send the same string on every retry.

## Registry scope

Ordinary projects and content-funding contracts reserve items in the deployment's `ContentRegistry`. Occupancy is that registry, not a global proof that two strings are the same real-world work. Another deployment can reserve the same string. The UI trusts the registry in its configuration.

Only the registry owner and its registrars can attach items. `CreatorAssuranceContractFactory` owns the registry. `ProjectFactory` is a registrar, set with `setWorkRegistrar` during deployment. Factories authenticate the initiator and derive the beneficiary from the project's payout target. `WorkItemRegistered` records the initiating account, project, local id, scoped hash, and beneficiary scope (zero for canonical content). Neither account nor identity proves a unique human. Different beneficiaries may use the same local id independently. Different initiators proposing the same beneficiary's work share one slot.

Metadata `extras.workItems` describes items. Authenticated registry calls decide which items a project funds. A description that names an id the transaction did not register does not reserve that id.

## Lifecycle

`registerBeneficiaryWorks` atomically reserves ordinary work. Content uses `registerWorks` with canonical strings. Duplicates inside the batch, an active reservation, and an already successful item all revert.

The item's assurance condition is stored with the reservation. `hasSucceeded()` blocks a new reservation immediately. No extra finalization transaction is required. `releaseBeneficiaryWorks` / `ProjectFactory.releaseWorkOnFailure` clears only a failed reservation still held by that project. Content uses `releaseWorks` / its existing factory path. A stale release does not clear a newer reservation. Released links remain in `WorkItemReleased` logs.

Successful funding still uses the project's existing reimbursement flow. Releasing a failed request does not open a second successful funding of the same id.

Links are fixed at creation except for content funding's existing materialization path, which registers later content against the original prospective contract through the same registry.

## Third-party proposals

The factory compares the initiator with the direct recipient or named identity's payout wallet. Beneficiary-started projects can succeed on their ordinary funding condition. Other projects use `WorkFundingCondition`: the beneficiary calls `ProjectFactory.acceptWorkProject`, opening a seven-day veto window for this specific project. Proving identity, transferring project ownership, and accepting another project do not accept this proposal. Registry control remains an independent way to restrict future third-party creation for named identities.

The beneficiary may call `vetoWorkProject` before acceptance or through the end of that window. Veto atomically fails the condition and releases the whole work batch. After the window, veto is unavailable and a reached funding threshold succeeds. The window must end strictly before the funding deadline. Unaccepted or too-late accepted proposals permanently fail at the deadline even if their funding goal was reached; contributors use the ordinary refund path. Funded but unclaimed proposals cannot hold their slot forever.

Proceeds remain in the assurance contract and retain the existing claim/refuse flow. Acceptance does not transfer money. Unresolved named beneficiaries prove control before accepting or claiming. Already-verified beneficiaries retain the existing fixed-controller payout behavior; occupancy still uses the stable name. The deadline-less custom-condition entrypoint is restricted to recipient-started projects because it cannot bound third-party reservations safely.

## What the screens show

Project creation still works with the work-item fields left empty. Optional rows accept an id and a description. A generated `urn:uuid:` is filled in once and kept in session storage across resubmits. The project page lists described items, or the generated `project:` id when the creator supplied none. Failed and retried requests stay in `WorkItemRegistered` and `WorkItemReleased`. There is not yet a separate timeline page for those logs.

Third-party proposals show acceptance and veto controls to the on-chain beneficiary. `getProjectWorkState` returns authenticated local IDs, beneficiary scope, attestation hashes, and live proposal state. SDK helpers `walletWorkBeneficiaryId` and `workIdHash(localId, beneficiaryId)` match Solidity encoding. Omit the latter's beneficiary argument only for canonical content.

## Attestations

`AlignmentAttestations` still stores an arbitrary `bytes32` subject. A left-padded address means that project. Ordinary work uses its beneficiary-scoped hash; content uses its canonical hash. Boards resolve hashes through `projectFor` on the configured registry. A work-item vouch names that item, not all items in a project.

## Not in this pass

Sequence and group attestations, and optional domain creation templates, are follow-ups. Cooperation mechanisms beyond citable work relationships are out of scope.

## Testnet

This changes `ContentRegistry`, `ProjectFactory`, and `CreatorAssuranceContractFactory`. A testnet that still runs the previous bytecode will not accept the new create path until those contracts are redeployed. Local data can be wiped and redeployed with the usual scripts.

Previous ordinary unscoped hashes do not identify new scoped reservations. Decision: [beneficiary-scoped work identity](../../decisions/0019-beneficiary-scoped-work-identity.md).
