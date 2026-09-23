# On-demand project reads

The indexer watches a fixed set of addresses. Singleton contracts (alignment, notes, factories) belong on that list. Project instances do not, unless an operator decides a project or its factory is worth caching. A project someone vouched for is still readable: summary fields are contract storage, and that project's logs can be fetched from a node for one address. This note is how we do the log fetch without pointing the node at every repeat view, and without the indexer subscribing to arbitrary addresses by itself.

## Reads

A cause board reads current storage (`totalReceived`, and the condition's `threshold` and `deadline`) with `eth_call`. That path is not counted and not cached here.

Project history (contributions, offers, refunds, reimbursement) is logs for one contract. The client asks the event cache first. A non-empty cache response is the indexed copy. An empty response for that contract address alone — no event name, topic, or block bound — is a miss: the client then asks the node and keeps the result for a few minutes keyed by chain, address, and starting block. Each log keeps its block's timestamp. One `eth_getLogs` that comes back truncated is split by block range until the pieces fit. A node that refuses the range, or a read that cannot be finished, is not cached and is not walked block by block. Further views of a cached result do not call the node.

## What we count

The event-cache process records those misses: a bare request for one contract's logs that returned nothing. It does not record summary calls, filtered or cursored event queries, or a project the cache already has. Each record is an address and a time. The ledger keeps about a day of hits, in memory, in that process. Restarting the indexer clears it. That is a hint, not a dataset.

`GET /api/project-read-demand` returns the addresses asked for in the window, most-requested first. Where the cache already contains `LazyGivingAssuranceContractCreated` or `CreatorContractCreated` for that address, the row includes the factory that emitted it. Factories that account for two or more of the hot addresses are listed on their own, because the useful promotion is usually "index this factory," which is the subscription the indexer already knows how to do.

## What we do not do

The report does not change Ponder config, start watching an address, or follow vouches. Someone can ask for a million empty addresses; the ledger only remembers the busiest ones, and an operator adds a deployment to the indexer config by hand. Indexing a factory covers every child it creates. Indexing one address is the fallback when no factory is known.

After a project is indexed, the same request stops being a miss, the node fallback stops running, and the address drops off the report.
