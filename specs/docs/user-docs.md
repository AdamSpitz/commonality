# User Documentation — Structure and Design Decisions

This document describes the intended shape and reasoning behind user-facing documentation. The actual docs should be generated/regenerated from this plan. When the docs need updating, update this plan first, then regenerate.


## Audience

The primary audience is a new user (or an LLM assisting a new user) who doesn't know what Commonality is and needs to understand: what is it for, what can I do with it, why would I want to, and how do I get started.

Secondary: existing users looking up how a specific concept works.


## Core design decisions

### Lead with stories, not abstractions

The system is general-purpose and has a lot of conceptual machinery (assurance contracts, delegation, implication graphs, trust networks, etc.). But the pitch is "each step is individually useful." The docs should mirror that: lead with concrete scenarios, let people absorb concepts through stories rather than definitions.

The walkthroughs are the primary entry point. Each one naturally highlights different subsystems, so a reader who reads two or three of them absorbs most of the key concepts without being "taught" them.

### Use-case navigation, not a single narrative

Different people will arrive with different interests. Rather than a linear "here's how the whole system works" narrative, the landing page offers multiple entry points:
- **Walkthroughs** — pick the story that resonates with you
- **Role-based pages** — "here's what I want to do"
- **Concept pages** — reference, dip in as needed

### No crypto jargon in the main docs

The main docs should talk about "pledges that refund if the goal isn't met," not "ERC-1155 assurance contracts." The trust/transparency story should be told as "the code is open-source, all transactions are public, nobody controls it" — accurate and meaningful without saying "blockchain." A single separate page serves crypto-native users who want the technical details (L2, ERC-1155, IPFS CIDs, Solidity contracts, etc.).

### Human-readable with LLM-friendly structure

Write the docs for humans (narrative, plain language). Then add a structured "TL;DR for AI assistants" block at the top of each concept page: what this concept is, when a user would encounter it, what actions they might want help with. This lets an LLM orient itself quickly without degrading the human reading experience.

### Docs are generatable from this plan

The actual doc files will get out of date as the system evolves. This plan describes the intended structure and the reasoning behind it, so that the docs can be regenerated when things change. When adding/removing/changing docs, update this plan first.


## File structure

```
docs/
  index.md                          — Landing page
  walkthroughs/
    millbrook.md                    — A town replaces its government funding
    noninflammatory-content.md      — Funding better political discourse
    moderate-majority.md            — Discovering the silent moderate majority
    research-funding.md             — Getting a research project funded
    park-slide.md                   — A neighborhood builds a park slide
  roles/
    fund-something.md               — Direct donor: buy tokens for projects you like
    pledge-to-a-cause.md            — Indirect donor: delegate funds to a cause
    get-your-project-funded.md      — Project creator
    get-your-content-funded.md      — Content creator (Twitter/YouTube/Substack)
    become-a-delegate.md            — Delegate: direct others' funds wisely
    help-connect-things.md          — Attester: vouch for project-cause alignment
  concepts/
    assurance-contracts.md          — Pledges refund if the goal isn't met
    credible-threats.md             — Visible pledges change the game even if never spent
    statements.md                   — Expressing what you care about
    implication-graph.md            — How the system connects related causes automatically
    delegation.md                   — Contributing while being lazy
    retroactive-funding.md          — The nano-VC idea; secondary markets
    trust-networks.md               — How you control what you see
    content-funding.md              — Funding individual pieces of content
  why-trust-it.md                   — Open-source, transparent, no one controls it
  for-crypto-natives.md             — L2, ERC-1155, IPFS, the full technical picture
```


## Landing page (index.md)

The landing page has these sections in order:

1. **What is Commonality?** — One short paragraph. No jargon. Something like: "Commonality lets people crowdfund projects and content they care about — without needing an organization, without needing to coordinate, and without risking anything."

2. **See it in action** — The walkthroughs, presented as a menu. Each gets a one-sentence summary and a parenthetical noting which concepts it illustrates. The reader picks whichever resonates.

3. **What can I do?** — Links to the role-based pages.

4. **Key concepts** — Links to the concept reference pages.

5. **Why trust it?** — Link to why-trust-it.md.

6. **For crypto-native users** — Link to for-crypto-natives.md.


## Walkthroughs

Each walkthrough is a concrete end-to-end story showing how pieces of the system fit together in practice. They should be written in plain language, with a specific setting and specific characters.

### A town replaces its government funding (millbrook.md)

TODO: put this later in the list, I think; I have dreams of using this system to transition currently-government-funded things away from being government-funded, but that's a much more far-fetched use case than the simple ones that can happen right away.

Already written as [motivation/walkthrough.md](motivation/walkthrough.md). Adapt for user-facing docs (less spec-like, more narrative). A community's youth program gets defunded; they use Commonality to demonstrate they can fund it themselves, and the mere visibility of locked pledges is enough to make the government back down.

**Illustrates:** assurance contracts, credible threats, delegation, bridges to traditional finance.

### Funding better political discourse (noninflammatory-content.md)

A left-wing writer produces a thoughtful piece that right-wingers can actually engage with. An AI evaluator (trusted by the right) attests that it's noninflammatory. Donors from both sides end up funding it — without coordinating or even knowing about each other — because each side signed statements that the implication graph connected.

**Illustrates:** content funding, AI attesters, implication graph, organic coalition-building.

### Discovering the silent moderate majority (moderate-majority.md)

The arc:

1. **Seeding.** Various people independently sign statements in their own language:
   - From the right: "I'm tired of being told I'm evil for disagreeing"
   - From the left: "I want to persuade, not just preach to the choir"
   - From the center: "Most people are reasonable; the loudest voices aren't representative"
   - Practical: "I'd pay for political content that doesn't make me angry"

