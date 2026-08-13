# Causes as publications

**Status: proposed target model.** This document consolidates the product direction
developed in [`aaa.md`](./aaa.md). It describes the model we want to end up with and
the changes needed to get there. Where it conflicts with older CauseStarter guidance,
this document is the intended direction; consequential reversals should be recorded in
an ADR when implemented.

## Summary

Commonality should distinguish three product objects that have sometimes been conflated:

- a **statement** is an immutable proposition a person can sign and a project can
  align with;
- a **cause** is a shareable, mutable publication that explains a purpose and selects
  the statements that define its actionable scope;
- a **vertical operator** runs an independently branded front end with its own audience,
  policies, moderation, and distribution.

The old “cause founder” role splits accordingly: a **cause organizer** curates and
circulates a cause publication, while a **vertical operator** operates software and
policy infrastructure. One person may do both, but the roles are not synonymous.

A cause does not need to be one statement, and a collection of statements does not need
to be turned into a new statement merely to acquire a name or URL. The cause roster is
the named, pointable object. Statements remain the semantic objects used for signing,
support propagation, project alignment, cause boards, and funding intent.

AI should do most of the unnatural translation work between ordinary human intentions
and implication-friendly statements. Humans remain responsible for choosing what they
mean, approving what is published or signed, supplying rhetoric and judgment, and
circulating or operating the resulting cause.

## Why the cause is the top-level division

An earlier objection to packaging signing, alignment, and funding into one surface was that
the features have different audiences: some people want tallies and nothing to do with
money, some want to fund work and do not care about position-taking. That objection was
correct about a **feature-partitioned** product — a Commonality umbrella whose top-level
headings are Tally, LazyGiving, and Alignment — and it is the reason the eight-site design
felt incoherent. It does not apply to a **cause-partitioned** one.

Two things follow from partitioning by cause instead:

- **The features stop looking unrelated.** Within a single cause it is unsurprising that a
  page offers "here are statements you might sign" next to "here are projects you might
  fund." They are aspects of one purpose rather than separate products sharing a login.
- **It matches where the differentiator actually lives.** Against a per-project funding site
  such as Kickstarter, Commonality adds little for a single project in isolation. The value
  appears only across an **ecosystem of aligned fundable projects**: a board with many
  projects sharing a purpose, from which a funder can choose a few, or to which a donor can
  delegate so that someone else evaluates several on their behalf. That comparison is only
  available once projects are grouped by the purpose they serve — which is to say, by cause.

So the generic per-feature surfaces are not the shape to build. The generic surface is
CauseStarter, and the per-feature capabilities appear inside a cause. This is a claim about
how functionality is *organized and presented*; it does not change the object model below,
in which projects still align with immutable statements rather than with a cause.

## Product model

### Statements

A statement is a short, content-addressed proposition. It is immutable and may be:

- signed or opposed by a person;
- connected to other statements by implication attestations;
- used as the target of project alignment or success attestations;
- used to express the intended scope of delegated funding.

Statements need not all be equally useful to the implication graph. A clear statement
may receive many inbound arrows; a broad or awkward statement may receive none and can
still be published and signed. This is not a separate statement type. The UI should
continue to distinguish direct signatures from indirect support so the difference is
visible.

The writing standard is **determinate meaning, not exhaustive detail**:

- Generality is acceptable. A statement such as “I favor a lower overall tax burden”
  expresses one broad proposition even though it does not prescribe every implementation.
- Ambiguity that leaves the asserted proposition unclear is not a safe basis for an
  implication. “I support reasonable gun control” may leave the reader unable to tell
  whether the signer endorsed background checks, registries, bans, or something else.
- Explicitly deferring details can make broad agreement natural and honest, but it does
  not automatically make every proposed implication valid.
- Statement text should remain human and readable. It should not become legalese that
  attempts to enumerate every unclaimed detail or possible edge case.

