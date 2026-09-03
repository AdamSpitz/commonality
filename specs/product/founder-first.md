# Founder-first: the vertical-founder pivot

The decision itself is frozen in [ADR 0005](/specs/decisions/0005-founder-first-verticals.md).
This file is the living companion: what the posture means in practice, which docs carry
which piece of it, and the consolidated backlog of work it implies.

## The decision in one paragraph

Commonality's customer is the **vertical founder**, not the end user. We build substrate
and reference software; a founder stands up a vertical (positioning + audience + a
selection of substrate + their own front door with their own policies) and owns
distribution and moderation for it. We run Civility and CSM ourselves as *reference*
verticals whose job is to recruit other founders. The motivation is both legal (stop
being the universal operator to whom every conduct element attaches) and product
(distribution is inherently vertical-specific, so there is no umbrella growth motion).

**Triage rule for all platform work:**

| Kind of work | Verdict |
| --- | --- |
| Generic end-user growth for the "Commonality" umbrella | Not our job |
| Making a vertical founder's job easier | Core job |
| Making Civility/CSM exemplary *as reference verticals* | Core job |

## Where the pieces live

| Piece | Doc |
| --- | --- |
| The frozen decision, alternatives, revisit triggers | [ADR 0005](/specs/decisions/0005-founder-first-verticals.md) |
| Role/strategy statement for internal devs | [workflow/roles/founder.md](/workflow/roles/founder.md) |
| What a founder needs: decisions, artifacts, accounts, obligations | [docs/founder/what-a-founder-needs.md](/docs/founder/what-a-founder-needs.md) |
| "Now actually build one" guide for a founder | [docs/founder/standing-up-a-vertical.md](/docs/founder/standing-up-a-vertical.md) |
| How a founder activates the cause after reaching its existing community | [docs/founder/activating-a-cause.md](/docs/founder/activating-a-cause.md) |
| How a founder fills an empty cause board | [cause-taxonomy.md](./cause-taxonomy.md) |
| What a cause is made of: planks, views, anchors; what cause-assist should suggest | [shaping-your-cause-statements.md](/docs/founder/shaping-your-cause-statements.md) |
| Recruiting collateral / worked pitches | [christian-pitch.md](/docs/founder/christian-pitch.md), [docs/founder/csm/](/docs/founder/csm/) |
| What we market and to whom | [marketing.md](./marketing.md) |
| Which UIs we operate vs. publish | [ui-operator-posture.md](./ui-operator-posture.md) |
| Why the operator/protocol split matters legally | [legal/operator-posture.md](./legal/operator-posture.md) |
| Technical shape of a vertical (`DomainManifest`) | [ui-domains.md](./ui-domains.md), [tech/ui-domains.md](/specs/tech/ui-domains.md) |

## Backlog

Consolidated here so the pivot has one checklist. Items also tracked in
[TODO.md](/TODO.md) (LLM-doable) or [inbox.md](/inbox.md) (needs Adam) stay there as the
authoritative copy; this list is the map.

### Recruiting funnel

- [ ] Build the founder-recruiting funnel: where do prospective founders hear about
      Commonality, and what do they land on? [standing-up-a-vertical](/docs/founder/standing-up-a-vertical.md)
      covers setup and [activating-a-cause](/docs/founder/activating-a-cause.md) covers
      recruiting the cause's participants; the discovery and landing path remains
      unspecified. (from [marketing.md](./marketing.md))
- [ ] Improve the [Christian pitch](/docs/founder/christian-pitch.md) and write more
      pitches along those lines for other audiences. *(Adam — [inbox.md](/inbox.md))*
- [ ] Have an AI generate a batch of imaginary founders and causes, as a breadth check on
      whether the pitch and the substrate generalize. *(from [inbox.md](/inbox.md))*
- [ ] Pitch orgs with large do-gooder user bases (Red Cross et al.) as *prospective
      founders of their own vertical*, never as "come use Commonality."
      (from [marketing.md](./marketing.md))
- [ ] Resolve the naming question: new site, or rename Commonality to something like
      "CauseStarter"? The umbrella brand currently names the substrate, not the founder
      product. *(Adam — [inbox.md](/inbox.md))*
- [ ] Separate, copy-only: do not over-weight the organizer roster as “a cause”
      you join; two-step noun change in [cause-page-not-a-club.md](./cause-page-not-a-club.md).
      Does not settle the umbrella-vs-CauseStarter brand question.

### Make the founder's job easier (platform work)

- [x] Remove indexer operations from the normal founder launch path. The adopted
      [shared pointer-only feed](/specs/tech/indexer/shared-feed-topology.md) lets a founder
      ship static scope/policy configuration; independent
      [operator-scoped deployments](/specs/tech/indexer/operator-scoped-deployments.md)
      are an optional independence path. See [ADR 0006](/specs/decisions/0006-shared-pointer-index.md).
- [ ] Policy lists: let each operator declare and enforce their own content policy, so
      "this vertical excludes X" is the operator's editorial choice rather than a
      protocol-level takedown. See [policy-lists/](/specs/tech/subsystems/policy-lists/README.md).
- [ ] Decide how much of a founder's remaining infrastructure we absorb, if any. A founder does
      not normally need an indexer, but still needs hosting/pinning, RPC, a bundler, a wallet provider and a funded wallet — all
      due at launch, before he knows the vertical works. Absorbing them (we already serve
      our domains off [`cloudflare-ui-gateway`](/cloudflare-ui-gateway/README.md)) is easy
      but re-centralizes what this pivot decentralized. **Adam is uneasy about that and
      wants to reduce the need rather than absorb it.** Any answer must keep
      general-purpose substrate sites (Tally, LazyGiving, Aligning…) visibly separate from
      specific-cause sites (Civility, CSM, other people's causes), where operator identity
      is the point. Open question and the directions to explore:
      [what-a-founder-needs.md § 3.3](/docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb).
      *(Adam)*
- [ ] Confirm a founder can actually fork and stand up a vertical end-to-end, from the
      guide alone, without us in the loop. The simulated-cause-founder idea in
      [inbox.md](/inbox.md) is the cheap version of this test.
- [ ] Make alternate UIs / alternate AI services demonstrably easy to run — the claim that
      services aren't hard-coded needs to be a fact on the ground, not an affordance,
      both for founders and for the legal posture. *(from [inbox.md](/inbox.md))*
- [ ] Extract Civility (then CSM) from the monorepo once the substrate API stabilizes, so
      the reference verticals are built the way an external founder would build one.
      Trigger is API stability, not a date — see [tech/ui-domains.md](/specs/tech/ui-domains.md).

### Keep the reference verticals exemplary

- [ ] Vertical GTM for Civility and CSM specifically (elevator pitch, memes, video/podcast
      generation, alpha testers) — scoped to the verticals, never the umbrella.
      (from [marketing.md](./marketing.md))
- [ ] Seed at least one non-political, local-public-goods cause in the demo data, so the
      substrate can be *seen* serving a vertical unlike ours. *(from [inbox.md](/inbox.md))*

### Explicitly not doing

- Generic end-user acquisition for Conceptspace, Tally, LazyGiving, Aligning, or Content
  Funding. They stay usable and documented; they don't get a growth motion.
- Operating a universal browser of all projects on any domain we run.

---

*Frozen rationale: [ADR 0005](/specs/decisions/0005-founder-first-verticals.md).*
