# Moving the read layer to The Graph

Status: **proposed, not reviewed** (Jul 2026). Written from a conversation; it has not been
reviewed and nothing here is decided.

This asks a narrow question: **would replacing the Ponder event cache with a subgraph on The
Graph help?** It sits alongside the two existing topology documents rather than replacing
either:

- [operator-scoped-deployments.md](./operator-scoped-deployments.md) — each operator deploys
  its own scoped read model.
- [shared-feed-topology.md](./shared-feed-topology.md) — unreviewed counter-proposal: one
  shared feed, per-operator scope as a config artifact.

The Graph is best understood as **a third variant of the shared feed**, in which the shared
feed's operator is neither Commonality nor the vertical founder. That single change is what
makes it interesting, and it is also where the hard objection lives.

## Why the migration would be unusually cheap

The indexer is a [deliberately dumb event cache](./README.md): one `events` table of raw
ABI-encoded events, no aggregation, no business logic, with all entity-state computation done
client-side in SDK fold functions.

The usual blocker for a Graph migration — rewriting business logic in AssemblyScript and losing
TypeScript/SDK reuse — therefore mostly does not apply. A mapping would say "store this raw
event." The `GET /api/events` filter shape (contract address, event name, topics, block range)
maps onto GraphQL entities with indexed fields nearly mechanically, and the folding stays exactly
where it already is.

Client-Side Folding, adopted for maintenance reasons, turns out to be the thing that makes the
read layer portable at all.

## What it would actually buy: the neutrality claim

[shared-feed-topology.md](./shared-feed-topology.md) identifies the real problem precisely — it
is not the middleman but the claim:

> "censorship-resistant protocol" + "one Commonality-operated universal feed" + "we honor
> takedowns" do not fit together.

That document resolves the incoherence by making the shared feed a *disclosed, partisan lens*.
The Graph resolves it differently: by **removing us as the operator of the shared feed**. The
neutral layer stops being something we assert about ourselves and becomes a structural fact,
like the chain. Nobody sends us a notice about a subgraph we do not operate.

That is the same organizational risk reduction shared-feed-topology attributes to
operator-scoping ("Commonality operates less"), taken further: Commonality operates *nothing* in
the read path.

### Knock-on: operator scoping becomes config, not infrastructure

Both sibling documents converge on the view that per-operator *admission* is "a `WHERE` clause"
rather than a service. The Graph is consistent with that, and pushes it further — with no
Commonality-operated origin in the picture, a vertical's scope necessarily lives in its own
bundle/config applied client-side, where folding already runs.

This matters beyond the indexer. A founder who needs no server for reads is a founder whose entire
vertical can be a static build on infrastructure he already has; see
[what-a-founder-needs.md § 3.3](/docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb),
where the indexer is flagged as the load-bearing dependency that otherwise puts a server, a host,
and a bill back on his list.

## The hard objection: `refuse-serve` disappears

This is the one that could kill it, and it is a sharper version of the open technical issue
shared-feed-topology's review already names ("whether prohibited PublishedData bytes can escape").

`PublishedData.sol` emits content bytes **inline** in the event, so `events.data` holds actual
published content and the indexer is the *retrieval path* for it, not a pointer mirror. Its
exposure is a hosting posture.

Consequences of moving that to a decentralized network:

1. **The one server-side enforcement action becomes unavailable.**
   [policy-lists](../subsystems/policy-lists/README.md) defines exactly one indexer-surface
   action — `refuse-serve: request.cid → refuse the bytes`. On a network we do not operate,
   nobody can execute it. Display and aggregation enforcement still work (they run in the
   browser, which policy-lists already calls the right place), but the bytes stay retrievable
   by anyone who queries the subgraph directly.
