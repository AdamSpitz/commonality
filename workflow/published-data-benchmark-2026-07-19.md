# PublishedData Base Sepolia gas benchmark note — 2026-07-19

Command run:

```sh
npm run benchmark:published-data:base-sepolia --workspace=hardhat
```

The script deploys two contracts on Base Sepolia for each content size:

- `PublishedDataCalldataOnly` — benchmark-only variant that carries content in calldata, stores the publication bit, and emits an event without the content bytes.
- `PublishedData` — production contract that carries content in calldata, stores the publication bit, and also emits the content bytes in `DataPublished`.

Output observed:

| Content bytes | calldata-only gas | calldata+event gas | event gas delta | extra log data bytes | event-byte floor |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1024 | 62700 | 71528 | 8828 (14.07%) | 1088 | 8704 |
| 4096 | 185220 | 185220 | 0 (0.00%) | 4160 | 33280 |
| 10240 | 430260 | 430260 | 0 (0.00%) | 10304 | 82432 |

## Interpretation

The 1KB row looks plausible: the measured premium is close to the raw EVM LOG data floor (`extraLogDataBytes * 8`).

The 4KB and 10KB rows are suspicious: the production receipt contained thousands of extra log data bytes, but `receipt.gasUsed` was identical to the calldata-only variant. On a normal EVM gas model, emitting those bytes should have a nonzero execution-gas cost.

Do **not** interpret the identical rows as "large event payloads are free." A safer interpretation is:

> The benchmark proves the production contract emits the expected extra event bytes, but `receipt.gasUsed` on Base Sepolia is not, by itself, a reliable measure of the full marginal cost/fee of duplicating content into event data.

Likely explanations to investigate:

1. Base/OP-stack receipt fields may separate or transform L1 data fees / DA fees / execution gas in a way this script does not capture.
2. The provider may report `gasUsed` in a way that omits the cost dimension relevant to log payload bytes.
3. The benchmark may need to compare actual paid fee fields (`effectiveGasPrice`, OP-stack L1 fee fields if available, transaction cost deltas from sender balance, or explorer receipts) rather than only `receipt.gasUsed`.
4. Less likely: a benchmark or compiler quirk. The script does count extra log bytes from receipts, so the event payload is really present.

## Follow-up for a fresh LLM

Improve the benchmark before using it for a mainnet/product decision:

- Inspect the full Base Sepolia transaction receipts for both variants at each size and record all fee-related fields returned by the provider.
- If Base exposes OP-stack L1 fee fields through RPC/explorer, include them.
- Consider measuring sender balance delta around each transaction as the canonical paid cost.
- Run the same benchmark on local Hardhat and/or an L1-like test network to confirm the expected nonzero LOG data delta.
- Update `hardhat/scripts/benchmark-published-data-gas.js` to print enough fields to explain the 0-delta rows.
- Then update `specs/tech/subsystems/published-data/README.md` with a final recommendation: keep calldata+event, or switch the indexer to calldata-only extraction.
