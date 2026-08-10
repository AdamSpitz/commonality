# Policy lists: subscribable policy blocklists

Status: **proposed; local foundation substantially implemented, Civility starter-profile integration next** (Aug 2026). Design for generalizing the existing per-UI display denylist into interoperable, subscribable, verifiable lists. The machinery remains generic shared SDK/operator infrastructure; Civility is the first complete reference integration, not a source of vertical-specific policy semantics. Do not treat the SDK foundation as active enforcement until Civility passes the cross-surface stopping gate in the [implementation plan](./implementation-plan.md).

What this is, stated precisely so nobody plans around a stronger claim:

> **Transparent distribution and composition infrastructure for exact-identifier policy
> decisions.** It lets a vertical operator reuse someone else's takedown work instead of
> originating all of it, while remaining ultimately in control of what their site suppresses.
> It does not give an operator compliance for free.

**This document is the normative v1 spec, and v1 is deliberately small: content enforcement only.**
Subject identity, the operator's local policy format, the content action taxonomy, the evaluator,
and the resolved bundle. All of it is worth building for a single operator with a hand-maintained
JSON file, and none of it needs a chain.

Three things this design will eventually want are **out of v1 on purpose**, each in its own
document, none of them normative yet:

| Deferred | Where | Why not v1 |
|---|---|---|
| Financial screening — gating claims and gas sponsorship on list membership | [financial-screening.md](./financial-screening.md) | Money decisions have inverted failure rules (hold, never auto-reject) and drag in most of the operational machinery. They need a concrete provider and a review workflow first, not a schema. |
| Publication — on-chain registry, canonical wire format, manifests, head-following | [registry.md](./registry.md) | Checkpointed third-party subscription earns its keep only when a real second keeper or operator exists to interoperate with. |
| Admission ("show only the listed subjects") | § Evaluation semantics, stage 4 | A separate evaluation profile in which every failure rule here inverts. |

**Cutting v1 this way is the point of the current draft.** An earlier version specified all of it as
one normative design; that produced a coherent architecture nobody could build in one go. What is
below is the subset that solves the immediate architectural problem — reuse another operator's
takedown work, across every surface that displays or serves content — and nothing else.