2. **It exports a hosting posture to third parties who did not sign up for it.** Graph indexers
   would store and serve user-published content bytes. The
   [image policy](/specs/tech/eliminating-ipfs.md#image-policy-decided-jul-2026) bounds this
   usefully — no image-upload endpoint, so inline content is text — but "text only" is not
   "harmless," and pushing that exposure onto unwitting third parties deserves a deliberate
   answer rather than a shrug.
3. **It may be the logical endpoint of shared-feed-topology's own argument.** That document
   argues the weakest-path constraint is *intra-operator*: if someone bypasses Civility's UI to
   query an archival feed directly, that is not Civility's exposure. Extend it — if the feed is
   operated by neither Civility nor Commonality, it is nobody-we-can-name's exposure. Whether
   that is a clean resolution or merely an evasion is exactly the question a reviewer should
   press on.

A possible reconciliation, not yet thought through: keep content-bearing `PublishedData` bytes
out of the subgraph (index the pointer, retrieve the bytes another way) so the decentralized
index carries only addresses, CIDs and numbers — the part shared-feed-topology already
characterises as low-risk. That would preserve a place for `refuse-serve` while still moving the
bulk of the read path off our infrastructure. It needs design work before it is a proposal.

## Migration shape

- **One subgraph definition, two deployment targets** — self-hosted `graph-node` (with Postgres
  and IPFS, via Docker) against the local hardhat/anvil chain in dev; the decentralized network
  in production. Structurally the same arrangement as Ponder-local vs. Ponder-on-Render today.
  An earlier version of this argument claimed local development would force keeping Ponder in
  parallel; that was wrong, and the correction is most of why this document exists.
- **SDK read seam** moves from REST to GraphQL. One-time, and a reader/store seam already exists
  to change behind (see [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md)).
- **Keeping Ponder is optional insurance, not a requirement.** Fold functions do not care where
  raw events came from, so reverting is a seam change rather than a rewrite.

## Costs and open questions

- **`refuse-serve` and third-party hosting** — see above. The blocking issue.
- **Local dev gets heavier.** Three containers instead of one process, and a slower dev-loop.
  The repo already runs docker-compose with IPFS, so the marginal cost is modest.
- **Hardhat friction.** `graph-node` polls blocks and expects normal reorg semantics; local
  chains with instant mining have known rough edges, and anvil is believed to be the
  better-supported target. **Unverified — this is the spike below.**
- **Manifest regeneration.** `subgraph.yaml` hardcodes addresses and start blocks while local
  contracts redeploy constantly. Templating it is standard practice, and Ponder has the same
  problem today via env vars.
- **Matchstick** (`graph test`, AssemblyScript) replaces the current TS tests for mapping
  coverage. Small, given how trivial the mappings are.
- **Not literally zero accounts.** Querying the decentralized network needs an API key (free
  tier, ~100k queries/month). Better than running a server — but if we proxy it to spare a
  founder the signup, we are the operator again and the entire benefit is forfeit.
- **GRT for publishing/curation.** A platform action performed once, not per founder, but it is
  a crypto-economic dependency on a third party.
- **Source onboarding does not go away.** Objection 8 in shared-feed-topology applies unchanged:
  a subgraph watches configured contracts and factories, so somebody still adds new operator
  factories as verticals appear.
- **Verifier surface.** Checks such as `onchain-to-indexer` are written against the REST shape.
- **Indexing latency and third-party uptime** become someone else's operational quality, which is
  the point and also the risk.

## The spike that would de-risk it

Small and bounded, and it answers the only question here that is empirical rather than
architectural:

> Stand up `graph-node` in Docker against the local chain, index one contract's events, and
> confirm the dev loop is tolerable — specifically whether hardhat works or the local stack has
> to move to anvil, and how bad re-deploy/manifest churn feels in practice.

Everything else on this page is a judgement call that a spike will not settle.

## What would have to be true to adopt this

1. The `refuse-serve` question has an answer we are willing to defend — most likely by keeping
   content-bearing bytes out of the subgraph.
2. The dev loop survives the spike.
3. We accept a third-party dependency in the read path in exchange for the read layer being
   structurally neutral rather than neutral-by-assertion.

Absent (1), this is not adoptable regardless of how cheap the migration looks.
