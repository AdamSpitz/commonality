# Work items

A work item is an optional identity for a piece of fundable work, separate from the assurance contract that requests money for it. The product rules are in [structured fundable work](../../product/structured-fundable-work.md). This note is the on-chain format those rules use.

## Identity

A work id is a nonempty UTF-8 string of at most 512 bytes. The registry hashes `keccak256` of those exact bytes. Nothing in the hash step trims or lowercases the string. Helpers for a particular convention, such as content canonicalization, normalize before they build the string.

Content canonical ids are work ids. `twitter:uid:12345:67890` hashes to the same value through the content helper and the generic helper.

When a creator supplies no ids, `ProjectFactory` reserves one generated id: `project:` plus the lowercase `0x` address of the new assurance contract. A client that wants a stable id before the transaction is mined, such as `urn:uuid:...`, must create that string once and send the same string on every retry.

## Registry scope

Ordinary projects and content-funding contracts reserve items in the deployment's `ContentRegistry`. Occupancy is that registry, not a global proof that two strings are the same real-world work. Another deployment can reserve the same string. The UI trusts the registry in its configuration.

Only the registry owner and its registrars can attach items. `CreatorAssuranceContractFactory` owns the registry. `ProjectFactory` is a registrar, set with `setWorkRegistrar` during deployment. A registrar must be a factory that has already authenticated the creator. The creator address is an event field so history can be listed per account. It is not part of the occupancy key, and it is not a unique-human id. Two accounts that submit the same work id in this registry are in conflict. They do not each get a funding slot.

Metadata `extras.workItems` describes items. The authenticated `registerWorks` call decides which items a project funds. A description that names an id the transaction did not register does not reserve that id.

## Lifecycle

`registerWorks` reserves every id in the batch or reverts the whole batch. Duplicates inside the batch, an active reservation, and an already successful item all revert.

The item's assurance condition is stored with the reservation. `hasSucceeded()` blocks a new reservation immediately. No extra finalization transaction is required. `releaseWorks` / `ProjectFactory.releaseWorkOnFailure` clears a reservation only when that same project still holds it and the condition has failed. A stale release does not clear a newer reservation. Released links remain in `WorkItemReleased` logs.

Successful funding still uses the project's existing reimbursement flow. Releasing a failed request does not open a second successful funding of the same id.

Links are fixed at creation except for content funding's existing materialization path, which registers later content against the original prospective contract through the same registry.

## What the screens show

Project creation still works with the work-item fields left empty. Optional rows accept an id and a description. A generated `urn:uuid:` is filled in once and kept in session storage across resubmits. The project page lists described items, or the generated `project:` id when the creator supplied none. Failed and retried requests stay in `WorkItemRegistered` and `WorkItemReleased`. There is not yet a separate timeline page for those logs.

## Attestations

`AlignmentAttestations` still stores an arbitrary `bytes32` subject. A subject that is a left-padded address still means that project. Any other subject is a work-id hash. Boards resolve it through `projectFor` on the configured registry. A work-item vouch is labeled as that item. It does not vouch the other items in the project.

## Not in this pass

Sequence and group attestations, and optional domain creation templates, are follow-ups. Cooperation mechanisms beyond citable work relationships are out of scope.

## Testnet

This changes `ContentRegistry`, `ProjectFactory`, and `CreatorAssuranceContractFactory`. A testnet that still runs the previous bytecode will not accept the new create path until those contracts are redeployed. Local data can be wiped and redeployed with the usual scripts.
