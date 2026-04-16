# Implication Discovery

This document clarifies the plan for implication "discovery" services — the mechanisms that proactively find candidate implication pairs for the attester to evaluate.

## Current Architecture: The Finder

The **finder** is an AI-assisted service that automatically discovers candidate implication pairs. It's already implemented in `finder/`.

### What it does

1. **Polls for new statements** — watches DirectSupport events to find statements with activity since last run.
2. **Builds popularity map** — counts believers per statement to identify "popular" statements.
3. **Selects candidate pairs** — for each new statement, pairs it with popular statements in both directions (`new → popular` and `popular → new`).
4. **Submits to attester** — sends candidate pairs to the attester's `/evaluate-implications-batch` endpoint.
5. **Persists state** — tracks evaluated pairs to avoid re-processing.

### How it fits

```
Blockchain (Beliefs contract)
    ↓ events
Ponder indexer (event cache)
    ↓ REST: /api/events
Finder (this document)
    ↓ POST /evaluate-implications-batch
Attester
    ↓ writes ImplicationAttestation on-chain
Blockchain (Implications contract)
```

The finder is **proactive** (goes looking for pairs) while the attester is **reactive** (evaluates pairs it receives). This separation of concerns is intentional.

## Enhancement: Transitive Chain Discovery

The SDK only looks one level deep for indirect support (non-transitive implications). However, the finder is well-positioned to notice when a clear chain exists:

**Current behavior:**
- If A→B and B→C are attested, users who believe A count as indirect supporters of B (one hop)
- But they do NOT count as indirect supporters of C (non-transitive by design)

**Discovery feature (proposed):**
When the finder notices a clear A→B→C chain:
1. It can infer that A→C might also be reasonable
2. It can proactively submit the A→C pair to the attester for evaluation
3. If attested, A believers would become direct indirect supporters of C (one hop instead of zero)

**Why this belongs in the finder:**
- The finder already has the full implication graph from fetching existing attestations
- The attester's job is to evaluate pairs it receives, not to discover pairs
- The finder is the "suggestion engine" — its job is to notice patterns and suggest pairs to evaluate

**Heuristic for chain detection:**
- Find statements A, B, C where A→B and B→C are both attested (by trusted attesters)
- Neither A→C nor C→A should already be evaluated
- This is a "low-hanging fruit" suggestion — the chain suggests the direct link is likely valid

## Enhancement: Same-Domain Restriction

The fake-data-generation already restricts implications to same-domain pairs:

```typescript
// generateAttestations.ts:84
if (stmt1 !== stmt2 && stmt1.domain === stmt2.domain) {
  // Generate attestation
}
```

This prevents O(N²) explosion as statement count grows. We should apply the same restriction to the finder.

**Why same-domain makes sense:**
- Cross-domain implications are rare and harder to justify
- "If you believe Bitcoin is sound money, you probably believe crypto regulation is bad" is a stretch
- Same-domain pairs are cleaner: "if you believe wealth should be redistributed, you probably believe in universal basic income"

**Implementation:**
The finder should filter candidate pairs to only include those where both statements share the same domain. This requires:
1. Fetching IPFS content for statements to read their `domain` field
2. Filtering candidate pairs by `domain === domain`

**Note:** This is a future enhancement. The current finder generates pairs regardless of domain.

## Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Finder service | ✅ Implemented | Proactive candidate pair discovery |
| Transitive chain discovery | 📋 Proposed | Detect A→B→C chains, suggest A→C |
| Same-domain restriction | 📋 Proposed | Filter pairs to same-domain only |

The finder is the right place for discovery features because it already has visibility into the full set of statements and implications. The attester's role remains: receive pairs, evaluate them honestly, and write attestations on-chain if warranted.
