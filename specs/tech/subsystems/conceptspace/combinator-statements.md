# Combinator statements

**Status: specified and implemented.** A closed exception to
[lean-on-ai.md](/specs/product/lean-on-ai.md) and to
[statements.md](statements.md)’s “no structured semantics”: statements that
*are* `all` or `any` of other statements, identified by CID of a canonical
document, so the combination is a graph node without asking an LLM what the
sentence means.

CauseStarter promotion of a view to an [anchor](/docs/founder/shaping-your-cause-statements.md#what-an-anchor-is-actually-for-2026-08-18)
is the product reason this exists. Do not grow it into a language of beliefs.

**Why:** [ADR 0010](/specs/decisions/0010-combinator-statements.md).

## Why this is not the Semantic Web

`lean-on-ai` forbids inventing a data format for interests and beliefs, and
forbids baking “these two sentences mean the same thing” into metadata. Those
are judgment calls.

`all` / `any` over an explicit list of statement CIDs is not a judgment. It is
the definition of two operators this system already uses (cause views, then
promoted anchors). The implication attester should not be guessing conjunction
elimination or disjunction introduction.

What stays forbidden: taxonomies, nearness, “this slogan is that platform,”
nested formulas, `NOT`, weights, slots, or a general `meaning` blob.

## Two layers

**References** (already on [displayable documents](displayable-documents.md)):
any statement may list other statement CIDs it talks about. The UI embeds them.
No logic. Useful for bridges, “clearer wording of X,” combinators, anything.

**Combinator** (this spec): optional, closed, and *the claim*. If present, the
document *means* that operator over those operands. Natural language is a
fixed gloss of that operator, not extra content.

## Canonical document (CID *is* lookup)

A combinator statement’s bytes are a function of **only** `(combinator,
sorted operand CIDs)`. Same operator + same operands ⇒ same CID. Lookup is
“build the document and hash it.” No combinator index is required for identity.

```json
{
  "content": "I believe all of the referenced statements.",
  "extras": { "combinator": "all", "statementType": "combinator-statement" },
  "format": "markdown-restricted",
  "references": [
    { "cid": "<operand cid, sorted>" },
    { "cid": "<operand cid, sorted>" }
  ]
}
```

`combinator` is `"all"` (conjunction) or `"any"` (disjunction). At least two
operands. `references` is those CIDs in lexicographic order, **no `label`**.
`content` is one of two exact strings:

- `all` → `I believe all of the referenced statements.`
- `any` → `I believe at least one of the referenced statements.`

Do not list operand CIDs in `content`. The renderer fetches `references`.

No other extras (`createdDate`, `topic`, founder title, mediator blurb, …).
Canonical JSON as usual (sorted keys, no extra whitespace).

Hand-authored documents that deviate from this template are ordinary statements
(LLM attester, no deterministic arrows).

### Identity vs display

A title is either redundant or a smuggled extra claim. Display names belong on
the cause (roster title, slug, summary) and on the statement *page* (operand
bodies at render time), not in the signed bytes.

If two causes share the same three planks, they *should* share the combinator
CID. Different titles would split it for no semantic reason.

`createdDate` in extras is a publication fact stuffed into the claim. For
combinators it guarantees a unique CID per mint, which is the opposite of the
product. When the document was first published is already on the publish
transaction. Ordinary statements also no longer default `createdDate` into
extras; an explicit date is still allowed for frozen seed CIDs.

### Human display

Displayable-document rule still holds: renderers show every field. The page
for a combinator statement shows the gloss, the operator, and **each referenced
statement’s own content** (fetched by CID). Roster order, cause title, “alliance
vs manifesto” copy live on the cause page that *linked* the CID, not inside it.

A combinator CID is immutable. Rewording a plank is a *new* combinator. The UI
must not pretend the old alliance updated.

## Implications (deterministic, pairwise only)

The `Implications` contract is binary: “if someone believes S1 they probably
believe S2.” Combinators mint only the arrows that *are* pairwise:

| Combinator | Arrow | Why |
|---|---|---|
| `all` | combinator → each operand | conjunction elimination; “sign the manifesto once, count on every plank” |
| `any` | each operand → combinator | disjunction introduction; “plank signers count toward the alliance” |

**Not representable as pairwise implications**, and not this spec’s job:

- All operands → `all` (conjunction introduction). That is the cause **view**
  (intersection / band 1). A pairwise `P1 → all` would be a lie.
- `any` → an operand (disjunction elimination). Signing the alliance does not
  mean signing a particular plank.

The implication attester has a **structural gate** on the existing attester
identity (not a second key, not an LLM special case): if the pair matches this
canonical form and one of the two arrow kinds above, it publishes that arrow
and never asks the model. Every other pair, including other pairs that mention
a combinator, still goes to the LLM attester as today. Taste arrows (“is
pro-life part of conservatism?”) stay LLM / founder.

Non-transitivity is unchanged. Nested combinators are just statements; v1
CauseStarter only promotes over non-combinator planks.

Anyone may publish identical combinator bytes. Identical bytes are the same
CID; the `PublishedData` publisher is not the claim.

## Product seat

CauseStarter view strip: after a selection of planks, optional promote.

- **Any of these** → `any` combinator, inbound arrows from each selected plank.
- **All of these** → `all` combinator, outbound arrows to each selected plank.

Does **not** replace the roster. Does **not** fork a cause. The roster may
store the CID as “the graph handle for this selection” (especially one
disjunctive “this cause, as a statement”). Same combinator reused if it
already exists.

Promotion **writes this template**; it is not a free-text editor.

Earmark-to-bundle and Tally/other surfaces that need a statement CID point at
this CID. Alignment stays on planks
([align low, aggregate high](/docs/founder/shaping-your-cause-statements.md#align-low-aggregate-high)).

## What this does not do

- Replace natural-language planks. Combinators are rare, promoted, and boring.
- Formal meaning *instead of* a sentence. The gloss is required and fixed.
- A general references-as-variables syntax (`referenced-statement 1`). Humans
  read the operand documents.
- N-ary on-chain “believes all of.” Views already compute that.
