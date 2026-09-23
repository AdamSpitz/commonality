# Indexer

Thin event cache: watches blockchain events, stores them raw, and serves them via REST API (consumed by the SDK).

## REST API

- `GET /api/events` returns raw indexed events with optional `chainId`, `contractAddress`, `eventName`, `topic1`, `topic2`, `topic3`, `blockNumber_gte`, `blockNumber_lte`, and `limit` filters.
- `GET /api/published-data/:dataId` returns a CID/dataId-first PublishedData reader view across all indexed publishers. A CID is active if at least one publisher has a live publication; it is retracted only when every indexed publication for that dataId has been self-retracted. This is the REST parity route for the SDK's CID-first displayable-document seam. Active and retracted responses carry `publications`: one pointer per publication, each `{ publisher, transactionHash, blockNumber, logIndex }`.
- `GET /api/published-data/:publisher/:dataId` returns the default PublishedData reader view for one publisher/content pair. It honors only the publisher's own `DataRetracted` event, matching the library default policy, and returns one of:
  - `{ "status": "active", "publication": { "transactionHash": "0x...", "blockNumber": "...", "logIndex": 0 } }`
  - `{ "status": "retracted", "publication": { ... } }`
  - `{ "status": "not-published" }`

**These routes never return content.** `DataPublished(publisher, dataId)` carries only indexed topics, so the indexer has no content bytes to store or serve — what it returns is a *pointer* to the publishing transaction, plus the content hash to verify against. Clients fetch the bytes themselves through the SDK's `ContentResolver` seam (`@commonality/sdk/subsystems/published-data`), which today recovers them from transaction calldata. This is what lets one general-purpose indexer be operated for everybody: see [specs/tech/subsystems/published-data/README.md](../specs/tech/subsystems/published-data/README.md) § "Pointers only".

Pass `chainId` and/or `contractAddress` when a shared indexer has more than one deployment in its raw event cache.

## Architecture

A single Ponder application with one responsibility:

- **events table** — stores every raw contract event (all topics + ABI-encoded data)

No business logic, no aggregation, no IPFS sync, and no user content. All entity-state computation happens client-side in SDK fold functions. This is the **Client-Side Folding** pattern — non-obvious, but intentional.

See [specs/tech/indexer/README.md](../specs/tech/indexer/README.md) for the full explanation of what this means and why.

`ponder.config.ts` is the shared feed (funding contracts included). `INDEXER_CONTRACTS=conceptspace` on that file omits funding contracts but still loads their ABIs, and the API then omits `GET /api/project-read-demand`. `npm run dev:conceptspace` uses `ponder.conceptspace.config.ts`, which does not import the funding ABIs and sets `INDEXER_CONTRACTS=conceptspace`. Alignment attestations stay on both.

## Deployment

The current manifest and environment variables identify contract deployments; they are not yet a
safe operator-admission boundary. In particular, omitted sources can fall back to legacy variables,
and this deployment does not enforce an operator block policy across every public read path. Do not
advertise a configuration as a narrow production indexer until the proposed
[operator-scoped deployment design](../specs/tech/indexer/operator-scoped-deployments.md) is
implemented.

For local Docker development, the indexer defaults to `PONDER_CHAIN=hardhat` and starts in dev mode.

For Render or other hosted environments:

- Set `PONDER_CHAIN` to `base-sepolia` or `mainnet`.
- Provide the matching RPC URL as `PONDER_RPC_URL_84532` or `PONDER_RPC_URL_1`. Leave `PONDER_RPC_MAX_RESPONSE_BODY_SIZE` unset or `0` so the config passes a URL string into Ponder (its rate limiter). A viem `http()` wrapper is only used when a positive body-size cap is set; that path is `custom_transport` and retries poorly against Alchemy CUPS limits.
- Set `DATABASE_URL` and `DATABASE_SCHEMA` for Postgres-backed sync state.
- Run with `PONDER_SCRIPT=start` so the container uses `ponder start` instead of dev mode.
- On Render, set `CHOKIDAR_USEPOLLING=true`. Ponder 0.15 builds through Vite even in
  start mode, and Render's native file-watcher limit can otherwise abort startup with
  `EMFILE: too many open files, watch '/app'`.
