# Financial screening: gating claims and gas sponsorship

Status: **deferred design candidate, not normative** (Jul 2026). This is not part of policy-lists
v1, nothing here should be implemented yet, and the rules below have not been reviewed to the
standard [README.md](./README.md) has.

**What is in force today, and stays in force until this document is built:**
`platform-api-service` gates money claiming with `BLOCKED_CHANNEL_IDS`, a hand-maintained list in
`config.ts` enforced in `service.ts` (403 `blocked_identity`). It is not a policy-list consumer and
will not become one incidentally. **No policy list can affect anyone's money.**

## Why this is a separate document

v1 originally specified five actions across five surfaces: suppress display, exclude from
aggregation, refuse to serve bytes, reject a claim, and refuse gas sponsorship. The first three are
content decisions; the last two are money decisions. Putting them in one evaluator made the whole
design roughly twice as large, and reviewing why is the clearest statement of the seam.

**The failure rules are opposites.** For a content action, a stale blocklist keeps being enforced
and the operator gets an alert; both error directions are recoverable and a page rendered from
week-old policy harms nobody much. For a money action, a stale blocklist withholds someone's
payment on the authority of a judgment that may already have been reversed, and the person affected
has no way to tell that is what happened. Auto-reject and auto-pay are *both* wrong when the policy
input is known to be out of date, so the only correct answer is a third one — hold — which requires
a human queue behind it that no page render has.

Everything expensive followed from that single difference:

| v1 machinery removed | Existed only because |
|---|---|
| Hold-for-review state, `onError: "hold"`, a `hold` decision in the evaluator | Money needs a non-answer |
| The mutable status envelope, `envelopeSequence`, per-surface freshness computation | Staleness had to change a decision *identically on every surface*, so freshness became evaluation input that had to be distributed and replay-protected |
| `maxPinAge`, the second age dimension | Deliberate pinning still withholds money wrongly |
| The rule that money actions may not use the action-map array shorthand | A version bump must not widen what a keeper can withhold money over |
| "A stale layer holds every request it governs, not just matches" | Only meaningful when staleness changes an outcome |

None of that is wrong. It is right, and hard-won — several items are review findings that caught
real safety bugs. It is simply not needed to hide a picture, and carrying it made the buildable
part of the design unbuildable.

**And the blocking dependency is not engineering.** Financial screening needs a real sanctions or
fraud data source, a licensing relationship with whoever maintains it, an appeals path with legal
review, and staff to run the hold queue. Specifying the schema first would be building against
assumptions no real provider has confirmed.

## What it reuses from v1

Deliberately a lot, which is the payoff for keeping the leaf semantically neutral:

- **Subject canonicalization** unchanged — `cid`, `address`, `channel`, same subject keys.
- **List documents** unchanged — the same local list format, the same entries.
- **The membership evaluator** (`lookup`) unchanged — a subject's asserting layer set is the same
  question regardless of what the answer is used for.
- **Canonical serialization**, strict parsing, and the fetch bounds, unchanged.
- **The extractor concept** and the definition of what a layer *governs*, which is load-bearing here
  in a way it barely is in v1.

What it does **not** reuse: the content bundle, its activation rules, and its freshness model. This
system resolves and holds its own policy, server-side, and the shared code stops at the membership
layer. Sharing the bundle was the mistake; sharing the subject model was not.

## The design as it stood

Preserved so the reasoning is not lost. Treat as a starting point to be re-reviewed, not a spec.

### Actions and their extractors

```text
reject-claim:            claim.channel        → channel subject
                         claim.claimantWallet → address subject
                         claim.payoutWallet   → address subject
refuse-gas-sponsorship:  op.sender            → address subject
                         op.target            → address subject
```

A surface that omits `payoutWallet` from its extraction has silently narrowed the operator's
sanctions policy without changing a line of policy config, which is why the extractor is spec rather
than per-surface glue.

**These mappings may never use the array shorthand.** `{ "sanctions": ["reject-claim"] }` is
forbidden; `{ "sanctions": { "address": ["reject-claim"] } }` is required. The shorthand expands to
every subject type the action's extractors can yield, and that expansion changes when the schema
adds a subject type. A mapping that silently widens what a keeper can withhold money over is not
something to inherit from a version bump.

**Financially consequential actions are never implied.** There must be no configuration under which
subscribing to a list gets a keeper power over money by default.

### Two ages, both of which matter

- `maxResolutionAge` — time since *we* last successfully resolved the layer. Exceeding it is our
  failure and says nothing about the source.
- `maxCheckpointAge` / `maxPinAge` — how old the *decision data* is. For a followed head this means
  the keeper has gone quiet. For a pinned layer `maxResolutionAge` is meaningless (the pin resolves
  instantly, forever), so a money layer declares `maxPinAge` measured from the pinned version's
  checkpoint block time. An operator who pinned deliberately — say, after suspecting keeper
  compromise — has still frozen a sanctions list the world has moved past. **Deliberate staleness
  withholds money exactly as wrongly as accidental staleness.**

