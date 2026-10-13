# Structured fundable work: implementation to-do list

High-level implementation handoff, 2026-10-13. Product requirements live in
[structured fundable work](structured-fundable-work.md); terminology lives in
[the glossary](../glossary.md). This file is a checklist for future implementation,
not a claim that the feature exists. The root backlog retains its existing Ask
tier; an explicit user instruction to implement this work supplies authorization.

## Requirements to preserve

- Work identity is independent of the project requesting funding. A project can
  fund several work items.
- Within a registry's scope, each work item has at most one active funding
  request and can be successfully funded once. Failed requests may release items
  for retry, but remain in the history. Funding success means the assurance
  condition succeeded, not a delivery attestation. Retroactive reimbursement
  through the successful project remains available.
- Meaningful identity conventions are optional. Project creation must work
  without teaching creators about work IDs; generate defaults when omitted.
  Generated IDs still obey the same funding rule.
- IDs are open-ended. No closed list of work types, mandatory schema registry,
  or universal real-world duplicate detection. Record account usage so people
  can inspect history; do not claim to connect different accounts to one human.
- Content items and their funding contracts must use the general work-to-project
  model. Preserve content funding's beneficiary, escrow, receipt, and lifecycle
  behavior while removing redundant relationship plumbing.
- Backward compatibility is explicitly unnecessary: there are no mainnet users
  and testnet contains only our simulations. Refactor directly; update deployment
  configuration and regenerate fixtures rather than building legacy adapters.

## Start with the existing implementation

Read the root README and relevant role/package guidance. Read
[branching guidance](../../workflow/branching.md) before branch work. Do not scan
all of `specs/`.

The following were inspected when writing this plan; verify against current code:

- [DisplayableDocument](../../sdk/src/subsystems/displayable-documents/displayable-document.ts)
  already supports `extras: Record<string, unknown>` and `references` to documents
  by CID. Reuse this format. References identify description documents, not
  necessarily the work itself.
- [Project creation](../../ui/src/lazy-giving/pages/CreateProjectPage.tsx) publishes
  project metadata as a DisplayableDocument. The
  [metadata reader](../../ui/src/lazy-giving/metadata.ts) currently has no work-item
  field. The existing document transport is PublishedData, with legacy IPFS paths;
  do not invent a separate publication system.
- [Content identity helpers](../../sdk/src/content-identity/ids.ts) construct string
  IDs and hash their UTF-8 bytes with keccak256. Examples:
  `twitter:uid:12345:67890`, `youtube:channel:UCexample:abcdefghijk`, and
  `substack:example/my-post`.
- [ContentRegistry](../../hardhat/contracts/content-funding/ContentRegistry.sol)
  records content-to-contract links and enforces occupancy. The
  [creator factory](../../hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol)
  constructs IDs, registers them, and releases them on funding failure.
- [MaterializedContentTokens](../../hardhat/contracts/content-funding/MaterializedContentTokens.sol)
  registers later materialized content against the original prospective funding
  contract. Keep that distinction from the recognition-token contract.
- [AlignmentAttestations](../../hardhat/contracts/alignment-attestations/AlignmentAttestations.sol)
  already accepts arbitrary bytes32 subjects. Some
  [funding-board queries](../../sdk/src/subsystems/fundingportals/queries.ts)
  currently turn subjects into addresses by taking their last 20 bytes; work
  hashes must instead resolve through explicit project relationships.

## Implementation checklist

- [x] **Pin down the small shared data contract.** Recommended starting point:
  opaque, nonempty local work ID strings; ordinary work hashes combine the
  beneficiary identity with `keccak256(UTF-8(workId))`; content canonical IDs
  retain their existing hash because they already identify their channel;
  optional `extras.workItems` entries containing an ID and descriptive fields or
  a description-document CID. Reuse current content IDs directly. Specify byte
  limits, exact-byte equality, and validation. Normalization belongs to helpers
  for particular conventions, not a generic lowercase/trim operation. Keep
  initiating-account attribution separate from the hash so different people can
  propose the same beneficiary's work. Specify an automatic default (for example `urn:uuid:...`) and
  create it once per item, preserving it across submission retries. Record the
  final format in a focused technical spec; update glossary terms as needed.

- [x] **Define registry scope and authoritative relationships.** Decide how
  general projects and existing per-platform deployments share or compose the
  registry primitive. IDs can be shared across deployments while occupancy is
  registry-scoped; do not accidentally let an unrelated deployment reserve IDs
  in a trusted registry. Specify who can attach items to a project and how the
  originating creator account is authenticated through factories. Metadata
  describes work; authenticated on-chain relationships determine which items a
  project funds. Define mismatch handling and prevent arbitrary callers from
  attaching work to another person's project. Do not build an unrestricted
  many-projects-per-item funding registry.

