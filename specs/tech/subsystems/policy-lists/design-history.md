# Policy lists: design history and rejected alternatives

Companion to [README.md](./README.md), the normative v1 spec (content enforcement — subject
identity, the local policy format, the three content actions, the evaluator, the resolved bundle).
Two deferred design candidates sit alongside it: [financial-screening.md](./financial-screening.md)
(claims and gas sponsorship) and [registry.md](./registry.md) (publication — the on-chain registry,
wire format, manifests, head-following). This file holds the *why-not*: designs that were written
down, reviewed, and dropped, and the mistakes that produced the rules those documents now state
flatly.

It exists because the spec got long enough that the rules were hard to find among the post-mortems,
and because deleting the post-mortems outright would invite someone to re-propose categories or a
global `allow` op in six months. Nothing here is normative. If this file and the spec disagree, the
spec is right and this file is stale.

## Cut: v1 shrank to content enforcement only

The seventh review's verdict was that the spec was "not confused" — "unusually careful", having
caught several subtle safety bugs — but that it "tries to solve too many maturity stages in one
normative design". It had grown from "compose denylist files" into a distributed policy control
plane spanning browsers, indexers, APIs, claim processing, gas sponsorship, immutable bundles,
mutable status envelopes, freshness state, human-review holds, anti-replay counters, canonical
serialization, and on-chain publication. Defensible as an eventual architecture; not buildable as
one v1.

So v1 was cut to content enforcement, and five things left the normative spec:

