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

There is a single published object, the **policy list snapshot**: a **leaf** of literal entries,
with its own on-chain checkpoint. Composition happens in the *subscriber's* configuration, which
is not published (§ The operator's subscription).

"Blocklist" and "exception list" are informal roles, not distinct types: a list is an exception
list when a subscriber attaches it to a block layer as an `except`. The same published object
can serve either role for different subscribers, which is what makes third-party corrections
work without a second object type.

**v1 specifies blocklists and scoped exceptions, not allowlists.** Evaluation starts from
*unlisted*, and an exception only subtracts from the layer it is attached to. Admission-style
allowlisting ("show only the listed subjects") is a **separate evaluation profile**, deferred —
not a claim that nobody wants one. [operator-posture.md](/specs/product/ui-operator-posture.md)
§ "Indexer posture" names real admission cases: curated project sets, recognized factories, a
community indexing its own allowlisted projects.

What makes admission a different profile is not that it needs a universe enumerated — a
default-deny membership test answers "may this encountered subject be admitted?" without one.
It is that **every operational rule in this spec inverts.** A block layer that fails to fetch
under-blocks, which is why `onError: closed` falls back to a cached snapshot; an admission layer
that fails to fetch admits *nothing*, so the same fallback is a site-wide outage. Staleness
inverts too: a stale blocklist over-blocks by retaining removed entries, a stale allowlist
under-admits by missing added ones. Freshness thresholds, `onError`, `maxDiff`, and the money-action
hold rules would all need re-deriving. Bundling that into the same evaluator to save a schema is
how you get an admission list enforced under blocklist failure semantics.

What v1 does commit to is that **the published leaf stays semantically neutral**: a snapshot
asserts that a subject is listed and says nothing about the consequence (§ Assertions vs.
actions). So an admission profile, when it arrives, reuses the same snapshots, identity,
canonicalization, and checkpoints — only the evaluator and its failure rules are new. Until then,
the word "allowlist" should not be used for these objects; an `except` is not one.

Snapshots that are themselves compositions over other lists — letting a curator publish
`[block StandardList, allow MyCorrections]` as one subscribable checkpoint — are a **deferred
future schema version**, for the reasons in
[§ Deferred: published recursive compositions](#deferred-published-recursive-compositions).

### List identity

Versions are keyed by `(keeper, listId)`, so a reference carrying only `listId` is ambiguous —
two keepers may pick the same id. Every reference therefore carries a fully-qualified,
chain-namespaced identity, per the CAIP-10-style rule established in
[multi-chain.md](/specs/tech/multi-chain.md) item 3:

```jsonc
{ "chainId": "8453", "registry": "0x…", "keeper": "0x…", "listId": "0x…" }
```

Policy lists live on one chain today. Including `chainId` and `registry` anyway costs nothing
now and avoids a breaking format change to the interop contract later — the same reasoning
multi-chain.md applies to event and entity identifiers. `chainId` and `version` are canonical
decimal strings wherever they cross the hash boundary, for the range reason in
[§ Snapshot format](#snapshot-format).

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

**The manifest is bound to the version, not published beside it.** The manifest describes what
the list covers and who stands behind it — which, with no category dimension, *is* the interop
contract (see [§ Risks](#risks-and-open-questions)). A separate, unbound manifest event would let
a keeper silently rewrite their own scope and policy after the fact, which is precisely the move
the checkpoint exists to prevent.

**The manifest has two parts, hashed separately, because they carry different risk.** Both are
bound into the snapshot and therefore both are permanently logged; only one is an approval gate:

```jsonc
"manifest": {
  "policyHash": "0x…",       // scope, inclusion criteria, authority, appeals process,
                             // key-management posture, declared publication cadence
  "operationalHash": "0x…",  // contact addresses, archival mirrors, UI links, display name
  "locator": "ipfs://…"      // the document containing both parts
}
```

The checkpoint commits to the manifest transitively: a scope or policy rewrite requires a new
version, and a historical decision can be read under the policy that was actually in force when
it was made. Genesis versions MAY omit the manifest; **any list presented as a standard one MUST
carry it** — a list many operators follow by default without a published policy and appeals route
is a governance failure regardless of what the contract permits.

**Logging a policy change is necessary but not sufficient — `policyHash` is an approval
boundary.** A captured keeper's cheapest attack is to broaden their declared scope and add a
handful of entries under it: the diff is small, so `maxDiff` never fires, and the scope change is
buried in a document nobody re-reads. So a follow-head subscription **pins the `policyHash` it
accepted**, and a version carrying a different one **holds the update pending operator approval**
rather than applying it. The operator may opt into automatic scope changes per layer, but that is
an explicit choice to trust a keeper's future policy as well as their present entries, and the two
should not be bundled by default. Entry volume and scope are different risks and deserve different
gates.

**`operationalHash` changes never hold an update.** Pinning the whole manifest would make
correcting a typo'd contact address or adding an archival mirror halt every subscriber exactly as
loudly as a scope expansion — which trains operators to click through the hold, destroying the
gate that matters. Operational changes are still logged and still surface in the diff feed; they
just do not stop updates. Cadence sits on the policy side because `maxCheckpointAge` is derived
from it, and appeals process does too: silently removing the appeals route is a policy change
wearing operational clothes.

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
lowercase `0x` hex (addresses compared case-insensitively, not by EIP-55 checksum), chain IDs as
canonical decimal **strings** (§ Snapshot format), CIDs as CIDv1 base32, channel IDs in the
existing `platform:kind:id` form.

Validators MUST reject a snapshot unless:

- its `keeper`, `listId`, and `version` match the checkpoint that pointed at it;
- every reference is fully qualified (§ List identity);
- `previous` is present for every version after genesis and names the actual preceding
  checkpoint for that `(keeper, listId)`;
- every entry's subject canonicalizes without error, and no two entries canonicalize equal —
  including across forms (§ Wire format rules);
- it carries no field this schema version does not define (§ Wire format rules).

#### Wire format rules

Unspecified widths and optionality are how two conformant implementations end up disagreeing, so
these are normative rather than left to a reference implementation:

| Field | Rule |
|---|---|
| `registry`, `keeper`, `address` subject `value` | exactly 20 bytes, lowercase `0x` hex, 42 chars |
| `listId`, `salt`, `snapshotHash`, `valueHash`, `policyHash`, `operationalHash` | exactly 32 bytes, lowercase `0x` hex, 66 chars |
| `chainId`, `version` | canonical decimal string: no sign, no leading zeros (`"0"` alone permitted for `version` genesis), `version` ≤ 2⁶⁴−1 |
| `publishedAt`, `resolvedAt`, `checkpointBlockTime` | RFC 3339 UTC with a literal `Z`, second precision, no offset forms |
| `locator` | one of `ipfs://`, `https://`, `ar://`; ≤ 2048 bytes; no fragment |
| `reason` | UTF-8, ≤ 512 bytes, advisory (§ One list, one reason) |

- **Unknown fields are rejected, not ignored.** The same argument as unknown subject types
  (§ Subject canonicalization): a consumer that skips what it does not understand fails open on
  whatever a newer keeper thought was worth adding. Forward compatibility comes from the schema
  version, not from lenient parsing.
- **All hashes in this system are sha256** — `snapshotHash`, `valueHash`, the manifest hashes,
  the bundle's operator-local content hashes, and the bundle `digest`. There is no algorithm
  agility field, and adding one would be a schema bump.
- **`salt` is required iff any entry carries `valueHash`, and forbidden otherwise.** An unused
  salt is a field two implementations would disagree about including in the hash. It MUST be 32
  bytes from a CSPRNG; a low-entropy or keeper-memorable salt buys nothing that
  § Disclosure does not already concede away.
- **A salt change is an approval boundary, not a courtesy note.** A new version whose `salt`
  differs from the accepted one holds pending operator approval, exactly like a `policyHash`
  change. Relying on the manifest to mention it would leave the one event that invalidates every
  hashed-entry diff detectable only by a human reading prose.
- **Duplicates are detected across forms.** A validator hashes each plaintext entry's subject key
  under the snapshot's salt and rejects the snapshot if the result matches any `valueHash` in it.
  Without this a keeper can list a subject twice — once visibly, once hashed — and a consumer
  removing the visible entry from a diff would report a delisting that did not happen.

### Subject canonicalization

Membership is an equality test on subjects, so subject identity is as much of an interop
boundary as the snapshot hash, and it cannot be left mostly open. Each subject canonicalizes to
a **subject key**, a UTF-8 string; two subjects are the same subject exactly when their keys are
byte-equal.

| Type | Key | Notes |
|---|---|---|
| `cid` | `cid:` ‖ CIDv1, base32, raw codec, sha2-256 multihash | Re-encoding between representations of this multihash is normalization; see below. |
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

**Only sha2-256 CIDs are normalizable.** "Normalize any input CID" would be false: converting a
blake3 or dag-pb CID into the sha2-256 raw identity requires the underlying bytes, which a list
publisher generally does not have. So a CID entry whose multihash is not sha2-256, or whose
codec is not `raw`, is **rejected at validation** rather than stored in some other form and
silently failing to match. If content addressed by another hash function ever needs blocking,
that is a new subject type under a new schema version, not a widened `cid`.

**Unknown subject types are a hard rejection, not a skip.** A validator that ignores entries it
does not understand fails open on exactly the entries a newer keeper considered important
enough to add. A consumer encountering an unknown `type` MUST treat the whole snapshot as
invalid and apply the layer's `onError` behavior.

That rule has an honest consequence for the `fingerprint` type that
[§ What this does not solve](#what-this-does-not-solve-real-world-safety-lists) discusses:
**"reserving" it buys nothing mechanically.** If v1 consumers hard-reject unknown types, then
publishing fingerprint entries later breaks them regardless of whether the name was written down
in advance — it is a schema version bump either way. The reservation is only a promise not to
spend the name on something else. Adding a subject type is a breaking change, full stop, and
the set should therefore grow rarely and deliberately; pretending otherwise would let someone
plan a fingerprint rollout that quietly assumes existing subscribers keep working.

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

A v1 snapshot is a leaf. Numeric fields that cross the hash boundary are **canonical decimal
strings, not JSON numbers**: JCS uses the ECMAScript number model, `version` is a Solidity
`uint64`, and neither `uint64` nor the chain-id space is bounded by `Number.MAX_SAFE_INTEGER`.
A format that can encode a value it cannot round-trip is a hash mismatch waiting to happen, and
the cost of quoting them is nil.

```jsonc
{
  "schema": "commonality.policy-list/v1",
  "chainId": "8453", "registry": "0x…", "keeper": "0x…", "listId": "0x…", "version": "42",
  "publishedAt": "2026-07-28T00:00:00Z",   // advisory only — never an input to freshness
  "previous": { "version": "41", "snapshotHash": "0x…" },
  "manifest": { "policyHash": "0x…", "operationalHash": "0x…", "locator": "ipfs://…" },
  "salt": "0x…",                            // per-list, required iff any entry is hashed
  "entries": [
    { "subject": { "type": "cid",     "value": "bafy…" },                  "reason": "court-order-2026-0412" },
    { "subject": { "type": "address", "value": "0x…", "chainId": "8453" } },
    { "subject": { "type": "channel", "value": "twitter:uid:123" },        "reason": "impersonation report" },
    { "subject": { "type": "cid",     "valueHash": "0x…" } }
  ]
}
```

**Subject types:** `cid`, `address` (with `chainId`), `channel` — see
[§ Subject canonicalization](#subject-canonicalization) for why `publishedDataId` and
`statement` are the same subject as `cid` rather than types of their own. Reaching past CIDs to
addresses and channels is the coverage gap the current denylist lacks and every vertical
will need.

**The salt is per-list and stable across versions**, carried in every snapshot that has hashed
entries. A salt that rotated per version would re-hash every entry, so each version would show
its entire hashed portion removed and re-added — destroying `maxDiff` (§ The operator's
subscription), the diff feed, and any historical review, which are the mechanisms this design
relies on to make keeper capture detectable. The trade-off is real and worth stating: a stable
salt lets an observer track a given hashed subject across versions. That is the same property
that makes diffing work, and it costs little given § Disclosure already concedes these digests
are findability reduction rather than confidentiality. Rotating a salt is a discontinuity on the
order of a scope change and should be announced in the manifest, not done quietly.

**Strict parsing before canonicalization.** Implementations MUST reject duplicate object keys,
trailing data, and non-UTF-8 input rather than letting a permissive parser pick a winner.
Two parsers disagreeing about which duplicate key wins produce two different canonical
serializations of "the same" document — a parser-differential attack against the one thing the
snapshot hash is supposed to settle.

### One list, one reason — no category dimension

An earlier draft gave entries a `categories` field and made categories the subscription unit,
so an operator could take `csam + terrorism` from a list without its `spam` opinions. That is a
real need, but **it is already served by list granularity plus composition, and the second
mechanism was not worth its weight.**

`listId` is keeper-chosen and keepers may run many lists, so a keeper who classifies their
entries publishes one list per class. **In v1 an operator subscribes to whichever leaves they
want, as separate layers** — taking everything means naming each leaf, which is a few more lines
of local config and nothing more. (Once published compositions land, a keeper can offer the union
as one subscribable checkpoint; that is a convenience, not what makes this work.) Same
expressiveness as categories, no new dimension, and no case where categories help but
list-splitting does not — a keeper unwilling to classify their entries would not have tagged them
either.

What removing it bought:

- **Provenance becomes structural rather than a per-entry vocabulary.** A category dimension
  made evaluation produce a category set per subject, because a subject asserted as both `csam`
  and `spam`, with a later layer pardoning `spam`, must stay blocked. Splitting the lists does
  not by itself dissolve that problem — an earlier draft claimed it did, and that was wrong; a
  correction still has to be *scoped* to the assertion it corrects. What splitting buys is that
  the scope becomes structural — a correction attaches to one layer — which the evaluator
  enforces, rather than a shared word that keepers would have had to mean the same thing by. See
  [§ Evaluation semantics](#evaluation-semantics) for the actual rule.
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
- **An unmapped `block` layer is a startup error, not a no-op.** A layer present in the root but
  named by no action is either a typo or a subscription the operator forgot to wire up; failing
  open on it is the failure mode this whole section exists to prevent. The correspondence runs
  both ways: every `block` layer is named, and every name resolves to a `block` layer. An
  `except` is not a layer and is neither named nor nameable — it asserts nothing, so there is
  nothing for an action to key on.
- **Financially consequential actions are never implied.** `reject-claim` and
  `refuse-gas-sponsorship` must be written explicitly against a named layer. There is no
  configuration under which subscribing to a list gets a keeper power over money by default.
  Surfaces also need to know which actions are financially consequential in order to apply the
  stricter staleness rule (§ The operator's subscription), which is a second reason the mapping
  cannot be implicit.
- Suppressing display without excluding from aggregation **is** a permitted combination — it is
  what "hidden but still counted" means, and there are legitimate uses (a subject under appeal).
  But it is a footgun with respect to
  [published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2, so
  tooling should warn, and any mandatory-compliance layer should carry both.
- Validation runs at startup and **fails the process**, not the request. A vertical that boots
  with an invalid policy profile and serves traffic is worse than one that refuses to boot.

### Evaluation semantics

**v1 has no `allow` op, no `protect`, and no recursion.** A root is a flat set of `block` layers,
each of which may carry an `except` reference:

```jsonc
{ "id": "standard-csam", "ref": { "…": "…" }, "op": "block",
  "except": { "ref": { "…": "…" } } }
```

Per subject, per layer: the layer **asserts** the subject iff its `ref` lists the subject and
its `except` does not. The root's result is the set of layers that assert the subject; the
subject is listed iff that set is non-empty. That is the whole language.

The set — not a boolean — is what the action profile consumes (§ Assertions vs. actions) and
what a suppression notice cites. An exception can only ever cancel the layer it is attached to,
so the cross-provenance pardon that broke the previous draft is unrepresentable rather than
merely discouraged.

**No implicit propagation.** An entry affects **only the exact canonical subject named**. Blocking
a wallet does not block the projects it created; blocking a project contract does not block its
metadata CID, its token CIDs, or its funding portal; blocking a channel does not block content
contracts naming it. Any such spread requires the operator to configure an explicitly named
propagation rule, which is operator-local, out of scope for v1, and never something a list can
turn on for them.

This was an open question in an earlier draft, and defaulting to *no* propagation is the safer
side of a genuinely two-sided risk. Both directions have real costs: no propagation makes some
takedowns evadable by re-pointing at a fresh address, while implicit propagation turns one entry
into a suppression radius nobody reviewed and nobody can enumerate from the list. The asymmetry is
that under-blocking is visible to the operator who is legally responsible for it and is fixed by
adding entries, whereas over-blocking is invisible to everyone except the person silently erased.
Keepers who want broader suppression publish the related subjects explicitly, where they are
diffable, appealable, and attributable.

**Layer order carries no semantics.** Layers are evaluated independently and the result is a set,
so no layer can shadow, override, or short-circuit another — an earlier draft called the root
"ordered", which implied a precedence rule that does not exist and would have invited someone to
write a policy that depended on one. Configuration order is preserved only so that the asserting
set is reported in a stable order in notices and logs.

#### Why `except` per layer rather than a general `allow` op

An earlier draft made corrections a sibling layer: `[block CSAM, block Spam, allow
SpamCorrections]`. That is a trap — the `allow` clears every prior assertion, so a subject in
all three lists ends up unlisted and the spam correction has pardoned the CSAM assertion. The
draft's fix was to nest each correction with the list it corrects
(`block [block Spam, allow SpamCorrections]`), which is correct but reaches for recursion to
express something that is really a property of one layer.

`except` says the same thing directly. It is the degenerate case of that nesting, it cannot be
written wrong, and it needs neither an evaluator depth cap nor a cycle check to be safe.

It also eliminates `protect`. `protect` existed only to stop a sibling `allow` from pardoning a
layer that must never be pardoned. With no sibling `allow`, nothing can reach across layers, so
there is nothing to protect against — the guarantee is structural instead of a flag an operator
must remember to set on the one list where forgetting it is catastrophic.

We also considered giving corrections an explicit `appliesTo` target naming other layers. That
was rejected: naming layers across a published boundary needs a stable cross-publisher layer
identifier, reintroducing the shared-vocabulary problem that dropping categories removed, and
it permits documents whose declared scope contradicts their own structure.

#### Deferred: published recursive compositions

The design this spec previously froze — snapshots that are themselves ordered `block`/`allow`
compositions over other lists, with `protect` and inline nodes — is **deferred to a future
schema version**, not discarded. It is the right shape for the case it serves: a third-party
curator publishing `[block StandardList, allow MyCorrections]` as one subscribable object, so
many operators consume one checkpoint instead of each maintaining corrections.

Deferring it is a deliberate reversal of the previous draft's "composition stays in the schema
from day one — retrofitting it would break the interop contract." That argument does not hold
up. The schema is versioned, and consumers hard-reject documents they do not fully understand
(§ Subject canonicalization), so a v1 consumer meeting a v2 composition fails safe and visibly
rather than silently misreading it. The cost of adding composition later is a version bump; the
cost of freezing it now is committing to a recursive policy language before anyone has
published a single list in it.

And the evidence says it is not ready to freeze. This section's semantics were wrong through two
revisions — the pardon bug was found by review, not by use — which is what a policy language
looks like when it is being designed in the abstract. When a real third-party curator needs to
publish a composition, they will bring the constraint that tells us whether `allow`/`protect`
recursion is actually the right primitive. Until then, the operator's local root already
expresses everything a single operator needs, and it is not published, so it freezes nothing.

What v1 keeps from that work, because these are the parts that carry regardless of how
composition eventually lands: fully qualified list identity, canonical serialization and subject
keys, monotonic checkpointed versions, pinned references, the assertion/action split, and the
rule that corrections are scoped to what they correct.

#### Robustness

`ref` and `except` name leaf snapshots in v1, so the reference graph is one level deep by
construction — no cycle detection, no depth cap. When compositions arrive, evaluators will need
both (the previous draft's depth cap of 8 remains the right number), and a published composition
whose child is unavailable is **invalid**, not partially applied: only the operator's own root
gets to decide fail-open/fail-stale behavior (§ Error behavior), because only the operator is
the legally responsible party.

### Pinning and verifiability

v1 publishes only leaves, so there is nothing published to pin: a leaf is self-contained and its
checkpoint commits to it directly. Pinning is a rule for the deferred composition schema, and it
is recorded here because it is the constraint that makes compositions worth publishing at all:

**A published composition MUST pin every reference** by `(chainId, registry, keeper, listId,
version, snapshotHash)`, at every depth. Only an unpublished root — the operator's own local
config — may follow a head. Because children are pinned, **any third party can recompute a
composed list from its children and verify the published result is what the composition actually
says**, and a curator who bumps their upstream pins produces a new on-chain version, so
"started following a new upstream" is itself permanently logged.

Two constraints on any future materialized `flattened` output, both of which fall out of hashed
entries and are easy to get wrong:

- **A composition whose children contain `valueHash` entries MUST NOT publish `flattened`.**
  Salts are per-list, so hashed entries from two children are not even in the same namespace and
  cannot be unioned; worse, a compositor that *could* flatten them would have to know their
  preimages, and publishing those as plain subject keys would disclose exactly what the child
  chose to hash. A compositor generally does not hold those preimages anyway.
- Where `flattened` is permitted, it is a plain set of listed subject keys. That is sufficient
  because a parent only ever consumes a child's listed/unlisted answer, so materializing away the
  child's internal detail loses nothing a consumer is entitled to. Auditors recompute from the
  pinned children; fast path and audit path must agree, and a disagreement is provable
  misconduct.

### The operator's subscription

The operator's configuration is the root, and it is **not published** — it is local config, so
it freezes no interop contract and is the one place head-following is allowed:

```jsonc
{
  "layers": [
    { "id": "standard-illegal",
      "ref": { "chainId": "8453", "registry": "0x…", "keeper": "0x…", "listId": "0x…" },
      "op": "block",
      "except": { "ref": { "source": "https://myvertical.example/csam-appeals.json" } },
      "follow": { "head": true, "maxResolutionAge": "1h", "maxCheckpointAge": "48h",
                  // accepted values — a version changing either holds for approval:
                  "maxDiff": 5000, "policyHash": "0x…", "salt": "0x…" },
      "onError": "closed" },
    { "id": "sanctions",
      "ref": { "…": "…" }, "op": "block",
      "follow": { "version": "42" },
      "maxPinAge": "72h",          // money layer: hold once the pinned data is this old
      "onError": "hold" }
  ],
  "actions": {
    "standard-illegal": ["suppress","exclude-aggregation","refuse-serve"],
    "sanctions":        { "address": ["reject-claim","refuse-gas-sponsorship"] }
  },
  "honoredRetractors": ["0x…"]
}
```

Layers carry a local `id` purely so the action profile can name them; it is operator-local and
never published.

Note what the example does *not* have: a free-floating correction layer. An earlier draft's
example carried `{ "id": "my-corrections", "op": "allow" }` as a third root layer, which violated
two of this spec's own rules at once — it was a root-level global pardon, and it was a layer the
action profile did not name. Corrections attach to the layer they correct, and that is now the
only way to write one.

**Only assertion layers take actions.** Every `block` layer MUST be named in `actions`; an
`except` is not a layer, takes no actions, and cannot be named. The earlier formulation ("every
layer must be action-mapped") was incoherent once corrections became attachments rather than
layers — an exception asserts nothing, so there is nothing for an action to key on.


**Follow head vs. pin.** Following head is the low-effort default and the reason this scales to
many operators. Pinning means a captured keeper cannot silently expand your blocklist — you
review the diff before bumping.

Following head needs freshness controls, or "follow" silently becomes "trust unconditionally".
`maxDiff` holds at the last accepted version and alerts rather than auto-applying an anomalous
jump, and a one-step rollback to a previous version is always available. Age needs more care:

**Freshness is measured from the checkpoint's block timestamp, never from `publishedAt`.**
`publishedAt` is a keeper-controlled string inside keeper-authored bytes; a keeper who wanted to
look current could simply write a current date. The finalized checkpoint transaction's block
timestamp is **chain-governed rather than keeper-authored** — which is the accurate claim, and
enough. (It is not "controlled by nobody in the trust path": this is an L2, and a sequencer has
some latitude over timestamps. That latitude is bounded and belongs to a party with no stake in
a particular keeper looking fresh, so it does not undermine the check, but the stronger claim
would have been wrong.) `publishedAt` stays in the format as advisory human-facing metadata and
must not be an input to any check.

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

**Staleness is not one-directional, and the response depends on the action.** An earlier draft
claimed a stale snapshot can only *under*-block, so caching one forever was always safe. That is
wrong. A stale snapshot also **over-blocks**: it retains entries the keeper has since removed —
corrected false positives, granted appeals, delisted sanctions targets. Removal is exactly what
this design added over one-way `retractData`, so treating a stale list as harmless discards the
benefit and quietly re-creates the "mistakes are permanent" gap.

The two directions have very different costs, so they get different handling:

- **Display, aggregation, and serving.** A last-known-good snapshot keeps being enforced past
  either age threshold, and staleness **alerts** rather than degrading closed. Both error
  directions here are recoverable and reversible, and refusing to render because the blocklist
  is a week old would be an outage caused by the safety mechanism, with no safety benefit.
- **`reject-claim` and `refuse-gas-sponsorship`.** A stale over-block here withholds someone's
  money on the authority of a judgment that has already been reversed, and the person affected
  has no way to tell that is what happened. So a layer mapped to a money action **must not
  auto-reject on a stale snapshot past its threshold**. It enters a **hold-for-review** state:
  the claim is neither paid nor denied, it is queued for a human, and the operator is alerted.
  This is the third state the design previously lacked — auto-reject and auto-pay are both wrong
  answers when the policy input is known to be out of date.

**Staleness holds every claim the layer governs, not just the ones it lists.** This needs saying
plainly because the intuitive reading — hold the claims that match the stale snapshot — is wrong
in the more dangerous direction. A stale sanctions layer errs both ways at once: it retains a
claimant who has since been delisted, *and* it omits one who has since been added. Holding only
matches handles the first and pays out on the second. So once a money layer is past its freshness
threshold, **every claim within that layer's scope is held**, whether or not the subject appears
in the cached snapshot.

The one exception is a claim another *fresh* layer decides conclusively, and only one direction is
conclusive: if a current layer asserts the subject, reject. A fresh layer's *silence* decides
nothing, because the stale layer is exactly the one that might have listed it. Auto-pay requires
every layer governing the claim to be fresh.

This is also why money layers are not exempt from freshness by pinning them. **A pinned layer has
freshness semantics too, measured differently.** `maxResolutionAge` is about our ability to reach
the chain and is meaningless against `follow: { version: 42 }` — the pin resolves instantly,
forever. What matters for a pin is how old the *decision data* is, so a money layer declares
`maxPinAge`, measured from the pinned version's checkpoint block time, and exceeding it holds. An
operator who pinned deliberately (say, after suspecting keeper compromise) has still frozen a
sanctions list that the world has moved past; deliberate staleness withholds money exactly as
wrongly as accidental staleness. The bundle carries `checkpointBlockTime` for every layer
precisely so a surface can apply this without re-resolving anything.

Degrading closed (§ Error behavior) remains reserved for having no verified snapshot at all.
Hold-for-review is why § Assertions vs. actions requires money actions to be explicitly mapped:
a surface has to know an action is financially consequential in order to treat its staleness
differently, and it can only know that because the operator said so.

**The layer set and the action map must correspond exactly.** An action naming a layer `id`
that does not exist is a hard configuration error, and so is a layer no action names
(§ Assertions vs. actions). A typo in the operator's own mandatory subscription would otherwise
fail open on exactly the list that must never fail open.

**Error behavior.** The current implementation fails open — a fetch error logs a warning and
renders everything. That is the wrong default for a mandatory list. Each layer declares
`onError`:

- `closed` (recommended for mandatory block layers) — fall back to the last-known-good cached
  snapshot, subject to the staleness rules above. Only if no cached copy exists at all does the
  surface degrade to refusing to render unverified content.
- `hold` (required for layers mapped to money actions) — as `closed`, but once the cached
  snapshot is past its freshness threshold the affected claims go to hold-for-review instead of
  being auto-rejected.
- `open` — proceed without this layer.

An **`except` that fails to fetch is always ignored**, and this asymmetry is deliberate: a
missing exception over-blocks, which is recoverable, while a missing block layer under-blocks.
The one caveat is that an exception failing silently is how a granted appeal stops being
honored, so a persistently unfetchable `except` alerts even though it does not change
enforcement.

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

#### The resolved policy bundle

"One canonical policy version" is not a thing that exists: a root following several
independently-changing heads has no single version number, and browser and server caches cannot
be simultaneous anyway. The fix is not a digest that each surface computes for itself — it is a
single immutable artifact that every surface consumes.

**The operator resolves once and publishes a resolved policy bundle** to its own surfaces:

```jsonc
{
  "schema": "commonality.policy-bundle/v1",
  "layers": [ { "id": "standard-illegal",
                "ref": { "chainId": "8453", "registry": "0x…", "keeper": "0x…",
                         "listId": "0x…", "version": "44", "snapshotHash": "0x…" },
                "except": { "contentHash": "0x…", "source": "https://…" },
                "onError": "closed",
                "freshness": { "maxResolutionAge": "1h", "maxCheckpointAge": "48h" },
                "resolvedAt": "…", "checkpointBlockTime": "…" } ],
  "actions": { "…": "…" },
  "honoredRetractors": ["0x…"],
  "digest": "0x…"     // sha256(JCS(this object with `digest` removed))
}
```

**The digest is computed over the bundle with the `digest` member absent** — stated because the
example's earlier "everything above" was circular, and two implementations guessing at a
fixed-point convention would never agree.

**The bundle is the complete evaluation input; a surface consuming it needs nothing else to
decide.** It MUST carry: the schema version; every layer with its pinned `snapshotHash` and
resolved `version`; every operator-local input's content hash; each layer's `onError`, freshness
thresholds, and `maxPinAge`; the full action map; `honoredRetractors`; and either the snapshot
bytes inline or immutable, content-addressed locators for them. A locator that can change what it
returns (a bare mutable HTTPS origin) is not sufficient on its own — the accompanying hash is what
makes retrieval atomic, and a surface that cannot verify a fetched blob against it must treat the
layer as unresolvable rather than trust the bytes. Unknown fields in a bundle are rejected, as
everywhere else in this design.

Anything omitted from the bundle is a decision each surface would make for itself, which is the
divergence the bundle exists to eliminate. `onError` and freshness in particular are easy to leave
out on the theory that they are "config, not policy" — but two surfaces with different `onError`
behavior enforce different policies at exactly the moment enforcement matters most.

- **Every input carries a content hash, including operator-local ones.** A layer resolved from
  `{ "source": "https://myvertical.example/list.json" }` contributes the sha256 of the bytes
  actually fetched. Without this the digest is a lie: two surfaces could fetch different content
  from the same mutable URL, agree on the digest, and enforce different policies — the exact
  invisible divergence the digest exists to rule out.
- **Surfaces consume the bundle; they do not each resolve heads independently.** This is what
  makes agreement checkable rather than hoped for, and it puts head-following, freshness
  thresholds, and manifest-approval holds in one place instead of duplicating that logic into a
  browser bundle.
- **Resolution is atomic.** A bundle is produced from a frozen tuple and evaluated as a unit; a
  surface never re-resolves mid-request. A policy that changes halfway through a page produces
  incoherent results — a supporter count that excludes a subject the same page still renders.
- **Every surface reports the bundle digest it enforced** — in server responses, in the SDK's
  evaluation result, in logs.
- **A client/server digest mismatch is not an error and must not fail a request.** Propagation is
  asynchronous by nature. The client re-fetches the bundle (it cannot "adopt" a digest — a digest
  is not reversible, and the head may have moved on since); mismatches persisting past a grace
  window alert. What a mismatch must never do is cause a surface to skip enforcement because it
  is unsure which policy applies: each surface always enforces the most recent bundle it has.
- **Money actions get stricter freshness than display actions.** `reject-claim` and
  `refuse-gas-sponsorship` run server-side, where fetching a current bundle is cheap and
  reliable, so they demand a short `maxResolutionAge`. Where they differ from display actions is
  the failure branch: a stale or unresolvable policy sends the claim to **hold-for-review**
  (§ The operator's subscription) rather than auto-rejecting. Display actions tolerate a much
  longer window, because over-blocking a page for hours is a worse user-visible outcome than
  showing something a minute late.

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
hash-list problem. Entries therefore support `valueHash` (the domain-separated hash of
§ Subject canonicalization, over the snapshot's salt) as an alternative to `value`.

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
  Operators pin to the last version they trust (`follow: { version: N }`) and keep enforcing it.
  That is the least-bad option rather than a safe one: a frozen list both misses new entries and
  keeps enforcing removals the keeper would have made, so the money-action rules above
  (hold-for-review rather than auto-reject) apply from the moment a pin is known to be stale.
  `maxDiff` and the `policyHash` pin exist largely to catch a compromise in progress: a captured
  keeper's move is either a large anomalous diff or a quiet scope broadening.
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
snapshot. The resolved policy bundle therefore carries both the per-subject listing result and
an honored-retractor set.

**Honored retractors stay entirely explicit in the operator's root; a subscription never
contributes to them.** An earlier draft said "a subscription may contribute to either", which
was both unimplementable — snapshots have no `honoredRetractors` field and no semantics for
composing one — and wrong in substance. Honoring a retractor is a standing grant of *per-item,
on-chain* takedown authority over anything that address ever touches, which is a strictly larger
power than the enumerated entries an operator reviewed when they subscribed. Letting a list
smuggle that grant in as a side effect of subscribing would hand a keeper a second censorship
channel with none of the diffability, `maxDiff` alerting, or manifest-scope review that the
snapshot path is built around. A keeper may of course *ask* subscribers to honor them; that is
an edit to the operator's root, made deliberately.

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
real and worth having. The subject taxonomy reserves the name `fingerprint` for a
scheme-qualified subject type (`{ "type": "fingerprint", "scheme": "…", "value": "…" }`) so that
the shape is agreed and nothing else claims the name. To be exact about what that reservation is
worth: **it does not avert a format break.** Because v1 consumers hard-reject unknown subject
types (§ Subject canonicalization), shipping fingerprint entries is a schema bump that existing
subscribers must adopt — the reservation saves the argument about naming and shape, not the
version bump. That integration is separate work with its own legal and operational
prerequisites.

Most importantly: **this machinery does not solve the operational problem.** It is
distribution and composition plumbing. Obtaining a legitimate keeper, a usable compliance
dataset, and the provider relationships that come with it remains the actual hard part, and it
is not an engineering task.

## What it would take

**Stages 0a–0c are the actual legal requirement and do not depend on any of this design.** They
are listed first because that is the order they should be done in, not merely a courtesy: the
obligation is to take material down and to not pay out to sanctioned parties, and every hour of
registry work is an hour not spent on that. The registry earns its keep when there is a real
second keeper or operator to interoperate with — until then it is one operator's config with
extra steps.

Stage 0 is split by *which list can actually gate which surface*, because one CID list cannot
cover all of them. Today's `VITE_DISPLAY_DENYLIST_URL` holds CIDs, and a CID cannot gate a
channel's claim or a wallet's gas sponsorship — those need the address and channel policies that
`platform-api-service`'s `BLOCKED_CHANNEL_IDS` gestures at. Collapsing them into one stage would
have implied a coverage that does not exist.

| # | Stage | Size |
|---|---|---|
| 0a | **Today's CID denylist across every CID-shaped surface**: rendering, aggregation, metadata fetching, indexer/API serving | **Medium-large** |
| 0b | **Compliance operations**: reporting address, on-call rotation, appeals process, published policy, and tests that prove a listed subject is suppressed on every surface | Medium — not engineering |
| 0c | **Explicit address/channel policies for claims and gas sponsorship** — a separate list with separate authority, not an extension of the CID one | Medium |
| 1 | Registry identity + canonical leaf format: `PolicyListRegistry.sol` (monotonic-version storage), JCS serialization, subject canonicalization, strict parsing, wire-format validators, cross-runtime test vectors, deploy script, `deployments/` entry | Medium |
| 2 | Leaf snapshots end to end: indexer handler, keeper publishing tool, manifest binding, operator root config with `except` | Medium |
| 3 | Shared evaluator across all five enforcement surfaces, the action profile, the resolved policy bundle, cache/freshness/hold-for-review behavior, and the observability to tell them apart | **Medium-large — the core** |
| 4 | Repoint the stage 0a/0c call sites at the shared evaluator | Medium |
| 5 | Diff viewer, freshness and manifest-change alerting | Medium |
| 6 | Published recursive compositions — only when a real third-party curator needs to publish one | Deferred (schema bump) |
| 7 | Authenticated-absence lookup — only once real list sizes require it | Deferred |
| 8 | Fingerprint/provider integration | Separate work (schema bump) |

Stage 0a is the largest engineering cost, and note that it is the **coverage** gap, not the
composability gap. [published-data/README.md](../published-data/README.md) § "Honored
retractors" rule 2 is emphatic that suppression must cover **aggregation, not just rendering**:
supporter counts, transitive implication support, contributor leaderboards. A half-applied
blocklist is worse than none.

Stage 3 is where the real difficulty lives: consistent policy resolution across five surfaces in
two runtimes, with caches, partial failures, bundle propagation, and the asymmetric freshness
rules for money actions. An earlier draft sized it "medium", which understated it.

Stage 1 was previously sized "small" on the strength of the contract, which is genuinely tiny —
one mapping, one guarded write. The cost is everything around it: canonicalization and strict
parsing that two runtimes agree on byte for byte, the wire-format rules above, adversarial
validation, and the shared test-vector corpus that keeps a TypeScript validator and any future
second implementation from drifting. That is the part that has to be right before anyone publishes
a list, because a hash disagreement discovered later is not a bug fix, it is a migration.

Doing stage 0 first is not wasted work: the action taxonomy, subject types, and enforcement
surfaces are the same either way, so stage 4 is a repoint rather than a rewrite. That is the main
reason this sequencing is safe.

## Risks and open questions

**Censorship cartel.** If every vertical follows head on the same two lists, those keepers
become a de facto central censor with soft power over the whole ecosystem — the exact failure
mode this design exists to avoid. Mitigations, in order of importance: the on-chain checkpoint
history makes capture *detectable*; narrow per-list subscription limits blast radius; attaching a
third-party correction list as an `except` gives operators a cheap escape that does not require
running their own moderation. But detection only works if someone watches — so the public diff feed is a
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

**Subject propagation — resolved as no implicit propagation** (§ Evaluation semantics). The
residual risk is the under-blocking side: a subject re-pointing at a fresh address stays visible
until a keeper lists the new one, so takedown latency becomes a keeper operations problem rather
than something the evaluator solves. That is the intended trade; the alternative is an
unenumerable suppression radius. If operators end up writing near-identical propagation rules by
hand, that is the signal to specify one — driven by observed rules, not by guessing at them now.

