# Redesign of the indexer

I guess my motivation is something like...

I'm trying to figure out whether I'm ready to deploy this whole system. I'm nervous about potential bugs, I'm nervous about needing this centralized component, and also I'm just kinda hoping to make something simple that just works and doesn't need a ton of maintenance.

So the overall goal is something like simplicity + decentralization.

Ideas that I'm hoping will help:
  - Don't be afraid to let the client fetch directly from IPFS if that'll simplify the indexer. (See [ipfs-in-indexer.md](./ipfs-in-indexer.md).)
  - "Lazy":
    - No need to eagerly index all the entities (e.g. projects/delegation-chains/whatever); many will be dead/dormant, and for most purposes I don't think we need the indexed info unless it's explicitly asked for.
    - Also, for small entities, maybe don't even fold eagerly; have a thin event cache plus a few small eager-indexed registry tables, and let the client do the fold itself.
    - See [indexer-performance.md](./indexer-performance.md).

What does the redesigned system look like? Can we get away with fewer/simpler pieces?

Can we refactor the current system so that it'll be easy to create this redesigned system to replace the current indexer?
