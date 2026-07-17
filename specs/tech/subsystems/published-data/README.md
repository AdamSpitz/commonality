# PublishedData

Status: **proposed / not yet scheduled** (Jul 2026). A utility subsystem generalizing the [self-published-statements](../conceptspace/self-published-statements.md) calldata design into a single publication contract + reader library that every content type can share. Motivation: [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md) (drop the IPFS dependency) and [statement-hosting.md](/specs/product/legal/statement-hosting.md) (the author, not us, is the publisher).

## The primitive

The fundamental fact this system records is not "here's some data" — it's **"Alice published this data."** Content is content-addressed (CID), but publication is keyed by **(publisher, cid)**: the same bytes published by two addresses are two publication acts, each owned, and each retractable, by its own publisher. This is the legal thesis (attribution of speech to the author's address) expressed directly in the data model, and it prevents the burn attack where Alice publishes-then-retracts X to make X unusable for everyone else.

## Contract surface

One immutable, admin-less contract, shared by all verticals and usable by anyone:

- **`publishData(bytes content)`** — hashes the calldata bytes, verifies/derives the CID, records the publication for `(msg.sender, cid)`, emits `DataPublished(publisher, cid)`. Duplicate publication by the same publisher no-ops (or reverts — scheduling-time detail).
- **`retractData(bytes32 cid)`** — records a retraction attestation for `(msg.sender, cid)`, emits `DataRetracted(publisher, cid)`. Note the deliberate generality: this is *an attestation about a CID by an address*, and any address may retract any CID — retracting your own publication is just the primary case. A vertical's denylist keeper, or a regulator, can publish "this CID should be retracted" the same way. **No authority is baked into the contract**; who to *honor* is display-layer policy (below).
- **View functions** — `isPublished(publisher, cid)`, `isRetracted(publisher, cid)` — so consumer contracts (e.g. Beliefs requiring a statement to exist before `supportStatement`) get existence checks onchain.

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
