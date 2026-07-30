# Shared feed vs. per-operator deployments

Status: **proposed, not reviewed** (Jul 2026). This document argues that
[operator-scoped-deployments.md](./operator-scoped-deployments.md) picks the wrong default
deployment topology. It does not contradict that document's goals — disclosed operator scope,
admission kept separate from blocking, no contract-level takedown — only its assumption that each
operator runs its own indexer.

Nothing here is decided. It was written from a conversation and has not been reviewed.

## The complaint that started this

The thin event cache is a deliberate non-component: it stores raw events and serves them, and the
SDK folds them ([README.md](./README.md)). It exists because browsers cannot practically read full
event history from a chain node. Conceptually the UI is supposed to feel like it is folding the
chain directly, with no middleman.

Two things make that feel absurd:

1. The chain is deliberately censorship-resistant, but this mirror of a subset of its events is a
   centralized component with real takedown obligations. It looks like pure legal risk for no
   architectural benefit.
2. If the indexer were fully general and had no takedown obligations, **one** deployment could serve
   every vertical. Takedown obligations are what appear to force per-vertical deployments, and that
   is an extra operational burden pushed onto every vertical operator. That is the real cost.

Point 2 is the substantive one. This document is about whether that forced fragmentation is real.

## Correction: the indexer is a content host, not a pointer mirror

`PublishedData.sol:17` emits content bytes inline:

```solidity
event DataPublished(address indexed publisher, bytes32 indexed dataId, bytes content);
```

So `events.data` holds the actual published content, and `indexer/src/api/index.ts:91` decodes and
serves it. This matters two ways:

- **The indexer is not doing "nothing."** For PublishedData it is the retrieval path. Full-history
  topic queries at browser latency are not available from a public RPC (range limits, rate limits,
  CORS, no key in the browser). The middleman's job is *access*, deliberately not *trust*.
- **Its exposure is a hosting posture, not a linking one.** "Delist a row" is not the whole remedy
  when the row is the content.

Everything else in the events table is addresses, CIDs, and numbers. **PublishedData is where the
risk concentrates**, and that is what makes it tractable.

## The marginal-risk argument

The question is not "does the indexer create legal risk" but "given that a UI is operated anyway,
how much does the indexer add?"

Per [legal/statement-hosting.md](/specs/product/legal/statement-hosting.md), any surface rendering
an arbitrary CID on demand is a display act, so the UI already needs a denylist. Therefore:

