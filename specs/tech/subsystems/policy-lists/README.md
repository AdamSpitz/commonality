# Policy lists: subscribable policy blocklists

Status: **proposed, not implemented** (Jul 2026). Design for generalizing the existing
per-UI display denylist into interoperable, subscribable, verifiable lists.

The title used to say "composable blocklists". Composition now happens only in the operator's
own unpublished root, and published compositions are deferred
([§ Deferred](#deferred-published-recursive-compositions)) — so "composable" promised a
published feature this document does not specify. Design history and rejected alternatives live
in [design-history.md](./design-history.md); this document is the normative spec.

What this is, stated precisely so nobody plans around a stronger claim:

> **Transparent distribution and composition infrastructure for exact-identifier policy
> decisions.** It lets a vertical operator reuse someone else's takedown work instead of
> originating all of it, while remaining ultimately in control of what their site suppresses.
> It does not give an operator compliance for free.

Note the sequencing consequence up front: **this design must not gate the immediate legal
requirement, and the registry is the last part to build, not the first.** The evaluator, the
resolved bundle, and complete enforcement coverage across display, aggregation, serving, claims,
and gas sponsorship are worth building immediately and would be worth building even if no second
keeper ever existed. Checkpointed third-party subscription earns its keep only when there is a
real second keeper or operator to interoperate with. See
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

Deferred is not the same as unplanned: the admission profile has a roadmap stage of its own
(§ What it would take), because the admission cases operator-posture.md names are real ones and
"deferred" with no stage is how a real requirement becomes a surprise. Whether it lands before the
registry is a product question, not a technical one (§ Risks).

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

**Versions start at 1.** `latestVersion` is zero for an unpublished `(keeper, listId)`, so
`version > latestVersion` already rejects `0` — a genesis version of `0` is unpublishable, and an
earlier draft's wire rule permitting it contradicted the contract. Starting at 1 keeps "has this
list ever published?" as a single zero check rather than a separate initialized bit, which is one
more storage word on every list to support a version number nobody needs.

**The manifest is bound to the version, not published beside it.** The manifest describes what
the list covers and who stands behind it — which, with no category dimension, *is* the interop
contract (see [§ Risks](#risks-and-open-questions)). A separate, unbound manifest event would let
a keeper silently rewrite their own scope and policy after the fact, which is precisely the move
the checkpoint exists to prevent.

**The manifest has two parts, hashed separately, because they carry different risk.** Both are
bound into the snapshot and therefore both are permanently logged; only one is an approval gate:

```jsonc
"manifest": {
  "policyHash": "0x…",       // sha256(JCS(manifestDocument.policy))
  "operationalHash": "0x…",  // sha256(JCS(manifestDocument.operational))
  "locator": "ipfs://…"      // the document containing both sub-objects
}
```

The manifest document itself is a separate published object with a fixed shape, because two hashes
over undefined sub-objects are two hashes nobody can recompute:

```jsonc
{
  "schema": "commonality.policy-manifest/v1",
  "policy": {
    "scope": "…",                  // what this list covers — the interop contract
    "inclusionCriteria": "…",      // what gets an entry added
    "authority": "…",              // who decides, under what mandate
    "appeals": "…",                // how a listed subject contests
    "keyPosture": "…",             // § Keeper identity: account type, rotation policy
    "cadence": "P1D"               // ISO 8601 duration, or omitted for "no declared cadence"
  },
  "operational": {
    "name": "…", "contact": ["…"], "mirrors": ["ipfs://…"], "links": ["https://…"]
  }
}
```

Each hash is `sha256(JCS(sub-object))` — over the sub-object alone, not over the whole document,
so that changing an operational field provably cannot alter `policyHash`. If that property held
only by convention, an operator reviewing a held update could not tell which part actually moved.
Both sub-objects are required when a manifest is present; unknown fields are rejected as
everywhere else.

The checkpoint commits to the manifest transitively: a scope or policy rewrite requires a new
version, and a historical decision can be read under the policy that was actually in force when
it was made.

**A manifest is mandatory for any followed head.** Genesis versions MAY omit it, and manifestless
snapshots stay legal for pinned or operator-private lists, where the operator reviews each version
by hand and there is no delegated future authority to scope. But `follow: { head: true }` against a
list with no manifest is a **configuration error**, not a warning: head-following delegates ongoing
authority, `policyHash` is the gate on that delegation (below), and there is nothing to pin if no
policy document exists. This replaces the weaker "any list presented as a standard one MUST carry
it" — "presented as standard" is a marketing property no validator can check, whereas "this root
follows that head" is in the operator's own config. The governance point survives as a consequence
rather than a separate rule: a list many operators follow by default is by definition a list with
followed heads, so it must publish a policy and an appeals route.

A followed list that publishes a version **omitting** a manifest it previously carried is treated
as a `policyHash` change: the update holds for approval. Silently dropping the appeals route is
exactly the move the gate exists to catch, and "the field is now absent" must not be the one way
past it.

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

The checkpoint is the accountability device, and its guarantee is narrower than "no
equivocation": **one checkpoint admits exactly one snapshot.** A keeper cannot serve different
contents under a committed hash, cannot deny having published what they published, and cannot
silently un-block or revert, because reverting takes a new version and the old one stays logged.

Three things it does not prevent, and calling them equivocation-resistance would overstate it:

- **Selective unavailability.** A keeper can serve a version's bytes to one audience and stall
  another. The hash still pins what those bytes must be, and the gap is detectable if anyone
  compares notes, but a checkpoint cannot make an object retrievable
  ([§ Availability](#availability-and-the-limits-of-the-accountability-claim)).
- **Timing games.** Nothing stops a keeper publishing version 44 for an hour and superseding it
  with 45. Both are permanently visible, so this is a thing auditors can *see* rather than a thing
  the mechanism prevents.
- **Audiences enforcing different versions at once.** Propagation is asynchronous and caches
  differ, so two operators, or two surfaces of one operator, will routinely be a version apart.
  That is normal operation, not misconduct, which is why the design leans on the resolved bundle
  and its digest for intra-operator agreement rather than on the checkpoint.

What the checkpoint gives auditors is that all of the above happen *on the record*.

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
| `chainId`, `version` | canonical decimal string: no sign, no leading zeros, `version` ≥ 1 and ≤ 2⁶⁴−1 (§ The registry contract) |
| all timestamps (`publishedAt`, `checkpointBlockTime`, and the envelope's `generatedAt`, `lastSuccessfulCycle`, `lastResolvedAt`) | RFC 3339 UTC with a literal `Z`, second precision, no offset forms |
| durations (`maxResolutionAge`, `maxCheckpointAge`, `maxPinAge`, `cadence`) | ISO 8601 duration, date and time components only — `PT1H`, `PT48H`, `P1D`. No `Y` or `M` components, since neither has a fixed length and a freshness threshold that varies by month is a bug |
| `locator` | one of `ipfs://`, `https://`, `ar://`; ≤ 2048 bytes; no fragment |
| `reason` | UTF-8, ≤ 512 bytes, advisory (§ One list, one reason) |
| layer `id` | `[a-z0-9][a-z0-9-]{0,63}`, unique within a root; operator-local, never published |

- **Unknown fields are rejected, not ignored.** The same argument as unknown subject types
  (§ Subject canonicalization): a consumer that skips what it does not understand fails open on
  whatever a newer keeper thought was worth adding. Forward compatibility comes from the schema
  version, not from lenient parsing.
- **All hashes in this system are sha256** — `snapshotHash`, `valueHash`, the manifest hashes,
  the bundle's operator-local content hashes, and the bundle `digest`. There is no algorithm
  agility field, and adding one would be a schema bump.
- **`null` is never a legal value; absence is the only way to express absence.** JCS serializes
  `null` and an omitted key differently, so permitting both gives every optional field two
  encodings with one meaning and two different hashes. Optional means "the key may be absent".
  Where a threshold's absence means "no check" — `maxCheckpointAge` against an undeclared cadence,
  `cadence` itself — that is stated at the field, never signalled by `null`.
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

**Entries carry no category, tag, or class, and there is no category dimension anywhere in the
design.** Granularity is the list: `listId` is keeper-chosen and keepers may run many lists, so a
keeper who classifies their entries publishes one list per class. **An operator subscribes to
whichever leaves they want, as separate layers** — taking everything means naming each leaf, which
is a few more lines of local config and nothing more. (Once published compositions land, a keeper
can offer the union as one subscribable checkpoint; that is a convenience, not what makes this
work.)

This buys the same expressiveness as categories with no shared vocabulary that keepers would have
to mean the same thing by, and it is what lets provenance be structural — a correction attaches to
one layer, and the evaluator enforces that scope (§ Evaluation semantics). A category field was
specified and dropped; see [design-history.md](./design-history.md) § "Rejected: a category
dimension" for what it cost and why splitting lists is not merely equivalent but safer.

Entries may still carry a free-text `reason` (a policy code, a ticket, a court-order
reference). It is **advisory metadata for human display and appeals, never an evaluation or
subscription input** — it exists so a suppression notice can say why, and so an appeal has
something to name.

**`reason` should be a reference, not an allegation.** A policy code, ticket id, or court-order
number — not "operates a scam targeting elderly donors", and never personal information about the
listed party. The field is published, permanently checkpointed, and irretrievable once mirrored,
so a keeper writing prose accusations into it is creating a defamation surface with no delete
button (§ Risks), and doing so about a natural person invites the data-protection problem
[privacy.md](/specs/product/legal/privacy.md) is concerned with. The substance belongs in the
keeper's own records, which the reference points at and which an appeals process can reach.
Validators cannot enforce this — it is free text by construction — so it is a manifest-level
commitment a keeper makes and a reviewer can check.

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

This separation is load-bearing. Rendering, aggregation, serving, and gating money are materially
different decisions with different stakes; a single `isBlocked(subject)` answer shared across them
means a keeper of a spam list silently acquires the power to block people's money. It also muddies
the legal posture this whole design is for: the operator must own the enforcement decision, not
inherit it implicitly from whichever list they subscribed to. (That single-boolean design was
proposed and rejected — [design-history.md](./design-history.md).)

So `platform-api-service`'s `BLOCKED_CHANNEL_IDS` may *source* from a policy list, but only
through an explicit action mapping naming that list. It does not become a generic
display-policy subscriber.

**No action has a default.** The prose above keys actions on `(subject type, list)` and the
config example maps layer ids, which needs pinning down:

- **The action map, not a snapshot's contents, decides what a layer governs.** A mapping is a set
  of `(layer, subject type, action)` triples. The array form
  (`"standard-illegal": ["suppress"]`) is input shorthand expanding to every subject type that
  action's extractors can yield; the long form (`"sanctions": { "address": ["reject-claim"] }`) names
  them explicitly, and the bundle canonicalizes to the long form (§ The resolved policy bundle).
  Deriving governance from what a layer's current snapshot happens to contain would make the
  answer change under the operator when a keeper adds a subject type — and would make it
  unanswerable for exactly the case that needs it most, a layer whose snapshot is stale
  (§ The operator's subscription).
- **Money actions may not use the shorthand.** `reject-claim` and `refuse-gas-sponsorship` must
  name their subject types explicitly. The shorthand's expansion changes when the schema or an
  extractor adds a subject type, and a mapping that silently widens what a keeper can withhold
  money over is not something to inherit from a version bump.
- A surface skips actions for subject types it cannot act on — an aggregation path has nothing to
  do with a `channel` subject — and this is a no-op, not an error. But **an explicitly written
  triple must be one some extractor can produce**: `{ "channel": ["refuse-gas-sponsorship"] }` is
  a startup error, because that action's extractor yields only addresses. The extractor table is
  spec-defined, so this is mechanically checkable, and a triple that can never fire is an operator
  who believes they configured a protection they do not have. (The shorthand cannot produce one,
  since it expands only over what the extractors yield.)
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

#### Each action declares a subject extractor

An action is not "check the subject" — a request usually carries several. A claim involves a
platform channel, a claimant wallet, a payout wallet, a content-funding contract, and a project
contract, and "reject a claim" has to say *which of those* it tests. Left to the call sites, five
surfaces will answer differently, and the differences will be invisible until one of them pays out
to a subject another would have blocked.

So every action is defined as an operation over an explicitly declared **extractor**: a total
function from a request to the set of subjects that request contains.

```text
reject-claim:              claim.channel        → channel subject
                           claim.claimantWallet → address subject
                           claim.payoutWallet   → address subject
refuse-gas-sponsorship:    op.sender            → address subject
                           op.target            → address subject
refuse-serve:              request.cid          → cid subject
suppress / exclude-aggregation:
                           item.cid, item.publisher, item.projectContract → respective subjects
```

The action fires if **any** extracted subject is asserted by a layer mapped to that action. The
extractor is part of the spec, not per-surface glue, for the same reason the evaluator is shared:
a surface that omits `payoutWallet` from its extraction has silently narrowed the operator's
sanctions policy without changing a line of policy config.

**Extraction is not propagation.** The extractor enumerates subjects the request *already
contains* — every one of them is named directly by the thing being acted on. Propagation would
derive *new* subjects from relationships between them (block a wallet, therefore block its
projects), which v1 does not do (§ Evaluation semantics). Checking a claim's payout wallet
because the claim names a payout wallet is not the same as inferring one from another.

The extractor also gives "which requests does this layer govern?" a mechanical answer, which
§ The operator's subscription needs in order to define what a stale money layer holds:

> **A layer governs a request for a given action exactly when the action map contains a
> `(layer, subject type, action)` triple whose extractor yields at least one subject of that type
> from that request.**

Both halves are static config plus the request in hand — nothing is read from the layer's current
snapshot. Without extractors the question could only be answered from the manifest's prose scope,
which is not something an evaluator can read; without the action-map half it would be answered from
snapshot contents, which is unusable precisely when the snapshot is stale.

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

Defaulting to *no* propagation is the safer side of a genuinely two-sided risk. Both directions
have real costs: no propagation makes some
takedowns evadable by re-pointing at a fresh address, while implicit propagation turns one entry
into a suppression radius nobody reviewed and nobody can enumerate from the list. The asymmetry is
that under-blocking is visible to the operator who is legally responsible for it and is fixed by
adding entries, whereas over-blocking is invisible to everyone except the person silently erased.
Keepers who want broader suppression publish the related subjects explicitly, where they are
diffable, appealable, and attributable.

**Layer order carries no semantics.** Layers are evaluated independently and the result is a set,
so no layer can shadow, override, or short-circuit another. Configuration order is preserved only
so that the asserting set is reported in a stable order in notices and logs.

**Why `except` per layer rather than a general `allow` op.** A sibling `allow` layer clears every
prior assertion, so a spam correction can pardon a CSAM assertion — a trap that took two revisions
to find. `except` cannot be written wrong: it is scoped to one layer by construction, needs no
depth cap or cycle check, and eliminates the `protect` flag that a sibling `allow` would require.
The full account, including the rejected `appliesTo` alternative, is in
[design-history.md](./design-history.md).

#### Deferred: published recursive compositions

Snapshots that are themselves `block`/`allow` compositions over other lists — a third-party
curator publishing `[block StandardList, allow MyCorrections]` as one subscribable object, so many
operators consume one checkpoint instead of each maintaining corrections — are **deferred to a
future schema version**, not discarded.

The schema is versioned and consumers hard-reject documents they do not fully understand
(§ Subject canonicalization), so a v1 consumer meeting a v2 composition fails safe and visibly
rather than silently misreading it. The cost of adding composition later is a version bump; the
cost of freezing it now is committing to a recursive policy language before anyone has published a
single list in it — and its semantics were wrong through two revisions, which is what a policy
language looks like when designed in the abstract. When a real third-party curator needs to
publish one, they will bring the constraint that settles whether `allow`/`protect` recursion is
the right primitive. Until then the operator's local root expresses everything a single operator
needs, and it is not published, so it freezes nothing. (This reverses an earlier decision;
[design-history.md](./design-history.md) records the argument that was overturned.)

What v1 keeps from that work, because these are the parts that carry regardless of how
composition eventually lands: fully qualified list identity, canonical serialization and subject
keys, monotonic checkpointed versions, pinned references, the assertion/action split, and the
rule that corrections are scoped to what they correct.

#### Robustness

`ref` and `except` name leaf snapshots in v1, so the reference graph is one level deep by
construction — no cycle detection, no depth cap. When compositions arrive, evaluators will need
both (a depth cap of 8), and a published composition
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
      "follow": { "head": true, "maxResolutionAge": "PT1H", "maxCheckpointAge": "PT48H",
                  "maxAdded": 5000, "maxRemoved": 5000,
                  // accepted values — a version changing either holds for approval:
                  "policyHash": "0x…", "salt": "0x…" },
      "onError": "closed" },
    { "id": "sanctions",
      "ref": { "…": "…" }, "op": "block",
      "follow": { "version": "42" },
      "maxPinAge": "PT72H",        // money layer: hold once the pinned data is this old
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

Note what the example does *not* have: a free-floating correction layer. Corrections attach to the
layer they correct, and that is the only way to write one.

**Only assertion layers take actions.** Every `block` layer MUST be named in `actions`; an
`except` is not a layer, takes no actions, and cannot be named — an exception asserts nothing, so
there is nothing for an action to key on.

#### Local documents: the root, local lists, and the `ref` union

The registry wire format is specified above in detail while these local formats were left as
examples — which is backwards, because the local formats are what stages 1–3 build and the wire
format is stage 5. The rules below close that gap; the exhaustive schemas and test vectors are a
stage-1 deliverable (§ What it would take) rather than more prose here.

**Two kinds of `ref`, discriminated by shape and never mixed.** A layer or `except` names either a
checkpointed list or a local document, and exactly one of these forms is present:

| Form | Keys | Meaning |
|---|---|---|
| checkpointed | `chainId`, `registry`, `keeper`, `listId` | resolved through the registry; may carry `follow` |
| local | `source` (a `file:` or `https:` locator — operator-local config, so the published-`locator` rule of § Wire format rules does not apply), optionally `contentHash` | fetched directly; `follow`, `policyHash`, and `maxCheckpointAge` are configuration errors here, because there is no checkpoint to follow or age |

**A local document is a snapshot without the checkpoint-bound fields**, and reuses everything
else:

```jsonc
{
  "schema": "commonality.policy-list-local/v1",
  "salt": "0x…",              // same rule: required iff any entry is hashed
  "entries": [ /* exactly the entry shape of § Snapshot format */ ]
}
```

`keeper`, `listId`, `version`, `previous`, and `manifest` are **forbidden**, not optional. A local
file has no checkpoint for a validator to check identity against, so carrying identity fields would
mean either ignoring them — inviting a file that claims to be someone's list and is not — or
inventing a validation rule for a claim nothing backs. Everything else is identical: JCS
canonicalization, subject keys, the salt and `valueHash` derivation (same domain-separation string,
so a subject key hashes the same in either document), duplicate detection across forms, unknown-field
rejection, and strict parsing. That identity is deliberate: an operator maintaining a list by hand
today should be publishing it as a checkpointed snapshot tomorrow by adding fields, not by
converting a format.

**A local document's identity is `sha256` of its canonical bytes.** That is the `contentHash` the
bundle records (§ The resolved policy bundle). If the root pins `contentHash`, bytes that hash
differently make the ref **unresolvable** and `onError` applies — mutable URL, immutable
expectation. If it does not pin one, the fetched bytes' hash still lands in the bundle, so a change
is visible as a digest change rather than an invisible policy edit. `maxAdded`/`maxRemoved` apply to
a local block layer if declared, against the same last-accepted subject set.

**The root is `commonality.policy-root/v1`**, with the same strict parsing and unknown-field
rejection as everything else, validated at startup against § Assertions vs. actions. Its layer
entries are `{ id, ref, op: "block", except?, follow?, onError, maxPinAge? }`. `onError` has no
default: a layer that omits it is a configuration error, since the whole point of § Error behavior
is that failing open must be chosen rather than inherited.

**The evaluator's result type is the asserting set plus its provenance**, and every surface returns
it rather than a boolean: `{ digest, sequence, assertedBy: layerId[], status }`, where `status` is
the `current`/`stale`/`held`/`unavailable` of § The resolved policy bundle. A suppression notice
cites `assertedBy`, an appeal names it, and a caller that wants a boolean takes
`assertedBy.length > 0` — which keeps the collapse to a boolean at the call site, where it is
visible, rather than in the evaluator, where § Assertions vs. actions rejected it.

**Follow head vs. pin.** Following head is the low-effort default and the reason this scales to
many operators. Pinning means a captured keeper cannot silently expand your blocklist — you
review the diff before bumping.

Following head needs freshness controls, or "follow" silently becomes "trust unconditionally".
A one-step rollback to a previously accepted version is always available. Diff volume and age are
the two gates, and both need defining precisely enough that a keeper cannot slip under them.

**`maxDiff` is two thresholds, not one.** A single number conflates the two events an operator
cares about most differently: mass additions are an over-blocking attack, mass removals are a
keeper quietly undoing corrections or being coerced into unblocking. So a layer declares
`maxAdded` and `maxRemoved` separately, and either alone can hold. (`maxDiff` as one number
remains legal shorthand for setting both.) The rest of the semantics:

- **The comparison is against the last operator-accepted subject set, not the immediately
  preceding checkpoint.** If versions 43–47 arrive while an update is held or an operator is on
  holiday, the gate that matters is how far the candidate has moved from what is actually being
  enforced. Diffing against the predecessor would let a keeper walk past any threshold in
  increments, which is the whole attack.
- **Counted as subject-key set difference:** added is (candidate ∖ accepted), removed is
  (accepted ∖ candidate). A subject moving between plain and hashed form is **not** a change: the
  operator holds the accepted snapshot's plaintext, so it can hash it under the salt and match. It
  counts as a change only when the salt also changed, which is separately an approval boundary
  (§ Wire format rules) and so cannot pass unnoticed anyway.
- **`reason`-only changes count toward neither threshold** but appear in the review diff. A
  keeper correcting a ticket reference should not consume an operator's attention budget; a keeper
  rewriting the stated justification for an existing entry is something a reviewer should see.
- **A held candidate stays held; later versions do not clear it.** The layer keeps enforcing the
  last accepted version, and the newest candidate is what the operator is shown — an operator who
  reviews and accepts version 47 accepts everything since their last acceptance, in one decision.
  Auto-clearing a hold because a *newer* version arrived would make the gate trivially bypassable
  by publishing twice.

Age needs more care:

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

"A list that stops publishing is a failure" is only half right: a list whose contents genuinely
have not changed *should* have an old latest version, and treating that as an outage would make
every well-behaved quiet list look broken. So `maxCheckpointAge` is only
meaningful against a declared cadence: **the manifest declares an expected publication cadence,
and a keeper who declares one MUST publish heartbeat versions when nothing has changed** (a new
version with identical entries and a fresh `previous` link — cheap, one transaction). A keeper
declaring no cadence gets no `maxCheckpointAge` check, and operators should weigh that when
deciding whether to follow their head.

**Staleness is not one-directional, and the response depends on the action.** It is tempting to
think a stale snapshot can only *under*-block, so caching one forever is safe. It is not: a stale
snapshot also **over-blocks**, retaining entries the keeper has since removed —
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
threshold, **every request that layer governs is held**, whether or not any of its subjects appear
in the cached snapshot.

"Governs" is the action-map definition from § Assertions vs. actions, not the manifest's prose
scope and not the cached snapshot's contents: a request is governed when a `(layer, subject type,
money action)` triple exists in the map and that action's extractor yields such a subject from the
request. A sanctions layer mapped `{ "address": ["reject-claim"] }` governs every claim that names
any wallet — which is all of them — so a stale sanctions layer holds all claims. A layer mapped
only for `channel` subjects does not hold a claim that carries no channel. Note that this reads
the *map*, not the snapshot: a layer whose cached snapshot happens to contain no `address` entries
still governs every claim naming a wallet, which is correct, because "the stale copy lists nobody"
is exactly the state a stale layer cannot be trusted about. That answer is mechanical, which is the
point; anything softer turns "affected claims" back into a judgment call made independently at each
of five call sites.

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

- `closed` (recommended for mandatory block layers) — the resolver **carries the layer's
  last verified artifact forward** into the new bundle and records it as carried forward, so the
  layer keeps being enforced subject to the staleness rules above. Only where there is no verified
  artifact for that layer at all is the layer emitted as unresolved, and a surface then degrades to
  refusing to render unverified content for the actions mapped to it.
- `hold` (required for layers mapped to money actions) — as `closed`, but once the carried-forward
  artifact is past its freshness threshold, the requests that layer governs go to hold-for-review
  instead of being auto-rejected.
- `open` — the resolver emits a bundle **without** this layer. Because the layer's absence changes
  the bundle contents, it changes the digest: failing open is a visible, recorded event rather than
  a silent one.

**`onError` is per-layer resolver behavior, not per-request behavior.** It decides what a resolver
puts in the next bundle for an input it could not freshly verify, and what a surface does when a
bundle marks a layer unresolved. A surface never discovers mid-request that a layer is unfetchable,
because a surface never fetches layers — it enforces an already-complete, already-activated bundle
(§ The resolved policy bundle). This matters because per-request error handling is how the same
policy ends up enforced differently on two surfaces, or differently on the same surface a second
apart.

**One flaky source must not freeze every other layer.** `onError` applies per layer at resolution
time and the resolver always emits a *complete* bundle, so an unreachable appeals host does not
hold back an urgent addition to an unrelated blocklist. This is not a hole in atomicity: the
resolver materializes the exact combination it chose — fresh layers at their new versions,
carried-forward layers at their old ones — and the digest names that combination. What remains
all-or-nothing is *activation*: a surface enforces exactly one published bundle and never a mixture
of its own devising (§ The resolved policy bundle).

An **`except` that cannot be resolved never blocks the emission of a bundle**, and this asymmetry
is deliberate: an ignored exception over-blocks, which is recoverable and visible, while a dropped
block layer under-blocks. Concretely, at resolution time the resolver carries forward the last
verified version of that exception if it has one, and emits the bundle without the exception if it
does not. Either way a persistently unresolvable `except` alerts, because a silently ignored
exception is exactly how a granted appeal stops being honored. What it may *not* do is vary during
evaluation — an exception that applies to one request and not the next is the same divergence in
miniature.

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
single immutable artifact that every surface consumes, paired with a status envelope that tells
every surface the same thing about how fresh that artifact's inputs are (§ The status envelope).

**The operator resolves once and publishes a resolved policy bundle** to its own surfaces:

```jsonc
{
  "schema": "commonality.policy-bundle/v1",
  "layers": [ { "id": "standard-illegal",
                "ref": { "chainId": "8453", "registry": "0x…", "keeper": "0x…",
                         "listId": "0x…", "version": "44", "snapshotHash": "0x…" },
                "except": { "contentHash": "0x…", "source": "https://…" },
                "onError": "closed",
                "freshness": { "maxResolutionAge": "PT1H", "maxCheckpointAge": "PT48H" },
                "checkpointBlockTime": "…" } ],
  "actions": { "…": "…" },
  "honoredRetractors": ["0x…"],
  "sequence": "17",   // monotonic per operator; see Authenticity below
  "digest": "0x…"     // sha256(JCS(this object with `digest` removed))
}
```

**The digest is computed over the bundle with the `digest` member absent** — stated because the
example's earlier "everything above" was circular, and two implementations guessing at a
fixed-point convention would never agree.

**The bundle carries everything about *what* is enforced.** It MUST carry: the schema version;
every layer with its pinned `snapshotHash` and resolved `version`; every operator-local input's
content hash; each layer's `onError`, freshness thresholds, and `maxPinAge`; the full action map;
`honoredRetractors`; and either the snapshot bytes inline or immutable, content-addressed locators
for them. A locator that can change what it returns (a bare mutable HTTPS origin) is not sufficient
on its own — the accompanying hash is what makes retrieval atomic, and a surface that cannot verify
a fetched blob against it must treat the layer as unresolvable rather than trust the bytes. A layer
the resolver could not resolve at all appears with no `ref` and `"unresolved": true`, so "this
policy has a hole in it" is part of the hashed content rather than something a surface infers from
a missing key. Unknown fields in a bundle are rejected, as everywhere else in this design.

Anything omitted from the bundle is a decision each surface would make for itself, which is the
divergence the bundle exists to eliminate. `onError` and freshness in particular are easy to leave
out on the theory that they are "config, not policy" — but two surfaces with different `onError`
behavior enforce different policies at exactly the moment enforcement matters most.

Remaining representation rules, so two resolvers produce the same bytes from the same inputs: the
action map is canonicalized to its **long form** (`{ subjectType: [actions] }`, subject types and
action names sorted) — the array shorthand of § Assertions vs. actions is input syntax only, and
leaving both forms in the bundle would give one policy two digests. `honoredRetractors` is
lowercased, deduplicated, and sorted for the same reason. Durations use the syntax in
§ Wire format rules.

**No timestamps live in the bundle.** The bundle is immutable content named by its digest, so a
resolution cycle that finds nothing changed reproduces the same bytes and does not republish —
which is what keeps a digest mismatch between two surfaces meaningful instead of a permanent
condition churning every tick. `checkpointBlockTime` is the one apparent exception and is not one:
it is a property of the pinned version, so it is as immutable as the version itself.

#### The status envelope

The bundle alone is therefore *not* the complete runtime input, and an earlier draft that said it
was, while also tracking successful-resolution time "alongside the digest", left the most important
derived quantity — is this layer stale? — for each surface to work out on its own. Two surfaces
enforcing the same digest could then disagree about whether a money layer holds, which is the exact
divergence the bundle exists to prevent.

So the resolver publishes a second, **mutable** artifact next to the bundle:

```jsonc
{
  "schema": "commonality.policy-status/v1",
  "digest": "0x…",              // the bundle this envelope describes
  "sequence": "17",             // that bundle's sequence
  "envelopeSequence": "204",    // monotonic per operator, its own counter
  "generatedAt": "2026-07-28T09:15:00Z",
  "lastSuccessfulCycle": "2026-07-28T09:15:00Z",
  "layers": [ { "id": "standard-illegal",
                "lastResolvedAt": "2026-07-28T09:15:00Z",  // when this layer was last verified fresh
                "carriedForward": false } ]
}
```

**The bundle and its status envelope together are the complete evaluation input.** Every surface
consumes the pair; no surface independently infers resolver health, and no surface resolves a head.
`lastResolvedAt` is what `maxResolutionAge` is measured against, `checkpointBlockTime` (from the
bundle) is what `maxCheckpointAge` and `maxPinAge` are measured against, and both inputs now reach
every surface identically, so the stale/held determination is the same everywhere.

The envelope is mutable and re-published every cycle by design — that is what it is for, and it is
why these fields are not in the bundle. It is an operator artifact on the same trust footing as the
bundle (§ Authenticity below). It needs a rollback counter of its own, `envelopeSequence`, because
the bundle's `sequence` stays put across the many cycles that change nothing in the bundle, and a
counter that does not move cannot detect a replayed envelope — which is the attack that matters
here, since a stale envelope replayed against the current bundle makes stale layers look fresh.
Surfaces reject an envelope whose `envelopeSequence` is not greater than the one they hold.

**An envelope is only ever applied to the bundle it names.** A surface that receives an envelope
for a digest it does not hold fetches and verifies that bundle; until it can activate it, it keeps
enforcing the pair it already has, and it never applies a new envelope's freshness to an older
bundle's layers. An envelope
whose `generatedAt` is itself old means the resolver has died, which is a distinct and detectable
condition from any layer being stale; surfaces treat a dead resolver as staleness of every layer,
because a resolver that is not running cannot tell them a layer went stale.

**Activation is atomic and all-or-nothing.** This is the part that makes the digest mean anything.
Note what it does *not* mean: the resolver's per-layer fallback (§ Error behavior) is not a
violation, because the resolver materializes its choice into a complete new bundle whose digest
names that exact combination. What is forbidden is a *surface* assembling a policy of its own from
parts of two bundles. So:

- A surface **downloads and verifies every artifact a bundle references before activating it**.
- If any artifact is missing or fails verification, the surface **keeps the entire previous
  bundle** — never a mixture of new layers and artifacts retained from an older one. There is no
  state in which the enforced policy is not exactly one published bundle.
- A surface with **no prior complete bundle** applies the configured `closed`/`hold`/`open`
  behavior, which is the only situation in which those settings decide what happens rather than
  which bundle is kept.
- Exception availability is settled at activation, never re-evaluated per request.
- **Surfaces report a runtime status alongside the digest**: `current`, `stale` (enforcing a
  bundle past a freshness threshold), `held` (money actions queuing for review), or `unavailable`
  (no bundle at all). This is the surface reporting *its own* state — which pair it managed to
  activate — and is not a substitute for the envelope, which is the resolver reporting the input
  that state is computed from. A digest alone cannot distinguish "enforcing bundle 17 normally"
  from "enforcing bundle 17 because everything newer failed verification for a day", and those are
  very different operational situations.

**Authenticity: the digest is identity, not authority.** A sha256 proves two surfaces hold the
same bytes; it proves nothing about who produced them, since anyone who can replace the bundle can
recompute its digest. Naming the trust boundary explicitly, because a digest is easy to mistake
for authentication:

> The bundle and its status envelope are operator artifacts delivered over an authenticated channel
> the operator already controls — same-origin HTTPS to browser surfaces, the deployment channel to
> server surfaces — with servers pinning the digest they expect to serve. Their authenticity
> therefore reduces to operator infrastructure trust, and this design does not improve on it.

That is honest rather than weak: a browser surface already executes the operator's JavaScript, so
an attacker who can swap the bundle can simply disable enforcement in the client, and a signature
would not stop them. What the digest *does* buy is cross-surface agreement detection, which is a
different job. Two protections are still worth having: the monotonic `sequence` gives rollback
protection, so replaying an old validly-hashed bundle to resurrect a retired policy is detectable
and rejected; and if either artifact ever crosses a hop the operator does not control — a CDN they
do not own, a partner deployment — it needs an operator signature over `(digest, sequence)` for the
bundle and over the whole envelope, because the reduction above stops holding at that boundary. The
envelope needs the stronger treatment of the two: an attacker who can replay a stale envelope
against a current bundle makes stale layers look fresh, which is precisely how a money hold gets
suppressed.

- **Every input carries a content hash, including operator-local ones.** A layer resolved from
  `{ "source": "https://myvertical.example/list.json" }` contributes the sha256 of the bytes
  actually fetched. Without this the digest is a lie: two surfaces could fetch different content
  from the same mutable URL, agree on the digest, and enforce different policies — the exact
  invisible divergence the digest exists to rule out.
- **Surfaces consume the bundle; they do not each resolve heads independently.** This is what
  makes agreement checkable rather than hoped for, and it puts head-following, freshness
  thresholds, and manifest-approval holds in one place instead of duplicating that logic into a
  browser bundle.
- **Each cycle emits one complete bundle, and activation is atomic** (above). A bundle is produced
  from a frozen tuple — including any inputs the resolver chose to carry forward — and evaluated as
  a unit; a surface never re-resolves mid-request. A policy that changes halfway
  through a page produces incoherent results — a supporter count that excludes a subject the same
  page still renders.
- **Every surface reports the bundle digest it enforced** — in server responses, in the SDK's
  evaluation result, in logs.
- **A client/server digest mismatch is not an error and must not fail a request.** Propagation is
  asynchronous by nature. The client re-fetches the bundle (it cannot "adopt" a digest — a digest
  is not reversible, and the head may have moved on since); mismatches persisting past a grace
  window alert. What a mismatch must never do is cause a surface to skip enforcement because it
  is unsure which policy applies: each surface always enforces the most recent bundle it has
  **fully verified and activated**.
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

### Fetching untrusted artifacts

Every locator in this design — snapshot, manifest document, local source, mirror — is a **string
chosen by someone else**, and the resolver fetches it automatically. `maxAdded` and `maxRemoved`
guard the policy *after* parsing; they do nothing for the resolver itself, which a captured or
merely careless keeper can point at a 100 GB object, a zip bomb, a response that never ends, a
redirect loop, or `http://169.254.169.254/`. A resolver that follows locators the way a browser
follows links hands whoever writes one a request forgery primitive against the operator's own
network, and the operator subscribed to a *blocklist*, not to that.

So fetching is bounded, and the bounds are configuration with conservative defaults rather than
whatever the HTTP client happens to do:

- **Size**: a maximum byte count for snapshots, manifests, and local documents, enforced by
  streaming and aborting — not by reading the response and checking afterwards, and never by
  trusting `Content-Length`. A maximum entry count and a maximum decompressed-to-compressed ratio,
  since a size cap on compressed bytes is not one on memory.
- **Time**: connection, first-byte, and total-transfer timeouts. A response that trickles forever
  under the size cap is the same denial of service as an oversized one.
- **Redirects**: a small limit, and each hop re-checked against the network rules below.
- **Network**: HTTPS to public addresses only. Resolved addresses are checked against private,
  loopback, link-local, and unique-local ranges, and the connection is made to the address that was
  checked — re-resolving after the check is the DNS-rebinding hole. Operators who need internal
  hosts configure an explicit egress allowlist; that is a decision, not a default.
- **IPFS**: fetches go through the operator's configured gateway or node under the same limits; a
  keeper-supplied gateway host is not honored.

A fetch that hits any bound fails the layer, and a failed layer takes the ordinary `onError` path
(§ Error behavior) — there is no separate error mode for "the keeper attacked us", because from the
resolver's position it is indistinguishable from an outage and both want the same fallback. It does
alert differently: a bound being hit is a keeper-attributable event and belongs in the diff feed
next to anomalous diffs and scope drift.

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
history of what was ever blocked is enumerable by anyone", but:

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
contributes to them.** Snapshots have no `honoredRetractors` field and no semantics for composing
one, and the substantive reason is stronger than the mechanical one: honoring a retractor is a
standing grant of *per-item, on-chain* takedown authority over anything that address ever touches,
which is a strictly larger power than the enumerated entries an operator reviewed when they
subscribed. Letting a list smuggle that grant in as a side effect of subscribing would hand a
keeper a second censorship channel with none of the diffability, diff-threshold alerting, or
policy-scope review that the snapshot path is built around. A keeper may of course *ask* subscribers to honor them; that is
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

**Build the evaluator and the bundle first; build the registry last.** An earlier ordering put the
registry and remote snapshots at stages 1–2, ad-hoc stage-0 filters before them, and the shared
evaluator at stage 3 — with the reassurance that stage 4 would be "a repoint rather than a
rewrite". That reassurance was doing too much work. Ad-hoc filters at five call sites are not a
thin shim: they are where the per-surface subject extraction, error handling, and freshness
behavior get decided, and every one of those decisions is re-made when the evaluator arrives. That
is implementing enforcement twice, and the second implementation has to reproduce the first one's
behavior at sites nobody wrote tests against.

The reordering costs almost nothing, because **the expensive part of stage 0 is reaching all five
surfaces at all**, and that cost is identical whether the call site consults an inlined denylist or
a shared evaluator. What changes is only what sits behind the call. So the evaluator and the
resolved bundle move to the front — where they are the local, single-operator artifact they are
useful as — and the registry becomes an additive source of layers later.

This also puts the sequencing argument on firmer ground than "do the legal thing first". The
evaluator, the bundle, and complete coverage are worth building for a single operator with a
hand-maintained JSON file. Checkpointed subscription is worth building when a second keeper
exists. One of those is speculative; the other is not, and it is not the one that was scheduled
first.

Stages are split by *which subjects can actually gate which surface*, because one CID list cannot
cover all of them. Today's `VITE_DISPLAY_DENYLIST_URL` holds CIDs, and a CID cannot gate a
channel's claim or a wallet's gas sponsorship — those need the address and channel policies that
`platform-api-service`'s `BLOCKED_CHANNEL_IDS` gestures at.

| # | Stage | Size |
|---|---|---|
| 0 | **Compliance operations**: reporting address, on-call rotation, appeals process, published policy. Not engineering, does not depend on anything below, and gates mainnet on its own | Medium |
| 1 | **Subject extraction and the local policy format**: subject canonicalization, the action taxonomy and its extractors, an operator root read from local config, validators and test vectors. No chain, no registry | Medium |
| 2 | **The evaluator and the resolved bundle across all five surfaces**: one implementation, atomic activation, digest and runtime status reporting, `onError`, hold-for-review, and the observability to tell the surfaces apart | **Large — the core** |
| 3 | **Production enforcement coverage**: every CID-shaped surface (rendering, aggregation, metadata fetching, indexer/API serving) plus address/channel gating for claims and gas sponsorship, all going through stage 2, with tests proving a listed subject is suppressed on every surface | **Medium-large** |
| 4 | **The admission profile — only if a real admission case lands**: a second evaluator over the same subjects and membership test, with its own inverted failure rules (a fetch failure admits nothing, so `onError: closed` is an outage, not a safeguard), its own freshness semantics, and its own action set. Reuses stages 1–3 wholesale; shares no evaluation logic with the block profile | Medium — **ordering is a product decision, see [§ Risks](#risks-and-open-questions)** |
| 5 | Registry identity and the canonical wire format: `PolicyListRegistry.sol`, JCS serialization, manifest documents, strict parsing, cross-runtime test vectors, deploy script, `deployments/` entry — **only when a real second keeper or operator exists** | Medium |
| 6 | Subscriptions end to end: indexer handler, keeper publishing tool, head following, freshness, `maxAdded`/`maxRemoved` and `policyHash` holds | Medium |
| 7 | Diff viewer, freshness and policy-change alerting | Medium |
| 8 | Published recursive compositions — only when a real third-party curator needs to publish one | Deferred (schema bump) |
| 9 | Authenticated-absence lookup — only once real list sizes require it | Deferred |
| 10 | Fingerprint/provider integration | Separate work (schema bump) |

Stages 2 and 3 are the real cost, and stage 3 is a **coverage** problem rather than a
composability one. [published-data/README.md](../published-data/README.md) § "Honored retractors"
rule 2 is emphatic that suppression must cover **aggregation, not just rendering**: supporter
counts, transitive implication support, contributor leaderboards. A half-applied blocklist is
worse than none.

Stage 2 is where the difficulty concentrates: one evaluator across five surfaces in two runtimes,
with caches, partial failures, atomic bundle activation, and asymmetric freshness rules for money
actions. Note that nothing in it needs the registry — a bundle resolved entirely from local files
exercises every one of those problems.

Stage 5 (the registry) is not "small because the contract is small". The contract is genuinely tiny — one
mapping, one guarded write. The cost is canonicalization and strict parsing that two runtimes
agree on byte for byte, the wire-format rules above, adversarial validation, and a shared
test-vector corpus keeping independent implementations from drifting. That has to be right before
anyone publishes a list, because a hash disagreement discovered later is not a bug fix, it is a
migration. Deferring it until there is a second implementation to agree *with* is also when its
test corpus can actually be validated.

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

**Open: does admission allowlisting come before the registry?** This is the one genuinely
undecided item, and it is a product question rather than a design one. This document specifies
blocklists and scoped exceptions; admission ("show only the listed subjects") is a separate
evaluation profile with inverted failure semantics, staged but unscheduled. The reason it is open
is that [operator-posture.md](/specs/product/ui-operator-posture.md) § "Indexer posture" already
names admission cases — curated project sets, recognized factories, a community indexing its own
allowlisted projects — and if any of them is needed for a production vertical, it outranks the
registry, which is speculative until a second keeper exists. Answering it needs someone to say
whether a launching vertical actually needs operator-scoped indexing, not more design work here.
Note the asymmetry in the cost of being wrong: shipping the registry first and discovering
admission was needed costs a delay, whereas retrofitting admission onto the block evaluator's
failure rules to catch up is how an admission list ends up enforced under blocklist failure
semantics — the outcome § One object type exists to prevent.

**Subject propagation — resolved as no implicit propagation** (§ Evaluation semantics). The
residual risk is the under-blocking side: a subject re-pointing at a fresh address stays visible
until a keeper lists the new one, so takedown latency becomes a keeper operations problem rather
than something the evaluator solves. That is the intended trade; the alternative is an
unenumerable suppression radius. If operators end up writing near-identical propagation rules by
hand, that is the signal to specify one — driven by observed rules, not by guessing at them now.
