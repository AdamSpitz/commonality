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

## Structured descriptions and creation forms

Work types should also supply recognizable categories and clearly specified fields. For example: maintenance → open-source software → repository → maintenance period, with additional fields for scope and commitments.

Only some description fields need determine identity. Structured forms improve discovery and comparison while helping providers describe their work without inventing everything in free text. They also communicate that funding this kind of work is an established, intended use of the system. Additional prose can remain available.

## Attestations follow the work to its funding requests

Allow alignment attestations to refer to individual work items, sequences, or other relevant groupings independently of a particular funding request. Use explicit item-to-project relationships to surface the corresponding assurance contracts on fundable-projects boards, extending the content-funding pattern.

The existing general subject-attestation model is a starting point; a future implementer should verify which identities and discovery paths are actually supported. Define how item and sequence attestations affect project inclusion without silently treating endorsement of one item as endorsement of every item in a bundle, or of all future installments.

Keep work identity, description, funding eligibility, delivery evidence, and alignment judgments distinct but connected. This is an extension of how work is represented and connected to funding, not necessarily a new financial mechanism.
