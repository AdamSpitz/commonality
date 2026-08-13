### AAA - what should this be called?

(AI, please don't rewrite the parts of this file that I wrote. I want to have my thoughts here, in my own words.)

## Motivation

I want to spend some time rejiggering our thoughts about how to organize and present this project's functionality. That is, I think we've got a bunch of useful foundations that still probably work, but our current attempts at making a UI for them have been awkward and I think it'd be better if we presented the ideas differently.

Underlying functionality that I think is still good:
  - immutable statements that people sign, with implication arrows between them
  - fundable projects (assurance contracts) with a reimbursement mechanism
  - delegation system so a user can let someone else he trusts direct his money
  - alignment attestations so that someone who cares about a cause can see a dashboard of fundable projects aligned with that cause
  - fundable social media content as a special case of the fundable-project system
  - bridge-building AI service for finding common ground, making clear statements that can have implication arrows to other statements, finding organic coalitions

Originally we factored this functionality into a bunch of separate websites. Then more recently we tried making this CauseStarter UI where we would expect a "cause founder" to start his own vertical for a specific cause. This was partly for legal reasons (I don't want to be personally responsible for policing all of the activity across all of the possible uses of this site, so instead let's have cause founders be responsible for their own site), partly because it kinda makes sense to let cause founders promote their own site (I don't want to be promoting all activity, I just care about the few causes I care about).

We decided that a "cause" should be defined by a set of statements ("planks"), and then the UI can show numbers regarding how many people support any or all of those statements, or a particular subset or whatever. But that's starting to seem like what we're calling a "cause" isn't really a cause, it's more like a brain-dump: "here are the beliefs this person holds." Maybe a cause is a particular subset that hangs together well, but still, the whole point of these cause sites is that the list of statements is chosen by the cause founder and can be changed by the cause founder, and the statements are meant to be individual issues and then it's up to the UI to show numbers regarding different groupings of them. Sounds more like "here's my beliefs" than "here's a cause." (Maybe it's still useful to have different pages for different clusters of beliefs that are on very different topics, though.)

Another problem is that the ideas of "statements that are clear enough to have AI-attestable implication arrows to other statements" and "statements that are written in such a way that they can produce common ground" (see docs/end-user/common-sense-majority/hidden-majority-patterns.md) are very unintuitive. We don't actually expect normal humans to naturally write in that way. Even the cause founders (who are more motivated to put in a bit of effort) aren't going to find it natural to write in that way. So, like... is the CauseStarter site (and the CauseAssist AI service) supposed to suggest the statements, or is that going to feel condescending, like "putting words in the cause founder's mouth"? It's not obvious whether the AI service should be offering advice or just writing the statements. In practice I expect we'll need the AI to interactively chat with the cause founder and then generate the statements and then the cause founder will just say "yup, I approve"; maybe occasionally the human will want to tweak the writing, but we're kidding ourselves if we think humans are going to write the bulk of this stuff.

So maybe we should just embrace that, rather than making it weird.

e.g. Maybe we should think of this entire space of possible opinions as being a huge space with a gazillion statements in it, each of them AI-generated in such a way that it works nicely with the implication system (avoids being too vague or ambiguous, except where vagueness is useful for the sake of broadness, etc.), and then we have an AI service question the user to find out which statements the user supports. (And it's fine for either the AI or the user to make up new ones on the fly.) (And there's no need for the user to enumerate everything he believes on every topic, obviously - just let him direct the conversation to whichever ones he wants.) I think we already have an AI service that basically does this (and if we don't, it shouldn't be too hard to make). We also already have a system for generating a bunch of seed statements.

I'm imagining a two-level system, similar to what we were aiming for with the CauseStarter idea: some people will be willing to go through this process, but most won't. That's fine - most user will simply follow a link (through X or wherever) and find one of these "cause" pages (showing a bunch of statements) and click some of them.

Regarding vagueness: I'm not sure whether this is captured in the instructions given to the mediator or implication attester, but there are some kinds of vagueness that make statements unusable and some kinds of vagueness that are very useful. e.g. Just saying "I'm pro-choice" is too vague to be useful, because *maybe* it's meant to be about the abortion debate but maybe it's not. But there's a kind of vagueness that's very useful, because it can help find common ground, or because it lets people declare their general opinion without needing to decide on a bunch of finicky hard-to-articulate details. (e.g. "I'm generally in favour of taxes being lower. I'm not saying they should be zero and I'm not saying anything here about which particular taxes, I'm just saying that in general there seem to be two camps, and I'm in the camp that's broadly in favour of letting individuals keep more of their own money, letting businesses keep more of their own money, and having the government do less stuff overall." That's vague but it also says something real. It would be perfectly reasonable for a fundable project being run by a fiscal-conservatism organization to have an alignment attestation saying that it's aligned with that statement.)

Part of the point here is that if we're going to have a gazillion AI-generated statements, and people are going to sign them, we don't want the statements to need to be inhumanly specific and overly finicky, and we also don't want the statements that people *have* signed to suddenly become obsolete (ineligible for implication attestations) because there's some tiny detail they didn't specify. People should be able to sign broad statements and have those remain useful, even if they don't map out every specific detail of all of their opinions.

Broad statements are also useful for the delegation system: "I'd like to delegate $50/month to my friend Frank, to be used for this broad set of purposes that I care about." No need for the earmarking to be for some super-specific purpose.

That broadness is also useful for a user who wants to be a delegate: "Here's the broad set of purposes I'd use your money for, if you delegate it to me." (Remember how we were just talking about how the "cause" page is more like a "here's what I believe" page?) So then it's just one click for the donor to say "sure, here, you can direct my money to those purposes."

Anyway... what do we get if we try to organize the product around these ideas?


# AI response

I've read the README, specs/README, product/ui-domains, mvp, ai-assistance, founder-first, ADR 0008, explorer.md, hidden-majority-patterns, and the CauseStarter README — plus the actual attester/cause-assist prompts, because one of your claims in aaa.md is checkable and it turns out to be right.

## Thoughts on aaa.md

### 1. "A cause is really a brain-dump" — that's a convergence, not a defect

You noticed the cause page looks like "here's what I believe." Then two paragraphs later you noticed the delegate profile is also "here's the broad set of purposes I'd use your money for," and the donor's earmark is also a broad statement set. Those are the same object three times:

- **cause page** = a plank set + a supporter count over it
- **delegate profile** = a plank set + "give me money for these"
- **belief profile** = a plank set + "this is me"

The reason CauseStarter feels awkward may be that it built one of these as a bespoke thing (`causeStore.ts`, localStorage rosters, a "found a cause" funnel) when the general primitive is *an identity-attached, signable set of statements*, with cause/delegate/profile as three renderings and three CTAs over one substrate. That's a genuine simplification, and it makes the two-level structure fall out for free instead of being designed: the "founder" is just someone whose set is worth circulating. Link-in-from-X → click some planks is exactly ADR 0008's lens posture, unchanged.

The strategic cost you should say out loud: this weakens "founder" as a *distinct customer*, which is the load-bearing claim of ADR 0005. I don't think it kills it — founders are still who you recruit and who circulates links — but "the customer is the vertical founder" becomes "the customer is whoever bothers," and 0005's triage table stops cleanly sorting work. Worth a revisit note on 0005 rather than silent drift.

### 2. The AI-authorship question is already decided the other way, in code

CauseStarter's README says it explicitly:

> **Founder writes the issues; assist only coaches.** Start does not collect a free-text seed that an LLM turns into planks, and the cause page does not pre-populate issue fields with model text.

aaa.md proposes the reverse. That's fine — but it's a reversal of a stated design decision with an implemented enforcement, so it needs an ADR, not a drift.

On the substance I think you're right, and there's a cleaner argument than "let's embrace it": **the implication-friendliness constraint is a machine requirement, and pushing machine requirements onto humans is a UI failure.** Nobody writes SQL to use a search box. Asking a cause founder to hand-author statements that satisfy an attester's entailment rules is the same category error.

Your "condescending / putting words in his mouth" worry has a real answer, and your own docs contain it — hidden-majority-patterns.md flags the misunderstandings pattern as "putting words in their mouths in a major way (which is something to be *very* cautious about)." The resolution is **generate vs. offer**. Selection from AI-generated options is something people do all day without resentment; ventriloquism is when the menu is the only path and nothing on it fits. So the design constraint isn't "don't generate," it's: always a visible "none of these — here's what I actually mean" that feeds back into generation, and never a silent commit. Your predicted flow ("AI chats, generates, human says yup") is fine as long as that escape hatch is load-bearing rather than decorative.

### 3. Most of what you're proposing already exists as a deferred spec

The "gazillion statements + an AI questions the user to find which he supports" idea is `specs/tech/subsystems/conceptspace/explorer.md` — two-tier LLM (background curator builds a map, cheap per-user call personalizes), and its "Future: conversational UI" section is almost literally your paragraph, including the key invariant:

> the LLM controls what statements appear in the statement panel, but the statements are rendered by deterministic UI code. The LLM never generates statement text directly — it either references existing statements by CID, or creates a new statement and then references it.

Hold onto that invariant; it's what keeps "AI wrote it" from contaminating "what did I actually sign." So this reorganization is much cheaper than it reads — it's mostly *promoting a deferred feature to the center* and demoting CauseStarter's authoring flow.

One place I'd push back: the explorer curates a **small, deliberately non-redundant** map (dozens to low hundreds). You're asking for a gazillion. Those are different objects, and flat-gazillion is the worse one — attestation is pairwise and expensive, so a huge flat statement set is a *sparse* graph, and sparse graph means support doesn't actually propagate, which is the whole point. What you want is a **curated broad backbone plus unlimited leaves that attach to it**: new/idiosyncratic statements only need arrows up to the nearest backbone node, not to each other. That's O(n) attestation instead of O(n²), and it's what makes the backbone statements durable in the sense you want.

### 4. The vagueness section is the most valuable part, and you're right that it isn't in the prompts

I checked. The prompts treat vagueness as uniformly bad:

- `services/implication-attester/src/evaluator.ts` — rejects when "**S2 is vaguer than S1**," with "reasonable gun control" as the example
- `cause-assist/src/statementGuidance.ts` — "Prefer concrete, signable claims over marketing fluff, mission slogans, or vague aspirations"
- `cause-assist/src/statementGuidance.ts` — reject supporting statements that "are vaguer in a way that could cover claims the main signer would reject"

Note that `evaluator.ts` doesn't just fail to support broad statements — it **actively rejects arrows pointing at them**, which is precisely the arrow direction you need for delegation earmarks and alignment attestations. Your fiscal-conservatism example would be rejected by the current attester.

But the rule isn't simply wrong, and the fix isn't "allow vagueness." The gun-control example is a *good* rejection. What actually separates it from your tax example isn't broad-vs-specific — it's whether the statement **self-delimits**. "Reasonable gun control" leaves its own extension unknown, so signing it commits you to whatever the reader fills in. Your tax statement is broader in scope but bounds itself inline: it names the direction, and explicitly disclaims the endpoints ("not saying zero, not saying which taxes"). You can't sign it and be surprised by what you signed.

So I'd propose the distinction as: **unbounded vagueness vs. declared breadth.** A statement may be as broad as it likes provided it says how broad it is. That converts a fuzzy aesthetic judgment into something an attester can actually test ("does the text itself bound its own extension?") and something cause-assist can coach toward. And it explains why declared-breadth statements are safe implication *sinks* — many specific statements imply them, they imply little — which is exactly what makes them good for both the durability property you want and for delegation earmarking.

Incidentally this is the same move as the `deferDetails` technique already in `bridge-creator/src/strategyEngine.ts:27` ("defer them with an explicit good-faith boundary instead of using ambiguous shorthand") — that technique is in the mediator and never made it into the attester or cause-assist. So there's a coherent existing idea that's just under-propagated.

### What I'd actually do

1. Write the vagueness rule up as a spec and propagate it to `evaluator.ts`, `statementGuidance.ts`, and the CSM strategy prompt. It's the smallest, most concrete, highest-confidence win, and it's independent of whether you reorganize anything.
2. ADR the AI-authorship reversal, with the generate/offer distinction as the guardrail.
3. Before rebuilding UI: unify cause / delegate profile / belief profile as one primitive on paper and see whether the awkwardness you're feeling dissolves. I suspect a lot of it does.
4. Then decide whether the conversational explorer becomes the front door — but note it's a promotion of an existing spec, not new architecture.

Two things I'd flag as unresolved rather than solved: what "founder" means once everyone has a profile (§1), and the fact that ADR 0008's no-discovery posture means these profiles have **no distribution mechanism except the owner circulating a link** — which is fine for a motivated founder and probably fatal for the long tail of people you're now inviting to build one.


# My response

Right, #1 and #2 are good. #3 is the main thing I'm trying to figure out.

I don't think it's quite right to say that the "belief profile" thing is exactly what we want as our "cause" thing or "delegate profile" thing. For the most part I don't think a donor is going to delegate money to a delegate and say "use this to fund that entire big list of everything you believe." The donor is going to want to be a bit more specific than that, even if it's still a fairly broad list. (e.g. "Go use this to fund conservative projects.")

It's true that the "cause" site was starting to sound more like a "here's all my beliefs" site. But I don't think that means that we should shift from "fund this cause" to "fund this guy". Lemme try to recreate my earlier intuition.

The cause founder isn't even writing the statements; he's probably just choosing from a bunch of already-generated statements, or at most he's steering the AI into the kind of statement he wants and then letting the AI write it. *Maybe* the choice of which statements to include is something that'll take a bunch of human creativity or whatever, especially when it comes to identifying the potential for coalition-building. But honestly for the most part this is 99% an AI-doable job; modern LLMs understand the world well enough that they can steer people towards the clusters-of-beliefs those people would support. So we don't exactly need cause *founders* in the sense of creating the clusters. We do need *believers* and *leaders* - people who'll be motivated to go put in some work to further the cause.

My previous notion of the Alignment site was that each cause board was about a single statement. Or that you'd configure it with a list of statements you care about and it'd show you all of those. Maybe that's kinda what I'm coming back around to?

No, because I want it to be possible to pass around a link on X or wherever. "Here, go look at this." A convenient all-in-one link. Plus maybe also a rallying point - a website with some rhetoric and whatever, in addition to the raw info that my site shows.

Okay, but if they're creating their own site, then we're back to the danger that they could make it misleading. We could just make a "description" field and then LLM-check it to make sure it's not dishonest. But still, this isn't really the thing I'm trying to think through.

Okay:
  - The site that delegates need: choose statements (with the help of an AI to guide you), see a cause board. Also there's a way to send a link to others to say "feel free to delegate money to me."
  - The site that project-creators need: create a project, choose statements (with the help of an AI to guide you), attest that your project is aligned with it, also there's a way to send a link to others to say "please also attest that my project is aligned with these statements".
  - The site that you need if you're a believer in a cause and you want to pass around a single link: choose statements (with the help of an AI to guide you), get a link to pass around.
  - The site that donors need: that link that got passed around.

So there's a common pattern of using an AI to help choose a set of statements (but for different purposes! "I want to follow projects aligned with these statements" vs "I'm making a project, here's some statements it's aligned with" vs "here are some statements I believe and I'd like to spread awareness in general that this site exists to help coordinate funding".

A normie donor is not going to put in the effort of doing that conversation with the AI, but he might click on a link that he comes across.

Okay, but we still have the problem of: it feels like there's a need for a customized website to serve as the home page for a cause, but that creates trust issues.

I wonder whether there's a missing piece here. AI-verified descriptions of the conjunction of a bunch of statements? But honestly we already *have* that, that's what the implication attester already does if you give it that conjunction statement.

It still doesn't feel right. At the end of the day, people can and probably should make their own websites to promote their causes, and to provide a place for discussions and so on (which *we* certainly aren't going to host). Anyone can make whatever websites they want, and can be as dishonest as they want. We can't help that.

