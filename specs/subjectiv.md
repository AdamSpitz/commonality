# Subjectiv: trust-graph-mediated event streams

I haven't completely decided whether or not to include this yet. For now, consider this to be just thinking out loud - don't implement any of this.


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
