# Documentation

## To do

  - Update/clarify/organize/flesh-out the specs/documentation:
    - In the `specs` directory, there's lots of stuff: there's a `motivation` subdirectory for trying to explain the goals of this system and how we think it might gain traction and what particular use cases might be and so on; there's high-level specs for how the system should work; there's medium-level specs for technical details about how the system should work; maybe some other categories too, I dunno. I want to maybe try to tease apart those different kinds of things, with the goal of making documentation for several kinds of audiences:
      - "Founder" (either me or an LLM assisting me in that role), trying to figure out the entire big picture of what my goals are and what's realistic and what to build and how to build it and so on. For this, the `motivation` stuff is important. High-level specs are important. Medium-level technical specs are somewhat less important although I still need to be able to look it over.
      - "Product manager" (is that the right term?) (either me or an LLM assisting me in that role), trying to turn the overall vision into a high-level product spec. This role isn't about trying to think through the societal implications, it's just about trying to figure out what we need to build.
      - (What's this role called?) Trying to turn the high-level specs into medium-level specs. Involves making technical decisions, etc.
      - Dev (probably LLM) implementing the code. (Needs technical details. Less need for high-level specs, though having *some* context is probably useful.) A lot of the documentation here is in the form of the project's main README.md and also various other .md files throughout the code base; that's fine and good.
      - User (or LLM whose role is to assist the user). Needs to understand: what is this system *for*? What can I do with it? What might I *want* to do with it? How do I do it? How do I trust that it's safe to use? Etc.
      - What other roles have I forgotten?


In particular, the thing I need to do right now is create documentation for the user (or for an LLM assisting the user). It doesn't need to be complete or polished; I just want to take a first crack at it because I want to figure out whether we can tell a compelling story of "here's this cool system we built, here's why you might want to use it, here's what some typical use cases might be, here's how you can get started."



## AI's thoughts (with my thoughts interspersed)

### Proposed outline for new-user docs

The challenge is that Commonality has a lot of conceptual machinery, but the pitch is "each step is individually useful and you don't need to understand the whole thing." The docs should mirror that — lead with concrete value, then let people drill deeper. (My thought: yes.)

#### 1. What is Commonality? (the 30-second version)
- One paragraph: crowdfund public goods without needing a central organization
- One concrete example (the walkthrough is great for this — maybe a compressed 3-paragraph version of the Millbrook story)
  - (My thought: maybe a few concrete examples? Because yes, part of the problem here is that this system is very general and there are several important early use cases. So maybe two or three stories, each illustrating a different use case? How about we turn motivation/walkthrough.md into a whole directory called walkthroughs, with millbrook.md being just one of them? Make another walkthrough for noninflammatory right->left content funding. Another for open-source software funding, or scientific research (where the point is that the combination of delegation, assurance contract, retroactive funding, and openness makes it much easier to get miscellaneous projects funded that otherwise just wouldn't have happened). Maybe another for something like a slide at a park?)

#### 2. What can I do with it? (role-based entry points)
This is where the pitches.md content lives, but reframed as "here's what you'd actually do":
- **Find/write statements describing what you care about** — this is what sets up the rest of the website (funding portal, etc.) so that it shows you opportunities that you'll care about (all of the things listed below)
- **Fund something you care about** (direct donor) — find an assurance contract for a project that looks good to you, and either buy its tokens from the primary market, or retroactively buy tokens on the secondary market for content/projects that have already delivered
- **Pledge funds to be used for a cause you care about** (indirect donor) — pledge $X or $X/month, delegate it to someone you trust, mark it as "to be used for cause C"
- **Get your project funded** (creator/project lead) — set up an assurance contract, no gatekeepers needed
- **Get your content funded** (content creator on Twitter/YouTube/Substack) — the content-funding flow
- **Help direct money wisely** (delegate) — become a delegate, build a transparent track record
- **Help connect things** (attester) — vouch that projects align with causes

Each of these could be a short "here's the idea + here's how to get started" page.

#### 3. Key concepts (reference, not required reading)
A concept-per-page glossary people can dip into as needed:
- **Assurance contracts** — pledges refund if threshold isn't met
- **Statements & the conceptspace** — expressing what you care about
- **Implication graph** — how the system connects related causes without coordination
- **Delegation** — contributing while being lazy
- **Retroactive funding & secondary markets** — the nano-VC idea
- **Trust networks (Subjectiv)** — how you control what you see
- **Content funding** — funding individual pieces of content

#### 4. How does it work? (the "why should I trust this?" page)
- It's on a blockchain — transparent, no one controls it
- Assurance contracts mean you risk nothing
- Delegation is revocable
- No central org to corrupt or shut down
- Bridges to traditional finance exist (tax receipts still work)

#### 5. Getting started (walkthrough)
An actual step-by-step for a first-time user. Probably the hardest part to write well. Maybe two tracks:
- "I want to fund something" (simplest path: find a cause, pledge to a project)
- "I'm a content creator and someone told me my content got funded"
(My thought: how is this different from #2?)

### Structural questions for you to consider

1. **Who's the primary audience right now?** The noninflammatory-content use case suggests the first real users might be content creators discovering that their stuff got funded, or politically-engaged people who want to fund better discourse. Should the docs be tailored to that specific use case first, or stay general? (My thought: I think I'm imagining various different use cases, so maybe the user can click into whichever one appeals to him?)

2. **How much crypto knowledge do you assume?** The "bridges to tradfi" story suggests you want to minimize the crypto barrier. Should the docs actively avoid crypto jargon, or is there a "for crypto-native users" track? (My thought: yes. Avoid crypto jargon in the main docs, though do emphasize properties like how the code is all open-source and can be trusted to run faithfully and so on, if you can do it in a way that is actually relevant and will make sense to normal people. And then have a single separate page for crypto-natives.)

3. **The walkthrough is your best asset.** The Millbrook story is genuinely compelling. I'd almost lead with a version of it. The risk is that it's a specific scenario (government defunding) and your inaugural use case (noninflammatory content) is different. Do you want a second walkthrough tailored to the content-funding case? (My thought: yes, see above.)

4. **Docs for the user vs. docs for the LLM assisting the user** — you mentioned both in DOCS.md. Are these the same document? An LLM assistant would benefit from a more structured, complete reference. A human user wants a narrative. You could do both: a narrative doc for humans, plus a structured reference that an LLM can consume to answer questions. (My thought: good point. Yes. I mean, my guess is that they both need both, but maybe the entry points are different.)
