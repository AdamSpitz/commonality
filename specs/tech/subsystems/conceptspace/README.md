# Concept Space

For the user-facing explanation of what Concept Space is and why it exists, see [docs/end-user/shared/key-ideas/statements-and-implication-graph.md](/docs/end-user/shared/key-ideas/statements-and-implication-graph.md).

## The core idea (technical)

  - Users can create (by uploading to IPFS) immutable "statements" representing concepts/ideas/causes.
  - Each statement is a displayable document, as described in displayable-documents.md.
  - Users can "sign" these statements (by submitting an onchain transaction) to show belief/disbelief/no-opinion (the system defaults to assuming that the user has no opinion about the statement, and a user can explicitly express "no, I don't believe that" if he wants to).
  - Anyone (though this'll probably be done by AI, not by humans) can publish ImplicationAttestation events of the form "if someone believes statement S1 he probably also believes statement S2", to connect related statements. This enables indirect support tracking — people can create improved versions of statements while inheriting support via direct implication attestations. This drastically reduces the need for coordination: no need to rally around a single canonical statement, yet the system gently nudges toward coordination by suggesting more-popular equivalent statements. (Note: implications are *not* transitive - if you want to know whether S1 supporters indirectly support S3, you need a direct attestation from S1 to S3, not a chain through S2. This avoids the problem where S1→S2 and S2→S3 each seem reasonable but S1→S3 is a stretch.)
  - Later (don't bother with this for the MVP) we can make it easy for a user (or an AI that the user trusts) to click a button that says "that implication attestation is bogus" and "stop trusting whoever attested to that". Point is, it's not like it's some horrible problem if we have a rogue attester that starts producing bad implication attestations - it's not actually hard for the system to self-correct.

## More details
    
  - **Transparency:** The Concept Space website should be transparent about how many accounts have directly signed, versus how many have indirectly shown probable support. (i.e. "17 people signed this statement; 118 people have signed these other five statements that the system thinks imply this statement, and so those people probably also believe this statement.") We don't want the UI to mislead anyone about a statement's level of support - it can simply be clear about direct explicit support vs indirect probable support.

  - **Reducing need for coordination:** The point of the implication system is to drastically reduce the need to coordinate around a single canonical definition of an idea. People are going to want to rewrite statements for many reasons: maybe there was a typo in the original statement, maybe someone wants to express a slightly different thought, maybe someone wants to elaborate or publish a v2, maybe someone just wants to rewrite it in a way that he likes better... by having implication arrows between statements, we make coordination much less important. Even if a statement has already gained a lot of support, anyone should feel free to create a rewritten/improved version of the statement; the UI page for his new-and-improved statement will still show just as much support (albeit indirect support) as the original statement. 

  - **Nudging towards coordination:** OTOH, it is still kinda *nice* to know that a statement has direct (rather than indirect) support. So to try to nudge the system gently in the direction of avoiding unneeded proliferation of very-similar statements, there should be a suggestion system: the UI can offer the user hints/nudges of the form "you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well." Nudges are delivered by **nudgers** — off-chain services identified by Ethereum addresses that publish signed nudge messages. Users configure which nudgers they trust, same as attesters. See [hints](./hints.md) for the full architecture.

  - **Non-transitive implications:** Implications are NOT transitive. If S1→S2 and S2→S3, that does NOT mean S1 supporters count as indirect supporters of S3. You'd need a direct S1→S3 attestation. This avoids the problem where each hop seems reasonable but the chain as a whole is a stretch. The AI attester should evaluate pairs of statements directly rather than relying on chains.

  - **Multiple attesters:** Any account is allowed to publish these Implication Attestations. Each user can (in the Settings section of the website) configure the site to accept implications from a particular set of attesters. (The point being that this idea of "if someone believes S1 then he probably believes S2" is subjective and so maybe the AI is doing a bad/biased/malicious job of producing these implication attestations.) In the beginning we'll simply create a single AI whose job is to do that, and we'll do so honestly, so I expect there won't be too much need at first for creating alternative attesters. But the system will (at least eventually) support it, to allow people to route around perceived bias.

  - **More sophisticated statement-linking:** I have a suspicion that in the future we'll realize that our very basic ImplicationAttestation concept is much too simplistic and we need more-sophisticated ways of linking concepts. That's fine, we can do that later (by creating other smart contracts allowing the emission of other kinds of events), after we have a better idea of what we need. (But OTOH, take care not to go down the rabbithole of trying to make a full "semantic web" kind of thing. What we've learned from the LLM era is that the only way we've found of making real semantic connections like that is to have a rather huge LLM. So just use an LLM.)

  - **Coalitions/alliances/commonality:** Implication arrows are useful for more than just "S1 is pretty much the same as S2"; they're also useful for finding common ground. e.g. Someone could take S1 and S2, which are significantly different, and write a "commonality statement" S. (I don't mean "commonality statement" to be a technical term within the code; it's just a normal statement that happens to be implied by both S1 and S2. It's just useful to think about, conceptually.) The system should notice, though, when a particular statement contains references to other statements, so that people can write a statement S like "I believe either S1 or S2" and the UI page for statement S can show both S1 and S2 (and the support numbers for each); this ought to be useful for forming alliances. (It may even be possible to run fancy graph-analysis algorithms to identify useful commonality statements.)

  - **Active bridge synthesis:** The system can go beyond passively discovering commonality and actively *create* bridge statements. The [bridge creator](/specs/product/bridge-creator.md) is a nudger (see above) that takes moderate statements from opposing sides, identifies compatibility, and synthesizes modified statements and commonality statements. This builds on three layers with increasing subjectivity: implication attestations (rigorous logical links, handled by the attester), [nudges](./hints.md) (probabilistic "you might also believe..." suggestions, delivered as signed off-chain messages), and [noninflammatory-content-backed persuasion](./content-patterns/noninflammatory-content.md) (social media posts making the case across the divide). The key constraint: modified statements are offered as nudges, not attestations — the system proposes, the user decides.

  - **Unique-human verification:** At first it's fine for the system to count up all accounts who've signed a statement, but in the long run we'll probably want some way of counting up unique humans (i.e. combating Sybil attacks). One thing we can do is allow users to link their Commonality account with their unique-human identity (using whatever kinds of unique-human identity systems exist - Worldcoin, BrightID, anything else too). We can use zero-knowledge proofs to allow this to be done in a privacy-preserving way. (Don't bother implementing this yet, it's just a thought for later.)
  
  - **High-profile signers:** If people can link their account to (for example) their Twitter handle (in a verifiable way), we can have a statement's UI page show not only the total number of supporters, but also the Twitter handles of any high-profile supporters (e.g. supporters who have a verified Twitter account with more than 10k followers). That might help a lot in making this project go viral: if you support a cause, you might be motivated to find a way to spread the link to your cause "up the popularity hierarchy", in the hope of getting a high-profile signer.

    - **Empty state messaging:** When there are zero high-profile signers, the UI should display an encouraging message that explains the feature and motivates users to recruit high-profile supporters. For example: "No high-profile supporters yet. If you can get someone with a lot of Twitter followers to sign this statement and link their account, they'll show up here!" This helps drive viral growth by making the benefit of recruiting high-profile signers explicit.

## Specs in this directory

- [statements.md](statements.md) — Statement data model (displayable documents, extras, no structured semantics)
- [statement-discovery.md](statement-discovery.md) — How the system discovers statements (via `DirectSupport` events, not a `StatementCreated` event) and scalability plan
- [statements-list.md](statements-list.md) — Saved statements list (users bookmarking statements via mutable refs)
- [queries-and-actions.md](queries-and-actions.md) — Full list of user queries and actions the conceptspace system supports
- [displayable-documents.md](displayable-documents.md) — Generic displayable document format used by statements
- [hints.md](hints.md) — Nudger architecture for "you might also believe..." suggestions
- [implication-attester-ai.md](implication-attester-ai.md) — AI implication attester design
- [implication-attester-ai-prompt.md](implication-attester-ai-prompt.md) — Prompt used by the implication attester
- [implication-discovery.md](implication-discovery.md) — How implication relationships are discovered and queried
- [explorer.md](explorer.md) — AI explorer for navigating the concept space
- [indexer.md](indexer.md) — Indexer design for caching events
- [ui.md](ui.md) — UI pages and components

## Smart contracts

See `hardhat/contracts/` for the actual contracts.

**`Beliefs` contract:** Belief state must have three values: `noOpinion` (default), `believes`, `disbelieves`. Store beliefs in blockchain state (not just events) so other smart contracts can read belief state on-chain. Also emit `DirectSupport` events for indexer consumption.

**`Implications` contract:** For attesters to publish `ImplicationAttestation` events of the form "if someone believes S1 he probably also believes S2".

## UI

See [ui.md](ui.md).
