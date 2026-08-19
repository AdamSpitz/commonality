# 0010. Combinator statements are the graph form of a promoted view

- **Status:** Accepted
- **Date:** 2026-08-19
- **Related specs:** [`specs/tech/subsystems/conceptspace/combinator-statements.md`](../tech/subsystems/conceptspace/combinator-statements.md), [`docs/founder/shaping-your-cause-statements.md`](../../docs/founder/shaping-your-cause-statements.md), [`specs/product/lean-on-ai.md`](../product/lean-on-ai.md), [`specs/decisions/0009-causes-are-publications-over-statements.md`](./0009-causes-are-publications-over-statements.md)

## Context

[ADR 0009](./0009-causes-are-publications-over-statements.md) already settled that a
cause is a mutable roster over immutable statements, and that union/intersection
counts are derived views, not protocol objects. An *anchor* — a statement CID for a
combination that other surfaces can sign, earmark to, or imply — was still missing.

The obvious encodings all re-open problems we already rejected. A founder-written
slogan (“I’m generally conservative”) plus a hidden list is the hedged-identity trap:
the implication attester should refuse plank → slogan, so the combination silently
collects nothing. Free-text “I believe all of …” with a date or title in extras mints
a unique CID per publish, so two causes with the same three planks never share a node.
Asking the LLM attester what a combination *means* is the Semantic Web move
`lean-on-ai` forbids: baking judgment into metadata.

Meanwhile `all` / `any` over an *explicit list of statement CIDs* is not a judgment.
It is the same pair of operators the cause page already uses as views. Conjunction
elimination and disjunction introduction are pairwise facts the Implications contract
can represent; conjunction introduction and disjunction elimination are not.

## Decision

A promoted view is a **combinator statement**: a closed, canonical document that *is*
`all` or `any` of at least two other statement CIDs. The CID is a pure function of
`(operator, lexicographically sorted operand CIDs)`. Natural language is a fixed gloss
of that operator, not extra content. There is no founder title, no `createdDate`, and
no other extras in the signed bytes.

Display names belong on the cause (roster title, slug, summary) and on the statement
*page* (operand bodies fetched by CID). Two causes that promote the same operator over
the same planks **share the combinator CID**. That is identity, not a collision.

The implication attester publishes only the pairwise arrows that follow from the
operator, via a structural gate on the existing attester identity (not a second key,
not an LLM special case):

- `all` → each operand (conjunction elimination: sign once, count on every plank)
- each operand → `any` (disjunction introduction: plank signers count toward the alliance)

Operand → `all` and `any` → operand are not this encoding’s job (the former is the
conjunction *view*; the latter would claim that signing the alliance is signing a
plank). Every other pair, including taste (“is pro-life part of conservatism?”),
still goes to the LLM / founder as today.

CauseStarter promotion writes this template from a selected view. It does not replace
the roster, fork a cause, or become a free-text editor. Alignment stays on planks.
Nested combinators exist as statements; v1 promotion is only over ordinary planks.

Hand-authored documents that deviate from the template are ordinary statements.

## Alternatives considered

- **Free-text anchor with a founder headline.** Rejected because a title is either
  redundant with the cause or a smuggled extra claim. It is how you get “I’m generally
  conservative” while the extras say `any(pro-life, 2A, taxes)`.
- **Put `createdDate` (or any publication fact) in extras.** Rejected because it
  guarantees a unique CID per mint, which is the opposite of sharing a graph node.
  Publication time already lives on the `PublishedData` transaction.
- **Let the LLM attester interpret combination sentences.** Rejected as a
  `lean-on-ai` violation. `all` / `any` over listed CIDs is definitional; synonymy,
  nearness, and nested formulas are not, and we will not grow a belief language.
- **On-chain n-ary “believes all of.”** Rejected because views already compute that,
  and the Implications contract is binary. We only mint arrows that are honestly
  pairwise.
- **A combinator registry / first-signer-wins identity.** Rejected because identical
  bytes are already the same CID. The publisher is not the claim.

## Consequences

Combinations that deserve a graph node can be signed, earmarked to, and pointed at by
Tally and other surfaces without minting a slogan. Shared plank sets share a node, so
alliances compose across causes. The closed exception stays small: two operators, no
`NOT`, no weights, no nesting in v1 promotion.

Costs: rewording a plank is a *new* combinator (correct, but the UI must not pretend
the old alliance updated). A dishonest renderer that hides operands makes the gloss
vacuous — operand bodies must be shown. Conjunctive anchors still have almost no
inbound arrows; do not park projects on them.

**Revisit if** we need a third honest operator that is still not a judgment (we do
not currently have one), if pairwise Implications become a bottleneck for a real
n-ary product, or if sharing combinator CIDs across causes turns out to confuse
founders more than it composes alliances — in which case the fix is display, not a
title in the bytes.
