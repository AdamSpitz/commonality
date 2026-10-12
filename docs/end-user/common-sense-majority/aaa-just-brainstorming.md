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
  - What else? I mean, in a sense, all the rest of Commonality is primitives like this: assurance contracts, etc. And in fact a lot of the rest of the blockchain world is primitives like that - the whole *point* is cooperation without trust. But still, maybe you get what I mean? Any ideas for more primitive cooperation-without-trust tools to go in the toolkit?



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



# Another prompt

Read docs/end-user/common-sense-majority/aaa-just-brainstorming.md and help me brainstorm. Any ideas for more primitive cooperation-without-trust tools to go in the toolkit? Think about what kinds of trust problems prevent people from working together in society in general or in the world in general; think about how we could structure cooperative efforts so that coordination is less necessary, trust is less necessary; think about what people have in *common* and how it really feels like we ought to be able to work together better than we actually do. If you can't come up with anything, fine, but be creative.



# Astra's response

Yes. I think there’s a rich seam here: **people can want the same outcome and still reasonably reject the arrangement offered for producing it.** They may distrust who gets control, who absorbs failure, whether cooperation becomes a permanent obligation, or whether their contribution will actually matter.

Your unbundling idea removes one of those obstacles: “We don’t need to agree about everything.” There are analogous moves for time, authority, risk, credit, and evidence.

These are brainstorming proposals, not claims that we’ve solved their implementation. Some are small primitives; others are patterns assembled from them.

**1. Cooperate without choosing a shared authority**

> “You trust your evaluator; I trust mine. We proceed when each of us has the assurance we need.”

Suppose two communities want a water-treatment project but distrust each other’s institutions. Each chooses its own inspector. The funding activates when the agreed acceptance conditions are satisfied—including both inspectors’ approvals, if necessary.

They need agreement about the undertaking, but don’t have to settle which institution deserves everyone’s trust.

The primitive is **participant-specific approval conditions attached to contributions**. Different people can reach the same project through different chains of judgment. (ADAM: Oooh, I like that. And it points to a generalization that maybe we should make to the LazyGiving assurance contracts: support arbitrary - or at least more-general - donation conditions? Actually, check, maybe we already have the ability to do something like that?)

This seems especially close to Commonality’s strengths. The interesting generalization is: *we may be able to share actions without sharing epistemic authorities.*

**2. Make cooperation expire automatically**

> “I’ll try this for three months. Continuing requires another yes.”

People may reject a useful arrangement because they fear getting trapped in it: temporary powers become permanent, an experimental policy becomes an entitlement, a coalition claims their support indefinitely.

Give commitments an explicit duration, spending ceiling, and renewal requirement. Budget the exit or restoration work at the beginning.

For example, two groups might agree to a temporary use of a shared building when they would never agree on its permanent ownership or mission.

The primitive is **a bounded commitment with a specified ending**. It reduces how much confidence someone needs about the future. Physical consequences aren’t always reversible, so the relevant question is what can actually end or be restored.

