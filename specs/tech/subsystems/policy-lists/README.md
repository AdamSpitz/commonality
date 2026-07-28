# Policy lists: composable blocklists

Status: **proposed, not implemented** (Jul 2026). Design for generalizing the existing
per-UI display denylist into interoperable, subscribable, verifiable lists, so that a vertical
operator gets legal-compliance blocking mostly for free while remaining ultimately in control
of what their site suppresses.

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
subscribe to lists maintained by others, and get the standard stuff for free.** The result a
site suppresses is the union of what its subscribed lists say, minus whatever the operator
overrides.

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
| platform-api-service | `BLOCKED_CHANNEL_IDS` (`config.ts`, enforced `service.ts` → 403 `blocked_identity`). | The one non-UI blocklist. Gates *money claiming* by platform identity, not display. Should become a policy-list subscriber (below). |

`honoredRetractors` is already most of what we want: permissionless, on-chain, per-display-layer
choice, composes by union, and permanently logged so a censor cannot lie. Four gaps:

1. **No composition.** `deniedCids` comes from exactly one URL; there is no notion of multiple
   sources, per-source category filtering, or operator override.
2. **Cost.** One transaction per blocked item. A real CSAM hashlist is six figures of entries.
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
Operators can still layer their own overrides on top, recursively, without limit.

### The registry contract

`PolicyListRegistry.sol` — admin-less, immutable, permissionless, on the same L2 as everything
else. (Not a separate chain: a checkpoint per list per day is trivially cheap, and cross-chain
reads would import a trust problem for no benefit. See [multi-chain.md](/specs/tech/multi-chain.md).)

```solidity
event ListPublished(
  address indexed keeper,
  bytes32 indexed listId,     // keeper-chosen; keepers may run many lists
  uint64  indexed version,    // strictly increasing per (keeper, listId)
  bytes32 snapshotHash,       // sha256 of the canonical snapshot bytes
  string  locator             // ipfs:// | https:// | ar://
);
```

Optionally a second event carrying a manifest locator (human-readable name, policy, contact,
appeals process, category vocabulary) so lists are discoverable and their governance legible.

**Why snapshots rather than `Block`/`Unblock` events.** Cost is O(1) per version rather than
per entry, so a 200k-entry list costs one transaction. Unblocking is free — absence from the
next snapshot. And crucially, a snapshot commits to the *complete current state*: with an
event stream you can prove additions but cannot cheaply prove what the list says right now.
Since every version is permanently logged, removals are auditable too — diff v41 against v42,
both committed on-chain.

The checkpoint is the accountability device. A keeper cannot serve one snapshot to one
jurisdiction and a different one elsewhere (both must hash to the committed value), cannot
deny having blocked something, and cannot silently un-block. The full history of what was ever
blocked is enumerable by anyone.

### Snapshot format

```jsonc
{
  "schema": "commonality.policy-list/v1",
  "listId": "0x…", "keeper": "0x…", "version": 42,
  "publishedAt": "2026-07-28T00:00:00Z",
  "previous": { "version": 41, "snapshotHash": "0x…" },

  // leaf form
  "entries": [
    { "subject": { "type": "cid",     "value": "bafy…" },                 "categories": ["csam"] },
    { "subject": { "type": "address", "value": "0x…", "chainId": 8453 },  "categories": ["sanctions"] },
    { "subject": { "type": "channel", "value": "twitter:uid:123" },       "categories": ["fraud"] }
  ]

  // …or composition form (mutually exclusive with `entries`)
  "layers": [
    { "ref": { "listId": "0x…", "version": 17, "snapshotHash": "0x…" },
      "op": "block", "categories": ["csam","terrorism","ncii"], "protect": ["csam","ncii"] },
    { "ref": { "listId": "0x…", "version":  4, "snapshotHash": "0x…" },
      "op": "allow" }
  ]
}
```

**Subject types:** `cid`, `publishedDataId` (bytes32), `address` (with `chainId`), `channel`,
`statement`. This taxonomy is the coverage gap the current denylist lacks and every vertical
will need.

