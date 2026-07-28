# Policy lists: composable blocklists

Status: **proposed, not implemented** (Jul 2026). Design for generalizing the existing
per-UI display denylist into interoperable, subscribable, verifiable lists.

What this is, stated precisely so nobody plans around a stronger claim:

> **Transparent distribution and composition infrastructure for exact-identifier policy
> decisions.** It lets a vertical operator reuse someone else's takedown work instead of
> originating all of it, while remaining ultimately in control of what their site suppresses.
> It does not give an operator compliance for free.

Note the sequencing consequence up front: **this design must not gate the immediate legal
requirement.** Operationalizing the denylist that already exists — across display, aggregation,
serving, claims, and gas sponsorship — comes first; the registry is worth building when there
is a real second keeper or operator to interoperate with. See
[§ What it would take](#what-it-would-take).

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
"exception list" are informal roles, not distinct types: a list is an exception list when
someone references it with an `allow` layer.

**These are blocklists and exception lists, not allowlists.** Evaluation starts from *unlisted*
and `allow` only subtracts from what an earlier layer added. Admission-style allowlisting
("deny everything except the listed subjects") is a different thing — it needs a universe to
take the complement of, or a `default: block` mode — and is **out of scope**. There is no
concrete use case for it here, and adding one would drag in complement and universe questions
disproportionate to the benefit. The word "allowlist" should not be used for these objects; the
layer operator is named `allow` because it describes what the layer does to prior assertions.

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

**The manifest is bound to the version, not published beside it.** The manifest carries the
human-readable name, policy, contact, appeals process, expected publication cadence, and a
scope statement saying what the list covers — which, with no category dimension, *is* the
interop contract (see [§ Risks](#risks-and-open-questions)). A separate, unbound manifest
event would let a keeper silently rewrite their own scope and policy after the fact, which is
precisely the move the checkpoint exists to prevent. So each snapshot carries

```jsonc
"manifest": { "hash": "0x…", "locator": "ipfs://…" }
```

inside the hashed bytes. The checkpoint therefore commits to the manifest transitively: a scope
or policy rewrite requires a new version and is permanently logged, and a historical decision
can be read under the policy that was actually in force when it was made. Genesis versions MAY
omit it; **any list presented as a standard one MUST carry it** — a list many operators follow
by default without a published policy and appeals route is a governance failure regardless of
what the contract permits.

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
  checkpoint for that `(keeper, listId)`;
- every entry's subject canonicalizes without error, and no two entries canonicalize equal.

### Subject canonicalization

Membership is an equality test on subjects, so subject identity is as much of an interop
boundary as the snapshot hash, and it cannot be left mostly open. Each subject canonicalizes to
a **subject key**, a UTF-8 string; two subjects are the same subject exactly when their keys are
byte-equal.

| Type | Key | Notes |
|---|---|---|
| `cid` | `cid:` ‖ CIDv1, base32, raw codec, sha2-256 multihash | Any input CID is normalized to this form before comparison. |
| `address` | `address:` ‖ decimal `chainId` ‖ `:` ‖ lowercase `0x` hex | `chainId` is **required**; an address is only meaningful per chain. |
| `channel` | `channel:` ‖ `platform:kind:id`, platform and kind lowercased ASCII, `id` byte-exact | `id` is *not* case-folded — it is an opaque platform identifier, and folding it would merge distinct accounts on case-sensitive platforms. |

**`publishedDataId` and `statement` are not separate subject types.** `PublishedData` derives
`dataId = sha256(content)` and the codebase already picked the fixed-hash CID format to match
it, so a `publishedDataId` is a CIDv1 over the same digest — the same subject reached by a
different encoding, and two names for it would let a list block content under one spelling and
appear not to block it under the other. Statements are displayable documents identified by
their CID, so they are likewise `cid` subjects. The taxonomy is therefore **`cid`, `address`,
`channel`**, plus the reserved `fingerprint` type of
[§ What this does not solve](#what-this-does-not-solve-real-world-safety-lists). Publishers
holding a bare `bytes32` dataId convert it to the CID form when writing an entry, using the
existing `publishedDataIdToCid` / `publishedDataCidToId` helpers
([published-data/README.md](../published-data/README.md) item 4); the conversion is total and
lossless in both directions, which is precisely why two subject types would be redundant.

**Unknown subject types are a hard rejection, not a skip.** A validator that ignores entries it
does not understand fails open on exactly the entries a newer keeper considered important
enough to add. A consumer encountering an unknown `type` MUST treat the whole snapshot as
invalid and apply the layer's `onError` behavior. This is why the reserved `fingerprint` type
matters: introducing a subject type is a breaking change for existing consumers, so the set
should grow rarely and deliberately.

**Duplicates are invalid.** Two entries with equal subject keys are a rejection rather than a
silent merge, because the merge rule for their differing `reason` fields would be arbitrary and
duplicates are always a keeper tooling bug.

**`valueHash` needs domain separation.** The hashed form is

```text
valueHash = sha256( "commonality.policy-list/v1/subject" ‖ 0x00 ‖ salt ‖ 0x00 ‖ subjectKey )
```

with `salt` the snapshot's `salt` field (raw bytes) and `subjectKey` its UTF-8 bytes. The
constant prevents these digests from being reinterpreted as any other hash in the system, and
the `0x00` separators prevent the concatenation ambiguity in a bare `H(salt‖subject)` — without
them a chosen salt and a chosen subject can produce the same preimage as a different pair.
An entry carries `value` or `valueHash`, never both; a snapshot mixing hashed and plain entries
is legal, since the choice is per-subject sensitivity.

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
  "publishedAt": "2026-07-28T00:00:00Z",   // advisory only — never an input to freshness
  "previous": { "version": 41, "snapshotHash": "0x…" },
  "manifest": { "hash": "0x…", "locator": "ipfs://…" },
  "salt": "0x…",                            // present iff any entry uses valueHash

  // leaf form
  "entries": [
    { "subject": { "type": "cid",     "value": "bafy…" },                "reason": "court-order-2026-0412" },
    { "subject": { "type": "address", "value": "0x…", "chainId": 8453 } },
    { "subject": { "type": "channel", "value": "twitter:uid:123" },      "reason": "impersonation report" },
    { "subject": { "type": "cid",     "valueHash": "0x…" } }
  ]

  // …or composition form (mutually exclusive with `entries`)
  "layers": [
    { "ref": { "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…",
               "version": 17, "snapshotHash": "0x…" },
      "op": "block", "protect": true },
    { "ref": { "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…",
               "version": 4, "snapshotHash": "0x…" },
      "op": "allow" },

    // a layer may nest an anonymous sub-composition instead of naming a published list,
    // which is how a correction list is scoped to the list it corrects (§ Composition semantics)
    { "op": "block",
      "layers": [ { "ref": { "…": "…" }, "op": "block" },
                  { "ref": { "…": "…" }, "op": "allow" } ] }
  ]
}
```

**Subject types:** `cid`, `address` (with `chainId`), `channel` — see
[§ Subject canonicalization](#subject-canonicalization) for why `publishedDataId` and
`statement` are the same subject as `cid` rather than types of their own. Reaching past CIDs to
addresses and channels is the coverage gap the current denylist lacks and every vertical
will need.

A layer carries **either** a `ref` to a published list **or** an inline `layers` array, never
both. Inline nodes evaluate exactly like referenced ones — same recursion, same `protect`
scoping — and exist so that scoping a correction does not require publishing an intermediate
list. Everything inside a published snapshot is still covered by that snapshot's hash, so an
inline node is no less auditable than a referenced one; it simply has no independent identity
or version of its own.

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

- **Provenance becomes structural rather than a per-entry vocabulary.** A category dimension
  made evaluation produce a category set per subject, because a subject asserted as both `csam`
  and `spam`, with a later layer pardoning `spam`, must stay blocked. Splitting the lists does
  not by itself dissolve that problem — an earlier draft claimed it did, and that was wrong; a
  correction layer still has to be *scoped* to the assertion it corrects. What splitting buys is
  that the scope is now a position in the composition tree, which the evaluator can enforce,
  rather than a shared word that keepers would have had to mean the same thing by. See
  [§ Composition semantics](#composition-semantics) for the actual rule.
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
(subject type, list) → refuse gas sponsorship
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

**No action has a default.** The prose above keys actions on `(subject type, list)` and the
config example maps layer ids, which needs pinning down:

- A layer's mapped actions apply to **every subject type that layer lists**, on every surface
  that implements those actions. A surface simply skips actions for subject types it cannot act
  on — an aggregation path has nothing to do with a `channel` subject — and this is a no-op, not
  an error.
- A mapping MAY be narrowed by subject type (`"sanctions": { "address": ["reject-claim"] }`).
  The array form is shorthand for "all subject types".
- **An unmapped layer is a startup error, not a no-op.** A layer present in the root but named
  by no action is either a typo or a subscription the operator forgot to wire up; failing open
  on it is the failure mode this whole section exists to prevent. Combined with the converse
  rule (§ The operator's subscription), the mapping and the layer set must correspond exactly.
- **Financially consequential actions are never implied.** `reject-claim` and
  `refuse-gas-sponsorship` must be written explicitly against a named layer. There is no
  configuration under which subscribing to a list gets a keeper power over money by default.
- Suppressing display without excluding from aggregation **is** a permitted combination — it is
  what "hidden but still counted" means, and there are legitimate uses (a subject under appeal).
  But it is a footgun with respect to
  [published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2, so
  tooling should warn, and any mandatory-compliance layer should carry both.
- Validation runs at startup and **fails the process**, not the request. A vertical that boots
  with an invalid policy profile and serves traffic is worse than one that refuses to boot.

### Composition semantics

Evaluation is set algebra over **surviving assertions**, not over a boolean. Each node
evaluates, per subject, to the set of its own layers that currently list that subject:

1. Start with an empty set of surviving assertions.
2. **`block` layer** — if the layer's child resolves the subject as listed, add this layer to
   the set. If the layer declares `protect: true`, mark that assertion protected.
3. **`allow` layer** — if the layer's child resolves the subject as listed, remove every
   unprotected assertion currently in the set.
4. The node resolves the subject as **listed** iff the set is non-empty.

A leaf's child resolution is "does it have a matching entry"; a composition's is its own
evaluated result, so the recursion is uniform. At the root, the surviving set is what the
operator's action profile consumes (§ Assertions vs. actions) and what a suppression notice
cites.

The simple case still reads simply: `[block A, block B, allow C]` is "union of A and B,
minus C."

**An `allow` layer is a global pardon within its node.** It clears *every* unprotected
assertion made by earlier sibling layers, not only the ones a keeper had in mind. This is worth
stating loudly, because the naive arrangement is a real trap:

```text
[ block CSAM, block Spam, allow SpamCorrections ]     // WRONG
```

A subject listed by all three ends up unlisted — the spam correction pardoned the CSAM
assertion. `protect: true` on the CSAM layer prevents the harm, but it is a blunt instrument:
it says "nothing in this node may ever correct CSAM," which is stronger and less useful than
"this correction list applies to spam."

**Scoping a correction is done structurally, by nesting it with the list it corrects:**

```text
[ block [ block CSAM, allow CSAMCorrections ],
  block [ block Spam, allow SpamCorrections ] ]      // RIGHT
```

Each `allow` can now only reach the assertions inside its own node, because a child resolves to
listed/unlisted and the parent's set is untouched by the child's internals. No new field is
needed, the rule is enforced by the evaluator rather than by keeper discipline, and inline
`layers` (§ Snapshot format) mean the scoped form costs no extra published lists.

We considered giving `allow` layers an explicit `appliesTo` target instead. It was rejected:
naming the layers a correction applies to requires a stable identifier for a layer *across a
published boundary*, which reintroduces exactly the shared-vocabulary problem that dropping
categories removed — and it would let a composition express scopes its own tree shape
contradicts, giving two sources of truth for one question.

Consequently: **root-level `allow` layers should be rare, and a root-level `allow` sitting
after more than one `block` layer is a lint error in the operator tooling.** It is legal, since
"pardon everything for this subject" is occasionally what an operator means, but it should be
written deliberately rather than reached by accident.

**Precision about what feeds actions.** Actions are the union of the actions mapped to the
layers in the root's *surviving* set. A pardoned assertion contributes nothing. This is the
rule that stops a display correction from silently removing a separately-asserted
`reject-claim`: those assertions live in different root layers, so pardoning one inside its own
node cannot touch the other.

**`protect` is scoped to the composition that declares it and does not propagate upward.**
When a parent evaluates a child node, it receives a listed/unlisted result; the child's internal
protections are already applied within the child and impose nothing on the parent. This is a
deliberate choice with a real trade-off: it means an upstream curator *cannot* guarantee that
downstream subscribers keep honoring their floor. We accept that, because the alternative is
worse — a curator who could set an inescapable floor would defeat the design's central promise
that the subscribing operator remains ultimately in control, and would hand any captured
upstream an irrevocable censorship lever. The operator is the legally responsible party; the
floor is theirs to set, in their own root.

Within a node, `protect` is the belt to nesting's braces. Nesting expresses *what a correction
is about*; `protect` expresses *what may never be corrected at all, by anyone this node
delegates to*. They answer different questions and an operator should generally use both:
nest each correction with its list, and additionally mark the layers whose suppression is
non-negotiable, so that a future edit that flattens the tree or adds a root-level `allow`
cannot quietly pardon them. `protect` is the assertion that survives someone else's mistake in
the composition, which is exactly what you want on the one list you can never afford to have
pardoned.

**Robustness:** the reference graph must be acyclic; evaluators enforce a depth cap (8) and
abort on cycles. Publishers cannot be trusted to be well-formed.

### Pinning and verifiability

**Published compositions MUST pin every reference** by `(chainId, registry, keeper, listId,
version, snapshotHash)`, at every depth — a `ref` nested inside an inline `layers` node is a
reference like any other and is pinned identically. Only the unpublished root — the operator's
own local config — may follow a list's head.

This preserves the point of the checkpoint: because children are pinned, **any third party can
recompute a composed list from its children and verify that the published result is what the
composition actually says.** A curator who bumps their upstream pins produces a new on-chain
version, so "started following a new upstream" is itself permanently logged.

A composition MAY additionally carry a materialized `flattened` result. Clients use it for
speed; auditors recompute from the pinned children to check honesty. Fast path and audit path
must agree, and a disagreement is provable misconduct. `flattened` is a plain set of listed
subject keys, which is sufficient precisely because a parent only ever consumes a child's
listed/unlisted answer (§ Composition semantics) — the child's surviving-assertion detail is
internal to it, so materializing it away loses nothing a consumer is entitled to.

### The operator's subscription

The operator's configuration is an unpublished composition node — the root of the tree. Same
schema, one extra freedom (it may follow head):

```jsonc
{
  "layers": [
    { "id": "standard-illegal",
      "ref": { "chainId": 8453, "registry": "0x…", "keeper": "0x…", "listId": "0x…" },
      "op": "block", "protect": true,
      "follow": { "head": true, "maxResolutionAge": "1h", "maxCheckpointAge": "48h",
                  "maxDiff": 5000 },
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

Following head needs freshness controls, or "follow" silently becomes "trust unconditionally".
`maxDiff` holds at the last accepted version and alerts rather than auto-applying an anomalous
jump, and a one-step rollback to a previous version is always available. Age needs more care:

**Freshness is measured from the checkpoint's block timestamp, never from `publishedAt`.**
`publishedAt` is a keeper-controlled string inside keeper-authored bytes; a keeper who wanted to
look current could simply write a current date. The finalized checkpoint transaction's block
timestamp is the only time in this system nobody in the trust path controls. `publishedAt`
stays in the format as advisory human-facing metadata and must not be an input to any check.

**Two different ages, because they mean different things and only one is a keeper failure:**

- `maxResolutionAge` — time since *we* last successfully resolved this list's head. Exceeding it
  is **our** failure (indexer down, network broken), and it says nothing about the keeper. This
  is the one that governs `onError`.
- `maxCheckpointAge` — time since the keeper's latest checkpoint. Exceeding it means the keeper
  has gone quiet.

The earlier framing that "a list that stops publishing is a failure" was only half right: a list
whose contents genuinely have not changed *should* have an old latest version, and treating that
as an outage would make every well-behaved quiet list look broken. So `maxCheckpointAge` is only
meaningful against a declared cadence: **the manifest declares an expected publication cadence,
and a keeper who declares one MUST publish heartbeat versions when nothing has changed** (a new
version with identical entries and a fresh `previous` link — cheap, one transaction). A keeper
declaring no cadence gets no `maxCheckpointAge` check, and operators should weigh that when
deciding whether to follow their head.

**Stale-but-valid alerts; it does not degrade closed.** These two rules must not fight: a
last-known-good snapshot is cryptographically authentic no matter how old it is, so continuing
to enforce it is always safe — the risk of an old snapshot is *under*-blocking (missing recent
additions), never serving something we were told to suppress. So exceeding either age threshold
**alerts and keeps enforcing the cached snapshot**. Degrading closed (§ Error behavior) is
reserved for having no verified snapshot at all. Refusing to render because the blocklist is a
week old would be an outage caused by the safety mechanism, with no safety benefit.

**The layer set and the action map must correspond exactly.** An action naming a layer `id`
that does not exist is a hard configuration error, and so is a layer no action names
(§ Assertions vs. actions). A typo in the operator's own mandatory subscription would otherwise
fail open on exactly the list that must never fail open.

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

Policy evaluation is **one shared evaluator running one resolved policy**, not a browser
feature. A client-side check can suppress rendering, but it cannot stop the operator's own API
from serving prohibited bytes, cannot refuse a metadata fetch, and cannot gate a claim. The
enforcement surfaces are:

| Surface | Enforces | Runs |
|---|---|---|
| UI render paths | suppress display | Browser (SDK evaluator) |
| SDK fold/aggregation | exclude from counts | Browser — aggregation is client-side by design ([tech/README.md](/specs/tech/README.md) § client-side folding), so this is genuinely the right place |
| Indexer/API serving filter | stop serving bytes for a CID | Server |
| `platform-api-service` | reject a claim | Server |
| Paymaster / sponsorship gate | refuse gas sponsorship ([sponsored-gas.md](/specs/tech/sponsored-gas.md)) | Server |

The same evaluator implementation and the same resolved policy must back all five, or the
layers disagree and the weakest one defines actual behavior.

#### The effective policy digest

"One canonical policy version" is not a thing that exists: a root following several
independently-changing heads has no single version number, and browser and server caches cannot
be simultaneous anyway. What every surface can agree on is a digest of the whole resolution:

```text
effectivePolicyDigest = sha256( JCS(
  operator config (layer order, ops, protect flags, onError)
  ‖ ordered resolved checkpoint identities (chainId, registry, keeper, listId, version, snapshotHash)
  ‖ action profile
) )
```

Rules:

- **Resolution is atomic.** A surface resolves every layer's head, freezes the resulting tuple,
  computes the digest, and evaluates every subject in a request against that frozen set. It
  never re-resolves mid-request; a policy that changes halfway through a page produces
  incoherent results (a supporter count that excludes a subject the page still renders).
- **Every enforcement surface reports its digest** — in server responses, in the SDK's evaluation
  result, in logs. A stale cache is then detectable rather than silent.
- **A client/server digest mismatch is not an error and must not fail a request.** Propagation
  is asynchronous by nature; treat a mismatch as a signal. The client adopts the server's
  advertised digest by re-resolving, and mismatches persisting beyond a grace window (an
  operator setting; hours, not seconds) alert. What a mismatch must never do is cause a surface
  to skip enforcement because it is unsure which policy applies — each surface always enforces
  the most recent policy it has successfully resolved.
- **Money-related actions get stricter freshness than display actions.** `reject-claim` and
  `refuse-gas-sponsorship` are irreversible in a way a suppressed render is not, and they run
  server-side where fresh resolution is cheap and reliable. So layers mapped to those actions
  resolve against a short `maxResolutionAge` and, if resolution fails outright, refuse the claim
  rather than proceed — this is the one place the system deliberately prefers a false refusal
  to a false payout. Display actions tolerate a much longer window, because over-blocking a page
  for hours is a worse user-visible outcome than showing something a minute late.

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

### Keeper identity, rotation, and compromise

Following head delegates ongoing authority to one address, and the registry is deliberately
admin-less and immutable, so it *cannot* help with identity recovery. That is the right
trade-off — a registry that could reassign a list to a new keeper would be a censorship lever
with an owner — but it makes keeper key management an explicit operational requirement rather
than an afterthought.

For any list presented as a standard one:

- **The keeper should be a smart account or multisig, not an EOA.** Rotation then happens inside
  the account, `(keeper, listId)` is unchanged, and subscribers need do nothing. This is the
  whole reason to prefer it, and it is why the design keys lists on an address rather than on a
  public key.
- **The manifest declares the keeper's key-management posture and rotation policy**, so an
  operator deciding whether to follow a head can see what they are trusting.
- **Migration to a new keeper address is manual and by design.** A successor identity is a
  different `(keeper, listId)`, so every subscriber must edit their root. There is no in-protocol
  successor pointer: a "the new keeper is X" record signed by a possibly-compromised key is
  exactly the message an attacker would forge, so honoring it would convert a key compromise
  into a permanent takeover. Migration is announced out of band through the manifest's contact
  channel and completed by each operator deliberately.
- **On suspected compromise the correct move is to stop following, not to wait for a fix.**
  Operators pin to the last version they trust (`follow: { version: N }`) and keep enforcing it —
  which is safe, because a stale list under-blocks rather than over-blocks. `maxDiff` exists
  largely to catch a compromise in progress: the first thing a captured keeper does is a large
  anomalous diff.
- **A compromised keeper cannot rewrite history**, only extend it. Monotonic versions and the
  `previous` chain mean the malicious versions are permanently visible, which is what makes
  after-the-fact review possible.

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
named subjects** (CIDs, addresses, channels) — which genuinely covers court
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

**Stages 0a–0c are the actual legal requirement and do not depend on any of this design.** They
are listed first because that is the order they should be done in, not merely a courtesy: the
obligation is to take material down and to not pay out to sanctioned parties, and every hour of
registry work is an hour not spent on that. The registry earns its keep when there is a real
second keeper or operator to interoperate with — until then it is one operator's config with
extra steps.

| # | Stage | Size |
|---|---|---|
| 0a | **Operationalize the existing denylist**: reach past display into aggregation, indexer/API serving, `platform-api-service` claims, and gas sponsorship, using today's single-URL list | **Medium-large** |
| 0b | **Compliance operations**: reporting address, on-call rotation, appeals process, published policy, and tests that prove a listed subject is suppressed on every surface | Medium — not engineering |
| 0c | Subject coverage past CIDs (addresses, channels) in those same call sites | Medium |
| 1 | Registry identity + canonical snapshot format: `PolicyListRegistry.sol` (with monotonic-version storage), JCS serialization, subject canonicalization, validators, deploy script, `deployments/` entry | Small |
| 2 | Leaf snapshots + local operator composition: indexer handler, keeper publishing tool, operator root config, manifest binding | Medium |
| 3 | Evaluator shared across all five enforcement surfaces, plus the action profile, effective policy digest, cache/freshness/failure behavior, and the observability to tell them apart | **Medium-large — the core** |
| 4 | Repoint the stage 0a/0c call sites at the shared evaluator | Medium |
| 5 | Publishing pinned compositions (third-party override), diff viewer, freshness alerting | Medium |
| 6 | Authenticated-absence lookup — only once real list sizes require it | Deferred |
| 7 | Scheme-qualified fingerprint/provider integration | Separate work |

Stage 0a is the largest engineering cost, and note that it is the **coverage** gap, not the
composability gap — composability is cheap precisely because the on-chain primitive already
exists. [published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2
is emphatic that suppression must cover **aggregation, not just rendering**: supporter counts,
transitive implication support, contributor leaderboards. A half-applied blocklist is worse
than none.

Stage 3 was previously sized "medium", which understated it. Consistent policy resolution across
five surfaces in two runtimes — with caches, partial failures, digest reporting, and the
asymmetric freshness rules for money actions — is where the real difficulty of this design lives,
and it is worth planning as the medium-large piece it is.

Doing stage 0 first is not wasted work under this design: the action taxonomy, subject types, and
enforcement surfaces are the same either way. Stage 4 is a repoint, not a rewrite, which is the
main reason this sequencing is safe.

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
statement precise enough that an operator can decide to follow it. Binding the manifest into the
hashed snapshot (§ The registry contract) makes a scope rewrite a logged event rather than a
silent one, which is the strongest structural answer available — but it makes broadening
*detectable*, not impossible, and a keeper who quietly broadens their scope is still doing the
same damage a category dimension would have let them do openly. This is what the diff feed and
`maxDiff` alerting exist to catch.

**Open: subject propagation.** Does blocking a wallet also block the projects
it created? Does blocking a project contract block its metadata CID, its token CIDs, its
funding portal? Does blocking a channel block content contracts naming it? These are not
derivable from the list — they are operator rules, and they need an explicit, conservative
default before implementation. Getting this wrong in either direction is bad: too much
propagation is a censorship amplifier, too little makes takedowns trivially evadable by
re-pointing.