A useful diagnostic is: **could two sincere readers assign materially different
propositions to the words they just signed?** If so, the statement is ambiguous. If they
agree on the proposition but prefer different implementations or hold additional
unvoiced opinions, it is merely general. This is a judgment aid rather than a formal
proof; uncertain implication pairs should still be rejected conservatively.

### Cause publications

A cause is a versioned roster publication containing:

- a title and short summary;
- founder-authored narrative or rhetorical material;
- an ordered selection of statement CIDs;
- other presentation metadata already supported by the roster schema.

The existing identity model is the intended one:

- `(owner, slug)` is the stable, shareable cause identity;
- its `MutableRef` points to the current roster CID;
- the roster CID identifies an immutable version;
- current and pinned-version URLs remain available.

The narrative is intentionally not signable. It may motivate, persuade, provide context,
or use language that would be unsuitable for implication attestations. Visitors sign
the selected statements, not the founder's page or rhetoric. If the narrative contains
substantive claims worth signing, the organizer or AI can sharpen them into separate
statements.

A coherence attestation may certify that the narrative fairly describes the selected
statements and hides no riders. It is a claim about internal correspondence only. It
does **not** certify truth, merit, good intentions, project quality, moral legitimacy,
or the overall “honesty” of the cause.

Cause pages may compute union, intersection, no-disagreement, or visitor-selected views
over their statements. These are derived displays, not new protocol objects. They should
be labeled literally so that no aggregate is presented as something people signed.

### Anchors and commonality statements

An anchor is an ordinary immutable statement used as a durable proposition for a useful
combination or point of convergence. It is optional. Do not mint one merely to provide:

- a cause name or URL;
- an aggregate supporter count;
- a convenient page grouping;
- a one-click UI operation.

The roster and client-side views already provide those capabilities. A visitor who wants
to endorse several planks can review them and submit the selected signatures in one
wallet batch without pretending they signed a different proposition.

An anchor is warranted when the combination is itself a natural proposition that people
would sincerely sign and use independently of a particular roster. Important examples
include:

- a focused broad claim that receives implications from multiple more-specific views;
- a geographic/topic join useful as a project-alignment target;
- a clearly enumerated conjunction that wholehearted supporters want to adopt;
- a **commonality statement** genuinely implied by modified positions from otherwise
  different groups.

Popularity, roster overlap, or AI preference may suggest anchor candidates, but they are
not semantic evidence that an anchor is meaningful or that implication arrows are valid.

### Projects and delegation

Projects should align at the most useful statement level, normally individual planks or
focused anchors. The implication graph then makes them visible on broader applicable
boards. A cause publication can show the union of the relevant projects without projects
aligning to the mutable publication itself.

Delegation remains authority granted to a person. Its optional purpose constraint should
refer to immutable statement CIDs, not to a mutable cause roster or to everything the
delegate believes. The same AI-assisted statement-selection interaction can help a
delegate describe what they would fund and a donor choose an acceptable scope. This does
not imply that delegation intent must be reactivated as part of the first CauseStarter
change; its unresolved semantics remain a separate product decision.

### Organizers and vertical operators

“Cause founder” currently obscures two roles:

- A **cause organizer/curator** chooses statements, writes the narrative, publishes a
  cause page, recruits supporters, and circulates its link.
- A **vertical operator** deploys or operates an independent front end and owns its
  positioning, policies, moderation, and distribution.

AI-assisted statement drafting reduces the organizer's authorship burden but does not
remove the organizer. The scarce human contributions are judgment, legitimacy,
relationships, commitment, accountability, and distribution.

This distinction refines rather than abandons the founder-first strategy in ADR 0005.
**ADR 0005 remains in force: the platform's strategic customer is the independent
vertical operator.** CauseStarter also serves the lighter-weight role of cause organizer
as reference software and as the operated lens required by ADR 0008. Organizer-facing
work is core when it makes independent operation easier or makes that reference lens
credible; generic umbrella acquisition or promotion remains out of scope. Product copy
and documentation should stop using the two roles interchangeably.