- [x] **Implement the common contract lifecycle.** Register each project's items
  atomically, computing hashes from the supplied IDs. Reject duplicate items in
  a batch, existing active reservations, and already-successfully-funded items.
  Release only on verified funding failure, retaining historical links. A
  successful item's reservation must remain effective even if nobody calls a
  separate finalization transaction. Failed-request retries must not let a stale
  release clear a newer request's reservation. Emit enough data to query by
  project, work hash, and creator account and recover the original ID string.
  Define whether links are fixed at creation; accommodate prospective content's
  authorized later materialization without permitting arbitrary scope changes.

- [x] **Refactor both project families onto the common mechanism.** Update
  ordinary project creation and content-funding factories, including prospective
  rounds and materialization. Keep content-specific canonicalization, channel
  validation, beneficiary claiming, veto/failure handling, and recognition tokens
  where needed. Preserve the relationship to the original funding contract.
  General work items need not each become a receipt-token type. Remove redundant
  content-only relationship APIs once callers use the shared path; read relevant
  decision records before reversing architectural choices.

- [x] **Wire SDK, events, and metadata together.** Update ABIs, event-cache
  ingestion/configuration, decoders, folds, queries, creation actions, and metadata
  readers/writers. Keep business logic in SDK folds, following the thin-indexer
  architecture. Provide project-to-items, item-to-current-request/history, and
  account-to-used-IDs queries, scoped to chain/registry as appropriate. Generate
  metadata and contract arguments from one validated input. Reuse PublishedData
  and DisplayableDocument; no new generic attachment transport is needed.

- [x] **Resolve work attestations into fundable projects.** Reuse bytes32 subject
  attestations. Replace assumptions that every subject is a project address with
  explicit resolution of known projects and work relationships. Preserve trust,
  revocation, and cause/implication filtering. Show which item an attestation
  concerns; endorsement of one item must not silently endorse an entire bundle.
  Define board inclusion for bundles explicitly. Keep alignment, funding success,
  and evidence of delivery distinct.

- [x] **Expose the feature without making creation harder.** Keep the default
  creation flow simple, with generated IDs. Offer optional explicit IDs and work
  descriptions, including multiple items. Show a project's items and an item's
  current request and funding history, including failed attempts. Explain active
  reservation/already-funded conflicts. Content funding should use the same
  shared views where practical. Optional domain templates can follow; a closed
  taxonomy is not a prerequisite.

- [x] **Update deployment and simulation inputs.** Update factory/registry wiring,
  deployment scripts, generated ABIs, UI configuration, fake-data generation, and
  fixtures. Exercise local fresh deployment and seeding; local ephemeral data may
  be wiped. Do not preserve obsolete interfaces just for simulated testnet data.
  Record any remaining testnet redeployment step explicitly.

- [x] **Verify the behavior end to end.** Add focused contract/SDK tests and an
  integration journey covering the scenarios below. Run relevant workspace
  checks under the project's testing guidance, then exercise the creation,
  history, and board flows in the browser. Update technical/content-funding docs
  to match the final implementation, check off this plan, and remove the root
  TODO entry when no implementation work remains.

## Acceptance scenarios

- A creator supplies no work IDs and successfully creates a normal project.
- An unfamiliar ID convention works without registration or a platform enum edit.
- The same explicit ID hashes identically through generic and content helpers;
  different accounts referring to it do not acquire independent funding slots
  within the same registry.
- Concurrent requests for the same item cannot both register. A batch containing
  one unavailable item fails atomically. Unauthorized attachments are rejected.
- A failed request remains in history and permits retry; the successful retry
  prevents another request. Success blocks reuse before any optional bookkeeping
  transaction. Retroactive donations still reimburse the successful project's
  contributors.
- Distinct installments can be funded separately using distinct IDs. Generated
  defaults are preserved across transaction retries rather than regenerated.
- Existing content creation, claiming, veto, failure release, and prospective
  materialization work through the common relationship and correct source project.
- An item attestation discovers its funding request, honors trust/revocation, and
  does not turn a hash into a bogus address or endorse unrelated bundled items.
- Account history and item history remain inspectable after failure/retry and
  accurately distinguish registry scopes.

## Scope boundary

Deliver the shared identity, once-funded lifecycle, metadata, history, and
item-level discovery first. Sequence/group attestations and richer domain creation
templates remain follow-ups unless explicitly included in the implementation task;
track them rather than implying they shipped. Follow the boundary in
[cooperation without trust](../../docs/end-user/common-sense-majority/cooperation-without-trust.md):
this work does not implement its separate cooperation mechanisms or redesign money
flows, beneficiary proofs, or delivery judgments.
