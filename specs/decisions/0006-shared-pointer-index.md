# ADR 0006: Shared pointer-only index; founder-specific indexers are optional

Status: **Accepted** (Aug 2026)

## Context

The founder-first decision originally assumed that each vertical founder would operate an operator-scoped Ponder deployment. That was driven largely by `PublishedData` bytes passing through the indexer: serving and takedown policy appeared to require one read service per operator.

`PublishedData` now emits pointers only. The index stores publication identity and transaction location, not user-authored bytes. Content is resolved separately, hash-verified against `dataId`, and can be supplied by calldata, IPFS, or any future mirror. Client-side folds already apply each vertical's scope and display/aggregation policy.

Requiring every founder to run Ponder, Postgres, an RPC backfill, monitoring, and upgrades would therefore buy little while directly contradicting the goal of making a vertical a static site that a founder can launch cheaply.

## Decision

Use **one broad, pointer-only index as the default read plane**. A vertical founder normally supplies a static UI plus scope and policy configuration and does not operate an indexer.

Initially, Commonality may run the shared Ponder index. Moving that shared index to The Graph remains an optional later operational-decentralization decision, not a prerequisite for the founder model and not primarily a content-liability fix.

Independent/scoped indexer deployments remain supported escape hatches for operators that need availability independence, custom source onboarding, organizational independence, or a strong possession boundary. They are not the default launch requirement.

This does not make a vertical's legal obligations disappear. The vertical still chooses what its UI discovers, renders, aggregates, and routes, must operate its own content policy and notice process, and may retrieve bytes from third-party mirrors. Commonality still operates a metadata service while it runs the shared Ponder feed. Mirrors improve availability; they do not erase the legal responsibilities of whoever mirrors or displays content.

## Alternatives

- **One Ponder deployment per vertical.** Rejected as the default: it imposes stateful infrastructure on every founder without a proportionate technical or legal benefit after pointers-only.
- **Move immediately to The Graph.** Deferred: migration is feasible and may improve resilience and protocol-posture credibility, but introduces Graph gateway/indexer, API-key, GRT, local-dev, and source-onboarding dependencies. The shared Ponder feed already removes the founder burden.
- **No index; query RPC directly.** Rejected for broad historical discovery because browser RPC range limits and latency are the reason the event cache exists.

## Consequences

- The founder launch target can remain a static site, ideally needing only a GitHub account.
- Commonality must describe its Ponder service honestly as a broad convenience metadata feed, not a canonical view or a user-content host.
- Per-vertical admission and editorial policy belong in inspectable client configuration by default; policy enforcement for display and aggregation remains mandatory.
- Source onboarding, shared-index uptime, RPC/archive availability, and durable content mirrors remain real operational concerns.
- The Graph should be revisited when operating the shared read service is materially burdensome, independent indexers are needed in fact, or the shared service becomes a meaningful protocol chokepoint.

Living specs: [shared-feed topology](/specs/tech/indexer/shared-feed-topology.md), [The Graph](/specs/tech/indexer/the-graph.md), [UI operator posture](/specs/product/ui-operator-posture.md), and [founder-first](/specs/product/founder-first.md).