## AI-assisted statement selection

The common reusable workflow is not a shared profile object; it is an **AI-assisted
statement picker** used with different intents:

- cause organizer: “Which statements define this cause?”
- project creator: “Which statements does this project serve?”
- delegate: “Which purposes would I direct money toward?”
- donor: “What scope do I permit this delegate to fund?”
- individual: “Which statements express what I believe?”

We explicitly reject representing a cause page, belief profile, delegate offering, and
project alignment as one stored object. They differ in ownership, mutability, identity,
meaning, and available actions. They reuse the selection interaction and statement
substrate, not a universal profile schema.

The assistant should:

1. converse in ordinary language to understand the user's purpose;
2. search existing statements and the relevant curated explorer map first;
3. present matching statements for explicit selection;
4. draft a new statement only when existing statements do not express the intended
   proposition well;
5. show exactly what will be published, signed, aligned to, or used as funding intent;
6. offer a prominent correction path when none of its suggestions fit;
7. never publish, sign, or attest on the user's behalf without explicit approval.

The target is not a flat stockpile of millions of pre-generated statements. That would
fragment signatures, create duplicates, produce a sparse implication graph, and increase
permanent content and moderation costs. Use small purpose-specific curated maps for
navigation, reuse existing statements where possible, and create new statements on
demand. The underlying graph may eventually become large, but navigation should remain
curated and goal-oriented.

The deterministic UI remains the authority for “what am I approving?” The conversational
assistant may control which statements are proposed or displayed, but final statement
text and CIDs must be rendered outside free-form chat before the user acts.

## Cause assistance versus mediation

The system has two distinct human/AI relationships:

- **Cause assistance** is primarily editorial: help a person clearly express and organize
  positions they already hold.
- **Mediation** is explicitly suggestive or persuasive: propose a modified position the
  person might be willing to adopt in order to create common ground.

They may share an engine and pattern catalog, but they need separate strategies, prompts,
copy, and user expectations. Cause assistance can say “Here is a clearer version of what
I think you mean.” Mediation must say “Here is a modified position you may want to
consider.” It must never present the proposed modification as the user's existing belief.

The hidden-majority pattern catalog is AI strategy, not protocol ontology. Patterns such
as compromise in the middle, factual conditionals, coalition unbundling, deferred details,
and different motivations converging on one solution guide generation; they do not require
new on-chain types.

Coalition unbundling maps cleanly onto the product:

1. **Atomize:** express bundled identities as individual statements.
2. **Reaffirm:** let users explicitly adopt the pieces they really support.
3. **Re-aggregate:** display useful cause views and, where a genuine shared proposition
   emerges, offer a commonality statement as an anchor.

The implication graph must never perform the persuasive step invisibly. An original pole
or moderate statement does not imply a proposed compromise merely because its signer
might accept the compromise after reflection. The user first explicitly adopts a modified
statement; only genuine implications from that modified statement may carry their support
to the commonality statement.

## Implication semantics

Implication attestations represent endorsement of propositions, not mere topical
relatedness, demographic correlation, or likely political sympathy. They must remain
conservative because a false positive attributes an unsigned belief to a person.

The current prompt should be revised in one narrow but important respect: it conflates
logical weakening with changes to rhetoric or emotional framing. Use these rules instead:

- Accept when S2 drops a claim or restricts its claim to a subset of S1's scope.
- Removing rhetoric or urgency may also be valid when the remaining proposition is
  unambiguously contained in S1. This is not permission to add a conciliatory speech act
  or to replace a claim with “this topic deserves attention.”
- Reject when S2 adds acceptance, a concession, a reservation, a bilateral commitment,
  reduced urgency as a substantive position, or any other proposition not contained in
  S1—even when a mediator believes the signer could be persuaded to accept it.
