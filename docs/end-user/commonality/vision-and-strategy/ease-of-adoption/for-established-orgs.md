# Commonality is a tool that existing orgs can use

The point isn't "charities are bad and we should replace them." It's that charities themselves ought to be [enthusiastic](../so-what/enthusiastic-adoption.md) about using Commonality as [infrastructure](./rails.md).

The friendliest on-ramp of all is [matching funds](../credible-solution/matching-funds.md): something every org already understands and feels good about, and a low-threat way to shift the needle from big-org funding toward crowdfunding.

## What a charity already has (and what it doesn't love)

A charity already has a cause, donors who trust it, and expertise in evaluating projects. What it *doesn't* love dealing with: organizational overhead (staff, offices, compliance, fundraising operations), donor skepticism about where money goes, and the difficulty of convincing new donors that this charity specifically is worth trusting.

Commonality helps with all three. A charity (or even a well-known individual associated with one) can act as a delegate: donors send funds via delegatable notes, the charity directs those funds toward aligned projects, and the entire chain is transparently visible onchain. The charity keeps doing what it's good at — evaluating projects and making funding decisions — but without needing to run a whole organization around it. No bank accounts to maintain, no annual reports to produce (the blockchain *is* the report), no overhead to justify.

This is also a much easier sell than getting government to adopt any of this. A charity director doesn't need to win an election or pass a law. They just say "hey donors, here's a new way to give to our cause — you get full transparency, your money is refunded if we don't hit our target, and you can revoke your delegation at any time."

## The trust problem, solved

A new charity faces a brutal chicken-and-egg: you need donors to trust you, but donors want to see a track record. With Commonality, a new delegate can start small — direct a few small delegatable notes toward good projects — and their track record is right there onchain for anyone to verify. No need to incorporate a nonprofit, hire an accountant, and produce glossy annual reports just to demonstrate trustworthiness.

## Alignment attestation as a drop-in

The alignment-attestation system — where attesters vouch that a project aligns with a cause — serves as a straightforward drop-in for how orgs already evaluate proposals.

**Start closed:** Hardcode your org as the single trusted attester for your funding portal. Nothing changes about your decision-making process. You're just recording "this project fits our mission" decisions onchain instead of in an internal database. Minimal effort, immediate benefits.

**Open gradually:** Once you're using the system with yourself as sole attester, it's easy to start accepting others:
  - Accept attestations from specific trusted partners.
  - Accept attestations from anyone, but weight your own more heavily.
  - Use a hybrid: your attestations are "approved," external ones are "community-nominated."

This is a [dial, not a switch](./dial-not-switch.md). The org controls the pace.

**The common-ground angle:** Here's where it gets interesting. A progressive environmental org and a conservative rural-community org might never collaborate directly. But they might both care about "clean drinking water for rural communities." If they each write alignment statements about their priorities, the implication-attestation system connects them automatically. A water filtration project shows up in *both* funding portals — funded from both sides, without either side needing to acknowledge the other or compromise on broader ideology.

Nobody has to agree on *why* clean water matters. The system just surfaces that they agree on *what* should be done.

## Adoption levels

Each level is strictly better than the previous, and the org moves at its own pace:

  1. **Closed (sole attester):** "Better infrastructure for what we already do." Minimal change, immediate benefits.
  2. **Semi-open (trusted partners):** "Shared infrastructure instead of ad-hoc partnerships." More projects surfaced, less coordination overhead.
  3. **Open (community attestations):** "Tapping into a broad network for project discovery." Maximum project discovery, org still controls which attesters it trusts.
  4. **Cross-cutting (common-ground):** "Funding concrete outcomes, even when support comes from unexpected places." Maximum funding pool, demonstrates impact across ideological lines.
