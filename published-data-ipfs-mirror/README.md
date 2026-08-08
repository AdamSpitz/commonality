# PublishedData IPFS mirror

A standalone, permissionless copier. It follows `DataPublished`, recovers the verified bytes from transaction calldata, and pins them to an IPFS node asynchronously. Publication never depends on this process.

The first release deliberately mirrors every publication. Selective mirroring would make this a policy-list consumer; add that only through the shared policy evaluator. The worker is standalone so Commonality or a vertical founder can run the same artifact without operating an indexer.

Running a general-purpose indexer does **not** imply accepting this role. Mirroring is optional durability infrastructure and a deliberate content-retention choice: the operator retrieves and pins user content bytes.

See also: [cutover plan](../specs/tech/published-data-ipfs-cutover-plan.md), [PublishedData](../specs/tech/subsystems/published-data/README.md).

## Package

```sh
npm run build --workspace=@commonality/published-data-ipfs-mirror
npm run test --workspace=@commonality/published-data-ipfs-mirror
npm run dev --workspace=@commonality/published-data-ipfs-mirror
```

## Configuration

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `RPC_URL` | yes | — | Ethereum JSON-RPC with full tx history (calldata recovery). |
| `CHAIN_ID` | yes | — | Expected chain; startup fails if RPC reports another id. |
| `PUBLISHED_DATA_CONTRACT_ADDRESS` | yes | — | PublishedData deployment to watch. |
| `START_BLOCK` | yes | — | First block to scan when no state file exists (use deploy block). |
| `IPFS_API_URL` | yes | — | Kubo-compatible HTTP API base (e.g. `http://127.0.0.1:5001`). |
| `CONFIRMATIONS` | no | `12` | Blocks behind head before treating logs as final. |
| `BLOCK_RANGE` | no | `1000` | Max blocks per `eth_getLogs` batch. |
| `POLL_INTERVAL_MS` | no | `10000` | Idle poll interval when caught up. |
| `STATE_FILE` | no | `./data/published-data-ipfs-mirror.json` | Cursor path; bound to chain id + contract. |

Base Sepolia example values live in `deployments/base-sepolia.env` (`PUBLISHED_DATA_CONTRACT_ADDRESS`, `PUBLISHED_DATA_START_BLOCK`).

## Run (local)

The normal `./scripts/services.sh --start` path starts the mirror automatically with the local Anvil deployment and Kubo. Its cursor persists under `${COMMONALITY_DATA_DIR:-./data}/published-data-ipfs-mirror`.

For a standalone development process instead:

```sh
set -a
# shellcheck disable=SC1091
source deployments/localhost.env
set +a

RPC_URL="${ETH_RPC_URL:-http://127.0.0.1:8545}" \
CHAIN_ID=31337 \
PUBLISHED_DATA_CONTRACT_ADDRESS="$PUBLISHED_DATA_CONTRACT_ADDRESS" \
START_BLOCK="${PUBLISHED_DATA_START_BLOCK:-0}" \
IPFS_API_URL="${IPFS_API:-http://127.0.0.1:5001}" \
STATE_FILE=./data/published-data-ipfs-mirror.local.json \
npm run dev --workspace=@commonality/published-data-ipfs-mirror
```

## Run (Base Sepolia)

`deployments/base-sepolia.env` provides the contract address and deployment block, but intentionally does not contain an RPC credential. Supply an RPC URL explicitly:

```sh
set -a
# shellcheck disable=SC1091
source deployments/base-sepolia.env
set +a

: "${RPC_URL:?Set RPC_URL to a Base Sepolia RPC with full transaction history}"
RPC_URL="$RPC_URL" \
CHAIN_ID=84532 \
PUBLISHED_DATA_CONTRACT_ADDRESS="$PUBLISHED_DATA_CONTRACT_ADDRESS" \
START_BLOCK="$PUBLISHED_DATA_START_BLOCK" \
IPFS_API_URL="${IPFS_API_URL:-http://127.0.0.1:5001}" \
STATE_FILE=./data/published-data-ipfs-mirror.base-sepolia.json \
npm run dev --workspace=@commonality/published-data-ipfs-mirror
```

