# Fundable-work requests and funding offers

Design direction, 2026-10-13. The first slice is implemented: versioned documents on `PublishedData`, latest pointers on `MutableRefUpdater`, SDK `@commonality/sdk/work-requests`, and Commonality pages under `/work/requests`. Storage choices are in [ADR 0020](../decisions/0020-work-requests-are-published-versions.md) and [work requests](../tech/subsystems/work-requests/README.md). Exclusive financial reservations are a later extension.

## Purpose

Make demand for work concrete enough to help bring providers into existence:

> I'd put $500 toward an acceptable project that creates an accessible playground in Cedarvale Park. I've set aside the money until December 1, but I still decide whether a response is good enough.

Today, creators publish projects and seek funding. Cause-directed notes express demand in the reverse direction, but usually leave the desired work vague. A request specifies the desired outcome and constraints before the provider, method, budget, or exact work items are known.

The product promise is: **show prospective doers that you have money ready, while retaining the choice of what deserves it.**

Preserving the right to reject every response necessarily leaves uncertainty for the doer. We can provide evidence of capacity, deliberate allocation, and past behavior. We cannot guarantee funding while preserving unrestricted donor approval.

## Read first

- [Project README](../../README.md), including the relevant role guidance.
- [Structured fundable work](structured-fundable-work.md): work identity, funding history, and once-funded rules.
- [Work items](../tech/subsystems/work-items.md): current beneficiary-scoped identities and authenticated registry relationships.
- [Cooperation without trust](../../docs/end-user/common-sense-majority/cooperation-without-trust.md), especially “The request idea fits very well” and the final discussion of core boundaries.
- [Glossary](../glossary.md).
- [Delegation](../tech/subsystems/delegation/README.md) and [waiting periods](../tech/subsystems/delegation/waiting-period.md).
- [Beneficiary-scoped work identity decision](../decisions/0019-beneficiary-scoped-work-identity.md).

Inspect current implementation before choosing mechanisms. Some older product/glossary prose still describes work-item implementation as pending; the technical work-item doc describes an implemented path.

## Vocabulary and separate acts

Use these candidate terms consistently, adding definitions to the glossary when implementing:

| Term | Meaning |
|---|---|
| Request | A versioned publication inviting work that meets stated outcomes and requirements. It can exist before a provider or project exists. |
| Response | An attributable declaration that a particular project and specified work items are intended to answer an exact request version, including scope and exceptions. |
| Funding offer | An attributable, time-bounded intention to contribute an amount toward acceptable responses, subject to the stated approval authority. It may have verifiable backing. |
| Provider acceptance | An attributable undertaking by the actual provider to meet exact response/request terms. |

“Standing pledge” remains the existing recurring funding mechanism. “Proposal” is already used in contracts and SDK for a third-party project awaiting beneficiary acceptance; it has no settled glossary entry. Prefer “response” for this new relationship rather than silently giving that existing term another technical meaning.

Request publication, funding offer, provider acceptance, alignment judgment, contribution, and delivery judgment are separate acts. None automatically implies the others. A provider's declaration is not proof of compliance. An offer is not spending authorization. Funding success is not delivery success.

## First-slice model

### Requests

A request contains a desired outcome, requirements, optional cause/statement references, and an optional response deadline. It can also provide contextual links, such as the bridge cluster that helped people agree on the requirements.

Use a stable request identity plus an immutable version reference. Offers, responses, and acceptances identify the exact version they concern. Publishing revised requirements must not silently change anyone's offer or undertaking. A latest-version pointer can aid discovery without changing historical meanings.