- Keep `PONDER_ETH_GET_LOGS_BLOCK_RANGE` large enough for catch-up. The Render blueprint defaults to `10000`. A tiny range such as `10` makes a million-block historical sync require hundreds of thousands of `eth_getLogs` batches and will blow Alchemy CUPS. If the provider rejects the window, the process logs a one-shot `[commonality-indexer] eth_getLogs failed because the RPC rejected the block range or response size` line with the env to change; lower to `1000` then `10`.
- Hosted chains poll every `PONDER_POLL_INTERVAL_MS` (default `4000`). Hardhat stays at 100ms.
- Keep `DATABASE_SCHEMA` stable (`commonality_base_sepolia_v6` on testnet). Renaming it drops the event cache and replays history against the RPC. `scripts/smoke-check-render.mjs` fails if the name changes unless `INDEXER_ALLOW_SCHEMA_BUMP=1`. Code deploys (`ponder start` + `PONDER_EXPERIMENTAL_DB=platform` + the persistent disk for stop-before-start) reuse the same schema. The `events` table is append-only raw logs; new handlers and extra contract addresses in `INDEXER_DEPLOYMENT_MANIFEST` do not need a wipe.

### RPC budget (Alchemy monthly CU)

The indexer is the intended heavy user of an archive RPC. Do **not** switch `PONDER_RPC_URL_84532` to `https://sepolia.base.org` to save CUs — that endpoint prunes below ~45_000_000 and our `START_BLOCK` is older.

When Alchemy returns **monthly capacity** (distinct from compute-units-per-second), `start.sh` records a flag, parks behind a stub `/graphql` 200, and waits 1 minute doubling up to 6 hours before retrying. That is the automatic “suspend” — Render stays up, JSON-RPC stops. A human still has to raise the billing fuse (or wait for the period reset) before indexing resumes.

Optional dashboard hygiene: put the **indexer** on its own Alchemy app/key so a seed script cannot share the fuse. Fake-data writes can keep using the same archive URL; they are cheap compared to `eth_getLogs` catch-up. If you split keys, keep the indexer on archive and never on the pruned public node.

Contract deployments can still be configured with the legacy one-env-var-per-contract
addresses plus subsystem start blocks, but the indexer also accepts an
`INDEXER_DEPLOYMENT_MANIFEST` JSON string for contract-versioning prep. Shape:

```json
{
  "chains": {
    "base-sepolia": {
      "Beliefs": [{ "address": "0x...", "startBlock": 123 }],
      "AssuranceContractFactory": [
        { "address": "0x...v1", "startBlock": 456 },
        { "address": "0x...v2", "startBlock": 789 }
      ]
    }
  }
}
```

The top-level chain form (`{"base-sepolia": { ... }}`) is also accepted. Logical
contract names match the names in `ponder.config.ts` (`Beliefs`, `DelegatableNotes`,
`CreatorAssuranceContractFactory`, etc.). When multiple versions are listed, Ponder
indexes all addresses and starts at the earliest listed `startBlock` for that logical
contract/factory. A **new** contract must use its **deploy block** as `startBlock`
(`BELIEFS_START_BLOCK`, `PUBLISHED_DATA_START_BLOCK`, … written by
`hardhat/scripts/deploy-incremental.js`). Do not index it from global `START_BLOCK`
unless that really is when it was deployed.

Build the publishable manifest from a deployment env file with:

```sh
npm run deployment-manifest:build -- --network base-sepolia
```

That writes `deployments/base-sepolia.manifest.json` and prints the compact
`INDEXER_DEPLOYMENT_MANIFEST` value for services that still consume the manifest
directly from env. After pinning the JSON (for example to IPFS), publish the current
pointer onchain through `MutableRefUpdater`:

```sh
DEPLOYMENT_MANIFEST_REF=ipfs://bafy... \
  npx hardhat run scripts/publish-deployment-manifest-ref.js --network base-sepolia
```

The default ref name is `commonality.deployment-manifest`. The ref owner is the
publishing wallet, so clients that use this discovery path must know/trust that
publisher address (or hardcode deployment addresses instead).

## Dev stuff you can do

To sync contract ABIs from the hardhat project:

    npm run sync-abis

`npm run typecheck` also checks that every generated ABI matches the compiled
contract artifact.

To run the indexer locally:

    npm run dev
