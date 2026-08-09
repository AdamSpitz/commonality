# Shaping your cause's statements

**Status: progress, not a conclusion.** This is a working pass at how a cause is
built out of statements. The mechanics it describes (implication direction, how
support and cause boards aggregate) are accurate to the system as specified; the
architecture it proposes — **planks, views, and anchors** — is a proposal under
active discussion, and parts of it are unbuilt. See the open questions at the end
before treating any of it as settled.

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
He should not have to learn it. The service should understand the shapes; the UI
should offer **concrete alternative drafts of his own cause**, each with a
one-line note on what it buys him — he picks by reading, not by learning a theory:

- *"I'm a conservative and I agree with all of: […]"* — lets committed supporters
  sign once and be counted on every issue; won't attract many signers by itself.
- *"I support at least one of: […]"* — this is what totals up all the issues on
  your cause page; broad but shallow.
- *"[single issue]"* — simple, and picks up support from anyone who agrees,
  including people who'd never call themselves conservative.

Plus, in every case, the atomized planks — because under the planks/views/anchors
model the planks are what he actually needs first, and the anchor is optional.

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

## Open questions

- **Does the views model hold up at scale?** Union and intersection over signer
  sets means folding `DirectSupport` events per plank client-side. Fine now,
  possibly not at 10⁵ signers. Unmeasured.
- **How does indirect support compose into a view?** The union of
  *(direct + indirect)* sets is well-defined, but the transparency rule requires
  keeping the two legible separately, and it isn't obvious what that means for an
  *intersection* view — which now has two bands of its own, so the naive
  cross-product is four numbers and nobody will read that. Needs a design pass,
  not just a decision.
- **Will the attester actually produce plank→disjunctive-anchor arrows?** The
  claim that they're "crisp" is a logical argument, not an observed result. Should
  be tested against the real implication-attester prompt before tooling commits to
  it. (Only bites promoted anchors; views don't need arrows.)
- **NoteIntent earmarks don't roll up reliably.** Checked 2026-08-09.
  `getNoteIntentAttestationsByStatement`
  (`sdk/src/subsystems/delegation/queries.ts:245`) is exact-match on
  `intendedStatementId` — no implication traversal.
  `getTotalFundingForCause` (`sdk/src/subsystems/fundingportals/queries.ts:786-801`)
  does expand the CID set, but sources it from `getIndirectlyAlignedSubjects`,
  which emits one entry *per alignment* — so a plank with earmarked money but **no
  aligned projects yet** never enters the set and its funds are invisible to the
  cause total. Meanwhile the cause board's own "Earmarked funds" panel
  (`DelegatableNotesSection`, via `CauseBoard.tsx:357`) and
  `AvailableDelegatableFunding` call the exact-match primitive directly, so they
  don't roll up at all and can disagree with the aggregate beside them. The
  exact-match path also applies no attester-trust filtering while the expanding
  path does. Worth fixing on its own terms. *Note that the views model mostly
  routes around this*: a view queries each plank exactly and unions client-side,
  which is what the exact-match primitive already does well. The bug bites
  published anchors, not views.
- **Is three shapes too much theory for a real founder**, even hidden behind
  concrete drafts? The wizard may need to just pick for him and explain later.

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
