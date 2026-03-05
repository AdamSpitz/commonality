# Alignment attestation as a drop-in tool for orgs

The alignment-attestation system — where attesters vouch that a project is aligned with a statement/cause — can serve as a straightforward drop-in for how charities and government agencies already evaluate incoming project proposals.

## The simple version: hardcode a single attester

Today, a charity or government agency has people come in asking for money. The org evaluates whether the project fits its mission and decides whether to fund it. This is exactly what an alignment attester does — it says "yes, this project is aligned with this cause."

An org can adopt Commonality's alignment-attestation system by simply hardcoding itself as the single trusted attester for its funding portal. Nothing changes about the org's decision-making process. They're just recording their "this project fits our mission" decisions onchain instead of in an internal database. The funding portal shows exactly the projects the org has approved, just like before.

This is a minimal-effort adoption path: the org keeps full control over what projects appear, keeps its existing evaluation process, and gets Commonality's infrastructure benefits (transparency, assurance contracts, delegation) for free.

## The gradual opening: accept external attesters

Once an org is using the alignment-attestation system with itself as the sole attester, it's simple to start accepting attestations from others. The org can:
  - Accept attestations from specific trusted partners ("we trust the local university's sustainability department to identify projects aligned with our environmental mission").
  - Accept attestations from anyone, but with the org's own attestations weighted more heavily or displayed more prominently.
  - Use a hybrid: the org's own attestations are "approved," external attestations are "suggested" or "community-nominated."

This is a dial, not a switch. The org can be as open or as closed as it wants, and can adjust over time. The system doesn't force openness — it just makes openness easy once you're ready for it.

The benefit of opening up: the wider community can bring good projects to the org's attention that the org would never have found on its own. Instead of waiting for project creators to come through the front door, the org taps into a network of people who are already out there identifying aligned work.

Rejecting bogus attestations is not actually that hard. If someone attests that a cryptocurrency casino is aligned with your children's literacy cause, you just... ignore it. The org controls which attesters it trusts, so bad attestations don't pollute the funding portal unless the org chooses to display them.

## The common-ground angle

Here's where it gets interesting: the alignment statement is the thing that connects funders to projects. An org that's genuinely open to good projects — even from unexpected sources — can phrase its alignment statement in a way that appeals broadly.

Consider: a progressive environmental org and a conservative rural-community org might never collaborate directly. But they might both care about "clean drinking water for rural communities." If they each write alignment statements about their priorities, and those statements overlap on clean water, the implication-attestation system connects them automatically. A project to install water filtration in a rural town shows up in *both* funding portals — funded by people on both sides who care about the same concrete outcome, without either side needing to acknowledge the other or compromise on their broader ideology.

This isn't forced bipartisanship or kumbaya. Nobody has to agree on *why* clean water matters (environmental justice vs. rural self-sufficiency vs. whatever). The system just surfaces the fact that they happen to agree on *what* should be done, and lets them independently fund the same project.

For an org that's politically motivated, this is actually useful:
  - You can frame your alignment statement in terms that genuinely resonate with people outside your usual coalition, without compromising your core messaging.
  - You get access to a broader pool of potential funders for projects that happen to have cross-cutting appeal.
  - You demonstrate concrete results ("we funded 12 clean-water projects") that are legible to people who don't share your ideology — which is better PR than any amount of rhetoric.

The implication-attestation system does the heavy lifting here. Nobody needs to agree on a single canonical statement. The progressive org says "environmental justice demands clean water for underserved communities." The conservative org says "rural communities should be self-sufficient in basic infrastructure." An implication attester notes that both of these imply "install water filtration in towns with contaminated wells." The project gets funded from both directions.

## Why this matters for adoption

This gives orgs a compelling adoption story at every level of openness:

  1. **Closed (sole attester):** "We're using better infrastructure for the same thing we've always done." Minimal change, immediate benefits.
  2. **Semi-open (trusted partners):** "We're collaborating with allied orgs through shared infrastructure instead of ad-hoc partnerships." More projects surfaced, less coordination overhead.
  3. **Open (community attestations):** "We're tapping into a broad network to find the best projects for our cause." Maximum project discovery, with the org still controlling which attesters it trusts.
  4. **Cross-cutting (common-ground):** "We're funding concrete outcomes that matter to our cause, even when the support comes from unexpected places." Maximum funding pool, demonstrates practical impact across ideological lines.

Each level is strictly better than the previous one (more projects, more funders, more impact), and the org can move at its own pace.
