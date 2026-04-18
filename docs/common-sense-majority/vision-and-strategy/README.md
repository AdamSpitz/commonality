# Common Sense Majority: Vision and Strategy

## What is this?

[Common Sense Majority](../README.md) (CSM) is a movement built on the [Commonality](/docs/vision-and-strategy/README.md) platform. It's an attempt to give a voice and funding power to the hidden moderate majority that's currently invisible because the political system is structured around two coalitions dominated by their loudest members.

CSM does three specific things on top of Commonality's general infrastructure:

1. **Fund noninflammatory content.** Crowdfund social-media content that communicates perspectives across the political divide without being inflammatory. (See [noninflammatory content walkthrough](/docs/use-case-walkthroughs/noninflammatory-content.md).)
2. **Find common ground.** Use AI ([bridge creator](/specs/product/bridge-creator.md)) and the [implication graph](/docs/key-ideas/statements-and-implication-graph.md) to discover and synthesize positions that moderate people from opposing sides can both support. (See [hidden-majority content patterns](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md).)
3. **Make the majority visible.** Count supporters and funding flow to demonstrate that common-sense positions have massive cross-partisan support that nobody knew about. (See [CSM walkthrough](/docs/use-case-walkthroughs/common-sense-majority.md).)

These three work together: noninflammatory content is the *mechanism* for getting bridge statements in front of people; the implication graph is the *structure* that connects independently-authored statements into visible common ground; and the supporter counts and funding portals are the *evidence* that a movement exists.

For how these relate to the other Commonality UI surfaces, see [UI domains](/specs/product/ui-domains.md).


## Why previous moderate-movement attempts fail

"I'm making a movement for moderates" sounds like something lame that's been tried a dozen times. I think this system is genuinely different. But it's hard to explain why, so let me start with what doesn't work.

- **"Here's a centrist take."** Nobody trusts it. It's just some guy's opinion. It's not going to get your side's concerns right.
- **"Here's a left-wing take, here's a right-wing take."** So what? I don't want to read the thing from the other side that's going to piss me off.
- **"Sign this petition for moderation."** A petition with signatures doesn't change anything. And moderates, almost by definition, aren't the kind of people who are fired up enough to sign petitions.
- **"Join our centrist party."** The two-party system makes it nearly impossible for a new party to break in. And centrism-as-ideology misunderstands the problem: the issue isn't that people need a centrist position, it's that people already hold common-sense positions but can't see that millions of others do too.

These all fail for overlapping reasons:
  - (a) A healthy political atmosphere is a public good (non-rivalrous, non-excludable), so normal markets can't produce it and normal organizations can't fund it adequately.
  - (b) Moderates are hard to mobilize because they've got lives, wading into politics is miserable, and they're not the kind of people who are fired up about politics.
  - (c) The political system is structured to prevent new parties from breaking in.


## Why this might actually work

### The key insight: credible neutrality is structurally necessary for cross-partisan trust

A movement that's trying to cross the political divide has a harder trust problem than a single-side movement. Both sides need to believe the system isn't captured by the other side.

I want someone (or something) from *my* side, someone *I* trust, to be filtering the stuff from the other side. If someone like that tells me "hey, read this, it actually makes some good points and reading it won't piss you off," I'd be willing to read it. But in the current world, who exactly is doing that filtering job?

An AI can do it. It won't get pissed off. And it can be trustworthy because:
  - The prompts are open-source, so you can read exactly what criteria it's using.
  - If you don't trust the operator, you can configure your system to trust a different attester — run your own, or trust one run by someone on your side. The trust model is "choose who you trust," not "trust us."
  - The money flows onchain, so nobody can capture the funding pipeline.

This kind of credible neutrality isn't just nice to have. It's *structurally necessary* for the specific problem CSM is trying to solve: getting people to engage with ideas from the other side.

### Three products that address the three problems

**Problem (a): public goods can't be funded by normal markets.**

Solution: We use Commonality's [assurance contracts](/docs/key-ideas/assurance-contracts.md) (which solve the free-rider problem) and [delegation](/docs/key-ideas/delegation.md) (which solves the laziness problem) to crowdfund noninflammatory content and aligned projects.

Notice that funding an *adjective* ("noninflammatory") rather than a *person* is something the legacy system can't really do. How do you fire-and-forget "$X/month for noninflammatory social-media content"? You could find a content creator who's good at being noninflammatory and give him money, but he's still a person — vulnerable to selling out to a media outlet, doing clickbait for ad revenue, etc. The Commonality system lets you fund *content that meets a standard*, as evaluated by attesters you choose.

**Problem (b): participating in politics is miserable for moderates.**

Solution: Noninflammatory content filtering means the discussion isn't miserable. Delegation means you can contribute $10/month and never think about it again. And the entry point is the lowest-friction action possible: just sign a statement saying what you believe, in your own words.

