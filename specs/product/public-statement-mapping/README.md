# Prompt #1

I want to talk through an idea for a new feature/service to add to the system.

The high-level idea is something like: use people's publically-expressed views (e.g. social-media posts) to build a map of *inferred* beliefs.

That is:
  - We'd create an AI service that looks at social-media posts and creates statements that the AI thinks accurately represent his view on a particular topic.
  - We'd show this in the UI honestly: certainly not "this person signed this statement" or even "this person believes this statement", but "based on these seven posts [include links], our AI service [include link to source code and prompt] thinks he'd probably agree with this statement." The UI already has a notion of separate tallies for direct-signers and indirect-signers (following the implication arrows, which are a very-conservative notion of "we think he probably believes S1, because he signed S2"); this is a third, much-less-conservative category ("we think he probably believes S1, because he wrote these posts on X").

Other details:
  - We can provide an easy way for the person to say "nope, I don't agree" and/or "here's a more accurate statement of what I actually believe." (We can even do this without requiring him to create an Ethereum account or post on Commonality; e.g. post on your X channel, maybe include this hash or something, and we'll pick it up and correct our map.)
  - This service wouldn't be meant to be a gigantic up-to-date map of everybody's statements on every topic. Think of it more like our "beat agents": focused on a particular topic, and there's no need for it to include everybody, and there's no need for it to work in real-time. (Actually, how similar is this idea to our existing beat agents? Should we be reworking the beat agents to be this, or to help with this?) We'd probably set it up to digest high-profile influencers first, and it can ignore high-profile people who aren't relevant to its assigned topic (e.g. no need to track what some super-popular soccer player thinks about US politics). If someone wants it to cover a particular person (or more-narrowly a particular post by a particular person), they can ask the service to do that (maybe for a small fee to prevent spam, just like our other services).
  - This fits well with our notion of "suggesters" (though we may need to generalize it). In a sense, this info in the form of "the owner of channel C might believe statement S, based on content item I" is similar to the kind of suggestion that we already have ("user U might believe statement S, based on his signing statement S2"). We can use our beneficiary-ID system as our way of identifying the person the suggestion is meant for; we can generalize our notion of "why this is being suggested" to include pointers to social-media posts. And the need for a way to let the person say "nope, I don't believe that" applies just as much to our normal suggestions as to this new kind of suggestion. (We may already have that feature, I forget.)
  
The point is:
  - This is a way of pre-populating our landscape of beliefs, to try to bypass some of the pain of bootstrapping our system from the ground up. We already had the idea that we could pre-populate the system with *statements* (by following the public conversation and having AI services that create statements along those lines); this lets us also pre-populate the system with *inferred beliefs*, and attach numbers (like X follower counts - which is of course different from statement-signer counts and of course the X follower counts can't be added together and so on) to try to convey a sense of which statements are likely to have high-profile support. (Again, we'd be very careful to be honest about what exactly is being presented here. I don't want to lie about any of this; I'm just trying to "prime the pump", to present people with an already-fleshed-out map rather than a blank page.)
  - And people might find it interesting to ask the service to process their own social-media channel, or some other channel they like. "Where do you think I fit into this landscape?" And again, that gives them a starting point, rather than needing to navigate through the space of statements on their own.
  - This also gives our other services like the bridge-creator/mediator some real substance to work with: "here are some views that we plausibly think are really believed by high-profile influencers (and hence probably by a bunch of their followers); if your goal is to find common ground between various popular positions, try working with these as your starting points."

One worry is that putting words in people's mouths is risky - hopefully not legally risky as long as we're honest about it, but even apart from the legal angle there's also just the fact that this'll piss people off if we say we think they believe S but they don't (or they don't want to admit it). Maybe we can somehow present this in a way that minimizes that risk.

Anyway... that's the general idea. Get acquainted with Commonality in general and with what other features/services we've got along these lines, then think through this idea, think about what makes sense and what doesn't make sense, and then give me a proposal for a version of this idea that you think would be good.


# Opus's response to prompt #1: Proposal: "On the record," a map of positions people have expressed in public

