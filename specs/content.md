# Content

How does content get into the system? Especially early on, when there aren't many users yet.

## Seed statements

Before launch, we should create a curated set of seed statements covering areas we expect early users to care about. These serve two purposes:

1. **Early users sign the same statements** rather than each getting a unique LLM-generated one, which means the implication graph starts forming immediately and signer counts are nonzero.
2. **The explorer AI has something to work with.** Even without a rich implication graph, it can show the user a set of seed statements in their area of interest and say "which of these resonate with you?"

The seed set should include:
- High-level interest areas ("I am interested in politics", "I am interested in crypto", etc.). These are useful as statements in their own right — any specific political position implies "I am interested in politics", so these naturally serve as top-level entry points.
- A layer of more specific positions within each area.
- Some cross-cutting statements that might form natural coalitions.

We don't need hundreds — a few dozen well-chosen ones should be enough to make the explorer feel populated rather than empty.

## AI-assisted statement discovery

The [conceptspace explorer](subsystems/conceptspace/explorer.md) is the main tool for helping users find, create, and sign statements. Rather than requiring users to browse an empty-looking directory, the AI dynamically suggests statements from the existing set that the user is most likely to agree with.

This doesn't need a static decision tree ("user signed S1, now suggest S2 and S3"). An LLM can look at the full list of existing statements (via the indexer's popular-statements queries), consider what it knows about the user's expressed interests so far, and pick the most relevant ones to surface. As the user signs statements and the LLM learns more about their views, the suggestions get more targeted.

**Indexer requirements:** The conceptspace indexer should be able to return a list of popular statements (sorted by number of believers), optionally filtered by area (e.g., statements implied by a given statement, according to a given attester). The funding portal indexer should be able to return, for a given statement, how much delegatable-note funding is available for aligned projects and how many aligned projects exist. If these queries aren't already supported, we should add them.

### Nudging toward existing statements

When a user wants to express something, the AI should first try to find an existing statement that captures it. If the user wants to tweak the wording, that's fine — the AI creates a new statement and initiates an implication-attestation request to the implication attester, so the tweaked statement gets linked to the popular one. If the rewording is basically equivalent, the link should be bidirectional. This way the user gets to say exactly what they want while the system's graph stays connected.

### Showing activity alongside statements

The explorer's statement panel should show not just signer counts but also funding-related numbers from the funding portal indexer:
- How much money is available (from delegatable notes) for projects aligned with this statement.
- How many aligned projects exist and are looking for funding.

This helps users see that there's real activity happening around a cause, even if the signer count is still small. The AI can point this out naturally: "There are already 3 projects looking for funding that align with this cause."

## Handling the empty-field problem

Early users will inevitably see small numbers. The system should handle this gracefully rather than trying to hide it.

The AI assistant's system prompt (written up as an [AI skill](ai-assistance.md)) should include the key points from [motivation/ease-of-adoption/](motivation/ease-of-adoption/) so it can make them naturally in conversation when relevant. The main points the AI needs to internalize:

- **No need to compromise on wording.** Unlike rallying around a candidate or a petition, you don't need to find the most-popular statement that vaguely says what you want. Say exactly what you mean; implication attestations connect you with others saying similar things. So there's no penalty for being an early user — your statement doesn't need to already be popular to be useful.
- **Costless to try.** Signing a statement is free. If nobody else signs it, you've lost nothing.
- **Scales down.** Successfully crowdfunding even one small project is useful. There's no threshold of adoption you need to clear before the system becomes worthwhile.
- **No coordination needed.** You don't need to agree with anyone on leadership, priorities, or exact wording. Each person acts individually; the system discovers the overlap.
- **Implication attestations are the key.** Even if you and another user wrote two different statements, the implication attester will link them if they're saying basically the same thing. So the system naturally consolidates support even when people express themselves differently.

The AI shouldn't lecture the user about these points unprompted. But when a user hesitates ("there's nobody else here yet", "what's the point if my statement has zero signers?"), the AI should be able to address that naturally. This means we need to write these points into the AI skill in a way that maps each point to the kinds of user concerns it addresses — not as abstract talking points, but as responses to concrete hesitations.

## Beyond statements

Statements are the easiest content to bootstrap because they're free to create and AI can help compose them. But the system also needs:

- **Projects** looking for funding (these require someone to actually propose and build something).
- **Alignment attestations** linking projects to statements.
- **Delegation chains** (these form naturally as users delegate).

Projects are harder to bootstrap than statements because they represent real commitments. But the AI skills ([project creation assistant](ai-assistance.md)) can lower the barrier, and the retroactive-funding model means that even speculative early projects have a chance of being funded later if they turn out to be good.
