# New-user experience and exploration

How a new user gets started and discovers content.

## The core tension

New users need guidance — the statement graph is unfamiliar, they don't know what conceptspace is, and they need a path from "I just showed up" to "I've signed some statements that represent my beliefs."

But the mechanisms that provide guidance (nudgers, suggestions, prompts to sign things) are inherently pushy. If they're too eager, they become the equivalent of a clingy app sending notifications you didn't ask for. Worse, because nudges touch on *beliefs*, being pushy feels manipulative rather than just annoying.

## Exploration vs. nudging

These are fundamentally different experiences and should be treated as separate systems.

### Exploration (pull-based)

The user is actively looking: "I'm new, show me what's here, help me find my corner of this space." This should feel like browsing a well-organized library, not like someone following you around suggesting books.

The [explorer](../tech/subsystems/conceptspace/explorer.md) is the primary tool for this. It's a conversational AI interface where the user can ask questions, browse topics, and sign statements at their own pace. The explorer is a **page you go to** — it never reaches out to you.

### Nudging (push-based)

The system is reaching out: "You've been here a while, you've signed some things, here's something related you might have missed." Nudges appear contextually on pages the user is already viewing — on statement detail pages, in a suggestions panel, etc.

See the [nudger spec](../tech/subsystems/nudger/README.md) for the technical architecture.

### Why explorers are not nudgers

It's tempting to treat the explorer as "just another nudger," since both suggest statements. But they differ in important ways:

| | Explorer | Nudger |
|---|---|---|
| Initiated by | The user (opens the explorer page) | The system (nudges appear on pages the user is viewing) |
| Interaction model | Conversational, back-and-forth | One-shot suggestions |
| Per-user AI cost | Yes (live LLM conversation) | No (pre-generated batches, client-side filtering) |
| Trust model | Part of the core UI, no trust configuration needed | User selects which nudgers to trust |
| When it's useful | Early on, or when the user wants to deliberately explore | Ongoing, as the user builds up a portfolio of signed statements |

The explorer uses an LLM to have a real-time conversation with the user. Nudgers pre-generate batches of suggestions and publish them; the client filters and displays them. These are different architectures serving different needs.

## The explorer as the new-user entry point

When a new user arrives with zero signatures, the explorer should be prominent — a clear "Start here" path. It walks the user through:

1. "What is this system?" — a conversational explanation, adapted to what the user seems to already know.
2. "What's out there?" — showing high-level topic areas (politics, technology, environment, etc.) as statements the user can browse without commitment.
3. "What do you believe?" — helping the user articulate and sign their first few statements.
4. "What can you do with this?" — introducing funding portals, delegation, and other features once the user has some context.

The explorer doesn't need to cover everything in one session. It should feel like a natural conversation that the user can leave and return to.

### Pre-generated exploration structure

One important insight: much of the explorer's guidance doesn't need to be generated live per user. The "top of the hierarchy" navigation — from broad topics down to specific positions — can be **pre-generated** by a background process that periodically enriches the statement graph with exploration-friendly links.

This pre-generated structure is just data in the statement graph (statements and implication links). The live LLM in the explorer uses it to guide the conversation, but the structure itself is created offline. This means:

- No expensive per-user LLM cost for the basic "browse topics" flow
- The navigation structure can be reviewed and curated
- The live LLM adds value through personalization and conversation, not through generating the structure from scratch

## Nudge UX

As the user becomes more established, nudges become relevant. See [nudge-ux.md](nudge-ux.md) for the full design — graduated visibility, surface area budgets, dismissal, user controls, and filtering strategy. The key point for new users: **no nudges at all until they've signed at least a few statements.** The explorer is the onboarding path, not nudges.

## Relationship to content bootstrapping

See [content.md](content.md) for the broader content strategy.

The new-user experience depends on there being enough content in the system to explore. If the statement graph is nearly empty, even a great explorer and great nudgers can't help. The [seed content](../tech/subsystems/conceptspace/seed-content/README.md) and [content finder](../tech/subsystems/content-finder/) services address this from the supply side; the explorer and nudgers address it from the demand/discovery side.

## What exists vs. what needs to be built

| Component | Status |
|---|---|
| Explorer spec (conversational AI UI) | Specified ([explorer.md](../tech/subsystems/conceptspace/explorer.md)) |
| Explorer implementation | Not built |
| Pre-generated exploration structure | Not built |

For nudge-related build status, see [nudge-ux.md](nudge-ux.md).

## Thinking out loud

(This isn't meant to be in contradiction to the above, or in agreement with the above; I'm just kinda writing up thoughts in my head, trying to work this out from first principles.)