- Reject when the proposition asserted by either statement depends on guessed context or
  remains materially ambiguous.
- Do not reject merely because S2 is broader, has many possible implementations, or does
  not settle every detail.

Examples:

| S1 | S2 | Result | Reason |
| --- | --- | --- | --- |
| “I want taxes lower overall, especially capital-gains tax.” | “I want taxes lower overall.” | Accept | S2 is a strict subset. |
| “I support cutting capital-gains tax.” | “I want taxes lower overall.” | Reject | S2 adds an aggregate-direction claim. |
| “All abortions are morally wrong.” | “Abortions after 16 weeks are morally wrong.” | Accept | S2 restricts the scope of S1's claim. |
| “I support background checks for gun purchases.” | “I support reasonable gun control.” | Reject | The target proposition is underdetermined. |
| “We must immediately repeal this outrageous municipal parking tax.” | “The municipal parking tax should be repealed.” | Accept | S2 retains an explicitly asserted policy while dropping urgency and rhetoric. |
| “Late-term abortion is horrific.” | “I would accept abortion through 16 weeks as a compromise.” | Reject | S2 adds acceptance of a negotiated outcome. |
| “Late-term abortion is horrific, but I would accept abortion through 16 weeks as a compromise.” | “I would accept abortion through 16 weeks as a compromise.” | Accept | S2 is explicitly contained in S1. |

The earlier candidate “illegal immigration is a crisis” → “immigration policy deserves
careful attention” is **not** a valid rhetoric-removal example: “deserves attention” is a
new and underdetermined speech act rather than a retained proposition. The exact boundary
for rhetoric removal should be tested with a focused corpus before changing production
behavior. The invariant is more important than any one example: removing wording may be
valid; introducing a negotiated commitment is not.

## Target user journeys

### Cause organizer

1. Describe the cause in ordinary language.
2. Review relevant existing statements retrieved by the assistant.
3. Ask the assistant to refine or draft missing statements.
4. Explicitly accept, reject, edit, and order the proposed planks.
5. Add a title, summary, and persuasive narrative.
6. Preview the exact page and run the independent coherence check.
7. Publish the versioned roster and stable shareable URL.

### Visitor

1. Follow a link circulated by an organizer or external site.
2. Read the narrative and see the exact statements selected by the organizer.
3. Inspect direct and indirect support and the projects associated with each statement.
4. Select the statements they personally endorse and sign them, optionally in one batch.
5. Fund a project directly or delegate within an explicitly displayed scope.

The visitor is never told that signing one plank endorses the cause page, its organizer,
its rhetoric, or every other plank.

### Project creator or delegate

Use the same statement-selection assistant with intent-specific prompts and actions. A
project creator selects alignment targets and can invite trusted parties to attest to the
alignment. A prospective delegate selects statements describing the funding scope they
offer, then shares a link through which donors can evaluate the person and scope.

## Implementation direction

1. **Align the canonical docs.** Update the statements, explorer, CauseStarter, and
   founder guidance to use this object model and terminology. Record the reversal from
   “founder writes; AI only coaches” to “AI proposes; human explicitly adopts” in an ADR.
   Preserve ADR 0005's vertical-operator strategy and ADR 0008's lens/no-directory posture.
2. **Replace the authoring model.** Make CauseStarter begin with conversational intent
   gathering and statement retrieval, followed by explicit selection and on-demand
   drafting. Reuse the explorer/curator and mediator engine seams rather than creating a
   second semantic graph or another AI-service tier.
3. **Keep the roster central.** Continue using the existing published roster,
   `MutableRef`, version URLs, preview, and coherence-attestation flow. Do not make anchors
   a prerequisite for publishing or sharing a cause.
4. **Add intent-specific picker surfaces.** Share retrieval, drafting, correction, and
   deterministic approval components while keeping cause creation, project alignment,
   delegation scope, and personal belief exploration as distinct workflows.
