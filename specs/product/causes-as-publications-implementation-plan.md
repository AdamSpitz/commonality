# Causes-as-publications implementation plan

This is the implementation checklist for the accepted product model in
[causes-as-publications.md](./causes-as-publications.md) and
[ADR 0009](../decisions/0009-causes-are-publications-over-statements.md). The product
spec owns semantics; this file owns sequencing and may change as implementation teaches
us more.

## 1. Align terminology and documentation

- [ ] Replace organizer-facing uses of “cause founder” with **cause organizer** where the
  person is curating and circulating a publication; reserve **vertical operator** for the
  person operating an independent front end and policy stack.
- [x] Update CauseStarter and founder guidance that still says “founder writes; AI only
  coaches” to the retrieval-first “AI proposes; human explicitly adopts” model.
- [ ] Reconcile the old eight-UI-domain descriptions with CauseStarter as the primary
  cause-first reference surface, without deleting the generic sites or weakening ADR 0005.
- [x] Keep cause assistance and mediation separate in product copy: clarification versus
  an explicitly proposed change in position.

## 2. Prove statement semantics before changing production prompts

- [ ] Build a focused implication corpus covering logical weakening, named scope
  restriction, rhetoric removal, ambiguous targets, concessions, reservations, and
  negotiated compromises.
- [x] Update the implication-attester rules so breadth and multiple possible
  implementations are not mistaken for ambiguity, while false-positive implications
  remain conservative.
- [x] Update cause-assist statement guidance to use the same rules and add regression
  tests for the examples in the product spec.
- [x] Teach the assistants the grouping/hidden-majority pattern catalog, while making
  clear that patterns guide generation and do not create new protocol types.

## 3. Build the retrieval-first statement picker

- [x] Define one reusable picker contract for intent gathering, statement retrieval,
  optional drafting, rejection/correction, selection, ordering, and deterministic review.
- [x] Search existing statements and the relevant curated explorer map before offering
  newly drafted text; expose an explicit “none of these” correction path.
- [x] Render exact final statement text and CIDs outside free-form chat before any
  publication, signature, alignment, or funding-intent action.
- [x] Instrument reuse-versus-creation, rejected suggestions, corrections, and abandoned
  flows so duplication and misinterpretation can be measured.

## 4. Replace CauseStarter authoring without breaking existing work

- [x] Replace the blank plank-writing start flow with conversational intent gathering,
  retrieval, selection, and on-demand drafting.
- [x] Preserve the existing title, narrative, ordered plank roster, preview, coherence
  check, `PublishedData` publication, `MutableRef`, stable URL, and pinned-version URL.
- [x] Preserve every existing published roster CID and history; when opening an existing
  local `CauseDraft`, carry its title, narrative, and planks into review without silently
  rewriting or publishing anything.
- [x] Add compatibility coverage before removing any legacy-only local-storage fields.
- [x] Keep anchors optional and keep union/intersection/no-disagreement views derived
  client-side. Do not mint an anchor merely for a URL, count, grouping, or batch action.

## 5. Make the cause page the cause-first product surface

- [x] Clearly distinguish organizer narrative, immutable statements, derived views,
  direct signatures, and indirect support.
- [x] Let a visitor select and batch-sign individual planks without implying endorsement
  of the organizer, narrative, roster, or unselected planks.
- [x] Show the union of projects aligned with the selected immutable statements, with
  direct project funding and the specialized aligned-content board available in context.
- [ ] Add statement-scoped delegation entry points only through the delegation product's
  settled semantics; do not reactivate or redesign unresolved `NoteIntent` behavior as a
  side effect of this work.
- [x] Preserve ADR 0008: no Commonality-authored cause search, browse, ranking, featuring,
  or leaderboards; policy suppression must cover both rendering and aggregation.

## 6. Reuse the picker in distinct workflows

- [ ] Add an intent-specific project-alignment picker that targets immutable statements
  and supports inviting trusted alignment attesters.
- [ ] Add an intent-specific delegate-offering and donor-scope picker once delegation
  intent semantics are settled.
- [ ] Reuse retrieval and review components for personal belief exploration without
  introducing a universal stored “profile” object.

## 7. Validate and ship

- [ ] Add end-to-end coverage for a non-expert organizer creating, reviewing, publishing,
  revising, and sharing a cause, including rejecting every AI suggestion.
- [ ] Add visitor coverage for signing selected planks, inspecting direct/indirect
  support, viewing aligned projects, and following current and pinned-version URLs.
- [ ] Test misleading narrative/roster combinations and verify that coherence is a
  narrow positive badge rather than an admission gate or general endorsement.
- [ ] Run migration/regression coverage against existing published causes and local
  drafts before deployment.
- [ ] Validate the complete journey with non-expert users and revisit ADR 0009 if explicit
  review does not reliably prevent accidental adoption of unintended statements.

## Deferred until the core journey works

- [ ] Specify an embeddable, recomputable cause widget for independently operated sites.
- [ ] Evaluate richer anchor-promotion tooling using observed demand rather than making
  anchors a launch requirement.
- [ ] Reconsider discovery only if real organizers demonstrate that link distribution is
  insufficient; doing so requires revisiting ADR 0008.
