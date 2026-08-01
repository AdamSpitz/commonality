# Policy lists: registry, checkpoints, and third-party subscription

Status: **design candidate, not normative** (Jul 2026), and deliberately **not the first thing to
build**. [README.md](./README.md) is the normative v1 spec — the evaluator, the local policy format,
and the resolved bundle, all worth building for a single operator with a hand-maintained JSON file.
This document specifies what is added when a *second* keeper exists and an operator wants to
subscribe to their list: on-chain checkpoints, canonical wire format, manifests, and head-following.

## How normative this document is

It is stage 6–7 of [README.md § What it would take](./README.md#what-it-would-take); v1 is stages
1–3. Building it first would mean freezing an interop contract before anyone has published a list
under it, against the requirements of a list provider who does not exist. So the material here
splits into two tiers, and the distinction is not cosmetic:

**Durable constraints — treat these as decided.** They are conclusions about what a checkpointed
list must be, they survive any reasonable change of format, and reversing one is a design decision
rather than an edit:

- List identity is **keeper-qualified**; no global namespace, no registrar.
- Versions are **monotonic** per list.
- A checkpoint commits to a **complete snapshot**, not a delta — so a keeper cannot show different
  histories to different audiences.
- A subscriber following a head **pins the scope** it approved, and a scope change is an approval
  boundary rather than a silent broadening.
- **History and availability are distinct** problems: the chain proves what was published, and does
  not make it retrievable.
- A published composition **pins its children** by content, never by "whatever that list says now".

**Everything else is a candidate**, to be finalized with the first real external keeper or operator:
the contract's exact interface, the manifest's fields, the snapshot wire format, the `follow` block's
shape, and the specific durations and thresholds. They are written out in full because a design
sketched in generalities cannot be reviewed — not because the field names are settled.

Rejected alternatives are in [design-history.md](./design-history.md). If that file and this one
disagree, this one is right.

## What a checkpoint is for

Blocklists are an obvious censorship vector, so a keeper must not be able to lie about what they
have blocked, block something for one audience and not another, or quietly un-block something
later. That single requirement drives everything in this document. It is a self-imposed
requirement, and it is what makes this half of the design substantially larger than the
enforcement half.

A **policy list snapshot** is a published leaf of literal entries — exactly the local document of
[README.md § Entries and documents](./README.md#entries-and-documents),
plus identity, a version, a link to its predecessor, and a manifest — committed to on-chain by its
keeper. Composition still happens only in the subscriber's unpublished root.

## List identity

Versions are keyed by `(keeper, listId)`, so a reference carrying only `listId` is ambiguous — two
keepers may pick the same id. Every reference therefore carries a fully-qualified, chain-namespaced
identity, per the CAIP-10-style rule established in [multi-chain.md](/specs/tech/multi-chain.md)
item 3:

```jsonc
{ "chainId": "8453", "registry": "0x…", "keeper": "0x…", "listId": "0x…" }
```

Policy lists live on one chain today. Including `chainId` and `registry` anyway costs nothing now
and avoids a breaking format change to the interop contract later — the same reasoning
multi-chain.md applies to event and entity identifiers.

Head resolution likewise filters on `(keeper, listId)` topics, never `listId` alone.

## The registry contract

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

The one storage word is deliberate: monotonic versions cannot be *promised* without being enforced,
and an unenforced ordering rule is exactly what a captured keeper would exploit (republishing an old
version to silently revert corrections). `publish` reverts unless
`version > latestVersion[keeper][listId]`.

**Versions start at 1.** `latestVersion` is zero for an unpublished `(keeper, listId)`, so the
guard already rejects `0`. That keeps "has this list ever published?" as a single zero check rather
than a separate initialized bit.

### Why snapshots rather than `Block`/`Unblock` events

Cost is O(1) per version rather than per entry, so a 200k-entry list costs one transaction.
Unblocking is free — absence from the next snapshot. And crucially, a snapshot commits to the
*complete current state*: with an event stream you can prove additions but cannot cheaply prove
what the list says right now.

### What the checkpoint does and does not guarantee

The guarantee is narrower than "no equivocation": **one checkpoint admits exactly one snapshot.** A
keeper cannot serve different contents under a committed hash, cannot deny having published what
they published, and cannot silently un-block or revert, because reverting takes a new version and
the old one stays logged.

Three things it does not prevent:

- **Selective unavailability.** A keeper can serve a version's bytes to one audience and stall
  another. The hash pins what those bytes must be, and the gap is detectable if anyone compares
  notes, but a checkpoint cannot make an object retrievable (§ Availability).
- **Timing games.** Nothing stops a keeper publishing version 44 for an hour and superseding it
  with 45. Both are permanently visible, so this is a thing auditors can *see* rather than a thing
  the mechanism prevents.
- **Audiences enforcing different versions at once.** Propagation is asynchronous and caches
  differ, so two operators — or two surfaces of one operator — will routinely be a version apart.
  That is normal operation, which is why intra-operator agreement leans on the resolved bundle and
  its digest rather than on the checkpoint.

What the checkpoint gives auditors is that all of the above happen *on the record*.

## The manifest

**The manifest is bound to the version, not published beside it.** The manifest describes what the
list covers and who stands behind it — which, with no category dimension, *is* the interop contract
([README.md § Risks](./README.md#risks-and-open-questions)). A separate, unbound manifest event
would let a keeper silently rewrite their own scope and policy after the fact, which is precisely
the move the checkpoint exists to prevent.

**It has two parts, hashed separately, because they carry different risk.** Both are bound into the
snapshot and therefore both are permanently logged; only one is an approval gate:

```jsonc
"manifest": {
  "policyHash": "0x…",       // sha256(JCS(manifestDocument.policy))
  "operationalHash": "0x…",  // sha256(JCS(manifestDocument.operational))
  "locator": "ipfs://…"      // the document containing both sub-objects
}
```

The manifest document is a separate published object with a fixed shape, because two hashes over
undefined sub-objects are two hashes nobody can recompute:

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

Each hash is `sha256(JCS(sub-object))` — over the sub-object alone, not the whole document — so
that changing an operational field provably cannot alter `policyHash`. If that held only by
convention, an operator reviewing a held update could not tell which part actually moved. Both
sub-objects are required when a manifest is present.

**A manifest is mandatory for any followed head.** Genesis versions MAY omit it, and manifestless
snapshots stay legal for pinned or operator-private lists, where the operator reviews each version
by hand and there is no delegated future authority to scope. But `follow: { head: true }` against a
list with no manifest is a **configuration error**: head-following delegates ongoing authority,
`policyHash` is the gate on that delegation, and there is nothing to pin if no policy document
exists. The governance point follows as a consequence — a list many operators follow by default is
by definition a list with followed heads, so it must publish a policy and an appeals route.

A followed list that publishes a version **omitting** a manifest it previously carried is treated
as a `policyHash` change and holds for approval. Silently dropping the appeals route is exactly the
move the gate exists to catch.

## The checkpointed snapshot format

A snapshot is a leaf. Numeric fields crossing the hash boundary are **canonical decimal strings,
not JSON numbers**: JCS uses the ECMAScript number model, `version` is a Solidity `uint64`, and
neither `uint64` nor the chain-id space is bounded by `Number.MAX_SAFE_INTEGER`. A format that can
encode a value it cannot round-trip is a hash mismatch waiting to happen.

```jsonc
{
  "schema": "commonality.policy-list/v1",
  "chainId": "8453", "registry": "0x…", "keeper": "0x…", "listId": "0x…", "version": "42",
  "publishedAt": "2026-07-28T00:00:00Z",   // advisory only — never an input to freshness
  "previous": { "version": "41", "snapshotHash": "0x…" },
  "manifest": { "policyHash": "0x…", "operationalHash": "0x…", "locator": "ipfs://…" },
  "salt": "0x…",                            // per-list, required iff any entry is hashed
  "entries": [ /* exactly the entry shape of README.md § Entries and documents */ ]
}
```

Everything below `entries` — subject keys, strict parsing, unknown-field rejection, JCS
canonicalization — is specified once in [README.md](./README.md) and is identical here; `salt` and
`valueHash` are additions this document makes (§ Disclosure), not v1 features. That identity is
deliberate: an operator
maintaining a list by hand today should be publishing it as a checkpointed snapshot tomorrow by
adding fields, not by converting a format.

`snapshotHash` is `sha256` over the JCS (RFC 8785) serialization, UTF-8. Without a normative rule,
two honest implementations disagree on the hash and verification becomes a coin flip.

### Checkpoint-only wire format rules

These extend the table in [README.md § Wire format rules](./README.md#wire-format-rules), which
governs every field shared with local documents, roots, and bundles.

| Field | Rule |
|---|---|
| `registry`, `keeper` | exactly 20 bytes, lowercase `0x` hex, 42 chars |
| `listId`, `snapshotHash`, `policyHash`, `operationalHash` | exactly 32 bytes, lowercase `0x` hex, 66 chars |
| `version` | canonical decimal string: no sign, no leading zeros, ≥ 1 and ≤ 2⁶⁴−1 |
| `publishedAt` | RFC 3339 UTC with a literal `Z`, second precision, no offset forms |
| `cadence` | ISO 8601 duration, date and time components only. No `Y` or `M` components |
| `locator` | one of `ipfs://`, `https://`, `ar://`; ≤ 2048 bytes; no fragment |

### Validation against the checkpoint

In addition to the document rules in README.md, validators MUST reject a snapshot unless:

- its `keeper`, `listId`, and `version` match the checkpoint that pointed at it;
- every reference is fully qualified (§ List identity);
- `previous` is present for every version after genesis and names the actual preceding checkpoint
  for that `(keeper, listId)`.

**Head** means the latest checkpoint at or before the client's confirmation depth; consumers
declare a reorg policy rather than trusting the chain tip. A snapshot is authenticated by its
keeper's checkpoint transaction — it is **not** independently signed. Detached signatures would add
little (the transaction already binds keeper to hash) and are deliberately omitted; the word
"signed" should not be used for these snapshots.

**The salt is per-list and stable across versions.** A salt that rotated per version would re-hash
every entry, so each version would show its entire hashed portion removed and re-added — destroying
`maxAdded`/`maxRemoved`, the diff feed, and any historical review, which are the mechanisms that
make keeper capture detectable. The trade-off is real: a stable salt lets an observer track a given
hashed subject across versions. That is the same property that makes diffing work, and it costs
little given § Disclosure already concedes these digests are findability reduction rather than
confidentiality. Rotating a salt is a discontinuity on the order of a scope change and should be
announced in the manifest, not done quietly.

## Subscribing: follow head vs. pin

A checkpointed `ref` is one of the two `ref` forms an operator's root may carry
([README.md § Two kinds of `ref`](./README.md#two-kinds-of-ref-discriminated-by-shape-and-never-mixed)):

```jsonc
{ "id": "standard-illegal",
  "ref": { "chainId": "8453", "registry": "0x…", "keeper": "0x…", "listId": "0x…" },
  "op": "block",
  "except": { "ref": { "source": "https://myvertical.example/csam-appeals.json" } },
  "follow": { "head": true, "maxResolutionAge": "PT1H", "maxCheckpointAge": "PT48H",
              "maxAdded": 5000, "maxRemoved": 5000,
              // accepted values — a version changing either holds for approval:
              "policyHash": "0x…", "salt": "0x…" },
  "onError": "closed" }
```

Following head is the low-effort default and the reason this scales to many operators. Pinning
(`follow: { version: "42" }`) means a captured keeper cannot silently expand your blocklist — you
review the diff before bumping. A one-step rollback to a previously accepted version is always
available.

Following head needs freshness controls, or "follow" silently becomes "trust unconditionally". Diff
volume, age, and scope are the three gates.

### Diff volume

`maxAdded` and `maxRemoved` are specified in
[README.md § Diff volume](./README.md#diff-volume-maxadded-and-maxremoved), because they apply to
unpinned local block layers too. What is specific to a followed head is that they are the primary
capture-in-progress detector: a captured keeper's move is either a large anomalous diff or a quiet
scope broadening, and these catch the first.

### Age of the keeper's own publishing

`maxCheckpointAge` — time since the keeper's latest checkpoint. Exceeding it means the keeper has
gone quiet. This is distinct from `maxResolutionAge` (time since *we* last resolved the head), which
is our failure and says nothing about the keeper; README.md covers that one because it applies to
every layer.

"A list that stops publishing is a failure" is only half right: a list whose contents genuinely have
not changed *should* have an old latest version, and treating that as an outage would make every
well-behaved quiet list look broken. So `maxCheckpointAge` is only meaningful against a declared
cadence: **the manifest declares an expected publication cadence, and a keeper who declares one MUST
publish heartbeat versions when nothing has changed** — a new version with identical entries and a
fresh `previous` link, one cheap transaction. A keeper declaring no cadence gets no
`maxCheckpointAge` check, and operators should weigh that when deciding whether to follow their
head.

**Freshness is measured from the checkpoint's block timestamp, never from `publishedAt`.**
`publishedAt` is a keeper-controlled string inside keeper-authored bytes; a keeper who wanted to
look current could simply write a current date. The finalized checkpoint transaction's block
timestamp is **chain-governed rather than keeper-authored** — which is the accurate claim, and
enough. (Not "controlled by nobody in the trust path": this is an L2, and a sequencer has some
bounded latitude over timestamps. That latitude belongs to a party with no stake in a particular
keeper looking fresh, so it does not undermine the check.) The bundle carries `checkpointBlockTime`
for every layer so this can be applied — along with `maxPinAge`, if
[financial-screening.md](./financial-screening.md) is in play — without re-resolving anything.

### Scope: `policyHash` is an approval boundary

**Logging a policy change is necessary but not sufficient.** A captured keeper's cheapest attack is
to broaden their declared scope and add a handful of entries under it: the diff is small, so
`maxAdded` never fires, and the scope change is buried in a document nobody re-reads. So a
follow-head subscription **pins the `policyHash` it accepted**, and a version carrying a different
one **holds the update pending operator approval** rather than applying it. An operator may opt into
automatic scope changes per layer, but that is an explicit choice to trust a keeper's future policy
as well as their present entries, and the two should not be bundled by default. Entry volume and
scope are different risks and deserve different gates.

**`operationalHash` changes never hold an update.** Pinning the whole manifest would make correcting
a typo'd contact address or adding an archival mirror halt every subscriber exactly as loudly as a
scope expansion — which trains operators to click through the hold, destroying the gate that
matters. Operational changes are still logged and still surface in the diff feed. Cadence sits on
the policy side because `maxCheckpointAge` is derived from it, and appeals process does too:
silently removing the appeals route is a policy change wearing operational clothes.

**A salt change is likewise an approval boundary, not a courtesy note.** A new version whose `salt`
differs from the accepted one holds pending approval, exactly like a `policyHash` change. Relying on
the manifest to mention it would leave the one event that invalidates every hashed-entry diff
detectable only by a human reading prose.

### Client mechanics

Resolve head from the indexer's event cache by `(keeper, listId)` topics — the same shape as the
existing `by-cid.ts` resolver — fetch the locator, verify `sha256(canonical bytes) == snapshotHash`.
That verification is what allows snapshots to live on any cheap, untrusted host. Cache in IndexedDB
keyed by `snapshotHash`; snapshots are immutable, so cache indefinitely. All fetching is subject to
the bounds in
[README.md § Fetching untrusted artifacts](./README.md#fetching-untrusted-artifacts).

## Keeper identity, rotation, and compromise

Following head delegates ongoing authority to one address, and the registry is deliberately
admin-less and immutable, so it *cannot* help with identity recovery. That is the right trade-off —
a registry that could reassign a list to a new keeper would be a censorship lever with an owner —
but it makes keeper key management an explicit operational requirement.

For any list presented as a standard one:

- **The keeper should be a smart account or multisig, not an EOA.** Rotation then happens inside the
  account, `(keeper, listId)` is unchanged, and subscribers need do nothing. This is why the design
  keys lists on an address rather than on a public key.
- **The manifest declares the keeper's key-management posture and rotation policy**, so an operator
  deciding whether to follow a head can see what they are trusting.
- **Migration to a new keeper address is manual and by design.** A successor identity is a different
  `(keeper, listId)`, so every subscriber must edit their root. There is no in-protocol successor
  pointer: a "the new keeper is X" record signed by a possibly-compromised key is exactly the
  message an attacker would forge, so honoring it would convert a key compromise into a permanent
  takeover. Migration is announced out of band and completed by each operator deliberately.
- **On suspected compromise the correct move is to stop following, not to wait for a fix.** Operators
  pin to the last version they trust and keep enforcing it. That is least-bad rather than safe: a
  frozen list both misses new entries and keeps enforcing removals the keeper would have made. For
  content actions that is acceptable and alerts; if that list also gates money, the
  [financial-screening.md](./financial-screening.md) rules (hold-for-review rather than
  auto-reject, plus `maxPinAge`) apply from the moment a pin is known to be stale.
- **A compromised keeper cannot rewrite history**, only extend it. Monotonic versions and the
  `previous` chain mean malicious versions are permanently visible, which is what makes
  after-the-fact review possible.

## Availability and the limits of the accountability claim

The chain stores hashes and locators, not bytes. If an HTTPS object disappears and nobody retained a
copy, that snapshot's contents are gone. So the accurate claim is not "the full history of what was
ever blocked is enumerable by anyone", but:

> **Every retained snapshot can be authenticated, and missing historical snapshots are detectable.**

Weaker, but it still does the work: the `previous` chain makes gaps conspicuous, so a keeper who
lets their history evaporate is visibly doing so rather than quietly rewriting it.

To make the stronger claim true in practice, a list presented as a standard one should publish to
content-addressed storage (IPFS) rather than a bare HTTPS origin, and its manifest should name
archival mirrors. Independent archival keepers re-pinning others' snapshots is a cheap, useful
public service and should be encouraged.

## Disclosure: what publishing a list reveals

A public plaintext list of CSAM CIDs is a findability index for the material — the classic hash-list
problem. The answer would be to let an entry carry a salted hash of its subject instead of the
plaintext value.

**v1 does not have this**, and dropped it deliberately
([README.md § Subject canonicalization](./README.md#subject-canonicalization)): it is only meaningful
for published lists, which do not exist yet, and it cost salt management, mixed-form duplicate
detection, and diff semantics across two forms. It belongs here, with publication, and only arrives
when a keeper has a dataset and a threat model that need it.

The construction is recorded so it is not re-derived badly later. An entry carries `value` **or**
`valueHash`, never both, where

```text
valueHash = sha256( "commonality.policy-list/v1/subject" ‖ 0x00 ‖ salt ‖ 0x00 ‖ subjectKey )
```

with `salt` the document's `salt` field (raw bytes, 32 bytes from a CSPRNG, required iff any entry is
hashed and forbidden otherwise) and `subjectKey` its UTF-8 bytes. The domain-separation constant
prevents these digests from being reinterpreted as any other hash in the system, and the `0x00`
separators prevent the concatenation ambiguity in a bare `H(salt‖subject)` — without them a chosen
salt and a chosen subject can produce the same preimage as a different pair. Three consumer rules go
with it: a document may mix hashed and plain entries, since the choice is per-subject sensitivity;
a validator must detect duplicates **across forms**, by hashing each plaintext entry under the salt
and rejecting a match against any `valueHash`, or a list can name a subject twice and a diff will
report a delisting that did not happen; and a subject moving between forms is not a diff change
unless the salt also changed, which is separately an approval boundary
([§ Scope](#scope-policyhash-is-an-approval-boundary)).

Whatever it is worth, be exact about what it buys. **This is findability reduction and
pseudonymization, not confidentiality**, and the spec should not
pretend otherwise. The salt is public, so anyone can hash a dictionary against it. That defeats
casual browsing of high-entropy preimages like CIDs, but it does **not** conceal low-entropy or
enumerable subjects: named channels, wallets, and well-known project addresses all fall to a
dictionary attack in seconds.

This is a genuine tension with no clean resolution: public verifiability and confidential list
contents are close to mutually exclusive by construction. This design deliberately chooses
verifiability, because the censorship risk it guards against is the one we can actually do something
about architecturally. A list that must truly stay confidential does not belong in this system — it
belongs behind an operator-run service with contractual access control, which an operator's root can
reference as a local source without publishing it.

## Deferred: published recursive compositions

Snapshots that are themselves `block`/`allow` compositions over other lists — a third-party curator
publishing `[block StandardList, allow MyCorrections]` as one subscribable object, so many operators
consume one checkpoint instead of each maintaining corrections — are **deferred to a future schema
version**, not discarded. The schema is versioned and consumers hard-reject documents they do not
fully understand, so a v1 consumer meeting a v2 composition fails safe and visibly. The cost of
adding composition later is a version bump; the cost of freezing it now is committing to a recursive
policy language before anyone has published a single list in it — and its semantics were wrong
through two revisions ([design-history.md](./design-history.md)).

Three constraints are recorded here because they are what would make compositions worth publishing
at all, and they are easy to get wrong:

- **A published composition MUST pin every reference** by `(chainId, registry, keeper, listId,
  version, snapshotHash)`, at every depth. Only an unpublished root may follow a head. Because
  children are pinned, any third party can recompute a composed list from its children and verify
  the published result — and a curator who bumps their upstream pins produces a new on-chain
  version, so "started following a new upstream" is itself permanently logged.
- **A composition whose children contain `valueHash` entries MUST NOT publish a materialized
  `flattened` output.** Salts are per-list, so hashed entries from two children are not in the same
  namespace and cannot be unioned; and a compositor that *could* flatten them would have to know
  their preimages, whose publication would disclose exactly what the child chose to hash.
- Evaluators will need a cycle check and a depth cap of 8, and a published composition whose child
  is unavailable is **invalid**, not partially applied — only the operator's own root gets to decide
  fail-open/fail-stale behavior, because only the operator is the legally responsible party.

## Deferred: authenticated absence for large lists

For large lists a client cannot always download everything, and the naive fix — a lookup API plus
Merkle inclusion proofs — is backwards for this problem. Blocking's safety-critical direction is
proving a subject is **not** listed: a lazy or malicious lookup service simply omits a match, and
the content renders. An inclusion proof cannot detect that.

So any partial-download scheme MUST provide verifiable non-inclusion — a sparse Merkle tree or other
authenticated dictionary, an ordered Merkle set with non-inclusion proofs, or complete
independently-downloaded chunks covering the queried key range.

There is also a privacy cost: asking a third-party service "is this CID blocked?" reveals what the
visitor is reading, which cuts against [privacy.md](/specs/product/legal/privacy.md). Prefer bulk
local evaluation, or a lookup service the operator runs themselves.

Given both, **defer this entirely until real list sizes require it.** Full download with local
evaluation is correct, private, and simple.