- Deleting the indexer would remove no takedown obligation.
- The indexer's blocklist is not new legal surface — it is the same policy applied one layer down so
  the weakest path does not define the real policy, which is what
  [operator-scoped-deployments.md](./operator-scoped-deployments.md#public-api-boundary) already
  says.

What actually produces the incoherent feeling is not the middleman but the **neutrality claim**:
"censorship-resistant protocol" + "one Commonality-operated universal feed" + "we honor takedowns"
do not fit together. Operator-scoping resolves that, and that is its real contribution — a narrative
fix, not a technical one. Once a read model is a disclosed, partisan lens, honoring a takedown is
the lens doing its declared job.

Worth stating plainly in the other document: the risk reduction from operator-scoping is
**organizational** (Commonality operates less) rather than technical. Scoping software does not
reduce anyone's obligations by itself.

## The causation error

[operator-scoped-deployments.md § Two independent policy axes](./operator-scoped-deployments.md#two-independent-policy-axes)
is right that admission and blocking are different. But look at how each wants to be distributed:

| Axis | Wants to be | Carries legal obligation? | Cost to apply |
|---|---|---|---|
| **Blocking** (legal removals) | **Global.** If material is genuinely prohibited, every operator wants it gone, and applying the removal once beats N operators independently discovering it. | Yes | Small, and shared |
| **Admission / editorial exclusion** | **Local.** Civility's lens is not Tally's — that is the whole point. | No | A `WHERE` clause |

The axis you have no choice about is the one that most wants to be centralized. The axis that is
genuinely per-vertical is the one that needs configuration, not infrastructure.

So "policy varies per operator, therefore deployments must vary per operator" does not follow.
Takedown obligations are an argument *for* a shared feed, not against one.

## What is actually annoying is stateful infrastructure

Ponder + Postgres + backfill + re-sync + reorg handling + monitoring is a real burden. Applying a
filter is not. And the seam already exists: `cloudflare-service-gateway` proxies `/indexer/*` and is
stateless by construction.

Proposed tiering, replacing "every operator deploys":

**Tier 0 — config only.** The vertical points its SDK at the shared feed and ships its scope and
policy bundle in its own UI/SDK config. Runs nothing. Should cover most verticals.

**Tier 1 — stateless edge filter.** A vertical wanting server-enforced scope gets a Worker route
carrying a policy bundle. No database, no sync, no backfill. Deploying a config object, not a
service.

**Tier 2 — own deployment.** For the two cases that genuinely need it: an operator with a hard
*never-possess* requirement (not merely never-serve), or one that does not want a dependency on
Commonality's uptime and judgment. An independence choice, not a compliance requirement.

`operator-scoped-deployments.md` currently makes Tier 2 the default. It should be the exception.

## How policy-lists supports this

[policy-lists/README.md](../subsystems/policy-lists/README.md) already contains most of the
machinery, and in one place already contradicts the operator-scoped document.

### The bundle is the per-operator unit, and it is a file

[§ The resolved policy bundle](../subsystems/policy-lists/README.md#the-resolved-policy-bundle)
defines `commonality.policy-bundle/v1`: one immutable, content-addressed artifact carrying layers,
the action map, `honoredRetractors`, `onError`, and freshness thresholds, named by a digest. That is
what a vertical hands to a Worker route or ships in its UI config. The per-operator unit of
deployment is already designed to be an artifact, not a service.

[§ Activation](../subsystems/policy-lists/README.md#activation-is-atomic-and-all-or-nothing)
requires every surface to report the digest it enforced, so a vertical on a shared feed can still
demonstrate exactly what policy it applied. That is what makes Tier 0 defensible rather than merely
cheap.

### Two of three surfaces are already in the browser

[§ Where evaluation runs](../subsystems/policy-lists/README.md#where-evaluation-runs):

| Surface | Enforces | Runs |
|---|---|---|
| UI render paths | suppress display | Browser |
| SDK fold/aggregation | exclude from counts | Browser |
| Indexer/API serving | stop serving bytes for a CID | Server |

The design has already concluded that most enforcement needs no per-vertical server. A vertical that
ships a bundle to its UI gets suppression *and* aggregation-exclusion with zero infrastructure.

### The server-side action is tiny

Per [§ Each action declares a subject extractor](../subsystems/policy-lists/README.md#each-action-declares-a-subject-extractor):

```text
refuse-serve:     request.cid           → cid subject
```

One action, one extractor, one field of the request. The indexer's whole policy job is "given a CID
in the URL, refuse the bytes" — a stateless function of `(bundle, request.cid)`. No admission logic,
no fold, no Ponder, no Postgres. Worker-shaped.

### The thin cache is what keeps this cheap

policy-lists says aggregation enforcement belongs in the browser *because* folding is client-side by
design, and calls that "genuinely the right place."

Follow the consequence: **if the indexer folded server-side, `exclude-aggregation` would have to be
enforced server-side too, per vertical, under that vertical's policy.** Supporter counts and
contributor leaderboards would become operator-specific server-computed artifacts, and every vertical
really would need its own deployment.

So the dumb indexer is not the cause of the per-vertical burden — it is what keeps the burden small.
This is the strongest available argument against adding server-side folding to the indexer, and it
is independent of the maintenance arguments in [redesign.md](./redesign.md).

### "Weakest path" is intra-operator

policy-lists § Where evaluation runs says a client-side check "cannot stop **the operator's own
API** from serving prohibited bytes." The qualifier is load-bearing: the constraint binds an
operator's own surfaces. If someone bypasses Civility's UI and queries Commonality's archival feed
directly, that is Commonality's exposure — Civility never served those bytes.
[operator-scoped-deployments.md § Public API boundary](./operator-scoped-deployments.md#public-api-boundary)
generalizes past this, and that generalization is what makes Tier 0 look impossible.

Same dissolution for the complaint that the by-CID `honoredRetractors` query parameter is
"caller-selected policy, not operator enforcement." For a shared archival feed, caller-selected is
correct — it is an API and callers pick their lens. Operator enforcement lives in the vertical's own
bundle, which policy-lists
[§ Relationship to honored retractors](../subsystems/policy-lists/README.md#relationship-to-honored-retractors)
insists stays explicit and never arrives via subscription.

### The two documents disagree about admission

policy-lists puts admission at **stage 4, conditional**, and states the open question directly:

> Answering it needs someone to say whether a launching vertical actually needs operator-scoped
> indexing, not more design work here.

`operator-scoped-deployments.md` treats admission as a co-equal core axis needing its own subject
manifest, scheduled at milestone 2. These are not consistent. policy-lists is closer to right.

It also supplies an argument neither document draws out. policy-lists notes that an admission layer
failing to fetch admits *nothing* — a site-wide outage — and that staleness inverts (a stale
admission list keeps admitting subjects the operator has since removed). That is an argument against
**live admission manifests** specifically.

But scope baked into the **bundle** has no fetch-failure mode at all: it is immutable,
content-addressed, and verified at activation. **Static-scope-in-the-bundle is strictly safer than
the admission-source design, and cheaper.** If a vertical's scope is a pinned entry set rather than a
followed source, most of milestone 2 evaporates.

## The real gap: multi-tenancy

policy-lists assumes **one operator, one resolver, one bundle**. A shared feed serving N verticals
would need N bundles and a way to know who is asking. That is not designed.

Proposed fix that keeps the model intact: **make the gateway route the operator boundary, not the
indexer deployment.**

- `civility.…/indexer/*` is a single-tenant Worker route holding Civility's bundle.
- The shared origin is a *separate* operator — Commonality's archival feed — with its own bundle
  mapping legal-removal layers to `refuse-serve`.

Nothing is multi-tenant. There are several single-tenant surfaces over one shared data plane, each
with its own digest, posture, and reporting address.

## The price: someone owns the shared feed's posture

This is a business decision, not a technical one. Whoever runs the shared feed accepts host duties:
a stated policy, a reporting address, a notice-and-takedown process, and willingness to actually
remove things. Given inline `DataPublished` bytes, that is a hosting posture.

Arguments that Commonality can accept this:

- [ui-operator-posture.md](/specs/product/ui-operator-posture.md) worries about becoming the
  universal *front door* — a consumer browsing surface. A developer API is not a front door, and the
  posture document already blesses running Conceptspace as "infrastructure docs plus minimal
  inspectors."
- The global browsing UI is already being dropped (the Tally shape-2 update).

Constraints that follow:

- Removals at the shared feed are for **legal cause only, never editorial preference**. Editorial
  exclusions belong in per-vertical config, where they are cheap.
- Disclose it as explicitly editorial infrastructure, never as neutral. policy-lists
  [§ Risks](../subsystems/policy-lists/README.md#risks-and-open-questions) makes exactly this point
  about running a standard list; the same wording applies to the feed.
- Tier 2 must stay available, or the shared feed is a chokepoint. The escape hatch is what makes the
  arrangement acceptable.
- policy-lists stage 0 (compliance operations) is required for the shared-feed operator regardless,
  and gates mainnet on its own. It is not engineering.

## What is genuinely lost

A vertical reading from a shared feed **cannot claim it never possessed excluded bytes**, because
the shared operator possessed them. Never-serve is achievable at Tier 0/1; never-possess is not.

Open question worth answering before building anything: **does any real vertical actually need a
never-possess claim?** If none does,
[operator-scoped-deployments.md milestone 4](./operator-scoped-deployments.md#4-strong-no-ingestion-guarantees--mediumlarge-only-if-required)
stays hypothetical indefinitely.

## Proposed changes to operator-scoped-deployments.md

1. **Demote admission** from a core policy axis to the conditional stage policy-lists already assigns
   it; prefer static scope in the bundle over a followed admission source.
2. **Re-aim milestone 1** at "the gateway can carry a policy bundle and enforce `refuse-serve`"
   rather than "Ponder conditionally constructs sources and registers matching handlers." Much
   smaller, and it multiplies nobody's ops burden.
3. **Make Tier 2 the exception**, with the never-possess / independence conditions stated.
4. **Scope the "weakest path" principle to intra-operator** explicitly.
5. **Name PublishedData inline bytes** as the risk concentration; scope milestone 4 to it
   specifically rather than to ingestion generally.
6. **State that the risk reduction is organizational**, not a property of scoped software.
7. **Make IPFS proxying a non-goal** rather than a policy axis. The current "metadata policy — which
   admitted bytes may be fetched, cached, proxied, or rendered" invites re-entering byte territory
   that [ipfs-in-indexer.md](./ipfs-in-indexer.md) deliberately stayed out of. "We hold what the
   chain emitted, nothing else" is a clean line worth keeping.

## If server-side folding ever does happen

Not recommended (see § The thin cache is what keeps this cheap, plus the maintenance arguments in
[redesign.md](./redesign.md)). If it does, the only endorsable shape is the hybrid checkpoint already
sketched in [redesign.md § Resumable folds](./redesign.md#resumable-folds-the-general-strategy-for-cross-entity-performance):
the server materializes an accumulator using **the SDK's own fold function**, tagged with
`foldVersion` and a `(blockNumber, logIndex)` cursor; the client fetches the checkpoint and folds the
delta.

The gate: **can a client get the same answer without it?** If yes, it is a cache and it is fine. If
no, a trusted server has grown and it should be rejected. `getTopContributorsForCause` passes. A
hand-written SQL leaderboard does not.

## Open questions

1. Does any real vertical need a never-possess claim? (Decides whether Tier 2 and milestone 4 matter.)
2. Is Commonality willing to be the shared feed's host-of-record, with stage-0 compliance operations
   behind it? If not, who?
3. Does static scope in the bundle cover the real admission cases, or does some vertical need a
   followed source with its inverted failure semantics?
4. Is per-route single-tenancy at the gateway sufficient, or does something force real multi-tenancy
   in the indexer?



REVIEW FROM GPT5.6:

Yes—the **core topology makes sense**, but the document currently overclaims what it proves.

## The sound core

A shared ingestion/data plane with per-operator gateways is a credible alternative to duplicating Ponder + Postgres + backfills for every vertical:

- one shared archival event cache;
- one policy-filtering gateway per operator;
- client-side folding;
- independent indexers only where operational or legal independence matters.

That is probably the strongest practical default for Commonality-operated verticals.

## The important holes

1. **Tier 0 does not enforce the operator’s serving policy.**  
   At `shared-feed-topology.md:97`, the browser enforces display and aggregation, but the shared API serves under **Commonality’s** policy. A bundle digest proves which policy the browser used; it does not make the shared server enforce that policy.

2. **The serving filter is not currently “one CID check.”**  
   `indexer/src/api/index.ts` exposes PublishedData bytes through:
   - `/api/published-data/*`
   - `/api/events`
   - `/sql/*`
   - GraphQL

   A Worker blocking `/api/published-data/:cid` can still proxy the same ABI-encoded bytes through `/api/events`, SQL, or GraphQL. Tier 1 must close or filter every route. With the current raw-events API, that may require decoding/filtering response rows, not merely checking `request.cid`.

3. **The policy bundle does not contain admission scope.**  
   The policy-list spec explicitly says v1 has **no admission profile** (`policy-lists/README.md:913`). “Static scope in the bundle” is a reasonable new proposal, but it is not machinery that already exists. It also still needs:
   - a scope schema;
   - mapping scope subjects to event queries;
   - dependency-closure rules;
   - enforcement rules for broad/raw API requests.

4. **“Blocking wants to be global” is too broad.**  
   Legal obligations differ by jurisdiction, recipient, court order, and operator. What is defensible is:

   > Commonality’s shared feed has one baseline host policy; operators may reuse that policy but remain responsible for additional legal and editorial exclusions.

   The existing policy-list spec itself warns about a de facto censorship cartel.

5. **“A developer API is not a front door” does not answer the existing objection.**  
   `ui-operator-posture.md` specifically says a broad firehose API can recreate the platform center. The new document acknowledges hosting duties, but it does not really rebut the convenience/discovery/chokepoint concern. “Not a consumer UI” reduces salience; it does not remove the operated-service role.

6. **The possession language is confused.**  
   At lines 246–247, if the shared operator and vertical operator are genuinely different organizations, the vertical did not possess bytes merely because Commonality did. The guarantees should be separated:
   - shared origin stored them;
   - gateway may have processed or cached them;
   - browser may have downloaded them;
   - vertical UI did or did not render them.

7. **“Tier 0 runs nothing” understates policy operations.**  
   A current policy bundle still needs resolution, publication, monitoring, notice handling, and updates. The vertical may run no stateful indexer, but it does not have zero operational burden.

8. **A universal feed still needs source onboarding.**  
   Ponder watches configured contracts/factories. One deployment serves every vertical only if all relevant factories are already discoverable from a common source or somebody continuously adds new operator factories.

## My verdict

**It makes enough sense to preserve, but not enough to supersede `operator-scoped-deployments.md` yet.**

The defensible conclusion is narrower:

> Default to shared ingestion for Commonality-operated or dependency-tolerant verticals; use single-tenant policy gateways where server-side operator enforcement is required; retain independent deployments for organizational independence, availability independence, custom source admission, and strong possession guarantees.

Before calling Tier 0/1 viable, the document needs an explicit route-level data-flow analysis showing whether prohibited PublishedData bytes can escape through `/api/events`, SQL, GraphQL, caches, or direct-origin access. That is the biggest technical issue.
