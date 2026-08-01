# The Graph spike 1: recover PublishedData from calldata

Status: **partially run, not decisive** (2026-07-31).

This tests the first precondition in
[`specs/tech/indexer/the-graph.md`](../../specs/tech/indexer/the-graph.md): after discovering a
`DataPublished` pointer, can a browser recover and verify its bytes from transaction calldata at
reasonable latency?

## Run

From the repository root:

```sh
node spikes/the-graph-calldata/benchmark.mjs
```

The script:

1. asks the deployed Base Sepolia event cache for all current `DataPublished` events;
2. fetches each distinct transaction with `eth_getTransactionByHash`, concurrently;
3. decodes a direct `publishData(bytes)` call;
4. verifies `sha256(content) == event.dataId` and, while the old event is deployed, checks the
   calldata bytes equal the event bytes;
5. repeats decoding from an in-memory cache;
6. runs against Base's public RPC and the configured `BASE_SEPOLIA_RPC_URL`, when present.

It prints no RPC URL or content. Environment defaults correspond to the committed Base Sepolia
deployment and can be overridden with `EVENT_CACHE_URL`, `PUBLISHED_DATA_CONTRACT_ADDRESS`, and
`BASE_SEPOLIA_RPC_URL`.

## Result from 2026-07-31

The deployment contained only **three** publications in three transactions. All were tiny
141-byte verifier smoke-test documents and all were direct EOA-to-`PublishedData` calls. There
were no real statement surfaces, smart-account calls, batches, or transactions containing
multiple publications.

Across five runs with all three transaction requests issued concurrently:

| Provider | Cold wall-clock range | Individual request range | Warm decode/verify |
|---|---:|---:|---:|
| Base public RPC | 169–244 ms | 137–244 ms | 0.59–1.49 ms |
| Configured Alchemy RPC | 234–311 ms | 204–310 ms | 0.22–1.42 ms |

All 15 recoveries per provider verified successfully. Total content per run was 423 bytes.

## Conclusion

The basic mechanism works: transaction calldata is sufficient to recover and authenticate content,
and three concurrent cold lookups added roughly 0.2–0.3 seconds in this very small sample. The
public endpoint was not merely adequate; it was faster in these runs.

**This does not settle Spike 1.** The current chain data cannot answer its important questions:

- realistic cold-page fanout and payload sizes;
- throttling under tens or hundreds of concurrent lookups;
- smart-account/UserOperation and batch-call decoding;
- associating multiple `DataPublished` logs with nested calls in one transaction;
- actual statement-detail, board, nudge-card and implication-neighbour surfaces.

Before adopting the calldata-only event, create a representative Base Sepolia fixture through each
supported publication route, including one batch with multiple publications, and benchmark actual
pages with an empty persistent cache. Until then the result is encouraging but **inconclusive**.
