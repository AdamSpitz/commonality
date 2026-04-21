# Implication Discovery

This document clarifies the plan for implication "discovery" services — the mechanisms that proactively find candidate implication pairs for the attester to evaluate.

## Current Architecture: The Finder

The **finder** is an AI-assisted service that automatically discovers candidate implication pairs. It's implemented in `implication-finder/`.

### What it does

1. **Polls for new statements** — watches DirectSupport events to find statements with activity since last run.
2. **Builds popularity map** — counts believers per statement to identify "popular" statements.
3. **Fetches statement domains** — reads the `domain` field from each statement's IPFS content.
4. **Selects candidate pairs** — for each new statement, pairs it with popular statements in both directions (`new → popular` and `popular → new`), filtered to same-domain pairs.
5. **Submits to attester** — sends candidate pairs to the attester's `/evaluate-implications-batch` endpoint.
6. **Persists state** — tracks evaluated pairs to avoid re-processing.

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

## Same-Domain Restriction

The finder filters candidate pairs to only include statements that share the same `domain` field (read from IPFS content). This prevents O(N²) explosion as statement count grows.

**Why same-domain makes sense:**
- Cross-domain implications are rare and harder to justify
- "If you believe Bitcoin is sound money, you probably believe crypto regulation is bad" is a stretch
- Same-domain pairs are cleaner: "if you believe wealth should be redistributed, you probably believe in universal basic income"
- The fake-data-generation already uses this restriction

**Fallback behavior:** If a statement's domain cannot be fetched (IPFS unavailable or content unparseable), the pair is allowed through rather than blocked. This ensures the finder degrades gracefully rather than silently dropping valid pairs.

## Intersection Patterns and the Attester Prompt

The implication attester's LLM prompt includes explicit guidance on **geographic × topical intersection** patterns, as described in [intersections.md](./content-patterns/intersections.md):

### Conjunction → parent implications (one-way)

A conjunction statement like "I'm interested in crypto in Ontario" implies BOTH of its parents:
- → "I'm interested in crypto" (topical parent)
- → "I care about improving Ontario" (geographic parent)

The reverse implications do **NOT** hold:
- "I'm interested in crypto" does NOT imply "I'm interested in crypto in Ontario"
- "I care about improving Ontario" does NOT imply "I'm interested in crypto in Ontario"

This is critical — without this guidance, the LLM might incorrectly create bidirectional implications, causing users interested in crypto generally to be shown crypto-in-Ontario projects they don't care about.

### Geographic hierarchy implications (one-way)

Statements at different geographic levels form a hierarchy (town → county → province → country):
- "I care about improving Grey County" → "I care about improving Ontario"
- "I care about improving Ontario" → "I care about improving Canada"

The reverse does NOT hold — caring about Canada does not imply caring about any specific province.

### Same-domain note for intersections

Conjunction statements inherit the domain of their parents (or use a combined domain). The same-domain filter in the finder allows parent→child and child→parent pairs within the same topic area to pass through, while blocking unrelated cross-topic pairs. The attester's prompt handles the directionality.

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

## Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Finder service | ✅ Implemented | Proactive candidate pair discovery |
| Same-domain restriction | ✅ Implemented | Filter pairs to same-domain only, with graceful fallback |
| Intersection pattern guidance in attester prompt | ✅ Implemented | One-way implication rules for conjunctions and geographic hierarchies |
| Transitive chain discovery | 📋 Proposed | Detect A→B→C chains, suggest A→C |

The finder is the right place for discovery features because it already has visibility into the full set of statements and implications. The attester's role remains: receive pairs, evaluate them honestly, and write attestations on-chain if warranted.