**Problem (c): a new political force needs influence but can't be a normal party.**

Solution: This is a protocol, not a party. Influence comes from:
  - **Head count.** The implication graph connects independently-authored statements, so a statement page can show "50,000 direct signers and 2 million indirect supporters." The *indirect* count — people who didn't sign this exact statement but signed statements that imply it — is the novel metric here: no existing system can produce this number. Petitions only count direct signers; polls only ask the questions pollsters choose. This is a bottom-up demand signal that aggregates across idiosyncratic language. That number is itself the news. (See the [CSM walkthrough](/docs/use-case-walkthroughs/common-sense-majority.md) for the emotional force of this.)
  - **Funding flow.** Money flowing through aligned projects demonstrates that the common-sense majority isn't just a sentiment — it's an economic force. Projects, content creators, and advocacy efforts aligned with common-sense positions attract cross-partisan funding.
  - **Credible threats.** Once a cross-partisan constituency demonstrates its ability to independently fund things it cares about, it shifts negotiating power — even if the independent funding is never used. (See [credible threats](/docs/vision-and-strategy/hard-to-stop/credible-threat.md) and the [defunding walkthrough](/docs/use-case-walkthroughs/defunding.md).)
  - **Routing around, not confronting.** Rather than fighting the political system, you make parts of it increasingly irrelevant. Every function a community funds independently is one less lever that a hostile government can pull. Over time, this creates a [ratchet toward more-local, more-voluntary governance](/docs/vision-and-strategy/so-what/local-government.md) — not through revolution, but through a thousand communities discovering they can do it themselves. This is a long-term vision, but the mechanisms are structural rather than aspirational — see [easier than politics](/docs/vision-and-strategy/so-what/easier-than-politics.md) for why each step along the way produces immediate value regardless of whether the later steps ever happen.

None of this requires winning an election, forming a party, or persuading political opponents. It requires people signing statements, pledging small amounts of money, and delegating to people they trust. The growth curve produces value at every step — walking up a hill, not scaling a cliff. (See [easier than politics](/docs/vision-and-strategy/so-what/easier-than-politics.md) and [immediate value](/docs/vision-and-strategy/immediate-value/README.md).)


### The nudged-statement structure: how common ground actually gets found

This is the part I think is most original.

People sign statements expressing what they actually believe. The [implication graph](/docs/key-ideas/statements-and-implication-graph.md) connects related statements automatically, which is already powerful — it discovers [organic coalitions](/docs/vision-and-strategy/why-its-better/organic-coalitions.md) that nobody had to build. But for the hardest cross-partisan problems, we need something more active: the [bridge creator](/specs/product/bridge-creator.md).

Here's the structure. Take abortion as an example:

- **Moderate left writes** (naturally, in their own words): "I want abortion to be available so that women aren't forced into going through with a pregnancy they don't want."
- **Moderate right writes** (naturally, in their own words): "Late-term abortion is horrific."
- **The bridge creator notices** these don't actually conflict, and synthesizes:
  - **Nudged moderate-left statement:** "I want abortion to be available so that women aren't forced into going through with a pregnancy they don't want. I'd prefer abortion to be available throughout the whole pregnancy, but I don't mind forbidding abortions after maybe the first trimester or so — that would give women enough time to make a decision. I'd rather get this settled than keep fighting over it forever."
  - **Nudged moderate-right statement:** "Late-term abortion is horrific. I'd still rather not see abortions early in the pregnancy, but I don't feel as strongly about it. I'd rather get this settled than keep fighting over it forever."
  - **Common ground:** "I'd be okay with it if abortion were allowed during the first 12-16 weeks, and forbidden after that. I'd rather get this settled than keep fighting over it forever."

The critical features of this structure:

- **People don't sign the common-ground statement directly.** They sign their side's nudged statement. The common ground is *implied* by both nudged statements, but nobody has to feel like they're betraying their side. Face is saved.
- **The nudged statement is not the same as the other side's statement.** It reemphasizes the signer's commitment to their side's principles. A moderate leftie signing the nudged statement is still clearly a leftie.
- **The nudged statement is offered as a [nudge](/specs/tech/subsystems/conceptspace/hints.md), not as an implication attestation.** The system isn't putting words in anyone's mouth. It's saying "you *might* also believe this." The signer can decline. But the nudged-to-common-ground link *is* a legitimate implication attestation, because the nudged statement really does imply the common ground.
- **Noninflammatory content is the delivery mechanism.** How do people even encounter the nudged statement? Through content funded by the noninflammatory content system — content blessed by an attester from *your* side, that *you* trust, that says "hey, take a look at this, I think you might be willing to sign it."

This structure exists at [multiple levels](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md): sometimes it's a compromise in the middle, sometimes it's revealing a consensus that barely has opposition, sometimes it's surfacing shared values masked by factual disagreements, sometimes it's correcting genuine misunderstandings about what the other side believes, sometimes it's discovering that different motivations converge on the same policy. Different shapes of the gap, same basic mechanism for bridging it.


