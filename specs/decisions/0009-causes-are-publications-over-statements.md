# 0009. Causes are publications over statements

- **Status:** Accepted
- **Date:** 2026-08-13
- **Related specs:** [`specs/product/causes-as-publications.md`](../product/causes-as-publications.md), [`docs/founder/shaping-your-cause-statements.md`](../../docs/founder/shaping-your-cause-statements.md), [`specs/product/founder-first.md`](../product/founder-first.md)

## Context

Commonality had already established immutable signable statements, per-statement project
alignment, derived plank views, versioned cause rosters, and independently operated
verticals. CauseStarter nevertheless treated a cause founder as the author of
implication-friendly statements and treated AI as a coach that must not supply the
draft. That put the hardest and least natural part of the system in front of the user:
ordinary people are not good at writing propositions optimized for conservative
implication attestations.

Several distinct things were also being called a cause. A statement is a proposition;
a roster is a mutable editorial selection; and a vertical is an operated product with
its own policies and distribution. Conflating them made cause pages resemble belief
profiles, tempted us to mint artificial grouping statements just to obtain a name or
URL, and blurred the difference between organizing a cause and operating a vertical.

At the same time, splitting functionality into generic feature sites hid Commonality's
actual advantage. Signing, aligned projects, delegation, and content funding make sense
together when they are presented around one purpose and its ecosystem of projects. They
look unrelated when Tally, LazyGiving, and Alignment are the top-level product divisions.

## Decision

**A cause is a mutable, shareable publication over immutable statements.** Its stable
identity is `(owner, slug)`, its `MutableRef` selects the current immutable roster
version, and the roster contains its narrative and ordered statement CIDs. People sign,
projects align with, and funding intent refers to the immutable statements—not to the
mutable cause publication or its rhetoric.

CauseStarter is the Commonality-operated reference lens for these publications. It
organizes signing, project boards, funding, delegation, and related capabilities inside
each cause rather than presenting the generic feature sites as the primary product.
Organizers distribute stable cause links; CauseStarter provides no universal directory,
ranking, or promotion. Independently operated verticals remain the strategic customer
and continue to own their policies, moderation, positioning, and distribution. A
**cause organizer** and a **vertical operator** are therefore distinct roles, even when
one person fills both.

AI will perform the unnatural translation from ordinary intent to implication-friendly
statements. It must search existing statements first, propose relevant existing or newly
drafted statements, and let the human reject or correct every suggestion. The human must
explicitly adopt the exact final text and CIDs in deterministic UI before anything is
published, signed, aligned, or used as funding intent. Cause assistance may clarify what
a person already means; mediation must be presented separately as a proposed change in
position.

The roster, not an anchor statement, gives a cause its name, URL, narrative, and
composition. Union, intersection, no-disagreement, and visitor-selected groupings are
derived views, not protocol objects. An anchor is an optional ordinary statement and is
warranted only when the combination is itself a useful proposition that people would
sincerely sign, use for project alignment, or use as immutable funding scope. We will
not pre-generate a giant statement universe or create anchors merely for identity,
aggregation, or one-click UX.

A coherence attestation may say narrowly that a roster's narrative fairly describes its
selected statements and hides no riders. It is a positive badge, not an admission gate
or endorsement of truth, merit, morality, project quality, or the organizer.

## Alternatives considered

- **Keep “founder writes; AI only coaches.”** Rejected because it asks users to master
  implication semantics and suppresses the tool best able to do that translation. The
  guardrail we need is explicit human adoption, not a ban on AI-authored proposals.
- **Pre-generate a comprehensive universe of AI statements.** Rejected because it would
  fragment signatures, create duplicates, leave a sparse implication graph, and impose
  permanent publication and moderation costs. Curated navigation plus retrieval-first,
  on-demand drafting gives the useful part without the stockpile.
- **Make a cause a single canonical or grouping statement.** Rejected because a statement
  cannot also be mutable editorial identity without compromising its semantics. Most
  grouping is a free derived view; only independently meaningful propositions deserve a
  statement CID.
- **Use one universal profile object for causes, beliefs, delegate offerings, and project
  alignment.** Rejected because those objects differ in ownership, mutability, identity,
  meaning, and available actions. They share a statement-selection interaction and
  substrate, not a stored schema.
- **Return to feature-partitioned generic products.** Rejected because it obscures the
  ecosystem-of-projects value proposition and makes related actions look like unrelated
  products.
- **Require every organizer to operate a separate site, or make CauseStarter a cause
  directory.** Both were rejected by ADR 0008: the former leaves ordinary visitors
  without a trustworthy recomputable reference, while the latter makes Commonality the
  promoter and admission authority for arbitrary causes.

## Consequences

Cause creation becomes an assisted selection-and-review workflow rather than a blank
implication-aware writing form. Statement retrieval, drafting, correction, and approval
can be shared across cause creation, project alignment, delegation scope, and belief
exploration, but each keeps its own intent-specific workflow and action.

The distinction between immutable propositions and mutable publications stays visible:
signing one plank never endorses the organizer, narrative, current roster, or other
planks. Existing roster CIDs, mutable refs, stable URLs, and version history remain valid;
existing drafts must enter the new review flow without silent rewriting or publication.

Cause-first presentation makes CauseStarter a more substantial operated surface. ADR
0005's founder-first strategy and ADR 0008's lens/no-directory posture remain in force,
including policy-list suppression. This decision refines “cause founder” into two roles;
it does not turn generic umbrella acquisition into platform work.

AI suggestions can still misstate intent, invent duplicates, or confuse editorial help
with persuasion. Retrieval-first behavior, explicit rejection/correction, deterministic
approval, separate mediation language, and corpus-tested conservative implication rules
are therefore product requirements rather than polish.

