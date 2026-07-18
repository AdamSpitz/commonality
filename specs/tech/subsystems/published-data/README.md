# PublishedData

Status: **proposed / not yet scheduled** (Jul 2026). A utility subsystem generalizing the [self-published-statements](../conceptspace/self-published-statements.md) calldata design into a single publication contract + reader library that every content type can share. Motivation: [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md) (drop the IPFS dependency) and [statement-hosting.md](/specs/product/legal/statement-hosting.md) (the author, not us, is the publisher).

## Readiness note: design resolved except remaining cost benchmark (Jul 2026)

The statement-hosting posture is directionally sound: drop the general-purpose Tally browser, make Tally an embedded signing module, move publication toward user-paid/user-signed calldata, and keep display/re-serving as curated, denylistable vertical policy. The core reasoning is that legal duties attach to the role we occupy, not merely to the technical ability to delete bytes; user self-publication shrinks our role in a way that operator-uploaded permanent storage would not.

A Jul 2026 design-resolution pass settled the three conceptual questions that were blocking. The remaining cost benchmark can be answered before mainnet; it doesn't affect the data model or the legal posture.

**Resolved:**

1. **Statement identity vs. publication identity — the statement is its CID; publication is an internal `(publisher, cid)` fact.** Everything downstream (support, references, rendering, discovery) names a statement by its **CID**. The `(publisher, cid)` keying is internal plumbing used for exactly two things: availability and retraction. A statement is **live in a given display iff at least one publication `(publisher, cid)` that the display honors is not retracted by that publisher.** Multiple publishers of identical bytes compose by OR — the statement stays available as long as any honored publisher keeps it live, and one publisher's retraction removes only that publisher's copy. UIs render "statement X"; "Alice's publication of X" is provenance, surfaced only where who-stands-behind-it matters (see the [speaker-vs-redistributor distinction](/specs/product/legal/statement-hosting.md#two-liability-roles-two-retraction-paths)).
2. **Beliefs existence checks — `supportStatement` does NOT require `isPublished`.** Support is a pure attestation about a CID (threaded-forum semantics: a reply survives the parent's deletion). Existence/availability is a display-layer concern, not an onchain gate. `publishData` remains the mechanism by which a statement *exists* — still needed for unsigned statements (negations, bridge statements, seed clusters) — but support never checks it. The lost onchain garbage-CID protection was near-worthless: real UIs compute the CID from the content the user is looking at, and raw-transaction users are unpoliced by design. `isPublished` becomes informational, not a gate.
3. **Retraction semantics — suppress the retracting publisher's publication only; availability and aggregation follow the OR rule above.** A statement with no honored live publication is suppressed *and* drops out of aggregates (honoring covers counts, not just rendering — folding it into "118 supporters" is itself a display act). An orphaned support (its CID has no honored live publication) still exists on-chain as the supporter's own attestation but renders as "supports an unavailable/retracted statement" and isn't tallied. Vertical republishes and curation copies are just additional publications (publisher = the vertical), retractable by the vertical. References from other statements render placeholders. *(This was open question #4 in the prior list; renumbered here.)*

**Implementation choices and remaining technical benchmark:**

4. **Canonical content identifier format.** First implementation choice is pinned in code: store `bytes32 dataId = sha256(content)` and reconstruct the user-facing CID as CIDv1/base32 with the `raw` multicodec and sha2-256 multihash (`@commonality/sdk/subsystems/published-data` exports `computePublishedDataId`, `publishedDataIdToCid`, and `publishedDataCidToId`). This preserves the existing bytes32 statement references while keeping the canonical identity CID-shaped.
5. **Calldata/event encoding and cost benchmark.** First implementation emits the content bytes in `DataPublished` as well as carrying them in calldata, because it makes indexer extraction straightforward and keeps the contract storage-free. Benchmark tooling now lives at `npm run benchmark:published-data --workspace=hardhat` and compares the production contract with a benchmark-only calldata-only variant for 1KB, 4KB, and 10KB payloads. Run the same script against Base Sepolia before mainnet if fee conditions need live confirmation; if the event-byte premium is unacceptable, switch to calldata-only extraction without changing the publication/retraction data model.

With the conceptual decisions recorded and the CID representation pinned, the remaining pre-mainnet technical work is the calldata/event byte benchmark. Treat this file as the accepted, largely-resolved design.

## The primitive

The fundamental fact this system records is not "here's some data" — it's **"Alice published this data."** Content is content-addressed (CID), but publication is keyed by **(publisher, cid)**: the same bytes published by two addresses are two publication acts, each owned, and each retractable, by its own publisher. This is the legal thesis (attribution of speech to the author's address) expressed directly in the data model, and it prevents the burn attack where Alice publishes-then-retracts X to make X unusable for everyone else.

## Contract surface

One immutable, admin-less contract, shared by all verticals and usable by anyone:

- **`publishData(bytes content)`** — hashes the calldata bytes, verifies/derives the CID, records the publication for `(msg.sender, cid)`, emits `DataPublished(publisher, cid)`. Duplicate publication by the same publisher no-ops (or reverts — scheduling-time detail).
- **`retractData(bytes32 cid)`** — records a retraction attestation for `(msg.sender, cid)`, emits `DataRetracted(publisher, cid)`. Note the deliberate generality: this is *an attestation about a CID by an address*, and any address may retract any CID — retracting your own publication is just the primary case. A vertical's denylist keeper, or a regulator, can publish "this CID should be retracted" the same way. **No authority is baked into the contract**; who to *honor* is display-layer policy (below).
- **View functions** — `isPublished(publisher, cid)`, `isRetracted(publisher, cid)` — available for any consumer that wants an onchain existence/retraction check. Note the resolved decision (readiness note): `supportStatement` does **not** gate on `isPublished` — existence is a display-layer concern — so these views are informational, not a required gate.

**Storage vs. calldata vs. events.** Content bytes are never written to contract storage (~20k gas per 32 bytes — prohibitive, and unnecessary). Only the small facts are stored: the publication bit and retraction bit per (publisher, cid). The bytes ride in calldata and are recoverable from transaction history; whether to *also* emit them in the `DataPublished` event body (8 gas/byte, makes indexer extraction trivial without calldata access) is a scheduling-time decision. No contract can ever read the content onchain — consumers get existence/retraction bits only, which is all they need.

**No context/topic tag.** We considered an indexed hint field so operator-scoped indexers could filter ingestion cheaply, and rejected it: it's publisher-supplied and therefore spoofable, so no indexer could trust it — and a field that must not be believed shouldn't exist. Discovery stays recognition-driven (verticals ingest what their supports/references/curation point at) and can filter by known publisher addresses.

## Reader library (off-chain, in the SDK)

The Solidity side of "reading" is just the view functions above. The real reader lives in the SDK, backed by the indexer's cache of publication calldata/events:

- **`readData(publisher, cid)`** returns a discriminated union whose data field is *named by status*:
  - `{ status: 'active', data }`
  - `{ status: 'retracted', retractedData }`
  - `{ status: 'not-published' }`

  Nobody accesses `retractedData` by accident, and the type system forces a status check before `.data` even typechecks. Ignoring retraction becomes something you must visibly type, not something you get by default.
- **`readActiveData(publisher, cid)`** — convenience for the common UI path: returns the data, or `null` if not published *or* retracted.
- **`readRetractions(cid, retractors)`** — returns which of the given addresses have retracted the CID, for display layers that honor retractors beyond the publisher (below).

## Honored retractors: the denylist, generalized

Because retraction is just an attestation, "compliant viewer checks the retraction flag" generalizes to: a display layer honors the retraction attestations of **the publisher, plus whichever other addresses that display layer chooses** — its vertical's denylist keeper, optionally a jurisdiction's regulator, etc. This is the existing per-operator denylist ([operator-posture.md](/specs/product/legal/operator-posture.md)) made onchain, interoperable, and transparent.

Two rules keep this from becoming a censorship lever:

1. **The contract and the library defaults honor only the publisher's own retraction.** Additional honored retractors are explicit, visible, per-display-layer configuration — policy each operator owns, like their denylist today.
2. **Honoring covers aggregation, not just rendering** — same requirement as the denylist (exclusion from counts, not merely "don't display").

Default UI behavior for retracted content: suppress it, stop counting it in aggregates, and show "retracted by author" (or "suppressed under this site's policy", for non-publisher retractors) where a reference would otherwise render it.

## Remaining integration work

- **Indexer ingestion:** add `DataPublished`/`DataRetracted` handlers, cache content bytes keyed by `(publisher, dataId)`, and expose active/retracted publication status to SDK/UI readers. The first implementation can read content from the event body; if the benchmark forces calldata-only extraction, the data model stays the same but the handler must fetch transaction input.
- **Conceptspace composer:** replace statement IPFS upload on the new-author path with a `publishData(bytes)` transaction, compute/display the canonical PublishedData CID client-side, and keep `supportStatement` ungated.
- **Display and aggregation policy:** suppress and stop tallying statements whose honored live publications are empty after publisher self-retractions plus any explicit vertical policy retractors. Library defaults should honor only publisher self-retraction. The CID-first read boundary (`read(cid, policy?)`), the storage-agnostic `DocumentStore` seam, and the by-CID resolver that this policy requires are specified in [cid-first-reads.md](./cid-first-reads.md).
- **Legacy fallback:** keep existing IPFS fetching for already-published CIDs until historical statements are migrated or explicitly grandfathered.

## Transitive aggregation and the re-anchor nudge

The direct-support display policy (above) suppresses a retracted statement and drops it from its own counts. This section resolves the harder case the OR-rule implies: **support that reaches a target only *transitively*, through a via-statement that has since been retracted.**

Conceptspace's implication graph counts you as an *indirect* supporter of B if you signed some A where an attester (one the viewer trusts) has asserted `A implies B` (see [self-published-statements](../conceptspace/self-published-statements.md) and the indirect-supporter computation in `sdk/src/subsystems/conceptspace/queries.ts`). The decision:

**A via-statement retracted by its publisher contributes neither its believers nor any weight to a target's aggregate.** Availability governs aggregation, not just rendering (readiness-note #3): if Alice retracts A, then B's headline must stop counting the supporters who reached B only through A, exactly as B's own page would stop counting a retracted B. Otherwise the retraction that is honored everywhere else leaks back into B transitively — a half-applied retraction, which the spec treats as worse than none. Implementation: enrich the unique via-statement CIDs through the same honored-retraction check the aggregate-list path uses, and drop retracted via-statements before the believer union. Only the *from*-side needs this; a retracted target is already handled by its caller.

**`retracted` and `unavailable` are not the same, and only `retracted` suppresses from counts.** A statement is `unavailable` when its content host was merely unreachable at read time (an IPFS timeout, an event-cache miss) — a *transient* condition. If transient unavailability dropped statements and their transitive supporters from aggregates, headline counts would flap with infrastructure weather. So the aggregation policy suppresses only genuine, honored **retractions**; transient unavailability must not silently delete support. (This aligns the direct-support path too — it should not permanently drop `unavailable` statements from counts either.)

This suppression is the correct aggregate behavior, but on its own it is a **silent** loss: the signer made a real, still-on-chain attestation on A, and their underlying view may not have changed. The re-anchor nudge keeps it from being silent.

**On retraction, the signer is offered a chance to re-sign, *directly*, any still-endorsed statements the retracted one implied** — converting fragile transitive support into a robust direct signature that survives future retractions. This is a retraction-triggered mode of the **existing** implication-graph nudger (which already walks the arrows out of a statement), not a new nudger; implications stay gated by the viewer's trusted attesters, so the transitive count was never illegitimate — retraction simply withdrew the via-statement, and the nudge offers sturdier footing. It fires **only on an actual `DataRetracted` event**, never on transient `unavailable`, batched one-per-(signer, retracted-statement). Full treatment in [nudges.md § Retraction re-anchor](../conceptspace/nudges.md#3-retraction-re-anchor).

**Showing the signer what they signed — no separate "personal copy" store is needed.** For a publisher self-retraction, nothing is deleted: the `DataPublished` event and its bytes persist on-chain and in the indexer's raw log, and the SDK reader still hands them back — `readData` returns `{ status: 'retracted', retractedData }`, naming the bytes by status so a client must reach for them consciously rather than by accident. So the nudge can show A directly from `readData().retractedData`; the signer never loses access to what they signed. The only case where our own API stops serving A is a **denylist/regulator takedown** (the redistributor compliance path, below) — and there the honest last-resort route is a *user-device* copy the reader kept themselves (a literal screenshot). We deliberately do **not** build an operator-hosted per-user copy store: storage engineered to survive a takedown would be actively anti-compliance, and it would re-import the operator-storage role this whole subsystem exists to shed. A purely client-side local cache of already-fetched bytes is an optional nice-to-have for that denylist case only, never a prerequisite.

**Denylist takedown: filter, don't purge.** When a vertical honors a denylist/regulator retraction, its indexer/API stops *serving* those bytes — a serving-layer filter on the CID — but does **not** purge them from the raw event store. The content exists on-chain regardless; deleting our dumb local mirror of public chain data buys no real removal and needlessly complicates the deliberately-bare indexer. (If some specific legal order ever genuinely compelled purging an operator's own copy, that's a narrow exception to handle then, not the default.)

**Dependency order:** (1) ship the transitive aggregate filter (retracted-only) — small, correct on its own; (2) the retraction-triggered re-anchor nudge, using `readData().retractedData` to show the signer what they signed. An optional client-side copy cache for the denylist case can come later, or never.

## What routes through PublishedData — and what doesn't

**Through it:** conceptspace statements ([self-published-statements.md](../conceptspace/self-published-statements.md) becomes a consumer of this subsystem), LazyGiving project/token metadata, content-funding contract metadata, our own editorial documents — every content type in the [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md) inventory that is "a document someone publishes."

**Not through it:**

- **Mutable-refs lists** — those become plain per-item events reconstructed by the indexer; no CID payload, no retraction semantics needed.
- **Nudges** — deliberately off-chain and retractable-without-trace ([nudges.md](../conceptspace/nudges.md)); routing them through PublishedData would give them exactly the permanence the nudges spec rejects.
- **Images / large binaries** — calldata pricing makes these the one genuinely expensive case; policy per [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md) (skip, inline-small-only, or hash-anchored external hosting).

## Why this is worth building (the "isn't this silly?" question)

It can look like bolting retractability onto a fundamentally unretractable medium. The honest answer: **unretractability is what publication on the Internet already is** — archives, caches, mirrors, screenshots. Deletion on the ordinary web is a polite fiction; what actually happens when a court orders removal of mirrored content is that canonical sources and findable surfaces comply, retraction notices are published, and stray copies persist without much consequence. Newspapers have run on retraction-not-erasure for centuries. PublishedData builds the true shape of publication *honestly*: retraction as a first-class, signed, permanent speech act, honored at the layers where findability actually lives, with no pretense that the bytes are gone (see the consent-language requirements in [statement-hosting.md](/specs/product/legal/statement-hosting.md#permanence-cuts-back-the-users-side-of-the-bargain)).

The alternatives are worse on their own terms: users self-hosting means users running websites (they won't; link rot destroys the attestation record), any hosted path returns the operator role, and the storage networks fail the rent/pay-once analysis. Calldata is the only option that is simultaneously operator-free, pay-once, attributable, and verifiable.

**The honest cost:** this is a contract + library + indexer surface + UX convention that every consumer must integrate correctly, and a half-adopted retraction system is worse than none — users told "retraction is your lever" while half the displays ignore it. Mitigation: we control all the initial display layers, so conformance is total on day one, and "compliant viewer" is established as the norm before any independent operator arrives.