Distinguish requirements for the work (public access, no party branding, maintenance plan) from limits on the meaning of participation (funding this does not endorse the provider's unrelated politics). Contextual cause/bridge references do not silently import all their current or future terms.

### Funding offers

An offer identifies its author, request version, amount, token/currency, expiry, approval authority, and any additional selection conditions. It can optionally reference backing notes. Record revisions, reductions, withdrawal, expiry, and decisions without erasing history.

The amount is a total budget across responses unless the offer explicitly says otherwise. Approving or funding several responses must not manufacture additional budget. Keep distinct currencies separate unless a clearly described valuation is supplied.

Present three different kinds of evidence:

| Evidence | Meaning |
|---|---|
| Unfunded intention | Someone expects to contribute up to this amount. |
| Offer with verified note backing | Funds currently exist in an identified note, with the stated ownership, authority, and revocability. They can still be spent or withdrawn under the note's existing rules. |
| Approval of a particular response/project | A funding decision has been recorded. Payment still requires actual execution under the applicable mechanism. |

For example, a request page might show “$8,000 in offers with current note backing, subject to approval; another $3,000 in unfunded intentions.” Explain that note backing is withdrawable and may be spendable elsewhere. Reserve stronger “exclusively set aside” language for an enforced reservation.

Backing must be checked against live eligible settlement-token balances and actual authority. A receipt note is not immediately spendable settlement money. Another person's note cannot become the author's backing merely because its ID is public. Delegation and donor revocation must be described accurately.

Multiple offers referencing the same note cannot each count its whole balance. Define attribution/allocation rules and cap recognized backing at the available balance. Splits, replacement notes, consumption, pending spends, refunds, and withdrawals can change what is available; re-evaluate backing rather than trusting a publication-time snapshot. For the smallest implementation, requiring a separate eligible note per backed offer is a reasonable simplification, but does not itself prevent spending elsewhere.

Offer backing is shared demand among competing responses. Do not show $8,000 as independently available to every competing project. Neither offers nor approvals enter a project's raised total. Actual contributions use the existing contribution path and retain its funding/refund semantics.

### Responses and work identity

The primary relationship is:

> This project proposes these work items in response to this exact request version.

Record the project (chain and address), exact authenticated work identities, proposed scope, exceptions, and declaring account/capacity. Support multiple responses to a request and, where needed, multiple request references for a project. A response can cover only part of a request or only some work items in a bundle; make that scope explicit.

Example:

```text
Request: An accessible playground in Cedarvale Park
  Response A: Alice's design-and-build work -> Project A
  Response B: Bob's different design-and-build work -> Project B
```

The request ID is not a work item ID and does not occupy a work-registry slot. Different implementations and beneficiaries keep their existing work identities. Using the request as a shared work identity would incorrectly block competing responses under the once-funded rule. Several funding attempts for the same beneficiary's same work continue to share that work's existing identity.

Authenticate declarations rather than permitting arbitrary metadata to impersonate a project owner or provider. A third-party initiator may suggest a response but cannot undertake requirements for the beneficiary. Distinguish an initiator's response from the actual provider's acceptance.

Provider acceptance names exact terms and capacity. The existing beneficiary `acceptWorkProject` flow starts a veto window; it does not currently establish acceptance of new request requirements. Do not silently reinterpret identity proof, claiming proceeds, project ownership, or that existing acceptance as acceptance of these terms.

### Decisions and history

Preserve attributable facts: offers and their versions, responses, provider acceptance, approvals, declines, reductions, withdrawals, expiry, optional explanations, and verified actual contributions linked to the applicable offer/response.

Rejecting a response is legitimate. Receiving responses without contributing is not automatically a broken promise: responses may be spam or inadequate. Silence means no recorded decision, not rejection. A recorded approval followed by nonpayment is different from declining a design.

People can inspect repeated withdrawals or a history of funding suitable responses. Avoid an automatic “unreliable donor” score or default punishment. Assessments can be published by people/services through the existing judgment and trust model. A wallet history does not prove unique human identity or prevent account switching.

An offer that produced a contribution later refunded after funding failure should retain both facts. Do not count an approval as payment, count one contribution repeatedly across offers, or infer a broken delivery promise from funding failure.

## Architecture boundary

Reuse existing publications, authentication, event-cache folding, notes, projects, and contribution paths where they fit. Requests and response relationships are citable metadata; they do not require a workflow engine or modifications to the work-registry occupancy rules.

The intended public history must be durable and attributable. Choose whether to anchor versioned documents through existing on-chain publication/reference mechanisms or add a small record/event contract after reviewing their capabilities. Document what is on-chain and what relies on retrievable content. A mutable latest pointer alone is insufficient if old records disappear from discovery.

Keep the assurance contract a payer with a pluggable condition. This feature must not introduce implicit delivery gates or donor-specific approval conditions into an ordinary threshold project. Existing note spend delays can support a later funding step where appropriate, but delegated spending after a cancellation window differs from requiring affirmative approval by the donor.

## Later extension: exclusive revocable reservations

If note-backed offers do not reassure doers enough, a separate reservation contract could hold funds for a request, preventing use elsewhere while reserved. The owner could withdraw at any time before spending; withdrawal would be public. Thus allocation is exclusive while active, but accepting a response remains voluntary.

Before implementing this extension, specify custody, approval authority, competing-response allocation, partial spending, expiry, withdrawal/spend races, routing into actual project contributions, and refunds. No reservation should count as raised project funding before the corresponding contribution executes.

This extension, automatic selection, pooled governance, slashing, automatic reputation scoring, and a general project-management protocol are outside the first slice.

## High-level implementation to-do list

First slice uses `PublishedData` versions plus mutable-ref tips ([ADR 0020](../decisions/0020-work-requests-are-published-versions.md)). Exclusive reservations are still out of scope. Contribution links are offer-author reports of contribution/refund transactions; this slice neither submits nor verifies those transactions. Provider acceptance authenticates the signer against the provider named in the response, but project-beneficiary and work-registry verification remain pending. See [remaining tasks](/TODO.md).

- [x] Review the relevant project/developer guidance and current implementation. Map publication/authentication, note intent, live note queries, project metadata, work identities, contribution events, and UI ownership. Read branching guidance before branch operations.
- [x] Define the minimal versioned request, funding-offer, response, provider-acceptance, and decision formats. Resolve IDs, actor authority, historical discovery, updates/revocation, and optional versus required fields. Record consequential architecture choices through the project's decision process.
- [x] Add glossary definitions and clarify “funding request” (an existing project) versus “request for work” where existing prose would otherwise be ambiguous.
- [x] Implement durable authenticated publication and history using existing primitives where suitable; add contract/event support only where the reviewed gaps require it. Wire any new events through the thin event cache and SDK folds.
- [x] Implement SDK create/read/update actions and queries, exact-version links, response scope, provider acceptance, decisions, offer-to-contribution attribution, and live backing verification with deduplication/allocation rules.
- [x] Build the minimal end-to-end UI in the appropriate domain: publish a request, make an offer, optionally name a backing note, browse responses, link a project and its work items, accept terms as provider, and approve or decline as the offer author. Paying still happens on the project page; the contribution link only records that an existing contribution transaction belongs to an offer and response.
- [ ] Verify actual contribution/refund totals. Independent totals for intentions, backing, approvals, and reported payments are implemented; ordinary project raised totals are preserved.
- [ ] Complete request/offer/response history inspection and revision/withdrawal controls in the UI. The SDK preserves version history; the page currently lists request versions and current offers/responses.
- [ ] Complete validation of project/provider/work-item authority and actual payment attribution. SDK/UI regression tests cover version binding, shared backing, competing responses, approval without payment, and reported refund history.
- [ ] Demonstrate the playground example in a browser end to end. The current SDK fixture covers two competing responses, a decline, an approval, a reported contribution/refund, and withdrawn backing; it is not a live transaction demonstration.

## Completion criteria

A person can publish a concrete request before a provider exists, express a quantified offer with an expiry and optional verifiable backing, and retain the right to reject responses. A provider can publish a project responding to exact requirements and explicitly accept those terms. Observers can inspect the offers, current backing, responses, decisions, and actual contributions without duplicated money or implied spending/delivery guarantees.

Existing project creation, beneficiary acceptance/veto, work-item uniqueness, contributions, refunds, and reimbursements continue to obey their existing rules.