Note the sequencing consequence up front: **this design must not gate the immediate legal
requirement.** See [§ What it would take](#what-it-would-take).

Design history and rejected alternatives live in [design-history.md](./design-history.md); this
document is the normative spec. The resumable engineering checklist is
[implementation-plan.md](./implementation-plan.md); it tracks execution without changing the rules
specified here.

Context: [operator-posture.md](/specs/product/ui-operator-posture.md) (the protocol stays neutral;
each front door owns its display policy), [published-data/README.md](../published-data/README.md)
§ "Honored retractors" (the primitive this builds on), and
[legal/README.md](/specs/product/legal/README.md) "Before mainnet" item 3 (the capability exists;
the *operation* does not).

## The problem

The architecture expects many independently-operated vertical sites. Each is legally responsible
for what it displays, and each must be able to take down the usual illegal material (CSAM, NCII,
terrorist content, sanctioned parties). We do not want every vertical operator to build a
moderation department in order to launch — but we also refuse to make suppression a protocol-level
lever that anyone can pull on everyone.

So: **the vertical operator decides what their site blocks, but the default path is to subscribe to
lists maintained by others.** The result a site suppresses is derived from what its subscribed
lists assert, filtered and overridden by the operator's own policy.

What this reduces is *integration* burden. It does not make compliance free: an operator still
needs a reporting address, someone on call, an appeals process, a legal policy, and — as
[§ What this does not solve](#what-this-does-not-solve-real-world-safety-lists) explains — a
relationship with whoever maintains a usable dataset.

## What exists today

| Layer | Blocking | Notes |
|---|---|---|
| Contracts | **None.** `PublishedData.retractData(bytes32)` lets *any* address retract *any* dataId; the contract stores the bit and expresses no opinion. No admin, no takedown. | Correct and to be preserved — [operator-posture.md](/specs/product/ui-operator-posture.md) § "Keep contract-layer neutrality". |
| Indexer | **None.** Serves everything it indexes. | The serving-layer filter contemplated in [published-data/README.md](../published-data/README.md) § "Denylist takedown: filter, don't purge" is unbuilt. |
| SDK | `DisplayPolicy { honoredRetractors }` → `by-cid.ts` resolver. Defaults honor only a publisher's self-retraction. | Per-caller policy, not enforcement. |
| UI | `ui/src/shared/config/displayDenylist.ts` — one runtime-fetched JSON at `VITE_DISPLAY_DENYLIST_URL` giving `{ deniedCids, honoredRetractors }`. | Deliberately runtime-fetched, never baked into the immutable IPFS bundle ([ADR 0004](/specs/decisions/0004-user-publishes-displayable-data.md)). |
| platform-api-service | `BLOCKED_CHANNEL_IDS` (`config.ts`, enforced `service.ts` → 403 `blocked_identity`). | The one non-UI blocklist. Gates *money claiming* by platform identity, not display — a different kind of decision, and **v1 leaves it exactly as it is** ([financial-screening.md](./financial-screening.md)). |

`honoredRetractors` is already most of what we want: permissionless, on-chain, per-display-layer
choice, composes by union, and permanently logged so a censor cannot lie. Four gaps:

1. **No composition.** `deniedCids` comes from exactly one URL; there is no notion of multiple
   sources, per-source scoping, or operator override.
2. **Cost.** One transaction per blocked item. A real hashlist is six figures of entries.
3. **Coverage.** Everything is CID-shaped. Verticals also need to block project addresses,
   content-funding contracts, channel IDs, and wallets. No subject-type taxonomy exists.
4. **No unblock.** `retractData` is a one-way bit. Mistakes are permanent.

Gaps 1, 3, and 4 are addressed here. Gap 2 is what the checkpointed snapshot in
[registry.md](./registry.md) is for.

## One object type: the policy list

There is a single object, the **policy list**: a **leaf** of literal entries. Composition happens
in the *subscriber's* configuration, which is not published (§ The operator's root). A leaf may be
a local file the operator maintains, or a checkpointed snapshot someone else published
([registry.md](./registry.md)) — the entry format is identical either way, so a hand-maintained
list becomes a published one by adding fields, not by converting a format.

"Blocklist" and "exception list" are informal roles, not distinct types: a list is an exception
list when a subscriber attaches it to a block layer as an `except`. The same object can serve
either role for different subscribers, which is what makes third-party corrections work without a
second object type.

**v1 specifies blocklists and scoped exceptions, not allowlists.** Evaluation starts from
*unlisted*, and an exception only subtracts from the layer it is attached to. Admission-style
allowlisting ("show only the listed subjects") is a **separate evaluation profile**, deferred — not
a claim that nobody wants one. [operator-posture.md](/specs/product/ui-operator-posture.md)
§ "Indexer posture" names real admission cases: curated project sets, recognized factories, a
community indexing its own allowlisted projects. The deployment boundary and proposed sequencing
are specified in [operator-scoped indexer deployments](../../indexer/operator-scoped-deployments.md).

What makes admission a different profile is that **every operational rule in this spec inverts.** A
block layer that fails to fetch under-blocks, which is why `onError: closed` falls back to a cached
snapshot; an admission layer that fails to fetch admits *nothing*, so the same fallback is a
site-wide outage. Staleness inverts too: "keep enforcing the last-known-good document" is the safe
answer for a blocklist and the *unsafe* one for an admission list, which would keep admitting
subjects the operator has since removed. Freshness thresholds, `onError`, and diff thresholds would
all need re-deriving. Bundling that into the same evaluator to save a schema is how you get an
admission list enforced under blocklist failure semantics. It has a
roadmap stage of its own (§ What it would take); whether it lands before the registry is a product
question (§ Risks).

What v1 does commit to is that **the leaf stays semantically neutral**: a list asserts that a
subject is listed and says nothing about the consequence (§ Assertions vs. actions). So an
admission profile, when it arrives, reuses the same documents, subject keys, and identity — only
the evaluator and its failure rules are new. Until then, the word "allowlist" should not be used
for these objects; an `except` is not one.

## Subject canonicalization

Membership is an equality test on subjects, so subject identity is as much of an interop boundary
as any hash. Each subject canonicalizes to a **subject key**, a UTF-8 string; two subjects are the
same subject exactly when their keys are byte-equal.

| Type | Key | Notes |
|---|---|---|
| `cid` | `cid:` ‖ CIDv1, base32, raw codec, sha2-256 multihash | Re-encoding between representations of this multihash is normalization; see below. |
| `address` | `address:` ‖ decimal `chainId` ‖ `:` ‖ lowercase `0x` hex | `chainId` is **required**; an address is only meaningful per chain. |
| `channel` | `channel:` ‖ `platform:kind:id`, platform and kind lowercased ASCII, `id` byte-exact | `id` is *not* case-folded — it is an opaque platform identifier, and folding it would merge distinct accounts on case-sensitive platforms. |

**`publishedDataId` and `statement` are not separate subject types.** `PublishedData` derives
`dataId = sha256(content)` and the codebase already picked the fixed-hash CID format to match it,
so a `publishedDataId` is a CIDv1 over the same digest — the same subject reached by a different
encoding, and two names for it would let a list block content under one spelling and appear not to
block it under the other. Statements are displayable documents identified by their CID, so they are
likewise `cid` subjects. Publishers holding a bare `bytes32` dataId convert it using the existing
`publishedDataIdToCid` / `publishedDataCidToId` helpers
([published-data/README.md](../published-data/README.md) item 4); the conversion is total and
lossless both ways, which is precisely why two subject types would be redundant.

The taxonomy is therefore **`cid`, `address`, `channel`**, plus the reserved `fingerprint` type of
[§ What this does not solve](#what-this-does-not-solve-real-world-safety-lists).

**Only sha2-256 CIDs are normalizable.** Converting a blake3 or dag-pb CID into the sha2-256 raw
identity requires the underlying bytes, which a list publisher generally does not have. So a CID
entry whose multihash is not sha2-256, or whose codec is not `raw`, is **rejected at validation**
rather than stored in some other form and silently failing to match.

**Unknown subject types are a hard rejection, not a skip.** A validator that ignores entries it
does not understand fails open on exactly the entries a newer keeper considered important enough to
add. A consumer encountering an unknown `type` MUST treat the whole document as invalid and apply
the layer's `onError` behavior. The consequence — adding a subject type is a breaking change, full
stop — is why the set should grow rarely and deliberately.

**Duplicates are invalid.** Two entries with equal subject keys are a rejection rather than a
silent merge, because the merge rule for their differing `reason` fields would be arbitrary and
duplicates are always a tooling bug.

**Every subject value is plaintext.** There is no hashed form: a salted `valueHash` alternative
only matters for *published* lists, and it bought findability reduction rather than confidentiality
even there. The construction and its consumer rules are preserved in
[registry.md § Disclosure](./registry.md#disclosure-what-publishing-a-list-reveals), to be adopted
when a real keeper has a dataset that needs them. Until then, a source that cannot be published in
the clear is an operator-local service, not a policy list.

## Entries and documents

An entry is a subject plus optional advisory metadata:

```jsonc
{ "subject": { "type": "cid",     "value": "bafy…" },           "reason": "court-order-2026-0412" }
{ "subject": { "type": "address", "value": "0x…", "chainId": "8453" } }
{ "subject": { "type": "channel", "value": "twitter:uid:123" }, "reason": "impersonation report" }
```

A **local list document** is the operator's own file:

```jsonc
{
  "schema": "commonality.policy-list-local/v1",
  "entries": [ /* as above */ ]
}
```

`keeper`, `listId`, `version`, `previous`, and `manifest` are **forbidden** here, not optional. A
local file has no checkpoint for a validator to check identity against, so carrying identity fields
would mean either ignoring them — inviting a file that claims to be someone's list and is not — or
inventing a validation rule for a claim nothing backs. A checkpointed snapshot
([registry.md](./registry.md)) is this document plus those fields; everything else is identical.

**A local document's identity is `sha256` of its canonical bytes.** That is the `contentHash` the
bundle records (§ The resolved policy bundle).

### Canonical serialization

All documents in this design — local lists, roots, bundles, and (later) published snapshots —
serialize with **JSON Canonicalization Scheme (RFC 8785)**, UTF-8, and hash with `sha256`. Without
a normative rule, two honest implementations disagree on the hash and verification becomes a coin
flip.

**Strict parsing before canonicalization.** Implementations MUST reject duplicate object keys,
trailing data, and non-UTF-8 input rather than letting a permissive parser pick a winner. Two
parsers disagreeing about which duplicate key wins produce two different canonical serializations
of "the same" document — a parser-differential attack against the one thing the hash is supposed to
settle.

### Wire format rules

Unspecified widths and optionality are how two conformant implementations end up disagreeing.
[registry.md](./registry.md#checkpoint-only-wire-format-rules) adds rules for the fields that exist
only in checkpointed snapshots.

| Field | Rule |
|---|---|
| `address` subject `value` | exactly 20 bytes, lowercase `0x` hex, 42 chars |
| `contentHash`, bundle `digest` | exactly 32 bytes, lowercase `0x` hex, 66 chars |
| `chainId`, `sequence`, and any `version` carried into a bundle | canonical decimal string: no sign, no leading zeros. Never a JSON number: JCS uses the ECMAScript number model, and neither `uint64` nor the chain-id space is bounded by `Number.MAX_SAFE_INTEGER` |
| `maxAdded`, `maxRemoved`, `maxDiff` | canonical decimal-string `uint64` (`0` through `18446744073709551615`). `maxDiff` is input shorthand for setting both directional limits and MUST NOT be combined with either explicit field. Resolved bundles carry only `maxAdded` / `maxRemoved`. |
| channel `value` | `platform:kind:id`; `platform` and `kind` are non-empty visible ASCII excluding `:`, and canonicalize to lowercase; `id` is a non-empty valid-Unicode string preserved byte-for-byte and may contain `:` |
| timestamps (`checkpointBlockTime`) | RFC 3339 UTC with a literal `Z`, second precision, no offset forms |
| durations (`maxResolutionAge`) | ISO 8601 duration, date and time components only — `PT1H`, `PT48H`, `P1D`. No `Y` or `M` components, since neither has a fixed length and a freshness threshold that varies by month is a bug |
| `source` | a `file:` or `https:` locator; operator-local config |
| `reason` | UTF-8, ≤ 512 bytes, advisory (§ One list, one reason) |
| layer `id` | `[a-z0-9][a-z0-9-]{0,63}`, unique within a root; operator-local, never published |

- **Unknown fields are rejected, not ignored**, for the same reason as unknown subject types.
  Forward compatibility comes from the schema version, not from lenient parsing.
- **All hashes in this system are sha256.** There is no algorithm agility field, and adding one
  would be a schema bump.
- **`null` is never a legal value; absence is the only way to express absence.** JCS serializes
  `null` and an omitted key differently, so permitting both gives every optional field two
  encodings with one meaning and two different hashes. Where a threshold's absence means "no
  check", that is stated at the field, never signalled by `null`.
- **Every subject carries a plaintext `value`.** There is no hashed form in v1, so duplicate
  detection is a plain subject-key comparison and diffs are set differences over subject keys.

## One list, one reason — no category dimension

**Entries carry no category, tag, or class, and there is no category dimension anywhere in the
design.** Granularity is the list: a keeper who classifies their entries publishes one list per
class, and **an operator subscribes to whichever leaves they want, as separate layers.** This buys
the same expressiveness as categories with no shared vocabulary that keepers would have to mean the
same thing by, and it is what lets provenance be structural — a correction attaches to one layer,
and the evaluator enforces that scope. See [design-history.md](./design-history.md) § "Rejected: a
category dimension" for what it cost.

Entries may carry a free-text `reason` (a policy code, a ticket, a court-order reference). It is
**advisory metadata for human display and appeals, never an evaluation or subscription input** — it
exists so a suppression notice can say why, and so an appeal has something to name.

**`reason` should be a reference, not an allegation.** A policy code, ticket id, or court-order
number — not "operates a scam targeting elderly donors", and never personal information about the
listed party. Published, permanently checkpointed, and irretrievable once mirrored, so prose
accusations create a defamation surface with no delete button (§ Risks), and doing so about a
natural person invites the data-protection problem [privacy.md](/specs/product/legal/privacy.md) is
concerned with. Validators cannot enforce this — it is free text by construction — so it is a
commitment a keeper makes and a reviewer can check.

## Assertions vs. actions

**Lists assert that a subject is listed. Lists do not decide what happens as a result.** The
mapping from assertion to consequence belongs to the operator, and is keyed by the list:

```text
(subject type, list) → suppress display
(subject type, list) → exclude from aggregation
(subject type, list) → refuse metadata fetch / stop serving bytes
```

This separation is load-bearing. Rendering, aggregation, and serving are materially different
decisions; a single `isBlocked(subject)` answer shared across them means a keeper of a spam list
silently acquires powers nobody granted. It also muddies the legal posture this whole design is
for: the operator must own the enforcement decision, not inherit it implicitly from whichever list
they subscribed to.

**v1's action set is these three, and it is closed.** The same reasoning that separates assertion
from action is what puts money outside v1 altogether: `reject-claim` and `refuse-gas-sponsorship`
are *so* different in their failure behavior — a stale input must hold rather than decide, in either
direction — that sharing an evaluator with display would mean either running display under
money-grade rules or running money under display-grade ones. Both are wrong.
[financial-screening.md](./financial-screening.md) carries that design. Until it lands,
`platform-api-service` keeps its existing `BLOCKED_CHANNEL_IDS` unchanged, and **no policy list can
affect anyone's money**, which is a stronger and simpler guarantee than any mapping rule.

**No action has a default.**

- **The action map, not a document's contents, decides what a layer governs.** A mapping is a set
  of `(layer, subject type, action)` triples. The array form (`"standard-illegal": ["suppress"]`)
  is input shorthand expanding to every subject type that action's extractors can yield; the long
  form (`"our-editorial": { "cid": ["suppress"] }`) names them explicitly, and the bundle
  canonicalizes to the long form. Deriving governance from what a layer's current document happens
  to contain would make the answer change under the operator when a keeper adds a subject type —
  and would make it unanswerable for exactly the case that needs it most, a layer whose document is
  stale.
- A surface skips actions for subject types it cannot act on — an aggregation path has nothing to
  do with a `channel` subject — and this is a no-op, not an error. But **an explicitly written
  triple must be one some extractor can produce**: `{ "channel": ["refuse-serve"] }` is a startup
  error, because that action's extractor yields only CIDs. A triple that can never fire is an
  operator who believes they configured a protection they do not have.
- **An unmapped `block` layer is a startup error, not a no-op.** A layer present in the root but
  named by no action is either a typo or a subscription the operator forgot to wire up; failing
  open on it is the failure mode this whole section exists to prevent. The correspondence runs both
  ways: every `block` layer is named, and every name resolves to a `block` layer. An `except` is
  not a layer and is neither named nor nameable — it asserts nothing, so there is nothing for an
  action to key on.
- Suppressing display without excluding from aggregation **is** a permitted combination — it is
  what "hidden but still counted" means, and there are legitimate uses (a subject under appeal).
  But it is a footgun with respect to
  [published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2, so tooling
  should warn, and any mandatory-compliance layer should carry both.
- Validation runs at startup and **fails the process**, not the request. A vertical that boots with
  an invalid policy profile and serves traffic is worse than one that refuses to boot.

### Each action declares a subject extractor

An action is not "check the subject" — a request usually carries several. A rendered item involves a
content CID, a publisher address, and a project contract, and "suppress display" has to say *which
of those* it tests. Left to the call sites, three surfaces will answer differently, and the
differences will be invisible until one of them renders a subject another would have hidden.

So every action is defined as an operation over an explicitly declared **extractor**: a total
function from a request to the set of subjects that request contains.

```text
suppress / exclude-aggregation:
                  item.cid              → cid subject
                  item.publisher        → address subject
                  item.projectContract  → address subject
                  item.channel          → channel subject   (where the item names one)
refuse-serve:     request.cid           → cid subject
```

The action fires if **any** extracted subject is asserted by a layer mapped to that action. The
extractor is part of the spec, not per-surface glue, for the same reason the evaluator is shared: a
surface that omits `publisher` from its extraction has silently narrowed the operator's policy
without changing a line of policy config.

**Extraction is not propagation.** The extractor enumerates subjects the request *already
contains*. Propagation would derive *new* subjects from relationships between them (block a wallet,
therefore block its projects), which v1 does not do (§ Evaluation semantics).

The extractor also gives "which requests does this layer govern?" a mechanical answer:

> **A layer governs a request for a given action exactly when the action map contains a
> `(layer, subject type, action)` triple whose extractor yields at least one subject of that type
> from that request.**

Both halves are static config plus the request in hand — nothing is read from the layer's current
document. v1 uses this to validate the action map and to report scope; it is load-bearing for
[financial-screening.md](./financial-screening.md), where "what does a stale layer hold?" cannot be
answered from a document that is by definition untrustworthy.

## Evaluation semantics

**v1 has no `allow` op, no `protect`, and no recursion.** A root is a flat set of `block` layers,
each of which may carry an `except` reference:

```jsonc
{ "id": "standard-csam", "ref": { "…": "…" }, "op": "block",
  "except": { "ref": { "…": "…" } } }
```

Per subject, per layer: the layer **asserts** the subject iff its `ref` lists the subject and its
`except` does not. The root's result is the set of layers that assert the subject; the subject is
listed iff that set is non-empty. That is the whole language.

The set — not a boolean — is what the action profile consumes and what a suppression notice cites.
An exception can only ever cancel the layer it is attached to, so the cross-provenance pardon that
broke an earlier draft is unrepresentable rather than merely discouraged. Why `except` per layer
rather than a general `allow` op, including the rejected `appliesTo` alternative:
[design-history.md](./design-history.md).

**No implicit propagation.** An entry affects **only the exact canonical subject named**. Blocking
a wallet does not block the projects it created; blocking a project contract does not block its
metadata CID, its token CIDs, or its funding portal; blocking a channel does not block content
contracts naming it. Any such spread requires an explicitly named propagation rule, which is
operator-local, out of scope for v1, and never something a list can turn on for them.

Defaulting to *no* propagation is the safer side of a genuinely two-sided risk. No propagation
makes some takedowns evadable by re-pointing at a fresh address; implicit propagation turns one
entry into a suppression radius nobody reviewed and nobody can enumerate from the list. The
asymmetry is that under-blocking is visible to the operator who is legally responsible for it and
is fixed by adding entries, whereas over-blocking is invisible to everyone except the person
silently erased. Keepers who want broader suppression publish the related subjects explicitly,
where they are diffable, appealable, and attributable.

**Layer order carries no semantics.** Layers are evaluated independently and the result is a set,
so no layer can shadow, override, or short-circuit another. Configuration order is preserved only
so that the asserting set is reported in a stable order in notices and logs.

Since `ref` and `except` name leaves in v1, the reference graph is one level deep by construction —
no cycle detection, no depth cap. Both would be needed by the deferred published compositions
([registry.md](./registry.md#deferred-published-recursive-compositions)).

## The operator's root

The operator's configuration is the root, and it is **not published** — it is local config, so it
freezes no interop contract and is the one place head-following is allowed:

```jsonc
{
  "schema": "commonality.policy-root/v1",
  "layers": [
    { "id": "standard-illegal",
      "ref": { "source": "https://lists.example.org/standard-illegal.json",
               "contentHash": "0x…" },
      "op": "block",
      "except": { "ref": { "source": "file:./csam-appeals.json", "contentHash": "0x…" } },
      "maxResolutionAge": "PT1H",
      "onError": "closed" },
    { "id": "our-editorial",
      "ref": { "source": "file:./editorial.json" },
      "op": "block",
      "onError": "closed" }
  ],
  "actions": {
    "standard-illegal": ["suppress","exclude-aggregation","refuse-serve"],
    "our-editorial":    ["suppress"]
  },
  "honoredRetractors": ["0x…"]
}
```

Layer entries are `{ id, ref, op: "block", except?, maxResolutionAge?, onError }`. Layers carry a
local `id` purely so the action profile can name them. `onError` has no default: a layer that omits
it is a configuration error, since the whole point of § Error behavior is that failing open must be
chosen rather than inherited. The root parses under the same strict rules and unknown-field
rejection as everything else, and is validated at startup against § Assertions vs. actions.

**Every `ref` in v1 is a local one** — a `file:` or `https:` locator the operator chose. Checkpointed
refs and the `follow` block that goes with them (head-following, diff thresholds, scope pinning) are
[registry.md](./registry.md), stage 5, and add fields to this shape rather than changing it.

Note what the example does *not* have: a free-floating correction layer. Corrections attach to the
layer they correct, and that is the only way to write one. **Only assertion layers take actions** —
an `except` is not a layer, takes no actions, and cannot be named.

**The layer set and the action map must correspond exactly.** An action naming a layer `id` that
does not exist is a hard configuration error, and so is a layer no action names. A typo in the
operator's own mandatory subscription would otherwise fail open on exactly the list that must never
fail open.

### Two kinds of `ref`, discriminated by shape and never mixed

A layer or `except` names either a local document or a checkpointed list, and exactly one of these
forms is present:

| Form | Keys | Meaning |
|---|---|---|
| local | `source` (a `file:` or `https:` locator), optionally `contentHash` | fetched directly; `follow`, `policyHash`, and `maxCheckpointAge` are configuration errors here, because there is no checkpoint to follow or age |
| checkpointed | `chainId`, `registry`, `keeper`, `listId` | **not in v1** — resolved through the registry, may carry `follow` ([registry.md](./registry.md)) |

If the root pins `contentHash`, bytes that hash differently make the ref **unresolvable** and
`onError` applies — mutable URL, immutable expectation. If it does not pin one, the fetched bytes'
hash still lands in the bundle, so a change is visible as a digest change rather than an invisible
policy edit.

**An `except` ref must be local and must pin `contentHash`.** An independently mutable exception has
no error semantics that work: carry a stale one forward and it keeps pardoning a subject the
operator has since *removed* from the exception list (under-blocking, silently); drop it and the
layer over-blocks. Pinning sidesteps the question entirely — a pinned exception either resolves to
exactly the expected bytes or is unresolvable, and changing one is an explicit root edit and
therefore a new bundle.

The cost is that the third-party corrections list [§ Risks](#risks-and-open-questions) wants as an
escape hatch from keeper capture is not available in v1. It needs a freshness design of its own, and
waits for the registry that would deliver it.

The exhaustive schemas and test vectors for the root and the local document are a stage-1
deliverable (§ What it would take) rather than more prose here.

### The evaluator's two APIs

A single "is this subject listed?" call is the wrong shape, because the decisions surfaces actually
make are per *action* over a request carrying several subjects, and folding that into a
per-subject result pushes the extractor back out to the call sites § Each action declares a subject
extractor just took it away from. So the evaluator exposes two entry points, and surfaces call the
second:

```text
lookup(subject)            -> { assertedBy: layerId[], digest }
evaluate(action, request)  -> { decision: "allow" | "block",
                                assertedBy:  layerId[],      // the layers that decided it
                                subjects:    subject[],      // what the extractor produced
                                digest, status }
```

`lookup` is the membership primitive: the asserting set for one canonical subject, with provenance.
It is what a diff viewer, an appeals tool, or a "why is this hidden?" page calls.

`evaluate` is the enforcement API. It runs the action's declared extractor over the request, calls
`lookup` for each extracted subject, and blocks if any subject is asserted by a layer mapped to that
action. Returning the decisive layers *and* the extracted subjects is what makes a suppression
notice specific ("hidden because layer `standard-illegal` lists this content CID") rather than
merely true.

**Neither returns a bare boolean**, for the reason § Assertions vs. actions gives: a caller that
wants one takes `decision === "block"`, which keeps the collapse at the call site where it is
visible. `status` is the surface's own `current`/`stale`/`unavailable` (§ Activation), reported so a
caller can tell "allowed under a current policy" from "allowed under a policy we could not refresh
for a day". [financial-screening.md](./financial-screening.md) extends `decision` with `hold`;
v1 has no such state, and the two-value enum is deliberately widened there rather than here.

## Freshness and staleness

Every layer's data has an age. **In v1 there is exactly one rule for what to do about it:**

> **Keep enforcing the last-known-good document, and alert.**

That is the whole freshness model, and it is short because v1's actions are all content actions,
where both error directions are recoverable and reversible. Refusing to render because the blocklist
is a week old is an outage caused by the safety mechanism, with no safety benefit. So staleness
**alerts**; it never changes a decision.

The consequence is worth stating, because a lot of machinery hangs off it: **freshness is not
evaluation input.** It therefore does not have to reach every surface identically, which is what
lets the bundle be the only published artifact. The resolver — one process, server-side — watches
source health and alerts; surfaces enforce bundles and report which digest they hold (§ Activation).
Nothing else needs to know.

**The rule is different for money, which is why money is a different document.** A stale sanctions
list withholds someone's payment on the authority of a judgment that may already have been reversed,
so it must hold for review rather than decide — and *that* forces per-surface freshness agreement,
hold state, and a mutable status artifact. [financial-screening.md](./financial-screening.md)
carries all of it. Keeping it out of v1 is what lets the rule above be one sentence.

### Staleness is not one-directional

Even though staleness does not change a v1 decision, it must not be dismissed as harmless, because
the intuitive reason for dismissing it is wrong. It is tempting to think a stale document can only
*under*-block, so caching one forever is safe. It is not: a stale document also **over-blocks**,
retaining entries the keeper has since removed — corrected false positives, granted appeals,
delisted targets. Removal is exactly what this design added over one-way `retractData`, so treating
a stale list as harmless discards the benefit and quietly re-creates the "mistakes are permanent"
gap.

So `maxResolutionAge` is a real threshold with a real alert behind it, not a formality. It measures
time since *we* last successfully resolved the layer; exceeding it is **our** failure (indexer down,
network broken) and says nothing about the source.

### Diff volume: `maxAdded` and `maxRemoved`

These matter in v1 for one specific case: a layer whose `ref` is an `https:` source with **no
pinned `contentHash`** — which is precisely how an operator subscribes to someone else's list before
the registry exists. Such a source can change under the operator at any time, and `maxAdded` /
`maxRemoved` are the only guard on that path. A pinned or `file:` layer changes only when the
operator edits the root, so the thresholds are optional there.

A single `maxDiff` number conflates the two events an operator cares about most differently: mass
additions are an over-blocking attack, mass removals are a keeper quietly undoing corrections or
being coerced into unblocking. So a layer declares them separately, and either alone can hold.
(`maxDiff` as one number remains legal shorthand for setting both.)

A candidate exceeding either threshold is **held**: the resolver keeps the last accepted version in
the bundle, does not adopt the candidate, and alerts a human to review the diff. Two rules keep the
gate from being walked around:

- **The comparison is against the last operator-accepted subject set, not the previously fetched
  one.** Diffing against whatever arrived most recently would let a source walk past any threshold
  in increments, which is the whole attack. The gate that matters is how far the candidate has moved
  from what is actually being enforced.
- **A held candidate stays held; later fetches do not clear it.** Accepting the newest candidate
  accepts everything since the last acceptance, in one decision. Auto-clearing a hold because
  something *newer* arrived would make the gate trivially bypassable by publishing twice.

Counting is a subject-key set difference — added is (candidate ∖ accepted), removed is (accepted ∖
candidate). **`reason`-only changes count toward neither threshold** but appear in the review diff:
a corrected ticket reference should not consume an operator's attention budget, while a rewritten
justification for an existing entry is something a reviewer should see.

## Error behavior

The current implementation fails open — a fetch error logs a warning and renders everything. That
is the wrong default for a mandatory list. Each layer declares `onError`, and v1 has two values:

- `closed` (recommended for mandatory block layers) — the resolver **carries the layer's last
  verified artifact forward** into the new bundle and records it as carried forward, so the layer
  keeps being enforced under the freshness rule above. Only where there is no verified artifact for
  that layer at all is the layer emitted as unresolved, and a surface then degrades to refusing to
  render unverified content for the actions mapped to it.
- `open` — the resolver emits a bundle **without** this layer. Because the layer's absence changes
  the bundle contents, it changes the digest: failing open is a visible, recorded event.

A third value, `hold`, exists only in [financial-screening.md](./financial-screening.md), where
"neither decide nor fail" is a coherent answer because there is a human queue behind it. There is no
such queue for a page render, so v1 does not offer it.

**`onError` is per-layer resolver behavior, not per-request behavior.** It decides what a resolver
puts in the next bundle for an input it could not freshly verify, and what a surface does when a
bundle marks a layer unresolved. A surface never discovers mid-request that a layer is unfetchable,
because a surface never fetches layers — it enforces an already-complete, already-activated bundle.
Per-request error handling is how the same policy ends up enforced differently on two surfaces, or
differently on the same surface a second apart.

**One flaky source must not freeze every other layer.** `onError` applies per layer at resolution
time and the resolver always emits a *complete* bundle, so an unreachable appeals host does not
hold back an urgent addition to an unrelated blocklist. This is not a hole in atomicity: the
resolver materializes the exact combination it chose — fresh layers at their new versions,
carried-forward layers at their old ones — and the digest names that combination. What remains
all-or-nothing is *activation*.

An **`except` that cannot be resolved never blocks the emission of a bundle**, and this asymmetry
is deliberate: an ignored exception over-blocks, which is recoverable and visible, while a dropped
block layer under-blocks. Since v1 exceptions are content-hash-pinned (§ Two kinds of `ref`), an
unresolvable one means the bytes are missing or wrong rather than merely changed, so the resolver
carries forward the last verified copy if it has one and emits the bundle without it if it does not.
Either way a persistently unresolvable `except` alerts, because a silently ignored exception is
exactly how a granted appeal stops being honored. What it may *not* do is vary during evaluation.

## Where evaluation runs

Policy evaluation is **one shared evaluator running one resolved policy**, not a browser feature. A
client-side check can suppress rendering, but it cannot stop the operator's own API from serving
prohibited bytes and cannot refuse a metadata fetch.

| Surface | Enforces | Runs |
|---|---|---|
| UI render paths | suppress display | Browser (SDK evaluator) |
| SDK fold/aggregation | exclude from counts | Browser — aggregation is client-side by design ([tech/README.md](/specs/tech/README.md) § client-side folding), so this is genuinely the right place |
| Indexer/API serving filter | stop serving bytes for a CID | Server |

The same evaluator implementation and the same resolved policy must back all three, or the layers
disagree and the weakest one defines actual behavior.

Two further surfaces — `platform-api-service` (claims) and the paymaster
([sponsored-gas.md](/specs/tech/sponsored-gas.md)) — are money surfaces and are **not** v1 policy
consumers. They keep their current ad-hoc configuration
([financial-screening.md](./financial-screening.md)). Dropping from five surfaces to three is most
of why stages 2–3 shrink below.

### The resolved policy bundle

"One canonical policy version" is not a thing that exists: a root resolving several
independently-changing sources has no single version number, and browser and server caches cannot
be simultaneous anyway. The fix is not a digest each surface computes for itself — it is a single
immutable artifact every surface consumes.

**The operator resolves once and publishes a resolved policy bundle** to its own surfaces:

```jsonc
{
  "schema": "commonality.policy-bundle/v1",
  "layers": [ { "id": "standard-illegal",
                "ref": { "source": "https://lists.example.org/standard-illegal.json",
                         "contentHash": "0x…" },
                "except": { "contentHash": "0x…", "source": "file:./csam-appeals.json" },
                "onError": "closed",
                "freshness": { "maxResolutionAge": "PT1H" } } ],
  "actions": { "…": "…" },
  "honoredRetractors": ["0x…"],
  "sequence": "17",   // monotonic per operator; see Authenticity below
  "digest": "0x…"     // sha256(JCS(this object with `digest` removed))
}
```

**The digest is computed over the bundle with the `digest` member absent** — stated because two
implementations guessing at a fixed-point convention would never agree.

**The bundle carries everything about *what* is enforced.** It MUST carry: the schema version;
every layer with its pinned content hash; every operator-local input's content hash; each layer's
`onError` and freshness thresholds; the full action map;
`honoredRetractors`; and either the document bytes inline or immutable, content-addressed locators
for them. **The initial v1 executable representation embeds each validated local-list document
inline in its resolved `ref` alongside `source` and `contentHash`.** This keeps activation portable
and atomic without introducing artifact storage before bundle size requires it; a later
content-addressed-locator representation requires a schema version change. A locator that can change what it returns is not sufficient on its own — the accompanying
hash is what makes retrieval atomic, and a surface that cannot verify a fetched blob against it
must treat the layer as unresolvable rather than trust the bytes. A layer the resolver could not
resolve at all appears with no `ref` and `"unresolved": true`, so "this policy has a hole in it" is
part of the hashed content rather than something a surface infers from a missing key. An attached
exception is represented the same way: either `{ "ref": <resolved inline artifact> }` or
`{ "unresolved": true }`; omission means the root configured no exception.

Anything omitted from the bundle is a decision each surface would make for itself, which is the
divergence the bundle exists to eliminate. `onError` and freshness in particular are easy to leave
out on the theory that they are "config, not policy" — but two surfaces with different `onError`
behavior enforce different policies at exactly the moment enforcement matters most.

Remaining representation rules, so two resolvers produce the same bytes from the same inputs: the
action map is canonicalized to its **long form** (`{ subjectType: [actions] }`, subject types and
action names sorted) — the array shorthand is input syntax only, and leaving both forms in the
bundle would give one policy two digests. `honoredRetractors` is lowercased, deduplicated, and
sorted for the same reason.

**No timestamps live in the bundle.** The bundle is immutable content named by its digest, so a
resolution cycle that finds nothing changed reproduces the same bytes and does not republish —
which is what keeps a digest mismatch between two surfaces meaningful instead of a permanent
condition churning every tick.

### The bundle is the whole runtime input — freshness lives with the resolver

**The bundle is the only published policy artifact, and it is immutable.** There is no second,
mutable artifact carrying freshness to the surfaces, because in v1 no decision depends on freshness
(§ Freshness and staleness). So:

- The **resolver** — one server-side process — tracks when each layer was last verified fresh,
  compares against `maxResolutionAge`, records `carriedForward` per layer, and **alerts**. It is
  the only component that fetches sources, so it is the only one that knows anything a freshness
  signal could be computed from.
- **Surfaces** activate the newest bundle they can fully verify, keep the previous one otherwise,
  and report the digest they enforce plus their own runtime status. That detects every divergence
  that matters: a surface stuck on an old digest is visible as a stale digest, and the resolver
  knows which digest is current.
- Nothing needs anti-replay on a mutable artifact, because there is no mutable artifact.

An earlier draft published a mutable per-cycle "status envelope" with per-layer `lastResolvedAt`,
`carriedForward`, and its own `envelopeSequence` counter; it existed so every surface would compute
the same stale/held answer for money actions. [design-history.md](./design-history.md) records why
it went, and [financial-screening.md](./financial-screening.md) is where it returns — scoped to the
server-side surfaces that need it.

### Activation is atomic and all-or-nothing

This is the part that makes the digest mean anything. Note what it does *not* mean: the resolver's
per-layer fallback (§ Error behavior) is not a violation, because the resolver materializes its
choice into a complete new bundle whose digest names that exact combination. What is forbidden is a
*surface* assembling a policy of its own from parts of two bundles. So:

- A surface **downloads and verifies every artifact a bundle references before activating it**.
- If any artifact is missing or fails verification, the surface **keeps the entire previous
  bundle** — never a mixture of new layers and artifacts retained from an older one. There is no
  state in which the enforced policy is not exactly one published bundle.
- A surface with **no prior complete bundle** applies the configured `closed`/`open` behavior, which
  is the only situation in which those settings decide what happens rather than which bundle is
  kept.
- Exception availability is settled at activation, never re-evaluated per request.
- **Surfaces report a runtime status alongside the digest**: `current`, `stale`, or `unavailable`.
  This is the surface reporting *its own* state — a digest alone cannot distinguish "enforcing
  bundle 17 normally" from "enforcing bundle 17 because everything newer failed verification for a
  day". It is reported for observability; in v1 it does not change any decision.
- **Every surface reports the bundle digest it enforced** — in server responses, in the SDK's
  evaluation result, in logs.
- **A client/server digest mismatch is not an error and must not fail a request.** Propagation is
  asynchronous by nature. The client re-fetches the bundle (it cannot "adopt" a digest — a digest
  is not reversible, and the source may have moved on); mismatches persisting past a grace window
  alert. What a mismatch must never do is cause a surface to skip enforcement because it is unsure
  which policy applies: each surface always enforces the most recent bundle it has **fully verified
  and activated**.
- **Every input carries a content hash, including operator-local ones.** A layer resolved from
  `{ "source": "https://myvertical.example/list.json" }` contributes the sha256 of the bytes
  actually fetched. Without this the digest is a lie: two surfaces could fetch different content
  from the same mutable URL, agree on the digest, and enforce different policies.

### Authenticity: the digest is identity, not authority

A sha256 proves two surfaces hold the same bytes; it proves nothing about who produced them, since
anyone who can replace the bundle can recompute its digest.

> The bundle is an operator artifact delivered over an authenticated channel the operator already
> controls — same-origin HTTPS to browser surfaces, the deployment channel to server surfaces — with
> servers pinning the digest they expect to serve. Its authenticity therefore reduces to operator
> infrastructure trust, and this design does not improve on it.

That is honest rather than weak: a browser surface already executes the operator's JavaScript, so
an attacker who can swap the bundle can simply disable enforcement in the client, and a signature
would not stop them. What the digest *does* buy is cross-surface agreement detection, which is a
different job. Two protections are still worth having: the monotonic `sequence` gives rollback
protection, so replaying an old validly-hashed bundle to resurrect a retired policy is detectable
and rejected; and if the bundle ever crosses a hop the operator does not control — a CDN they do not
own, a partner deployment — it needs an operator signature over `(digest, sequence)`, because the
reduction above stops holding at that boundary.

Dropping the status envelope removed the sharpest form of this problem. A mutable artifact republished
every cycle needs its own anti-replay counter and its own signature, because replaying a stale
envelope against a current bundle makes stale layers look fresh. An immutable artifact named by its
digest has no such attack: there is nothing to replay except an older bundle, which `sequence`
already catches.

## Fetching untrusted artifacts

Every locator in this design — local source, snapshot, manifest, mirror — is a **string chosen by
someone else**, and the resolver fetches it automatically. `maxAdded` and `maxRemoved` guard the
policy *after* parsing; they do nothing for the resolver itself, which a captured or merely
careless source can point at a 100 GB object, a zip bomb, a response that never ends, a redirect
loop, or `http://169.254.169.254/`. A resolver that follows locators the way a browser follows
links hands whoever writes one a request forgery primitive against the operator's own network, and
the operator subscribed to a *blocklist*, not to that.

So fetching is bounded, with conservative defaults rather than whatever the HTTP client happens to
do:

- **Size**: a maximum byte count, enforced by streaming and aborting — not by reading the response
  and checking afterwards, and never by trusting `Content-Length`. A maximum entry count and a
  maximum decompressed-to-compressed ratio, since a size cap on compressed bytes is not one on
  memory.
- **Time**: connection, first-byte, and total-transfer timeouts. A response that trickles forever
  under the size cap is the same denial of service as an oversized one.
- **Redirects**: a small limit, and each hop re-checked against the network rules below.
- **Network**: HTTPS to public addresses only. Resolved addresses are checked against private,
  loopback, link-local, and unique-local ranges, and the connection is made to the address that was
  checked — re-resolving after the check is the DNS-rebinding hole. Operators who need internal
  hosts configure an explicit egress allowlist; that is a decision, not a default.
- **IPFS**: fetches go through the operator's configured gateway or node under the same limits; a
  source-supplied gateway host is not honored.

A fetch that hits any bound fails the layer, and a failed layer takes the ordinary `onError` path —
there is no separate error mode for "the keeper attacked us", because from the resolver's position
it is indistinguishable from an outage and both want the same fallback. It does alert differently:
a bound being hit is a source-attributable event and belongs in the diff feed next to anomalous
diffs and scope drift.

## Relationship to honored retractors

Keep both; they are complementary, and a keeper uses both.

- **`retractData`** — per-item, on-chain, immediate, costs a transaction. Right for urgent one-off
  takedowns, and the mechanism by which *authors* retract their own work.
- **Policy lists** — bulk, cheap, revocable, and able to name subjects that are not PublishedData
  CIDs at all.

A keeper responding to an urgent report emits `retractData` now and rolls it into tonight's list.
The resolved bundle therefore carries both the per-subject listing result and an honored-retractor
set.

**Honored retractors stay entirely explicit in the operator's root; a subscription never
contributes to them.** Lists have no `honoredRetractors` field and no semantics for composing one,
and the substantive reason is stronger than the mechanical one: honoring a retractor is a standing
grant of *per-item, on-chain* takedown authority over anything that address ever touches, which is
a strictly larger power than the enumerated entries an operator reviewed when they subscribed.
Letting a list smuggle that grant in as a side effect of subscribing would hand a keeper a second
censorship channel with none of the diffability, threshold alerting, or scope review the list path
is built around. A keeper may of course *ask* subscribers to honor them; that is an edit to the
operator's root, made deliberately.

## What this does not solve: real-world safety lists

The motivating example — subscribe to a standard list and get CSAM blocking — assumes such a list
can be represented as content IDs and published openly. In practice it largely cannot:

- **Industry safety datasets are perceptual fingerprints, not exact content hashes** (PhotoDNA and
  equivalents), because exact hashes are useless against re-encoding. A CID matches one exact byte
  sequence; cropping, transcoding, or a single flipped bit produces a new CID.
- **Those datasets are access-controlled and licensed**, and their terms generally forbid
  republication. An open checkpointed snapshot is the opposite of what the license permits.
- **Publishing perceptual fingerprints openly is itself harmful** — it lets an adversary test
  material against the list until it stops matching.
- **Matching requires scanning media bytes** with a provider-specific algorithm, which is a
  different operation from the set-membership check this design performs.

Consequences for scope: **v1 is explicitly scoped to exact, known content identifiers and named
subjects** (CIDs, addresses, channels) — which genuinely covers court orders, sanctions lists,
notice-and-takedown responses, and fraud reports, all of which are real and worth having. The
taxonomy reserves the name `fingerprint` for a scheme-qualified subject type
(`{ "type": "fingerprint", "scheme": "…", "value": "…" }`) so that the shape is agreed and nothing
else claims the name. To be exact about what that reservation is worth: **it does not avert a
format break.** Because v1 consumers hard-reject unknown subject types, shipping fingerprint
entries is a schema bump existing subscribers must adopt — the reservation saves the argument about
naming and shape, not the version bump.

Most importantly: **this machinery does not solve the operational problem.** It is distribution and
composition plumbing. Obtaining a legitimate keeper, a usable compliance dataset, and the provider
relationships that come with it remains the actual hard part, and it is not an engineering task.

## What it would take

### Immediate product milestone: one starter profile

The short-term goal is deliberately narrower than completing every v1 operational feature. Civility is the reference vertical: it should be able to select an operator-provided profile that references a content-hash-pinned HTTPS list maintained by someone else, optionally attach a pinned local exception, and enforce the resulting bundle across all of its governed content surfaces.

This does not make the policy-list system Civility-specific. Schemas, fetching, resolution, bundle activation, evaluation, inspection, and reusable integration APIs belong in shared SDK/operator infrastructure. Civility provides the first concrete call sites and no-bypass coverage. CSM and later verticals reuse that implementation after the starter milestone; integrating them in parallel is not required.

Pinning means updates are deliberate: when the maintainer publishes new bytes, the profile operator reviews and adopts the new hash. Automatic following, diff holds, and richer review tooling can come later. This still establishes the important initial product story: a cause founder need not originate or continuously maintain a moderation dataset in order to launch a vertical.

The milestone is complete only when Civility has one activated bundle across rendering, client-side aggregation, metadata retrieval, and operator-controlled serving, with focused tests showing no known public bypass. At that point the project has a good near-term stopping point even if mutable unpinned subscriptions, broader rollout, and registry publication remain unfinished. See the executable [starter-profile stopping gate](./implementation-plan.md#near-term-stopping-point).

This is burden reduction, not outsourced responsibility. The operator still chooses the profile and owns reporting, appeals, and incidents; the external maintainer supplies the reusable dataset.

**Build the evaluator and the bundle first; build the registry last; leave money alone.** An earlier
ordering put the registry and remote snapshots at stages 1–2, ad-hoc stage-0 filters before them,
and the shared evaluator at stage 3 — with the reassurance that stage 4 would be "a repoint rather
than a rewrite". That reassurance was doing too much work. Ad-hoc filters at the call sites are not
a thin shim: they are where the per-surface subject extraction and error handling get decided, and
every one of those decisions is re-made when the evaluator arrives. That is implementing enforcement
twice, and the second implementation has to reproduce the first one's behavior at sites nobody wrote
tests against.

The reordering costs almost nothing, because **the expensive part is reaching all the surfaces at
all**, and that cost is identical whether the call site consults an inlined denylist or a shared
evaluator. What changes is only what sits behind the call.

Stages 1–3 are v1 and are the only ones anyone should be planning against. Everything from stage 4
down is gated on a condition that has not happened yet, and each condition is stated rather than
implied.

| # | Stage | Size |
|---|---|---|
| 0 | **Compliance operations**: reporting address, on-call rotation, appeals process, published policy. Not engineering, does not depend on anything below, and gates mainnet on its own | Medium |
| 1 | **Subject canonicalization and the local policy format**: subject keys, the three content actions and their extractors, the root and local list documents read from local config, validators and test vectors. No chain, no registry, no money | Small–medium |
| 2 | **The evaluator and the resolved bundle across three surfaces**: `lookup` and `evaluate`, atomic activation, digest and runtime status reporting, `onError`, resolver-side freshness alerting | **Large — the core** |
| 3 | **Production enforcement coverage**: rendering, aggregation, metadata fetching, and indexer/API serving, all going through stage 2, with tests proving a listed subject is suppressed on every surface | **Medium-large** |
| 4 | **The admission profile** — only if a real admission case lands: a second evaluator over the same subjects and membership test, with its own inverted failure rules. Reuses stages 1–3 wholesale; shares no evaluation logic with the block profile | Medium — **ordering is a product decision, see § Risks** |
| 5 | **Financial screening** ([financial-screening.md](./financial-screening.md)) — only once there is a concrete sanctions/fraud data source and a human review workflow to hold claims into. Reuses stages 1–2's subject identity and list documents; brings its own freshness, hold, and audit design | Large, and mostly not schema work |
| 6 | **Registry identity and the canonical wire format** ([registry.md](./registry.md)): `PolicyListRegistry.sol`, manifest documents, cross-runtime test vectors, deploy script, `deployments/` entry — **only when a real second keeper or operator exists** | Medium |
| 7 | **Subscriptions end to end** ([registry.md](./registry.md)): indexer handler, keeper publishing tool, head following, `policyHash` holds | Medium |
| 8 | Diff viewer, policy-change alerting beyond stage 2's basics | Medium |
| 9 | Hashed subjects — only with a keeper, a dataset, and a threat model that need them | Deferred (schema bump) |
| 10 | Published recursive compositions — only when a real third-party curator needs to publish one | Deferred (schema bump) |
| 11 | Authenticated-absence lookup — only once real list sizes require it | Deferred |
| 12 | Fingerprint/provider integration | Separate work (schema bump) |

For the near-term starter profile, stages 2 and 3 need only be completed for Civility and one pinned HTTPS list. CSM integration, other vertical rollout, and safe automatic following of mutable unpinned sources are subsequent increments, not conditions for the first useful stopping point.

Stages 2 and 3 are the real cost, and stage 3 is a **coverage** problem rather than a composability
one. [published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2 is
emphatic that suppression must cover **aggregation, not just rendering**: supporter counts,
transitive implication support, contributor leaderboards. A half-applied blocklist is worse than
none.

Stage 2 is where the difficulty concentrates: one evaluator across three surfaces in two runtimes,
with caches, partial failures, and atomic bundle activation. Nothing in it needs the registry — a
bundle resolved entirely from local files exercises every one of those problems.

Stage 6 is not "small because the contract is small". The contract is genuinely tiny — one mapping,
one guarded write. The cost is canonicalization and strict parsing that two runtimes agree on byte
for byte, adversarial validation, and a shared test-vector corpus keeping independent
implementations from drifting. That has to be right before anyone publishes a list, because a hash
disagreement discovered later is not a bug fix, it is a migration. Deferring it until there is a
second implementation to agree *with* is also when its test corpus can actually be validated.

### What v1 does not attempt

Stated as a list, because a spec that quietly drops things is worse than one that names them:

- **No money gating.** No claim is rejected and no sponsorship refused on the authority of a policy
  list. `platform-api-service` keeps `BLOCKED_CHANNEL_IDS` as it is today.
- **No chain.** No registry contract, no checkpoints, no keeper identity, no head-following. Every
  `ref` is a locator the operator wrote down.
- **No hashed subjects, no salts.**
- **No status envelope**, no `envelopeSequence`, no per-surface freshness computation.
- **No hold state** anywhere in the evaluator.
- **No admission profile.** An `except` is not an allowlist.
- **No recursion.** Lists are leaves; composition is the operator's root.
- **No propagation.** An entry affects exactly the subject named.

## Risks and open questions

**Censorship cartel.** If every vertical subscribes to the same two lists, those keepers become a
de facto central censor with soft power over the whole ecosystem — the exact failure mode this
design exists to avoid. Mitigations, in order of importance: narrow per-list subscription limits
blast radius; `maxAdded`/`maxRemoved` catch a captured source moving suddenly; attaching a
third-party correction list as an `except` gives operators a cheap escape that does not require
running their own moderation; and once the registry exists, the on-chain checkpoint history makes
capture *detectable*. But detection only works if someone watches — so the public diff feed is a
first-class product surface, and a [verifier](/verifier) check should alarm on anomalous diffs
(unusual volume, scope drift, entries silently removed).

Note that v1 weakens two of these on purpose. Without the registry there is no tamper-evident
history, so a `contentHash`-pinned `ref` is the only thing standing between an operator and a source
that rewrites itself — which is why the pinning guidance matters more in v1 than it will later. And
because v1 `except` refs must be local and pinned, the third-party corrections escape hatch is not
actually available yet; an operator's only correction mechanism is a file they maintain. Both are
acceptable while there is one operator and no second keeper, and both are reasons the registry is
deferred rather than cancelled.

**Being a keeper is its own liability.** Publishing "channel X is fraud" about a named person is a
defamation surface, and running *the* standard list makes Commonality the ecosystem's moderation
authority — which cuts directly against
[operator-posture.md](/specs/product/ui-operator-posture.md). If Commonality runs a standard list,
it should be under the same explicitly-editorial posture as Civility ("this is our opinion, here is
our policy, here is the appeals process"), never framed as neutral infrastructure. Long term, the
standard lists are better run by someone else.

**Subscribing means blocking things you never reviewed.** That is fine for compliance and is the
entire point, but a subscribing operator's terms should say so honestly rather than implying every
suppression was their own editorial judgment.

**List scope is the interop contract.** With no category dimension, what a list means is whatever
its keeper says it means — and in v1, with no manifest, that is a prose promise on a web page.
Binding the manifest into the hashed snapshot ([registry.md](./registry.md#the-manifest)) makes a
scope rewrite a logged event rather than a silent one, which is the strongest structural answer
available, but it arrives with the registry. Until then `maxAdded`/`maxRemoved` and the review diff
are the whole defense against a source quietly broadening what it lists. That is thin, and it is the
clearest single argument for the registry not being deferred *indefinitely*.

**~~Open~~ Resolved (Aug 2026): admission allowlisting does not come before the registry — no admission
profile is needed at all for now.** [ADR 0008](/specs/decisions/0008-operated-surfaces-are-lenses.md)
settles the product question this item was waiting on: Commonality's operated cause surface authors no
discovery, so there is nothing to allowlist, and the trust claim it makes rests on recomputability plus
positive-only attestations rather than on a curated listing. The registry therefore keeps its place in
the queue, and the block evaluator is not asked to carry inverted failure semantics. The original
reasoning is preserved below, because it stays correct if an operated surface ever does need a curated
listing — the asymmetry in the last sentence is the thing to re-read first if that happens.

This was the one genuinely undecided
item, and it is a product question rather than a design one. Admission ("show only the listed
subjects") is a separate evaluation profile with inverted failure semantics, staged but unscheduled.
The reason it is open is that [operator-posture.md](/specs/product/ui-operator-posture.md)
§ "Indexer posture" already names admission cases — curated project sets, recognized factories, a
community indexing its own allowlisted projects — and if any of them is needed for a production
vertical, it outranks the registry, which is speculative until a second keeper exists. Answering it
needs someone to say whether a launching vertical actually needs operator-scoped indexing, not more
design work here. Note the asymmetry in the cost of being wrong: shipping the registry first and
discovering admission was needed costs a delay, whereas retrofitting admission onto the block
evaluator's failure rules to catch up is how an admission list ends up enforced under blocklist
failure semantics.

**Subject propagation — resolved as no implicit propagation** (§ Evaluation semantics). The
residual risk is the under-blocking side: a subject re-pointing at a fresh address stays visible
until a keeper lists the new one, so takedown latency becomes a keeper operations problem rather
than something the evaluator solves. That is the intended trade; the alternative is an unenumerable
suppression radius. If operators end up writing near-identical propagation rules by hand, that is
the signal to specify one — driven by observed rules, not by guessing at them now.
