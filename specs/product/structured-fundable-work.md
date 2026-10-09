# Structured fundable work

High-level product direction, captured 2026-10-08. Detailed design and implementation remain future work.

Generalize the idea behind [content funding](../tech/subsystems/content-funding/README.md) into an extensible system for identifying and describing fundable work. Content funding gives individual content items canonical identities and explicitly connects them to funding requests. Other domains could benefit from the same structure: concerts, software maintenance, service delivery, public-access releases, and many more.

The purpose goes beyond making it easier to pay people. Once a recurring kind of activity can be discovered, evaluated, and funded consistently, alignment attestations can let movements support the qualities they want across a whole ecosystem of independent providers.

## Identity belongs to the work

A work item should have an identity independent of the assurance contract requesting money for it. Creating another request for the same work should not automatically create another work item.

For example, a violin concert by a particular performer in Cedarvale Park on October 8, 2026 could have a structured identity; next week's concert would be a different item. Maintenance of a particular software repository for October 2026 could likewise be identified separately from November's maintenance.

Funding requests should explicitly reference their work items through queryable data, with enough on-chain representation for contracts to reject duplicate claims under the applicable rules. An observer should have an obvious place to find an item's current funding request and funding history. Identity and funding policy are separate: retries after failed requests, active versus successful claims, and legitimate divisions of work need appropriate rules rather than one universal prohibition.

## Open-ended identity schemes

Users and communities should be able to define domain-specific canonical-ID schemes. A scheme determines which fields identify the work and how they are normalized; Commonality's author need not anticipate every domain.

Canonical means canonical within an identified scheme. Interfaces and communities can recognize useful schemes without requiring one universal authority. This need not prevent every abuse: making duplicate funding harder, easier to notice, or easier to demonstrate is already valuable. Competing schemes, changed details, and overlapping work are design questions to resolve later.

## Who the work points at

Content funding gets a payee for free: the canonical id embeds the channel, and proving control of that channel is enough to withdraw escrowed funds or to take over contract creation. See [channel claiming](../tech/subsystems/content-funding/channel-claiming.md). That pattern fits work whose identity already names a single party allowed to do it or dispose of it: a named performer, a repository's maintainers, a copyright holder releasing a specific work. The scheme can embed that rights-holder, and funds raised by a third party can wait until they prove control.

It does not fit every category below. An open slot (any tutor for this session, any facilitator for this meeting) names a role, not a person. The work id still should not pretend to be a channel. Filling the slot is a separate choice of beneficiary on the LazyGiving project: Alice can create the project and name Bob, using the existing [beneficiary-id](../tech/subsystems/claimable-beneficiaries.md) system. There is no identity for "the human named Bob Smith." What exists is "the owner of this channel" or "the controller of this domain" (`x` / `youtube` / `substack` / `dns`), which is often enough. Bob proves control of that id and then claims or refuses. The same split applies when the doer is not derivable from the work at all: an independent check should not pay the owner of the thing being checked, and a world outcome (a restored habitat, a removed barrier) has no owner. A steward's permission to act is not proof that the change occurred. In those cases assignment or acceptance still sits between "this is the work" and "this beneficiary may withdraw."

## Structured descriptions and creation forms

Work types should also supply recognizable categories and clearly specified fields. For example: maintenance → open-source software → repository → maintenance period, with additional fields for scope and commitments.

Only some description fields need determine identity. Structured forms improve discovery and comparison while helping providers describe their work without inventing everything in free text. They also communicate that funding this kind of work is an established, intended use of the system. Additional prose can remain available.

### Some kinds of work that might be worth exploring

  - Delivering services: e.g. tutoring sessions, translation assistance, repairs, mentoring, community transport
  - Making existing things publicly available: e.g. releasing a book under an open license, opening a dataset, publishing source code, making an archive freely accessible.
  - Producing evidence and checking claims: e.g. reproducing research, testing product claims, auditing accessibility, checking public records, or evaluating whether another funded project delivered.
  - Hosting encounters and collective activities: e.g. public deliberations, workshops, community meals, skill exchanges, and cross-group discussions. (For Civility specifically, this would extend the scope from funding what people publish to funding **how people actually interact**. More generally, it gives movements a way to sustain local conveners.)
  - Achieving and sustaining changes in the world: e.g. restoring a habitat, removing an accessibility barrier, or reducing a documented source of pollution. (This has potentially very broad reach: a movement could invite anyone capable of producing the desired change to do so. But it is also the hardest category here. Defining an outcome does not automatically make causation, measurement, or payment allocation straightforward.)

## Attestations follow the work to its funding requests

Allow alignment attestations to refer to individual work items, sequences, or other relevant groupings independently of a particular funding request. Use explicit item-to-project relationships to surface the corresponding assurance contracts on fundable-projects boards, extending the content-funding pattern.

The existing general subject-attestation model is a starting point; a future implementer should verify which identities and discovery paths are actually supported. Define how item and sequence attestations affect project inclusion without silently treating endorsement of one item as endorsement of every item in a bundle, or of all future installments.

Keep work identity, description, funding eligibility, delivery evidence, and alignment judgments distinct but connected. This is an extension of how work is represented and connected to funding, not necessarily a new financial mechanism.
