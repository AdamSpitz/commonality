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

Nudgers publish **typed publications**. A publication is a JSON document uploaded to IPFS. The nudger then publishes the CID on-chain via the shared `NudgePublications` contract, emitting a `NudgesPublished` event that ties the document to the nudger's Ethereum address.

This gives:
- **Verifiability**: the onchain event proves a publication came from a specific nudger
- **Discoverability**: clients query the indexer for all `NudgesPublished` events from trusted nudger addresses
- **Extensibility**: different nudger strategies can publish different document shapes without needing separate trust/discovery infrastructure

The key design change is that the onchain event means "this nudger published this CID", not "this CID is necessarily a pairwise nudge batch". The document itself declares its type.

### Publication envelope (IPFS document)

All nudger publications share a common envelope:

```typescript
type NudgerPublicationBase = {
  kind: string;         // Publication type discriminator
  schemaVersion: 1;     // Version of this publication kind
  nudger: string;       // Ethereum address of the nudger (matches onchain event)
  publishedAt: number;  // Unix timestamp
};
```

The SDK/client looks at `kind` and then applies the fold semantics for that publication type.

### Publication kind: `nudge-batch`

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
  kind: 'nudge-batch';
  schemaVersion: 1;
  nudger: string;                  // Ethereum address of the nudger (matches onchain event)
  publishedAt: number;             // Unix timestamp
  nudges: NudgeMessage[];
  revocations: NudgeRevocation[];  // per-nudge revocations of entries from previous batches
};
```

This is the right publication kind for ordinary pairwise suggestions: "you signed S1, you might also want to sign S2."

Fold semantics:
- Publications are processed in `publishedAt` order per nudger.
- New `nudges` are additive.
- `revocations` remove previously published `(targetStatementCid, suggestedStatementCid)` pairs from that nudger.

This lets a nudger correct a single bad suggestion without invalidating the rest of its history.

### Publication kind: `curated-collection`

This is the right publication kind for explorer-style shared maps: a small curated set of statements that many users will browse, and that a per-user LLM call can personalize.

```typescript
type CuratedCollectionEntry = {
  cid: string;        // Statement CID
  label: string;      // Short human-readable label for this area
  topicArea: string;  // Broad topic grouping
};

type CuratedCollectionPublication = {
  kind: 'curated-collection';
  schemaVersion: 1;
  nudger: string;        // Ethereum address of the nudger (matches onchain event)
  publishedAt: number;   // Unix timestamp
  stream: string;        // e.g. "fundable-project-explorer"
  entries: CuratedCollectionEntry[];
};
```

This is intentionally **not** pairwise. It is a shared resource published by a nudger identity.

Fold semantics:
- Publications are grouped by `(nudger, stream)`.
- The latest valid publication wins.
- A new publication replaces the previous collection for that stream, rather than incrementally revoking individual entries.

### NudgePublications smart contract

A single shared contract. Any nudger can call it. No on-chain state — the event log is the complete canonical record.

```solidity
event NudgesPublished(address indexed nudger, bytes32 indexed publicationCid);