(ADAM: This strikes me as a usage pattern rather than a smart-contract change that we need. Is that right? It still sounds like a good idea; let's have a catalogue of patterns, and maybe we can have an AI service that checks a proposed LazyGiving project and makes suggestions like "hey maybe put an expiration date on this" or whatever. But also: *is* there some way that the blockchain world can provide stuff that would help execute the patterns? e.g. Private keys that work for three months and then stop?)

**3. Make the organizer replaceable**

> “I’m willing to help build this, provided we can continue without you.”

A subtle barrier to cooperation is that success can increase the organizer’s power. You help build a valuable resource, then discover that someone else controls access, the records, the name, or the ability to maintain it.

Design projects so the useful output survives the operator:

- Contributors can export the relevant records.
- Another provider can maintain the result.
- Shared materials have permission to be reused.
- Essential assets have an agreed succession arrangement.

An example would be jointly funding a community information service whose underlying information remains available to competing interfaces.

The primitive is **a continuation right**: an explicit right and practical ability to carry the work forward.

That changes the trust question from “Will this organization always behave well?” to “Can we recover if it stops behaving well?”

(ADAM: Yes, good. Again, sounds somewhat like a usage pattern rather than a new contract I need to write? But also maybe we can make sure there are easy-to-use affordances in the project-creation UI to make stuff like that easier? e.g. "Results will be posted under this IPNS name or MutableRefUpdater name, using this sharing-friendly license", etc. What else could be done along those lines?)

**4. Agree on interfaces instead of decisions**

> “Build your part however you like, as long as it connects here.”

Sometimes we create unnecessary conflict by asking everyone to govern one organization when they could contribute independently to a shared system.

Imagine groups mapping wheelchair accessibility. They don’t need one editorial board, one political identity, or even one preferred app. They need compatible records, explicit provenance, and ways to combine or filter observations.

The primitive is **a contribution specification plus an acceptance test**.

For Commonality, a request could ask for independently useful pieces that fit together: inspect one location, translate one document, maintain one sensor, implement one compatible component.

This is a particularly interesting form of your set-union idea: **the work itself can accumulate without the contributors forming a coalition.**

(ADAM: Yes, "do whatever you want as long as it passes this acceptance test" is probably often better than "do it this way". But also there's a point here about decomposition? Like, the ability to compose and decompose is extremely powerful anywhere we can manage it. But is there anything Commonality can provide that'll encourage/enable/support this kind of decomposition, or is this just "well I hope the world in general finds more ways of doing that"?)

**5. Make incomplete cooperation still valuable**

> “If only a few of us participate, we still get something worth having.”

Assurance contracts address “nothing useful happens unless enough people join.” Another move is to redesign the undertaking so less participation produces a smaller useful result.

Instead of “fund the entire regional accessibility survey,” fund completed blocks of coverage. Instead of “launch a comprehensive alternative institution,” fund one service people can use immediately.

The primitive is **a useful increment**, with its own cost and completion criterion.

This isn’t suitable for everything—a half-built bridge can be worthless—but it’s a powerful project-design question:

> Can we turn this from a threshold problem into an accumulation problem?

That would reduce the amount of coordination the funding mechanism has to solve.

(ADAM: Yes, sounds like more decomposition to me? But it does suggest that maybe we'd benefit from having UIs that understand the whole/parts relationship and can explicitly show "we've got 13/40 completed" or whatever? In a very open-ended way; I'm not suggesting that we try to design a universal UI for showing the whole/parts relationships of everything in the world. And in fact even just venturing into the land of explicitly-representing the projects would be new for Commonality; until now a project has basically just been a textual description. So I'm not sure how much of this should be done by us and integrated into the Commonality UI, versus just being out-of-scope for Commonality... but I feel like it might be relevant enough to be worth expanding into this area, especially in light of the [structured fundable work](/specs/product/structured-fundable-work.md) stuff.

One idea that occurs to me - do we already have something like this? - is that it might be helpful to be able to chain projects together, outputs to inputs, with money conditional on successful completion of each step, or something like that. I vaguely remember doing something sorta like that, but I'm not sure how far we got. Either way, maybe that'd be sufficient to allow an open-ended variety of different mechanisms, without requiring us to invent them all ourselves. We say "here's our notion of a project, it can particpate in our cause-board system by having people vouch for its alignment, and you can attach arbitrary inputs and outputs that can be produced or consumed by whatever smart contract you want" and then it's up to the rest of the Ethereum world - or us, if we get around to it - to invent whatever kinds of mechanisms would be useful.

Does that make sense?)

**6. Reserve a complete combination of contributions**

> “My contribution is available if the other necessary ingredients are available too.”

Money is only one missing ingredient. A project might require a venue, a qualified operator, equipment, permission, and volunteers at a particular time.

A general commitment could say:

> “This room is available on Saturday if an operator and six volunteers commit by Wednesday.”

The toolkit would assemble a feasible combination and activate the reservations together. Unused reservations expire. The same room or volunteer hours cannot count as committed to several incompatible projects.

This extends assurance beyond a scalar funding threshold to **a set of complementary commitments**.

It cannot force someone to turn up. But even an honest reservation system could remove substantial “I can’t commit until they commit” friction.

(ADAM: Sounds good.)

**7. Let people cooperate asynchronously**

> “I can do my part now, even though nobody is ready to do the next part.”

A lot of cooperation requires finding the right people at the same time. Durable, inspectable intermediate results can loosen that requirement.

Someone documents a problem. Someone else later verifies it. A third person produces a design. Another funds implementation. Each leaves something useful for the next person.

The primitive is **a handoff artifact with a clear status, reuse permissions, and remaining needs**.

A request could survive its original organizer. A partially answered request could remain discoverable. Contributors could improve an existing piece instead of recruiting a whole team.

This is cooperation through a shared environment: people respond to useful work left behind by others.

(ADAM: Am I right in thinking that a lot of these ideas fit nicely into the "you can attach whatever inputs and outputs you want" framework?)

**8. Back the people who bear the risk**

> “If helping us exposes you to this specific loss, we have already set aside support.”

Sometimes everyone benefits, but one person takes the dangerous step. The obstacle isn’t doubt that others approve. It’s doubt that approval will turn into help when it becomes costly.

Imagine a business hosting a contentious community event. Many people want the event, but the host bears cancellation costs. Supporters could prefund a narrowly defined cancellation reserve.

The primitive is **a contingent support commitment**, with a trigger, limit, beneficiary, and decision process.

This also applies to smaller things: childcare if a volunteer is needed longer than expected, replacement equipment if borrowed equipment is damaged, transition costs for someone accepting a collective change.

The important move is to stop asking one participant to absorb costs that everyone else treats as incidental. The hard part is agreeing what activates support and keeping promises within the pool’s capacity.

**9. Separate producing the good from allocating its burdens**

> “I support the benefit. I object to being the person who pays disproportionately for it.”

A neighborhood may agree it needs a facility while disagreeing about who hosts it. Contributors may agree a project matters while resenting an equal contribution rule that ignores ability to pay.

A request could therefore contain two distinct problems:

- What useful thing should exist?
- What distribution of costs and inconvenience would make it acceptable?

Possible patterns include rotation, compensation, different contribution types, or a lottery among options participants have already accepted.

The primitive is **explicit burden allocation**.

This seems important because some apparent disagreements about values may actually be objections to an unfair assignment of sacrifice. Better wording won’t fix those; a different arrangement might.

**10. Agree on what happens after learning something**

> “We disagree about which approach will work. We can agree on an experiment and a response to its results.”

Your document already discusses jointly funding an assessment. I’d add **conditional next-step commitments**.

Before a pilot, participants specify:

> “If the result falls in this range, I’ll support expansion. If it falls in that range, I’ll support stopping. Otherwise, we’ll need more evidence.”

They needn’t pretend the experiment settles the whole controversy. The commitment can concern only a small next expenditure.

The primitive is **an agreed observation linked to a bounded action**. Measurement methods and the treatment of inconclusive results belong in the agreement.

This makes disagreement potentially productive: different expectations can coexist while people jointly buy information that changes what they do.

**11. Find acceptable arrangements without requiring a public opening bid**

> “Find something within my limits without making me publicly announce every concession I might accept.”

People may resist revealing flexibility because it will be used against them. Their private acceptable range can be much wider than their public negotiating position.

A tool could collect confidential constraints and seek a compatible proposal: acceptable locations, contribution ceilings, scheduling windows, requirements.

Participants then approve the concrete proposal before anything activates.
The primitive is **a private constraint submission followed by explicit acceptance of a match**.

This is different from simultaneous publication: it helps discover whether an agreement exists in the first place. An initial version would require trust in whoever handles the private inputs; privacy guarantees would need their own design.

**12. Cooperate on protections everyone wants when they lose**

> “We disagree about who should be in charge. We both want limits on what being in charge permits.”

What people have in common can include uncertainty about their future position.

Groups could support portable records, transparent eligibility rules, independent appeals, continuity of access, or the ability to change providers because each can imagine needing those protections.

The primitive is **a reciprocal protection that attaches to a role rather than a favored identity**: whoever is the applicant, minority, departing member, losing bidder, or critic gets the protection.

A useful bridge-finding prompt would be:

> What would both groups want available if the other group controlled this institution?

That could produce concrete fundable infrastructure, even where agreement on the institution’s substantive mission remains impossible.

---

The ideas I’d explore first for Commonality are **independently useful contributions, participant-specific approval conditions, and continuation rights**. They seem capable of making cooperation easier without requiring much ongoing collective governance.

There’s also a useful organizing question for the whole toolkit:

> **What exactly would someone have to trust here, and can we remove that dependency?**

Trust that enough others will join → conditional commitments.  
Trust that everyone agrees → narrow the shared undertaking.  
Trust that the organizer stays good → make replacement possible.  
Trust that the project succeeds → make partial results useful.  
Trust that others will help later → reserve that help now.  
Trust that joining won’t trap you → specify the ending.

The possibility that excites me most is **people building something together while retaining different reasons, different evaluators, different providers, and the ability to leave**. Their commonality can live in the useful thing they produce, without requiring them to become one social or political body.


# My thoughts

I like a lot of these ideas. I'm hoping we don't need to build them all ourselves, and certainly not right now. But maybe there are some enhancements that we could make now, to make our system *open* to users making use of ideas like this if they exist out there in the Ethereum ecosystem. Can you organize these ideas into some categories along those lines? Like... stuff that needs to be part of our core fundable-project system, stuff that can be independent smart contracts that could be made to play nicely with ours even though we don't necessarily know about them explicitly, stuff that's just general usage patterns, etc.? (Or something like that - use your judgment, do what makes sense to you. How would you organize this?)


# Further responses and design sketches — 2026-10-12

These are proposals for discussion, not accepted requirements or a commitment to build them. The code observations below describe the repository inspected today; they do not establish deployed availability or end-to-end UI support.

**Yes: the inputs-and-outputs idea provides a useful organizing principle.** Commonality could make work discoverable, evaluable, fundable, and connectable while leaving communities to invent most of the arrangements around it. But an output needs enough meaning that another participant can tell whether it is a document, an assertion, a permission, or money. Merely attaching an arbitrary contract address would not establish those meanings.

## A division of responsibilities

I would separate five places an idea can live. A single pattern can involve several of them.

| Place | What belongs here | Examples from this discussion |
|---|---|---|
| Shared work representation | Stable references and relationships that let independent tools describe the same work | Requests, proposals, parts, prerequisites, output versions, acceptance criteria, links to funding |
| Financial interfaces | The small interfaces through which funding conditions, contributions, withdrawals, and refunds interact | Existing assurance conditions and purchase/refund paths; any necessary adapter interfaces |
| Optional mechanisms | Particular rules implemented by independent contracts or services | Approval gates, staged payments, contingency reserves, contribution reservations, fallback allocation |
| Authoring and presentation | Help people propose comprehensible arrangements and understand their actual commitments | Decomposition suggestions, a parts view, reuse and handoff fields, condition explanations |
| Usage patterns | Advice about structuring work and cooperation | Try a limited experiment, distribute burdens explicitly, preserve exit, agree on measurement |

The first two are the most plausible Commonality responsibilities. They still need not be one large core smart contract: much of work representation can be versioned metadata, with onchain commitments only where enforcement requires them. The third is where other builders should have room to innovate. The fourth can start in the reference UI and later support domain-specific renderers. The fifth can start as a catalog that humans and an AI assistant consult.

An important boundary: **Commonality displaying a mechanism must not imply that Commonality guarantees its behavior.** A project can be discoverable even when its funding mechanism is not supported by our normal contribution UI. Unknown mechanisms should retain their identity and link to their own interface, rather than being presented as ordinary threshold projects.

## What already exists for conditional donations?

There is more here than my earlier answer acknowledged:

- [`IAssuranceCondition`](/hardhat/contracts/individual-projects/IAssuranceCondition.sol) exposes `hasSucceeded()` and `hasFailed()`, allowing an undecided state as well.
- [`AssuranceContract`](/hardhat/contracts/individual-projects/AssuranceContract.sol) has a condition set once; withdrawal and refund eligibility consult that condition.
- [`ProjectFactory.createERC1155AndAssuranceContractWithCondition`](/hardhat/contracts/individual-projects/ProjectFactory.sol) accepts a pre-deployed custom condition. We do not need to invent a generic project-wide condition slot.
- [`OracleCondition`](/hardhat/contracts/individual-projects/OracleCondition.sol) adapts an external oracle's undecided/succeeded/failed result. [`CancellableCondition`](/hardhat/contracts/individual-projects/CancellableCondition.sol) demonstrates wrapping another condition.
- The [technical composability notes](/specs/tech/subsystems/lazyGiving/composability.md) already discuss condition combinators, progress aggregation, contract recipients, contract pledgers, and refunds into delegated notes. Several of those are proposed compositions, not complete supported products.

That answers part of your question, but **project-wide conditions and donor-specific conditions are different features**. At least three meanings of “donate only if my evaluator approves” are possible:

| Meaning | Where it belongs | What it guarantees |
|---|---|---|
| Only submit my contribution after approval | Donor, delegate, or spending-policy executor | Approval is checked before money enters the project; it does not add a later withdrawal right |
| Let me reserve money now, then contribute after approval | Separate reservation mechanism with its own custody and expiry rules | The reservation has its own conditions until it becomes an ordinary project contribution |
| Accept my money now but release it only under my personal conditions | Separate escrow or a funding mechanism that accounts for individual conditions | Requires explicit accounting for which money is releasable and which money can return |

For the water-treatment example, the simplest arrangement might be two independently approved contributions into one ordinary assurance contract. If everyone instead wants both inspectors' approvals to govern the entire payout, that is a project-wide composite condition. Neither arrangement automatically gives every donor an individually cancellable pledge.

One consequence: reserved money waiting for approval must not be shown as money already available in the project's assurance contract. Otherwise several impressive-looking conditional offers can create a false impression that construction is funded.

There is also a readiness gap beyond the contracts. The [SDK chain reads](/sdk/src/utils/chain-reads.ts) include paths that try to read `threshold` and `deadline` from a condition and fall back to zeros on failure. A generic condition need not expose either. Supporting extensions well therefore includes recognizing condition types and displaying unsupported information honestly, not just passing an address to the factory.

I would first exercise the existing custom-condition path with one concrete approval example, including SDK discovery and rendering, before proposing a new core interface. That experiment should also address deployment order: the current factory takes a condition that already exists, which needs an explicit wiring strategy if that condition must refer to the newly created assurance contract.

## Inputs and outputs: three different connections

Your generalization fits requests, decomposition, handoffs, and many conditional arrangements. I would distinguish these connections even if the UI draws them together:

1. **Work connection:** “B uses the survey produced by A.” This references an artifact and its version, format, and reuse terms.
2. **Decision connection:** “B's funding can release after this evaluator accepts A's survey.” This references a judgment or executable condition.
3. **Money connection:** “A's payout contributes to B; if that contribution fails, funds return here.” This requires actual transactions and defined custody.

None implies the other two. A can produce a useful survey without funding B. A can reach its fundraising threshold without producing a survey. An evaluator can accept a survey without having authority to spend anyone's money.

That distinction also sharpens the phrase “successful completion of each step.” **Funding success is not delivery success.** If B needs A's completed work, B must depend on the relevant delivery evidence or acceptance, not merely A's fundraising condition. And if A needs money to perform the work, withholding all A's funding until delivery creates a financing problem. An advance, staged payment, or reimbursement arrangement must say who carries that gap.

Some older [composability prose](/specs/tech/subsystems/lazyGiving/composability.md) needs qualification before becoming an implementation plan. In the inspected base contract, withdrawal is initiated by the recipient and transfers ERC-20 funds. Naming another assurance contract as recipient does not itself call that contract's purchase function, mint contribution receipts, or establish the downstream refund path. A routing adapter needs to perform those operations and handle a downstream project that has closed or become unsuitable.

Likewise, OR-ing two success conditions does not allocate a budget to exactly one winning proposal. That requires a selection and spending rule. Summing progress does not move matching funds. These are good reasons to preserve the three connections instead of hiding everything behind a generic arrow.

For a first description format, I would sketch optional records along these lines:

- **Inputs:** referenced work/artifact version, required format, whether it is essential or substitutable, who accepts it.
- **Outputs:** expected artifact or world outcome, publication location, reuse terms, evidence requirements.
- **Relationships:** part of, depends on, alternative to, continues, answers this request. Distinct relationships should remain distinct.
- **Funding links:** chain, funding contract, mechanism type/version, and the work scope that money is intended to cover.

These are candidate fields, not a proposed universal workflow schema. Start with one domain and allow namespaced extensions. External tools should be able to preserve unfamiliar fields without pretending to understand or execute them.

## Decomposition can be a product feature

I agree that “hope people decompose things well” leaves too much on the table. Commonality can make a modest but useful contribution without becoming a universal project manager.

Suppose the undertaking is “survey accessibility at these forty venues.” A domain-specific description identifies the forty slots; each completed survey has its own identity and evidence. The generic interface can show the collection and link to individual work items and funding requests.

But “13/40 completed” needs an author and a criterion. Thirteen submissions, thirteen accepted by Alice, and thirteen independently checked are different counts. A useful display could say “13 of 40 accepted by your selected evaluator,” with a fixed version of the forty-item scope. Different evaluators can disagree without requiring one global completion verdict.

The authoring assistant could offer concrete transformations:

- “Could each venue be independently useful and independently funded?”
- “These three tasks all need the same base map. Make it a shared prerequisite?”
- “There are two proposed ways to fill this slot. Show them as alternatives?”
- “Who checks that the independently produced pieces work together?”
- “Does this leave maintenance or final assembly unfunded?”

That last question matters. Decomposition can relocate coordination costs to an unpaid integrator. A useful pattern is to make integration and verification separately fundable work, with their own output and acceptance criteria.

There is a particularly interesting economic move here: **fund interfaces and reusable prerequisites as public goods**. Several otherwise competing projects might all want the same test suite, survey, data conversion, or baseline map. An interface is valuable partly because it lets people disagree about implementation. Commonality could help fund the compatibility that makes independent efforts compose.

Work grouping also needs to preserve funding scope. A parent request and its children should state whether the parent budget covers the children, only integration, or some other costs. The [structured fundable work proposal](/specs/product/structured-fundable-work.md) is already the right place to resolve identity and overlapping claims. A grouping alone must not duplicate the apparent amount of work or money available.

## Expiration: a pattern with optional enforcement

Yes, “make this a three-month experiment” is initially a usage pattern. Enforcing particular permissions for three months is a separate, potentially reusable mechanism.

A private key does not itself expire. A contract or smart account can stop accepting that key's authority after a specified time, and can restrict which actions it authorizes. Session keys are an existing smart-account pattern; their constraints are enforced by wallet-specific validation, not supplied automatically by ERC-4337. See the [ERC-4337 session-key documentation](https://docs.erc4337.io/smart-accounts/session-keys-and-delegation.html).

For example: “This operator may publish updates to this project's reference until January 1,” or “This account may spend up to the agreed budget on these permitted actions during the trial.” That belongs naturally in an optional controller or wallet mechanism, with Commonality showing the terms.

Expiration must apply to the authority that actually matters. If the operator can use its temporary permission to appoint a permanent controller, grant lasting token allowances, or transfer the assets away, the apparent expiry provides much less protection. A useful design restricts those escape routes as part of the permission.

Also, our current threshold deadline is not an experiment's hard ending. [`ValueThresholdCondition`](/hardhat/contracts/individual-projects/ValueThresholdCondition.sol) makes refunds eligible when the deadline passes below threshold; it does not permanently latch failure, and later funding can satisfy the threshold. A hard expiry needs explicit terminal semantics. Conditions that compose must specify whether their answers can change over time; never reporting success and failure simultaneously is necessary but insufficient for safe financial composition.

## Replaceability: make handoff a deliverable

Your publication-and-license fields would help. I would extend them into a small optional “Can someone continue this?” section:

| Field | Question it answers |
|---|---|
| Versioned output reference | What exact material was delivered? |
| Current publication reference | Where do updates appear? |
| License and covered materials | What may another person reuse, including source data and editable files? |
| Export format and instructions | Can another provider actually use it? |
| Storage or hosting commitment | Who keeps the material available, and for how long? |
| Controller and replacement procedure | Who can update the shared pointer or operate the service after departure? |
| Handoff test | Has someone else successfully retrieved and used the result? |

A mutable pointer answers only part of this. [`MutableRefUpdater`](/hardhat/contracts/utils/MutableRefUpdater.sol) stores names under `msg.sender`; it does not contain a built-in mechanism for transferring Alice's named reference to Bob. A controller contract could own the reference and implement replacement rules, or successors could publish new references with an explicit succession relationship. Those are different continuity guarantees.

Similarly, a content reference identifies material but does not by itself arrange continued hosting. And a license declaration does not establish that the publisher owns all necessary rights. The form can record commitments and evidence without claiming to prove them.

My favorite small addition would be **a funded handoff rehearsal**: a second provider demonstrates that it can reproduce the service or use the exported material. “Someone else has done it” is much stronger evidence of replaceability than a checkbox saying “portable.” This can be an ordinary work item rather than new protocol machinery.

## Where the twelve patterns land

| Pattern | Smallest useful start | Optional mechanism or later support |
|---|---|---|
| Different trusted evaluators | Separate approval decisions before contributing | Approval conditions or individually governed reservation pools |
| Expiring cooperation | Duration, budget, renewal, and exit terms | Expiring permissions, hard-deadline escrows, restoration reserve |
| Replaceable organizer | Reuse, export, hosting, and handoff commitments | Replaceable controller, succession registry, funded handoff test |
| Compatible independent parts | Versioned input/output specification and acceptance test | Domain schemas, test runners, compatibility attestations |
| Useful partial completion | Work collections and independently fundable parts | Domain-specific progress views and allocation policies |
| Complementary reservations | Named resources, availability periods, confirmation states | Reservation service or contracts where resources can be represented faithfully |
| Asynchronous cooperation | Discoverable artifacts, reuse terms, remaining needs | Matching services and notifications for newly satisfied prerequisites |
| Backing risk-bearers | Explicit loss definition, support cap, adjudicator | Separately funded contingent-support pool |
| Allocating burdens | Record who bears which costs and accepted distribution | Rotation, compensation, or allocation mechanism |
| Acting on evidence | Experiment plan, measurement, bounded follow-up offers | Oracle adapters and conditional spending policies |
| Private negotiation | Confidential coordinator and explicit approval of final terms | Privacy-preserving matching, separately designed and evaluated |
| Reciprocal protections | Role-based requirements on proposed work | Appeal, access, portability, and governance mechanisms appropriate to the domain |

Physical reservations deserve a qualification: a contract can prevent duplicate use of a reservation record within its own system, but cannot prevent someone promising the same room elsewhere. Such tools need identifiable issuers and evidence of authority. The representation should say who promised the resource and what remedy exists if it is unavailable.

For the contingent-support and burden-allocation patterns, the promising common move is **funding the terms that make participation acceptable**. Perhaps the project already has enough supporters, but its budget omits childcare, access accommodations, handoff, restoration, or a cancellation reserve. Funding those can unlock cooperation more directly than recruiting additional signatures.

## An AI reviewer with a small pattern catalog

I like your reviewer idea. It could be useful before any new financial mechanisms exist. Each catalog entry could contain: the obstacle it addresses, when it is applicable, a suggested change, an example, and what remains unenforced.

The reviewer should return a few specific suggestions tied to the proposal. For example:

> “Your proposed directory could outlive its original operator. Add an export format and a budget for keeping the data available.”

> “This project depends on another group's survey, but the survey has no referenced version or acceptance criterion.”

> “You propose a three-month experiment, but the budget contains no restoration work. Would a separately funded restoration commitment make participation easier?”

It should distinguish a text edit, a structured declaration, and an executable change. Adding “refund if the assessment fails” to prose must not manufacture a refund guarantee. When no supported mechanism implements a suggestion, the reviewer should say so and leave it as a design question.

This could also serve a mediator: after finding a shared outcome, ask each participant what arrangement would make acting on it acceptable. The answer might be a smaller scope, independent evaluation, limited exposure, or practical exit. Then offer a relevant pattern instead of repeatedly polishing the common-ground statement.

## A small next step, and a few further ideas

I would develop one worked example across these layers: a reusable accessibility survey, independently fundable venue reports, two evaluators, and a follow-up project consuming the reports. First describe it using current publications and funding. Then identify precisely which connections the SDK/UI cannot preserve or explain. That would test the proposed work vocabulary and the existing condition interface without requiring a general workflow engine.

For possible near-term enhancements, my shortlist is:

1. Optional, versioned work references and explicit relationship types, aligned with structured fundable work.
2. A way to identify and explain an external funding mechanism, with an honest unsupported state.
3. A small pattern catalog and project-review prompt.
4. One end-to-end custom-condition example to expose actual contract/SDK/UI gaps.

Two further patterns seem worth adding to the brainstorm:

**Fund the missing connector.** If several projects are blocked on the same reusable input, show that common dependency as a funding opportunity. An independent contributor can unlock several efforts by producing it. This requires evidence of actual demand: “three people linked this prerequisite” is weaker than “three downstream providers accepted this specification and committed to using it.” It can start as discovery, without a central allocation algorithm.

**Make commitments about the downside.** A participant may be unsure whether a project will deliver its advertised benefit but quite clear about the harms they cannot accept. A proposal can specify a capped exposure, protected access, a restoration plan, or a stop condition. People might fund an experiment whose upside they disagree about because they accept the bounded downside. This composes expiration, burden allocation, evidence, and contingency funding; it does not make physical harms reversible by declaration.

The broader opportunity is to help people change the arrangement until cooperation becomes individually reasonable. Commonality can support that by preserving the terms, exposing the dependencies, connecting compatible efforts, and making the actual financial rules intelligible. Most of the creativity can remain with the people proposing the work.
