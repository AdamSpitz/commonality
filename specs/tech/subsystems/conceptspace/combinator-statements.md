# Combinator statements (tentative)

**Status: tentative.** Not implemented. A closed exception to
[lean-on-ai.md](/specs/product/lean-on-ai.md) and to
[statements.md](statements.md)’s “no structured semantics”: statements that
*are* `all` or `any` of other statements, identified by CID of a canonical
document, so the combination is a graph node without asking an LLM what the
sentence means.

CauseStarter promotion of a view to an [anchor](/docs/founder/shaping-your-cause-statements.md#what-an-anchor-is-actually-for-2026-08-18)
is the product reason this exists. Do not grow it into a language of beliefs.

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

Today `createStatement` puts `extras.createdDate` (default: now) on every
statement. Two publishes of the same prose therefore get two CIDs. Ordinary
statements can live with that (the LLM attester is how we notice duplicates).
A combinator cannot: the whole point of promoting `any(P1,P2,P3)` is that the
next founder who promotes the same set **finds the same CID**, or republishes
bytes that hash to it.

So a combinator statement’s bytes are a function of **only** `(combinator,
sorted operand CIDs)`.

Proposed shape:

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

No other extras (`createdDate`, `topic`, founder title, mediator blurb, …).
Canonical JSON as usual (sorted keys, no extra whitespace).

Then: same operator + same operands ⇒ same CID. Lookup is “build the document
and hash it” (or fetch that CID). No combinator index required for identity,
though an index of `(combinator, operands) → cid` is still a convenient cache.

### Why not a title?

A title is either redundant or a smuggled extra claim.

The cause already has the identity people broadcast (`/cause/:owner/:slug`,
roster title, summary). The combinator is the graph handle for the
*combination*, not a second brand. A founder-chosen headline on the combinator
is how you get “I’m generally conservative” while extras say `any(pro-life, 2A,
taxes)` — the slogan trap
[shaping-your-cause-statements.md](/docs/founder/shaping-your-cause-statements.md#a-promoted-disjunctive-anchor-must-keep-its-list-visible)
exists to prevent.

If two causes share the same three planks, they *should* share the combinator
CID. Different titles would split it for no semantic reason. Display names
belong on the cause (and on the statement *page*, derived from operand
contents at render time), not in the signed bytes.

### Why not a date?

`createdDate` in extras is a publication fact stuffed into the claim. For
combinators it is worse: it guarantees a unique CID per mint.

When the document was first published is already on the publish transaction
(`PublishedData` / first `DirectSupport`). Signers care about the claim, not
who minted the combo on a Tuesday.

`createStatement`’s default `createdDate` must not be used for this document
class.

### Human display

Displayable-document rule still holds: renderers show every field. The page
for a combinator statement shows the gloss, the operator, and **each referenced
statement’s own content** (fetched by CID). That is the list the attester and
the signer are looking at. Roster order, cause title, “alliance vs manifesto”
copy live on the cause page that *linked* the CID, not inside it.

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

A **deterministic attester** (separate key, or a gated path in the existing
implication attester) publishes those arrows iff the document matches this
canonical form. It refuses every other pair to the LLM attester as today.
Taste arrows (“is pro-life part of conservatism?”) stay LLM / founder. These
do not.

Non-transitivity is unchanged. Nested combinators are just statements; v1
CauseStarter should only promote over non-combinator planks.

## Product seat

CauseStarter view strip: after a selection of planks, optional promote.

- **Any of these** → `any` combinator, inbound arrows from each selected plank.
- **All of these** → `all` combinator, outbound arrows to each selected plank.

Does **not** replace the roster. Does **not** fork a cause. The roster may
store the CID as “the graph handle for this selection” (especially one
disjunctive “this cause, as a statement”). Same combinator reused if it
already exists.

Promotion **writes this template**; it is not a free-text editor. Hand-authored
combinators that deviate from the template are ordinary statements (LLM
attester, no deterministic arrows).

Earmark-to-bundle and Tally/other surfaces that need a statement CID point at
this CID. Alignment stays on planks
([align low, aggregate high](/docs/founder/shaping-your-cause-statements.md#align-low-aggregate-high)).

## What this does not do

- Replace natural-language planks. Combinators are rare, promoted, and boring.
- Formal meaning *instead of* a sentence. The gloss is required and fixed.
- A general references-as-variables syntax (`referenced-statement 1`). Humans
  read the operand documents.
- N-ary on-chain “believes all of.” Views already compute that.

## Open (for the inbox pass)

- Exact gloss strings (and whether they should mention “referenced statements”
  vs listing CIDs in the text — listing CIDs would still be canonical if
  sorted, but uglier; fetching references is enough if the renderer is honest).
- Whether ordinary statements should stop putting `createdDate` in extras
  (adjacent smell; out of scope unless it falls out cheaply).
- Deterministic attester as its own identity vs a special case of the LLM one.
- First-signer-wins vs anyone may publish identical bytes (identical bytes are
  the same CID either way; `PublishedData` publisher is not the claim).