## Summary

The idea is good, and most of the parts it needs already exist. I'd make one change to the core claim, and that change makes most of the risk go away:

> **Make claims about posts, not about minds.** Don't say "we think @alice probably believes S." Say "these 3 posts by @alice express roughly S" and link the posts.

Anyone can check "this post says roughly S" by clicking the link. "This person believes S" is a guess about what's in someone's head. That guess is where the anger, the defamation risk and the privacy-law risk come from. The bootstrapping value is nearly the same either way, because what you need is "this position is live in public discourse, and these prominent voices hold it." You don't need a guess about each person's private beliefs.

## What already exists, and how this maps onto it

| Your idea                                     | What's already in the repo                                                                                                                                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Follow a topic, ignore off-topic celebrities  | **beat-memory** (`services/beat-memory`) already ingests a beat (it has a `twitterAdapter`), keeps observations with citations, and abstains when a post is off-beat. Telling sarcasm from sincerity is the reason beat agents exist, and you need exactly that here. |
| "This content matches statement S"            | **content-attester** and the beat-aware attester already judge content against a statement. Today the question is "is this post aligned with or civil toward S?" The new question, "does this post express S?", is a sibling prompt on `attester-core`.               |
| Identify the person with a beneficiary ID     | `beneficiaryId = keccak(namespace, canonicalId)` already means "a public identity who hasn't joined yet."                                                                                                                                                             |
| "Post a hash on X and we'll pick it up"       | That's already how **BeneficiaryIdentity** proves a channel works (tweet proof). Corrections and opt-outs can reuse it as-is.                                                                                                                                         |
| Suggestions plus "nope, I don't believe that" | Nudges and nudge dismissal exist, but nudges are keyed by **statement** ("signers of S1 might sign S2"), not by **person**. You'd need a new publication kind keyed by `beneficiaryId`. Separately, conceptspace already lets a user explicitly mark disbelief.       |
| "Here's what that camp believes"              | The **stand-in cause** (`docs/founder/the-other-cause.md`) is a mediator-authored roster of "what I think that camp believes," labeled loudly as such. This service can fill the missing-parent case with real cited evidence.                                        |
| Principles you've already agreed to           | `cooperation-without-trust.md` says "An inferred supporter is not a confirmed participant." `durable-participation.md` says group membership should be "self-described or based on disclosed signed statements, not silently assigned political identities."          |

**Should beat agents be reworked into this?** No. The beat-agent spec already has the right extension point. Add a memory purpose, `expressed_positions` (who said what, with citations and dates), and add a consumer that extracts positions and publishes them. The beat agents stay as they are and feed this.

## What I'd push back on

1. **A third tally next to signers and indirect supporters.** Even with honest labels, a statement header reading "12 signers · 40 indirect · 48M followers" gets screenshotted, and the 48M swamps everything. Follower counts measure audience, not agreement. They include hate-followers, and "probably believed by their followers" is exactly the inference we shouldn't display. I'd put this in a separate panel, "In public discourse," listing the accounts and linking their posts. Showing each account's reach is fine, but never a sum, and nothing in the tally header.
2. **The word "believes."** Use "has publicly said" or "expressed," always with a date. People change their minds, and a 2019 post isn't a 2026 belief.
3. **No propagation through implication arrows.** "Alice expressed S2, and S2 implies S1" should not make Alice show up on S1. That stacks one inference on another.
4. **On-chain or permanent storage.** ADR 0004 pushes user-authored data on-chain, but this is the opposite case. Here *we* are the speaker making claims about third parties, and we need to be able to truly delete them. I'd use signed JSON served from the service, with no `NudgePublications` anchoring and no permanently pinned CIDs. The signature gives verifiability without permanence.
5. **Third parties requesting coverage of small accounts.** "Map my coworker's politics" is a profiling service. Third-party requests should only cover accounts above a notability threshold. Anyone can request their *own* account after proving control.

## Legal and policy concerns

