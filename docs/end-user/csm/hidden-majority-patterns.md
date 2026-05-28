# Hidden-majority patterns

This is the central idea behind [Common Sense Majority](./index.md).

On many polarized issues, the two "sides" that dominate public discourse are actually minority positions. There's a majority — probably a supermajority — that holds an ordinary common-sense view. But nobody can see it, because the current system forces everyone to pick a team, and each team's position is defined by its loudest members. The implication graph and the [mediator](./mediator.md) can make these hidden majorities visible.

For each such issue, the content people write tends to fall into three rough categories:

- **Pole statements** — the positions held by the loudest fringe on each side. They get disproportionate attention, so the two parties end up rallying around them.
- **Normal-people-from-each-side statements** — what most people on each "side" actually think.
- **A commonality statement** — the position that both normal-side statements imply. If anyone bothered to ask, this is probably the supermajority position.

The point isn't that "moderate" or "compromise" positions are always right. In fact, on some issues the common-sense supermajority position may be a rather extreme one. (e.g. Free speech: "just let people say what they want, minus some very specific exceptions like defamation and shouting 'fire' in a crowded theatre" is a pretty extreme position that I suspect is held by most of the population.) The point is that we are *not* actually divided 50-50 into two camps that can't possibly find common ground; if we stopped letting the poles dominate the discourse, the remaining supermajority of normal people wouldn't have that much trouble getting along.

The goal isn't complete agreement — that's both impossible and unnecessary. What matters is recognizing that there's a large group of people on "the other side" who are sane, decent, and workable. Once that moderate majority becomes visible, disagreements don't disappear, but they transform: from *"no communication is possible, our way of life is threatened, we must win at all costs"* into the ordinary kind of disagreement where people can talk, trade ideas, and usually find something both sides can live with.

These patterns aren't just an explanation for readers — they're the working instructions the [mediator](./mediator.md) operates from. They're encoded as examples in its strategy prompt (`bridge-creator/prompts/csm-strategy.md` in the repository), which is open for anyone to read: you can see exactly how it's told to find bridges, or run your own version instead. This page is the *why*; the prompt is the *how*.

## The sub-patterns

There are several distinct kinds of hidden-majority pattern, distinguished by **what's causing the gap** and **what shape the commonality statement takes**.

