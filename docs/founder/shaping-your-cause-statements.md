# Shaping your cause's statements

**Status: signed off; planks and views built, anchors not.** This is how a cause
is built out of statements. The mechanics it describes (implication direction,
how support and cause boards aggregate) are accurate to the system as specified.
The architecture it proposes — **planks, views, and anchors** — was signed off by
Adam on 2026-08-09. The design questions that were open closed on the same date
and are recorded, with their reasoning, in [§ Resolved](#resolved-2026-08-09);
what remains open is one bug, at the end.

**What exists as of 2026-08-10**, in CauseStarter:

- **Planks** are the cause. `CauseDraft` is a list of `CausePlank`s, each
  published separately and each carrying its own CID
  (`causestarter/src/lib/causeStore.ts`). There is no main statement, no goal
  field, and no launch step — a cause is "live" once any plank is on chain.
- **Views** are real. `getStatementBelieverSets` returns the deduped
  believer/indirect/disbeliever ID sets per plank, and `computeViewCounts` folds
  them into the union view and the two conjunction bands
  (`sdk/src/subsystems/conceptspace/views.ts`). Visitors can deselect planks;
  that re-folds locally and costs nothing.
- **The cause page is the views layer**, and is edited in place by the founder —
  there is no separate authoring mode.
- **Anchors are not built.** No promotion action exists yet, which is consistent
  with [§ Promotion](#promotion): it is a later move, taken once a combination
  has proven itself.

Companion to [standing up a vertical](/docs/founder/standing-up-a-vertical.md),
which covers the vertical as a whole. This one covers the narrow question of what
statements a cause consists of and how a cause site presents them.

## The problem

A founder shows up wanting to start a conservatism cause. He plausibly wants a
main idea plus particular goals underneath it — pro-life, second amendment, lower
taxes — and wants his site to show, per goal: supporter counts, a cause board of
aligned projects, and earmarked funds.

Left alone, he'll write "conservatism" as his statement. That's the worst possible
input: too vague for the implication attester to draw *any* arrow, in either
direction, so the cause gets no aggregation, no rollup, and no explanation of why.

The old framing of this doc asked which *single* shape his main statement should
take. That framing turns out to be wrong, for reasons in
[§ Planks, views, anchors](#planks-views-anchors). But you need the mechanics
first, because they're what make the shapes differ.

## The mechanics you're designing against

Three facts from the substrate:

1. **Implication means "if someone believes S1, he probably also believes S2",
   and support flows along the arrow.** S1's signers count as indirect supporters
   of S2, not the reverse.
   ([conceptspace](/specs/tech/subsystems/conceptspace/README.md))

2. **Cause boards inherit the same direction.** The board for statement S shows
   projects attested as aligned with any S2 *such that S2 implies S*. A
   statement's board is populated by its **inbound** arrows.
   ([aligning](/specs/tech/subsystems/aligning/README.md))

3. **Implications are not transitive.** S1→S2 and S2→S3 does not give S1→S3. Any
   structure deeper than two levels needs every pair attested directly.

Two consequences, which are the crux of everything below:

- **Inbound arrows are the valuable ones.** They give a statement its supporter
  count and its board. Outbound arrows give a statement *nothing* — they hand its
  signers' support to the targets.
- **Logical strength decides which arrows you can get.** A weak statement is easy
  to imply and implies little: lots of potential inbound, no outbound. A strong
  one is the reverse. No single statement gets both, and that's a fact about
  logic, not about our tooling.

## Three statement shapes, and what each is for

Each shape is genuinely useful; none is the "right" one.

### Single-issue

> "In the abortion debate, I'm pro-life."

Focused and simple. Picks up support from anyone who agrees, **including people
who'd never adopt the cause's broader identity** — pro-life leftists, in this
example. Doesn't get tangled up with other issues, so it doesn't ask anyone to
swallow a bundle.

This is the atom. Most of what a cause is made of should be these.

### Conjunctive manifesto

> "I'm a staunch conservative and I agree with all the usual conservative ideas:
> I'm pro-life, I'm a fan of the second amendment, I want lower taxes and less
> government spending…"

Strong, and it names its components, so it implies each of them by simple
conjunction elimination — arrows the attester will bless confidently. Someone who
signs it genuinely does support each listed piece, so the inherited support is
honest.

Good for building a larger thing out of many pieces, **if there really are a lot
of people who hold all of them**. Its own supporter count and board stay near
empty, because almost nothing implies a maximal conjunction. It's a generator of
arrows, not a destination for them.

### Disjunctive or hedged/broad

> "I support at least one of the following: [pro-life], [second amendment],
> [lower taxes]…"

Weak, so lots of things imply it: crisp inbound arrows from every named plank.
Good for **alliance-building** between people who otherwise disagree — it's the
"commonality statement" shape the conceptspace spec describes.

Its cost is that signing it means very little, so a headline count against it is
broad and shallow.

Note the trap in the hedged variant: **"I'm pro-life" does not imply "I'm
generally conservative."** Pro-life people who aren't conservatives exist, so the
attester should reject that arrow. A hedged identity statement looks like it
should collect its planks and doesn't.

| Shape | Inbound (support & board in) | Outbound (implies planks) | Good for |
|---|---|---|---|
| Single-issue | its own, directly | none | reach; support from people outside the cause's identity |
| Conjunctive manifesto | almost none | crisp, free | letting the wholehearted sign once and count everywhere |
| Disjunctive / hedged-broad | crisp, from every named plank | none | alliances; rolling several issues into one signable thing |

### Hedge, don't blur

Hedging ("although I may have some quibbles") makes a statement logically weaker
and so *easier to imply* — that helps. Vagueness ("conservatism in a broad sense")
makes it **unattestable**: the attester deliberately refuses arrows it finds
ambiguous, so a fuzzy statement silently gets none of the inbound arrows that were
the entire reason for writing it weakly. Weaken with explicit hedges and
enumerated disjuncts, never with fuzzy nouns.

## Planks, views, anchors

Here's the part that changes the shape of the problem.

A founder doesn't just want to choose between conjunction and disjunction once. He
wants to wonder whether to drop one issue, add another, or show a different
grouping to a different audience — and his *visitors* will want the same thing.
Forcing that into a single published main statement is a straitjacket, and it
isn't necessary, because **most of what a cause site displays does not require a
published statement at all.**

Given planks S1…Sn, each with its own signer set, aligned-project set, and
earmarked notes:

- **Disjunction view** = the union of those sets. "4,210 people have signed at
  least one of these five."
- **Conjunction view** = the intersection. "310 people have signed all five."
- **Any subset** = the same operations over whichever planks are selected.

Support for both aggregates is *inferable* — nobody has to sign a combination for
the site to count it. Signing any plank puts you in the union; signing every plank
puts you in the intersection (conjunction introduction is as valid an inference as
the disjunction direction).

These are client-side set operations over data the SDK already folds. No anchor
statement, no attestation, nothing on chain. A visitor deselecting an issue is a
set operation, not a new statement.

So the three layers:

- **Planks** — published statements; the atoms. All signing, alignment, and
  earmarking happens here. Usually single-issue.
- **Views** — client-side set operations over any subset of planks. Unlimited,
  free, togglable by the founder *or the visitor*. Display only. **This is the
  cause website.**
- **Anchors** — a *promoted* view: a published statement for a combination that
  has earned its own signable identity, with attested arrows from its planks.
  Usually a disjunction (to collect its planks) or a conjunction (to distribute
  to them).

What you lose in a view, and only this: nobody can **sign** the combination,
**earmark** funds to it, or **align a project with** it. Those three need a real
statement with a real CID. Everything else — counts, boards, filtering,
comparison — a view does fine.

"One main statement" is therefore just the default promoted view, not a structural
requirement.

### Conjunction views need two bands, or they lie

The two views degrade in opposite ways, because `noOpinion` is the default belief
state and most people will never encounter most planks.

The union is robust to silence: one signature puts you in. The intersection is
**destroyed** by it. Someone who signed four of five planks and simply never saw
the fifth drops out completely — not because he disagrees, but because he wasn't
asked. As a cause grows planks, a naive intersection collapses toward zero for
reasons that have nothing to do with the cause's actual coherence, and the number
it shows is worse than no number at all.

So don't compute a conjunction view as "signed everything." Compute two bands:

- **"310 people have signed all five."** — the strict intersection.
- **"1,840 more have signed at least one and disagreed with none."** — everyone
  whose signed set is non-empty and whose `disbelieves` set is empty across the
  selected planks.

The second band is the honest estimate of conjunction support, and it exists only
because beliefs are three-valued (`noOpinion` / `believes` / `disbelieves`) rather
than a simple signed/unsigned flag. Without that distinction the conjunction view
isn't worth shipping.

It's also the more decision-useful of the two views for a founder: the second band
measures how much of his base is plausibly whole-hearted, which is exactly what
tells him whether promoting a conjunctive manifesto would find signers.

### Align low, aggregate high

Alignment attestations for projects should attach to **planks**, not to
conjunctions — and this is a rule, not a mild preference.

A conjunction has no inbound arrows. A project aligned with one propagates
nowhere and appears on exactly one board. A project aligned with a plank
propagates up every arrow that plank has: it appears in every view containing the
plank, and on any disjunctive anchor the plank feeds. Attaching at the plank level
costs nothing and buys reach.

The same logic applies to earmarked notes. Earmark to the plank; let the views and
anchors aggregate.

### Promotion

This gives the founder a path rather than an upfront decision. Start with planks
and views; watch which combinations people actually converge on; publish an anchor
for the winner once it's proven, and attest the plank arrows into it. That's the
"nudge gently toward coordination without forcing it" principle Conceptspace is
built on, applied one level up.

### Why this is more honest

A view is labeled for exactly what it is — "at least one of these five" versus
"all five" — because it doesn't claim anyone signed anything. The misleading
number only appears when you publish a disjunctive anchor and let its count read
as though people endorsed the whole bundle. Views let a founder explore
aggregations without minting a number that overstates what anyone agreed to.

The existing transparency rule still applies to every plank: show direct and
indirect support separately ("17 people signed this; 118 signed five other
statements that imply this").

### Two levels, still

Because implications aren't transitive, an anchor collects only planks with a
*direct* attested arrow into it. Sub-planks under planks won't roll up unless
every pair is attested. Views don't care — a view can select any planks it likes —
but the moment you promote one, the two-level limit is back.

### Who attests the plank→anchor arrows

The founder can be his own attester for his own cause's arrows. That puts the
judgment — "is pro-life part of conservatism?" — where it belongs: it's his claim,
published under his identity, and visitors who don't trust his framing can drop
him as an attester and see the cause without his planks. This is the "route around
perceived bias" property Conceptspace already builds for. The safety filter still
applies (legal exposure, not taste), but the entailment judgment needs no
gatekeeper.

Disavowal is native, incidentally: beliefs are three-valued (`noOpinion` /
`believes` / `disbelieves`), so marking out what a cause is *not* means signing
disbelief, not inventing a new kind of statement.

## What cause-assist should do

The founder arrives with "conservatism" and no idea that any of the above exists.
He should not have to learn it, and this is not a gap to apologize for — **guiding
him into a workable pattern is the entire job of the service.** Statements are an
unnatural artifact to be asked for cold; the founder shouldn't be the one bridging
that gap.

### The mismatch today

Every existing service assumes the artifact he is least able to produce, and none
of them helps him produce it:

This table describes the mismatch as it stood before the plank model was built;
the wizard row is now resolved (there is no wizard — see the status note at the
top), and the rest still describes cause-assist.

| Piece | Before | Under planks/views/anchors |
|---|---|---|
| Wizard steps | `Main statement → Supporting → Launch` | *Resolved:* no wizard and no launch; planks are written and published in place on the cause page |
| `/suggest-statements` | Needs a `goal` (the main statement) and derives things it implies | Needs a *rough description of the cause* and derives **planks** |
| Suggester prompt | Hardcodes main (S1) → supporting (S2) (`cause-assist/src/statementSuggester.ts:15`) | Direction depends on shape; plank-authoring has no main statement at all |
| Implication gating | Blocks medium/high non-implies against the main statement | Nothing to gate against until an anchor is promoted |

The direction hardcoded in the suggester is sound for a conjunctive manifesto and
**unsound for the other two shapes** — see
[§ How this relates](#how-this-relates-to-what-causestarter-does-today). Because
the wizard asks for the main statement first, the founder is committed to a shape
before anything has told him shapes exist.

### The service surface this model needs

Three capabilities, none of which exist. They are additions to cause-assist, and
under [§ This is the mediator's job](#this-is-the-mediators-job-again) they should
be built as strategy configuration on the bridge-creator engine rather than as
parallel implementations.

**1. Atomize.** Rough description in — "I want to start a conservatism cause" —
candidate **planks** out, each already at the quality bar in
`cause-assist/src/statementGuidance.ts`: specific, self-contained, signable. This
is the one the founder cannot do himself and the one that unblocks everything
else. It is *coalition unbundling* from
[hidden-majority-patterns.md](/docs/end-user/common-sense-majority/hidden-majority-patterns.md)
pointed at a bundle label the founder supplied rather than one found in the wild.

**2. Sharpen a plank.** Existing wording in, better wording out, against the
mediator's two-sided bar: crisp enough that the implication attester will draw
arrows, natural enough that a real supporter would sign it. The relevant
techniques — *defer the details*, *expressing reservations* — are already in the
pattern catalog. **Hedge, don't blur**
([§ Hedge, don't blur](#hedge-dont-blur)) is the rule this must enforce, because
the failure it prevents is silent: a vague plank collects no arrows and nothing
tells the founder why.

**3. Draft an anchor from planks.** Only at promotion time, and only *after* the
planks exist — the reverse of today's ordering. It must enumerate its disjuncts
verbatim (see [§ Resolved](#a-promoted-disjunctive-anchor-must-keep-its-list-visible)),
and the existing `/check-implications` verifies the plank→anchor arrows before the
anchor is published.

### What the UI does with them

The founder never sees the word "conjunctive." He types a rough description, gets
candidate planks back, edits and accepts them — and then the wizard shows him a
**live preview of his own cause page** with the two views togglable. That preview
is the teaching mechanism: he learns what the shapes buy him by watching his own
numbers move, not by reading a taxonomy. Promotion to an anchor is a later,
optional action taken once a combination has proven itself
([§ Promotion](#promotion)), not a decision extracted from him on day one.

Where he still needs telling, tell him at the point of consequence, not up front:
a plank too vague to attest should say so *when he writes it*, and a promoted
anchor that would overstate what its signers agreed to should say so *at
promotion*.

**Confidence:** the reasoning here is sound and disposes of a real unsoundness,
but "list your issues" is itself an untested claim about what a founder finds
natural — someone arriving with "conservatism" in his head may find it just as
alien as the shapes were. Treat this as the leading candidate and watch a real
founder before hardening it.

### This is the mediator's job, again

Cause-assist and the [bridge-creator mediator](/specs/product/bridge-creator.md)
are threading an identical needle. The mediator's stated job is to modify a
statement so that (a) the implication attester will bless the arrow and (b)
someone on that side would still sign it, with failure defined in both directions.
That is exactly the plank-authoring problem: crisp enough to attest, natural
enough to sign.

The overlap is concrete, not just structural. In
[hidden-majority-patterns.md](/docs/end-user/common-sense-majority/hidden-majority-patterns.md):

- **Coalition unbundling** is the cause-founder's problem described from the other
  side. Its examples are bundle labels — "I'm pro-life," "I'm an
  environmentalist" — and its mechanism is *atomize → reaffirm → re-aggregate*,
  which is planks → views → anchors arrived at independently. It even names the
  same hazard: a bundle's popularity overstates support for each component.
- **Defer the details** and **expressing reservations** are techniques for keeping
  a statement signable while staying crisp enough to attest — directly applicable
  to plank wording.
- **Conditional / bilateral assurance** ("I'll accept Y as long as you're
  accepting X") is an anchor shape we hadn't considered, and a plausible one for a
  cause with an internal fault line.

So cause-assist should be a strategy configuration on the bridge-creator engine
rather than a parallel implementation. The seam already exists and is already
specified in
[bridge-building-for-founders.md](/specs/product/bridge-building-for-founders.md):
we ship the engine, the founder writes the strategy prompt.

**But the intents are opposite and must stay separate.** The mediator
de-polarizes across a fault line; a cause founder is mobilizing a side and does
not want to be bridged to his opponents. Share the engine and the pattern
catalog; never share a strategy prompt. That's the same line the bridge-building
spec draws: "if we end up authoring bridge policy for other people's causes, we've
built the wrong thing."

## How this relates to what CauseStarter does today

The wizard is main-statement-first: the founder writes a goal, and cause-assist
suggests supporting statements gated on **main → supporting** (the suggester
requires suggestions to pass "main (S1) → supporting (S2)", roles
`subset | rephrase | generalization | clarification`).

That direction is sound for a conjunctive manifesto — "subset" is conjunction
elimination — but it's the wrong direction for planks under a disjunctive anchor,
and it's unsound if the main statement is hedged and broad, where it would hand
every soft supporter's name to a specific plank they never endorsed. Nothing
currently tells the founder which deal he's accepting.

Gaps, none of them implemented:

- Cause-assist assumes one direction; it needs to know which shape is being built.
- A disjunctive anchor must name its planks, so it has to be generated *after*
  them — the reverse of the current goal-first ordering.
- There is no notion of a view. The site currently renders one statement's
  aggregates, not set operations over several.

## Resolved, 2026-08-09

These were open questions; this is where they landed. Each is a decision, not a
measurement — the measurements they imply are queued in [TODO.md](/TODO.md).

### Indirect support maps onto the bands, it doesn't cross them

The worry was that *(direct | indirect)* × *(strict | no-disagreement)* is four
numbers nobody will read. It isn't four, because the two axes aren't independent
and there's a natural assignment:

- **Band 1 ("signed all five") counts direct support only.** Its entire claim to
  being the hard number is that these people literally signed each plank.
  Admitting indirect support weakens exactly what band 1 is for.
- **Band 2 ("signed some, disagreed with none") counts direct ∪ indirect.** Band 2
  is already an inference — it estimates whole-heartedness from silence. Indirect
  support is the same kind of move (inferring a belief from an implying belief),
  so it belongs here and concedes nothing band 2 hasn't conceded already.

Two numbers, one gloss each, and the direct/indirect distinction becomes the
*reason the bands differ* rather than a second axis crossing them.

This also settles where the transparency rule binds: **at the plank**, in the
per-plank strip, where it already reads honestly ("17 signed this; 118 signed five
other statements that imply this"). Views are derived display and inherit
legibility from the planks beneath them; they don't re-derive a parallel
disclosure. If a fuller breakdown is wanted, it goes in the expansion — "of the
1,840, 1,190 signed at least one plank directly" — never the headline.

**Implementation trap:** the direct and indirect sets are **not disjoint**.
`getIndirectSupportTieredHeadCount` unions them
(`sdk/src/subsystems/conceptspace/queries.ts:478`), and one account can be in
both — it signed the plank *and* signed something implying it. Any UI presenting
them as a split rather than a union double-counts unless it subtracts. This
applies to today's plank-level transparency wording too, not just to views.

### A promoted disjunctive anchor must keep its list visible

Plank → *enumerated* disjunction is disjunction introduction, as mechanically
crisp as the conjunction-elimination direction. The logic was never the risk; the
wording is. The arrow exists only while the anchor literally enumerates its
disjuncts. Phrase it as an identity claim — "I'm generally conservative" — and
it's the trap in [§ Three shapes](#disjunctive-or-hedgedbroad): the attester
should refuse, and the anchor silently collects nothing.

So this is a product constraint, not just an attester note: **a promoted
disjunctive anchor cannot be phrased as a slogan.** A founder will instinctively
want the headline to read as one. It can't. (Still worth testing against the real
prompt — expect ambiguity refusals, not logical ones.)

### Three shapes is too much theory — so the founder never sees them

The wizard should not say "conjunctive." It asks for **issues** — the planks,
which is what he needs first anyway since the anchor is optional — and then shows
a live preview of his own cause page with the two views togglable. He picks by
looking at his own numbers, which teaches better than any explanation, and
[§ Promotion](#promotion) arrives naturally instead of as a separate feature.

The payoff is that the main→supporting gating problem in
[§ How this relates](#how-this-relates-to-what-causestarter-does-today)
**disappears rather than needing a fix**: with no main statement at wizard time
there is no arrow to gate and no unsound direction to pick. cause-assist's job
becomes wording each plank to be attestable *and* signable — precisely the
mediator's needle, landing where [§ This is the mediator's job](#this-is-the-mediators-job-again)
already argues it should. It also satisfies the ordering constraint for free: a
disjunctive anchor names its planks, so it must be generated after them.

### Scale: the fold is fine, the transport isn't

The set algebra was never the risk — union and intersection over 10⁵ anonymized
IDs is milliseconds. What breaks is the event fetching underneath.
`computeIndirectSupport` (`sdk/src/subsystems/conceptspace/queries.ts:330`)
fetches `DirectSupport` events per statement under a hard `limit: 10000`, then
fans out one fetch *per implying statement* plus a `fetchStatementDocument`
retraction check per implying CID. A five-plank view multiplies that whole
fan-out by five. So the ceiling bites at **10⁴, not 10⁵**, and it bites
*silently*: a truncated fold returns a plausible-looking wrong number.

Cost also scales with the implication graph rather than the signer count, so a
heavily-attested plank is expensive before it is popular.

The remedy, if measurement confirms it, is an indexer-side aggregate returning
folded believer-ID sets per statement. The client-side set algebra survives
either way — nothing above depends on where the sets come from.

**Sketches, if that aggregate is ever built.** Probabilistic sketches
(HyperLogLog, Bloom) would let such an aggregate ship fixed-size per-plank blobs
instead of full ID sets. Worth remembering, with one constraint that decides
where they may be used: HyperLogLog unions cleanly but intersects only via
inclusion–exclusion, whose error compounds across terms until a five-plank
intersection is noise; Bloom filters intersect approximately but admit false
positives. **Band 1 must therefore stay exact** — its whole claim to being the
hard number is that these people literally signed each plank, and an estimated
hard number is not one. The union view and band 2 are already inferences and
tolerate approximation. This is a transport optimization for later, not a
change to the model.

### Caveat: "views are free" is a claim about the chain, not about cost

What [§ Planks, views, anchors](#planks-views-anchors) establishes is that a view
needs no published statement, no attestation, and nothing on chain. That is not
the same as free. Views are not free at the *read* layer, and pointers-only
already made RPC load-bearing for reads. If the answer to the scale question is a
server-side aggregate, then views quietly add to a founder's infrastructure
burden — the exact thing
[what-a-founder-needs.md § 3.3](/docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb)
is trying to shrink. Don't let the two claims slide into each other.

## Open questions

None of the design questions above remain open. What's left is queued work:
measuring the client-side fold at ~10⁵ signers, testing plank→disjunctive-anchor
arrows against the real attester prompt, and building the plank-first service and
wizard. All four are in [TODO.md](/TODO.md).

One caveat on earmarking, since this doc's [§ Align low, aggregate
high](#align-low-aggregate-high) describes earmarking to planks: **NoteIntent is
currently dormant in the product UI.** Its permissionless attestation semantics
and inheritance through note splitting, purchasing, and refunds remain unresolved.
The contract, historical events, SDK APIs, and indexer support remain available
for possible reconsideration, but founders and donors cannot currently set or view
note intent and cause pages do not show earmarked-funds totals or note lists.

*Note that the views model mostly routes around this bug anyway*: a view queries
each plank exactly and unions client-side, which is what the exact-match primitive
already does well. The bug bites published anchors, not views.

## See also

- [Concept Space](/specs/tech/subsystems/conceptspace/README.md) — statements,
  implication attestations, direct vs. indirect support
- [Aligning](/specs/tech/subsystems/aligning/README.md) — cause boards, alignment
  attestations, NoteIntent earmarking
- [hidden-majority-patterns.md](/docs/end-user/common-sense-majority/hidden-majority-patterns.md)
  — the pattern catalog cause-assist should share with the mediator
- [bridge-building-for-founders.md](/specs/product/bridge-building-for-founders.md)
  — the engine/strategy seam
- [cause-taxonomy.md](/specs/product/cause-taxonomy.md) — populating an empty cause
  board once the statements exist
- [standing up a vertical](/docs/founder/standing-up-a-vertical.md)
