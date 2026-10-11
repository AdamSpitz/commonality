# Initial prompt to Astra

Take a look at the Common Sense Majority site, and at our bridge-building mechanisms in general. (Please also read docs/end-user/common-sense-majority/hidden-majority-patterns.md.) I want to think through what it'd look like to treat the bridging stuff as a first-class very-important use case (whereas currently it's a bit of an afterthought). Not just improving the UI, but also thinking through how we can use this system to facilitate finding-common-ground and building-organic-alliances for real out there in the world.

e.g. One thought is something like: I'd like the moderate left and the moderate right to start treating the extremists on "their own side" as their opponents. That is, "There are plenty of sane people on 'the other side', and I'd rather ally with them than with the nutty people on 'my side'; I'll push back against the excesses of the extremists on my side." But that sentiment will fail to bootstrap; it might work once there's *already* a large visible common-sense-majority coalition, but in the early stages it fails because it basically amounts to stabbing your own side in the back and giving the victory to your opponent's extremists. (i.e. "Throwing your vote away.") So, e.g., have a statement pattern like, "In principle I would rather ally with the sane moderates on the other side than with the extremists on my side, but until there's actually a viable sane moderate majority/leader on the other side, I'm still going to vote for the mainstream guy on my side even if that guy is nutty; I still consider my side to be the lesser of the two evils; I'm not going to throw my vote away on some sort of centrist candidate while he's still got no chance of winning."

I'm being hand-wavy, but maybe you get what I mean. Help me strategize: how do we make this kind of bridge-building viable, in a way that might actually enable the creation of real alliances?


# Astra's response

**I think the missing piece is a credible path from agreement to cooperation—one that people can enter before they’re willing to change political allegiance.** Your example gets directly at that.

I read the hidden-majority patterns, the conditional-support design notes, the bridge-creator and bridge-cause designs, and the CSM site implementation. There’s substantial machinery for finding and expressing agreement. But the site’s organizing page currently resolves to nudger configuration, and the broader story largely jumps from “make agreement visible” to “coalitions emerge.”

That jump deserves to become a central product problem. (ADAM: Yes.)

**Your proposed statement separates things that politics usually bundles together.**

Someone can simultaneously believe:

- “These people across the divide would be better partners.”
- “My current party remains my best available electoral option.”
- “I want to help create better options.”
- “I’m willing to cooperate on specific things right now.”

The system should make all four legible. Otherwise a vote for the available party gets mistaken for approval of everything associated with it, while willingness to cooperate gets mistaken for a promise to defect.

A possible statement, preserving the protection you’re reaching for:

> I still think voting for my usual party is the better choice among the realistic options. That doesn’t mean I approve of everything its leaders or supporters do. I would rather work with people across the political divide who can make and keep a fair agreement than defend people on my own side who won’t. I’m willing to help build those working relationships now. Changing my vote would be a separate decision, based on the actual candidates and their realistic chances.

(ADAM: fine.)

That can be signed **before** an alternative coalition is viable. It records demand for an alternative without pretending the alternative already exists.

I’d add a related statement about how participants treat each other:

> If someone from another political camp works with me on a shared concern, I won’t present that cooperation as an endorsement of my party or its wider agenda. They can remain opposed to me on other issues.

(ADAM: Yes, good.)

That second assurance matters. People need protection against having a limited concession turned into a public surrender.