5. **Refine implication guidance.** Update the implication attester and cause-assist
   guidance around generality, ambiguity, scope restriction, rhetoric removal, and
   negotiated modifications. Add corpus tests before changing accepted production arrows.
6. **Treat anchors as optional output.** Teach the AI the grouping and hidden-majority
   pattern catalogs, but propose an anchor only when it is independently signable and
   useful. Keep views as client-side derived displays.
7. **Defer secondary distribution work.** Embeddable widgets may later render a named
   roster, recomputable metrics, and coherence state on organizer-owned sites. First make
   the stable link, link preview, and ordinary cause-page journey trustworthy and clear.
8. **Preserve existing causes and drafts.** Existing published roster CIDs, stable refs,
   URLs, and history require no migration. Continue reading the current local `CauseDraft`
   shape. When an old local draft is opened, enter the new review/selection flow with its
   title, narrative, and planks intact; do not silently rewrite, publish, or replace any
   statement. Remove legacy-only fields only in a later versioned local-storage migration
   after compatibility coverage exists.

Delegation-intent semantics remain owned by the delegation/NoteIntent product work. They
do not block this change, and this implementation must neither reactivate nor redesign
them incidentally.

## Acceptance criteria

- A non-expert organizer can publish a cause without writing implication-aware prose or
  learning terms such as conjunction, anchor, or implication sink.
- Every AI-generated statement is explicitly reviewed before publication or signature,
  and the user can reject all suggestions and explain what was missed.
- Existing statements are retrieved before new ones are created; the workflow does not
  bulk-generate a permanent statement universe.
- A cause has a stable URL, mutable versioned narrative and roster, and a narrowly labeled
  coherence status.
- Visitors can distinguish the cause narrative, individual statements, derived views,
  direct signatures, and indirect support.
- Signing a statement never implies endorsement of the organizer, narrative, roster, or
  other selected statements.
- Projects align with immutable statements, not mutable cause publications.
- Cause assistance and mediation clearly distinguish clarification from proposed belief
  change.
- The implication-attester corpus accepts genuine subset/scope-restriction cases and
  rejects underdetermined targets and unadopted compromises.
- No anchor is minted solely to provide identity, an aggregate count, a URL, or a
  one-click interaction; every proposed anchor is reviewed as an independently meaningful
  signable proposition.
- Existing published cause URLs and roster histories resolve unchanged, and opening an
  existing local draft preserves all user-authored content without automatic publication.
- The platform model still permits independently operated verticals with their own
  policies and distribution, while allowing lighter-weight organizers to publish causes
  through CauseStarter.

## Non-goals

- A universal directory, search index, or ranking of causes operated by Commonality.
- A canonical cause identity shared across all organizers.
- A cause-wide signature that silently covers a mutable roster.
- A new protocol type for views, grouping patterns, or statements that happen to have no
  inbound implications.
- Automatic publication or signature based on an AI's inference about a user's beliefs.
- Pre-generating every conceivable statement or forcing all rhetoric into attestable
  statement form.
- Reactivating unresolved NoteIntent behavior or building an embeddable widget as a
  prerequisite for the core cause-publication workflow.

## Related documents

- [`docs/founder/shaping-your-cause-statements.md`](../../docs/founder/shaping-your-cause-statements.md)
- [`docs/end-user/common-sense-majority/hidden-majority-patterns.md`](../../docs/end-user/common-sense-majority/hidden-majority-patterns.md)
- [`specs/tech/subsystems/conceptspace/explorer.md`](../tech/subsystems/conceptspace/explorer.md)
- [`specs/product/founder-first.md`](./founder-first.md)
- [`specs/decisions/0005-founder-first-verticals.md`](../decisions/0005-founder-first-verticals.md)
- [`specs/decisions/0008-operated-surfaces-are-lenses.md`](../decisions/0008-operated-surfaces-are-lenses.md)


# Adam's rambling thoughts after all of this

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
