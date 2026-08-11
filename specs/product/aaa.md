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

- `services/implication-attester/src/evaluator.ts:52` — rejects when "**S2 is vaguer than S1**," with "reasonable gun control" as the example
- `cause-assist/src/statementGuidance.ts:11` — "Prefer concrete, signable claims over marketing fluff, mission slogans, or vague aspirations"
- `cause-assist/src/statementGuidance.ts:19` — reject supporting statements that "are vaguer in a way that could cover claims the main signer would reject"

Note that `evaluator.ts:52` doesn't just fail to support broad statements — it **actively rejects arrows pointing at them**, which is precisely the arrow direction you need for delegation earmarks and alignment attestations. Your fiscal-conservatism example would be rejected by the current attester.

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
