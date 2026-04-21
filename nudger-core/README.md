# Nudger Core

Shared infrastructure for Commonality nudger services.

This package contains the reusable pieces that do not depend on a specific nudge strategy:

- `NudgerStrategy` interface — the contract every nudger strategy must implement
- `NudgeMessage`, `NudgeRevocation`, `NudgeBatch` types — the payload shapes for `nudge-batch` publications
- `NudgerConfig` base configuration type
- `LlmNudgerConfig` strategy-specific extension for nudgers that call an LLM
- `initializeSigner`, `getSignerAddress`, `publishNudgeBatch` — helpers for signing transactions and publishing batches to IPFS + chain

Nudger-specific services such as `implication-graph-nudger/` and `bridge-creator/` keep their strategy logic local, and import the shared pieces from this package.

## Publication model

Nudgers publish **typed publications**. `publishNudgeBatch` uploads a `NudgeBatch` document to IPFS and then calls `publishNudgeBatch` on the `NudgePublications` smart contract, emitting a `NudgesPublished` event that ties the CID to the nudger's Ethereum address.

The SDK client queries the indexer for those events, fetches each document from IPFS, and folds the nudges to produce statement suggestions.

See [`specs/tech/subsystems/nudger/README.md`](../specs/tech/subsystems/nudger/README.md) for the full publication model, fold semantics, and the `curated-collection` publication kind (used by explorer-style nudgers, not yet implemented in this package).

## Types

```typescript
// A single suggestion: "you signed targetStatementCid, you might also want suggestedStatementCid"
interface NudgeMessage {
  targetStatementCid: string;
  suggestedStatementCid: string;
  reason: string;
  confidence: number;   // 0–1
}

// Revoke a previously published (target, suggested) pair
interface NudgeRevocation {
  targetStatementCid: string;
  suggestedStatementCid: string;
}

// The IPFS document uploaded per publish cycle
interface NudgeBatch {
  kind: 'nudge-batch';          // Publication type discriminator
  schemaVersion: 1;             // Schema version for nudge-batch publications
  nudger: string;               // Ethereum address of the nudger
  publishedAt: number;          // Unix timestamp
  nudges: NudgeMessage[];
  revocations: NudgeRevocation[];  // per-nudge revocations of entries from previous batches
}
```

## Strategy interface

```typescript
interface NudgerStrategy {
  name: string;
  generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    config: NudgerConfig
  ): Promise<NudgeMessage[]>;
}
```

The background worker in each nudger service calls `generateNudges` for every statement in the graph, collects the results, and then calls `publishNudgeBatch` once to publish the full batch.

## Configuration types

`NudgerConfig` now contains only the chain/IPFS/service fields required by every nudger. Strategies that actually call an LLM should extend `LlmNudgerConfig`:

```typescript
interface NudgerConfig {
  nudgerPrivateKey: string;
  ethereumRpcUrl: string;
  indexerUrl: string;
  ipfsApiUrl: string;
  ipfsGatewayUrl: string;
  port: number;
  name: string;
  description: string;
  sourceType: string;
  version: string;
  nudgePublicationsContractAddress: string;
}

interface LlmNudgerConfig extends NudgerConfig {
  openRouterApiKey: string;
  openRouterModel: string;
}
```

This keeps purely graph-based strategies such as `implication-graph-nudger/` from requiring unrelated OpenRouter environment variables, while still letting AI-based nudgers like `bridge-creator/` declare their extra requirements explicitly.
