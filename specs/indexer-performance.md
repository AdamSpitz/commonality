# Indexer performance (in theory)

TODO: I want a better understanding of indexer performance characteristics. (In theory only - this isn't deployed yet, I just want an analysis of big-O characteristics, concurrency, composability, etc.)

(Partly my motivation is: what if I screw it up, or want to switch to The Graph, or whatever?)

What would happen if we ran the system for a while, then had to blow away the indexer?

What are the different "entities" being indexed, and how big are we expecting them each to be? What would happen if we treated each entity as a separate thing responsible for its own indexing; does the rest of the system continue functioning properly?

If we do decouple the indexing work, which aspects then have trust assumptions? (e.g. Adding up the funding for a cause requires adding up the funding for each project, so it would depend on the project's indexing being honest.) Can those be mitigated by using cryptography?

## Entities

  - Each pubstarter assurance contract is more-or-less a separate entity. Maybe some assurance contracts will be really big ones with huge numbers of contributors or really long lifetimes, but mostly I expect each one to be small.
  - "The set of all projects aligned with statement S, according to this particular set of trusted implication attesters and alignment attesters" is necessarily a very personalized thing, so I wonder whether we'll end up having a centralized indexer for that at all; maybe we just keep info for each project (which is objective info like token purchases) and just let each individual's UI gather up the projects and add up the project info?
  - etc.
