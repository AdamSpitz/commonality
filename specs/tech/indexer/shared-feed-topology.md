# Shared feed vs. per-operator deployments

Status: **adopted as the default topology** (Aug 2026), after `PublishedData` became pointers-only. Decision: [ADR 0006](/specs/decisions/0006-shared-pointer-index.md).

One broad pointer-only index is the default read plane. A vertical normally applies its scope and display/aggregation policy in static client configuration and runs no stateful indexer. Commonality may operate the initial shared Ponder feed; [The Graph](./the-graph.md) is an optional later way to stop operating that shared metadata service, not a prerequisite for relieving founders of indexer operations.

[Operator-scoped deployments](./operator-scoped-deployments.md) remain an escape hatch for availability or organizational independence, custom source onboarding, and strong possession boundaries. They are not the default.

This document predates the shipped pointer-only event. Historical sections that discuss inline `PublishedData` bytes explain the concern that motivated the redesign, not the current implementation. Today no indexer route carries those bytes, so the old route-level `refuse-serve` problem is closed. Content retrieval and mirroring are separate, hash-verified roles.

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

## Historical problem (resolved): the indexer used to be a content host

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

## The price: someone operates the shared metadata service

Pointers-only materially narrows this role: the feed stores protocol facts and transaction pointers, not user-authored bytes. Commonality nevertheless owns its uptime, source onboarding, database, API behavior, and the practical convenience boundary while it runs Ponder. Describe it as replaceable infrastructure, not a canonical or perfectly neutral view.

Each vertical separately owns its content role: choosing which pointers to follow, resolving bytes from calldata or mirrors, and deciding what to render and aggregate. Its policy and notice obligations do not move into the shared index merely because discovery is shared.

Constraints that follow:

- Keep the origin content-blind; do not add content proxying or mirror storage to the indexer.
- Publish self-hosting/configuration documentation and retain independent deployments as an escape hatch.
- Treat source onboarding and uptime as explicit shared-service risks.
- Revisit The Graph if factual multiplicity or shedding the shared service becomes worth its dependencies.

## What is genuinely lost

A vertical using the shared feed lacks indexing availability independence and cannot onboard arbitrary new sources without the shared operator. It does **not** lose a content-possession guarantee merely because the pointer index is shared: possession depends on which calldata/RPC/mirror paths the vertical's browser or services actually use. Operators needing stronger organizational or availability separation can run the optional independent deployment.

## Adopted changes relative to operator-scoped-deployments.md

1. **Demote dynamic admission** from a baseline requirement to an optional capability driven by a real vertical; prefer static, inspectable client scope where it suffices.
2. **Make independent Ponder deployments the exception**, for custom source admission or genuine organizational, availability, or possession-boundary needs.
3. **Keep content enforcement with the operator's content surfaces.** The shared index carries pointers only, so `refuse-serve` belongs in any retrieval gateway that actually serves bytes, not in Ponder by default.
4. **Scope the "weakest path" principle to each operator's own surfaces** rather than requiring a vertical's policy to govern Commonality's separate metadata API.
5. **Keep content proxying and mirror storage out of the indexer.** Retrieval services and mirrors are separate roles with separate policy obligations.
6. **State that the benefit is operational and organizational**, not a claim that shared software eliminates operator duties.

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

## Remaining questions

1. Does any real vertical need an independent index or strong possession boundary?
2. Does static client scope cover real admission cases, or does a vertical need a followed source?
3. How should new factories and contract deployments be onboarded into the broad shared index?
4. When does shared-Ponder operational burden or chokepoint risk justify moving to The Graph?