- **Canada has no Section 230 equivalent** (your own `content-and-speech.md` notes this). AI-generated claims about named people make us, or whoever runs the service, the speaker, not a host. "This post says roughly S, here's the link" is much safer than "Alice believes S."
- **GDPR Article 9.** Inferred political opinions about identifiable people are special-category data. "Manifestly made public by the data subject" probably covers public posts by public figures, but it's weaker for inferences and for private individuals. This is one more reason to keep deletability.
- **X's developer terms.** I believe X's developer policy prohibits using its data to infer things like political affiliation or beliefs *about individual users*. Aggregate analysis is allowed. I haven't checked the current wording, so please verify it before building on it. If it's right, it strongly favors camp-level aggregates and self-service over a public per-person map built from X data. X API pricing is also a real cost.
- **ADR 0008 (operated surfaces rank nothing).** This should be a **provider** that people or verticals opt into, like nudger trust, not a default layer in Commonality's operated UI. CSM could trust it by default; the umbrella shouldn't.

## The version I'd build, in phases

**Phase 0: offline quality check (nothing public).**
- Run extraction on about 30 prominent accounts for one demo topic.
- Map each post to *existing* statements first, and only draft a new statement when nothing fits. Otherwise we'll flood the system with near-duplicates.
- Hand-grade precision: when it says "this post expresses S," would a fair reader agree?
- Feed the results into bridge-creator's context locally to see whether bridges get better.

Precision decides everything here. If it's mediocre, the later phases shouldn't ship.

**Phase 1: "Where do I fit?" for yourself (private, with consent).**
- You prove control of your account, or simply paste your own writing. In v0, pasting costs nothing in platform APIs and raises no consent issue.
- You get *private* suggestions, each with the posts behind it, and two buttons: **Sign** and **Not me**.
- Signing makes it a real direct signature. The inference turns into explicit agreement, which is the funnel you want.

This phase delivers the "not a blank page" benefit with almost none of the risk. I'd ship it first.

**Phase 2: camp-level context for mediators and bridge-creator.**
- Publish "positions commonly expressed by prominent voices in camp X," with citations, as beat-memory context and as draft stand-in rosters.
- Statements expressed by voices in *both* camps are bridge candidates. That's the most valuable signal for the mediator, and it never needs a per-person claim in public.

**Phase 3, optional and gated on Phase 0 precision: public per-person "On the record" panel.**
- Public figures above a threshold only, and only for clients that trust the provider.
- Each entry: account, statement, 1–5 linked posts with dates, and a link to the model, prompt and source code.
- Correction loop: the subject proves control through BeneficiaryIdentity. **Not me** deletes the entry; it doesn't just mark it as disputed. **Here's what I actually think** creates a self-expressed position, ideally converted into a signature.
- Also accept removal requests from the operator inbox and err toward removing. A wrong removal costs little; a wrong attribution costs a lot.

**Data shape for an entry**, as a new publication kind keyed by subject:

```
ExpressedPosition {
  subject: { beneficiaryId, namespace, handle }
  statementCid
  evidence: [{ contentId, url, postedAt, shortExcerpt }]
  fit: "close" | "gist"
  confidence, extractedAt, promptVersion, model
  status: active | withdrawn-by-subject | superseded
}
```

## Open questions for you

