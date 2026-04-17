# General Nudger Service

A nudger is an off-chain service that watches the statement graph and suggests statements to users: "you signed S1 — you might also want to sign S2."

## Relationship to implication attestations

Nudges and implication attestations are fundamentally different things:

| | Implication attestation | Nudge |
|---|---|---|
| Claim | "If you believe S1, you logically also believe S2" | "You signed S1; you might also want to sign S2" |
| Rigor | Rigorous, incontrovertible | Exploratory, user decides |
| Storage | On-chain (permanent, affects support counts) | On-chain event → IPFS batch |
| Bad suggestion | Costs gas to correct; misleads support counts | Nudger revokes the batch |

This distinction matters most for [bridge-creator](../../../product/bridge-creator.md) output: the modified statements it synthesizes are plausible extensions of a user's position, not logical entailments. Putting them through the attestation system would misrepresent users' beliefs. Nudges are exactly the right fit.

See [hints.md](../conceptspace/hints.md) for the full rationale.

## Architecture

A nudger is:
- An off-chain background service
- Identified by its Ethereum address (the address that signs its onchain publish transactions)
- Anyone can run one, just as anyone can run an implication attester
- Users configure which nudgers they trust in Settings

### Publication model

Nudgers publish their nudges in **batches**. Each batch is a JSON document uploaded to IPFS. The nudger then calls `NudgePublications.publishNudgeBatch(batchCid)` on-chain, emitting a `NudgesPublished` event that ties the batch to the nudger's Ethereum address. Old batches remain valid until the nudger explicitly calls `revokeNudgeBatch`.

This gives:
- **Verifiability**: the onchain event proves a batch came from a specific nudger (no per-nudge signatures needed)
- **Revocability**: a nudger can revoke a batch if a bug or bad AI output was published
- **Discoverability**: clients query the indexer for all `NudgesPublished` events from trusted nudger addresses

### NudgeBatch format (IPFS document)

```typescript
type NudgeMessage = {
  targetStatementCid: string;      // "You signed this..."
  suggestedStatementCid: string;   // "...you might also want to sign this"
  reason: string;                  // Human-readable explanation
  confidence: number;              // 0-1
};

type NudgeRevocation = {
  targetStatementCid: string;
  suggestedStatementCid: string;
};

type NudgeBatch = {
  nudger: string;                  // Ethereum address of the nudger (matches onchain event)
  publishedAt: number;             // Unix timestamp
  nudges: NudgeMessage[];
  revocations: NudgeRevocation[];  // per-nudge revocations of entries from previous batches
};
```

New batches are additive. To retract a specific nudge, publish a new batch whose `revocations` array includes that `(targetStatementCid, suggestedStatementCid)` pair. This lets a nudger correct a single bad suggestion without re-publishing or invalidating the rest of its history.

### NudgePublications smart contract

A single shared contract. Any nudger can call it. No on-chain state — the event log is the complete canonical record.

```solidity
event NudgesPublished(address indexed nudger, bytes32 indexed batchCid);

function publishNudgeBatch(bytes32 batchCid) external;
```

`batchCid` is the IPFS CID of the `NudgeBatch` JSON document, encoded as bytes32 (same convention as statement CIDs throughout the system).

### Nudger HTTP endpoints

Every nudger exposes a minimal HTTP interface for discovery and health monitoring (but not for serving nudges — the canonical source is the chain):

**`GET /.well-known/nudger.json`**
Metadata the UI uses to display the nudger when users configure trusted nudgers:
```typescript
{
  address: string;        // Ethereum address (matches onchain events)
  name: string;           // e.g. "Commonality Bridge Creator"
  description: string;    // What strategy this nudger uses
  sourceType: string;     // "bridge-creator" | "implication-graph" | etc.
  version: string;
}
```

**`GET /health`**
Standard health endpoint.

## SDK integration

The SDK holds the user's list of trusted nudger Ethereum addresses (from settings). When the user views statement suggestions, the SDK:

