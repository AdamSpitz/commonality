# Subjectiv: trust-graph-mediated event streams

## Decision

We're building this, specifically for alignment attestations (project-to-cause links).

The key insight: different attestation types have different trust requirements.

**Implication attestations and noninflammatory-content attestations** are fairly objective — they can be evaluated by an LLM looking at the content itself. For these, a simple "choose which centralized attesters you trust" model works fine, because the attesters are doing a straightforward mechanical job. It doesn't really matter that they're centralized.

**Alignment attestations** are fundamentally different. Evaluating whether a particular project is actually aligned with a cause requires knowing something about who's going to be doing the work, how trustworthy they are, whether the project is a good idea, etc. This is inherently social judgment — the kind of thing that propagates through personal networks via word-of-mouth, not the kind of thing you delegate to a few approved evaluators.

If we used the centralized-attester model for alignment attestations, it would feel like a credentialing system (who's on the approved list?). The trust graph makes it feel like word-of-mouth, which is how this kind of judgment actually works. This matters for the overall feeling of the system — we want it to feel open and network-driven, not gatekept.

So: Subjectiv is used for alignment attestations. The other attestation types keep the simpler centralized-attester model.

## Design

I want a subsystem called subjectiv.

The point of the system is to allow the creation of trust-graph-mediated event streams.

Input data: each user emits a stream of TrustMappingEntry events, saying "my trust in user U is T" (some number between 0 and 1).

Derived data:
  - Direct trust mapping: fold the TrustMappingEntry events emitted by that user into a mapping. (Simple.)
  - Transitive trust mapping: this one needs a fancy algorithm. The notion is that if A trusts B and B trusts C, then A trusts C (to some extent). For now let's just multiply the trust numbers to get the transitive trust number. Put a cap on the number of steps we allow along any one pathway, so that the algorithm doesn't run forever. Also put a trust threshold: if the transitive trust along this pathway drops below 0.01 or whatever, don't bother following that path anymore.
    - I think it should be possible for this algorithm to run incrementally in the background. The algorithm is basically a breadth-first traversal (or maybe not breadth-first exactly, maybe more like there's a priority queue, where the next path to explore is the path with the highest multiplied-trust-along-that-path). So keep an explicit priority queue for paths that still need to be explored, and explore them one at a time. (When users within the root user's transitive trust mapping publish new TrustMappingEntry events, we can invalidate whatever needs to be invalidated and then put a new item into the priority queue.) The value of having the algorithm run incrementally is that it might be slow but it's fine for the purposes of the app if we use an incomplete transitive trust mapping.

Anyway, the idea is that we use each user's transitive trust mapping to create trust-graph-mediated event streams. That is, conceptually there's the stream of *all* possible events, but each user only sees the events published by users he transitively-trusts.

In particular, our system will make use of it for the funding portal subsystem: for any particular user who's looking at the funding portal for a particular statementId, rather than seeing *all* the projects that anyone has attested to as being aligned with that statement, he'll only see the ones attested to by accounts within his transitive trust mapping.

Why this is important: I don't want incompetent or malicious users to spam the system with bad project-alignment attestations.

## Implementation: incremental client-side computation

Each user needs their own trust graph, and there's no sharing between users. So we compute entirely in the browser — no server-side computation needed.

### Background processing loop

The transitive trust algorithm runs incrementally in the browser using a Web Worker, processing one step at a time without blocking the UI.

Each "step" is:
  1. Pop the highest-trust path off the priority queue
  2. Fetch that user's TrustMappingEntry events from the indexer (one network request)
  3. Fold the events into that user's direct trust mapping
  4. For each user they trust, compute the cumulative trust (multiply along the path) and add to the priority queue if it's above the threshold (0.01)
  5. Update the transitive trust mapping with any new or improved trust scores

The priority queue is ordered by cumulative trust along the path, so the most important relationships are discovered first. This means even an incomplete mapping is useful — it contains the highest-trust paths.

### Persistence

Store the computed state in IndexedDB:
  - The transitive trust mapping (Map<address, trustScore>)
  - The serialized priority queue (paths still to explore)
  - Cached direct trust mappings for already-visited users

On app startup, rehydrate from IndexedDB and continue processing where we left off. The trust graph doesn't need to be rebuilt from scratch each session.

### Invalidation

When a new TrustMappingEntry event shows up for a user already in the mapping, invalidate the subtree rooted at that user (all paths that went through them) and re-enqueue those paths for reprocessing.

### What the rest of the app sees

The rest of the app just calls something like `getTrustedSet()` which synchronously returns whatever's been computed so far. The funding portal filters alignment attestations against this set.

### What the user experiences

First time: trust graph is empty, user sees all attestations (or a "building your trust network..." indicator). Within a few seconds of background processing, attestations start getting filtered as the graph fills in. By the next session it's mostly complete and loads instantly from IndexedDB.

### Rate limiting consideration

Each hop in the graph requires a network request to the indexer (to fetch that user's TrustMappingEntry events). So the graph fills in at roughly "one user per round-trip" pace. With a reasonable network, that's a few hundred transitive trust relationships per minute — more than enough for practical use.
