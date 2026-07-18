# CID-first reads and the `DocumentStore` seam

Status: **DocumentStore adapters implemented; conceptspace query reads migrated with legacy fallback; broader read-path rollout in progress** (Jul 2026). Companion to
[README.md](./README.md); this note pins the *read boundary* for content that has
migrated onto PublishedData, and the storage-agnostic seam that keeps the IPFS→PublishedData
migration a refactor rather than a fork.

## The problem this resolves

The migration was supposed to be "swap the storage, leave the rest alone." The risk was
that the underlying `(publisher, cid)` keying of PublishedData would leak all the way up to
every caller — a `read(publisher, cid)` boundary — forcing an `if (publishedData) {…} else {…}`
branch at each call site and breeding duplicate code across the codebase.

That leak is also **wrong by the spec.** README readiness-note #1 is explicit:

> the statement is its CID; publication is an internal `(publisher, cid)` fact. Everything
> downstream names a statement by its **CID** … A statement is live in a given display iff at
> least one publication `(publisher, cid)` that the display honors is not retracted by that
> publisher. Multiple publishers of identical bytes compose by OR.

So the read boundary callers see is **`read(cid, policy?)`** — never a publisher. You ask by
CID; the content comes back as long as *any honored publisher* has published-and-not-retracted
it. The `(publisher, cid)` reader library (`readData`, `readActiveData`, `readRetractions`)
stays exactly as-is — it is the spec-sanctioned low-level plumbing — and the CID-first read is
built *on top* of it.

## The read result type

```ts
type DocumentReadResult =
  | { status: 'active';      document: DisplayableDocument }
  | { status: 'retracted';   retractedDocument: DisplayableDocument } // honored retraction → suppress AND drop from counts
  | { status: 'unavailable' }                                          // transient host miss → do NOT drop from counts
  | { status: 'not-published' }
  | { status: 'invalid' };
```

`retracted` and `unavailable` are deliberately distinct (README §"Transitive aggregation",
the `retracted` vs `unavailable` rule): only an honored, on-chain `DataRetracted` suppresses a
statement from aggregate counts. A transient miss (indexer unreachable, event-cache miss) must
never silently delete support, or headline counts flap with infrastructure weather.

## The `DisplayPolicy`

```ts
interface DisplayPolicy {
  /** Retractors honored beyond each publication's own publisher. Default: none. */
  honoredRetractors?: readonly Address[];
}
```

This is the "fancier policies later" hook from README §"Honored retractors". Default behavior
honors only each publication's own publisher (self-retraction removes only that publisher's
copy). A display layer may additionally honor a vertical's denylist keeper or a regulator; an
honored non-publisher retractor suppresses the *whole* CID under that policy. Two spec rules
hold: the honored set is explicit per-display-layer config, and honoring covers aggregation,
not just rendering.

## The storage-agnostic seam

```ts
interface DocumentStore {
  publish(doc: DisplayableDocument): Promise<PublishedDocumentResult>;
  read(cid: IpfsCidV1, policy?: DisplayPolicy): Promise<DocumentReadResult>;
}
```

Two adapters implement it:

- **PublishedData adapter** — `publish` = validate + `publishData(canonicalBytes)`; `read` =
  resolve the CID across publishers (below), parse the bytes into a `DisplayableDocument`,
  mapping `active`/`retracted`/`not-published` through, adding `invalid` on parse failure and
  `unavailable` on a thrown fetch.
- **IPFS adapter (legacy)** — `read` ignores `policy`, never returns `retracted`, maps a
  timeout → `unavailable` and a permanent miss → `not-published`.

The backend is chosen **once** (from `machinery`/`contracts`), so the call-site
`if (contracts.publishedData)` branch in `conceptspace/actions.ts` collapses to
`const publication = await store.publish(statementData)`. `PublishedDataCid` is literally
`IpfsCidV1`, so both backends already produce the same `b…` CID type — no bridging needed.

## The missing plumbing: by-CID resolution

The existing `PublishedDataCache` is keyed entirely by `(publisher, dataId)` — every method,
and the event-cache filters `DataPublished` by `topic1 = publisher`. So it **cannot** answer
"who published this CID?", which the OR-across-publishers `read(cid, policy)` needs. This is
the spec's unbuilt "Display and aggregation policy" bullet.

The event cache already supports the query, though: `fetchEvents` accepts `topic2` (the dataId)
*without* `topic1`, and returns `topic1` on every event — so enumerating publishers of a CID is
one query, and the retractors of a CID another. Content rides in the event body and is
content-addressed (identical for every publication), so the bytes fall out of the same query.

`published-data/by-cid.ts` implements this as `createEventCacheCidResolver(machinery) →
resolveByCid(dataId, policy?)`:

```
CidResolution =
  | { status: 'active';    data; livePublishers }
  | { status: 'retracted'; retractedData }   // published, but no honored-live publication
  | { status: 'not-published' }
```

Resolution rule:

1. No `DataPublished` for the CID → `not-published`.
2. `retractors` = publishers of `DataRetracted(cid)`. If any `policy.honoredRetractors` is in
   `retractors`, the whole CID is suppressed under this policy → `retracted`.
3. Otherwise `livePublishers` = publishers whose own address is not in `retractors` (each
   self-retraction removes only that publisher's copy). Non-empty → `active`; empty → `retracted`.

`unavailable` is not produced here — a failed `fetchEvents` throws, and the `DocumentStore`
adapter maps that thrown transient error → `unavailable`. In the calldata world "content
unavailable" collapses into "indexer unreachable," which is exactly the transient case.

### Known limits

- **Pagination.** The by-CID query is unbounded in a way the old per-`(publisher, cid)` query
  was not (a popular CID can have many publishers/retractors). `limit` defaults to 1000; a CID
  exceeding that truncates. Not solved yet — acceptable near-term.
- **api-cache parity.** The indexer now exposes `/api/published-data/{dataId}` for CID/dataId-first resolution across publishers. The SDK still uses the event-cache resolver as the primary by-CID path until a small API-backed `DocumentReader` adapter is added.

## Sequencing

1. **by-CID resolution in the cache layer** — implemented in `published-data/by-cid.ts`.
2. **`DocumentStore` with `read(cid, policy?)`** — implemented in
   `displayable-documents/displayable-document.ts` as `createPublishedDataDocumentStore(...)`
   and `createIpfsDocumentStore(...)`. The PublishedData store wraps the by-CID resolver and
   maps resolver/indexer failures to `unavailable`; the IPFS store presents the same interface
   for the legacy backend.
3. **Collapse the `conceptspace/actions.ts` publish branch** — implemented for
   `createAndSignStatement(...)`, which now selects one store and publishes through it instead
   of maintaining separate PublishedData/IPFS publishing flows.
4. **Conceptspace query read migration** — implemented for statement content enrichment,
   user belief/disbelief lists, aggregate browse-list suppression, and indirect-support
   retraction filtering. These paths use the CID-first PublishedData reader, preserve IPFS
   legacy fallback, and keep a temporary per-publisher API fallback until the indexer exposes
   `/api/published-data/{dataId}` by-CID parity.
5. **Indexer by-CID REST parity** — implemented as `/api/published-data/{dataId}`, matching the CID-first liveness rule: active if any publisher is live, retracted only if all indexed publishers self-retracted.
6. **Continue remaining caller migration to the CID-first read seam** — replace non-conceptspace
   ad-hoc displayable-document reads/fallbacks with `store.read(cid, policy?)` where a concrete
   display context can choose the appropriate storage backend and policy.