function publishNudgeBatch(bytes32 publicationCid) external;
```

The current contract/function naming still reflects the original pairwise-only design, but semantically the event means "this nudger published this IPFS document". Since nothing is in production yet, the naming can be generalized in Solidity later if we want (`publishPublication`, `publicationCid`, etc.). The important part is the trust/discovery model, not the legacy name.

### Nudger HTTP endpoints

Every nudger exposes a minimal HTTP interface for discovery and health monitoring (but not for serving publications — the canonical source is the chain):

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
2. Fetches each published document from IPFS.
3. Dispatches by `kind`, applying the fold semantics for that publication type.
4. For `nudge-batch`, accumulates pairwise suggestions and applies revocations.
5. For `curated-collection`, keeps the latest publication per `(nudger, stream)`.
6. Exposes the resulting views to the relevant UI surfaces:
   - statement suggestion surfaces consume folded `nudge-batch` data
   - explorer pages consume the latest `curated-collection` for their stream

## Trust configuration

In the Settings UI, alongside trusted implication attesters, users see a "Trusted Nudgers" section. The current UI supports adding and removing nudgers by Ethereum address. A richer add flow that fetches `/.well-known/nudger.json` and displays the nudger's name and description is still to be built.

The UI should eventually show which nudger produced each suggestion, so users can evaluate whether they want to keep trusting it.

## Built-in nudger strategies

The framework is general: any nudger can plug in whatever heuristics or AI prompts it wants. Different strategies may publish different publication kinds.

### 1. Implication-graph nudger

The simple case: watch the implication graph for statements that are implied by (or imply) statements the user has signed, filtered to those with more supporters. "You signed S1, and S2 is more popular and implies S1 — maybe you'd like to sign S2 too."

This is essentially what `getStatementSuggestions` ([sdk/src/subsystems/conceptspace/queries.ts:754](../../../../../sdk/src/subsystems/conceptspace/queries.ts)) and the `StatementSuggestions` component ([ui/src/conceptspace/components/StatementSuggestions.tsx](../../../../../ui/src/conceptspace/components/StatementSuggestions.tsx)) already do — but currently embedded in the SDK/UI rather than running as an off-chain service. This strategy can be extracted into a proper nudger service and serve as the reference implementation.

The implication-graph nudger runs as a background worker: it scans all statements periodically, generates nudges for each, and publishes them as `nudge-batch` publications.

### 2. Bridge-creator nudger

The more sophisticated case: an AI service that synthesizes *new* statements designed to surface hidden common ground. See [bridge-creator.md](../../../product/bridge-creator.md) for full details.

Concretely:
1. Watches for new statements via the indexer.
2. Identifies pairs that look like they almost bridge (moderate statements from opposing sides with compatible positions).
3. Synthesizes modified statements and commonality statements, publishing them to IPFS.
4. Collects the resulting nudges and publishes them as `nudge-batch` publications.
5. Separately, submits the modified→commonality pairs to the implication attester (those *are* genuine logical implications).

### 3. Explorer nudger

The explorer case is different from ordinary pairwise nudges. It publishes a shared curated map of a territory, then uses a cheap per-user LLM call to decide which parts of that map to surface for a particular user.

This strategy publishes `curated-collection` publications rather than `nudge-batch` publications.

### Future strategies

- Semantic similarity (vector embeddings to find related statements outside the implication graph)
- Domain-based suggestions (trending statements in the same domain)
- Collaborative filtering ("users who signed S1 often also signed S2")

## What exists vs. what needs to be built

| Component | Status |
|-----------|--------|
| `getStatementSuggestions` (implication-graph queries) | ✅ Implemented (legacy proto-nudger, kept for backward compatibility) |
| `getStatementNudges` (typed publication queries) | ✅ Implemented (`sdk/src/subsystems/conceptspace/queries.ts`) |
| `StatementSuggestions` UI component | ✅ Implemented (reads from folded `nudge-batch` publications) |
| Typed nudger publication model | ✅ Specified and implemented |
| `NudgePublications` smart contract | ✅ Implemented |
| Nudger service framework (background worker, publishing) | ✅ Implemented (`nudger-core`) |
| Implication-graph nudger (as standalone service) | ✅ Implemented (background worker) |
| SDK: fetch + fold typed nudger publications from indexer | ✅ Implemented |
| Settings UI: add/configure trusted nudgers by address | ✅ Implemented |
| Settings UI: nudger metadata discovery (`/.well-known/nudger.json`) | ✅ Implemented (optional service URL on add) |
| UI: display `nudge-batch` suggestions | ✅ Implemented |
| UI: nudge dismissal / intensity / topic filtering | ✅ Implemented |
| UI: explorer pages backed by `curated-collection` publications | ✅ Implemented (`ExplorerPage` at `/explore`) |
| Bridge-creator nudger | ✅ Implemented (`bridge-creator/`) |
| Explorer nudger strategy (background curator + per-user personalizer) | ✅ Implemented (`explorer-curator/`) |

The existing `StatementSuggestions` / `getStatementSuggestions` is a proto-nudger — it implements one nudging strategy but is tightly coupled into the SDK rather than reading from the nudger publication system. The migration path is: update the SDK to fetch typed publications from the indexer (querying `NudgesPublished` events from trusted nudgers), then have each UI surface consume the publication kinds it cares about.

## Implementation notes

The nudger service pattern mirrors the implication attester:
- Node.js/TypeScript/Express (minimal HTTP for health/metadata; background worker does the real work)
- Holds an Ethereum key for signing publish transactions (env var)
- Uses the SDK for reading statements and writing to IPFS + chain
- Deployed to Render or similar

Unlike the attester, nudgers publish off-chain typed documents referenced by on-chain events. Payment (via x402) is optional.
