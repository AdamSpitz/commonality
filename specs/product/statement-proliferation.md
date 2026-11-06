# Statement proliferation

The question keeps coming up: "won't there be far too many statements?" This file collects the answers in one place. Each answer links to the spec that has the detail. If a new answer comes up, add it here.

## Proliferation is intended

Commonality is designed to allow lots of statements. Asking people to agree on one wording is coordination, and coordination is the thing we're trying to avoid needing. So everyone says exactly what they mean, and the system finds the common ground afterwards. See [statements are peculiar](./statements-are-peculiar-for-good-reasons.md) and [Lean on AI](./lean-on-ai.md).

Proliferation comes in two kinds:

- **Organic.** People write their own versions of similar ideas.
- **Combinatorial.** A site builds statements from pieces: policies × reasons × caveats. The first real case is ai-risk.solutions, with about 2,000 statements, and more pieces would mean millions.

Neither kind gets a belief language as its fix. We don't add structured "reason" or "and" or "explains" relations between statements. Every statement stays plain English and stands alone.

## The answers

### 1. Implication rolls support up

Signers of a specific statement count as indirect supporters of the general statement it implies. Common ground gets counted without anyone having to sign a shared wording. Direct and indirect support stay separate on screen. That separation is the point for signers who want their own wording on the record so they aren't lumped in with everyone else who backs the bottom line. See [conceptspace README](/specs/tech/subsystems/conceptspace/README.md) and [implication discovery](/specs/tech/subsystems/conceptspace/implication-discovery.md).

### 2. Keep the core statements stable

Many statements orbit a few core ones: bridges, common ground, cause planks. **The core statements stay fixed, and everything around them can change.**

- If a member statement changes, the core counts don't move. Old signatures on old statements still imply the core statement, so indirect support survives.
- If a core statement changes, the cost is high. Signatures don't follow a rewording. Either the attester can honestly say old ⇒ new, or people move one by one through nudges.
- **So:** word core statements generally enough that they rarely need to change, and treat any change to one as a planned migration.

### 3. Nudges consolidate, gently and by opt-in

Nudgers suggest more popular or more general wordings ("you signed S1; maybe also S2?"). They never sign on anyone's behalf. See [nudges](/specs/tech/subsystems/conceptspace/nudges.md) and [nudge UX](./nudge-ux.md).

### 4. Group search results by implication

A list of every statement would bury the general ones under near-duplicates. Search and browse should show the general statement once, with "plus N more specific versions" that open up. See "Statement search collapses by implication" in [belief implication and discovery](./belief-implication-board-inclusion-and-discovery.md).

### 5. Combinator statements instead of slogans

When a combination of planks deserves its own node, publish `all` / `any` over the planks' CIDs. Don't write a new slogan for it. Two causes that use the same combination share the same node. See [ADR 0010](/specs/decisions/0010-combinator-statements.md).

### 6. Statement families keep the generating structure

For combinatorial statements, publish the pieces and rules that generate them, alongside or instead of the full set. A family is optional and anyone can publish it. Nothing in the core depends on families. They make these things possible:

- bulk migration nudges, driven by diffing the old family against the new one;
- a list of pairs for the attester to check;
- lazy publishing, which works because a combination always gives the same bytes and CID;
- counts per piece;
- other sites rebuilding the picker from the family.

See [statement families](/specs/tech/subsystems/conceptspace/statement-families.md) and [ADR 0022](/specs/decisions/0022-statement-families.md).

### 7. Hints about intended implications (not yet specified)

For combinatorial statements, the hard part of implication isn't judging pairs. It's knowing which pairs to look at, and the generator already knows. For organic statements, the author usually knows too: "I'm writing this as my fuller version of S."

So a publisher or signer should be able to send a **hint**: "I intend S2 to imply S; please check that pair." A hint only tells the attester where to look; it isn't a claim. The attester still reads both texts and decides, and a declined hint changes nothing. This is the kind of thing Lean on AI allows: structured data that steers where the AI looks, without replacing its judgment. Families give the same hint for every member at once.

Not yet decided: where hints are stored, who may send them, and how to stop hints from becoming a cheap way to make the attester do a lot of work.

### 8. Publishing cost is small, and can be lazy

Each statement's bytes go in the calldata of its author's signing transaction, which costs a fraction of a cent ([self-published statements](/specs/tech/subsystems/conceptspace/self-published-statements.md)). Thousands of statements cost tens of dollars to publish eagerly. Millions shouldn't be published eagerly. With a family and deterministic bytes, the first signer of a combination publishes it.

## Rejected

- **A belief language.** That means structured reasons, explanations, conjunctions, or "E explains S" objects. It goes against Lean on AI, and the explanation would stop being a statement with its own signers.
- **Asking signers to sign the core statement too, as the mechanism.** A signer can always do it, but it merges direct and indirect support.
- **Letting family membership create implications automatically.** Wording, connectives included, changes meaning, so the attester has to read each statement.
- **Sponsoring gas for publishing family members** (or "anything that implies a bridge"). With open users, an attacker forces the whole list to be published at the sponsor's cost. That is just eager publishing, paid for by someone else. It might be reasonable only if the set of users is closed too.
- **Requiring families to list every CID.** Families can describe millions of statements. Anyone who needs the mapping builds it.
