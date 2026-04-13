# Scalability

This document describes how each component of the system is expected to scale.

## Overview

The system has a deliberate architecture: a thin event cache (no business logic) with client-side state computation in the SDK. This keeps complexity bounded and avoids a heavy indexer. Most queries are per-entity, not global — each entity's data is independent.

Short version:
  - smart contracts are fine
  - indexer is a very simple thin event cache; I wish we didn't need it or had a more scalable version of it, but it'll be fine
  - client-side folding: fine for queries about a single entity (which is most of them); even redoing the whole fold is probably fine, and we can also do cursors so clients can remember where they left off
  - we'll need some other plan for cross-entity aggregation queries: leaderboards and funding portals
  - IPFS is sorta fine, but we need a CDN
  - UI can be hosted on IPFS, with ENS to point to the latest version; fine
  - platform API service is stateless and can be elastic, but the limiting factor will probably be API rate limits
  - attesters are stateless; let's just make them elastic from the start
  - finders will probably be stateful, but they're more "open" and can be "sharded"; we (or anyone else) can just start finders focused on particular areas


## Components

### Blockchain (L2)

Fine.

(I'm curious about whether we could even move to L1; Ethereum has been encouraging that lately, with L1 scaling efforts.)

### Smart Contracts

- O(1) per event — simple storage updates
- No graph traversal or cross-contract loops
- Already designed with good indexed topics for efficient filtering

### Indexer (Ponder)

- Single `events` table, all raw events stored
- Each entity query fetches only that entity's events (filtered by address or ID)
- Query complexity is O(entities relevant to query), not O(all entities)
- Post-startup sync is fast — block-by-block processing from chain head

### SDK (Client-Side Folding)

- Fetches raw events for a specific entity, folds into entity state
- Per-project page: O(contributors) events
- Per-statement page: O(believers) events
- Per-note page: O(chain depth) events
- No global folds — each query is independent
- (Question: have we implemented cursors yet, so that a particular device can resume a particular fold from where it left off rather than repeating it from scratch each time?)

### IPFS Content

- Statement text, project metadata stored on IPFS
- Content is static and content-addressed
- Needs a CDN/gateway layer for cold-start performance (not currently in place)

### Platform API Service

- In-memory caches for channel resolution, content lookups, verification challenges
- Stateless — can horizontally scale behind a load balancer
- Rate limits: would need to increase for high traffic

### UI (SPA)

- Single-page app served as static assets
- Can be hosted on IPFS with CORS headers on API services
- ENS or redirect service needed to point "latest" to current deployment CID

## Scalability Risks and Mitigations

| Concern | Risk | Mitigation |
|---------|------|------------|
| Global sorting/ranking ("top statements") | Requires global knowledge | Pagination or accept this needs full indexer |
| Funding Portal cross-project totals | Needs each project's funding | Read balances from chain (multicall) instead of folding |
| IPFS cold-start latency | First fetch is slow | Add CDN layer (Cloudflare gateway) |
| API rate limits | 5 req/min is low for viral traffic | Increase limits, use Redis caching |
| Indexer rebuild after outage | Minutes to hours depending on event count | Two-tier indexing: eager small tables + lazy per-entity |

## Key Property

Most queries are bounded by "how many events for this specific entity?" rather than "how many events ever?" This keeps the system tractable even at scale — a project with 10,000 contributors is still just O(10,000) events to fetch and fold for that project's page, not O(all projects).

The main things that need attention at scale are:
1. Global enumeration/ranking queries
2. Cross-entity aggregations (Funding Portal totals)
3. IPFS/CDN layer for content serving
4. API caching and rate limit increases

## Dev's thoughts

First, what about the attester(s) (like, implication attester and content attesters) and finder(s) (ditto)? Those are services that we need to run somewhere. Does this document mention them? Will they scale? (I figure the attesters are probably stateless; how about the finders? Those might need some sort of DB or something? I forget how they work.) And is it possible/reasonable to just start out running them in some sort of elastic cloud thingy, so that they scale nicely by default, rather than us noticing later that our lone server is being overloaded and then needing to scramble to rejigger it to make it scale? Or is that awkward or expensive or something?

Second, can we do IPFS in a similar way? Like, is there a way to do IPFS in such a way that it scales up and down nicely by default? And how can we do that CDN thing?

Third, can we talk through those global queries and cross-entity aggregations? Which ones do we have, specifically? Can we design them so that this isn't so much of an issue?

Fourth, about the platform API stuff: Yes, some sort of caching. (Have we not already implemented that?) What are the actual rate limits for the new X API, and the YouTube API? How do we increase the limits?

## AI's response

Great, I've got a solid picture of the codebase. Let me walk through your four TODO questions.

  ---
  1. Attesters and Finders: Deployment & Scaling

  Attesters (implication + content): These are stateless Express.js HTTP services. Each request is independent — fetch from IPFS, call LLM, publish to chain. They're perfect candidates for
  elastic cloud deployment.

  Finder: This one is trickier. It maintains a finder-state.json file tracking lastBlockSeen and evaluatedPairs. It's a single polling loop (every 30s), not an HTTP service. It's not
  horizontally scalable as-is because multiple instances would duplicate work or fight over state.

  Practical recommendations:

  - Attesters: Deploy on something like Cloud Run, Fly.io, or AWS Fargate. They're already Dockerized. These platforms scale to zero when idle and spin up on demand. Cost is proportional to usage. This is straightforward and not expensive at low traffic.
  - Finder: Since it's a single polling loop, you probably only need one instance. Run it on the cheapest always-on option (a small VM, or a single Cloud Run instance with min-instances=1). If you ever needed to scale the finder, you'd need to move finder-state.json to Redis or a DB and add coordination — but that's unlikely to be necessary since its workload is bounded by the rate of new statements appearing, not by user traffic.
  - Starting elastic from day one is the right call. The attesters are already Docker images, so deploying them to an auto-scaling platform is minimal extra work versus a fixed server. You avoid the "scramble to rejigger" scenario.

  ---
  2. IPFS Scaling

  Right now you're running a local Kubo node (data/ipfs/). Options for scaling:

  - Pinata or web3.storage for pinning: Upload content there instead of (or in addition to) your own node. They handle replication and availability. You'd just swap the IPFS API endpoint in your
   env vars.
  - CDN gateway: Cloudflare has a free IPFS gateway (cloudflare-ipfs.com). You can also set up a Cloudflare Worker that proxies ipfs.io with caching. Since your content is immutable (content-addressed), it's ideal for CDN caching — infinite cache lifetime, no invalidation needed.
  - Practical approach: Use Pinata/web3.storage for writes, Cloudflare gateway for reads. This scales up and down automatically — you pay per pin for storage, and reads are CDN-cached. No infrastructure to manage.
  - Your SDK already has IPFS_GATEWAY as a configurable URL, so pointing it at a CDN gateway is a config change, not a code change.

  ---
  3. Global Queries and Cross-Entity Aggregations

  Here are the specific ones that exist today:

  Global queries (fetch ALL events, fold client-side):
  - browseStatementsByMostSupporters() — fetches all DirectSupport events (limit 10,000), folds into believer counts per statement, sorts, paginates client-side
  - browseStatementsByNewest() — same fetch, sorts by creation time
  - The Finder's getTopStatements() — same pattern

  Cross-entity aggregations:
  - getTotalFundingForCause() — loops through all aligned projects for a cause, sums their totalReceived
  - getTopContributorsForCause() — loops through all aligned projects, fetches contributions for each, aggregates per-participant
  - getUserContributionRankForCause() — calls the above with limit=1,000,000 (!)

  Design thoughts to reduce the pain:

  - Statement browsing: This is the biggest concern. At scale, fetching all DirectSupport events to the client is untenable. Options:
    a. Move ranking to the indexer: Add a statement_stats table in Ponder that maintains believer/disbeliever counts as events arrive. Browsing becomes a simple sorted DB query. This is the "accept this needs full indexer" option from your risk table, and it's probably the right one — it's a small, bounded piece of server-side logic.
    b. Lazy/cached approach: Have a server-side job that periodically computes top-N and caches the result. Clients fetch the cached list. Stale by seconds/minutes, but fine for browsing.
  - Funding totals: The cross-project aggregation is bounded by the number of projects aligned to a cause, which is likely small (tens, not thousands). This probably doesn't need optimization yet. If it does, getTotalFundingForCause could use multicall to batch-read project balances from the chain in one RPC call instead of sequential reads.
  - Leaderboard with limit=1,000,000: This is the scariest one architecturally, but it's also bounded by the number of contributors to projects aligned with a single cause — likely small for a long time.

  Bottom line: The statement browsing is the one to fix first. The funding aggregations are naturally bounded by the number of aligned projects per cause, which is likely to stay manageable.

  ---
  4. Platform API Caching and Rate Limits

  Caching is already implemented. Three in-memory caches exist:
  - Channel cache (indefinite TTL)
  - Content cache (1 hour TTL)
  - Verification challenge cache (30 min TTL)

  Current rate limits:
  - Resolve endpoints: 60 req/min per IP
  - Verify endpoints: 5 req/min per IP

  These are your service's rate limits. The upstream API limits are separate:

  - X/Twitter API v2 (Free tier): Very restrictive — 1 app-level read request per 15 minutes for some endpoints, or up to 100 tweets/month total. Basic tier ($100/month) gets 10,000 tweets/month. The current caching should help a lot since channel resolution results are cached indefinitely.
  - YouTube Data API v3: Default quota is 10,000 units/day. A search.list costs 100 units, channels.list costs 1 unit, videos.list costs 1 unit. So you get ~100 video searches per day on the
  free quota. You can request a quota increase through Google Cloud Console (it's a form, usually approved within days for reasonable amounts).

  To increase limits: For X, you'd upgrade your API tier. For YouTube, request a quota increase via the Google Cloud Console. The in-memory caching already helps significantly — repeated lookups for the same channel/content don't hit the upstream API.

  At scale: The in-memory caches won't survive restarts and aren't shared across instances. If you horizontally scale the platform API service, you'd want Redis as the cache backend. But for a single instance, the current setup is fine.

  ---
  Want me to update the scalability doc with any of these conclusions, or dive deeper into any particular area?

## Dev's thoughts

Attesters: stateless, great, yes, let's make them elastic from day 1.

Finders: yes, I agree we're unlikely to need more than one, and also by their nature they're less critical (they're not a specific trusted entity like an attester; their job is just to go find stuff and suggest it to the attester) and there's no reason why we or third parties can't start up separate ones, each with a particular area of focus. That is, if we ever find that a single finder is getting overwhelmed (which is already unlikely), we can shut it down (nobody's depending on it directly) and start up a bunch of separate ones ("finder #1 is for left-wing politics content, finder #2 is for right-wing politics content, finder #3 is for music content, finder #4 is for sports content, etc."). People who are interested in particular areas can run finders for the area they're interested in. It'd be good, though, to have the finder already set up to collect (and make available via some REST endpoint) some stats on what *kinds* of statements/content it's spending its time on, so that we can set up a cron job to poll it and keep us informed about that. And also set it up to email its owner (i.e. us) if it's starting to get close to its capacity.

Maybe it'd be viable to have a single "master" finder-router that watches *all* the new stuff and simply routes it to a particular finder who might be interested... but whatever, this is overengineering; this isn't a critical component and it's no problem to spin up redundant ones, so let's not worry too much about it, we can easily fix this later if we need to.

About IPFS: is there anything custom/weird at all that we're doing with our Kubo? Or is it just a completely stock IPFS node whose job could be trivially replaced with a service like Pinata and/or Cloudflare? And is there any reason why we really need the IPFS node to run on the same machine as the indexer? (Our old design for the indexer involved doing some caching of IPFS content, and then we said "why bother with that, let's just use a normal IPFS node, it'll cache stuff, we'll get basically the same performance". If we switch to Pinata do we lose any of that?)

I still need to think through the query stuff.

About the X/Twitter API: just to make sure, you're looking at the most recent X API pricing and rate limits, right? They recently (February 2026, I think?) changed their pricing scheme.