**Categories are the subscription unit.** A vertical wants `csam + terrorism + ncii` from a
standard list without inheriting that keeper's spam opinions. Rule: **unknown categories are
ignored, never fatal**, so keepers can add categories without breaking subscribers. The
vocabulary is versioned with the schema.

**Publish salted hashes for the worst categories.** A public plaintext list of CSAM CIDs is a
findability index for the material — the classic hash-list problem. Entries therefore support
`valueHash` (`H(salt‖canonicalSubject)`, salt in the snapshot) as an alternative to `value`:
lookups still work, but the list is not a browsable directory. The same argument applies to
named creators and channels, where plaintext blocking is also a defamation surface. Keepers
choose per category.

**Large lists chunk and Merkle-root.** `entries` may instead be an array of chunk references
under a Merkle root, so a client can verify a single inclusion answer from an untrusted lookup
API without downloading the whole list.

### Composition semantics

Evaluation of a composition, per subject, over layers in order:

1. Start: the subject is not blocked, and the protected set is empty.
2. `block` layer — if the subject is in the referenced list's resulting set (filtered to the
   layer's `categories`), mark it blocked. If the layer declares `protect` and the subject
   matched under a protected category, add it to the protected set.
3. `allow` layer — if the subject is in the referenced list's resulting set, and it is **not**
   in the protected set, mark it not blocked.

Last matching layer wins. A leaf's "resulting set" is its entries; a composition's is its
evaluated blocked set — so the recursion is uniform.

This reduces to the obvious thing in the simple case: `[block A, block B, allow C]` is
"union of A and B, minus C."

**`protect` is the safety valve, and it is not optional in practice.** Delegating your
overrides to a third party means that party can *un-block* things — a strictly more dangerous
dependency than delegating blocking. `protect` establishes a floor: subjects blocked under
those categories cannot be un-blocked by any later layer, no matter whose. An operator
subscribing to a standard list should protect the categories they never want overridden, after
which adopting a third-party allow layer is a bounded risk rather than a reckless one.

**Published compositions MUST pin their references** by `(listId, version, snapshotHash)`.
Only the unpublished root — the operator's own local config — may follow a list's head. This
preserves the whole point of the checkpoint: because children are pinned, **any third party can
recompute a composed list from its children and verify that the published result is what the
composition actually says.** A curator who bumps their upstream pins produces a new on-chain
version, so "started following a new upstream" is itself permanently logged.

A composition MAY additionally carry a materialized `flattened` entry set (or Merkle root) for
its result. Clients use it for speed; auditors recompute from the pinned children to check
honesty. Fast path and audit path must agree, and a disagreement is provable misconduct.

**Robustness:** the reference graph must be acyclic; evaluators enforce a depth cap (8) and
abort on cycles. Publishers cannot be trusted to be well-formed.

### The operator's subscription

The operator's configuration is just an unpublished composition node — the root of the tree.
Same schema, one extra freedom (it may follow head):

```jsonc
{
  "layers": [
    { "ref": { "listId": "0x…" }, "op": "block",
      "categories": ["csam","terrorism","ncii"], "protect": ["csam","ncii"],
      "follow": "head", "onError": "closed" },
    { "ref": { "listId": "0x…" }, "op": "block", "follow": { "version": 42 } },
    { "ref": { "source": "https://myvertical.example/list.json" }, "op": "allow" }
  ],
  "honoredRetractors": ["0x…"]
}
```

**Follow head vs. pin.** Following head is the low-effort default and the reason this whole
scheme scales to many operators. Pinning means a captured keeper cannot silently expand your
blocklist — you review the diff before bumping. Following head should be the shipped default
for standard lists, with the diff feed made cheap enough that review is realistic.

**Error behavior.** The current implementation fails open: a fetch error logs a warning and
renders everything. That is the wrong default for a mandatory-category list. Each layer
declares `onError`:

- `closed` (recommended for mandatory block layers) — fall back to the last-known-good cached
  snapshot; snapshots are immutable and content-addressed, so caching them indefinitely is
  safe. Only if no cached copy exists at all does the surface degrade to refusing to render
  unverified content.
- `open` — proceed without this layer.
- `ignore` — the sensible default for `allow` layers, where a failed fetch merely over-blocks.