| Cut | To | The tell that it did not belong |
|---|---|---|
| `reject-claim`, `refuse-gas-sponsorship`, hold-for-review, `onError: "hold"`, `maxPinAge`, "a stale layer holds everything it governs" | [financial-screening.md](./financial-screening.md) | The spec kept explaining at length why money decisions are fundamentally different, then required one evaluator across all five surfaces anyway |
| The status envelope, `envelopeSequence`, per-surface freshness computation | ditto | Its entire job was making every surface agree on stale/held, which only matters when staleness changes a decision — i.e. only for money |
| Hashed subjects, `salt`, cross-form duplicate detection | [registry.md § Disclosure](./registry.md#disclosure-what-publishing-a-list-reveals) | The spec already conceded it bought findability reduction, not confidentiality, for lists nobody publishes yet |
| The registry's exact contract, manifest, and wire format | [registry.md](./registry.md), relabelled a design candidate | 423 normative lines of interop contract for a participant who does not exist |
| Checkpointed `ref`s, `follow`, remote `except`s | ditto | v1 has one operator and no second keeper |

The money split is the one that mattered most, because everything else followed from it. Once no v1
decision depends on freshness, freshness stops being evaluation input, and the envelope, its
anti-replay counter, the second age dimension, and the `hold` state all lose their reason to exist
at once. The surface count dropped from five to three, which is most of the cost of stages 2–3.

Two smaller findings from the same review were fixed in place rather than deferred:

- **The evaluator API was the wrong shape.** `{ digest, sequence, assertedBy, status }` is a
  per-subject result, but every decision a surface makes is per-*action* over a request carrying
  several subjects — which pushes the extractor back out to the call sites the design had just
  taken it away from. Split into `lookup(subject)` and `evaluate(action, request)`.
- **Exceptions had no coherent error semantics.** The spec said an unresolvable `except` is carried
  forward, or dropped if there is nothing to carry, on the grounds that over-blocking is the
  recoverable direction. But a *stale carried-forward* exception under-blocks — it keeps pardoning
  something the operator has since removed from the exception list — and nothing said whether an
  exception failure made its enclosing layer stale. v1 sidesteps it: exceptions must be local and
  `contentHash`-pinned, so they are never independently mutable and changing one is an explicit
  bundle update. Remote corrections lists need their own freshness design and wait for the registry.

One recommendation was **not** taken. The review suggested renaming the object away from "policy
list" to "policy blocklist", since v1 has no allowlists. The framing throughout now says blocklists,
but the *document type* stays neutrally named on purpose: § One object type turns on the leaf
asserting membership and nothing else, which is exactly what lets a future admission profile reuse
the same documents, subject keys, and identity rather than inventing a second format.

## Restructured: one document became three

The spec was a single 1,465-line README. Two things had run together in it. The first was the
*enforcement* design — subject keys, the action map and its extractors, the evaluator, the bundle —
which is worth building for a single operator with a hand-maintained JSON file and needs no chain.
The second was the *publication* design — registry, checkpoints, canonical wire format, manifests,
head-following — which earns its keep only when a second keeper exists, and which the README's own
roadmap already put at stage 5 of 10.

Roughly a third of the prose specified the stage the document told you not to build yet, while the
stages it told you to build first were, by its own admission, "left as examples — which is
backwards". Splitting along that seam is what fixed it; nothing normative was dropped in the move.

A third of the length was review scar tissue: each round of review had answered an objection by
appending a defensive paragraph rather than editing the rule. Those arguments now live here, in the
tables and sections below, and the spec states the rules flatly.

## Rejected: a category dimension on entries

An early draft gave entries a `categories` field and made categories the subscription unit, so an
operator could take `csam + terrorism` from a list without its `spam` opinions. That is a real
need. It was dropped because list granularity plus composition already serves it, and the second
mechanism was not worth its weight: `listId` is keeper-chosen and keepers may run many lists, so
a keeper who classifies their entries publishes one list per class. There is no case where
categories help but list-splitting does not — a keeper unwilling to classify their entries would
not have tagged them either.

What removing it bought:

- **Provenance became structural rather than a per-entry vocabulary.** A category dimension made
  evaluation produce a category *set* per subject, because a subject asserted as both `csam` and
  `spam`, with a later layer pardoning `spam`, must stay blocked. Splitting the lists does not by
  itself dissolve that problem — an intermediate draft claimed it did, and that was wrong; a
  correction still has to be *scoped* to the assertion it corrects. What splitting bought is that
  the scope became structural (a correction attaches to one layer), which an evaluator can
  enforce, rather than a shared word that keepers would all have had to mean the same thing by.
- **Action mapping got safer.** With categories, *any* subscribed list could assert `sanctions`
  and thereby gate money. Keying actions on the list means the operator names the specific list
  that holds claim-gating power.
- **No false interop.** A shared vocabulary implies `fraud` means the same thing to every keeper,
  which it will not. Compare [published-data/README.md](../published-data/README.md) § "No
  context/topic tag", which rejected a hint field on adjacent grounds: a field that must not be
  believed should not exist.

## Rejected: a single `isBlocked(subject)` answer

An early draft proposed one boolean shared across rendering, aggregation, serving, discovery, and
`platform-api-service`'s claim gate. Those are materially different decisions with different
stakes. Collapsing them means a keeper of a spam list silently acquires the power to block
people's money, and it muddies the legal posture the design exists for: the operator must own the
enforcement decision rather than inherit it implicitly from whichever list they subscribed to.
This is why the README separates assertions from actions.

## Rejected: a sibling `allow` op, and the `protect` flag it needed

An early draft made corrections a sibling layer:

```text
[block CSAM, block Spam, allow SpamCorrections]
```

That is a trap. The `allow` clears every prior assertion, so a subject listed in all three ends up
unlisted — the spam correction has pardoned the CSAM assertion. The draft's fix was to nest each
correction with the list it corrects (`block [block Spam, allow SpamCorrections]`), which is
correct but reaches for recursion to express what is really a property of one layer.

`except` says the same thing directly. It is the degenerate case of that nesting, it cannot be
written wrong, and it needs neither an evaluator depth cap nor a cycle check to be safe.

It also eliminated `protect`. `protect` existed only to stop a sibling `allow` from pardoning a
layer that must never be pardoned. With no sibling `allow`, nothing can reach across layers, so
there is nothing to protect against — the guarantee became structural instead of a flag an
operator must remember to set on the one list where forgetting it is catastrophic.

The example root in that draft also carried `{ "id": "my-corrections", "op": "allow" }` as a third
root layer, which violated two of the spec's own rules at once: a root-level global pardon, and a
layer the action profile did not name.

## Rejected: corrections with an explicit `appliesTo` target

Instead of attaching an exception to its layer, a correction list could name the layers it
corrects. Rejected because naming layers across a published boundary needs a stable
cross-publisher layer identifier — reintroducing exactly the shared-vocabulary problem that
dropping categories removed — and because it permits documents whose declared scope contradicts
their own structure.

## Reversed: "composition must be in the schema from day one"

An earlier draft froze published recursive compositions — snapshots that are themselves ordered
`block`/`allow` compositions over other lists, with `protect` and inline nodes — arguing that
"composition stays in the schema from day one; retrofitting it would break the interop contract."

That argument does not hold up. The schema is versioned and consumers hard-reject documents they
do not fully understand, so a v1 consumer meeting a v2 composition fails safe and visibly rather
than silently misreading it. The cost of adding composition later is a version bump; the cost of
freezing it now was committing to a recursive policy language before anyone had published a single
list in it.

The evidence said it was not ready to freeze: the evaluation semantics were wrong through two
revisions, and the pardon bug above was found by review rather than by use — which is what a
policy language looks like when it is being designed in the abstract. When a real third-party
curator needs to publish a composition, they will bring the constraint that tells us whether
`allow`/`protect` recursion is the right primitive.

Deferred, not discarded. The README keeps the parts that carry regardless of how composition
eventually lands, and records the pinning rules that would govern it — including the depth cap of
8, which remains the right number.

## Corrected claims

Statements that appeared in earlier drafts and were wrong. Listed because each one is the kind of
plausible-sounding claim someone might reintroduce.

| Claim | Why it was wrong |
|---|---|
| "A stale snapshot can only under-block, so caching one forever is safe." | A stale snapshot also **over-blocks**: it retains entries the keeper has since removed — corrected false positives, granted appeals, delisted sanctions targets. Removal is the thing this design added over one-way `retractData`. |
| "Hold the affected claims when a money layer is stale." | Ambiguous in the dangerous direction. A stale layer also *omits* newly listed subjects, so holding only the claims it matches pays out to exactly the subject that was added while the list was stale. |
| "The full history of what was ever blocked is enumerable by anyone." | The chain stores hashes and locators, not bytes. The accurate claim is that every *retained* snapshot can be authenticated and missing ones are detectable. |
| "The checkpoint block timestamp is controlled by nobody in the trust path." | This is an L2; a sequencer has bounded latitude over timestamps. The accurate claim is *chain-governed rather than keeper-authored*, which is enough to carry the freshness argument. |
| "A subscription may contribute to `honoredRetractors`." | Unimplementable (snapshots have no such field and no composition semantics for one) and wrong in substance: honoring a retractor is a standing grant of per-item on-chain takedown authority, strictly larger than the enumerated entries an operator reviewed. |
| "Splitting lists by class dissolves the cross-provenance pardon problem." | It does not. A correction still has to be scoped to the assertion it corrects; splitting only makes that scope structural. |
| "Allowlists are out of scope because they need a universe to take the complement of." | You do not need to enumerate a universe to answer "may this subject be admitted?" — default-deny plus a membership test does it. The real reason admission is a separate profile is that every failure and staleness rule inverts. |
| "The root is a flat, **ordered** list of layers." | Layers are evaluated independently and the result is a set; no layer can shadow or short-circuit another. "Ordered" implied a precedence rule that does not exist. |
| "Reserving the `fingerprint` subject type lets integration arrive without a format break." | v1 consumers hard-reject unknown subject types, so shipping fingerprint entries is a schema bump either way. The reservation only saves the argument about the name and shape. |
| "Genesis versions may be numbered 0." | `publish` requires `version > latestVersion`, and `latestVersion` is 0 for an unpublished list, so version 0 is unpublishable. Versions start at 1. |
| "The bundle is the complete evaluation input" *(alongside per-layer cached fallback and per-request exception skipping)* | These coexist only if two surfaces can report the same digest while enforcing different content — the exact failure the digest exists to detect. Resolved by making activation atomic and all-or-nothing. |
| "Stage 4 is a repoint rather than a rewrite, so building ad-hoc filters first is safe." | Ad-hoc filters at five call sites are where per-surface subject extraction, error handling, and freshness behavior get decided — all of which are re-made when the shared evaluator arrives. That is implementing enforcement twice. |
| "The bundle is the complete evaluation input" *(second time, alongside resolver freshness tracked outside it)* | The first fix made activation atomic but left successful-resolution time "reported alongside the digest", so two surfaces on the same digest could still compute different stale/held states. Resolved by splitting the immutable bundle from a mutable, operator-authenticated **status envelope**, and making the pair the complete input. |
| "An unresolvable input means the resolver keeps the entire previous bundle." | Confused atomic *activation* with all-or-nothing *resolution*. It lets a flaky appeals-list host freeze an urgent addition to an unrelated blocklist. The resolver applies each source's `onError` and materializes one complete new bundle; the digest names the exact combination, so nothing is hidden. All-or-nothing survives where it belongs, at surface activation. |
| "A layer governs the requests whose extractor yields a subject type that layer *can list*." | Unanswerable for v1 — every leaf can contain all three subject types — and worst for the case it exists to serve, since a stale snapshot's contents are exactly what cannot be trusted. Governance is read from the action map's `(layer, subject type, action)` triples instead. |
| "Any list presented as a standard one MUST carry a manifest." | "Presented as standard" is a marketing property no validator can check. The mechanical rule is that a manifest is required for any **followed head**, which is in the operator's own config, and which is where the delegated authority `policyHash` gates actually exists. |

## Sizing estimates that were wrong

- The shared evaluator across five surfaces was sized "medium". It is the core of the work and is
  large: two runtimes, caches, partial failures, atomic activation, asymmetric freshness for money
  actions.
- The registry stage was sized "small" on the strength of the contract, which is genuinely tiny.
  The cost is canonicalization, strict parsing, adversarial validation, and a cross-runtime test
  vector corpus.
