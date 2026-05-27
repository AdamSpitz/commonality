# Why this is fixable now

The problem of the invisible moderate majority isn't new. What's new is the infrastructure to solve it without requiring anyone to trust a central authority.

The reason this couldn't be done until now is twofold:

- **Both sides distrust each other**, so the infrastructure has to be credibly neutral — money that nobody can capture, and subjective judgments that anyone can audit. Organizations can't credibly promise this; protocols can. (See [credible neutrality](../credible-neutrality.md) and the [trust model](./trust-model.md).)
- **The mediator has to reach the crowd, not the leaders.** When we say "mediator," we don't mean a mediated meeting between the two sides' elites — the whole point is to show widespread mass support for positions that are *not* the ones being put forth by the politicians and media currently running the show. We mean a mass-scale mediator nudging *large numbers of individuals* toward sane common-ground positions. That's only possible if the mediator is AI.

So: a weird kind of mediation, done at scale. Conceptually still just "have a mediator between the sides, and count who supports what." The two enabling technologies — blockchains and AI — map directly onto those two requirements.


## Blockchains: trustless infrastructure

Every previous moderate movement has been an organization — a nonprofit, a media outlet, a PAC — and organizations can be captured. A hostile actor can infiltrate the board, a government can freeze the bank account, a donor can corrupt the mission. Both sides know this, which is why both sides are right to be suspicious.

Blockchain infrastructure changes the calculus: funds held in smart contracts aren't held by anyone. There's no account to freeze, no board to capture, no operator to bribe. This trustlessness extends to the full funding stack:

- **Assurance contracts** let a community commit funds that only release when a threshold is met — without any escrow agent who could abscond with the money or selectively enforce the terms.
- **Delegation systems** let people fire-and-forget their funding decisions to someone they trust, with revocation that's technically enforced, not just promised, and without the delegates being vulnerable to censorship.
- **Retroactive funding and secondary markets** let people fund already-existing content they've actually read, rather than speculating on future creators. The market mechanism does the curation; no editorial board required.

None of these ideas are new. Assurance contracts, liquid democracy, secondary markets — people have been talking about these for decades. What's new is infrastructure that makes them actually trustless rather than "trust us, we promise."

## AI: credibly-neutral subjective work at scale

The second problem: even with trustless money, someone still has to make subjective judgments. Is this content noninflammatory? Does this statement imply that one? Is this bridge position genuine or a rhetorical trap? Humans making these judgments introduce bias — or at least the perception of bias, which is enough to kill cross-partisan trust.

AI doesn't solve this entirely, but it changes the trust calculus in two ways.

**First, the subjectivity becomes inspectable.** An AI evaluating whether content is noninflammatory, running an open-source prompt, posting its reasoning alongside its decision — that's not neutral in the way a mathematical proof is neutral, but it's auditable in a way no human editorial board is. You can read the prompt. You can read the reasoning. If you don't trust the operator's instance, you can run your own. The trust burden is low enough that most people can live with it; the full configurability means the rest don't have to.

**Second, it can handle the volume.** Think about what an infinitely patient, incorruptible human analyst could do if they had time to read everything:

- Go through everyone's idiosyncratic statements and figure out who's saying the same thing in different words — then connect them, without requiring any coordination between the signers.
- Go through the polarized statements and notice: "this particular detail is a major sticking point for people on the other side, but you don't actually seem to care about it that much — if you just acknowledged their concern, you'd find you have a lot more common ground than you thought."
- Read every social-media post and say: "here's a set that are actually written respectfully and that show a genuine understanding of the other side's perspective" — and filter out everything else.

A human doing this job would burn out, get bored, develop biases, go off-script, get captured. AI can do it at scale, consistently, without getting annoyed. That's what makes the implication graph tractable (connecting millions of statements without a coordination bottleneck), the bridge creator possible (synthesizing cross-partisan bridges without a human negotiator who might have an agenda), and the noninflammatory-content feed real (reading everything so the donor doesn't have to).

## What this enables together

The combination is what matters. Trustless infrastructure alone doesn't solve the subjective-judgment problem. AI alone doesn't solve the capture problem. Together, they make it possible to build a cross-partisan system where:

- Money flows through mechanisms that nobody controls.
- Subjective judgments are made by inspectable AI, with full configurability for those who want to verify.
- The whole thing produces value at every step — no threshold to cross before it starts working, no single point of failure to attack.

The political tools to reveal the hidden majority — head counts, funding portals, bridge statements — existed conceptually for a long time. The infrastructure to run them without a trusted intermediary didn't. Now it does.
