# Scalability Testing

This document turns the theoretical scalability notes in [scalability.md](./scalability.md) into an executable testing plan. The goal is not to prove infinite scale; it is to make regressions and obvious bottlenecks visible before testnet/mainnet traffic finds them.

## Current scalability picture

The architecture is still mostly as described in [scalability.md](./scalability.md): contracts emit simple indexed events, Ponder stores a thin event cache, and most SDK/UI state is folded per entity. That means the first testing target is not a generic load test against every route; it is the handful of places where work can grow with all system activity or with a whole cause/statement graph.

Highest-risk paths to measure first:

1. **Indexer catch-up and query latency** after many chain events.
2. **SDK/UI folds for large single entities**: project pages with many contributors, statement pages with many believers, notes with long delegation chains.
3. **Global-ish browse/ranking paths**: statement browsing by newest/most supporters and cause contributor leaderboards.
4. **IPFS/document retrieval latency** through the configured gateway.
5. **Platform API cache behavior** under repeated channel/content lookups.

## What fake-data-generation already gives us

[`fake-data-generation/`](../../fake-data-generation/) is useful as the starting point. It can create users/statements/attesters and execute randomized on-chain actions against a local or configured deployment. Its existing runner records action counts, gas usage, and errors in `fake-data-generation/output/metrics.json`.

Existing entry points:

```bash
npm run gen:tiny --workspace=fake-data-generation
npm run gen:small --workspace=fake-data-generation
npm run gen:medium --workspace=fake-data-generation
npm run gen:large --workspace=fake-data-generation
```

The runner also accepts direct parameters:

```bash
npm run gen:simulate --workspace=fake-data-generation -- 100 10 --statement-limit=500 --max-actions-per-user=4
```

Limitations for scalability testing:

- the existing presets are functional-test sized, not load-test sized;
- actions are mostly sequential, so they do not simulate many simultaneous users;
- the output records contract-side metrics but not indexer lag, API latency, SDK query time, browser performance, or resource usage;
- the random workload is good for broad coverage but weak for worst-case single-entity tests.

So the plan is to reuse this suite for data generation, then add a thin load-test harness around the real read paths.

## Proposed automated test scripts

Add these scripts rather than trying to make one mega-test do everything.

### 1. `scripts/scalability-seed.mjs`

Purpose: create repeatable local/testnet scale fixtures.

Inputs:

- `--profile=tiny|small|medium|large|stress`
- `--target=local|testnet`
- optional `--users`, `--rounds`, `--statements`, `--max-actions-per-user`

Behavior:

1. For local runs, optionally reset with `./scripts/data.sh --wipe` and start services with `./scripts/services.sh --start`.
2. Run `fake-data-generation/runSimulation.ts` with the chosen profile.
3. Wait until the indexer has caught up to the latest block.
4. Write a manifest under `tmp/scalability-runs/<timestamp>/manifest.json` containing contract addresses, chain id, block range, action counts, and generated fixture IDs.

Suggested initial profiles:

| Profile | Users | Rounds | Statements | Purpose |
| --- | ---: | ---: | ---: | --- |
| tiny | 5 | 1 | 12 | smoke check in CI |
| small | 25 | 3 | 100 | local developer check |
| medium | 100 | 10 | 500 | pre-merge/manual check |
| large | 500 | 20 | 2,000 | nightly/manual local or testnet |
| stress | configurable | configurable | configurable | exploratory bottleneck hunting |

### 2. `scripts/scalability-read-bench.mjs`

Purpose: benchmark real SDK/API read paths over the seeded data.

Measure at least p50/p95/p99 latency, response size, event count processed, and errors for:

- project detail fold for representative projects, including the largest project;
- statement detail fold for representative statements, including the most-supported statement;
- note/delegation fold for the longest generated chain;
- `browseStatementsByNewest` and `browseStatementsByMostSupporters`;
- cause aligned-project summary and top contributors;
- platform API cached vs uncached channel/content resolution, using mocked upstreams locally where possible;
- IPFS fetches for hot and cold statement/project documents.

Output:

- `tmp/scalability-runs/<timestamp>/read-bench.json`
- `tmp/scalability-runs/<timestamp>/read-bench.md`

### 3. `scripts/scalability-indexer-bench.mjs`

Purpose: measure Ponder/indexer behavior separately from SDK folding.

Measure:

- chain head vs indexed head during and after seeding;
- time to catch up after the seed run completes;
- query latency for raw event filters by entity;
- database size and row counts by event type;
- restart/rebuild time on the same event set.

This should catch the Render/Ponder deployment class of problems too: stop/start the indexer and verify only one writer is active and the schema lock is not wedged.

### 4. `scripts/scalability-report.mjs`

Purpose: compare a run against budgets and produce one summary.

Initial budgets should be generous and empirical; tighten them after the first real runs. Start with:

- zero unexpected simulation errors;
- local indexer catches up within 2 minutes for `medium`;
- p95 SDK/API read latency under 1s for entity pages in `medium`;
- p95 statement browsing under 2s in `medium`;
- no single read response above 5 MB in `medium`;
- no obvious unbounded memory growth during a `large` run.

The report should exit nonzero only for the smoke/medium budgets we actually trust. Stress runs should produce data without failing automation by default.

## Recommended command flows

Local smoke, suitable for quick verification:

```bash
node scripts/scalability-seed.mjs --profile=tiny --target=local --wipe
node scripts/scalability-read-bench.mjs --latest
node scripts/scalability-report.mjs --latest --budget=smoke
```

Manual medium run before major testnet deployments:

```bash
node scripts/scalability-seed.mjs --profile=medium --target=local --wipe
node scripts/scalability-indexer-bench.mjs --latest
node scripts/scalability-read-bench.mjs --latest
node scripts/scalability-report.mjs --latest --budget=medium
```

Testnet run after deployment:

```bash
node scripts/scalability-seed.mjs --profile=small --target=testnet
node scripts/scalability-indexer-bench.mjs --latest --target=testnet
node scripts/scalability-read-bench.mjs --latest --target=testnet
node scripts/scalability-report.mjs --latest --budget=testnet-small
```

## Where this should live in automation

- Add a cheap `verifier` check for the `tiny` profile once the scripts exist.
- Keep `medium`, `large`, and `stress` manual-triggered at first; they are too slow and environment-sensitive for every PR.
- Store only summarized reports in git or verifier history. Keep raw run artifacts in `tmp/` or external storage.

## Open implementation notes

- The fake-data runner may need a few deterministic “worst-case” modes: many supporters on one statement, many contributors to one project, many aligned projects under one cause, and a long delegation chain.
- For browser/UI measurements, layer Playwright or Lighthouse on top of the seeded stack after the SDK/API benches are stable.
- For testnet, rate-limit writes and make the profile explicit. Accidental stress writes to a public testnet should be hard to trigger.
- If statement browsing is already too slow at `medium`, implement the narrow server-side statement-stats projection described in [scalability.md](./scalability.md) before investing in broader indexer changes.
