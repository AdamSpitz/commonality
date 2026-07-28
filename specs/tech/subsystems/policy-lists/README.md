# Policy lists: composable blocklists

Status: **proposed, not implemented** (Jul 2026). Design for generalizing the existing
per-UI display denylist into interoperable, subscribable, verifiable lists, so that a vertical
operator can meet ordinary legal takedown obligations without building a moderation
department, while remaining ultimately in control of what their site suppresses.

Context: [operator-posture.md](/specs/product/ui-operator-posture.md) (the protocol stays
neutral; each front door owns its display policy), [published-data/README.md](../published-data/README.md)
§ "Honored retractors" (the primitive this builds on), and
[legal/README.md](/specs/product/legal/README.md) "Before mainnet" item 3 (the capability
exists; the *operation* does not).

## The problem

The architecture expects many independently-operated vertical sites. Each is legally
responsible for what it displays, and each must be able to take down the usual illegal
material (CSAM, NCII, terrorist content, sanctioned parties). We do not want every vertical
operator to build a moderation department in order to launch — but we also refuse to make
suppression a protocol-level lever that anyone can pull on everyone.

So: **the vertical operator decides what their site blocks, but the default path is to
subscribe to lists maintained by others.** The result a site suppresses is derived from what
its subscribed lists assert, filtered and overridden by the operator's own policy.

