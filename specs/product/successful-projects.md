# Successful projects

The central use case of the whole site is being able to fund projects that have **actually produced real value in the world** — not just projects that *intend* to. Today the site can't do that. This doc specifies the missing piece.

## The gap

Aligning currently models one claim about a project:

- **Alignment:** "project P is aligned with cause C" — i.e. P *intends* to produce value aligned with C. This is what the cause board's project list shows, filtered through the [trust graph](../tech/subsystems/subjectiv/README.md) (you only see vouches from attesters you transitively trust), with [implication propagation](../tech/subsystems/conceptspace/README.md) so a project aligned with any statement S that implies C shows up on C's board.

What's missing is a second claim:

- **Success:** "project P *delivered* value aligned with C" — i.e. P has *already* produced the value, not merely set out to.

The existing "Succeeded" status badge does **not** cover this — it only means `deadline passed && funding threshold met` ("got funded"), which says nothing about whether the project delivered anything. There is no signal anywhere that an aligned, funded project actually worked.

This matters because it's the foundation [retroactive funding](/docs/end-user/lazyGiving/retroactive-funding.md) needs: "fund things that have already worked." Retroactive funders want a queue of *proven* projects whose scouts have not yet been fully reimbursed — projects that delivered real value and **still have outstanding at-cost reimbursement claims**. We tell that story in the docs ("close the reimbursement loop") but nothing renders it.

## The model: same cause, second claim type

Success is **not** a new statement or a new trust mechanism. It's a second attestation type riding on everything Aligning already has, anchored to the **same** cause statement.

| | Anchor statement | Claim type | Surface |
|---|---|---|---|
| Aligned | C (or any S implying C) | "is aligned with" | existing Aligned project list |
| **Successful** | C (or any S implying C) | **"delivered value aligned with"** | **new Successful tab** |

One cause statement C ties both together. The cause board stays centered on C exactly as it is now; we add a Successful view alongside the Aligned view.

Everything is reused:

- **Trust-graph filter (Subjectiv).** You see success vouches only from attesters in your trusted set. Same machinery as alignment vouches. Same [discovery slider](alignment-anti-abuse.md) to loosen "my network → +1 hop → anyone" so the page isn't empty on day one.
- **Implication propagation.** A success attestation can anchor to C directly (simplest) or to a more specific statement that implies C, which then propagates up to C's Successful tab — exactly as alignment attestations do today. Example: "project delivered value aligned with [cleaned the Anacostia]" surfaces on the **clean rivers** cause board because "cleaned the Anacostia" implies "clean rivers." This is drawn from the *same* pool of Conceptspace statements — there is no separate "outcome statement" class.

The only genuinely new things are: the success claim type, and the Successful tab that renders it.

## Identifying success semi-trustworthily

The spine of the ranking is **trust-graph success attestations** — subjective "this delivered" vouches, filtered by the viewer's network. This is the most on-brand and the cheapest to build: it's a near-clone of the alignment attestation, and it inherits the whole immune system (trust filter + implication + discovery slider) for free.

Other signals exist and can be layered in later as refinements, but are **not** part of the initial build:

- **Reimbursement activity** (later donation inflow after delivery) — a useful popularity signal for ranking known projects, but circular for a *discovery* page and not evidence of success by itself. It cannot bootstrap unknown projects.
- **Reputation-weighted scouts** — projects backed early by scouts with good track records get a stronger prior. Pure on-chain track-record surfacing (see [alignment-anti-abuse.md](alignment-anti-abuse.md)).
- **Objective / oracle criteria** — for projects that can define machine-checkable success. Strongest trust, narrowest applicability. The "more-objective success verification" idea noted as a future possibility in [aligning/README.md](../tech/subsystems/aligning/README.md).
- **AI success evaluator** — a "did this deliver?" evaluator posting success attestations like any other voucher, earning or losing trust as its judgments correlate with later trusted outcome assessments. It stays inside the existing attester immune system rather than acting as an oracle of truth.

## The page

The Successful tab is a **call-to-action queue**: proven work where scouts haven't been repaid yet.

- **Filter:** `trust_weighted_success_score > threshold` **AND** `outstanding_reimbursement > 0`.
- **Each card:** what it accomplished · who vouches it succeeded (trust-filtered) · reimbursement still outstanding · "donate to close the loop" CTA.
- **Sort:** by the "deserving but not yet reimbursed" metric — success confidence × reimbursement still outstanding — so the most proven, least-reimbursed projects float to the top.
- **Discovery slider:** "only my network's success vouches → +1 hop → anyone."

This is the UI surface for the "close the reimbursement loop" story already written in [retroactive-funding.md](/docs/end-user/lazyGiving/retroactive-funding.md).

## Policy decisions

1. **Who can post success vouches:** start open. Any wallet may post a success vouch, matching alignment attestations. The product relies on the trust graph and discovery slider to keep low-trust or unknown attestations from dominating the default view. Do **not** gate initial posting on proof-of-personhood, staking, KYC, or admin approval; those remain abuse-response tools if open posting proves noisy.
2. **Vouch decay and retroactive reputation damage:** ship success vouches with the same durable attestation semantics as alignment for the first implementation, but model them as reputation-relevant actions in event/data shapes so later reputation-damage jobs can identify the attester, project, cause, and timestamp. Do **not** build decay or slashing into the first UI path; the ranking should be explainable and trust-filtered before adding temporal scoring.
3. **Distinct attester role / domain-scoped trust:** success confidence should be computed as a separate claim type, not blended into alignment confidence. For the first build this can reuse the same trusted-attester set because domain-scoped trust is not implemented yet, but SDK/UI names should keep `alignment` and `success` trust/scores separate so future domain-scoped trust can distinguish “good at spotting relevant projects” from “good at judging outcomes” without another migration.

## Implementation sketch

A near-parallel of the alignment attestation path:

- **Contract:** a `SuccessAttestation` event (mirroring `AlignmentAttestation` in `hardhat/contracts/alignment-attestations/`) with a `subject` (project address), a `topicStatementId` (the cause C, for indexer filtering), and the "delivered" semantics. Anyone can emit.
- **SDK:** fold `SuccessAttestation` events from the event cache; join with implication data (same approach as alignment — no transitive graph traversal) and project on-chain reimbursement state. Apply the Subjectiv trust filter.
- **UI:** a Successful tab on the cause board (`ui/src/aligning/`) parallel to the Aligned list, with the filter/sort/CTA described above; plus a "Successful at" section mirroring the existing "Alignment Attestations" section on the LazyGiving project detail page, and an "attest success" action mirroring "attest alignment."

## Related

- [aligning/README.md](../tech/subsystems/aligning/README.md) — the subsystem this extends.
- [aligning/ui.md](../tech/subsystems/aligning/ui.md) — where the Successful tab lives.
- [retroactive-funding.md](/docs/end-user/lazyGiving/retroactive-funding.md) — the user-facing story this page renders.
- [alignment-anti-abuse.md](alignment-anti-abuse.md) — trust-graph defenses and credential ideas, all of which apply to success vouches too.