But from *our* POV, running the verifiable portions of this whole system, it feels weird to just have a cause ID be "here's a list of statements" and to have no real textual description of what the cause is. (Though, again, maybe we could have "here's a high-level summary and also here's the list of statements", and then the implication attester basically verifies that that summary is reasonable.)

Regarding the external websites: how about we create an embeddable widget that cause-founders can put into their own web pages? The widget is configured with a set of statements, and it shows numbers like "total money available", "total money needed", etc., but beyond that it just links out to the generic CauseStarter site.


This still doesn't feel like it captures the feeling I had earlier today.

I was talking with Sam, and it felt like we were figuring out that we needed to rejigger the whole way we conceptualized this site.

  - "Cause founder" isn't the right thing.
  - AIs need to be making the statements, and/or we need a bunch of seed statements that already have implication arrows.
  - So let's think of this as a big pile of a million AI-generated seed statements, and the AI can help people navigate through it and pick out the ones they want to sign.
    - Well, okay, fine, that's definitely a pivot.
    - And the two-level idea is good: don't expect normies to do the AI conversation, just let the more-motivated people go through that and settle on some good statements, broadcast them, and then normies can just click them.
  - But it still feels like I need some notion of "cause".

Hold on, let's go back to the intentional-vagueness idea, because I feel like that might be useful in this discussion.

