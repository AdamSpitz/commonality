# Statement families

Status: proposed. Decision record: [ADR 0022](/specs/decisions/0022-statement-families.md). Part of the broader answer in [statement proliferation](/specs/product/statement-proliferation.md).

## Problem

Some statement sets are generated, not written one by one. The AI-risk intake site (`ai-risk-commonality`) is the first example. A visitor picks a policy or two, an extinction-risk level, some reasons, and some "I'd usually say otherwise, but…" clarifications. The site turns each consistent combination into one plain-English paragraph. Nine or ten small pieces already give about 2,000 statements, and each new piece multiplies that. Millions are realistic.

Each generated paragraph is an ordinary statement. It stands alone, is read by LLMs as a whole, and is judged by the implication attester like any other statement. That is deliberate ([Lean on AI](/specs/product/lean-on-ai.md)). We do not want a belief language with "reason" or "and" or "I believe S1 because S2".

The cost is that the generating structure gets thrown away. The pieces and the rules for joining them are small, regular and easy to understand. Once the generated statements are published, nothing public records that they came from those pieces.

## What a statement family is

A **statement family** is a published document that describes how a set of statements is generated:

- the pieces (the exact sentence text for each choice);
- the assembly rules, or a reference to an exact generator version that can be run;
- the bridge or core statements the family is designed to imply.

Given a family, anyone can:

- **expand** a combination into its exact statement bytes, and so its CID;
- **check** that a statement S is the expansion of combination C.

Both directions are mechanical. So the family is a checkable description, not an interpretation.

A family is **not required to list its members' CIDs.** It may include a list for small families, but a family can stand for millions of statements. Whoever needs a combination-to-CID map (an indexer, a nudger, a front end) builds it on demand, either in full or just for the combinations it cares about.

## Rules

1. **Members are ordinary statements.** Nothing reads a family to work out what a statement means. The implication attester judges every arrow from the statement text, exactly as it does now. A family is an index, hint and cache in the sense of Lean on AI, never a source of meaning.
2. **Expansion is deterministic.** The same combination always gives the same bytes, so it always gives the same CID. The published bytes contain no date, no publisher, and nothing else that varies. This is what lets two people who publish the same combination independently land on the same graph node, and it is what makes lazy publishing possible (see below).
3. **A family has no signers.** You sign statements, not families. A family makes no claim that anyone believes anything.
4. **Anyone may publish a family.** At first it is just a document published through PublishedData by whoever generated the statements, such as the AI-risk site. No contract knows about families.
5. **Nothing in the core depends on families.** Support counts, implications, cause boards and alignment all work without them. If a family document disappeared, those features would keep working. Only the extras listed below would be lost.

## What families are good for

- **Bulk migration.** Suppose a piece is reworded. You regenerate, then diff the old family against the new one. That gives an old-CID → new-CID mapping for every affected combination. A nudger can publish those pairs as a nudge batch from code, with no LLM needed to propose each one. The nudge is still opt-in, as with any nudge.
- **Attester work list.** The family says which core statement each member is designed to imply. An attester or indexer can use that as a hint about which (member, core) pairs to look at, instead of having to discover them. The attester still decides each pair.
- **Lazy publishing.** Because expansion is deterministic, a family can describe statements that have not been published yet. The first person who signs a combination publishes it. That person gets the same CID that anyone else would have gotten.
- **Per-piece views.** For example, "N signers chose the jobs reason, in any combination." This is a display view computed over signatures and the family, in the same way union and intersection counts on causes are views ([ADR 0009](/specs/decisions/0009-causes-are-publications-over-statements.md)). It claims nothing about belief.
- **Portability.** Another front end can rebuild a picker from the family alone.

## Keep the core statements stable

A family pairs well with this rule: **the statements the family implies are the stable part, and everything else can change.**

- If a member statement changes, the core counts don't move. Old signatures on old members still imply the core statement, so indirect support stays where it is even after a member is replaced.
- If a core statement changes, the cost is high. Signatures do not follow a rewording. Either the attester can honestly say old ⇒ new, or people have to move one by one in response to nudges.
- So word core statements generally enough that they rarely need to change. Treat any change to one as a migration, and use the family diff to drive the nudges.

## Not doing

- **Gas sponsorship of publishing for family members.** It is tempting: the family is a closed list, so "sponsor anything in family F" looks bounded. It isn't, in practice. An attacker can force the sponsor to pay for publishing the entire list, and paying for the entire list is exactly what lazy publishing was supposed to avoid. This only becomes reasonable if the set of *users* is also closed. Not pursued for now.
- **Gasless signatures for the long tail.** Enroll the small stable core. Do not enroll every combination, and do not add a family-membership proof to the tank so the long tail can be sponsored. The signer pays gas for those statements directly. The rejected alternatives, including a caller-built zero-knowledge proof of the generator, are in [ADR 0023](/specs/decisions/0023-no-gasless-family-long-tail.md).
- **Family membership as an implication source.** The attester does not stamp arrows because the family says a member implies something. (Contrast [combinator statements](./combinator-statements.md), where the arrow follows from the operator.) The words inside a generated paragraph, such as connectives like "So I want…", can change its meaning. The attester has to read it.
- **A required CID list.** See above.