### The conditional-support problem

Across many of these patterns, people are unwilling to concede anything unless they're confident the other side is also conceding in good faith. A left-leaning person might think: "If I admit I don't want to defund the police, the right will use my admission as an excuse to ignore actual abuses of police power." And vice versa.

So commonality statements may need to be structured as mutual assurances:
  - **Left-leaning:** "I'm especially concerned with abuses of police power, but I don't actually want to defund the police, and as long as the right is taking the abuse problem seriously, I'm happy to stand up against the left-wing extremists."
  - **Right-leaning:** "I'm primarily concerned with making sure that police can do their job, but I am in favor of punishing police who abuse their power, and as long as the moderate left is pushing back against this defund-the-police nonsense, I'm happy to keep supporting reasonable efforts to punish bad cops."
  - **Commonality:** "Obviously police should be accountable when they abuse their power, but also obviously don't defund the police. I've got my own opinions about which is a bigger concern at the moment, but in principle I care about both."

The "as long as you're also..." framing is the key — it makes the commitment bilateral. This probably doesn't need a formal mechanism (like an assurance contract for mutual commitments), because the condition ("taking the abuse problem seriously") is inherently subjective — any formal mechanism would require a subjective evaluator anyway, which puts you back in attester territory. The statement language itself does the work, and the supporter counts on both sides' nudged statements provide the confidence: if you can see 500,000 people from the other side signed their version, that's your assurance.

Note that this "I'm primarily concerned with X, but I also agree with Y as long as you also agree with X" structure is load-bearing. It's what makes the implication attester's job legitimate: the nudged statement explicitly contains both X and Y (with priority given to the signer's side), and the common-ground statement also contains both X and Y (without priority). So the implication is genuine — the nudged statement really does straightforwardly imply the common ground. The mutual-assurance framing isn't just rhetoric; it's what makes the implication graph work for cross-partisan bridging.


### The trust model: everything is choosable

All of the mechanisms above depend on people on both sides actually trusting the system. The trust model has three layers:

1. **Trustless infrastructure.** Money flows onchain (Ethereum, smart contracts). Nobody can capture the funding pipeline, cook the books, or freeze accounts. This layer genuinely requires no trust.
2. **Transparent subjectivity.** For the parts that are inherently subjective — evaluating whether content is noninflammatory, whether an implication holds, whether a nudge is fair — we use AI with open-source prompts. The AI posts its reasoning alongside its decisions, often including explicit pro and con arguments before reaching a conclusion. You can read the prompt, read the reasoning, and judge for yourself whether the output is biased. This doesn't eliminate the need for trust, but it makes the trust burden very low: you mainly need to trust that the prompt being run is the one that's published.
3. **Full configurability.** For anyone who doesn't trust even that, everything is choosable:

- **Attesters:** You choose which AI attesters you trust for evaluating noninflammatory content. Run your own if you prefer. The prompts are open-source.
- **Delegates:** You choose who handles your funding decisions. Revocable at any time.
- **Trust networks:** Your [trust graph](/docs/key-ideas/trust-networks.md) filters what you see. Projects and content are surfaced through people you (transitively) trust, not through some central editorial process.
- **Nudgers:** The bridge creator is a nudger you can choose to trust or ignore. Its suggestions appear in your feed only if you've opted in.

Nobody has to trust a central authority. Each person configures their own experience. The system discovers common ground *despite* people having different trusted sources — which is what makes the common ground genuine rather than an artifact of a particular attester's biases.


## What success looks like

The emotional core: a person who's been feeling isolated — who thinks they're the only one in their social circle tired of the anger — visits a statement page and sees: *two million people feel the same way.* Not two million people who joined a movement. Two million people who, independently, expressed something they cared about, and the system revealed that they were all saying versions of the same thing.

The practical core: funding portals for common-sense positions attract cross-partisan money. Content creators see real demand for thoughtful writing. Delegates build reputations for curating quality. Projects aligned with common-sense positions get funded from both sides.

The political core: a demonstrated cross-partisan constituency — with countable supporters and visible funding capacity — can [throw its weight around](/docs/vision-and-strategy/hard-to-stop/credible-threat.md) without being a party. "Ten million people across the political spectrum have supported this position, and there's $50M in pledges behind aligned projects" is a political fact that changes calculations.

Note that signing a statement is cheap — people might sign performatively without genuinely being willing to accept the common-ground outcome. Head counts are useful as a signal, but it's the funding flow that demonstrates real commitment. Money is the harder-to-fake metric.


## What this is not

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. The goal isn't to push a particular point of view. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads. It's about a fair, trustworthy process — not a particular outcome.

## Elevator pitch

See [here](./elevator-pitch.md).
