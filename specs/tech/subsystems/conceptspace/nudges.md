# Hints / nudges

The point of the implication system is to allow us to *not* bother coordinating on a particular statement... but OTOH, it is still kinda *nice* to know that a statement has direct (rather than indirect) support.

So to try to nudge the system gently in the direction of avoiding unneeded proliferation of very-similar statements, there should be a suggestion system: the UI can offer the user hints/nudges of the form "you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well."

It might also be useful to offer nudges regarding *related* statements, even if they don't mean quite the same thing.

The UI could be a simple list of related statements. Or an "autocomplete" sort of thing. Or a visual map that shows related statements nearby.

## Sources of nudge candidates

Nudges can come from several distinct sources:

### 1. Implication graph discovery

The simplest case: the system notices that you signed S1, and there's a more-popular statement S2 that S1 implies (or that implies S1). "You signed S1; maybe you'd like to sign S2 as well."

This same nudger can also handle a nearby case: S1 is too ambiguous or context-dependent to safely connect to the implication graph, but there is a clearer statement S2 that seems like a likely intended meaning and is easier to connect. In that case the suggestion is still a nudge, not an implication: "You signed S1; if this is what you meant, you might want to sign S2 as well."

### 2. Bridge-creator synthesis

The [bridge creator](/specs/product/bridge-creator.md) generates *new* statements that don't exist yet in the graph — modified versions of what one side has said, designed to make the compatibility with the other side more explicit, plus commonality statements that both modified statements imply.

These synthesized statements are offered as nudges, *not* as implication attestations. The distinction matters: an implication attestation says "if you believe S1, you logically also believe S2" (rigorous, incontrovertible). A nudge from the bridge-creator says "you signed S1, and here's a new statement S2 that you *might* also be willing to sign — it's compatible with your position and it also happens to be compatible with what the other side is saying." The user decides whether to sign it; the system isn't putting words in their mouth.

This is the key mechanism for the [misunderstandings sub-pattern](/docs/end-user/common-sense-majority/hidden-majority-patterns.md#misunderstandings-of-what-the-other-side-believes) of hidden majorities, where the implication graph alone can't surface the common ground because people haven't yet encountered (let alone signed) the "clued-in" version of their position.

On top of nudges, the bridge-creator also uses the [noninflammatory content](/specs/tech/subsystems/conceptspace/content-patterns/noninflammatory-content.md) system as a third layer: social-media posts that make the case for the nudge statement, backed by a noninflammatory-content attestation that says "reading this won't piss you off." This is longer-form persuasion, not just a suggestion — but it's still opt-in, transparent (the AI's prompt is visible), and the user can configure which attesters they trust.

### 3. Retraction re-anchor

