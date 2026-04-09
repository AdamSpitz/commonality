# Subjectiv: trust-graph-mediated event streams

## Decision

We're building this, specifically for alignment attestations (project-to-cause links).

The key insight: different attestation types have different trust requirements.

**Implication attestations and noninflammatory-content attestations** are fairly objective — they can be evaluated by an LLM looking at the content itself. For these, a simple "choose which centralized attesters you trust" model works fine, because the attesters are doing a straightforward mechanical job. It doesn't really matter that they're centralized.

**Alignment attestations** are fundamentally different. Evaluating whether a particular project is actually aligned with a cause requires knowing something about who's going to be doing the work, how trustworthy they are, whether the project is a good idea, etc. This is inherently social judgment — the kind of thing that propagates through personal networks via word-of-mouth, not the kind of thing you delegate to a few approved evaluators.

If we used the centralized-attester model for alignment attestations, it would feel like a credentialing system (who's on the approved list?). The trust graph makes it feel like word-of-mouth, which is how this kind of judgment actually works. This matters for the overall feeling of the system — we want it to feel open and network-driven, not gatekept.

So: Subjectiv is used for alignment attestations. The other attestation types keep the simpler centralized-attester model.

## Design

The point of the system is to allow the creation of trust-graph-mediated event streams.

Input data: each user emits trust declarations on-chain via a `TrustRegistry` contract, saying "my trust in user U is T" (an integer 0–100, where 100 means full trust and 0 means no trust / revoke).

Derived data:
  - Direct trust mapping: fold the `TrustSet` events emitted by that user into a mapping. (Simple.)
  - Transitive trust mapping: this one needs a fancy algorithm. The notion is that if A trusts B and B trusts C, then A trusts C (to some extent). For now let's just multiply the trust numbers (treating them as fractions of 100) to get the transitive trust number. Put a cap on the number of steps we allow along any one pathway, so that the algorithm doesn't run forever. Also put a trust threshold: if the transitive trust along this pathway drops below 1 (i.e. 1/100), don't bother following that path anymore.
    - This algorithm runs incrementally in the background. The algorithm is basically a priority-queue traversal, where the next path to explore is the path with the highest cumulative trust. So keep an explicit priority queue for paths that still need to be explored, and explore them one at a time. The value of having the algorithm run incrementally is that it might be slow but it's fine for the purposes of the app if we use an incomplete transitive trust mapping.

The transitive trust mapping creates trust-graph-mediated event streams. That is, conceptually there's the stream of *all* possible events, but each user only sees the events published by users he transitively-trusts.

In particular, our system will make use of it for the funding portal subsystem: for any particular user who's looking at the funding portal for a particular statementId, rather than seeing *all* the projects that anyone has attested to as being aligned with that statement, he'll only see the ones attested to by accounts within his transitive trust mapping.

Why this is important: I don't want incompetent or malicious users to spam the system with bad project-alignment attestations.

## On-chain data: TrustRegistry contract

Trust declarations are stored on-chain via a new `TrustRegistry.sol` contract. This keeps the architecture uniform — everything is on-chain events → event cache → client-side fold, the same pattern used for all other subsystems. Trust updates are infrequent enough that gas cost is negligible on an L2.

### Contract: `TrustRegistry.sol`

```solidity
contract TrustRegistry {
    // trust scores: 0 = no trust / revoke, 1–100 = trust level
    mapping(address => mapping(address => uint8)) public trustScores;

    event TrustSet(
        address indexed truster,
        address indexed trustee,
        uint8 score
    );

    function setTrust(address trustee, uint8 score) external {
        require(score <= 100, "Score must be 0-100");
        require(trustee != msg.sender, "Cannot trust yourself");
        trustScores[msg.sender][trustee] = score;
        emit TrustSet(msg.sender, trustee, score);
    }

    function setTrustBatch(address[] calldata trustees, uint8[] calldata scores) external {
        require(trustees.length == scores.length, "Array length mismatch");
        for (uint256 i = 0; i < trustees.length; i++) {
            require(scores[i] <= 100, "Score must be 0-100");
            require(trustees[i] != msg.sender, "Cannot trust yourself");
            trustScores[msg.sender][trustees[i]] = scores[i];
            emit TrustSet(msg.sender, trustees[i], scores[i]);
        }
    }

    function getTrust(address truster, address trustee) external view returns (uint8) {
        return trustScores[truster][trustee];
    }
}
```

### SDK layer

Follow the existing subsystem pattern (see `sdk/src/subsystems/` for examples):

- `sdk/src/subsystems/subjectiv/events.ts` — `TrustSetEvent` extending `RawEvent`
- `sdk/src/subsystems/subjectiv/folds.ts` — fold `TrustSet` events into `Map<address, uint8>` (latest score wins per trustee)
- `sdk/src/subsystems/subjectiv/queries.ts` — `getDirectTrustMapping(machinery, trusterAddress)` fetches events from event cache, folds them
- `sdk/src/subsystems/subjectiv/actions.ts` — `setTrust(machinery, trustee, score)` and `setTrustBatch(machinery, trustees, scores)`
- `sdk/src/subsystems/subjectiv/types.ts` — type definitions

## Implementation: client-side trust graph computation

Each user needs their own trust graph, and there's no sharing between users. So we compute entirely in the browser — no server-side computation needed.

### Background processing loop

The transitive trust algorithm runs incrementally in the browser using a Web Worker, processing one step at a time without blocking the UI.

Each "step" is:
  1. Pop the highest-trust path off the priority queue
  2. Call the SDK's `getDirectTrustMapping()` for that user (which hits the event cache — one network request)
  3. Fold the events into that user's direct trust mapping
  4. For each user they trust, compute the cumulative trust (multiply along the path, treating scores as fractions of 100) and add to the priority queue if cumulative trust is above 1/100
  5. Update the transitive trust mapping with any new or improved trust scores

The priority queue is ordered by cumulative trust along the path, so the most important relationships are discovered first. This means even an incomplete mapping is useful — it contains the highest-trust paths.

Cap the maximum path length at some reasonable number (e.g. 6 hops) to bound computation.

### Persistence

Store the computed state in IndexedDB:
  - The transitive trust mapping (`Map<address, trustScore>`)
  - Cached direct trust mappings for already-visited users

On app startup, rehydrate from IndexedDB. For MVP, skip incremental invalidation — instead, recompute on a timer (e.g. every 24 hours) or when the user explicitly requests a refresh, or when the user updates their own trust mappings. Full recomputation should be fast enough for practical trust network sizes (dozens to low hundreds of users).

### What the rest of the app sees

The rest of the app just calls something like `getTrustedSet()` which synchronously returns whatever's been computed so far — a `Set<address>` of all transitively trusted accounts.

### Integration with funding portal queries

Currently the SDK's funding portal queries (in `sdk/src/subsystems/fundingportals/queries.ts`) accept `trustedAlignmentAttester?: string` — a single attester address. The UI passes this from localStorage settings.

Replace this with `trustedAlignmentAttesters?: Set<string>` (or `string[]`). The filter logic stays the same — it's still a client-side `.filter()` on folded attestation arrays — but instead of checking against one address, it checks membership in the trust set.

In the UI, replace the `useTrustedAttesters()` hook (which reads from localStorage) with a `useTrustedSet()` hook that reads from the Web Worker's computed trust set.

The existing Settings page UI for manually adding trusted attester addresses can be replaced with a UI for setting direct trust scores on other users.

### What the user experiences

First time: trust graph is empty, user sees all attestations (or a "building your trust network..." indicator). Within a few seconds of background processing, attestations start getting filtered as the graph fills in. By the next session it's mostly complete and loads instantly from IndexedDB.

### Rate limiting consideration

Each hop in the graph requires a network request to the indexer (to fetch that user's TrustSet events). So the graph fills in at roughly "one user per round-trip" pace. With a reasonable network, that's a few hundred transitive trust relationships per minute — more than enough for practical use.


## What's done?

  - Subjectiv MVP is now implemented: `TrustRegistry` exists, the SDK can compute a transitive trusted set, the funding portal uses that trusted set for alignment filtering, Settings now has a direct-trust UI, and the UI now rehydrates cached trusted sets from IndexedDB on startup. What's left to do:
    - Make a true browser-level Subjectiv e2e test later. Higher-level UI integration coverage now exists for the direct-trust settings flow plus funding-portal and leaderboard trust-network filtering.
      - Current status: a Playwright Subjectiv e2e spec now exists in `ui/e2e/subjectiv-flow.spec.ts`, and the local Playwright/browser install plus e2e Docker harness were partially repaired, but the run is still blocked because the freshly started Ponder indexer reports healthy while `waitForIndexerToSyncToTxHash()` never advances past block 0 in this startup path.