I’d also separate basic standards from conditional political cooperation. “I won’t knowingly spread falsehoods about you” should hold even when cooperation fails. (ADAM: That's good too.) “I’ll participate in this joint initiative if these other people participate too” can reasonably be conditional.

**The new pattern is agreement blocked by dependence on an existing coalition.**

The [hidden-majority catalog](../common-sense-majority/hidden-majority-patterns.md) covers misunderstanding, factual disagreement, compromise, unbundling, and so on. Your example adds something distinct:

> We may already agree about the better outcome. What prevents cooperation is that each of us depends on an existing coalition for protection, and neither trusts an alternative to work yet.

This is more than psychological reluctance to “betray my side.” Sometimes the concern is materially correct.

The [conditional-support design notes](/docs/founder/csm/conditional-support-design.md) explicitly consider formal assurance mechanisms and conclude that visible signatures probably suffice. I’d qualify that conclusion:

| What someone needs to know | What provides useful evidence |
|---|---|
| Do others share this view? | Credible support counts |
| Are potential partners willing to cooperate? | Explicit, scoped offers |
| Will they actually follow through? | Completed actions and a track record |
| Can this undertaking succeed? | Relevant people, resources, authority, and a workable plan |
| Is changing my electoral choice worthwhile? | Evidence specific to that election and its available choices |

A large signature count helps with the first question. It cannot answer all five.

There is research supporting the perception-gap premise: Americans can substantially misperceive opponents’ views. But correcting perceptions and building durable cooperation are different achievements. A 2024 megastudy also found that reducing partisan animosity did not necessarily reduce support for political violence or undemocratic practices. Those findings suggest measuring the actual behavior you want, separately from warmer feelings. [More in Common’s research](https://www.moreincommon.com/media/0fmblxb3/the-perception-gap.pdf), [2024 Science study](https://doi.org/10.1126/science.adh4764).

(ADAM: Agreed; gotta start somewhere, but yes, don't assume that merely reducing animosity is enough. Also, maybe the unbundling idea might help? See way down below.)

**I’d build a progression in which each step earns the confidence needed for the next.**

An initial version could support these stages:

1. **Express the agreement and its limits.** “I agree with this outcome; these other disagreements remain.”
2. **Make a specific offer.** “I would help with this project under these conditions.”
3. **Find sufficient counterparts and resources.** Show what is present, what is missing, and who has explicitly committed.
4. **Do something together.** A bounded undertaking with an identifiable result.
5. **Publish what happened.** Including failures, disputes, and whether participants would cooperate again.
6. **Offer a larger next undertaking.** Participants decide again; earlier agreement doesn’t enroll them automatically.


...
ADAM: Interesting. This kind of workflow would need a more-explicit, more-complicated model of projects than we've currently got; currently someone posts a project and people make alignment attestations regarding that project, and that's about it. But lately we've been discussing adding a fancier workflow in other ways that seem related; see [specs/product/structured-fundable-work.md](/specs/product/structured-fundable-work.md). In particular, it feels like we need the idea of a *request* for a project, where some details are specified but some aren't (e.g. ask for someone to build a playground in this park; someone else makes a specific proposal for doing so). Maybe that'd be useful here?

The idea is something like: if you want a project that is meant to be supportable by both sides ("I would help with this project under these conditions", like you said), then you find/create a suitable bridge (pattern of statements, with e.g. modified-left, modified-right, and common-ground statements), and in some way attach that bridge (or just the common-ground statement?) to the *request*, so that any project proposals that aim to fulfill that project-request are explicitly committing to being aligned with that statement. (And so the common-ground statement might be something with all those disclaimers and conditions, like "I'm not necessarily agreeing with either side on B or C or D, etc.") I mean, there's still the question of whether this project actually *will* do an adequate job of being aligned with the statement, but the point is that the people who express support for the request are saying "I'll support a project along these lines *if* it commits to this statement", and the project creator (by creating this project that is explicitly meant to answer that request) is saying "I promise that this project will be done in alignment with that statement".

I'm not sure what's necessary in order to support the rest of your six steps; do you think there are other useful "primitives" that would help here? I'm trying to figure out what needs to be baked into the core protocol versus what can be done out-of-protocol. I'm inclined to treat the project-management stuff as being separate from our funding and statement-signing stuff (which doesn't necessarily mean we shouldn't build it, but I bet suitable things exist already if they can be done offchain), but maybe you've got some ideas for pieces we'd need to build because they have to be done onchain, or something?
...


For example, imagine two groups with a contentious relationship agreeing to fund an independent assessment of a local public-service problem. They retain different explanations and preferred solutions. They jointly approve the assessment’s scope, contribute toward its budget, and agree to publish the findings even if inconvenient.

The first achievement is modest: they commissioned and completed something together without misrepresenting each other. The next proposal can point to that achievement. A third group can inspect it and participate.

That is an organic alliance taking shape. It has shared work, resources, relationships, and a history. It doesn’t yet need a comprehensive platform or common electoral candidate.

(ADAM: Yes, I like that. This mission of "let's get more alliances happening" does seem like it needs that kind of thing, even though it's outside the scope of what I've been working on so far. Still, I'm reluctant to take on too much.)

The funding machinery is particularly useful here: **some undertakings can become viable with a small number of participants.** People can experience successful cooperation long before a national majority exists.

**Reciprocity should be visible at the scale of actual partners.**

“I’ll move when the other side becomes reasonable” has an almost impossible condition. Which people count as “the other side”? Can one inflammatory commentator invalidate everyone else’s cooperation?

The workable version is closer to:

> I will undertake this action with these participants, provided we agree to these terms.

That makes the condition inspectable and gives cooperative people a way to earn trust despite the behavior of people they cannot control.

(ADAM: Right, that makes sense.)

Some conditions can be objective: a budget, a deadline, named organizations participating. Others remain judgments: whether the proposal is fair, whether someone has acted in good faith. The system should show the judgment and who made it.

I wouldn’t rush to put every condition into a smart contract. Existing assurance contracts can handle the funding threshold. Other commitments could initially be versioned, explicit offers administered by an organizer. **Escrow can secure money; it cannot secure goodwill, attendance, or a secret ballot.**

An additional useful mechanism would be simultaneous publication: participants authorize a joint announcement once the named parties approve the same version. That can reduce the risk of being the lone first mover. It would require an appropriate private preparation process; a public onchain signature cannot provide that privacy.

(ADAM: Neat. Does that already exist somewhere, or do we need to write new smart contracts?)

**The implication graph must preserve these distinctions.**

This becomes more consequential as bridges lead to action.

“If a viable alternative emerges, I would consider supporting it” must never roll up into “I support this alternative now.” Likewise:

- Agreement with a principle is not membership in an organization.
- Agreement with several planks is not acceptance of the whole platform.
- Supporting an outcome is not authorizing a particular project or expenditure.
- An inferred supporter is not a confirmed participant.

There’s a related issue in the current conditional-support reasoning: **“I accept Y if X” does not automatically imply unconditional acceptance of Y.** Sometimes the wording separately establishes unconditional agreement with the principle and makes only the action conditional. Sometimes it doesn’t. The attester has to preserve that difference.

The graph can reveal potential cooperation. Consequential participation needs a separate, explicit act.

(ADAM: Agreed to all of that.)

**Making bridging first-class would change what the product helps people accomplish.**

Today, CSM mainly offers suggested statements and routes into the other tools. I’d make a bridge’s public page answer:

- What exactly do these people agree on?
- What disagreements and reservations remain?
- Who has actually accepted the agreement?
- What can they accomplish together?
- What contribution would make that undertaking possible?
- What have they already accomplished?

The existing bridge-cluster and cause-board concepts are a strong foundation. They already preserve different starting points and connect shared statements to funding. The substantial addition is the connection between **agreement, explicit participation, and evidence of delivery**.

CSM could present that whole journey coherently while reusing the existing signing and funding systems underneath. Visitors should be able to arrive at a concrete undertaking and understand how to participate without first learning which product owns each step.

I’d also extend the mediator’s job carefully. After proposing wording, it could help identify:

> “What prevents someone who agrees with this from acting on it?”

Possible answers include missing counterparts, fear of misrepresentation, insufficient money, uncertainty about implementation, or a genuine unresolved disagreement. Those need different responses. Producing another agreeable sentence won’t fix all of them.

**I would change some of the movement’s assumptions and promises.**

The site currently says things like “We removed the organizer” and “Trust … that’s what we solved.” Those claims overreach. Operators still select prompts and featured bridges; people still decide what counts as success; someone still organizes real work.

The stronger promise is that organizers are visible, their judgments are inspectable, and participants can choose whom to trust. Your founder playbook already offers a useful account of recruiting money, execution, judgment, trust, and distribution separately.

Similarly, I’d treat the hidden majority as a hypothesis to investigate issue by issue. Large majorities supporting separate propositions don’t establish a majority supporting the combined platform. An honest finding of limited agreement should count as useful output.

And I’d be careful about making “sane people versus nutty people” the operating membership rule. It expresses the frustration, but leaves the crucial boundary undefined. Someone can hold a radical position and cooperate reliably; someone with centrist positions can behave dishonestly.

For this purpose, the useful tests are concrete: keep agreements, represent others accurately, acknowledge inconvenient evidence, respect the scope of cooperation. Those are things participants can demonstrate.

That also changes the aim of “push back against your own extremists.” I’d make **upholding agreed standards when your own camp violates them** a mark of reliability, rather than requiring denunciations as an entrance fee. Otherwise you recreate a loyalty test before people have experienced any benefit from joining.

(ADAM: Yes, kind of? Different contexts, mostly. For this kind of explicit cooperation with a limited scope, yes. I still think denouncing your own side's extremists is an interesting and useful thing to aim for in other contexts. And in fact your joint-announcement idea is a neat thing that could be used for that: imagine N high-profile left-wing people and N high-profile right-wing people signing a joint statement saying "here's the common-sense stuff we all agree on, and we promise to uphold these standards of civility as long as those on the other side do too", or something like that.)

**My first experiment would be one real bridge with one deliverable.**

Choose a setting where there is a genuine fault line, accessible participants on different sides, and an achievable shared undertaking. It should involve enough disagreement to test the mechanism, but not require settling an entire national controversy.

Then:

1. Have participants independently describe what they want, what they fear losing, and what cooperation would require.
2. Draft the modified statements and common ground with them. Test whether they feel accurately represented.
3. Attach one specific project, an accountable operator, a budget, and a completion criterion.
4. Record explicit participation separately from general agreement.
5. Complete the work and ask whether participants will undertake something else together.

The strongest success signal would be **repeat cooperation across a real divide**, especially when something goes wrong or the result disappoints one participant. Other useful measures are whether both constituencies actually participate, whether the work delivers, and whether anyone feels their agreement was misrepresented.

For the first pilot, most of the organizing can be manual. Let that reveal which missing mechanisms deserve software.

Your larger electoral ambition can remain the destination. But the bootstrap works better if people can help create trustworthy partners while keeping their current electoral fallback. The product’s immediate promise could be: **find people you can work with, make a limited agreement, and build evidence that working together pays off.**


# ADAM: Other thoughts

Another thought (somewhat related, and I'm not sure whether we already have it): One of the aims here is to achieve what I'm thinking of as "set union rather than set intersection" ability to cooperate. That is: part of the goal of Commonality (and the entire project-funding-ecosystem thing and so on) is to simply unbundle unrelated concerns *so that* when expressing agreement and providing financial support don't even *have* to do this kind of annoying dance of "well I agree with you on A but that doesn't mean I agree with you on B or C or D and I'm not gonna vote for your stupid politician who wants to do A and B and C and D".

Like... lots of people have pointed out that our political parties are weird bundles of somewhat-unrelated positions; e.g. it's not obvious why people who are anti-abortion have to also be pro-market or anti-immigration or whatever. It feels like the battle lines could have been drawn in a different way, and it feels like there could be lots of individuals who hold a nonstandard mix of positions. It also feels like there are lots of "single-issue voters" who have moderate views or are just vaguely apathetic about lots of those issues, but hold a very very strong view on one particular issue (e.g. abortion) and so they choose the side that has their preferred position on that one issue, whether or not they hold the rest of that side's bundle of positions.

Whereas if we had a system in which each issue was decided on *separately*, where you voted-for/funded that one thing in a way that was simply independent of your vote/funding decisions on the other things, that would *bypass* the whole annoying need to say "I agree with you on A but not B or C or D"; you simply vote/fund whatever you want on topic A, and the question of whether you agree with the other voters/funders on B or C or D *doesn't even come up*. The Tally page for A, or the funding page for a particular LazyGiving project aligned with A, simply *doesn't show* the opinions of all the supporters on completely-unrelated topics; why would it?

I want to have a page somewhere in the docs describing that idea, so that we can refer to it.

And I want to think strategically about how to bring-about/make-use-of this kind of structurally-better cooperation landscape.

Interestingly, maybe the LazyGiving funding stuff is more-amenable to this than the Tally statement-signing stuff? (Because you're simply funding this one project; there's no verbal statement attached to it.) OTOH, maybe not, maybe people will be worried that if they show support for some project, the people on their side will notice and say "um what are you doing funding that project? I thought you were on our side"; maybe it'd actually be important to make it easy for people who donate to the project to *also* sign one of those disclaimer statements saying "yes I'm supporting this one thing but this doesn't mean I'm betraying My Side". Like, maybe financial contributions to common-ground projects will be more-palatable if there's an optional way to attach a motivation statement in the UI, so that it appears next to your name? I dunno.


# Astra: Responses to Adam's notes — 2026-10-09

These are further proposals, not settled product decisions. I've left the earlier exchange intact.

**Your unbundling point changes my emphasis.** My first response leaned too heavily toward explicit cooperation: people negotiate, make an agreement, execute together, and build trust. That is one useful path, but it would be a mistake to make every bridge require it. A distinctive strength of Commonality is that people can contribute to the same outcome without negotiating a relationship at all.

There are at least three useful modes:

| Mode | What participants need to share | What makes it possible |
|---|---|---|
| Independently fund the same work | Approval of this particular undertaking | Separate reasons, judgments, and funding decisions can converge on one project |
| Cooperate under explicit terms | An outcome plus protections against unacceptable implementations or misrepresentation | A request and proposals that preserve those terms |
| Make a public alliance | A shared undertaking and willingness to be publicly associated | Explicit consent, possibly coordinated publication, and a record of following through |

These aren't mandatory stages. Many people should be able to stay in the first mode forever. The second and third are available when needed. We should spend as much effort making ordinary convergence easy as making difficult negotiations possible.


ADAM: I'm not sure about this, and also this isn't exactly contradictory, but I wonder whether it might be useful to think of this more as a set of primitives or patterns that are useful for cooperation-without-trust. That is, rather than thinking in terms of "modes" or "stages", just have these in the toolbox, and use whichever are useful.
  - Joint publication, must be agreed upon first before revealing.
  - Name a set of participants, and some rules they're agreeing to follow (within some context, for some duration, etc.)
  - What else?



**On “set union rather than set intersection”: yes, with one useful distinction.** We want the union of people willing to fund a particular project for their own reasons, rather than requiring an intersection of agreement across a whole platform. A conservationist, a farmer, and a fishing club may all fund the same river cleanup. None has to adopt the others' reasons or unrelated commitments.

We still need a compatible undertaking. If one wants the river opened to fishing and another wants fishing prohibited, describing both as supporting “a healthy river” hasn't resolved that conflict. And the union of supporters across several projects isn't a mandate for the bundle. A can cooperate with B on one project and C on another without B and C becoming allies.

I wrote a separate reference page for this: [Cooperation without a shared platform](../commonality/vision-and-strategy/why-its-better/cooperation-without-a-shared-platform.md). It distinguishes this idea from unbundling the *jobs* of an organization, which the existing docs already cover.

**The request idea fits very well.** I read [structured fundable work](../../../specs/product/structured-fundable-work.md). Its separation of work identity from funding is useful here, but “please propose a way to achieve this outcome” adds a distinct step. A request can exist before anyone knows the provider, method, price, or even the exact work items that will fulfill it.

A concrete example:

> We'd like an accessible playground in this park. It must remain open to everyone, have no party branding, and include a funded maintenance plan. We invite proposals for the design and construction. Supporting this request does not endorse the organizers' other campaigns.

Someone can propose a design, budget, operator, and maintenance arrangement. Another person can propose a different solution to the same request. A proposal can then point to one or more concrete work items and funding projects. We should preserve those distinctions even if a simple UI presents them together.

I would attach **the exact shared requirements to the request**, and link the bridge cluster as context explaining how those requirements were reached. The modified-left/right statements remain useful ways for people to express their own position; the provider doesn't need to adopt either side's entire statement. Nor should changes to a mediator's bridge page silently change what a provider agreed to deliver.

There are two kinds of terms here:

- **Requirements for the work:** public access, no party branding, a maintenance plan. A provider can explicitly undertake to meet these.
- **Limits on what participation means:** a contributor hasn't endorsed the provider's party or unrelated views. This belongs in how the request and contributions are represented. It isn't necessarily a belief the playground builder must profess.

An explicit acceptance by the provider would be valuable. A third party creating a project that names someone as beneficiary cannot make that promise on their behalf. The record should identify who accepted which version of the requirements, and in what capacity. Claiming a beneficiary identity or receiving money shouldn't silently stand in for acceptance either.

That acceptance answers “what did they undertake to do?” An alignment vouch answers “do I think this proposal serves these requirements?” Delivery evidence and success vouches answer “what actually happened?” Those should stay distinct. A declaration of alignment is not proof of compliance, and neither should automatically import promises about refunds or payout conditions.

**Support for the request also needs a precise meaning.** “I'd like this to happen,” “I expect to contribute if a suitable proposal appears,” and “I've authorized this money to be allocated under these rules” are different acts. The first is already expressible as a statement. The second is useful demand information, but isn't money available to a provider. The third needs actual spending authority and allocation rules.

For an initial version, I would let people support the request, then fund a specific proposal themselves or through their existing delegate. That avoids designing a new pool before we know we need one. If we later want money committed *before* selecting a provider, we must answer who selects, whether several proposals can be funded, what happens if none qualifies, and what changes require renewed consent. Competing proposals should not each count the same money as available to them.

**I don't think my six steps require a general project-management protocol.** Most require durable references and honest presentation, with the work itself coordinated elsewhere. My tentative division is:

| Piece | Smallest useful representation | Why or when it needs contract enforcement |
|---|---|---|
| Request and its requirements | Versioned publication with statement references | Usually doesn't; signing and publication can reuse existing mechanisms |
| Proposal answering a request | Explicit link to the request version, proposed work, and exceptions | Doesn't itself authorize spending |
| Provider acceptance | Authenticated acceptance of the exact proposal/terms | Only if a payout rule is supposed to depend on it |
| Scheduling, tasks, discussion, participation logistics | Existing tools, linked from the proposal | Usually no reason to put these onchain |
| Evidence and evaluations | Linked reports plus attributable alignment/success judgments | Onchain verification matters only where these control a financial right |
| Threshold funding, beneficiary, refunds | Existing assurance-contract machinery where it fits | These are financial rules that must actually be enforced |
| Allocating a prefunded request or adding payout conditions | A separately specified funding policy | Must be enforced if contributors are promised those restrictions |

“Offchain” doesn't have to mean ephemeral or owned by one project-management vendor. A signed, versioned document can be portable and verifiable without a new contract. Conversely, merely describing a spending restriction in a document doesn't make the funds obey it.

So the likely additions are a small request/proposal/acceptance vocabulary and the ability to follow those references. Whether that requires new schemas or can extend existing publications deserves a separate implementation review. The structured-work proposal already calls for onchain representation where duplicate-claim rules require it; that doesn't imply every coordination detail needs the same treatment.

**On simultaneous announcements: the basic workflow exists; the stronger guarantee doesn't come for free.** Ordinary electronic-signature systems can collect approvals on the same document before an organizer publishes it. For example, Docusign supports parallel signing, with the envelope completed after the required signers finish. That is a component we could reuse, not evidence that it provides confidential, conditional public announcements as a finished product. [Docusign's explanation](https://community.docusign.com/tips-from-docusign-155/docusign-trainer-tips-mastering-signing-order-22771).

Safe also supports collecting signatures offchain and executing a transaction once its threshold is met. That is relevant if the shared action is a transaction. It doesn't by itself give us “at least N people from each agreed group,” confidential negotiations, or a public statement by each participant. Offchain signature collection is not automatically private. [Safe's documentation](https://help.safe.global/articles/4956631541-gas-less-signatures).

For a first joint announcement, I'd use a trusted coordinator and explicit conditional publication consent:

> I authorize publication of my name with this exact text if the specified participants have also approved it by the deadline. This approval alone is not an unconditional public endorsement.

Before collecting approvals, agree on the roster or qualifying rules, deadline, withdrawal cutoff, and what happens if the text changes. Publish the approved text and participating names together once the condition is met. A failed attempt stays unpublished under the coordinator's agreement. This reduces first-mover exposure but can't prevent the coordinator or another participant leaking information. No new smart contract is necessary for that pilot.

A contract could later enforce whether a qualifying bundle gets registered or money moves. It cannot stop someone sharing a screenshot early, or force news outlets to describe a joint announcement fairly. Also, a published joint approval shouldn't automatically count as each person's Tally signature without an explicitly authorized and supported signing path.

**Your high-profile joint declaration is a different and worthwhile experiment.** I accept your correction: my warning about denunciations as an entrance fee shouldn't rule out deliberately organizing public resistance to bad behavior within one's own camp. A jointly released declaration could make the cross-camp constituency visible while reducing the exposure of each individual participant.

I'd make its commitments specific enough to assess: correct a false accusation even when it helps one's own party; acknowledge when an opponent upholds the agreed standard; avoid portraying limited cooperation as wholesale endorsement. The reciprocal undertaking could include speaking publicly together when someone is attacked for honoring the agreement. That offers something useful in return for taking the risk.

I would still separate unconditional standards from continuation of the alliance. “If you lie, I may stop cooperating with you” makes sense; “if you lie, I can now lie about you” defeats the purpose. And one outsider's conduct shouldn't cancel an agreement among named participants. Breaches by participants need a way to be identified, answered, and, where possible, repaired.

**On optional motivations next to contributions: yes, as an explanation rather than a second entrance requirement.** A contributor might attach “I'm funding public access to this park; I still oppose the organizer's transport proposal.” Another might simply say “My kids will use it.” Most should be able to leave it blank.

The contribution page can establish the default scope once: funding this undertaking doesn't endorse other contributors or unrelated activities. Then a person can add a specific explanation when the social context makes it useful. The UI should show only a motivation they deliberately attached to this contribution, not infer it from their profile or display their unrelated views. This could initially be an authenticated annotation referencing the contribution; it doesn't obviously require changing the money contract.

Motivation and conditions are different. “I'm doing this because I value open access” explains a contribution. “Release my money only if access remains free” attempts to constrain it. An annotation cannot promise enforcement the funding mechanism doesn't supply.

LazyGiving has an advantage because the funded undertaking can have a concrete scope. But both funding and statement signing can acquire broader social meanings. The useful design principle is to make the scope explicit and consistent across project pages, receipts, share cards, and organizer descriptions, while leaving room for voluntary explanations. The system can't prevent hostile observers drawing their own conclusions.

**Strategically, I'd pursue two experiments without making either depend on the other.** One is ordinary, unbundled funding: help independently motivated constituencies fund useful work, with no requirement to declare an alliance. The other is a deliberately visible agreement, such as your joint declaration or a request with bilateral protections. The first tests whether we can remove unnecessary coordination; the second tests whether we can help when coordination really is necessary.

For the first, an organizer could circulate the same project through several existing cause boards, each retaining its own explanation and trusted evaluators. A creator gets an additional reason to offer genuinely shareable work: it can reach more than one funding constituency. We should check that funding serves their agreed outcome rather than quietly financing an unrelated package. That's a substantive project-design question, not just wording.

The practical scope I would favor is: write up unbundling clearly; hand-author one request with the exact shared terms and invite proposals; reuse existing funding and external coordination; keep a record of where people actually get stuck. Build the missing request/proposal links when they remove repeated friction. Treat coordinated publication as a small, separate experiment. We can make bridging a central use case without first building a complete system for managing alliances.

