# Could we move things in the direction of more-local government?

(This obviously isn't a polished argument, just some thinking out loud.)

## Prompt

Take a look at the stuff in docs/vision-and-strategy and anything else relevant. Can you imagine any game-theoretical ways in which it might be possible (with the aid of this Commonality system, or anything else you can think of) to pressure the legacy system in the direction of more-local government? (i.e. Transferring power from federal to provincial government, or from provincial to municipal?) What strategic advantages does the more-local government have that it might leverage? Etc.

## AI's response

Great question. Having read through the vision docs, here's what I see — some of this extends ideas already in the docs, but the subsidiarity angle specifically (pressuring power downward) opens up some interesting game-theoretical territory.

### Strategic advantages local governments inherently have

Before the game theory, it's worth naming why the more-local level has structural advantages that Commonality can amplify:

1. Information advantage. Local governments know local needs better. This is the standard subsidiarity argument, but Commonality makes it quantifiable — onchain statement signatures and funding patterns produce hard evidence of what a community actually wants, versus what the province thinks it wants. When a municipality can point to verifiable data showing "our residents want X and are willing to pay for it," and the province is funding Y with conditions attached, the information asymmetry becomes publicly undeniable.

2. Denser trust networks. Commonality's delegation system works better at smaller scales. People actually know their delegates personally in a small town. A retired teacher attesting alignment for youth programs is genuinely trusted in Millbrook in a way that no provincial bureaucrat can be. This means the delegation mechanism — which is one of Commonality's core advantages over both government and traditional charity — has a natural gravity toward localism.

3. Lower coordination costs for assurance contracts. Reaching a pledge threshold is easier when the community is smaller and more cohesive. 200 families in a town can coordinate around a $120K/year assurance contract. Getting the equivalent per-capita participation for a provincial-scale initiative is much harder. Assurance contracts inherently favor the more-local level.

4. Faster feedback loops and more visible accountability. It's hard to hide waste when everyone knows the delegate personally and can see the spending onchain. Provincial and federal spending is opaque by comparison. This means Commonality-funded local projects will tend to outperform higher-level government programs, creating a track record that reinforces the case for localization.

### Game-theoretical mechanisms for pressuring power downward

1. The ratchet effect. This is perhaps the most powerful dynamic. Each time a community uses Commonality to resist higher-level pressure (as in the Millbrook walkthrough), the infrastructure stays in place afterward. The credible-threat capacity doesn't degrade — it accumulates. Each crisis ratchets up local capacity. Over multiple cycles, more and more functions migrate to local funding, and the higher level's leverage steadily erodes. Critically, this ratchet is irreversible in a way that political victories aren't — you can't un-build a community's demonstrated funding capacity the way you can reverse a policy in the next election.

2. The bypass-and-starve strategy. Rather than directly confronting the higher level, you make it increasingly irrelevant for specific functions. The province's power over municipalities depends substantially on being the funding conduit — money flows up via taxes, then back down with strings attached. Every function that a municipality funds independently removes one string the province can pull. Over time, the province's role shrinks to the functions that genuinely require provincial-scale coordination (interprovincial infrastructure, etc.), which is arguably where it should be. This isn't "fighting" the province — it's just routing around it, which is much cheaper.

3. Asymmetric cost of resistance. For the higher-level government, trying to suppress local Commonality usage is expensive (censorship resistance is the whole design) and politically toxic ("we're stopping people from voluntarily funding their own community programs"). For the local community, setting up Commonality infrastructure is cheap — costless to try, as the docs note. This asymmetry strongly favors the local side. The higher level would need to spend enormous political capital to suppress something that costs the local side almost nothing to maintain.

4. Horizontal coalition-building that bypasses the higher level. The organic coalition discovery mechanism (implication attestation) can connect municipalities with similar needs directly, creating horizontal alliances that bypass the provincial level entirely. Ten small towns that all need water infrastructure don't each need to lobby the province separately — they can set up a shared assurance contract, pool their pledges, and fund it collectively. The province was previously the coordination layer for this; Commonality replaces that coordination function without the strings. This is a direct erosion of one of the higher level's key justifications for existing.

5. Competitive demonstration effects (inter-municipal contagion). When Millbrook successfully uses Commonality to resist provincial pressure, the playbook is public and onchain. Other municipalities can see exactly what was done and replicate it. This creates a coordination cascade: each successful instance lowers the perceived risk for the next municipality, and the province faces an exponentially growing number of communities with credible threats. The game theory here is similar to a bank run — once enough municipalities demonstrate independence, the province's leverage collapses nonlinearly.

6. The "better agent" argument (reversing principal-agent problems). In theory, higher-level governments are agents of local populations. In practice, the principal (local population) has almost no leverage over the agent (province). Commonality gives the principal a credible outside option, which is the textbook game-theory fix for principal-agent problems. "If you won't serve our interests, we'll do it ourselves" changes the agent's incentive structure. And unlike "we'll vote you out" — which requires winning a province-wide election — "we'll fund it ourselves" is achievable unilaterally by a single municipality.

7. The tax-competition angle. Here's one the docs don't explore much: if municipalities can fund their own public goods effectively via Commonality, the argument for sending tax revenue up to the province (only to get it back with conditions) becomes weaker. This creates political pressure for either (a) lower provincial taxes with compensating municipal tax increases (shifting the tax base downward), or (b) unconditional block grants rather than conditional ones (loosening the strings even if the money still flows through the province). Either outcome shifts effective power toward the local level. A municipality that can say "we're already funding this ourselves with after-tax dollars; if you'd just let us keep those tax dollars locally, we could do it more efficiently" has a strong rhetorical position.

8. The "prove it" mechanism. Commonality makes it possible for a municipality to demonstrate governance competence in a way that's verifiable. If a town funds, delivers, and transparently accounts for a program better than the province did — and the evidence is onchain — that's a powerful argument for devolution. Currently, higher-level governments resist devolution partly by arguing "local governments can't handle it." Commonality lets local governments prove they can, with receipts.

### A possible strategic sequence

Putting these together, I can imagine a deliberate strategy:

1. Seed phase: Municipalities adopt Commonality for uncontroversial supplementary funding (tip jars, small community projects). No confrontation. Just better infrastructure.

2. Capacity phase: Build delegation networks, establish trust, grow pledge capacity. Still no confrontation — just a community getting organized.

3. Demonstration phase: Use Commonality to fund something the province is doing poorly or not at all. Demonstrate superior results with onchain transparency. Build the political case: "we did this better and cheaper."

4. Credible-threat phase: When the province next attaches strings to funding, deploy standby assurance contracts. Don't activate them — just make them visible. The province sees the threat and moderates.

5. Normalization phase: As more municipalities do this, it becomes normal. The province's conditional-funding model erodes. Political pressure builds for unconditional transfers or tax devolution.

6. Equilibrium: The province retains genuinely provincial functions (interprovincial coordination, standards). Everything that can be local is local, funded through a mix of local taxes and Commonality. The province's role has shrunk not through revolution but through a thousand individual communities routing around it.

The beauty of this sequence is that no single step is confrontational, no single step requires a critical mass, and every step produces immediate local value regardless of whether the later steps ever happen. It's the "walking up a hill, not scaling a cliff" dynamic from the docs, applied specifically to the subsidiarity question.

### Conclusion

The deepest insight might be this: Commonality's mechanisms inherently work better at smaller scales (denser trust, lower coordination costs, better information, more visible accountability). This creates a natural gravitational pull toward localism that doesn't require anyone to want to devolve power — it just means that the local level keeps outperforming, and the higher level gradually loses the argument for why power should remain centralized.