I don't think it's exactly that the "explorer" is an AI-based chat thingy.

I'm not also not quite sure that explorer vs nudger is pull vs push.

There's a whole bunch of statements out there, in a whole bunch of areas. Some of them you've expressed opinions about; some you haven't touched on yet. (I don't just mean explicitly. In fact, I'm expecting that 99.9%+ of statements out there will be ones that you haven't touched - no user is going to touch more than a tiny fraction of the statements out there. That's kinda the point of the implication graph - statements can proliferate and you don't need to care. So what I mean here is that maybe I've expressed some opinions about politics, but not about sports or music.)

And it's fractal: you dive into "politics" and then there are some areas you've touched on and some you haven't. e.g. You've expressed some opinions about markets, but not about immigration or LGBT. (I'm not saying it's cleanly hierarchical, I'm just saying that there's this notion of "I've expressed my beliefs over here but not over there" and that that notion is fractal.)

Ultimately, there are two main "purposes" for using this system:
  - Signing statements, letting your head be counted, feeling like part of a bigger movement.
  - Using the funding system (as a doer or a donor or a delegate or even just as an interested bystander).

And then there are purposes like maybe this common-sense-majority movement, which to some extent can be an emergent phenomenon but also to some extent people might be willing to say "I would explicitly like to participate in this; please nudge me towards common ground" or something like that. So it's still "head count or funding", but... maybe the point is something like "I'm willing to be nudged". (I'm wondering whether the way to do this is: "if you want to see what this CSM movement is about, add the CSM nudger (AKA 'bridge-creator') to your list of nudgers.")

With areas you haven't filled out yet:
  - Do you just not care? e.g. I'm interested in politics but not sports; I have no interest in fleshing out my opinions about sports.
  - Do you feel like your opinions are already roughly expressed even if you haven't gotten into those particular details? e.g. I've already said I'm a right-winger; you can probably infer my likely opinions about immigration and LGBT (although I might surprise you, and the system shouldn't treat those as implications, but they might be candidates for nudges). I *have* opinions about those, but I'm not particularly interested in putting in the effort to be explicit about every single detail, because what's the point? What do I get out of doing that?
  - Or would you actually derive benefit from fleshing out this area, because it would serve one of those purposes up above that you actually care about?

So the point of the explorer is to help you flesh out areas you haven't filled out yet... but only in the service of using this system for a particular purpose that you care about.

It's easy enough to imagine a "what are your interests? page, like lots of other social-media systems have: politics, sports, games, etc. In our system, each of those would be a statement you can sign, like "I am interested in politics." Maybe the list of statements like that is kept by the explorer bot service: it keeps a list of top-level ones, and it also keeps a list of nudges: if you signed "I am interested in politics", it nudges you toward "I have an opinion on abortion", "I have an opinion on LGBT issues", "I have an opinion on markets", etc. And from "I have an opinion on abortion" it might nudge you toward "I am pro-choice" and "I am pro-life".

(And maybe the nudge system in general needs to have a notion of *anti-correlated* statements: mark "I am pro-choice" and "I am pro-life" as anti-correlated, so that so as soon as you've signed one, your UI notices that you've signed something anti-correlated with the other one, and so the other disappears from your nudge list. I worry that this idea is a bit too rigid, though; ideally we'd feed your entire list of signed statements into an LLM and ask it to suggest nudges, except that's expensive and intrusive. Maybe a hybrid, though? Marking anticorrelations isn't a bad idea; the part that's too rigid is the conventional-code in the UI that just completely rules out anticorrelations. But just having the anticorrelation info is fine, and then the user might later swap out the simple rigid nudging UI for a smarter LLM-based one. This is all for later, anyway; I'm just satisfying myself that we're not painting ourselves into a corner.)

(One other thought: it's also possible that people will find our site via a link from someone else who's like, "Hey, I bet you'd enjoy using this site because..." That is, there should be a way for people to create links that suggest particular statement(s) to sign.)

Anyway.

The point of the new-user UX, or the explorer in general, is to help you flesh out areas you haven't filled out yet... but only in the service of using this system for a particular purpose that you care about.

