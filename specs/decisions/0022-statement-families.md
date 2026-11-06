# 0022. Statement families describe generated statements, outside the core

- **Status:** Proposed
- **Date:** 2026-11-05
- **Related specs:** [`specs/tech/subsystems/conceptspace/statement-families.md`](../tech/subsystems/conceptspace/statement-families.md), [`specs/product/lean-on-ai.md`](../product/lean-on-ai.md), [`specs/decisions/0010-combinator-statements.md`](./0010-combinator-statements.md)

## Context

The AI-risk intake site generated about 2,000 statements by combining a small set of pieces: policies, risk levels, reasons and clarifications. Each new piece multiplies the count, so millions were expected. Each statement was plain English and was judged on its own, as [Lean on AI](../product/lean-on-ai.md) requires. But publishing only the expanded statements threw away the small, regular structure that generated them. That structure was what made it possible to migrate signers in bulk after a rewording, to give the attester a list of pairs to check, to publish combinations lazily, and to count by piece.

We weighed several ways for a signer to make a relationship explicit. One was signing the core statement as well. Another was a new "E is my explanation of S" object. A third was a hint to the attester. For generated statements, none of these was needed: the generator already knew every intended (member, core) pair.

## Decision

A **statement family** is a published, checkable description of how a set of statements is generated: pieces, assembly rules or an exact generator version, and the statements the family is designed to imply. Expansion is deterministic, so a combination always gives the same bytes and CID. That makes lazy, first-signer publishing possible.

A family is extra information for the actors who want it: nudgers, attesters, indexers and front ends. Anyone may publish one through PublishedData. It has no signers. It is not required to list its members' CIDs; whoever needs that mapping builds it on demand. Nothing in the core depends on families: no contract, no implication, no count. Families are never read to work out what a statement means. The attester still judges every arrow from the text.

## Alternatives considered

- **Publish the statements and drop the structure.** This works, but it loses bulk migration, the attester work list, per-piece views and portability, and gets nothing in return. The family document is small and true.
- **Make reasons or explanations a separate object type ("E explains S").** Rejected. It is a new relation in a belief language, which Lean on AI rules out. The explanation would also stop being a statement with signers, nudges and implications of its own.
- **Have signers also sign the core statement directly.** This remains possible, but it is not the mechanism. It merges direct and indirect support, and the gap between them is what lets a signer stay distinct from everyone else who backs the bottom line.
- **Let family membership stamp implications structurally, as combinators do.** Rejected. A combinator's arrow follows from the operator. A generated paragraph's meaning depends on its wording, connectives included, so the attester has to read it.
- **Require a full CID list in the family.** Rejected. Families can stand for millions of statements.
- **Give families signers or make them first-class protocol objects.** Rejected for now. Nothing needs it, and keeping families outside the core means losing one never breaks anything.
- **Sponsor gas for publishing any family member.** Rejected. With open users, an attacker forces the whole list to be published at the sponsor's cost. That is the same as eager publishing, which lazy publishing was meant to avoid. It might be reasonable only if the set of users is closed too.

## Consequences

Generated statement sets keep their structure in public. Rewording a piece becomes a mechanical diff that a nudger can act on. Core (bridge) statements become the stable part: changing a member is cheap because old signatures still imply the core, while changing a core statement is a planned migration.

The costs: generators must produce exactly the same bytes every time, with no dates or varying extras, or lazy publishing breaks. Consumers have to rebuild the CID mapping themselves.

**Revisit if** a core feature starts needing families, if a second independent family format appears and they need to share a standard, or if a use case with a closed set of users makes sponsored publishing of members worth it.
