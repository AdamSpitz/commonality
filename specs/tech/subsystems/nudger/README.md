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

This distinction matters most for [bridge-creator](../../../product/bridge-creator.md) output: the modified statements it synthesizes from trusted Common Sense Majority beat-agent context and active anchor sets are plausible extensions of a user's position, not logical entailments. Putting them through the attestation system would misrepresent users' beliefs. Nudges are exactly the right fit.

See [nudges.md](../conceptspace/nudges.md) for the full rationale.

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
Metadata the UI and audit tools use to display and inspect a nudger before a user chooses to trust it:
```typescript
type NudgerDiscovery = {
  name: string;                  // Human-readable display name
  description: string;           // Short summary of the strategy
  nudger_type: string;           // "bridge-creator" | "explorer" | "implication-graph" | ...
  signer_address: string;        // Ethereum address matching onchain publication events
  strategy_prompt_url?: string;  // Optional pointer to a longer prompt/strategy document
  anchors_url?: string;          // Optional pointer to current curated anchors/collections
  trusted_sources?: Array<{
    service_url: string;
    signer_address?: string;
    role: string;
  }>;
  status: 'warming' | 'ready';   // Whether the service currently has enough upstream data to publish useful output
  contact?: string;
};
```

Long strategy prompts, anchor sets, and trusted-source details are linked rather than inlined so clients can show concise metadata first while audit tools can fetch the longer inspectable state when needed. Nudger types that do not use prompts or anchors should omit those URLs.

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

### Why nudger trust is different from attester trust

Nudgers are **ephemeral**. Their only output is suggestions; once a user has acted on a suggestion (by signing the suggested statement), the nudger has no further role. The provenance of the suggestion does not persist anywhere in the system: support counts, implication graph, funding flow — none of it carries a "this came from nudger X" tag. The signed statement stands on its own.

Compare with implication attesters, where every attestation a trusted attester publishes is implicitly accepted as a fact about how *your* support flows through the graph. There, your trusted-attesters list has public consequences for everyone aggregating support that involves you.

Because nudger output is ephemeral, nudger trust has weaker requirements:
- Your list of trusted nudgers doesn't need to be public, doesn't need to be onchain, and doesn't need to be agreed-upon. It can live entirely in your client (or in your AI tooling) without any visibility to the rest of the system.
- You can change it freely. Removing a nudger from your trusted list has no historical consequences — past suggestions you acted on are still your signed statements, and past suggestions you didn't act on simply disappear.

### Three layers of nudger trust

For users who want stronger guarantees than "we promise we're running the prompt we said we're running":

1. **Convenience layer.** We run the nudger as a service. You point your client at its onchain address, the SDK fetches its publications, you see its suggestions. Most users will stop here.
2. **Transparency layer.** The prompt and curated data (strategies, statement list) are published in an open repository. If you don't trust that our running service is faithfully executing the published prompt, you can read the prompt yourself and judge whether the suggestions you're getting are consistent with it.
3. **Self-host layer.** Because the prompt and data are open, and because nudger output is ephemeral (no shared onchain state to reproduce), you can run the entire nudger yourself against an LLM you trust. Point your AI tooling at the published prompt, feed it the curated statement list and your own signed statements, and generate suggestions locally. The onchain publication mechanism is a convenience for sharing one nudger's output across many users; it isn't load-bearing for trust.

This is the strongest form of [the configurability layer of the trust model](/docs/end-user/common-sense-majority/trust-model.md): not just "choose which operator you trust," but "operate it yourself, trivially." Nudgers are uniquely amenable to this because of their ephemerality. (Self-hosting an attester is also possible but more awkward — the attestation has to land onchain to count, so you take on operational responsibilities a fully-private nudger doesn't have.)

### Settings UI

In the Settings UI, alongside trusted implication attesters, users see a "Trusted Nudgers" section. The current UI supports adding and removing nudgers by Ethereum address; when the user supplies a service URL, it can fetch `/.well-known/nudger.json` and display the nudger's name and description.

The UI should eventually show which nudger produced each suggestion, so users can evaluate whether they want to keep trusting it.

The Settings UI is the path for users on layer 1 (convenience). Layers 2 and 3 don't require any onchain action at all — they happen entirely outside the platform's awareness, which is the point.

## Built-in nudger strategies

The framework is general: any nudger can plug in whatever heuristics or AI prompts it wants. Different strategies may publish different publication kinds.

### 1. Implication-graph nudger

The simple case: watch the implication graph for statements that are implied by (or imply) statements the user has signed, filtered to those with more supporters. "You signed S1, and S2 is more popular and implies S1 — maybe you'd like to sign S2 too."

This nudger can also do a closely related job: help users move from graph-poor statements to graph-usable ones. If a statement is too ambiguous or context-dependent to connect safely via implication attestations, the nudger may publish a clarification nudge suggesting a clearer statement that captures the likely intended meaning in a way that can participate in the graph.

This is still a nudge, not an implication. The claim is not "S1 logically implies S2"; it is "if S2 is what you meant, it may be a better statement to sign because it is clearer and more reusable."

This is essentially what `getStatementSuggestions` ([sdk/src/subsystems/conceptspace/queries.ts:754](../../../../sdk/src/subsystems/conceptspace/queries.ts)) and the `StatementSuggestions` component ([ui/src/conceptspace/components/StatementSuggestions.tsx](../../../../ui/src/conceptspace/components/StatementSuggestions.tsx)) already do — but currently embedded in the SDK/UI rather than running as an off-chain service. This strategy can be extracted into a proper nudger service and serve as the reference implementation.

The implication-graph nudger runs as a background worker: it scans all statements periodically, generates nudges for each, and publishes them as `nudge-batch` publications.

Two common sub-modes:
- **Direct graph nudge** — suggest an already-connected statement related by existing implication edges.
- **Clarification nudge** — suggest a clearer, more context-explicit statement when the original one is too ambiguous to connect safely.

When possible, the nudger should prefer an already-existing, well-supported clear statement over synthesizing a new one. Synthesizing a fresh statement is appropriate only when there is no good existing statement to point at.

### 2. Bridge-creator nudger

The more sophisticated case: an AI service that synthesizes *new* statements designed to surface hidden common ground. See [bridge-creator.md](../../../product/bridge-creator.md) for full details.

Concretely:
1. Fetches context summaries from trusted Common Sense Majority beat-agent services.
2. Loads the current CSM strategy prompt plus active left/right/common-ground anchor sets.
3. Uses an LLM to synthesize moderate-left, moderate-right, and common-ground bridge triples.
4. Publishes generated statements to IPFS, publishes a public `nudge-batch`, and skips duplicate publication when upstream context/anchors have not meaningfully changed.
5. Optionally submits modified→common-ground implications when that deployment seam is configured (those pairs are intended to be genuine logical implications).

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
