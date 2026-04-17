# General Nudger Service

A nudger is an off-chain service that watches the statement graph and suggests statements to users: "you signed S1 — you might also want to sign S2."

## Relationship to implication attestations

Nudges and implication attestations are fundamentally different things:

| | Implication attestation | Nudge |
|---|---|---|
| Claim | "If you believe S1, you logically also believe S2" | "You signed S1; you might also want to sign S2" |
| Rigor | Rigorous, incontrovertible | Exploratory, user decides |
| Storage | On-chain (permanent, affects support counts) | Off-chain (signed message, no gas, no permanence) |
| Bad suggestion | Costs gas to correct; misleads support counts | Nudger just stops serving it |

This distinction matters most for [bridge-creator](../../../product/bridge-creator.md) output: the modified statements it synthesizes are plausible extensions of a user's position, not logical entailments. Putting them through the attestation system would misrepresent users' beliefs. Nudges are exactly the right fit.

See [hints.md](../conceptspace/hints.md) for the full rationale.

## Architecture

A nudger is:
- An off-chain HTTP service
- Identified by its Ethereum address (used to verify signatures)
- Anyone can run one, just as anyone can run an implication attester
- Users configure which nudgers they trust in Settings

### NudgeMessage format

```typescript
type NudgeMessage = {
  nudger: string;                  // Ethereum address of the nudger
  targetStatementCid: string;      // "You signed this..."
  suggestedStatementCid: string;   // "...you might also want to sign this"
  reason: string;                  // Human-readable explanation
  confidence: number;              // 0-1
  timestamp: number;               // Unix timestamp
  signature: string;               // EIP-191 signature over the above fields
};
```

The signature lets anyone verify a nudge came from a particular nudger, without on-chain transactions. The nudger signs over all fields except `signature` itself.

### Nudger HTTP API

Every nudger exposes the same interface, so the SDK can talk to any nudger uniformly:

**`GET /nudges?targetStatementCid=<cid>`**
Given a statement the user has signed, return nudge candidates. Response:
```typescript
{
  nudges: NudgeMessage[];
}
```

**`GET /nudges/bulk?targetStatementCids=<cid1>,<cid2>,...`**
Batch version, for when the SDK needs to fetch nudges for multiple signed statements at once.

**`GET /.well-known/nudger.json`**
Metadata the UI uses to display the nudger to the user when they're configuring trusted nudgers:
```typescript
{
  address: string;        // Ethereum address (matches signatures)
  name: string;           // e.g. "Commonality Bridge Creator"
  description: string;    // What strategy this nudger uses
  sourceType: string;     // "bridge-creator" | "implication-graph" | etc.
  version: string;
}
```

**`GET /health`**
Standard health endpoint.

## SDK integration

The SDK holds the user's list of trusted nudger URLs (from settings). When displaying statement suggestions for a given statement, it:

1. Polls each trusted nudger's `/nudges?targetStatementCid=...` endpoint.
2. Verifies each NudgeMessage's signature against the nudger's Ethereum address.
3. Discards messages with invalid signatures or from addresses not matching the configured nudger.
4. Merges results with the existing implication-graph suggestions (from `getStatementSuggestions`).
5. Deduplicates (a statement might be suggested by multiple nudgers or by the implication graph).
6. Returns a combined, ranked list to the UI.

Fetching can be done lazily (when the user views a statement) or proactively (background prefetch for recently-signed statements).

## Trust configuration

In the Settings UI, alongside trusted implication attesters, users see a "Trusted Nudgers" section. For each nudger they've added:
- The nudger's name and description (fetched from `/.well-known/nudger.json`)
- Its Ethereum address
- Option to remove it

The UI shows which nudger produced each suggestion, so users can evaluate whether they want to keep trusting it. A nudger's track record is visible — users can see what it's been suggesting.

## Built-in nudger strategies

The framework is general: any nudger can plug in whatever heuristics or AI prompts it wants. Two specific strategies are planned:

### 1. Implication-graph nudger

The simple case: watch the implication graph for statements that are implied by (or imply) statements the user has signed, filtered to those with more supporters. "You signed S1, and S2 is more popular and implies S1 — maybe you'd like to sign S2 too."

This is essentially what `getStatementSuggestions` ([sdk/src/subsystems/conceptspace/queries.ts:754](../../../../../sdk/src/subsystems/conceptspace/queries.ts)) and the `StatementSuggestions` component ([ui/src/conceptspace/components/StatementSuggestions.tsx](../../../../../ui/src/conceptspace/components/StatementSuggestions.tsx)) already do — but currently embedded in the SDK/UI rather than running as an off-chain service. This strategy can be extracted into a proper nudger service and serve as the reference implementation.

### 2. Bridge-creator nudger

The more sophisticated case: an AI service that synthesizes *new* statements designed to surface hidden common ground. See [bridge-creator.md](../../../product/bridge-creator.md) for full details.

Concretely:
1. Watches for new statements via the indexer.
2. Identifies pairs that look like they almost bridge (moderate statements from opposing sides with compatible positions).
3. Synthesizes modified statements and commonality statements, publishing them to IPFS.
4. Publishes signed NudgeMessages connecting original statements to the synthesized ones.
5. Separately, submits the modified→commonality pairs to the implication attester (those *are* genuine logical implications).

### Future strategies

- Semantic similarity (vector embeddings to find related statements outside the implication graph)
- Domain-based suggestions (trending statements in the same domain)
- Collaborative filtering ("users who signed S1 often also signed S2")

## What exists vs. what needs to be built

| Component | Status |
|-----------|--------|
| `getStatementSuggestions` (implication-graph queries) | ✅ Implemented |
| `StatementSuggestions` UI component | ✅ Implemented |
| NudgeMessage format specification | ✅ Specified (in hints.md) |
| Nudger service framework (Express app, signing, API endpoints) | ❌ Not built |
| SDK: fetch + verify nudges from trusted nudger URLs | ❌ Not built |
| Settings UI: add/configure trusted nudgers | ❌ Not built |
| UI: display nudges alongside implication-graph suggestions | ❌ Not built |
| Implication-graph nudger (as standalone service) | ❌ Not built |
| Bridge-creator nudger | ❌ Not built |

The existing `StatementSuggestions` / `getStatementSuggestions` is a proto-nudger — it implements one nudging strategy but is tightly coupled into the SDK rather than running as an off-chain service. The migration path is: extract that logic into the implication-graph nudger service, then update the SDK to fetch from nudger APIs instead of querying the implication graph directly. The UI component can remain structurally similar while its data source changes.

## Implementation notes

The nudger service pattern mirrors the implication attester:
- Node.js/TypeScript/Express
- Holds an Ethereum key for signing nudge messages (env var)
- Uses the SDK for reading statements and beliefs
- Deployed to Render or similar

Unlike the attester, nudgers don't write on-chain transactions, so gas management is not a concern. Payment (via x402) is optional — a nudger that wants to sustain itself could require it, but the implication-graph nudger and bridge-creator nudger can start without it.