What this reduces is *integration* burden. It does not make compliance free: an operator still
needs a reporting address, someone on call, an appeals process, a legal policy, and — as
[§ "What this does not solve"](#what-this-does-not-solve-real-world-safety-lists) explains —
a relationship with whoever maintains a usable dataset. Claiming otherwise would be the same
affordance-vs-fact error [operator-posture.md](/specs/product/ui-operator-posture.md) warns
about everywhere else.

Because blocklists are an obvious censorship vector, a keeper must not be able to lie about
what they have blocked, block something for one audience and not another, or quietly un-block
something later. That requirement drives most of the design below.

## What exists today

| Layer | Blocking | Notes |
|---|---|---|
| Contracts | **None.** `PublishedData.retractData(bytes32)` lets *any* address retract *any* dataId; the contract stores the bit and expresses no opinion. No admin, no takedown. | Correct and to be preserved — [operator-posture.md](/specs/product/ui-operator-posture.md) § "Keep contract-layer neutrality". |
| Indexer | **None.** Serves everything it indexes. | The serving-layer filter contemplated in [published-data/README.md](../published-data/README.md) § "Denylist takedown: filter, don't purge" is unbuilt. |
| SDK | `DisplayPolicy { honoredRetractors }` → `by-cid.ts` resolver. Defaults honor only a publisher's self-retraction. | Per-caller policy, not enforcement. |
| UI | `ui/src/shared/config/displayDenylist.ts` — one runtime-fetched JSON at `VITE_DISPLAY_DENYLIST_URL` giving `{ deniedCids, honoredRetractors }`. | Deliberately runtime-fetched, never baked into the immutable IPFS bundle ([ADR 0004](/specs/decisions/0004-user-publishes-displayable-data.md)). |
| platform-api-service | `BLOCKED_CHANNEL_IDS` (`config.ts`, enforced `service.ts` → 403 `blocked_identity`). | The one non-UI blocklist. Gates *money claiming* by platform identity, not display — a different kind of decision, see [§ Assertions vs. actions](#assertions-vs-actions). |

`honoredRetractors` is already most of what we want: permissionless, on-chain, per-display-layer
choice, composes by union, and permanently logged so a censor cannot lie. Four gaps:

1. **No composition.** `deniedCids` comes from exactly one URL; there is no notion of multiple
   sources, per-source scoping, or operator override.
2. **Cost.** One transaction per blocked item. A real hashlist is six figures of entries.
3. **Coverage.** Everything is CID-shaped. Verticals also need to block project addresses,
   content-funding contracts, channel IDs, and wallets. No subject-type taxonomy exists.
4. **No unblock.** `retractData` is a one-way bit. Mistakes are permanent.

## Design

### One object type: the policy list

There is a single published object, the **policy list snapshot**. It is either:

- a **leaf** — literal entries; or
- a **composition** — an ordered sequence of layers, each referencing another policy list.

Both kinds are published identically and get their own on-chain checkpoint. "Blocklist" and
"allowlist" are informal roles, not distinct types: a list is an allowlist when someone
references it with an `allow` layer.

This uniformity is what makes third-party override work. A curator can publish
`[block StandardList, allow MyCorrections]` as a single list with its own checkpoint; many
operators then subscribe to that one list instead of each maintaining corrections themselves.
Operators can still layer their own overrides on top, recursively.

### List identity

Versions are keyed by `(keeper, listId)`, so a reference carrying only `listId` is ambiguous —
two keepers may pick the same id. Every reference therefore carries a fully-qualified,
chain-namespaced identity, per the CAIP-10-style rule established in
[multi-chain.md](/specs/tech/multi-chain.md) item 3:

```jsonc
{ "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…" }
```

Policy lists live on one chain today. Including `chainId` and `registry` anyway costs nothing
now and avoids a breaking format change to the interop contract later — the same reasoning
multi-chain.md applies to event and entity identifiers.

Head resolution likewise filters on `(keeper, listId)` topics, never `listId` alone.

### The registry contract

`PolicyListRegistry.sol` — admin-less, immutable, permissionless, on the same L2 as everything
else. (Not a separate chain: a checkpoint per list per day is trivially cheap, and cross-chain
reads would import a trust problem for no benefit.)

```solidity
mapping(address => mapping(bytes32 => uint64)) public latestVersion; // keeper => listId => version

event ListPublished(
  address indexed keeper,
  bytes32 indexed listId,     // keeper-chosen; keepers may run many lists
  uint64  indexed version,    // strictly increasing per (keeper, listId)
  bytes32 snapshotHash,       // hash of the canonical snapshot bytes
  string  locator             // ipfs:// | https:// | ar://
);
```

The one storage word is deliberate: monotonic versions cannot be *promised* without being
enforced, and an unenforced ordering rule is exactly the kind of claim a captured keeper would
exploit (republishing an old version to silently revert corrections). `publish` reverts unless
`version > latestVersion[keeper][listId]`.

A second event carries a manifest locator (human-readable name, policy, contact, appeals
process, and a scope statement saying what the list covers) so lists are discoverable and their
governance legible. Optional
at the protocol level; **required in practice for any list presented as a standard one** — a
list that many operators follow by default without a published policy and appeals route is a
governance failure regardless of what the contract permits.

**Why snapshots rather than `Block`/`Unblock` events.** Cost is O(1) per version rather than
per entry, so a 200k-entry list costs one transaction. Unblocking is free — absence from the
next snapshot. And crucially, a snapshot commits to the *complete current state*: with an
event stream you can prove additions but cannot cheaply prove what the list says right now.

The checkpoint is the accountability device. A keeper cannot serve one snapshot in one
jurisdiction and a different one elsewhere (both must hash to the committed value), cannot
deny having blocked something they published, and cannot silently un-block or silently revert.
The limits of this are stated honestly in [§ Availability](#availability-and-the-limits-of-the-accountability-claim).

### Canonical serialization

`snapshotHash` is `sha256` over the snapshot serialized with **JSON Canonicalization Scheme
(RFC 8785)**, UTF-8. Without a normative rule, two honest implementations disagree on the hash
and verification becomes a coin flip.

Encodings are pinned so subjects compare equal across implementations: hashes and addresses as
lowercase `0x` hex (addresses compared case-insensitively, not by EIP-55 checksum), chain IDs
as numbers, CIDs as CIDv1 base32, channel IDs in the existing `platform:kind:id` form.

Validators MUST reject a snapshot unless:

- its `keeper`, `listId`, and `version` match the checkpoint that pointed at it;
- every reference is fully qualified (§ List identity);
- `previous` is present for every version after genesis and names the actual preceding
  checkpoint for that `(keeper, listId)`.

**Head** means the latest checkpoint at or before the client's confirmation depth; consumers
declare a reorg policy rather than trusting the chain tip. A snapshot is authenticated by its
keeper's checkpoint transaction — it is **not** independently signed. Detached signatures would
add little (the transaction already binds keeper to hash) and are deliberately omitted; the
word "signed" should not be used for these snapshots.

### Snapshot format

```jsonc
{
  "schema": "commonality.policy-list/v1",
  "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…", "version": 42,
  "publishedAt": "2026-07-28T00:00:00Z",
  "previous": { "version": 41, "snapshotHash": "0x…" },

  // leaf form
  "entries": [
    { "subject": { "type": "cid",     "value": "bafy…" },                "reason": "court-order-2026-0412" },
    { "subject": { "type": "address", "value": "0x…", "chainId": 8453 } },
    { "subject": { "type": "channel", "value": "twitter:uid:123" },      "reason": "impersonation report" }
  ]

  // …or composition form (mutually exclusive with `entries`)
  "layers": [
    { "ref": { "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…",
               "version": 17, "snapshotHash": "0x…" },
      "op": "block", "protect": true },
    { "ref": { "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…",
               "version": 4, "snapshotHash": "0x…" },
      "op": "allow" }
  ]
}
```

**Subject types:** `cid`, `publishedDataId` (bytes32), `address` (with `chainId`), `channel`,
`statement`. This taxonomy is the coverage gap the current denylist lacks and every vertical
will need.

### One list, one reason — no category dimension

An earlier draft gave entries a `categories` field and made categories the subscription unit,
so an operator could take `csam + terrorism` from a list without its `spam` opinions. That is a
real need, but **it is already served by list granularity plus composition, and the second
mechanism was not worth its weight.**

`listId` is keeper-chosen and keepers may run many lists, so a keeper who classifies their
entries publishes one list per class. An operator wanting everything subscribes to a
keeper-published composition that unions those leaves; an operator wanting a subset subscribes
to the leaves directly. Same expressiveness, no new dimension, and no case where categories
help but list-splitting does not — a keeper unwilling to classify their entries would not have
tagged them either.

What removing it bought:

- **Composition is plain set algebra again.** A category dimension made evaluation produce a
  category set per subject, because a boolean lost provenance: a subject asserted as both
  `csam` and `spam`, with a later layer pardoning `spam`, must stay blocked. That whole failure
  mode cannot arise when the two assertions live in different lists.
- **Action mapping gets safer** — see below.
- **No false interop.** A shared vocabulary implies `fraud` means the same thing to every
  keeper, which it will not. Compare [published-data/README.md](../published-data/README.md)
  § "No context/topic tag", which rejected a hint field on adjacent grounds: a field that must
  not be believed should not exist.

Entries may still carry a free-text `reason` (a policy code, a ticket, a court-order
reference). It is **advisory metadata for human display and appeals, never an evaluation or
subscription input** — it exists so a suppression notice can say why, and so an appeal has
something to name.

### Assertions vs. actions

**Lists assert that a subject is listed. Lists do not decide what happens as a result.** The
mapping from assertion to consequence belongs to the operator, and is keyed by the list:

```text
(subject type, list) → suppress display
(subject type, list) → exclude from aggregation
(subject type, list) → refuse metadata fetch / stop serving bytes
(subject type, list) → reject a claim or payout
```

This separation is load-bearing, and an earlier draft got it wrong by proposing a single
`isBlocked(subject)` answer shared across rendering, aggregation, serving, discovery, and
`platform-api-service`'s claim gate. Those are materially different decisions with different
stakes. Collapsing them means a keeper of a spam list silently acquires the power to block
people's money. It also muddies the legal posture this whole design is for: the operator must
own the enforcement decision, not inherit it implicitly from whichever list they subscribed to.

Keying actions on the list rather than on a category is the stricter of the two: with
categories, *any* subscribed list could assert `sanctions` and thereby gate money, whereas here
the operator names the specific list that holds claim-gating power.

So `platform-api-service`'s `BLOCKED_CHANNEL_IDS` may *source* from a policy list, but only
through an explicit action mapping naming that list. It does not become a generic
display-policy subscriber.

### Composition semantics

Evaluation is set algebra. Over layers in order, per subject:

1. Start with the subject unlisted and unprotected.
2. **`block` layer** — if the referenced list resolves the subject as listed, mark it listed.
   If the layer declares `protect: true`, also mark it protected.
3. **`allow` layer** — if the referenced list resolves the subject as listed, mark it unlisted,
   unless it is protected.

A leaf resolves a subject as listed when it has a matching entry; a composition resolves by its
own evaluated result — so the recursion is uniform. The evaluator returns, per subject, the set
of layers that listed it, which is what the operator's action profile consumes (and what a
suppression notice cites).

The simple case reads simply: `[block A, block B, allow C]` is "union of A and B, minus C."

**`protect` is scoped to the composition that declares it and does not propagate upward.**
When a parent evaluates a child node, it receives a listed/unlisted result; the child's internal
protections are already applied within the child and impose nothing on the parent. This is a
deliberate choice with a real trade-off: it means an upstream curator *cannot* guarantee that
downstream subscribers keep honoring their floor. We accept that, because the alternative is
worse — a curator who could set an inescapable floor would defeat the design's central promise
that the subscribing operator remains ultimately in control, and would hand any captured
upstream an irrevocable censorship lever. The operator is the legally responsible party; the
floor is theirs to set, in their own root.

Within a node, `protect` does exactly what it should: an operator writing
`[block StandardCsamList (protect), block StandardSpamList, allow ThirdPartyCorrections]` gets
the convenience of delegated overrides while guaranteeing the delegate can pardon spam
judgments but never the one list they can never afford to have pardoned. That bound is what
makes delegating overrides a reasonable act rather than a reckless one — and note it is another
place where per-list granularity is doing work a category dimension would have done more
awkwardly.

**Robustness:** the reference graph must be acyclic; evaluators enforce a depth cap (8) and
abort on cycles. Publishers cannot be trusted to be well-formed.

### Pinning and verifiability

**Published compositions MUST pin every reference** by `(chainId, registry, keeper, listId,
version, snapshotHash)`. Only the unpublished root — the operator's own local config — may
follow a list's head.

This preserves the point of the checkpoint: because children are pinned, **any third party can
recompute a composed list from its children and verify that the published result is what the
composition actually says.** A curator who bumps their upstream pins produces a new on-chain
version, so "started following a new upstream" is itself permanently logged.

A composition MAY additionally carry a materialized `flattened` result. Clients use it for
speed; auditors recompute from the pinned children to check honesty. Fast path and audit path
must agree, and a disagreement is provable misconduct.

### The operator's subscription

The operator's configuration is an unpublished composition node — the root of the tree. Same
schema, one extra freedom (it may follow head):

```jsonc
{
  "layers": [
    { "id": "standard-illegal",
      "ref": { "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…" },
      "op": "block", "protect": true,
      "follow": { "head": true, "maxAge": "48h", "maxDiff": 5000 },
      "onError": "closed" },
    { "id": "sanctions",
      "ref": { "…": "…" }, "op": "block", "follow": { "version": 42 } },
    { "id": "my-corrections",
      "ref": { "source": "https://myvertical.example/list.json" }, "op": "allow" }
  ],
  "actions": {
    "standard-illegal": ["suppress","exclude-aggregation","refuse-serve"],
    "sanctions":        ["reject-claim"]
  },
  "honoredRetractors": ["0x…"]
}
```

Layers carry a local `id` purely so the action profile can name them; it is operator-local and
never published.

**Follow head vs. pin.** Following head is the low-effort default and the reason this scales to
many operators. Pinning means a captured keeper cannot silently expand your blocklist — you
review the diff before bumping.

Following head needs freshness controls, or "follow" silently becomes "trust unconditionally":
`maxAge` (a list that stops publishing is a failure, not a steady state — alert rather than
coast on a stale snapshot), `maxDiff` (an anomalous jump holds at the last accepted version and
alerts rather than auto-applying), and a one-step rollback to a previous version.

**An action naming a layer `id` that does not exist is a hard configuration error**, not a
silently-ignored line. A typo in the operator's own mandatory subscription would otherwise fail
open on exactly the list that must never fail open.

**Error behavior.** The current implementation fails open — a fetch error logs a warning and
renders everything. That is the wrong default for a mandatory list. Each layer declares
`onError`:

- `closed` (recommended for mandatory block layers) — fall back to the last-known-good cached
  snapshot; snapshots are immutable and content-addressed, so caching them indefinitely is
  safe. Only if no cached copy exists at all does the surface degrade to refusing to render
  unverified content.
- `open` — proceed without this layer.
- `ignore` — the sensible default for `allow` layers, where a failed fetch merely over-blocks.

### Where evaluation runs

Policy evaluation is **one shared evaluator with one canonical policy version**, not a browser
feature. A client-side check can suppress rendering, but it cannot stop the operator's own API
from serving prohibited bytes, cannot refuse a metadata fetch, and cannot gate a claim. The
enforcement surfaces are:

| Surface | Enforces | Runs |
|---|---|---|
| UI render paths | suppress display | Browser (SDK evaluator) |
| SDK fold/aggregation | exclude from counts | Browser — aggregation is client-side by design ([tech/README.md](/specs/tech/README.md) § client-side folding), so this is genuinely the right place |
| Indexer/API serving filter | stop serving bytes for a CID | Server |
| `platform-api-service` | reject a claim | Server |

The same evaluator implementation and the same resolved policy version must back all four, or
the layers disagree and the weakest one defines actual behavior. Server responses should
identify the effective policy snapshot version they were produced under, so a stale server
cache is detectable rather than silent.

Client mechanics: resolve head from the indexer's event cache by `(keeper, listId)` topics —
the same shape as the existing `by-cid.ts` resolver — fetch the locator, verify
`sha256(canonical bytes) == snapshotHash`. That verification is what allows snapshots to live
on any cheap, untrusted host. Cache in IndexedDB keyed by `snapshotHash`; snapshots are
immutable, so cache indefinitely.

### Lookup at scale needs authenticated absence

For large lists a client cannot always download everything, and the naive fix — a lookup API
plus Merkle inclusion proofs — is backwards for this problem. Blocking's safety-critical
direction is proving a subject is **not** listed: a lazy or malicious lookup service simply
omits a match, and the content renders. An inclusion proof cannot detect that.

So any partial-download scheme MUST provide verifiable non-inclusion — a sparse Merkle tree or
other authenticated dictionary, an ordered Merkle set with non-inclusion proofs, or complete
independently-downloaded chunks covering the queried key range.

There is also a privacy cost: asking a third-party service "is this CID blocked?" reveals what
the visitor is reading, which cuts against [privacy.md](/specs/product/legal/privacy.md).
Prefer bulk local evaluation, or a lookup service the operator runs themselves.

Given both, **defer this entirely until real list sizes require it.** Full download with local
evaluation is correct, private, and simple; a v1 that ships it and nothing else is not cutting
a corner.

### Disclosure: what publishing a list reveals

A public plaintext list of CSAM CIDs is a findability index for the material — the classic
hash-list problem. Entries therefore support `valueHash` (`H(salt‖canonicalSubject)`, salt in
the snapshot) as an alternative to `value`.

**This is findability reduction and pseudonymization, not confidentiality**, and the spec
should not pretend otherwise. The salt is public, so anyone can hash a dictionary against it.
That defeats casual browsing of high-entropy preimages like CIDs, but it does **not** conceal
low-entropy or enumerable subjects: named channels, wallets, and well-known project addresses
all fall to a dictionary attack in seconds.

This is a genuine tension with no clean resolution: public verifiability (anyone can audit what
a keeper blocked) and confidential list contents are close to mutually exclusive by
construction. This design deliberately chooses verifiability, because the censorship risk it
guards against is the one we can actually do something about architecturally. A list that must
truly stay confidential does not belong in this system — it belongs behind an operator-run
service with contractual access control, and the operator's policy profile can reference it
without publishing it.

### Availability and the limits of the accountability claim

The chain stores hashes and locators, not bytes. If an HTTPS object disappears and nobody
retained a copy, that snapshot's contents are gone. So the accurate claim is not "the full
history of what was ever blocked is enumerable by anyone" — an earlier draft overstated this —
but:

> **Every retained snapshot can be authenticated, and missing historical snapshots are
> detectable.**

That is weaker but still does the work: the `previous` chain makes gaps conspicuous, so a
keeper who lets their history evaporate is visibly doing so rather than quietly rewriting it.

To make the stronger claim true in practice, a list presented as a standard one should publish
to content-addressed storage (IPFS) rather than a bare HTTPS origin, and its manifest should
name archival mirrors. Independent archival keepers re-pinning others' snapshots is a cheap,
useful public service and should be encouraged.

### Relationship to honored retractors

Keep both; they are complementary, and a keeper uses both.

- **`retractData`** — per-item, on-chain, immediate, costs a transaction. Right for urgent
  one-off takedowns, and the mechanism by which *authors* retract their own work.
- **Policy list snapshots** — bulk, cheap, revocable, and able to name subjects that are not
  PublishedData CIDs at all.

A keeper responding to an urgent report emits `retractData` now and rolls it into tonight's
snapshot. The resolved policy therefore carries both the per-subject listing result and an
honored-retractor set, and a subscription may contribute to either.

## What this does not solve: real-world safety lists

The motivating example — subscribe to a standard list and get CSAM blocking — assumes such a
list can be represented as content IDs and published openly. In practice it largely cannot,
and the spec would be dishonest not to say so:

- **Industry safety datasets are perceptual fingerprints, not exact content hashes** (PhotoDNA
  and equivalents), because exact hashes are useless against re-encoding. A CID matches one
  exact byte sequence; cropping, transcoding, or a single flipped bit produces a new CID.
- **Those datasets are access-controlled and licensed**, and their terms generally forbid
  republication. An open checkpointed snapshot is the opposite of what the license permits.
- **Publishing perceptual fingerprints openly is itself harmful** — it lets an adversary test
  material against the list until it stops matching.
- **Matching requires scanning media bytes** with a provider-specific algorithm, which is a
  different operation from the set-membership check this design performs.

Consequences for scope: **v1 is explicitly scoped to exact, known content identifiers and
named subjects** (CIDs, addresses, channels, statements) — which genuinely covers court
orders, sanctions lists, notice-and-takedown responses, and fraud reports, all of which are
real and worth having. The subject taxonomy should reserve a scheme-qualified fingerprint
subject type (`{ "type": "fingerprint", "scheme": "…", "value": "…" }`) so provider integration
can arrive without a format break, but that integration is separate work with its own legal and
operational prerequisites.

Most importantly: **this machinery does not solve the operational problem.** It is
distribution and composition plumbing. Obtaining a legitimate keeper, a usable compliance
dataset, and the provider relationships that come with it remains the actual hard part, and it
is not an engineering task.

## What it would take

Staged so that the hardest and most sensitive parts are not frozen prematurely. Composition
stays in the schema from day one — it is only a node type, and retrofitting it would break the
interop contract — but its tooling comes later.

| # | Stage | Size |
|---|---|---|
| 1 | Registry identity + canonical snapshot format: `PolicyListRegistry.sol` (with monotonic-version storage), JCS serialization, validators, deploy script, `deployments/` entry | Small |
| 2 | Leaf snapshots + local operator composition: indexer handler, keeper publishing tool, operator root config | Medium |
| 3 | Evaluator shared across all four enforcement surfaces, plus the operator action profile | **Medium — the core** |
| 4 | Extend call sites past CIDs to addresses/channels/projects, including aggregation paths | **Medium-large** |
| 5 | Publishing pinned compositions (third-party override), diff viewer, freshness alerting | Medium |
| 6 | Authenticated-absence lookup — only once real list sizes require it | Deferred |
| 7 | Scheme-qualified fingerprint/provider integration | Separate work |

Stage 4 is the largest engineering cost, and note that it is the **coverage** gap, not the
composability gap — composability is cheap precisely because the on-chain primitive already
exists. [published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2
is emphatic that suppression must cover **aggregation, not just rendering**: supporter counts,
transitive implication support, contributor leaderboards. A half-applied blocklist is worse
than none.

## Risks and open questions

**Censorship cartel.** If every vertical follows head on the same two lists, those keepers
become a de facto central censor with soft power over the whole ecosystem — the exact failure
mode this design exists to avoid. Mitigations, in order of importance: the on-chain checkpoint
history makes capture *detectable*; narrow per-list subscription limits blast radius; `protect` plus
third-party allow layers give operators a cheap escape that does not require running their own
moderation. But detection only works if someone watches — so the public diff feed is a
first-class product surface, and a [verifier](/verifier) check should alarm on anomalous diffs
(unusual volume, scope drift, entries silently removed).

**Being a keeper is its own liability.** Publishing "channel X is fraud" about a named person
is a defamation surface, and running *the* standard list makes Commonality the ecosystem's
moderation authority — which cuts directly against
[operator-posture.md](/specs/product/ui-operator-posture.md). If Commonality runs a standard
list, it should be under the same explicitly-editorial posture as Civility ("this is our
opinion, here is our policy, here is the appeals process"), never framed as neutral
infrastructure. Long term, the standard lists are better run by someone else.

**Following head means blocking things you never reviewed.** That is fine for compliance and is
the entire point, but a subscribing operator's terms should say so honestly rather than
implying every suppression was their own editorial judgment.

**List scope is the interop contract.** With no category dimension, what a list means is
whatever its manifest says it means — so a list presented as a standard one needs a scope
statement precise enough that an operator can decide to follow it, and a keeper who quietly
broadens their own scope is doing the same damage a category dimension would have let them do
openly. This is what the diff feed and `maxDiff` alerting exist to catch.

**Open: subject normalization and propagation.** Does blocking a wallet also block the projects
it created? Does blocking a project contract block its metadata CID, its token CIDs, its
funding portal? Does blocking a channel block content contracts naming it? These are not
derivable from the list — they are operator rules, and they need an explicit, conservative
default before implementation. Getting this wrong in either direction is bad: too much
propagation is a censorship amplifier, too little makes takedowns trivially evadable by
re-pointing.