| Sub-pattern | Nature of the gap | Commonality statement shape |
|---|---|---|
| [Compromise in the middle](#compromise-in-the-middle) | Genuine preference difference with an overlap zone | "I'd accept X" (X in the overlap) |
| [No major controversy](#no-major-controversy-among-normal-people) | Loud fringe drowning out an actual consensus | "Obviously [the thing everyone already agrees on]" |
| [Same values, different beliefs](#same-values-different-beliefs) | Factual disagreement, not a values disagreement | "If X is true, then Y" (conditional) |
| [Misunderstandings](#misunderstandings-of-what-the-other-side-believes) | One side doesn't know what the other actually thinks | "Here's what I actually believe" (corrective) |
| [Coalition unbundling](#coalition-unbundling) | Separate issues glommed together by coalition identity | Atomized per-issue statements + reaffirmation of the rest |
| [Different problems, same solution](#different-problems-same-solution) | Different motivations converging on one policy | The policy itself, with neither side's justification |

### Compromise in the middle

Sometimes the two sides genuinely have different preferences, but there's a middle ground the moderates on each side would prefer to endless fighting.

The natural phrasing differs by category. The moderate-from-each-side statements are usually "I'd prefer…" — they won't *announce* a willingness to compromise (that's not how people naturally talk), but they leave room for it by making clear what their primary concern is while implicitly allowing the other side's primary concern to be met too. The commonality statement is more like "I'd be okay with it if…" — not anyone's ideal, but something there's enough overlap to accept.

**Abortion.** Moderate left might prefer abortion available until *at least* 12 weeks; moderate right until *at most* 16 weeks. The overlap — somewhere in the 12–16 week range — isn't either side's ideal, but it's fine with the moderates on both sides.

**Immigration.** Moderate left might prefer to deport only illegal immigrants who've also committed other crimes, leaving peaceful otherwise-law-abiding people alone. Moderate right might prefer to deport everyone here illegally, with criminals as the priority. A workable commonality statement: "Deport the ones who've committed other crimes; I can accept that some peaceful ones get deported too, and I can accept that some peaceful ones don't."

### No major controversy among normal people

Here a vocal minority — sometimes on one side, sometimes on both — manufactures the illusion of a controversy that barely exists. Most people on both sides actually agree, but the loud fringe gets the attention, so each side assumes "that side" disagrees. The commonality statement isn't a compromise; it's just the obvious consensus almost everyone already holds.

**Policing.** A small number of extreme voices on the left exaggerate or invent examples of police abuse and call to "defund the police." That gets heavy coverage, so the right concludes "the left wants to defund the police" and reflexively opposes even modest accountability reforms. But moderate-left people want to say: "Of course don't defund the police — those extremists don't speak for us" — while *also* not wanting to seem like they're excusing genuine abuses. The right agrees with both halves of that. There's barely any real disagreement.

That doesn't mean left and right moderates are identical. Often the difference is one of *emphasis* driven by temperament: left-leaning people tend to focus on "that officer abused his power," right-leaning people on "make sure the police can do their job." Real differences, but differences in focus rather than in values or even preferred policy.

### Same values, different beliefs

People who would agree with "the other side" if they came to believe the facts were different. These don't resolve the policy fight outright, because the sides still disagree about the facts — but they transform the conflict from *"you're evil"* to *"you're mistaken about the facts,"* which is less heated and gives a concrete focus for productive discussion. The commonality statement is a conditional: "If X is true, then Y." Agreeing to it costs you no face, because you're only committing to what follows *if* the facts turn out a certain way.

**Examples:**

- "If rehabilitating criminals actually works well, great — we should do more of it. If it doesn't work well, we shouldn't keep releasing repeat offenders on the hope that they won't reoffend."
- Right: "Schools are actively pushing kids toward LGBT identities — that's wrong." Left: "They're not pushing anything; they're just being supportive of kids who worked it out themselves." Common ground: "*If* schools really are pushing kids in that direction, that's wrong" — which lets the disagreement become "is that actually happening?", a question of fact.
- "If it's true that black people really do still face systemic racism in America's justice system, I'm in favor of protesting that. On the other hand, if there's no systemic discrimination and black people really do just commit more crimes, obviously they should be arrested and it's silly to protest that." Changes the disagreement from "how could you not support protest of the systemic racism that black people face??" or "how could you excuse this destructive rioting that's being done for no reason??" to an empirical disagreement — most of the people on either side have no desire to excuse systemic racism *or* excuse destructive rioting, they just disagree on what the facts are.

### Misunderstandings of what the other side believes

One side's actual position is something the other side would largely agree with — but the other side doesn't even know that's the position. The commonality statement is corrective: it states what the side actually believes, in a form the other side can recognize as reasonable.

**Culture vs. race.** A large part of the right has a strong preference for Western culture and no particular animus toward anyone for their race. Much of the left doesn't see the culture-vs-race distinction and assumes the right's position is simply racism. A viable common-ground statement makes the real position legible: "I value Western culture. I don't care about your skin color, as long as you join the melting pot. Celebrating different holidays is fine; importing things like Sharia law or rigid caste hierarchies is not. Large-scale immigration is a problem when it outpaces assimilation — but small-scale immigration is fine, and individual legal immigrants who've joined the melting pot are welcome."

The statements here aren't "extreme vs. moderate" so much as "clueless vs. aha":

- *Clueless left:* "I hate racism."
- *Clued-in left:* "I hate racism — and I also value liberal Western culture, and I notice some other cultures are in tension with it (on women's freedom, on caste, etc.). I want to treat everyone equally, but I don't want so much immigration that it overwhelms assimilation."
- *Crude caricature* the left assumes is common on the right (but mostly isn't): blanket contempt for a whole nationality.
- *Moderate right:* "I've got nothing against people of any background who assimilate; it's specific illiberal practices I object to."
- *Commonality:* "Normal people on both right and left have good reasons to value Western liberal culture as distinct from others, even if we weight its aspects differently — and we don't want so much immigration that it erodes that culture."

This pattern is special: unlike the others, the common-sense position here may *not* be the most common one yet. Many people would agree with the "clued-in" version if they seriously considered it — but right now they won't, because without a nudge they'll just sign "I hate racism" and never encounter the more careful statement. So here the system's job isn't only to *reveal* an existing majority; it's to help *create* one, by getting the "clued-in" statement in front of people sympathetically enough that they'll actually consider it. That's exactly what [noninflammatory content](../shared/use-case-walkthroughs/noninflammatory-content.md) and the bridge-creator are for.

(TODO: actually, this pattern isn't really any different from the others, or at least it's a difference of degree, not of kind. With all these patterns, the mediator is still going to need to nudge people in the direction of more-bridgeable statements. Maybe write something up at the top, describing that. Or make all these patterns includes both unnudged and nudged versions.)

### Coalition unbundling

Political coalitions package multiple issues into a single identity bundle — "I support LGBT people," "I'm pro-life," "I'm an environmentalist." People sign the whole bundle because they agree with *most* of it and because rejecting any piece feels like betraying their side. So the bundle's popularity overstates support for each component, and hides the cross-partisan common ground that exists on specific issues inside it.

The mechanism is **atomize and re-aggregate**:

1. **Atomize.** Break the bundle into individual claims. Instead of "I support LGBT people," offer separate statements on same-sex marriage, adoption, anti-discrimination protections, the medical model of gender dysphoria, and so on.
2. **Reaffirm.** Crucially, let people reaffirm the parts of the bundle they *do* agree with. That's what makes it safe to break from one piece: they're not betraying their side, they're being *more precise* about what they believe.
3. **Re-aggregate.** Offer new groupings that cut across the old coalition lines, so someone who supports same-sex marriage but has doubts about one other piece can find common ground with people from the *other* side who reached the same per-issue conclusion.

**Example: "LGBT" as a bundle.** A left-leaning person would automatically click Like on "I support LGBT people." But if encouraged to give their position on each individual issue — in a sympathetic way that makes clear they're not betraying their side — they might sign both "I support same-sex marriage" and something much more carefully worded like: "I'm generally in favor of being kind to minorities, and I support same-sex marriage, and AFAICT being homosexual is a real biological condition that is quite common, but it also looks to me like most of the members of the modern transgender movement don't actually have a biological gender dysphoria condition, so I think it makes more sense to treat them the way I'd treat someone with anorexia rather than the way I treat someone who's gay: I care about you, but this looks to me like a self-destructive life choice rather than an innate characteristic of who you are."

Notice the structure of that second statement: it's designed to be signed by someone who thinks of themselves as being on the left. It reaffirms their commitment to the rest of the issues that the left treats as a package deal with transgender issues (they still support LGB), and it's only making a break with the left's stance on the T. The verbose, careful wording is intentional — it needs to be worded so that signing it doesn't feel like a betrayal. That's the seam: "LGB" separate from "T," where cross-partisan common ground exists on each piece even though the bundle obscures it.

Finding the right seams takes judgment: look for places where part of one side's bundle already fits the other side's positions, watch for people who signed a bundle but *also* signed something in tension with part of it, and let the bridge-creator propose atomizations. (Atomized issues often then fall into one of the other patterns — a factual conditional, a misunderstanding, or a middle-ground compromise.)

### Different problems, same solution

The two sides arrive at the *same* policy from completely different motivations. No values are being reconciled and no facts corrected — they just converge on the same answer for different reasons. The commonality statement is the policy itself, stated without either side's justification attached.

- **Breaking up big tech.** Left: monopoly power hurts consumers. Right: the platforms censor disfavored voices. Both land on "break them up / regulate them heavily."
- **Ending corporate subsidies.** Left: it's crony capitalism enriching the wealthy. Right: it distorts free markets. Both land on "stop subsidizing them."

This pattern is especially actionable: the policy statement gets signed by people from both sides — which makes it fundable — even though the supporters' reasoning is entirely different.

## Cross-cutting techniques

A couple of techniques show up across several of the patterns.

**Conditional / bilateral support.** People often won't sign a commonality statement unless they're confident the other side is signing in good faith too. Structuring statements as mutual assurances — "I'll accept Y, as long as you're also accepting X" — makes the commitment bilateral, so nobody is conceding unilaterally. The visible supporter counts on each side's statement *are* the assurance. (See [conditional support](./conditional-support.md) for why this structure is load-bearing.)

**Defer the details.** Support for a statement often hinges on details that shouldn't be spelled out — because getting dragged into a fight over the fine print destroys the high-level agreement that matters more. Trying to enumerate every case ("punish cops who do A, B, C, D…") is a trap; you'll never agree on the list. The better move is to state the agreement and explicitly defer the details *with a good-faith pledge*: "Cops who abuse their power should be punished. We can work out exactly what 'abuse' means separately — and I mean the ordinary, reasonable sense of it, not some edge case I'm sneaking in." The pledge is the point: you're deferring the details because they're a distraction, not to exploit the ambiguity later. The details can be argued later — that's the ordinary, productive kind of disagreement. What the high-level agreement buys you is the shift from "these people are enemies" to "these people are reasonable and we'll work it out."

## What these statements are for

- **Head count.** Counting the signers shows there's real, large support for these common-sense positions — including from "the other side."
- **Funding.** Projects can align themselves with a commonality statement, and if the hidden-majority thesis holds, they'll attract funding from both sides without either side coordinating. That's the core demonstration of [organic coalition-building](../commonality/vision-and-strategy/why-its-better/organic-coalitions.md).