## Run (Commonality-operated testnet / mainnet)

The committed Render blueprint provisions the Base Sepolia worker, a 1 GB cursor disk, and a private Kubo service with a 10 GB repository disk. The only dashboard secret it needs is `RPC_URL`; see [`workflow/testnet-render-env.md`](../workflow/testnet-render-env.md). For another hosting platform or mainnet:

1. Provision a durable host with disk for the state file and pinset growth.
2. Point `RPC_URL` at a provider that retains full transaction bodies (archive-capable or equivalent for calldata).
3. Set `CHAIN_ID`, `PUBLISHED_DATA_CONTRACT_ADDRESS`, and `START_BLOCK` from the network deployment env (`deployments/base-sepolia.env` today).
4. Point `IPFS_API_URL` at an operator-controlled Kubo (or compatible) node with pinning enabled. Do **not** expose that API to browsers.
5. Persist `STATE_FILE` across restarts (volume / disk).
6. Run under a process supervisor (`systemd`, Render background worker, etc.) with restart-on-failure.
7. Monitor:
   - process up / restart loops;
   - state-file cursor advancing toward chain head minus `CONFIRMATIONS`;
   - repeated recovery or pin errors in logs (cursor does not advance on failure);
   - disk usage on the IPFS repo.
8. After deploy or RPC outage: restart is enough; failed blocks are retried because the cursor only advances after successful pin + CID check.

Publication UX must stay green even if this worker is down: clients resolve calldata first and treat missing mirror bytes as `unavailable`, never as `not-published`.

## Independent cause-operator runbook

You do **not** need this worker to launch a cause or accept statements. Calldata on the publishing chain is the canonical byte store; the shared indexer stays content-blind.

Run a mirror only if you want extra durability / IPFS gateway availability for publications you care about.

1. Install Node 20+ and clone this monorepo (or install the built workspace package the same way you run other Commonality workers).
2. Run a Kubo node you control, or buy a Kubo-compatible pinning API. You will retain content bytes — treat that as an editorial/hosting decision.
3. Configure the table above against the chain and `PublishedData` address your community uses (Commonality testnet addresses are in `deployments/base-sepolia.env`; your own deploy may differ).
4. Start with `npm run dev --workspace=@commonality/published-data-ipfs-mirror` (or `node dist/src/index.js` after `npm run build`).
5. Keep `STATE_FILE` on persistent storage. Back it up if you care about avoiding a full rescan after disk loss (rescan is safe but slow).
6. Optional: run multiple independent mirrors; hash verification makes duplicate pins harmless.
7. Do **not** wire browser apps to your Kubo API. Browsers publish via `publishData` only; gateways are read-only.

Compatible alternatives: any process that watches `DataPublished`, recovers the same calldata, hash-checks `sha256(content) == dataId`, and pins CIDv1 raw (`publishedDataIdToCid(dataId)`).

## Behavior notes

- Startup verifies that the RPC reports `CHAIN_ID`.
- The state file records the next fully processed block and is bound to that chain and PublishedData contract, preventing accidental cursor reuse across deployments.
- Failed recovery or pinning does not advance that block, so restart retries it.
- IPFS adds use `cid-version=1`, `raw-leaves=true`, and pinning; the returned CID is checked against the on-chain `dataId`.
- Direct `dataId` → raw CID identity is supported only through the IPFS 256 KiB single-block boundary. Larger content is rejected and retried rather than pinned under a misleading CID. A future large-document format needs a content-addressed manifest shared with other mirrors.

## What this is not

- Not required for browser publication.
- Not a substitute for the indexer.
- Not a policy filter (mirrors everything until selective copy uses the shared policy evaluator).
- Not a browser-facing upload endpoint — product UIs must not send `VITE_IPFS_API` / `/ipfs-api` writes.
