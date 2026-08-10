# 0008. Operated cause surfaces are lenses: render on demand, rank nothing

- **Status:** Accepted
- **Date:** 2026-08-10
- **Related specs:** [`specs/product/ui-operator-posture.md`](../product/ui-operator-posture.md), [`specs/product/legal/statement-hosting.md`](../product/legal/statement-hosting.md), [`specs/tech/subsystems/policy-lists/README.md`](../tech/subsystems/policy-lists/README.md), [`docs/founder/shaping-your-cause-statements.md`](/docs/founder/shaping-your-cause-statements.md)

## Context

[ADR 0005](./0005-founder-first-verticals.md) moved us off operating generic sites, on the
grounds that the untenable thing was "being *the* platform for everything, **with no
editorial principle to point at when we decline something**." CauseStarter then grew into
a Commonality-operated surface anyway, because founder-run cause sites have a problem
0005 did not anticipate:

**A founder-run cause site is unauditable by its own visitors.** The cause page is the
founder's editorial artifact — he chooses which planks appear and may change them at any
time, which is his right. But signatures attach to individual statement CIDs, not to the
page. So a visitor sees a supporter count over a roster that (a) he cannot verify was
computed honestly, and (b) may not be the roster anyone actually signed. A dishonest
founder site and an honest one look identical.

That argued for an operated surface people could trust. But re-entering the generic
neutral-marketplace role is precisely what 0005 rejected, so the question was whether the
two could be separated. Working it through, they can: the exposure 0005 identified comes
from **universal admission** — being the surface where everything is listed and therefore
where every demand about anything lands — not from being generic in subject matter. Those
arrived together in the original eight-sites design and were never pulled apart.

An earlier draft of this decision proposed a listing standard with published admission
criteria. That apparatus turned out to exist only to gate *discovery*; removing discovery
removed the need for it.

## Decision

**Operate a generic cause surface, and make it a lens rather than a directory.**

1. **No discovery we author.** No search, no browse, no ranking, no featured causes, no
   leaderboards. A cause is reached at its own URL, via a link its founder circulates.
   We drive no traffic and select no winners. Substrate-derived adjacency (the implication
   graph, shared planks, statement boards) remains, because its authors are named on-chain
   and viewer trust in them is configurable — it is the graph's judgment, not ours.

2. **No admission criteria.** Nothing is reviewed before it renders. There is no queue, no
   rejection, and no appeals process for listing, because there is no listing.

3. **The trust claim is recomputability, not endorsement.** What an operated surface offers
   is that its numbers are correct and checkable: every count exposes its inputs (roster
   CIDs, attester set, block height) and can be independently recomputed from chain data.
   It never offers "the causes here are good."

4. **Coherence is a badge, not a gate.** An attester may assert that a roster matches its
   own summary and contains no riders. It binds to a hash over `(summary, sorted plank
   CIDs)`, so editing the roster drops the badge until re-attested. It is positive-only
   (silence, never a published negative judgment), and it is narrow: a claim about
   *construction*, not about merit. **A coherent cause we find repellent earns the badge** —
   this is accepted deliberately, because a badge withholdable on grounds of distaste is an
   endorsement, and an endorsement would require the admission machinery back.

5. **Policy-list suppression remains mandatory, and this decision does not weaken it.**
   The lens posture addresses curation and promotion exposure. It does nothing for
   distribution exposure: rendering an arbitrary CID on demand is a display act regardless
   of how the visitor arrived, and `statement-hosting.md` already names *shareable links*
   as one such arrival. Post-notice, "we don't curate" is not a defense — distributor
   liability attaches on notice. Suppression must cover **aggregation as well as
   rendering**: a suppressed statement drops out of believer sets and therefore out of
   union and conjunction counts, or we are still publishing it with extra steps.

## Alternatives considered

- **A listing standard with published admission criteria** (worked out in detail before
  being dropped). Coherent, and it survives if discovery is ever reintroduced. Rejected
  because with nothing ranked there is nothing to gate: it bought only a rejection surface
  to defend, an appeals process to staff, and a clearer identification of us as curator —
  the exact exposure 0005 was shedding.

- **Leave cause sites entirely to founders; operate nothing.** Rejected: this is the
  problem that prompted the decision. Visitors cannot distinguish an honest founder site
  from a dishonest one, and the substrate's value proposition depends on the counts meaning
  something.

- **Keep a discovery surface but order it "neutrally"** (chronological, or by supporter
  count). Rejected: every ordering is an editorial act, and supporter-count ordering is
  actively harmful here — it rewards bundling a rider onto a popular plank, which is the
  coalition-unbundling hazard the plank model exists to expose.

- **Render everything unconditionally; rely on the lens framing instead of a blocklist.**
  Rejected, and worth stating explicitly because the framing invites it. Being a neutral
  lens improves the *pre-notice* story and leaves the *post-notice* duty untouched. It also
  does nothing for sanctions exposure, which concerns whom we serve rather than what we
  rank. Even the paradigm neutral chain lens (Etherscan) maintains phishing labels and
  suppresses reported scam tokens.

## Consequences

- **We promote nothing**, so amplification, in-kind-support, and endorsement exposure
  largely vanish — the largest concrete win, and the one that made the generic surface
  affordable again.
- **The soft lever is gone.** Previously there was a gradient (feature / list / list
  quietly / decline to list). Now there are two states, render and suppress, and every
  decision the blocklist makes is maximally blunt. This is the accepted cost of removing
  editorial discovery.
- **The blocklist becomes load-bearing rather than one tool among several.** Marginal cost
  is low — Civility and CSM require the same reporting address, on-call rotation, appeals
  process, and keeper relationships — but the worst available configuration would be an
  operated surface with no compliance lever, and this decision forecloses it.
- **The badge requires a signed, versioned roster to exist first.** Cause rosters are
  currently `localStorage` with no version and no signature, so there is nothing for an
  attestation to bind to. That work is a prerequisite, not a follow-up.
- **This does not address 0005's product prong.** There is still no umbrella-level growth
  motion and this decision does not create one. The operated surface's job is to be
  credibility infrastructure that makes founder-run sites viable, which lands under 0005's
  "making a founder's job easier → core job."
- **Resolves the open question in [policy-lists](../tech/subsystems/policy-lists/README.md)**
  — "does admission allowlisting come before the registry?" — with **no**. No admission
  profile is needed, so the registry keeps its place in the queue and the block evaluator
  is not asked to carry inverted failure semantics.
- **Revisit if:** a second independent operator runs the lens (which converts
  replaceability from affordance to fact, and weakens the case for us operating one at
  all); notice volume exceeds what one operator can handle; the badge is observed being
  used to launder a cause's reputation; or a real founder demonstrates that launching
  requires discovery we would have to author.

Living specs: [UI operator posture](/specs/product/ui-operator-posture.md) and
[statement hosting](/specs/product/legal/statement-hosting.md).
