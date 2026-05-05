# Some thoughts on a bridge creator

More than just a [bridge finder](./bridge-finder.md), I feel like there's some AI/human heuristic we could write that might encourage progress towards the hidden-majority patterns. Something like:
  - Have ideas in mind regarding what the common ground might look like. (This is an opinionated heuristic. I'm not aiming for neutrality here, though I *am* aiming for transparency.)
  - When sane people on one side (e.g. sane left-wingers) write their statements, try to notice in which ways it's *compatible* with the positions of the sane people on the other side. (i.e. Notice ways in which their position is compatible with one or more of the commonality positions you have in mind.)
  - Write two statements: the common-ground position, and a restatement of what the sane left-wingers wrote but being more explicit about how their position might be compatible with the other side's position.
    - e.g.
      - Moderate left writes "I want abortion to be available so that women aren't forced into going through with a pregnancy they don't want."
      - Moderate right writes "Late-term abortion is horrific."
      - Bridge-finder (which either figures out or has come pre-equipped with the idea that "abortion available until 12-16 weeks" would be a compromise that would satisfy most) notices that those don't actually conflict. So it finds/creates the statements:
        - Modified statement, intended to appeal to moderate left: "I want abortion to be available so that women aren't forced into going through with a pregnancy they don't want. I'd prefer abortion to be available throughout the whole pregnancy, but I don't mind forbidding abortions after maybe the first trimester or so - that would give women enough time to make a decision. I'd rather get this settled than keep fighting over it forever."
        - Modified statement, intended to appeal to moderate right: "Late-term abortion is horrific. I'd still rather not see abortions early in the pregnancy, but I don't feel as strongly about it. I'd rather get this settled than keep fighting over it forever."
        - Common ground: "I'd be okay with it if abortion were allowed during the first 12-16 weeks, and forbidden after that. I'd rather get this settled than keep fighting over it forever."
  - The implication attester should be set up with a prompt that will make it clear to it that it should NOT just create implication links from the actual moderate-left statement to the modified moderate-left statement. But the [nudging](../tech/subsystems/conceptspace/hints.md) system should suggest it.
  - And it's fine for the implication attester to create implication links from the modified moderate statements to the common ground statement - those really do imply that.
  - And then on top of the nudging system, we also have the [noninflammatory content](../tech/subsystems/conceptspace/content-patterns/noninflammatory-content.md) system to let people on the right suggest to people on the left (and vice versa): "Hey, take a look at this modified statement; I think you might be willing to sign it, and notice that it'd imply that you're okay with this common-ground statement that we on 'the other side' are also okay with."

This is starting to feel interesting to me. I'm starting to get a clearer sense of the different "levels" of links between statements:
  - Implication attestations: Should be very straightforward and incontrovertible - this is about restating the same idea in a different way, or about logically-required implications. We're using AI to give people the freedom to say what they want in their own words; we're not trying to persuade them and we really don't want to misrepresent them.
  - Nudges: The system isn't going to put words in the user's mouth, but it thinks he *might* also believe this other statement.
  - Social media persuasion backed by noninflammatory-content attestations: Longer than a statement; this is about making the case for the nudge statement. We're using AI (an AI trusted by the person we're trying to persuade! its prompt is openly visible and the user has the ability to configure his system to trust or not-trust whichever ones of these attesters he wants) to say that reading the post isn't going to piss him off.

## How the bridge-creator fits into the system architecture

The bridge-creator is a **nudger** — an off-chain service identified by its Ethereum address that publishes typed nudger publications to IPFS with CIDs recorded on-chain. See the [nudger spec](../tech/subsystems/nudger/README.md) for the full nudger architecture.

Concretely, the bridge-creator:
1. Watches for new statements via the indexer.
2. Identifies pairs that look like they *almost* bridge (moderate statements from opposing sides with compatible positions).
3. Synthesizes modified statements and commonality statements, publishing them to IPFS.
4. Collects the resulting nudges and publishes them as a `nudge-batch` publication (IPFS document, CID recorded on-chain via `NudgePublications`).
5. Separately, submits the modified→commonality pairs to the implication attester for evaluation (those *are* legitimate implication attestations — the modified statements really do imply the commonality statement).

Users configure whether they trust this nudger in Settings, same as they configure trusted attesters. The bridge-creator's nudge publications are discovered via on-chain `NudgesPublished` events (cheap, no permanent per-nudge state), while the implication attestations it triggers are stored on-chain as usual.