When a [PublishedData](/specs/tech/subsystems/published-data/README.md) statement is retracted by its author, anyone who signed it loses their *transitive* support of everything it implied — the display/aggregation policy stops counting support that flows through a statement with no honored live publication (see the [published-data aggregation rule](/specs/tech/subsystems/published-data/README.md#transitive-aggregation-and-the-re-anchor-nudge)). That's correct — a headline count must not leak a suppressed statement back in transitively — but it would be a silent loss if we left it there: the signer made a real, still-on-chain attestation, and their underlying view may not have changed at all.

The re-anchor nudge closes that gap. Two facts survive the retraction even under total suppression of the content: **the signer's signature on the retracted statement's CID, and the implication attestations from it.** So the system can tell the signer: "You signed A, which its author has since retracted. It implies B, C, D… — go look and sign directly any that still match your view."

This is not a new nudger. It's a **retraction-triggered mode of the existing [implication-graph nudger](#1-implication-graph-discovery)** (`implication-graph-nudger`), which already walks the arrows out of a statement and suggests the targets. The only new parts are the trigger (a `DataRetracted` event, rather than a fresh belief/statement) and the scoping (arrows out of the *retracted* statement specifically). It inherits everything else — the batch model, trusted-nudger gating, and the fact that implications are already filtered to the **viewer's trusted attesters**, so a signer is only ever re-anchored along an implication their own trust config honors.

Design points, several of which are deliberate:

- **The count wasn't wrong, the substrate was withdrawn.** Transitive support isn't a presumption we're now making explicit — it's the designed semantics of the implication system (that's the whole point: *don't* force everyone onto one exact statement), gated by viewer-trusted attesters and meant to be rigorous entailment. The nudge exists because retraction *withdrew the via-statement*, not because the transitive count was ever illegitimate. What it offers is a sturdier footing: a direct signature on B survives any future retraction of A, whereas transitive support through A does not. So frame it as "the thing your support was resting on went away; here's the more durable way to keep it," and let the signer decide per implied statement.
- **Fire proactively, but batch per (signer, retracted-statement).** A single retracted statement may imply many things, and blasting one message per implied statement would be spam. Instead emit **one** nudge per signer per retracted statement: "you signed A, it was retracted, and it implies a bunch of things — want to review them and sign any directly?" The implied statements are the nudge's payload; the signer reviews them in one place.
- **Fire only on real retraction, never on transient unavailability.** The trigger is a `DataRetracted` event, not a statement whose content host happened to be unreachable at read time. Firing on transient `unavailable` would spam signers to re-anchor over content that is about to come back. (See the [`retracted` vs `unavailable` distinction](/specs/tech/subsystems/published-data/README.md#transitive-aggregation-and-the-re-anchor-nudge).)
- **Showing the signer what they signed is free for self-retraction.** Nothing is deleted on a publisher self-retraction: the SDK reader still returns the bytes as `readData().retractedData` (named by status so a client reaches for them consciously). So the nudge can show A directly — no separate "personal copy" store is needed. The only case where our API won't serve A is a denylist/regulator takedown, where the honest fallback is a copy the reader kept on their own device; we do not build an operator-hosted copy store (that would be anti-compliance). See [PublishedData § Transitive aggregation](/specs/tech/subsystems/published-data/README.md#transitive-aggregation-and-the-re-anchor-nudge).
- **No laundering immunity.** If A was retracted because it was objectionable and B is a softened restatement of the same content, re-anchoring toward B must not bless B. B is a first-class statement with its own retraction/denylist surface; if B is bad it gets suppressed on its own merits. The nudge grants nothing special.


## Nudger architecture

A nudger is an off-chain service identified by its Ethereum address. It periodically publishes **batches** of nudges: the batch content is a JSON document on IPFS, and the nudger calls `NudgePublications.publishNudgeBatch(batchCid)` on-chain to record it. The onchain event (signed by the nudger's Ethereum address) is what establishes authenticity — no per-nudge signatures are needed.

This mirrors the trust model for implication attesters: users configure which nudger addresses they trust (in the same Settings section), and the SDK only shows nudges from trusted nudgers. A nudger corrects a bad suggestion by publishing a new batch whose `revocations` array names the specific `(targetStatementCid, suggestedStatementCid)` pair to retract — no need to invalidate the rest of the batch's nudges.

The bridge-creator is just one type of nudger. Others might use different strategies: semantic similarity, trending statements, domain-based suggestions, etc.

This gives a useful division of labor:
- The implication attester stays conservative and refuses to infer missing context.
- The implication-graph nudger helps users move toward clearer, more graph-usable statements.
- The bridge-creator handles a different job: synthesizing compromise or common-ground statements between positions.

See the [nudger README](../nudger/README.md) for the full technical spec including the `NudgeBatch` format, smart contract interface, and SDK integration.

### How it flows

1. A nudger service watches for new statements and new beliefs (via the indexer).
2. It identifies nudge candidates using its strategy (implication graph, bridge-creator synthesis, semantic similarity, etc.).
3. It assembles a `NudgeBatch` JSON document and uploads it to IPFS.
4. It calls `NudgePublications.publishNudgeBatch(batchCid)` on-chain.
5. The SDK queries the indexer for `NudgesPublished` events from trusted nudgers, fetches the IPFS batches, and merges the results into the UI's suggestion system.
6. The user sees nudges from their trusted nudgers alongside the existing implication-graph-based suggestions.

### Trust configuration

Users configure trusted nudgers in Settings, the same way they configure trusted attesters. The UI shows which nudger produced each suggestion, so the user can evaluate whether they want to keep trusting it.


## Current state

Do we have anything like that?
  - We have partial coverage: There's a `StatementSuggestions` component (`ui/src/conceptspace/components/StatementSuggestions.tsx`) that shows statements that are implied by or imply the current statement, filtered to those with more supporters than the current one. The underlying SDK function `getStatementSuggestions` (`sdk/src/subsystems/conceptspace/queries.ts:754`) only finds related statements through on-chain implication attestations. Missing: autocomplete when creating/searching, broader relatedness beyond attested implications (semantic similarity, domain-based), and graph/map visualization.
  - The nudger architecture now exists via `nudger-core`, `implication-graph-nudger`, `bridge-creator`, `explorer-curator`, `NudgePublications`, and trusted-nudger UI settings. The remaining work is product depth and coverage, not the basic architecture.
