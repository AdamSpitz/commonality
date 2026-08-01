# Spike 1a: recover PublishedData from *nested* calldata

Status: **run, the result is positive, and the design it validated has since shipped** (2026-08-01).

> **Follow-up:** the pointer-only change is now implemented. Production `PublishedData` emits
> `DataPublished(publisher, dataId)` with no content, the indexer serves pointers only, and the
> walker below has been ported into the SDK as
> `sdk/src/subsystems/published-data/calldata.ts` behind the `ContentResolver` seam. `recover.mjs`
> is kept here as the spike record; the SDK copy is the one under test and in use. The fixture
> runner now deploys the real `PublishedData` contract rather than a stand-in, since production is
> the pointer-only shape.

This settles the part of spike 1 that [`the-graph-calldata`](../the-graph-calldata/README.md) left
open. That spike showed calldata recovery works and is fast, but only for three tiny documents
published by direct EOA calls — no smart accounts, no batches, no transactions containing several
publications. Its own conclusion named the gap:

> smart-account/UserOperation and batch-call decoding; associating multiple `DataPublished` logs
> with nested calls in one transaction

That is the open precondition in [`specs/tech/indexer/the-graph.md`](../../specs/tech/indexer/the-graph.md):

> Retrieval must work for every supported publication path and must unambiguously associate a
> `DataPublished` log with the corresponding nested call if a transaction contains multiple
> publications. If that cannot be made simple and reliable, the calldata-only design is not ready.

**It can be made simple and reliable.** All 14 publications across 9 routes were recovered and
hash-verified, and every one resolved unambiguously.

## Run

```sh
cd hardhat && npx hardhat run scripts/nested-calldata-fixtures.js --network hardhat
```

The script exits non-zero if any log fails to recover, fails hash verification, or cannot be
resolved to a single call. It runs against the production `PublishedData` contract, which is now
itself pointer-only, so the recovery genuinely has nothing but calldata to work from.

## What was tested

Fixture wrappers in [`hardhat/contracts/test/PublicationRouteFixtures.sol`](../../hardhat/contracts/test/PublicationRouteFixtures.sol)
reproduce the calldata shapes of each route. The decoder under test is
[`recover.mjs`](./recover.mjs), written viem-only so it can move into the SDK unchanged.

| # | Route | Logs | Recovered |
|---|---|---:|---:|
| 1 | Direct EOA call | 1 | 1 |
| 2 | Kernel `execute`, single | 1 | 1 |
| 3 | Kernel `execute`, batch of 3 publications | 3 | 3 |
| 4 | Kernel batch, publication mixed with a `setBelief` call | 1 | 1 |
| 5 | Kernel batch, same content published twice | 2 | 2 |
| 6 | EntryPoint `handleOps` → `execute` → `publishData` | 1 | 1 |
| 7 | `handleOps`, two ops from **different accounts**, identical bytes | 3 | 3 |
| 8 | Multicall3 `aggregate3` (negative fixture) | 1 | 1 |
| 9 | 48 KB document through a Kernel batch | 1 | 1 |

Totals: **14 logs, 14 recovered, 14 hash-verified**, 55,820 content bytes, 12 resolved to a single
call and 2 residual ties that are provably harmless (see below).

## The three findings

### 1. Association is by content, not by position — but it needs *both* topics

The pleasant result is that you never have to track call ordering or match logs to calls
positionally. `dataId` **is** `sha256(content)`, so any call in the transaction whose content hashes
to the log's `dataId` holds, by definition, the right bytes. The nesting only has to be walked well
enough to enumerate candidate calls; it does not have to be walked *faithfully*.

The spike's most useful finding is that **hashing alone is not sufficient**, which was the design
I wrote first. Route 7 breaks it: one bundle, two different smart accounts, byte-identical content.
That produces distinct `DataPublished` logs which hash-only matching cannot tell apart, so
attribution silently lands on the wrong account.

The fix is to key on the log's full `(publisher, dataId)` pair — both are indexed topics, both are
free to read. With that, route 7 resolves all three logs to three distinct call paths.

### 2. Residual ties are provably harmless

Route 5 publishes identical bytes twice from the same account, so even the two-topic key leaves two
candidates. This cannot matter: anything still tied after matching on publisher *and* content hash
is byte-identical by construction, so which candidate is chosen cannot change the recovered
content. This is why the two ties in the summary are reported as resolved rather than as failures.

### 3. Multicall3 is unusable for publishing — independently of decoding

Route 8 decodes fine, but the publication is attributed to the **aggregator contract**, not the
user, because `PublishedData` keys on `msg.sender`. This is a property of the contract, not of
calldata recovery, and it is true today. Worth recording so nobody later adds a Multicall3 path to
batch a publish with something else: the batching primitive has to be the user's own smart account.

## Limitations — read before relying on this

- **The wrappers are fixtures, not the real contracts.** They reproduce the *calldata encoding* of
  Kernel v3 `execute(bytes32,bytes)`, EntryPoint v0.7 `handleOps` (using the real
  `PackedUserOperation` struct) and Multicall3 `aggregate3`, with no validation, signatures or gas
  accounting. Since ABI encoding is fully determined by the function signature, this is sound for
  the decoding question — but it is not evidence that a real bundler produces exactly these shapes.
  The Kernel selector `0xe9ae5c53` and the single/batch call-type split were cross-checked against
  the independently written production decoder in
  [`platform-api-service/src/sponsoredGasPaymaster.ts`](../../platform-api-service/src/sponsoredGasPaymaster.ts),
  which agrees.
- **Local chain only.** This spike deliberately answers the *structural* question and says nothing
  about latency; that was spike 1's job. A real Base Sepolia fixture through a live bundler is
  still the honest confirmation.
- **Still open from spike 1:** realistic cold-page fanout and payload sizes, throttling under tens
  or hundreds of concurrent lookups, and whether old transactions stay retrievable from ordinary
  browser-reachable RPCs over the long run. The last of these is the one that matters most, since
  it is an archive-availability assumption rather than a decoding one.
- The walker reports calls it did not descend into as `unexplored`. This is a diagnostic, not a
  failure signal — the log set is the ground truth for completeness, and a fully recovered log set
  means nothing was missed. It exists so an unrecoverable log arrives with a pointer to the call
  shape that would need to be taught to the walker.

## Conclusion

The nested-calldata objection does not block the pointer-only design. Recovery works through every
supported publication route including three levels of nesting, and log-to-call association is not
merely tractable but essentially free, because content addressing does the work — provided the key
is `(publisher, dataId)` rather than `dataId` alone.

Remaining risk on the calldata retrieval path is **archive availability and latency at real page
fanout**, not decoding.