### Client mechanics

Resolve a list's head from the indexer's event cache by `listId` topic — the same shape as the
existing `by-cid.ts` resolver. Fetch the locator, verify `sha256(bytes) == snapshotHash`. That
verification is what allows snapshots to live on any cheap, untrusted host. Cache in
IndexedDB keyed by `snapshotHash`; snapshots are immutable, so cache forever.

### Relationship to honored retractors

Keep both; they are complementary and a keeper uses both.

- **`retractData`** — per-item, on-chain, immediate, costs a transaction. Right for urgent
  one-off takedowns, and it is the mechanism by which *authors* retract their own work.
- **Policy list snapshots** — bulk, cheap, categorized, revocable, and able to name subjects
  that are not PublishedData CIDs at all.

A keeper responding to an urgent report emits `retractData` now and rolls it into tonight's
snapshot. The resolved policy object therefore carries both a blocked-subject set and an
honored-retractor set, and a subscription may contribute to either.

## What it would take

| # | Work | Size |
|---|---|---|
| 1 | `hardhat/contracts/policy-lists/PolicyListRegistry.sol` + tests + deploy script + `deployments/` entry | Small |
| 2 | Indexer: contract in Ponder config + handler (mirrors the `DataPublished` handler) | Small |
| 3 | SDK `sdk/src/subsystems/policy-lists/`: schema + validator, hash verification, head resolution, recursive evaluator with cycle/depth guards, `isBlocked(subject)` | **Medium — the core** |
| 4 | UI: generalize `displayDenylist.ts`; replace `VITE_DISPLAY_DENYLIST_URL` with a subscription document; update `vite.config.ts` config.json emission and `scripts/setup-env.sh` | Small |
| 5 | Extend call sites past CIDs to addresses/channels/projects — **including aggregation paths** | **Medium-large** |
| 6 | Keeper tooling: build/publish a snapshot; diff viewer | Small |
| 7 | `platform-api-service`: `BLOCKED_CHANNEL_IDS` becomes a policy-list subscription | Small |

Item 5 is the real cost, and note that it is the **coverage** gap, not the composability gap —
composability is cheap precisely because the on-chain primitive already exists.
[published-data/README.md](../published-data/README.md) § "Honored retractors" rule 2 is
emphatic that suppression must cover **aggregation, not just rendering**: supporter counts,
transitive implication support, contributor leaderboards. A half-applied blocklist is worse
than none.

**Staging.** The schema should support composition from day one — it is only a node type, and
retrofitting it later would break the interop contract. The *tooling* for publishing
compositions can wait: v1 ships leaf publishing plus a full recursive evaluator, so
third-party override works as soon as anyone wants it, without blocking the first release on a
capability most operators will not immediately need.

## Risks

**Censorship cartel.** If every vertical follows head on the same two lists, those keepers
become a de facto central censor with soft power over the whole ecosystem — the exact failure
mode this design exists to avoid. Mitigations, in order of importance: the on-chain checkpoint
history makes capture *detectable*; category filtering limits blast radius; `protect` plus
third-party allow layers give operators a cheap escape that does not require running their own
moderation. But detection only works if someone watches — so the public diff feed is a
first-class product surface, and a [verifier](/verifier) check should alarm on anomalous diffs
(unusual volume, category drift, entries silently removed).

**Being a keeper is its own liability.** Publishing "channel X is fraud" about a named person
is a defamation surface, and running *the* standard list makes Commonality the ecosystem's
moderation authority — which cuts directly against
[operator-posture.md](/specs/product/ui-operator-posture.md). If Commonality runs a standard
list, it should be under the same explicitly-editorial posture as Civility ("this is our
opinion, here is our policy, here is the appeals process"), never framed as neutral
infrastructure. Long term, the standard lists are better run by someone else.

**Following head means blocking things you never reviewed.** That is fine for compliance and
is the entire point, but a subscribing operator's terms should say so honestly rather than
implying every suppression was their own editorial judgment.

**Category vocabulary is the interop contract.** Get it approximately right early; version it;
keep the ignore-unknown-categories rule so it can grow.