Revisit if explicit review does not prevent users from adopting statements they did not
mean; retrieval-first selection produces unacceptable duplication or discovery latency;
real organizers need Commonality-authored discovery to distribute causes; or immutable
statement scopes prove inadequate for practical delegation and project alignment.

## Appendix: Adam's rambling thoughts after all of this

(AI, please don't delete or reword this part.)

So... lemme try to wrap my head around what the new model is, and whether it satisfies my earlier feelings.

  - We're going to have AI be much more involved in finding statements and steering the user towards the statements he might want to sign (while being careful not to put words in his mouth). Note that it should look for existing statements *first* and only write a new one when nothing that already exists says the thing; we're not trying to pre-generate a giant pile of statements. And the human always explicitly adopts what he ends up with - the final text and CIDs get shown outside the chat before he acts. A lot of this document is about refining our instructions to the various LLMs that are doing this work.
  - We're going to run the general-purpose CauseStarter site ourselves.
    - This is *in addition to* cause founders running their own verticals, not instead of it - we can't (and don't want to) stop people from making whatever websites they want, and it's a good thing anyway for a cause to have its own site that they made and they control and it has whatever other features they want (e.g. discussion board or whatever). We can provide a widget that shows high-level stats on their cause and a link to the cause's page on CauseStarter.
    - But yeah, CauseStarter is run by us, and it serves as both a convenient default (someone can just start a cause without necessarily starting a website yet) and also a more-trustless reference. It's a generic lens capable of rendering a cause at its stable URL, but organizers - not Commonality - distribute those URLs, and we provide no universal cause-discovery surface. Our reasons for deciding to run it are: partially for reducing friction (we don't need to ask cause-founders to start a website), and partially for increasing the users' trust in the system (our site can be audited; it's much harder for users to audit a whole bunch of separate cause sites). This might cause us legal or moral trouble; our strategy for mitigating (but not eliminating) this is partially that we'll have blocklists, and partially that we're not going to list or rank or promote causes, just host them.
  - A cause has a bunch of statements (AI-assisted because they need to be carefully written in order to participate properly in the implication system), as well as some human-written stuff (name, description) that gets checked to at least make sure it's not saying anything misleading. (We're not endorsing or checking the content, just making sure the whole package is reasonably internally consistent. And we're not censoring it on that basis, just putting up a badge or something.)
  - We have a "two-level" model of our users, in the sense that there are some who'll be more-motivated and willing to do a bit of extra work, and some normies who we basically only expect to do a click or two or fire-and-forget some money. More-motivated roles: cause founder, project creator, delegate who decides where other people's money should go. The cause-founder in particular will probably have to be willing to chat with an AI to figure out what statements he wants to list in his cause, and the project-creator and delegate may also (or they might just choose the statements they see on some cause page). Normies will just come across a link to a cause page (via social media or wherever) and maybe click the Support button (for one or more of the cause's statements) or the Donate button (ditto).
  - So the core use cases are something like:
    - For the CauseStarter site: A cause founder clicks Start Cause, interacts with an AI to create a list of statements and write a description and so on, and then tada he has a link to his cause, which he can then spread around on social media. (Maybe he also sets up a bridge-creator/mediator to try to build bridges to people who wouldn't support his cause but do have *something* in common.)
    - For a particular cause page:
      - A project creator decides to start a project aligned with a particular statement. (That is, most likely he chooses the statement from a cause page's list of statements, but it's important to note that the alignment is declared to be with a particular immutable statement, not with a mutable cause.)
      - An aspiring delegate declares that he'd be willing to direct money earmarked for a particular statement. He can browse the cause board and see a bunch of projects that need money (either money to get funded at all, or money to reimburse the early funders).
      - A donor decides to pledge $X or $Y/month, earmarked for a particular statement. Maybe he delegates the funding decisions to someone he knows and trusts, or to someone who's declared that he's willing to be a delegate.
      - A supporter decides to sign one of the cause's statements, so the number of supporters goes up by one.
      - There's also a specialized cause board showing social-media content aligned with the cause's statements.
      - There's also maybe a place to sign up to receive nudges from the mediator thingy.

This is different from the old eight-UI-domains setup because we've created this one central CauseStarter site, and the various pieces of functionality are features of that site rather than a bunch of separate UI domains. (Simpler and more intuitive from the user's POV.)

It doesn't replace the old "cause founders create their own sites" idea, but it does add to it: we're running the CauseStarter site too, which is a bit harder on us but easier for the cause organizers and better for trustworthiness. Founders who want their own vertical still do that.

This retains the good cause-centric idea (the primary focus here is on a cause as its own thing in itself). A long time ago I objected to the idea of packaging all these features together in one site because the different features aren't obviously related to each other and they kinda have different user bases: some people will enjoy Tally but won't want anything to do with the money stuff, some people will want to fund projects but won't care about any of this "cause" stuff, etc. But that was back when I was imagining grouping by feature rather than by cause: I was imagining a big Commonality umbrella site where the main headings were Tally, LazyGiving, Alignment, etc. But that was both the wrong way to organize the functionality (the top-level division should be into causes, and then each cause can show statement tallies and a project-funding dashboard and so on) and also the wrong product focus. Our core differentiator (from Kickstarter, etc.) is the focus on entire ecosystems of aligned fundable projects; there isn't really much benefit to using LazyGiving over Kickstarter for a single project, the benefit only shows up when you can have a whole dashboard full of many aligned projects and choose to fund just a few, or choose to delegate money to someone so that he can go look at multiple projects and choose which ones to fund. So let's not bother having the generic Tally site and generic LazyGiving site and so on; let's have the generic CauseStarter site and then within each cause it's not really so weird to have it offer users many features like "maybe you might like to sign these statements" and "here are some projects you might like to fund".

Is that about right?
