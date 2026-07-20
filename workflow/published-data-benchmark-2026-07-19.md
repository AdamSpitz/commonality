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

## Follow-up progress — 2026-07-20

`hardhat/scripts/benchmark-published-data-gas.js` now prints sender balance deltas, `effectiveGasPrice`, `gasUsed * effectiveGasPrice`, and raw RPC receipt gas/fee fields when run with:

```sh
PUBLISHED_DATA_BENCHMARK_DETAILS=1 npm run benchmark:published-data --workspace=hardhat
```

A local Hardhat run reproduced the same suspicious shape:

| Content bytes | calldata-only gas | calldata+event gas | event gas delta | extra log data bytes |
| ---: | ---: | ---: | ---: | ---: |
| 1024 | 62700 | 71528 | 8828 (14.07%) | 1088 |
| 4096 | 185220 | 185220 | 0 (0.00%) | 4160 |
| 10240 | 430260 | 430260 | 0 (0.00%) | 10304 |

That makes a Base-Sepolia-provider-only bug unlikely. Sender balance deltas on local Hardhat exactly matched `gasUsed * effectiveGasPrice`; they did **not** reveal a hidden fee component. The balance deltas are still awkward for row-to-row comparison because each automined transaction can have a different `effectiveGasPrice`, but they are useful for confirming what the sender actually paid for each individual transaction.

The leading hypothesis is now that the charged transaction gas is hitting a calldata-dominated transaction floor / accounting rule for larger payloads, so the extra LOG execution gas is real in the EVM model but does not raise the charged `receipt.gasUsed` once the floor dominates. The 1KB row is below that crossover and shows the expected ~8 gas/log-byte premium.

## Base Sepolia detailed rerun — 2026-07-20

Command:

```sh
PUBLISHED_DATA_BENCHMARK_DETAILS=1 npm run benchmark:published-data:base-sepolia --workspace=hardhat
```

Summary table:

| Content bytes | calldata-only gas | calldata+event gas | event gas delta | calldata-only receipt fee wei | calldata+event receipt fee wei | receipt fee delta | extra log data bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1024 | 62700 | 71528 | 8828 (14.07%) | 381786453794 | 434754453794 | 52968000000 (13.87%) | 1088 |
| 4096 | 185220 | 185220 | 0 (0.00%) | 1116906453794 | 1129689399713 | 12782945919 (1.14%) | 4160 |
| 10240 | 430260 | 430260 | 0 (0.00%) | 2603681768813 | 2587233922948 | -16447845865 (-0.63%) | 10304 |

Relevant raw receipt fields:

- Base Sepolia does expose OP-stack fee fields: `l1Fee`, `l1GasPrice`, `l1GasUsed`, `l1BaseFeeScalar`, `l1BlobBaseFee`, `l1BlobBaseFeeScalar`, `blobGasUsed`, and `daFootprintGasScalar`.
- `effectiveGasPrice` was stable at 6,000,000 wei in this run, so execution-fee deltas are directly explained by `gasUsed` deltas.
- For 4KB and 10KB, `receipt.gasUsed` and therefore execution fee were identical between variants even though the production receipt carried 4,160 / 10,304 extra log-data bytes.
- The OP-stack `l1Fee` did not provide a stable marginal event-byte signal. It varies with L1/blob fee conditions between transactions, and the paired rows sometimes show no premium or even a negative total-fee delta. The sender balance delta from this RPC was not reliable enough to use as the canonical metric (several rows read `0` despite nonzero receipt fees), so the receipt fee fields are more useful than balance deltas here.

## Conclusion / recommendation

The 0-delta rows are best explained by post-Pectra calldata-floor transaction gas accounting: once the large calldata payload dominates the charged transaction gas, the additional LOG execution gas for duplicating the bytes into the event does not raise `receipt.gasUsed`. Local Hardhat reproduces the same pattern, and Base Sepolia receipt fields do not reveal a hidden large marginal fee for the event payload.

For the current product decision, **keep the calldata+event `DataPublished(bytes content)` design**. It materially simplifies indexer ingestion, preserves the storage-free contract model, and the observed marginal fee premium is modest for small content and effectively hidden by calldata-floor accounting for the larger statement/metadata sizes benchmarked here. Revisit only if Base/mainnet gas accounting changes or if typical payloads move far beyond the benchmarked 10KB range.
