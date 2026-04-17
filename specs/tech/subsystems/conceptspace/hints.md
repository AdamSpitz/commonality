# Hints / nudges

The point of the implication system is to allow us to *not* bother coordinating on a particular statement... but OTOH, it is still kinda *nice* to know that a statement has direct (rather than indirect) support.

So to try to nudge the system gently in the direction of avoiding unneeded proliferation of very-similar statements, there should be a suggestion system: the UI can offer the user hints/nudges of the form "you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well."

It might also be useful to offer hints regarding *related* statements, even if they don't mean quite the same thing.

The UI could be a simple list of related statements. Or an "autocomplete" sort of thing. Or a visual map that shows related statements nearby.

## Sources of nudge candidates

Nudges can come from two distinct sources:

### 1. Implication graph discovery

The simplest case: the system notices that you signed S1, and there's a more-popular statement S2 that S1 implies (or that implies S1). "You signed S1; maybe you'd like to sign S2 as well."

### 2. Bridge-creator synthesis

The [bridge creator](/specs/product/bridge-creator.md) generates *new* statements that don't exist yet in the graph — modified versions of what one side has said, designed to make the compatibility with the other side more explicit, plus commonality statements that both modified statements imply.

These synthesized statements are offered as nudges, *not* as implication attestations. The distinction matters: an implication attestation says "if you believe S1, you logically also believe S2" (rigorous, incontrovertible). A nudge from the bridge-creator says "you signed S1, and here's a new statement S2 that you *might* also be willing to sign — it's compatible with your position and it also happens to be compatible with what the other side is saying." The user decides whether to sign it; the system isn't putting words in their mouth.

This is the key mechanism for the [misunderstandings sub-pattern](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md#misunderstandings-of-what-the-other-side-believes) of hidden majorities, where the implication graph alone can't surface the common ground because people haven't yet encountered (let alone signed) the "clued-in" version of their position.

On top of nudges, the bridge-creator also uses the [noninflammatory content](/specs/tech/subsystems/conceptspace/content-patterns/noninflammatory-content.md) system as a third layer: social-media posts that make the case for the nudge statement, backed by a noninflammatory-content attestation that says "reading this won't piss you off." This is longer-form persuasion, not just a suggestion — but it's still opt-in, transparent (the AI's prompt is visible), and the user can configure which attesters they trust.


## Nudger architecture

Unlike implication attestations (which are on-chain events because they affect support counting), nudges are **fully off-chain**. A nudge is just a suggestion — if you ignore it, nothing changes in the system. There's no need to pay gas for that.

### Nudgers as off-chain services with signed messages

A nudger is an off-chain service identified by its Ethereum address. It publishes signed nudge messages — the signature lets anyone verify that a particular nudge came from a particular nudger, without requiring on-chain transactions.

This mirrors the trust model for implication attesters: users configure which nudgers they trust (in the same Settings section where they configure trusted attesters), and the SDK/UI only shows nudges from trusted nudgers. Anyone can run a nudger, just as anyone can run an attester.

The bridge-creator is just one type of nudger. Others might use different strategies: semantic similarity, trending statements, domain-based suggestions, etc.

### Why off-chain rather than on-chain

We considered using [mutable refs](../mutable-refs/README.md) (on-chain pointers to IPFS content) or on-chain nudge events, but:

- Nudges don't affect any on-chain state — no contract reads them, no support counts change.
- Nudgers may need to be high-volume and fast-iterating; gas costs would be a pointless drag.
- On-chain permanence is actively undesirable here — a nudger that makes a bad suggestion (due to a bug, a bad prompt, whatever) shouldn't have that mistake permanently enshrined on-chain. Signed messages provide verifiability when you want it (the signature is checkable) without permanence you don't want (the nudger can stop serving old nudges).

### Nudge message format

A nudge is a signed JSON message:

```typescript
type NudgeMessage = {
  nudger: string;             // Ethereum address of the nudger
  targetStatementCid: string; // "You signed this..."
  suggestedStatementCid: string; // "...you might also want to sign this"
  reason: string;             // Human-readable explanation
  confidence: number;         // 0-1
  timestamp: number;          // Unix timestamp
  signature: string;          // EIP-191 signature over the above fields
};
```

### How it flows

1. A nudger service watches for new statements and new beliefs (via the indexer).
2. It identifies nudge candidates using its strategy (bridge-creator synthesis, semantic similarity, etc.).
3. It publishes signed nudge messages via an API endpoint.
4. The SDK polls trusted nudgers' APIs and merges the results into the UI's suggestion system.
5. The user sees nudges from their trusted nudgers alongside the existing implication-graph-based suggestions.

### Trust configuration

Users configure trusted nudgers in Settings, the same way they configure trusted attesters. The UI shows which nudger produced each suggestion, so the user can evaluate whether they want to keep trusting it.

A nudger's track record is visible: users can see what it's been suggesting and decide for themselves. But unlike on-chain attestations, the nudger controls what it serves — it can stop suggesting things that turned out to be bad ideas, without a permanent record of the mistake.


## Current state

Do we have anything like that?
  - We have partial coverage: There's a `StatementSuggestions` component (`ui/src/conceptspace/components/StatementSuggestions.tsx`) that shows statements that are implied by or imply the current statement, filtered to those with more supporters than the current one. The underlying SDK function `getStatementSuggestions` (`sdk/src/subsystems/conceptspace/queries.ts:754`) only finds related statements through on-chain implication attestations. Missing: autocomplete when creating/searching, broader relatedness beyond attested implications (semantic similarity, domain-based), any graph/map visualization, and bridge-creator-synthesized nudges.
  - The nudger architecture described above (off-chain services, signed messages, trust configuration) is not yet implemented.
