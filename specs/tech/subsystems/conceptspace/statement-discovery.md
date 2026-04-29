# Statement Discovery

## How it works

There is no `StatementCreated` event. Statements live on IPFS; the system discovers them by querying `DirectSupport` events from the Beliefs contract and extracting the statement CID. `browseStatements()` and `getAllStatements()` both work this way.

This means a statement only appears in the UI after at least one user believes or disbelieves it.

## Why there is no `StatementCreated` event

Conceptually, we work in the space of *all possible statements that could ever exist*. It is meaningful to say "I believe this" or "my project is aligned with this," but not really meaningful to say "this statement exists" — of course it exists, all possible statements exist. There is no official significance to a statement's existence within our system; significance comes from people expressing beliefs about it.

If a user creates a statement without signing it, they can use their [saved statements list](statements-list.md) to remember it for later. But that's just a personal convenience (like writing it down on a notepad), not a system-level event.

## How statement creation works in practice

`createAndSignStatement` (in the SDK) does two things:

1. Uploads the statement JSON to IPFS → gets a CID.
2. Calls `setBelief(cid, BELIEVES)` on the Beliefs contract → emits a `DirectSupport` event.

So every statement the creator makes is immediately discoverable, because the creator believes it. A statement uploaded to IPFS but never believed by anyone remains invisible — and that's by design.

## Discovery queries

`browseStatementsByMostSupporters` and `browseStatementsByNewest` both:

1. Fetch up to 10,000 `DirectSupport` events from the indexer.
2. Fold them in memory to produce a deduplicated map of CID → believer/disbeliever counts.
3. Sort and paginate.
4. Enrich the current page's items with title/excerpt from IPFS.

The "created at" timestamp for a statement is the block timestamp of its earliest `DirectSupport` event.

## Scalability

The current approach fetches *all* `DirectSupport` events on every query (up to the 10,000 limit). This is fine for local dev and early testnet but will degrade as the chain grows. The indexer's events-cache API doesn't currently support aggregation queries, so this is a fundamental limitation.

Eventual solutions, roughly in order of effort:

1. **Indexer-side aggregation**: Add a query to the indexer that returns pre-aggregated statement data (believer counts, first-seen timestamps) so the SDK doesn't have to fetch and fold raw events.
2. **Materialized views / caching layer**: A service that listens to new `DirectSupport` events and maintains an up-to-date table of statements with counts, sortable by various criteria.
3. **Subgraph / dedicated indexer**: A purpose-built indexer (e.g. a Graph Protocol subgraph) that indexes `DirectSupport` events into a queryable schema with sorting and pagination.

All three are variations on the same idea: move the aggregation from the client to the server. The right time to do this is when page-load latency on the Browse Statements page becomes noticeable.
