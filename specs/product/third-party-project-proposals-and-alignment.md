# Third-party project proposals and alignment

Status: current [focus](/focus.md), now that the [claimable-beneficiary primitive](/specs/tech/subsystems/claimable-beneficiaries.md) is complete enough to build on. Product context: [fund-now-claim-later.md](/specs/product/fund-now-claim-later.md). Trust filter: [Subjectiv](/specs/tech/subsystems/subjectiv/README.md). Adoption story: [claiming-an-org.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/claiming-an-org.md).

This is the product consequence of letting third parties pool money for public identities that are not on Commonality yet. It is not an implementation plan.

## Terms and boundaries

The person who opens an unaffiliated project is the **project proposer**. Do not call this person a scout: elsewhere in Commonality, a scout is someone who provides early funding and may later be reimbursed. Do not call this person a finder either: finder is already an AI-service role.

Alignment remains a claim about a particular project:

> Project P is aligned with statement S.

Do not introduce beneficiary-alignment attestations. An organization may do several unrelated kinds of work, so “beneficiary B aligns with S” is too broad and makes it unclear which activity a donor intended to fund. A project has an explicit scope that can be judged against a statement.

The proposer and alignment attester are separate roles, but one person may perform both. Self-attestation is ordinary input to Subjectiv: do not specially privilege it or stigmatize it in the UI. A viewer's trust graph already decides whether the attester counts. Special self-attestation warnings would encourage sybils without adding useful trust.

Alignment attestations remain the existing minimal speech act. Do not add evidence, notes, URLs, or IPFS references. If experience later establishes a need for commentary, design a separate signed annotation rather than expanding the core attestation.

## Two entry points, one flow

Support equal entry points:

- **Propose a project** starts from a beneficiary identity and then asks which statements fit.
- **Propose a project for this cause** starts from a statement and then asks for the beneficiary.

Both enter the same branching flow:

1. Select or enter the claimable beneficiary (`dns:example.org` for the MVP; later other namespaces).
2. Search for existing projects for that beneficiary. Prefer projects already aligned with the selected statement when the flow began from a cause, but also show the beneficiary's other projects for the proposer to judge.
3. Gently suggest reusing a suitable project. Beneficiary identity alone does not make a project suitable: its stated scope must also fit. Never prohibit a duplicate because projects may legitimately differ in framing, conditions, duration, or stewardship.
4. If a suitable project exists, select it. Otherwise create a new project for the beneficiary.
5. Select one or more statements and explicitly confirm the alignment attestations. Each project/statement pair remains a separate attestation. Also allow project creation without attesting when the proposer does not want to vouch for alignment.

The first implementation is for an ordinary person proposing one project. Keep the underlying actions composable for bots and bulk tools later, but give automated proposals no special visibility or trust.

## What a third-party proposal means

A third-party project's title and concise purpose are written by the proposer. Copied website text or AI-generated summaries may be offered as drafts, but the proposer must approve them.

The proposal means:

> If this project's stated funding condition succeeds, its funds should become claimable by the controller of this public identity.

It is a suggestion to the beneficiary, not an agreement with them. It does not assign work, impose obligations, promise a use for the funds, or imply that the beneficiary authored the copy.

Every surface must continue to show **community-created; not affiliated with or endorsed by the beneficiary**, even after the beneficiary claims the identity. Display the proposer separately from the beneficiary. Claiming an identity proves control; withdrawing funds accepts money. Neither action retroactively changes authorship or constitutes endorsement. An explicit beneficiary endorsement, if added, is a separate signed act and still does not erase third-party authorship.

## Beneficiary agency

Verification does not automatically stop third-party proposals. A verified beneficiary may explicitly enter `BeneficiaryControlled`, meaning only its current payout wallet may create future projects for that identity. The UI should describe this narrowly as **Restrict future project creation to us**, not as rejection of Commonality or of every historical project.

Beneficiary control must be reversible by the current payout wallet so an organization can later reopen third-party proposals. Both directions are explicit, auditable onchain transitions.

Taking control does not edit, cancel, or disavow existing projects. Historical projects keep their original authorship, attestations, funding conditions, and escrow rights.

A beneficiary may separately publish a reversible, signed disavowal of a particular project. Normal UI discovery and contribution surfaces should show that disavowal prominently and stop promoting the project. Disavowal does not delete history, rewrite authorship, cancel the contract, or alter existing escrow rights. Those stronger money-level effects would introduce refund and griefing questions and are not part of this work.

## Lookup now and later

Beneficiary lookup is needed for the gentle reuse prompt. For current/testnet scale, an advisory lookup may enumerate projects, read their metadata, filter by canonical beneficiary ID, and optionally intersect the results with existing statement-alignment queries.

Design the lookup API around canonical `beneficiaryId`, not mutable display text. Treat metadata scanning as advisory rather than protocol-grade truth. Durable indexed lookup—likely a dedicated factory event linking project address and beneficiary ID—can wait until mainnet or meaningful project volume makes O(N) discovery unacceptable.

## Resumability

Project creation and its alignment attestations are separate onchain actions. The flow must expose completed, pending, and failed actions and allow retry without pretending the sequence is atomic.

Alignment recovery is naturally idempotent: check whether the `(attester, statement, project)` attestation already exists before submitting it again.

Project creation is not inherently idempotent because one proposer may intentionally create several projects for one beneficiary. Preserve pending transaction state and receipts locally as the primary recovery mechanism. As a fallback, search recent onchain projects matching proposer and beneficiary, show their title, funding condition, creation time, and transaction link, and ask the user to confirm the intended project. Never select a candidate automatically and never create another project until the user has made that choice.

## Completion criteria

This focus is complete when a person can:

- start from either an organization or a cause;
- find and gently reuse a suitable existing project, or create a clearly third-party proposal;
- attest that project to one or more statements, with partial completion and retry handled correctly;
- distinguish proposer, beneficiary, endorsement, identity claim, and withdrawal;
- see beneficiary control and project-specific disavowal reflected accurately; and
- exercise the workflow under tests and find matching product documentation.

Scalable indexed beneficiary lookup and dedicated bulk/bot UX remain deferred.