1. Is the reframing from "believes" to "expressed" acceptable, or do you specifically want the stronger claim?
2. Who operates the public Phase 3 version: Commonality, your separate org (the demo-thoughts doc notes you haven't named it yet), or a third party? Under ADR 0008 I'd lean toward the separate org.
3. Are you OK starting with Phases 0–1 and deciding on Phase 3 after seeing the precision numbers?

If you want, I can write this into the repo as `specs/product/expressed-positions.md`, linked from the beat-agent and nudger specs, with the phases filed in `TODO.md`.


# Astra's response to prompt #1 (hasn't read that thing from Opus)

I think this is worth pursuing. It gives Commonality something useful before many people participate: a map grounded in actual public discussion, plus an easier way for someone to arrive and say, “Yes, that describes me—except for this bit.”

**I’d build a topic-specific service that publishes evidence-backed interpretations of publicly expressed positions.** Those interpretations could populate a separate map layer, become suggestions for the people concerned, and supply starting material for mediators. The central design requirement is that the attribution remains visible throughout that journey: *this service’s interpretation of these sources*.

There is one concrete complication with your proposed starting point: **X’s current developer guidelines explicitly prohibit deriving or inferring identifiable users’ political beliefs**, among other sensitive categories. The political-influencer version appears to run directly into that restriction. Careful labeling—and potentially even the subject’s consent—shouldn’t be assumed to resolve it. I would keep the service independent of any platform and establish permitted sources before choosing the pilot. [X developer guidelines](https://docs.x.com/developer-guidelines#sensitive-data)

That changes the initial sourcing plan, but leaves a useful product to develop.

**The existing system is a fairly good foundation.** Here is where the pieces fit:

| Existing piece | Relationship to this idea |
|---|---|
| [`beat-memory`](../../../services/beat-memory/README.md) | Already owns topic following, ingestion, cited observations, and context retrieval. Reuse it. |
| [`beat-agent`](../../../services/beat-agent/README.md) | Now primarily the beat-aware content-attestation consumer. Keep its judgment separate from this new judgment. |
| [Nudger framework](../../tech/subsystems/nudger/README.md) | Useful publication, discovery, and suggestion infrastructure, but its existing semantics need extending. |
| [Platform API](../../../platform-api-service/README.md) | Already resolves stable channel/content IDs and verifies control through challenges. Useful building blocks for identity and corrections. |
| [Mediator-authored stand-in causes](../../../docs/founder/the-other-cause.md) | Already allow someone to represent a camp’s position under their own authorship. This service could make those representations more grounded and inspectable. |

The beat-memory split is particularly helpful: you don’t need to rework beat agents into belief mappers. Add another consumer of their shared context. The package documentation still describes the beat-aware service as scaffolding needing a realistic narrow rehearsal, so I would treat this as reusing infrastructure, not plugging into a proven production feed.

**The first distinction I’d make is between interpreting an expressed position and predicting an additional belief.**

These are different claims:

- “These posts appear to express support for permitting more housing near transit.”
- “Given those posts, this person would probably support abolishing all parking minimums.”

Both might generate useful suggestions. Only the first belongs in the initial public map. Otherwise, the service can drift from translating what someone said into constructing a political identity for them.

For publication, I would require the proposed statement to be a close interpretation of actual expression, preserving qualifications, jurisdiction, time, and conditions. One explicit statement can be stronger evidence than seven vague posts. Reposts, quoted opponents, sarcasm, and reporting someone else’s position need special handling.

That still leaves plenty of useful AI work: resolving context, extracting propositions from long discussions, consolidating repeated statements, and finding existing Commonality statements that faithfully match them.

**I would model each result as an attributable interpretation, with suggestions as one use of it.**

The basic record would contain:

- The service identity and the channel’s canonical beneficiary ID.
- The exact statement CID.
- Supporting content IDs, source links, dates, and relevant passages where permitted.
- Material qualifications and contradictory evidence found.
- The topic, observation period, and scope of the search.
- Versioned code, prompt, model, and methodology references.
- Status, revision history, and any verified response from the subject.

Your beneficiary-ID idea fits well, with a boundary: it identifies a channel or other external identity, not necessarily one human. An organizational account may have several authors; one person may control several channels. Start with channel attribution and only consolidate identities when there is an adequate verified association. Funding payout addresses must not serve as evidence of authorship.

The relationship to nudgers is subtle. An ordinary nudge says, “Consider signing this.” Once the recipient acts, the suggestion’s provenance can cease to matter. A public interpretation says something about someone *before they act*, and its provenance remains essential. So I’d reuse infrastructure while giving this a distinct publication type and explicit trust setting. Trusting a service’s suggestions should not automatically mean accepting its public characterizations of other people.

**The UI should make the interpretation legible without requiring people to open a disclaimer.**

For example, an illustrative statement card could show:

> **Allow more homes near transit**
>
> Signed directly: 12 · Supported through implications: 28  
> **AI interpretations of public posts: 4 channels**
>
> **Housing Map’s interpretation of @Example’s posts**  
> These posts appear to support this statement, with an exception for protected historic buildings.  
> 7 source posts · January–March 2026 · Not confirmed by the account  
> **Read evidence · Inspect methodology · Correct this interpretation**

The exception in that example might actually require a narrower statement. The UI should not compensate for an inaccurate match by burying the qualification underneath it.

I agree with having a third category, but would give it its own visual group and call its count something like **“channels with supporting interpretations.”** Avoid “inferred signers,” and never add it to a supporter total. Deduplicate multiple posts and multiple services interpreting the same channel; agreement between three models does not create three supporters.

Follower counts can appear beside individual channels, dated and explicitly described as audience size. They should not become statement-support estimates. Even without overlap, following someone gives little evidence of agreement with this particular position.

I would also describe coverage: “Selected accounts discussing housing policy; sources reviewed through March.” A deliberately curated sample can make the landscape interesting, but cannot establish how common a belief is.

**Corrections should be part of the first release, with several distinct meanings.**

The existing [`nudgeStore`](../../../ui/src/shared/nudges/nudgeStore.ts) stores dismissal locally in IndexedDB. Conceptspace also has explicit disagreement through [`disbelieveStatement`](../../../sdk/src/subsystems/conceptspace/actions.ts). Neither is the correction mechanism you describe.

I would offer these separate actions:

| Response | Effect |
|---|---|
| “Hide this suggestion” | Changes my suggestion experience; says nothing about my beliefs. |
| “This misrepresents my position” | Removes the interpretation from the active map and its count; records the verified objection. |
| “This used to describe me” | Marks the interpretation as historical. |
| “Here is a better statement” | Records the proposed replacement; explicit confirmation determines whether it is endorsed. |
| “Stop mapping this channel” | Suppresses the channel on participating services and stops further processing by this service. |

A wallet-free correction could use a short challenge binding the channel, exact interpretation version, response, nonce, and expiry. The owner publishes it through a supported channel; the verifier checks the canonical author and records the response. That is a new action-specific verification flow built from existing primitives, not a requirement to claim funds or create an Ethereum identity.

An affirmative response could be labeled **“confirmed through the source account.”** It should not silently become a Commonality signature; that would require an explicit extension of the signing model.

If someone denies an interpretation, I would accept that for the map even if the service thinks the sources support it. The purpose is to help people articulate and connect their positions. It does not benefit from turning into an argument about what they *really* believe. Rejected interpretations also need protection against resurfacing as slightly reworded suggestions.

Corrections should be free, and a credible misattribution report should be reviewable even without completing the ownership challenge.

**The service needs a disciplined evidence process, rather than just a good summarization prompt.**

A reasonable processing sequence is:

1. Resolve the source and author, and obtain relevant surrounding context.
2. Extract candidate positions, preserving qualifications.
3. Search for existing statements that match; create a statement when existing wording would distort the position.
4. Search the available source material for contradiction, retraction, and changes over time.
5. Review each proposed attribution against its cited evidence, then publish or abstain.

The fourth step matters especially for paid submissions. Someone can deliberately submit seven cherry-picked posts. Payment should purchase an evaluation, including a possible refusal or “insufficient evidence,” rather than a desired attribution.

Beat summaries can help locate evidence, but shouldn’t become the evidence themselves. Memory compaction must not turn “someone once summarized this account as supporting X” into a durable basis for attributing X.

I would initially show explanations and evidence strength rather than numerical probabilities. “83% likely to agree” suggests calibration we would not yet have. Silence, missing coverage, and abstention must also remain distinct from disagreement.

**The mediation use case is strong, provided uncertainty survives downstream.**

A mediator could receive:

> “These are three positions this service found expressed in the discussion, with sources, qualifications, and disputed interpretations.”

It can then draft stand-in causes or candidate bridges grounded in those positions. That is a substantive improvement over synthesizing compromises from generic descriptions of opposing camps.

But every later step must preserve what has and has not been established. Inferring that someone holds a starting position does not establish that they accept the mediator’s modified version or the resulting compromise. For the first release, I would not propagate these interpretations automatically through implication arrows at all. Later, derived interpretations could be displayed with their full paths while remaining in the inferred category.

Likewise, the service’s own statements must not return through beat ingestion as fresh evidence that real people believe them. Original sources and generated material need distinguishable provenance.

**I would keep named interpretations amendable and removable in our storage.**

Commonality’s publication machinery makes immutable publication attractive, but this is an awkward place to begin with permanent public records. A mistaken attribution can remain harmful after its current status changes.

For the pilot, I’d use service-signed, versioned records served from storage we can correct and remove, with bounded retention of source material. Reuse publication schemas and verification patterns where useful, without automatically putting identifiable inference records or full source posts onto immutable public storage. Signing identifies the publisher; it does not prove that the publisher actually ran the advertised prompt.

This also connects to your legal concern. Honest presentation helps, but is not a blanket defense: Canadian fair-comment protections involve conditions beyond labeling something an opinion, and public accessibility does not remove privacy obligations. A focused review of the actual sources, attribution UI, and correction process belongs before public launch. [Supreme Court’s *WIC Radio* decision](https://decisions.scc-csc.ca/scc-csc/scc-csc/en/5670/1/document.do), [Canadian privacy regulator’s guidance](https://www.priv.gc.ca/en/opc-news/speeches-and-statements/2023/js-dc_20230824/)

**My proposed first release would be one founder’s curated topic map, plus “map my writing.”**

I would start with roughly 10–20 participating authors, a narrow topic, and material supplied or licensed for this use—such as their own essays or position papers. That avoids making X access a dependency without assuming that copying X material elsewhere resolves its restrictions.

The release would include:

- A small collection of reusable statements and cited interpretations.
- Human review before initial public attribution.
- Private previews for people processing their own writing, with explicit publication choices.
- Public corrections and channel opt-out.
- A mediator consuming the evidence to propose a few bridges.
- Periodic refreshes, with a faster path for corrections and removals.

Then expand to selected public figures and permitted public sources once the attribution process and operating rules have been demonstrated. On-demand third-party submissions can follow, within the same topic and source boundaries.

I would judge the pilot by whether authors recognize their positions, how often substantive corrections are necessary, whether readers understand the distinction from endorsement, and whether it produces useful statements and bridges. A small comparison between a statement-only map and the same map with attributed evidence would test your bootstrapping hypothesis directly.

The strongest product promise, to me, is: **“Start from what you have already said, review our interpretation, and find where your position connects.”** That gives people an immediate reason to participate while also producing the grounded landscape you want founders and mediators to work with.


# Astra's additional thoughts after reading both proposals — 2026-10-27

These are discussion additions, not accepted requirements. The two proposals agree on most of the architecture; the remaining questions are largely about what product we are testing and what each published relationship means.

**Self-service and public bootstrapping test different hypotheses.** “Map my writing” could be a good onboarding feature without solving Adam's original problem: making a sparse map useful before the people being represented participate. We should measure them separately. For onboarding, does reviewing extracted statements help someone express their position? For bootstrapping, does a visitor find a map with cited public positions more useful, and does a mediator produce better proposals from it? A narrow, permissioned public-map experiment can run alongside self-service. Success at one should not be treated as evidence that the other works, and an opt-in pilot will not establish how unsolicited subjects respond.

**“Expressed” is a useful constraint, but does not make most of the risk disappear.** “This post expresses S” still attributes a position when it appears beside someone's name. Camp-level output can do the same thing through linked evidence, and assigning an author to a camp is itself another inference. The earlier suggestion that aggregation or self-service resolves the X issue is not established by the policy cited above. Nor should a private/offline experiment be assumed exempt from source restrictions. We should choose permitted inputs for the quality experiment itself. The practical product boundary is fidelity to the author's actual expression, not a particular verb or whether the person's name is one click away.

**Separate the evidence relationship from the channel summary.** A useful underlying object is the service's judgment that *this dated passage, in this context, expresses this exact statement*. A channel's topic page is a view over those judgments, not the primary fact. That makes it possible to offer a useful “positions in this discussion” map without first manufacturing a complete profile of each speaker. It also makes individual corrections and changes of position easier to represent.

The relationship needs more precision than `fit: close | gist`. A post might endorse a statement, oppose it, quote it, ask about it, or endorse it only under a condition. We need those distinctions during evaluation even if v1 publishes only close, affirmative matches. In particular, “X contains an argument for S,” “X is civil toward S,” and “X's author endorses S” are different judgments. Reusing the content-attester machinery must not reuse an alignment attestation as proof of expressed agreement. For a conditionally endorsed position, put the condition in the matched statement; do not let a caveat beneath the card repair an overbroad attribution.

**Keep descriptive extraction independent of the mediator's desired outcome.** The mapper's job is to capture positions faithfully, including awkward constraints and positions that do not bridge neatly. A mediator may then propose wording people could accept. If the mapper is prompted to find common ground, or rewarded mainly for producing successful bridges, it can quietly soften the source positions before the mediator sees them. Preserve source constraints and counterevidence in the mediator's input, and evaluate extraction fidelity separately from bridge quality. Sometimes “these positions currently conflict” is the useful result.

**Corrections require downstream invalidation, not just a delete button.** If a source judgment is withdrawn, its channel page, statement count, cached explorer view, and any named attribution in a mediator's output need to stop relying on it. Derived outputs should retain dependencies on exact interpretation versions. Removing an attribution need not delete a generic statement or a bridge that remains useful in its own right; it removes the claim that the named source supports it and triggers review where that evidence was essential.

Service-signed JSON alone does not solve this: an old, validly signed response can be replayed. Clients need a current revision/status check and a bounded freshness policy, with stale results visibly historical or omitted from active counts. Opt-out handling also needs a deliberately minimal suppression record so the next ingestion pass does not recreate the deleted profile. We can promise removal from services we operate and define behavior for conforming consumers; we cannot promise erasure from every downloaded copy or independent provider.

**The pilot should test misleading selection as well as inaccurate sentences.** Ten individually accurate excerpts can still give an unfair picture if they omit the author's central qualification or changed position. Evaluate both each statement–evidence match and the resulting topic summary. Include hard cases such as quoted opponents, conditional support, changes over time, and a paid requester selecting only convenient posts. Compare extraction with and without the author's name to see whether familiar identities are supplying assumptions absent from the evidence. Track abstentions alongside accuracy so “publish almost nothing” does not masquerade as a useful high-quality service.

**Attention should help choose what to investigate, not what to conclude or recommend signing.** Requests, follower counts, and topical prominence can prioritize limited processing capacity. They should not increase confidence in a match, encourage choosing a popular but less faithful statement, or automatically feed existing “more popular statement” nudger ranking. Keep explicit support counts separate at the API level as well as in the UI. Otherwise the third category can become an endorsement signal indirectly even when its own panel is carefully labeled.

The next product decision I would make is which demonstration we want first: a faster personal review flow, a useful public topic map, or better grounded mediation. We can share the extraction machinery, but each needs its own evidence of success. For the original proposal, I would prioritize a small public topic map with inspectable sources and working correction propagation, and use it in one mediation exercise before investing in broad channel coverage.


# Opus's additional thoughts after reading both proposals — 2026-10-27

**Corrections to my first response.** Astra is right on two points. First, I guessed that X's policy allows aggregate analysis and hoped that would rescue the camp-level and self-service versions. The cited guideline doesn't establish that, and an offline quality experiment run on X data isn't automatically exempt either. Second, "expressed" narrows the claim but doesn't remove most of the risk. Fidelity to the source is the real boundary, as Astra says. I'd also drop "Not me deletes it, and that's the whole correction story." Astra's list of correction meanings and the downstream invalidation work are both needed.

**Start with organizations and officials, not influencers.** Neither proposal looked closely at *whose* positions to map first. I think that choice resolves several open problems together:

- **Advocacy organizations, think tanks, unions, trade associations and parties** publish explicit position statements on purpose: platforms, policy papers, testimony and endorsements. Mapping those is close to transcription rather than inference. Organizations aren't natural persons, so GDPR Article 9 doesn't apply to them in the same way. They choose their own camp labels, which removes the "we assigned you to a camp" inference Astra raised. They're also the likeliest subjects to *welcome* an accurate entry.
- **Elected officials and candidates** have the strongest public-figure case, and the best evidence is their explicit acts: votes, sponsored bills, official platforms and signed pledges. A vote is a signature-like act of public record. It's much less ambiguous than a tweet, though it still needs care, since a vote on an omnibus bill isn't an endorsement of every clause.
- The existing identity machinery already fits. `beneficiaryId` supports `("dns", "example.org")`, and the claimable-beneficiaries spec specifies (or plans) a `/.well-known/commonality-claim.json` proof. An organization could confirm, correct or opt out from its own website with no X dependency and no wallet.
- These are mostly long-form, self-contained sources. According to the beat-agent spec's own reconciliation, that's the case where a *stateless* evaluator is enough. So v1 doesn't need beat-memory at all. Beat-memory only becomes load-bearing later, if we move to short-form social posts. That makes the first build much smaller than both proposals implied.

This doesn't do everything Adam's original idea asked for. Influencers who never write position papers stay unmapped. But it gives a public topic map that's honest and checkable and mostly free of the sourcing problem. That's the demonstration Astra recommends prioritizing, built from the least risky inputs.

**This also helps the current focus (demos).** The fake-data demos currently show fabricated signers. A topic map of *real* organizations' published positions, labeled as interpretations with links, would make a demo more compelling and also less fake. That's worth weighing when we choose the pilot topic: pick one where the fake-data statements already exist, so real positions can be matched to them.

**Never solicit corrections by pushing to the subject.** It's tempting to @-mention someone on X ("we've mapped your views; confirm or correct here") so they find out and the correction loop closes. But a service that characterizes you in public and then pings you to come fix it reads as coercive, the Yelp-review dynamic. It's also the message-hub role that [ADR 0011](../../decisions/0011-organizer-contact-is-pull.md) rejected for organizers. Corrections should be pull: findable, free, and linked from every entry. Organizations can be contacted through channels they've already published for that purpose. The analogy to "fund now, claim later" is real, but there it's money waiting for someone. Here it's a characterization waiting for someone, and that asymmetry matters.

**Plural mappers, not one.** A single operated mapper is a single editorial voice describing everyone. The nudger trust model and [multiple-providers.md](../legal/multiple-providers.md) already assume competing providers. Two mappers run by people from different camps, each with its own published prompt, would be a strong check on Astra's point about misleading selection. Where they disagree about a source, that disagreement is useful information to show. It shouldn't be averaged away. The record format should assume multiple mappers from day one, even if the pilot has only one.

**Mapper-authored statements need to join the graph.** When no existing statement fits and the mapper drafts a new one, that statement should go through the implication finder/attester like any other. Otherwise each mapper builds an island of near-duplicates that never connects to signers' statements, and the bootstrapping value disappears.

**My answer to Astra's "which demonstration first."** A small public topic map built from organizations' and officials' own published positions, using a stateless extractor with human review and DNS-based correction and opt-out, then fed into one mediation exercise. "Map my writing" can come along almost free, since it uses the same extractor on pasted text. Influencer and social-post coverage, and the beat-memory work it needs, should wait until the permitted-source question has a real answer.


# Adam's thoughts again

Let's not bother with this for now; I'm discouraged that it violates X's rules. But we can probably get some of the benefit by enhancing the beat agents and the bridge builder: without recording user-specific info in any long-term way, I think we can try to notice which views are popular (or expressed by popular influencers) and have the bridge-creator emphasize those when writing statements and bridges.

Beyond that... maybe it'd still be useful to have a voluntary "take a look at my X profile and suggest some statements I might agree with" feature, or something. But let's not bother for now.
