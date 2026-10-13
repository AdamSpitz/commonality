# Structured fundable work

High-level product direction, captured 2026-10-08 and clarified 2026-10-13. The on-chain format is [work items](../tech/subsystems/work-items.md). Sequence attestations and domain templates are still follow-ups.

Generalize the idea behind [content funding](../tech/subsystems/content-funding/README.md) into an extensible system for identifying and describing fundable work. Content funding gives individual content items canonical identities and explicitly connects them to funding requests. Other domains could benefit from the same structure: concerts, software maintenance, service delivery, public-access releases, and many more.

The purpose goes beyond making it easier to pay people. Once a recurring kind of activity can be discovered, evaluated, and funded consistently, alignment attestations can let movements support the qualities they want across a whole ecosystem of independent providers.

## Optional identities for the work

A creator can give a work item an identity independent of the assurance contract requesting money for it. When using such an identity, another request for the same work should reference the same item. This makes its funding history easier to inspect and helps potential contributors judge whether they are being asked to pay twice for the same work.

For example, a violin concert by a particular performer in Cedarvale Park on October 8, 2026 could have a structured identity; next week's concert would be a different item. Maintenance of a particular software repository for October 2026 could likewise be identified separately from November's maintenance.

Creators should not need to understand work IDs or choose an identity scheme to create a project. Whether every project must internally reference at least one work item, and whether every work item must have an ID, remain implementation questions. If those invariants are useful, defaults should satisfy them automatically: a project with no explicit work items can get a work item meaning "the work for this project," and an item with no explicit ID can get a generated unique ID, such as a UUID or an ID derived from the project address.

Generated IDs provide references, but do not establish that two projects describe different real-world work. The extra trust comes from a creator voluntarily using a straightforward convention that makes it obvious how to find an item's ID and why the same work should not appear under multiple IDs within that convention. Creators who skip this still get to request funding; they simply forgo that additional basis for trust.

Funding requests that reference work items should expose those relationships as queryable data. An observer should have an obvious place to find an item's current funding request and funding history.

## Fund each work item once

Use the same funding rule as content funding: within a registry's scope, a work item can belong to at most one active funding request, and successful funding permanently prevents another project from funding that same item. A project can fund several work items; each of those items is subject to this rule. "Successful" here means the assurance contract's funding condition succeeded, not that someone attested that the work was delivered.

A failed funding request can release its work items for another attempt. Its historical links remain visible, so an item may have several failed requests in its history followed by one successful request. That history does not authorize concurrent requests or repeated successful funding. Retroactive donations through the successful project's existing reimbursement flow remain possible; they do not create another funding request for the work.

Separate installments or genuinely distinct portions of work should have distinct work item IDs and clearly described scopes. Generalizing content funding does not require a more permissive rule for funding the same unit of work.

Enforcement is against the same ID within the same registry scope, not proof of global real-world uniqueness. Using another ID or another registry can evade it; a transparent identity convention and inspectable history provide the additional basis for trust described above. Choosing a meaningful convention remains optional, while the once-funded rule applies to generated IDs too.

## Open-ended identity schemes

Creators can use whatever kind of work ID suits their work, including a kind they have never used before. The system should accept an open set of IDs without requiring a closed list of work types, a registered schema, or a formal schema language. Commonality's author need not anticipate every domain.

Using a work ID should emit an event that lets indexers associate the ID with the account using it and the relevant funding request. This should make it easy to enumerate all work IDs an account has used and inspect the requests associated with them. Exact encoding and event design remain future work.

Users and communities can adopt useful conventions for which fields identify work and how to normalize them. "Canonical" means canonical within such a convention, not universally canonical. Interfaces can recognize those conventions and help people produce consistent IDs without making them prerequisites for using the underlying system. How IDs distinguish conventions or namespaces remains a design detail; a catalog of formal schemas is not required.

None of this is airtight. Someone can use a different ID, switch conventions, or use another account for the same work. An account's visible history does not establish a unique human identity or a complete history across accounts. Making duplicate funding easier to notice or demonstrate is already valuable; preventing every possible duplicate is not the goal.

## Who the work points at

Content funding gets a payee for free: the canonical id embeds the channel, and proving control of that channel is enough to withdraw escrowed funds or to take over contract creation. See [channel claiming](../tech/subsystems/content-funding/channel-claiming.md). That pattern fits work whose identity already names a single party allowed to do it or dispose of it: a named performer, a repository's maintainers, a copyright holder releasing a specific work. A convention can embed that rights-holder, and a funding mechanism that understands the convention can hold funds raised by a third party until they prove control. Merely choosing an arbitrary work ID does not establish a beneficiary or prove control of anything it names.

It does not fit every category below. An open slot (any tutor for this session, any facilitator for this meeting) names a role, not a person. The work id still should not pretend to be a channel. Filling the slot is a separate choice of beneficiary on the LazyGiving project: Alice can create the project and name Bob, using the existing [beneficiary-id](../tech/subsystems/claimable-beneficiaries.md) system. There is no identity for "the human named Bob Smith." What exists is "the owner of this channel" or "the controller of this domain" (`x` / `youtube` / `substack` / `dns`), which is often enough. Bob proves control of that id and then claims or refuses. The same split applies when the doer is not derivable from the work at all: an independent check should not pay the owner of the thing being checked, and a world outcome (a restored habitat, a removed barrier) has no owner. A steward's permission to act is not proof that the change occurred. In those cases assignment or acceptance still sits between "this is the work" and "this beneficiary may withdraw."

## Structured descriptions and creation forms

Interfaces and communities can offer optional templates with recognizable categories and clearly specified fields. For example: maintenance → open-source software → repository → maintenance period, with additional fields for scope and commitments. These templates need not form an exhaustive taxonomy or require the underlying system to understand every work type.

When a template helps generate a work ID, only some description fields need determine identity. Structured forms improve discovery and comparison while helping providers describe their work without inventing everything in free text. They also communicate that funding this kind of work is an established, intended use of the system. Free-text descriptions and default IDs remain available to creators who do not use a template.

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

The [cooperation-without-trust notes](/docs/end-user/common-sense-majority/cooperation-without-trust.md) are the place that records which later cooperation patterns should stay outside this work: requests and relationships can be citable metadata, while approval gates, reservations, and other mechanisms stay independent contracts. Nothing there is scheduled work.