### Staleness holds every request the layer governs, not just the matches

The intuitive reading — hold the claims that match the stale document — is wrong in the more
dangerous direction. A stale sanctions layer errs both ways at once: it retains a claimant who has
since been delisted, *and* it omits one who has since been added. Holding only the matches handles
the first and pays out on the second.

So once a money layer is past its freshness threshold, **every request that layer governs is held**,
whether or not any of its subjects appear in the cached document. "Governs" is the action-map
definition from [README.md § Each action declares a subject extractor](./README.md#each-action-declares-a-subject-extractor)
— not a manifest's prose scope and not the cached document's contents. A sanctions layer mapped
`{ "address": ["reject-claim"] }` governs every claim naming any wallet, which is all of them, so a
stale sanctions layer holds all claims. Reading the map rather than the document is the point: "the
stale copy lists nobody" is exactly the state a stale layer cannot be trusted about.

The one exception is a request another *fresh* layer decides conclusively, and only one direction is
conclusive: **if a current layer asserts the subject, reject.** A fresh layer's silence decides
nothing, because the stale layer is the one that might have listed it. Auto-pay requires every layer
governing the request to be fresh.

### `onError: "hold"`

As `closed` — carry the last verified artifact forward — but once that artifact is past its
freshness threshold, the requests the layer governs go to hold-for-review rather than being
auto-rejected. Required for any layer mapped to a money action.

Degrading closed (refusing outright) stays reserved for having no verified document at all.

### The status envelope

A mutable artifact republished next to the immutable bundle each resolution cycle, carrying per-layer
`lastResolvedAt` and `carriedForward`, plus `generatedAt` and `lastSuccessfulCycle` for the resolver
itself. It exists because the stale/held determination must be identical on every surface, and
leaving each surface to derive it means two surfaces enforcing the same digest disagreeing about
whether a claim holds.

It needs its own monotonic `envelopeSequence`, separate from the bundle's `sequence`: the bundle's
counter stays put across cycles that change nothing, and a counter that does not move cannot detect
a replayed envelope. **That is the attack that matters** — replaying a stale envelope against a
current bundle makes stale layers look fresh, which is exactly how a money hold gets suppressed.
Surfaces reject an envelope whose `envelopeSequence` is not greater than the one they hold, apply an
envelope only to the bundle it names, and treat an old `generatedAt` (a dead resolver) as staleness
of every layer.

Because money surfaces are all server-side, this is cheaper to deliver here than it was in v1, where
it also had to reach the browser. If this system needs signatures — and it does the moment either
artifact crosses a hop the operator does not control — the envelope needs the stronger treatment.

### Evaluator API

`evaluate` returns a third decision:

```text
evaluate(action, request) -> { decision: "allow" | "block" | "hold",
                               assertedBy, subjects, digest, status }
```

with `status` including `held`. v1's two-value enum is widened here rather than there, so no content
surface ever has to handle a state it has no queue for.

## Open questions if this is picked up

1. **Is a policy list even the right shape for sanctions data?** OFAC-style lists are name-and-alias
   matching with fuzzy semantics, not exact-identifier set membership. Exact wallet addresses are a
   small subset. This may want a provider integration rather than a list subscription — the same
   conclusion [README.md § What this does not solve](./README.md#what-this-does-not-solve-real-world-safety-lists)
   reaches for CSAM fingerprints.
2. **Who staffs the hold queue, and what is the SLA?** A hold with nobody behind it is a rejection
   with extra steps and worse honesty.
3. **What does the claimant see?** "Held for review" is a materially different disclosure from
   "rejected", with different legal weight.
4. **Does gas sponsorship need this at all**, or is a spend cap the proportionate control? Refusing
   sponsorship is much less severe than withholding a claim, and may not warrant the same machinery.

## If this is picked up, pick it up with simplification as the goal (Adam, 2026-08)

Everything expensive here descends from one requirement: money actions need a third answer
(**hold**) when policy data is stale. Hold state, the replay-protected status envelope, per-surface
freshness, the second age dimension — all of it follows from that. So the first question of any such
session is not "how do we build this well" but **whether we accept a cruder rule and delete most of
the machinery**: always hold, or just keep the hand-maintained `BLOCKED_CHANNEL_IDS` list that
`platform-api-service` gates claiming with today.

Two specific reductions to weigh first:

- **Killing `refuse-gas-sponsorship` outright** (open question 4) is probably the single biggest
  simplification available. The concern isn't whose money funds the tank — creators fund their own —
  it's that we operate the paymaster endpoint that signs the sponsorship, so it's a facilitation
  question, not a funding one. A spend cap may be the proportionate control.
- **Open question 1 is more fundamental**: if sanctions screening wants a provider integration
  rather than a list subscription, most of the schema work evaporates.

And the real blockers are non-engineering regardless: a concrete sanctions/fraud data source, a
licensing relationship, an appeals path, and someone to staff the hold queue.