The point of the vagueness is:
  - People have trouble pinning down the details of what they believe anyway. It's awkward to articulate, people have different ideas about those kinds of things, people can change their minds, or many possibilities can be fine, etc.
  - It allows coalitions. This applies fractally at all levels. i.e. These can be big ones between groups that mostly disagree with each other a lot, but also it applies to the minutiae too.
  - You can actually get there via implication from a more-specific statement. e.g. Someone can sign "I think all abortions are morally wrong," and someone else can sign, "I'm okay with abortions up until 16 weeks, but after that I feel like it's morally wrong," and those both imply the broader statement, "Without commenting on whether abortion before 16 weeks is morally wrong, I do definitely believe that abortion *after* 16 weeks is morally wrong." Some users might prefer to sign the broader statement directly; some users might sign one of the more-specific statements (which implies support for the broader statement too).
  - Notice that this is useful for drilling *down* into the tree, too. That is, someone could start with signing "I've got opinions about American politics", which is very broad but at least suggests that this user might be interested in seeing some more statements about American politics. So then the explorer can show him "In the context of American politics, I am generally left-wing" and "...right-wing" and "...not clearly either left-wing or right-wing" and then he can choose one of those (or write his own or whatever; it's not a problem if he doesn't want to sign any of those), etc.

So I'm imagining that one principle for organizing the statements might be something like: at all useful levels of granularity, feel free to create broader statements that allow variation or uncertainty or disagreement within some aspects while pinning down other aspects, especially if you think there's useful commonality to be found in those pinned-down aspects.