1. Queries the indexer for all `NudgesPublished` events from trusted nudger addresses.
2. Fetches each batch from IPFS, ordered by `publishedAt`.
3. Folds the batches in order: accumulates `nudges`, then applies `revocations` (removing any matching `(targetStatementCid, suggestedStatementCid)` pair seen so far from this nudger).
4. Deduplicates any remaining nudges by `(targetStatementCid, suggestedStatementCid)` across nudgers.
5. Merges results with the existing implication-graph suggestions (from `getStatementSuggestions`).
6. Returns a combined, ranked list to the UI.

## Trust configuration

In the Settings UI, alongside trusted implication attesters, users see a "Trusted Nudgers" section. Users add a nudger by its Ethereum address (or optionally by a URL to fetch `/.well-known/nudger.json` to pre-fill the name and description). For each trusted nudger:
- The nudger's name and description
- Its Ethereum address
- Option to remove it

The UI shows which nudger produced each suggestion, so users can evaluate whether they want to keep trusting it.

## Built-in nudger strategies

The framework is general: any nudger can plug in whatever heuristics or AI prompts it wants. Two specific strategies are planned:

### 1. Implication-graph nudger

The simple case: watch the implication graph for statements that are implied by (or imply) statements the user has signed, filtered to those with more supporters. "You signed S1, and S2 is more popular and implies S1 — maybe you'd like to sign S2 too."

This is essentially what `getStatementSuggestions` ([sdk/src/subsystems/conceptspace/queries.ts:754](../../../../../sdk/src/subsystems/conceptspace/queries.ts)) and the `StatementSuggestions` component ([ui/src/conceptspace/components/StatementSuggestions.tsx](../../../../../ui/src/conceptspace/components/StatementSuggestions.tsx)) already do — but currently embedded in the SDK/UI rather than running as an off-chain service. This strategy can be extracted into a proper nudger service and serve as the reference implementation.

The implication-graph nudger runs as a background worker: it scans all statements periodically, generates nudges for each, and publishes them as a batch via `NudgePublications.publishNudgeBatch`.

### 2. Bridge-creator nudger

The more sophisticated case: an AI service that synthesizes *new* statements designed to surface hidden common ground. See [bridge-creator.md](../../../product/bridge-creator.md) for full details.

Concretely:
1. Watches for new statements via the indexer.
2. Identifies pairs that look like they almost bridge (moderate statements from opposing sides with compatible positions).
3. Synthesizes modified statements and commonality statements, publishing them to IPFS.
4. Collects the resulting nudges and publishes them as a `NudgeBatch` via `NudgePublications`.
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
| NudgeBatch format specification | ✅ Specified (this file) |
| `NudgePublications` smart contract | ✅ Implemented |
| Nudger service framework (background worker, publishing) | ✅ Implemented (`nudger-core`) |
| Implication-graph nudger (as standalone service) | ✅ Implemented (background worker) |
| SDK: fetch + verify nudge batches from indexer | ❌ Not built |
| Settings UI: add/configure trusted nudgers | ❌ Not built |
| UI: display nudges alongside implication-graph suggestions | ❌ Not built |
| Bridge-creator nudger | ❌ Not built |

The existing `StatementSuggestions` / `getStatementSuggestions` is a proto-nudger — it implements one nudging strategy but is tightly coupled into the SDK rather than reading from the nudger system. The migration path is: update the SDK to fetch nudge batches from the indexer (querying `NudgesPublished` events from trusted nudgers), then update the UI component to use that data source instead of querying the implication graph directly.

## Implementation notes

The nudger service pattern mirrors the implication attester:
- Node.js/TypeScript/Express (minimal HTTP for health/metadata; background worker does the real work)
- Holds an Ethereum key for signing publish transactions (env var)
- Uses the SDK for reading statements and writing to IPFS + chain
- Deployed to Render or similar

Unlike the attester, nudgers publish in batches rather than per-item. Payment (via x402) is optional.