2. **Connection.** The implication graph notices these statements all imply something like "constructive cross-partisan discourse is worth supporting." Nobody had to agree on that wording. Nobody had to join a group.

3. **Visibility.** The statement page shows 50,000 direct signers and 2 million indirect supporters (people who signed statements that imply it). That number is itself the news. The silent moderate majority can now see itself.

4. **Action.** A funding portal for this cause now has real demand signal. Delegates start directing funds. Content creators start targeting it. Projects emerge.

**Key emotional beat:** the moment someone sees that number and realizes "oh — there are *millions* of us. We just couldn't see each other before."

**Illustrates:** statements, implication graph, supporter counting, funding portals as emergent phenomena.

### Getting a research project funded (research-funding.md)

A scientist has an idea that's too niche for traditional grants. A delegate with domain expertise spots it and directs pooled funds toward it. An early investor buys tokens betting it'll succeed. When it does, retroactive donors buy and burn tokens — the investor profits, the scientist was funded, and nobody needed a grant committee.

**Illustrates:** delegation, retroactive funding, secondary markets, nano-VC.

### A neighborhood builds a park slide (park-slide.md)

Three families want a slide in their local park. They set up an assurance contract for $2,000. Twelve families pledge. It funds. That's it.

**Illustrates:** the system scales down to trivially small things, no critical mass needed.


## Role pages (roles/)

Each page follows a consistent pattern:
- **What this is** (2-3 sentences)
- **Why you might want to do this** (the pitch, in plain language)
- **How it works** (brief, non-technical)
- **Getting started** (concrete enough to act on, not a click-by-click tutorial)

The roles:

- **Fund something you care about** (direct donor) — Find a project you like, buy its tokens. Or retroactively fund something that already delivered.
- **Pledge funds to a cause** (indirect donor) — Pledge $X or $X/month, delegate to someone you trust, mark it for a cause. Revocable anytime.
- **Get your project funded** (project creator) — Set up an assurance contract. No gatekeepers, no applications.
- **Get your content funded** (content creator) — The content-funding flow for Twitter/YouTube/Substack creators.
- **Become a delegate** (delegate) — Direct others' funds wisely, build a transparent track record. No need to incorporate a nonprofit.
- **Help connect things** (attester) — Vouch that projects align with causes. Your influence grows with followers.

Note: the first role listed should probably be "Find/write statements describing what you care about" — this is what sets up the rest of the site (funding portal, etc.) so that it shows you opportunities relevant to your interests. All of the other roles flow from this.


## Concept pages (concepts/)

Each page has:
- A **"TL;DR for AI assistants"** block at the top (structured: what it is, when a user encounters it, what actions they might want help with)
- A **plain-language explanation** (no crypto jargon)
- A **"how this shows up in practice"** example (referencing walkthroughs where possible)

The concepts:

- **Assurance contracts** — You pledge money toward a goal. If enough people pledge and the goal is met, the money goes to the project. If not, everyone gets refunded. You risk nothing.
- **Credible threats** — Distinct from "pledges refund if not met." The idea that the *visible existence* of locked pledges changes the game even if the money is never spent. One of the most powerful ideas in the system.
- **Statements** — Express what you care about by signing statements. This is how the system knows what to show you.
- **Implication graph** — The system automatically connects related statements ("if you believe X, you probably also believe Y"). This is how people who care about related things find each other without coordinating.
- **Delegation** — Contribute funds but let someone you trust decide where they go. Revocable anytime. Composable (delegates can sub-delegate).
- **Retroactive funding & secondary markets** — Fund things that already worked. Early investors buy tokens in promising projects; later donors buy those tokens at higher prices. The price difference rewards foresight. A nano-VC system for public goods.
- **Trust networks** — You choose who you trust. The system computes transitive trust (if you trust A and A trusts B, you see B's attestations). This is how the system filters noise without central gatekeepers.
- **Content funding** — Any piece of content with a URL can be registered and funded through an assurance contract. Creators claim their channels to receive funds.


## Why trust it? (why-trust-it.md)

Addresses the natural skepticism of "why should I put money into this?" without using crypto jargon:
- The code is open-source — anyone can verify it does what it claims
- All transactions are public — full transparency by default
- Nobody controls it — no company, no admin, no single point of failure
- Assurance contracts mean you risk nothing — pledges refund if the goal isn't met
- Delegation is revocable — you can take back your funds at any time
- Bridges to traditional finance exist — tax receipts still work, charities can act as intermediaries


## For crypto-native users (for-crypto-natives.md)

One page covering:
- Which L2, why
- Smart contract architecture (ERC-1155 assurance contracts, TrustRegistry, etc.)
- IPFS for statement content
- Event cache + client-side folding architecture
- How to interact directly with the contracts
- How to deploy your own platform contract set
- How to run your own attester


## Source material

The walkthroughs and pitches draw from existing spec material:
- [motivation/walkthrough.md](motivation/walkthrough.md) — Millbrook story (already written)
- [motivation/pitches.md](motivation/pitches.md) — Role-based pitches (adapt for role pages)
- [motivation/ease-of-adoption/](motivation/ease-of-adoption/) — "why switching is easy" arguments (feed into why-trust-it and role pages)
- [subsystems/content-funding/noninflammatory-content/README.md](subsystems/content-funding/noninflammatory-content/README.md) — Noninflammatory content use case (feed into walkthrough)
- [motivation/hard-to-stop/credible-threat.md](motivation/hard-to-stop/credible-threat.md) — Credible threat mechanism (feed into concept page)

When generating the actual docs, these specs are the source of truth for how the system works. The user docs should translate that into plain language and concrete stories.