At some point you'll be like, "That's enough, I don't need to explore anymore." That's fine, that's easy, just close the explorer page. So there isn't really any particular reason for the explorer to stop entirely. It needs to avoid making dumb suggestions (like "I'm pro-life" when you've already said "I'm pro-choice") because those are annoying (so let's have this notion of anticorrelations). It needs to avoid filling the suggestion list with a bunch of *redundant* suggestions all at the same time (like "I'm right-wing", "I lean to the right", "I tend to prefer right-wing policies") because that's annoying (so make use of the implication attestations, and also probably have some other notion of "these are fairly similar although not identical"? or just let the explorer keep an explicit collection of statements that are good ones to suggest, and so it can curate that collection to make sure there aren't any duplicates... I need to think this through better). But it doesn't need to look at your collection of signed statements and say "he's probably got enough, no need to suggest more"; you'll just see that the Funding tab has just come alive (because now there are enough signed statements), and you'll close the Explorer page, that's fine.

In any case... at this point I'm kinda thinking that the explorer *should* be a nudger (it's conceptually the right thing: "you might want to sign this"), it should just have a separate page/tab or whatever. Like, there's no reason why the UI can't differentiate between the nudges from different nudgers and show them in different ways.

So... I've talked a lot about what the explorer *shouldn't* do; what *should* it do?

I think basically its role is to generate something like "top-down nudge links from more-general to more-specific"?

I dunno. This is feeling like I'm not following the lean-on-ai.md principle.

Lemme try again:
  - Imagine an intelligent LLM, running continually as a service, whose job is to maintain a nice clean non-redundant hierarchy (or some sort of structure, doesn't need to be a tree) of all the various areas; it doesn't need to capture every possible minor variant of every statement, it just needs to have one statement in each area, so that when a user is interested in fleshing out his statements in an area, the explorer has already pre-identified some useful suggestions for him.
  - This LLM follows all the statements being posted, and when it comes across one that's either better than its current one in that area, or new in some way that genuinely fleshes out its map in an interesting way (not idiosyncratic, but something that the LLM thinks other people will also find interesting), it adds it to its collection (replacing the old one, if any).
  - This LLM isn't aiming to nudge people towards any particular kind of statement (as opposed to the bridge-creator, which is explicitly aiming towards finding common ground with "the other side"). It's aiming to create a reasonably-complete curated map of the space, without redundancy.
  - Its nudges should be based on an algorithm roughly like: (1) Which of the explorer's curated statements has the user signed anything "near"? (I'm not quite sure what "near" means; would the implication attestations do it? Not exactly, but they might be relevant.) (2) Which of the explorer's curated collection of statements are near *that*? (3) Which of those has the user *not* signed anything near? So maybe it needs a notion of "nearness", for which it creates links?
    - The point of this (I think) is that ideally we'd feed your entire list of signed statements into the LLM and ask it to suggest nudges, except that's expensive and intrusive. So how can we approximate that? Well, what would it be doing? It's that algorithm I described up there, except you'd just paste that text into an LLM and ask it to do that job. But if we were to break it down into pieces and try to write it as an algorithm, what does that algorithm need? Primarily "nearness" links. It's not going to do as good a job as just passing the whole thing (including all of the user's signed statements) into an LLM, because the LLM can notice the idiosyncrasies of your statements and tailor its response in an intelligent way, whereas if we separate out the job of "nearness" links then it's more like a snap-to-grid kind of thing. But maybe that's a reasonable compromise. And in fact we can allow either option: if you *want* to point your openclaw at your whole list of statements and ask it for its suggestions instead of using the snap-to-grid thing, you can. But if you don't want to do that, we can have "nearness" links determined by a (dumber?) LLM and use those.
    - Right, so here's a situation where the ideal fully-LLMified algorithm might be too expensive to do (although maybe not, and it's easy enough to make it easy for people to do themselves using their own openclaw or whatever). So we approximate.
    - And also, honestly, we may not even need the full personalized thing, because the main goal might be to just find out where the money is. Plus (despite all of this project's talk about individualization) most people are going to fall into big camps anyway. (I think there are some hidden big camps, but I don't think the final results are going to be that each individual is a unique snowflake; mostly we'll fall into camps and that's fine.) So it might be that the main goal of an "explorer" is just for this LLM to maintain an understanding of what kinds of projects are out there and how much money is out there and what their declared alignments are. In fact, that's a much more practical idea, isn't it? Watch for projects and their alignment attestations; watch for delegatable-notes and their alignment attestations; build a map of statements that encompasses most of that; build a bunch of statements that gets the user from "nothing is known about you at all" to "I know which of those funding areas you're likely to be interested in." It's not a What Are Your Opinions About Everything explorer, it's a Fundable Project Explorer. Right, having a clear goal makes this much easier.
    - So then maybe it also makes sense for "head count" goals to have their own explorer. i.e. Common Sense Majority can have their own explorer designed to elicit the necessary info.

That's starting to feel more like it makes sense.