Now I want to also think about conjunctions and disjunctions specifically.
  - If there are statements A, B, and C, is it useful to create the statement "I believe A, B, and C"? Sometimes? I doubt it's useful to do that when A, B, and C are, like, beliefs that tend to go together anyway. ("I'm pro-life, I want fiscally-conservative government, and I don't want same-sex marriage" isn't really a useful conjunction to sign, not because those don't go together, but because what exactly is the point? Am I wrong? Maybe there's a use case I'm missing.) But "I'm pro-crypto" and "I live in Grey County" could usefully be combined in a statement like "I'm pro-crypto and I live in Grey County" because that's a useful single statement for projects that, say, support pro-crypto businesses in Grey County.
  - If there are statements A, B, and C, is it useful to create the statement "I believe A, B, or C"? Honestly, probably not. Maybe if there are ten separate statements and they all kinda go together, it *might* be useful to have a statement like "I believe at least eight out of statements A-J." But honestly probably not - that's a weird thing to say and I doubt many people would sign that or care about it. But I suspect there's a much more useful *vaguer* statement, like, "I'm *mostly* in agreement with the conservatives, although I've got my quibbles with a few of their ideas." (e.g. Someone who's mostly conservative but wants to allow same-sex marriage.) I can imagine statements like that being useful for showing broad support for conservatism, while making it clear that this movement doesn't necessarily have unanimous agreement on everything.

Point is, I can imagine various principles like that for forming useful "grouping statements": strategic (but bounded) vagueness, or "I've got some quibbles but mostly I agree", or "I agree with *all* of these substatements". Also "join" statements like "I'm pro-crypto and I live in Grey County". And maybe other principles too.

Maybe that would allow us to have this idea of a Cause Page centred around a single statement, where maybe the statement is something narrow, or maybe it's something broader like one of those. The implication attester naturally does the job of creating the notion of "substatements".

That is, maybe the thing we've been fumbling towards isn't that we need some new data type representing a "cause", but that (a) we need to have a better pattern language for creating grouping statements, and (b) we need to think of a cause as being a particular role that a statement takes in some contexts (like showing a "cause board" containing many projects aligned with that statement) - which is in line with many ways in which we already use the word "cause", so it's not exactly like this is a new insight, I'm just saying that maybe the missing thing was the grouping-statement pattern language.

Does that make sense? Help me clarify my thoughts.


# AI response (second pass)

Yes, it makes sense, and I think you got there. But you got there *back* to
something you already signed off on five weeks ago and appear to have
forgotten, and the forgetting is itself informative — so let me place your
conclusion first, then say what's genuinely new in it, then hand you the
concrete blockers.

## Your conclusion is the "anchor" layer of planks/views/anchors

`docs/founder/shaping-your-cause-statements.md` — signed off 2026-08-09,
mostly built — already says:

- a cause is **planks** (individual published statements; all signing,
  alignment, and earmarking happens here);
- **views** are client-side set operations over any subset of planks (union,
  strict intersection, "signed some / disbelieved none"), free, nothing on
  chain, togglable by founder *or visitor*;
- an **anchor** is a *promoted* view: a published statement for a combination
  that earned its own signable identity, with attested arrows from its planks.
  "'One main statement' is therefore just the default promoted view, not a
  structural requirement."

Your §172 — "we don't need a new data type representing a cause; a cause is a
role a statement takes in some contexts, and the missing thing was the
grouping-statement pattern language" — is that model, arrived at from the
opposite end. The doc even lists three shapes (single-issue, conjunctive
manifesto, disjunctive/hedged-broad) with a table of which arrows each buys.
So the first half of your intuition isn't a pivot; it's already the design.

**What's actually new is the second half**, and it's the right complaint: that
doc has *three* shapes and explicitly decides the founder never sees them
("Three shapes is too much theory — so the founder never sees them"). You're
saying three isn't enough and the taxonomy should be richer and should be
*worked*, not hidden. I think you're right, and the reason you're right is that
the doc hid the shapes because a *human founder* couldn't be asked to learn
them — but under the pivot in this file, the entity choosing the shape is an
LLM, and an LLM can absolutely hold a twelve-item pattern catalog. **The
audience for the pattern language changed, so the decision to suppress it
should be revisited.** That's a clean, specific consequence of your pivot and
it's the thing I'd write down.

## The correction that sharpens it: most grouping needs no statement

You're calling for grouping *statements*. The planks/views insight is that
grouping mostly doesn't need statements — union/intersection over plank signer
sets is a set operation, and a cause page is a views layer. A published
grouping statement buys exactly three things a view can't do:

1. someone can **sign** the combination,
2. someone can **earmark money** to it (delegation),
3. someone can **align a project** with it.

So the pattern language isn't "how do we group statements in general." It's
narrower and much more tractable: **what shapes are worth minting a CID for,
given that display-only grouping is already free?** Ask that of each of your
proposed patterns and most of them answer themselves.

This also resolves your §110 objection to the previous response's §1. You said
a donor won't delegate to "that entire big list of everything you believe" —
correct, and it's not a counterexample to the unification, it's what the
unification predicts. Profile = all your planks. Delegate earmark = an anchor
over a *subset*. Cause page = a view over a subset. Same substrate, three
selections. And note the asymmetry that makes your objection load-bearing: the
cause page can be a free view, but **the earmark cannot** — money needs a CID.
So delegation is the single strongest reason grouping statements have to exist
at all. If you want one motivating use case for the pattern language, it's
that one, not the cause page.

## Sorting your candidate patterns by whether they mechanically work

The organizing axis isn't conjunction vs. disjunction. It's **which arrow
direction you're buying**, because inbound arrows give a statement its
supporter count and its cause board, and outbound arrows give it nothing.

| Pattern | Arrows | Worth a CID? |
|---|---|---|
| **Enumerated disjunction** ("at least one of: A, B, C") | inbound from every disjunct (disjunction introduction) | **Yes** — this is the cause-board/anchor shape |
| **Scope-restricted broad claim** (your 16-weeks example, your tax example) | inbound from every stricter position | **Yes** — your best new one, see below |
| **Conjunctive manifesto** | outbound to each conjunct, ~no inbound | Only to let the wholehearted sign once |
| **Join / intersection** ("pro-crypto ∧ in Grey County") | outbound to both parents | **Yes**, and for a different reason: it's the shape a *project* aligns against. Already specified in `specs/tech/subsystems/conceptspace/content-patterns/intersections.md` |
| **"Mostly agree, with quibbles"** | **none, either way** | **No** |
| **"At least 8 of these 10"** | inbound only from ≥8-way conjunctions nobody signs | **No** |

The two rejections are the useful part, because you were tentatively in favour
of both.

**"I'm mostly in agreement with the conservatives, with quibbles"** is
mechanically inert. Nothing implies it — "I'm pro-life" does not imply "I'm
generally conservative," pro-life leftists exist, and the attester should and
does refuse that arrow (`shaping-your-cause-statements.md` calls this out
explicitly as "the trap in the hedged variant"). And it implies nothing, since
it names no specific commitment. It reads like the perfect coalition statement
and it collects nothing in either direction. If you want the thing it's
gesturing at — "broad support with internal dissent visible" — that's a
**view**, and it's already built: band 1 ("signed all five") + band 2 ("signed
some, disagreed with none") + the weakest-link line is precisely "here's the
coalition, and here's how unanimous it isn't." You wanted a statement; the
honest version is a display.

**"At least 8 of 10"** fails for the same reason plus a verification problem:
the attester evaluates a pair of statements as text, so it would have to do
combinatorial counting over ten enumerated propositions to decide any arrow.
Don't.

## Your vagueness intuition is right, and it isn't vagueness

The reason your tax paragraph feels legitimate and "reasonable gun control"
doesn't is not breadth. It's that **your statement declares its own
boundary**. It says which direction it commits to and explicitly names what it
is *not* claiming ("not saying zero, not saying which taxes"). "Reasonable gun
control" leaves its extension for the reader to fill in, so signing it commits
you to whatever the reader imagined.

Same with your abortion example: "Without commenting on whether abortion before
16 weeks is wrong, I do believe abortion after 16 weeks is wrong" isn't vague
at all — it's a **scope restriction with the excluded region named**. That's
why both stricter positions imply it: it's strictly weaker, and there's nothing
hidden in the weakening.

So the rule to write down is not "allow vagueness." It's:

> **A statement may be as broad as it likes provided its text bounds its own
> extension.** Broad-with-declared-boundary is a legitimate implication sink;
> broad-with-undeclared-boundary is not.

That's testable by an attester ("does the text itself say what it doesn't
claim?"), coachable by cause-assist, and it explains why declared-breadth
statements are exactly the good anchors: many things imply them, they imply
little. It's also the same move as `deferDetails` in
`bridge-creator/src/strategyEngine.ts` — "defer them with an explicit good-faith
boundary instead of using ambiguous shorthand" — which never propagated to the
attester or cause-assist.

## The blocker: the shipped attester rejects your abortion example

Concretely, in `services/implication-attester/src/evaluator.ts`:

- **line 57** — reject "**softened, hedged, or 'bridge' rewording of a stronger
  claim**… If S2 tempers S1 by adding concessions… the S1 signer endorsed the
  stronger form, not the hedged one."
- **line 54** — reject when S2 "changes strength, modality, quantifier, or
  **scope**."
- **line 52** — reject when S2 is vaguer than S1.

"All abortions are morally wrong" → "abortion after 16 weeks is morally wrong,
without commenting on before" is a **concession-adding, scope-changing
weakening**. Lines 54 and 57 both fire. The arrow you need for the entire
grouping-statement idea is currently prohibited by name.

Worse, this contradicts a signed-off doc. `shaping-your-cause-statements.md`
§"Hedge, don't blur" says hedging "makes a statement logically weaker and so
*easier to imply* — that helps. … Weaken with explicit hedges and enumerated
disjuncts, never with fuzzy nouns." The shipped prompt rejects explicit hedges
outright. One of the two is wrong, and I think the prompt is: it conflates two
different things under "hedged."

- **Rhetorical softening** — "immigration is a crisis threatening American
  workers" → "immigration policy deserves careful attention." Correctly
  rejected: the emotional register and the implied urgency are part of what was
  signed, and the softer version isn't a logical consequence, it's a different
  speech act.
- **Logical weakening with a declared boundary** — dropping a claim, or
  narrowing scope while naming the dropped region. This *is* entailment. It's
  what line 45's "subset of claims" and line 46's "generalization" rules
  already accept, just written in the first person with the exclusion made
  explicit.

The fix isn't to relax line 57; it's to split it, and add a positive rule for
declared-boundary weakening with your two examples as the worked cases. That's
a self-contained prompt change with test cases, independent of any UI
reorganization, and it unblocks the pattern language.

Also worth noting: line 52's "reasonable gun control" example stays exactly as
it is. Your rule doesn't loosen the attester in the direction it's rightly
conservative about. It only stops it from rejecting statements that say out
loud what they aren't claiming.

## Two smaller things you raised

**Drilling down (§160).** "I've got opinions about American politics" doesn't
need to be a signable statement. Navigating a user from broad interest to
specific position is the **explorer's** job, and the explorer is already
top-down by design — its curated collection has `topicArea` and `parentCid` as
explicitly "map-local structure, not canonical facts about the statement
itself" (`specs/tech/subsystems/conceptspace/explorer.md`). Don't mint
statements to do navigation; a bad statement that exists forever is a worse
artifact than a map entry that gets reorganized next snapshot. Keep the
statement layer for things people actually mean to commit to.

Note that this cuts against the "gazillion statements" framing generally. The
navigational hierarchy you were reaching for is the curator's map, which is
deliberately small; the statement graph underneath it can be large but should
grow from things people meant. And `intersections.md` already has the machinery
for growing it deliberately: the **statement-creator service** as "a lattice
completion service: given a set of signed statements, find missing intermediate
nodes that would make the implication graph more useful." That's your
gazillion-statements engine, specified, unbuilt, and correctly demand-driven
rather than pre-generated. The pattern language is exactly what that service
would need as its generation vocabulary — which is the second concrete
consumer, after cause-assist.

**Cause pages and trust (§120, §132–140).** You reasoned your way to "a
description field, LLM-checked for honesty" and then said it didn't feel like
the thing. It is in fact the thing, and it's built (2026-08-10): the roster is
a `PublishedData` document containing *all* founder-authored display text,
addressed by CID, pointed to by a `MutableRef` for a stable shareable URL, with
a positive-only **coherence badge** attested by the operator key against the
roster CID — "an attestation that a roster's planks match its own summary and
hide no riders," which drops on any edit until re-attested. Explicitly
construction-not-merit, so "a coherent cause we find repellent earns the
badge." You have the answer; you'd stopped believing you had it.

The **embeddable widget** (§140) is genuinely new and isn't specified anywhere.
It's also the best answer available to the distribution problem the previous
response flagged as unresolved — ADR 0008 means a cause has no discovery path
except the owner circulating a link, and a widget turns every founder's
existing site into a distribution surface without us hosting or endorsing
anything. Worth its own spec stub. One constraint falls out of the above: the
widget should render numbers only for statements/views it names, and should
carry the coherence badge state, or it becomes an unverifiable rendering of our
data on someone else's page.

## What I'd do

1. **Split the "hedged" rejection in `evaluator.ts`** into rhetorical softening
   (reject) vs. declared-boundary weakening (accept), with your tax and
   16-weeks examples as tests, and propagate the declared-breadth rule to
   `cause-assist/src/statementGuidance.ts`. Smallest, highest-confidence,
   unblocks everything else. Nothing here depends on it being right about the
   product reorganization.
2. **Write the grouping-statement pattern catalog** as a spec — I'd put it at
   `specs/tech/subsystems/conceptspace/content-patterns/grouping-statements.md`,
   next to `intersections.md`, which is already one entry in it. Key each
   pattern by the arrows it buys and whether it's worth a CID; include the two
   rejections, since knowing which appealing shapes don't work is most of the
   value. Consumers: cause-assist's anchor-drafting, and the statement-creator
   service.
3. **Revisit "the founder never sees the shapes"** in
   `shaping-your-cause-statements.md` — not to expose the taxonomy to humans,
   but because the shape-chooser is now an LLM, which changes the argument for
   suppressing it. This is a small amendment to a signed-off doc, not a rewrite.
4. Then the reorganization question, which I'd now state as: the cause page is
   a view, the delegate earmark is an anchor, and the front door is the
   explorer. If that's the shape, the open question isn't "what is a cause" —
   it's **what promotes a view to an anchor, and who decides**, which
   `shaping-your-cause-statements.md` §Promotion leaves as "watch which
   combinations people converge on" with no mechanism.

One thing I'd flag as still unresolved rather than solved: none of this
recovers "cause founder" as a distinct customer, which ADR 0005 makes
load-bearing. Under the model above, a founder is someone who published an
anchor and circulates its link. That may be fine, but 0005's triage table stops
sorting work cleanly, and it's better to revisit it deliberately than to drift.


# My response

Okay, promoting to anchors, yes, fine.

Having patterns for the shapes, good. Yes, now that AI is doing them we can make the pattern catalog explicit.

You say "A published grouping statement buys exactly three things a view can't do", but the thing I want is the ability to *point* to it. Some "cause founder" (even if that's no longer quite so explicitly a special role) comes to the CauseStarter website, and we walk him through the process of choosing some statements (which now will be AI-generated, and AI will have more of a role in walking him through the process), and... then what? I feel like it's weird to have a cause defined by a *set* of statements. What does the URL look like? I mean... okay, I guess he chooses a slug? Maybe that's fine?

You say "delegation is the single strongest reason grouping statements have to exist" but I'm not sure about that.

Rejecting those two overly-vague patterns is fine with me.

"scope restriction with the excluded region named" sounds good to me as a more-precise description of one kind of broad statement that's useful. Although I do also want to leave room for at least one more kind of broadness/vagueness/ambiguity: the kind that the statement-writer either didn't have the foresight to make explicit (it's hard to predict in advance all the possible degrees of freedom that a statement offer or all the ways that it might be misinterpreted), or that would have made the statement overly verbose (we're looking for clarity, not legalese). I'm open to suggestions regarding how exactly to tell the difference between statements that should be rejected for not being specific enough and statements that should be accepted even though of course there's always going to be some aspects not pinned down.

"which arrow direction you're buying", yes, that makes sense to me.


# AI response (third pass)

Three things you pushed back on or asked for. Taking them in reverse order of how
settled they are: the vagueness question is the one with a real answer I don't
think you've heard yet, the delegation claim I'll withdraw and replace with a
better one, and the pointing/URL question turns out to dissolve — but into a
*different* open problem that I think is the actual one.

## 1. Vagueness: quantify over readings, don't demand declared boundaries

You asked how to tell the difference between vagueness that should be rejected
and the residual under-specification that's unavoidable — the degrees of freedom
the writer didn't foresee, or that would have made the statement legalese.

The previous pass told you "the text must bound its own extension." That's too
strong, and your objection is right: nobody can enumerate what they aren't
claiming, and a statement that tries reads like a EULA. Declared breadth is a
*technique*, not the criterion.

Here's the criterion. **The test isn't a property of S2 at all. It's a
quantifier over S2's readings, relative to S1.**

> S2's residual ambiguity is harmless iff *every* plausible resolution of it is
> already endorsed by someone who signed S1. It's fatal iff *some* plausible
> resolution is one an S1 signer would reject.

Note that this is nearly what `evaluator.ts` already says — "vaguer **in a way
that could cover claims S1's signer would reject**." The rule is correct. The bug
is that it's *applied* as if it read "S2 is vaguer than S1," which is the summary
clause and the part a model will actually pattern-match on. So this isn't a
loosening; it's making the existing qualifier operative.

Why this gives you exactly what you asked for:

- **No foresight required.** The writer doesn't have to anticipate the degrees of
  freedom. He only has to leave ones that are *harmless in every direction*.
  Unforeseen ambiguity is fine as long as it's inert.
- **No legalese.** "Not saying zero, not saying which taxes" is one way to make
  all readings safe. Choosing a naturally-bounded phrasing is another. Being
  about a topic where the readings simply don't diverge much is a third.
- **It's mechanical.** The attester can be instructed to do it as a procedure:
  *enumerate two or three genuinely different readings of S2's unresolved
  parameters; ask whether S1's signer endorses each one; reject on the first
  failure.* That's testable, it produces a legible rejection reason ("under the
  reading where this includes a registry, a background-checks signer would
  object"), and it's the same move as the confidence calibration already in the
  prompt.
- **It preserves the rejections you want.** "Reasonable gun control" still fails
  — not for being broad, but because *registries* and *bans* are live readings a
  background-checks signer rejects. Your tax statement passes because there is no
  reading of "generally favour lower taxes, direction only" that someone who
  signed a specific tax cut would refuse. Same test, opposite results, and the
  distinction is no longer aesthetic.

The corollary worth writing down explicitly, because it's counterintuitive:
**breadth is not the risk factor; contested extension is.** A very broad
statement whose readings all lie in the same direction is a *safer* implication
target than a narrow statement with one contested unstated parameter.

This also disposes of the line-57 "hedged" problem without needing a separate
argument. Rhetorical softening ("crisis threatening workers" → "deserves careful
attention") fails the reading test — under the reading where "careful attention"
means "and the current level is fine," the S1 signer objects. Logical weakening
with a named excluded region passes it — every reading of "wrong after 16 weeks,
no comment before" is endorsed by someone who thinks all abortion is wrong. **One
test, both cases, no taxonomy of hedges.** That's a better prompt change than the
"split rule 57 in two" I proposed last time; it's smaller and it generalizes.

## 2. Withdrawing "delegation is the strongest reason"

You were right to doubt it, and there's a concrete reason I should have caught:
**NoteIntent is dormant.** `shaping-your-cause-statements.md` § Open questions
says so directly — permissionless attestation semantics and inheritance through
splitting/purchasing/refunds are unresolved, and founders and donors can't
currently set or view note intent at all. Building a pattern language justified
by earmarking means justifying it with the one consumer that doesn't exist.

Here's what I think the real answer is, and it changes which shape matters.

**The strongest reason to mint a grouping CID is one-click arrival — and that
requires a *conjunctive* anchor, not a disjunctive one.**

Follow the two-level model through. A normie arrives from X on someone's link.
He is not going to evaluate five planks; he'll click once or leave. Now: what
does that one click need to be attached to?

- If he signs the **disjunctive** anchor ("at least one of these five"), the
  planks get *nothing*. The anchor's arrows are inbound; signing it propagates
  nowhere. He has endorsed the weakest possible claim and no plank's supporter
  count moves, no project's alignment reaches him.
- If he signs the **conjunctive** anchor, it implies each plank by conjunction
  elimination, so his one signature credits all five. That's the only shape where
  a single click does five clicks' work.

Which inverts the ranking in `shaping-your-cause-statements.md`. That doc treats
the conjunctive manifesto as the weak one — "its own supporter count and board
stay near empty," good only "for letting the wholehearted sign once." True about
its *count*, and the count isn't what it's for. **The conjunctive anchor is a
compression device for distribution, and under a link-driven, no-discovery
product (ADR 0008) distribution is the scarce thing.** Its empty board is
irrelevant; the boards you care about are the planks', and it fills those.

The honest caveat, which sharpens the criterion rather than undermining it: the
same effect is available with no CID at all — a "sign all five" checkbox list
batched into one transaction. So what does the anchor buy over batched signing?
Exactly two things:

1. **Durability.** The anchor's text is immutable. A roster isn't — the founder
   can swap planks, and a signature on the roster's *current* contents is
   meaningless a week later. Signing a conjunction is signing something that
   can't be edited under you.
2. **Portability.** It's a single CID that can be signed from a context that has
   no roster: your embeddable widget, someone else's page, a wallet deeplink, a
   future client we didn't write.

So the criterion for promotion — which `shaping-your-cause-statements.md`
§ Promotion leaves as "watch which combinations people converge on," with no
mechanism — becomes statable:

> **Mint a CID when the combination must survive independently of the founder's
> mutable roster.** Aggregation is never a reason; views already do that for
> free.

That's a cleaner test than convergence, it's decidable at design time rather than
by waiting for data, and it explains why the roster and the anchor are different
objects instead of feeling like redundant ones.

## 3. The pointing problem dissolves — but the thing under it doesn't

> the thing I want is the ability to *point* to it… I feel like it's weird to
> have a cause defined by a *set* of statements. What does the URL look like? I
> mean… okay, I guess he chooses a slug? Maybe that's fine?

Yes, he chooses a slug, and it's fine, and it's already built. The URL is
`/cause/<founder>/<slug>`, backed by a `MutableRef` `(owner, name) → CID` where
the CID is the published roster document containing the title, summary, ordered
plank CIDs and blurb. `/cause/<founder>/<slug>@<version>` pins a specific roster.
That shipped 2026-08-10.

So the pointable object exists and is not a statement. Which I think is the
source of the weirdness rather than a gap in it — you keep looking for the cause
to be *one thing*, and the system deliberately has three:

| Object | Mutable? | Has a URL? | Can be signed / funded / aligned-to? |
|---|---|---|---|
| **Roster** (the page, the rhetoric, the name) | yes, versioned | yes — the shareable link | **no** |
| **View** (a subset selection over planks) | ephemeral, per-visitor | as query params, at most | no |
| **Statement** (plank or anchor) | never | by CID | yes |

The thing with the name and the rhetoric is the one thing nobody can sign. That
feels wrong and is exactly right: it's the mechanism that stops "4,210 people
signed at least one plank" from being launderable into "4,210 people endorsed my
page." The coherence badge exists precisely because the roster is the unsigned,
mutable, persuasive layer and therefore the one needing a non-founder check. Your
widget is a third renderer of that same roster, and inherits the property.

**The problem this exposes, which I think is your actual unresolved one:
`(owner, slug)` means causes fork by construction.** Two people rallying to the
same cause produce two rosters with overlapping-but-different plank sets and two
links, and there is no mechanism that ever merges them. Under ADR 0008 there's no
directory to notice the duplication, and under the pivot in this file — where
statements are AI-generated and cheap and *everyone* is invited to assemble a set
— the fork rate goes up sharply, not down. That's the cost of the pivot that
nothing above pays for.

But it also hands you the convergence mechanism the promotion section is missing,
and a better one than "watch which combinations people converge on within one
cause." Rosters are public documents with public plank CIDs. So:

> **Promote a view to an anchor when N independent rosters, from unrelated
> owners, share a plank subset.**

That's observable from `ref_updates` with no new machinery, it's cross-founder
rather than per-founder, and it makes the anchor into what it should be — the
shared, durable, portable object that several people's pages all point at — while
each of them keeps his own roster, his own rhetoric, and his own link. Forking
stays cheap at the presentation layer, and convergence happens at the statement
layer where it actually matters. That is, I think, the answer to "we don't need
cause founders, we need believers and leaders": a leader is someone whose roster
other people's rosters came to overlap.

## What I'd write down now

Revised from the last pass, mostly because #1 got smaller and better:

1. **The reading-quantifier rule in `evaluator.ts`.** Make line 52's qualifier
   operative and add the enumerate-the-readings procedure; drop the separate
   "split rule 57" proposal, since the reading test subsumes it. Test cases: the
   tax statement (accept), the 16-weeks scope restriction (accept), reasonable
   gun control (reject, unchanged), immigration-softening (reject, unchanged).
   Propagate to `cause-assist/src/statementGuidance.ts:19`, which has the same
   correct qualifier and the same risk of being read as "vaguer = bad."
2. **The pattern catalog**, at
   `specs/tech/subsystems/conceptspace/content-patterns/grouping-statements.md`,
   keyed by arrows bought — with the mint criterion above (survives the roster)
   as the gate, and the two rejections you've already accepted. Note in it that
   the conjunctive shape's job is one-click distribution, not its own count,
   because `shaping-your-cause-statements.md`'s table implies otherwise and an
   LLM reading both will follow the table.
3. **An amendment to `shaping-your-cause-statements.md`** covering: the shape
   catalog is now for the LLM, not hidden from the founder (your point, and I
   agree); § Promotion gains the cross-roster convergence mechanism; the
   conjunctive-manifesto row of the three-shapes table gets its distribution
   role.
4. **A spec stub for the widget**, as the only distribution surface ADR 0008
   permits — rendering roster-named statements only, carrying badge state.

Still unresolved, and I don't want to pretend otherwise: cause forking has a
convergence path now but no *deduplication* path, and ADR 0005's "the customer is
the vertical founder" still doesn't survive this file intact. Under everything
above, a founder is someone who published a roster and got other rosters to
overlap his — which may be a fine definition, but it isn't 0005's, and 0005's
triage table is what currently sorts platform work.

# My response

You said: "S2's residual ambiguity is harmless iff *every* plausible resolution of it is already endorsed by someone who signed S1. It's fatal iff *some* plausible resolution is one an S1 signer would reject." I'm not sure that's right. For example, it might be that he's got more opinions about the details, even though he's not voicing them in this statement. e.g. I'd like taxes to be lower and I'm happy saying so as a general statement, but I'm not saying I'd approve of *every* way of lowering taxes (not even counting completely-silly ways - like, there are ways of lowering taxes that some people might genuinely approve of but I wouldn't). Maybe your point is that I should explicitly make it clear in my statement that I only approve of some ways but not others? But that's starting to sound inhuman; people should be able to say that they think taxes should be lower without obsessively needing to dot every i and cross every t. (I wonder whether maybe there are cases where it's still reasonable to make a statement even if it's too vague to support implication arrows.) I dunno.

I think I'm getting the picture regarding the cause/roster/description stuff. A "cause" can and should have some descriptive/rhetorical content attached to it. That's important because statements are meant to be more precise, so that they can participate in the implication graph; put too much rhetoric into a statement and it won't be able to receive any incoming arrows (although maybe it can still have outgoing ones). People aren't going to sign the rhetoric; there isn't too much point in that. (If you think there's some important substance in the rhetorical description that would be useful to sharpen into a useful statement, great, go ahead. But it's still worthwhile to have this description field where the cause founder can put some stuff that isn't quite in usable-statement form.) But we still want to check the description to make sure it's not just completely misleading, so we have this AI service that checks for that; it's a looser check than the logical-implication check that we use for the implication system. That's starting to make sense to me.

Having heuristics for when to promote a view to an anchor sounds fine to me. I'm not too worried about forking; hopefull the implication system and the strategic-broadness patterns will be enough to let us achieve convergence where possible.


# AI response (fourth pass)

You caught a real equivocation in my rule, and the fix is smaller and more
deflationary than the last three passes have been. The roster/description stuff
is settled, so this is only about the vagueness question — plus your
parenthetical, which I think is the most useful thing in your last message.

## 1. You found an ambiguity in "plausible resolution", and it was load-bearing

My rule said S2's residual ambiguity is fatal if *some* plausible resolution is
one an S1 signer would reject. "Resolution" was doing two jobs:

- **resolution of what S2 asserts** — which of several candidate propositions
  did the signer actually put his name to?
- **resolution of how S2 gets satisfied** — granted we know what he asserted,
  which of the many world-states that would satisfy it does he like?

Your tax objection is entirely about the second, and the second is not a defect
at all. "I'd like the overall tax burden lower" has *one* meaning. It has a
truth condition. What it lacks is a specification of implementation — and it
lacks that because it never quantified over implementations in the first place.
"I don't approve of every way of lowering taxes" isn't an unresolved reading of
your statement; it's simply not something your statement says. There's nothing
to resolve, so no i's to dot.

This is the old generality/vagueness distinction: **many satisfiers, one meaning
(general — fine) vs. many meanings, pick one (vague — fatal).** So:

> Reject when the reader cannot tell *which proposition* was asserted. Do not
> reject merely because many world-states would satisfy the proposition that
> was asserted.

"Reasonable gun control" fails on the first clause — background checks, a
registry, and a handgun ban are three *different propositions*, and signing the
phrase doesn't tell you which one you got. It does not fail because gun control
admits many implementations. Your tax statement is broad in the second sense
only. Same test, opposite verdicts, and no declared-boundary requirement, no
enumeration of what you aren't claiming, no legalese. Declared breadth ("not
saying zero, not saying which taxes") drops back to being one handy technique
for making a statement's assertion unmistakable, which is where it belonged.

## 2. And the misattribution you're worried about doesn't actually exist

Worth separating, because I think the residual unease is here rather than in the
rule. Ask what harm you're guarding against when you say "I'm not endorsing
every way of lowering taxes." The candidate harm is: *a project I'd hate ends up
on the board for a statement I signed, and I get counted as behind it.*

Check the mechanism. Alignment attestations are permissionless third-party
claims ("subject S is aligned with statement T"), filtered through the viewer's
trust graph, and the cause board for T shows projects aligned with T or with
anything implying T (`specs/tech/subsystems/aligning/README.md`). Nowhere does
signing T attribute anything to you about those projects. **The board is a menu,
not an endorsement roll.** Your signature says what it says; the projects are
things *other people* claim are aligned, and you're free to look at the board
and fund none of them.

So the two layers guard different things, and only one of them can put words in
your mouth:

- **Implication** can misattribute — it makes you an indirect supporter of a
  *statement*. Conservatism here is load-bearing, and rule 1 above is the right
  scope for it.
- **Alignment** cannot misattribute to signers at all. It can produce a junk
  board, which is a quality/trust-filter problem, handled by the trust graph and
  attester reputation, not by making statements more precise.

Which means your tax worry, filed correctly, is not an argument for tightening
the implication attester. It's at most an argument that broad statements make
noisier boards. I'd let that be true and cheap.

## 3. The deflationary part: your tax example needs no prompt change

Having narrowed the rule, look at what arrows the tax statement actually earns.

"I support cutting the capital gains tax" → "I want the overall tax burden
lower"? **That should be rejected**, and not for vagueness. Someone can want
capital gains cut and the burden held constant by raising something else. The
aggregate-direction claim is a genuinely additional claim. Correctly caught by
the existing "S2 adds a claim" rule.

The arrows it legitimately receives come from statements that already assert the
direction: "I want taxes lower overall, and in particular capital gains" → "I
want taxes lower overall" is the **strict subset** rule, already accepted, no
change needed. So the tax statement was never blocked by the prompt on its
merits — the risk was only that the "S2 is vaguer than S1" bullet fires
spuriously on the general/vague confusion. The fix is a clarification, not a
loosening, and it buys fewer new arrows than the last two passes implied.

Your **16-weeks** example is the one that genuinely is blocked: "all abortion is
morally wrong" → "without commenting on before 16 weeks, abortion after 16
weeks is morally wrong" is a determined assertion and a real weakening, but
`evaluator.ts` rejects it by name under *"softened, hedged... adding
concessions"* and *"changes... scope"*. That one needs the fix. One example
needs nothing, one needs a real edit — that's the whole delta, and it's much
less than "rework the attester."

### Concrete prompt change

Narrower than what I proposed in passes two and three:

- The fatal case is **already covered** by the existing *"either statement
  depends on unstated context"* rule — "reasonable gun control" and "I am
  pro-choice" are the same failure, an underdetermined assertion. I'd fold the
  *"S2 is vaguer than S1"* bullet into that rule and delete it as a standalone,
  because as a standalone it invites the model to pattern-match on breadth. Keep
  the gun-control worked example, re-file it under unstated context, and state
  the reason as "which proposition was asserted is unclear" rather than "vague
  target."
- Add a positive bullet for **scope restriction with the excluded region named**,
  with the 16-weeks case as the worked example, and scope the "softened/hedged"
  rejection explicitly to *rhetorical* softening (the immigration example),
  which fails rule 1 anyway: under the reading where "deserves careful
  attention" means "the current level is fine," it's a different proposition.
- Add the general/vague sentence as a named principle, since it's the thing that
  keeps the two bullets from being read as contradictory.
- Propagate to `cause-assist/src/statementGuidance.ts:11,19`, whose "vague
  aspirations" phrasing has the same failure mode.

Test set: capital-gains → overall-lower (**reject**, adds a claim);
lower-overall-and-capital-gains → lower-overall (**accept**, subset);
all-abortion-wrong → after-16-weeks-wrong-no-comment-before (**accept**, named
scope restriction); background-checks → reasonable-gun-control (**reject**,
unstated context); immigration-crisis → deserves-careful-attention (**reject**,
rhetorical softening).

## 4. Your parenthetical is the right idea and it's already free

> I wonder whether maybe there are cases where it's still reasonable to make a
> statement even if it's too vague to support implication arrows.

Yes, and nothing stops you — publishing a statement doesn't gate on arrow
eligibility, so an arrow-inert statement is already legal today. Its only cost
is an empty inbound board.

I'd go further: this is the same insight you reached about the roster
description, one layer down. You concluded that rhetoric belongs in the
description field because rhetoric can't receive arrows. The generalization is
that the system has a **precision gradient**, and only the arrows need
discipline:

| Layer | Precise enough for inbound arrows? | Signable? | What it's for |
|---|---|---|---|
| Roster description | no, and not trying | no | rhetoric, rallying, context |
| Arrow-inert statement | no | **yes** | "this is my position", flag-planting, delegation earmark target |
| Plank / anchor | yes | yes | counts, boards, propagation |

The middle row is the one you were reaching for and it's the one nothing has
named. It's genuinely useful: it can be signed, pointed at, and earmarked
against, and it just doesn't accumulate indirect support. That's a fine trade
for "I want to say this even though it's mushy."

Two things to say about it, so it doesn't become a dumping ground:

- **It should be visibly a different kind of thing in the UI.** An anchor with
  4,210 indirect supporters and a mushy statement with 12 direct signers should
  not render identically, or the gradient collapses and people will pick the
  mushy one because it's easier to write. Showing direct-vs-indirect counts
  separately probably does most of this work already.
- **The cost isn't zero:** statements are permanent and public, so a mushy one
  that attracts signatures *instead of* the plank it's gesturing at fragments
  the very counts you want. That's an argument for cause-assist steering toward
  precision, not for prohibiting imprecision.

This also gives the pattern catalog a cleaner job. It isn't "how to write
statements"; it's **"how to write statements that earn inbound arrows"** — with
an explicit note that not every statement needs to, and that failing to is a
choice rather than a defect.

## What I'd write down, revised

1. **`evaluator.ts` clarification** as spelled out in §3 — fold the vagueness
   bullet into unstated-context, add named-scope-restriction, narrow
   softened/hedged to rhetorical. Plus the five test cases. Still the smallest,
   highest-confidence item.
2. **`grouping-statements.md`** as before, with the general/vague distinction and
   the precision gradient stated up front, and framed as "patterns that earn
   inbound arrows."
3. **The precision gradient itself**, as a short section — probably in
   `specs/tech/subsystems/conceptspace/statements.md` since it's about what a
   statement is, with pointers from the founder doc. This is the new item, and
   it's the one that answers your parenthetical.
4. Widget spec stub and the `shaping-your-cause-statements.md` amendment
   (shape catalog is for the LLM; § Promotion gains cross-roster convergence)
   — unchanged from the last pass.

Forking: taking your ruling, dropping it. ADR 0005's "the customer is the
vertical founder" I've now flagged three passes running without a ruling, so I'll
stop raising it here and file it as a TODO item instead of re-litigating in this
file.


# Codex's response

The discussion has already surfaced a promising simplification: “cause” may not need to be a new stored object at all; it may be a role played by a well-shaped statement, while arbitrary statement groupings remain views. I’m checking that idea against the signed-off product model and the actual implication rules, because the main risk is that an elegant product story depends on arrows the current semantics reject.

The key distinction is becoming clearer: the discussion sometimes treats “cause,” “statement,” “shareable page,” and “independently operated vertical” as if one object must serve all four jobs. The existing architecture is simpler when those stay separate—and, importantly, AI-written planks do not eliminate the human role. They move the human’s value from sentence-writing to judgment, framing, distribution, moderation, and accountability. I’m doing one last pass over the canonical use cases and AI posture before giving you a concrete reduced model.

My third opinion: the underlying pivot is right, but Claude’s later passes add machinery where the clean model is already available.

The simplest coherent formulation is:

> A cause is a shareable, mutable publication that uses immutable statements to define its actionable scope.

It is not itself a statement, a belief profile, or an independent vertical.

## The clean product grammar

Five objects are enough:

- **Statement:** an immutable proposition people can sign and projects can align with.
- **Cause page:** a mutable title, narrative, and curated selection of statements, with a stable URL and version history.
- **Project:** something fundable, aligned to one or more individual statements.
- **Delegation:** authority given to a person, optionally constrained by statement CIDs.
- **Vertical:** an independently operated front end with its own audience, policies, moderation, and distribution.

AI is not a sixth domain object. It is the translator and curator helping people move between human intentions and those formal objects.

This largely matches the existing roster design in [shaping-your-cause-statements.md](/docs/founder/shaping-your-cause-statements.md) and the operated-lens decision in [ADR 0008](/specs/decisions/0008-operated-surfaces-are-lenses.md).

## What makes sense in the discussion

You are right about AI authorship. Writing implication-friendly statements is machine-facing work. The human’s job should be to explain what they mean, reject bad formulations, approve good ones, and take responsibility for publishing them. “AI proposes; human adopts” is not putting words in someone’s mouth, provided that:

- Nothing is signed or published without explicit approval.
- “None of these captures it” is a real path.
- The AI searches existing statements before creating another near-duplicate.
- The final deterministic UI shows exactly what will be signed.

The two-level participation model is also right:

- Motivated organizers converse with AI, curate a page, and circulate it.
- Ordinary visitors follow a link, understand the cause, and make a few explicit choices.

The distinction eventually reached in the fourth Claude response—**generality versus ambiguity**—is the right one. “I favor a lower overall tax burden” expresses one broad proposition with many possible implementations. “I support reasonable gun control” may leave the proposition itself indeterminate. Broadness is fine; unclear meaning is the problem.

Separating rhetoric from signable claims is also exactly right:

- Narrative explains, persuades, motivates, and supplies context.
- Statements record the propositions someone actually endorsed.
- The coherence badge can attest that the narrative fairly represents the selected statements.

But the badge should never be described as verifying that a cause is “honest.” It verifies internal correspondence, not factual truth, good intentions, project quality, or moral legitimacy.

## What I would reject or simplify

The “gazillion AI-generated seed statements” framing is counterproductive. It creates permanent clutter, duplicate wording, sparse implication coverage, moderation burden, and fragmented supporter counts. The existing explorer model—small curated maps plus demand-driven statement creation—is much healthier ([explorer.md](/specs/tech/subsystems/conceptspace/explorer.md)).

I also would not make “promoting views to anchors” central to the product. A shareable URL does not require an anchor; the roster already has one. A one-click visitor flow does not require an anchor either: show an explicit checklist and batch the selected signatures.

An anchor is worthwhile only when the combination is itself a natural, durable proposition that someone would sincerely sign outside that particular cause page. For example:

- “Abortions after 16 weeks are morally wrong.”
- “I support expanding cryptocurrency adoption in Grey County.”
- A concise manifesto whose complete contents people genuinely endorse.

Do not mint anchors merely for aggregation, URL identity, or UI convenience.

Claude’s proposed “promote when N independent rosters overlap” is interesting as a discovery signal, but not a semantic rule. It is sybilable, generic planks will overlap accidentally, and popularity does not make a conjunction meaningful.

The proposed “arrow-inert statement” also does not need to become a distinct type. All statements already may receive zero arrows. The UI can simply show direct and indirect support separately. Naming another product category would make the ontology harder without adding capability.

The embeddable widget is reasonable later, but it is a distribution affordance, not the missing conceptual piece. A trustworthy link and good preview card come first.

## Where I disagree most strongly with the current implication rules

The existing attester’s requirement that S2 preserve S1’s “emotional framing,” and its blanket rejection of softened statements, conflicts with the project’s common-ground goal ([evaluator.ts](/services/implication-attester/src/evaluator.ts)).

If someone believes:

> Illegal immigration is a crisis that threatens American workers.

they would ordinarily also assent to:

> Immigration policy affects American workers and deserves careful attention.

The second drops rhetoric and urgency, but it does not put a contrary belief in the signer’s mouth. Indeed, finding such weaker shared propositions is much of the point of bridge-building.

The system needs to decide whether an implication arrow represents:

1. endorsement of a proposition, or
2. endorsement of an entire speech act, including tone and tribal framing.

The product docs overwhelmingly describe the first. If so, tone-stripped logical weakening should be allowed as long as it adds no claim.

Likewise, the abortion example does not need legalistic wording:

- S1: “All abortions are morally wrong.”
- S2: “Abortions after 16 weeks are morally wrong.”

That is straightforward entailment. “Without commenting on…” risks being interpreted as a claim about the signer’s own neutrality rather than merely delimiting S2.

## “Cause founder” is two roles currently being conflated

This is the largest strategic clarification I would add.

There is a difference between:

- **Cause organizer/curator:** publishes a cause page, selects statements, writes rhetoric, recruits supporters, and circulates the link.
- **Vertical operator:** runs an independent website, chooses policies and moderation, and owns its distribution and legal/operator posture.

AI replacing sentence-writing does not eliminate either role. The organizer’s scarce contribution was never prose composition; it is judgment, legitimacy, commitment, relationships, distribution, and accountability.

Nor does this pivot invalidate the founder-first strategy in [ADR 0005](/specs/decisions/0005-founder-first-verticals.md). It merely shows that “vertical founder” is the wrong label for every person who creates a cause page. CauseStarter can serve cause organizers while the platform’s strategic customer remains the independent vertical operator.

## The resulting experience

An organizer:

1. Describes what they want to accomplish.
2. AI retrieves fitting existing statements and drafts only genuine gaps.
3. The organizer approves, rejects, edits, and orders them.
4. They add a title and persuasive narrative.
5. A coherence check explains any mismatch.
6. They publish a stable shareable cause URL.

A visitor:

1. Follows that URL.
2. Reads the narrative and sees exactly which statements constitute the page.
3. Sees supporter counts and projects per statement.
4. Signs selected statements—possibly in one batched wallet action.
5. Funds directly or delegates within a clearly stated scope.

A project creator or delegate uses the same AI-assisted statement picker, but for a different verb: “align my project,” “show what I would fund,” or “constrain this delegation.”

That reuse is the real unification. The people and pages are not the same object; they share a **statement-selection interaction**.

I would call the document **“Causes as Publications: AI-Curated Statements and Shareable Cause Pages.”** The headline decision is: causes are publications over statements; statements remain the semantic and financial coordination primitive.