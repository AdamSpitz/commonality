# PublishedData IPFS mirror

A standalone, permissionless copier. It follows `DataPublished`, recovers the verified bytes from transaction calldata, and pins them to an IPFS node asynchronously. Publication never depends on this process.

The first release deliberately mirrors every publication. Selective mirroring would make this a policy-list consumer; add that only through the shared policy evaluator. The worker is standalone so Commonality or a vertical founder can run the same artifact without operating an indexer.

## Run

```sh
RPC_URL=https://... \
CHAIN_ID=84532 \
PUBLISHED_DATA_CONTRACT_ADDRESS=0x... \
START_BLOCK=123456 \
IPFS_API_URL=http://127.0.0.1:5001 \
npm run dev --workspace=@commonality/published-data-ipfs-mirror
```

Optional: `CONFIRMATIONS` (12), `BLOCK_RANGE` (1000), `POLL_INTERVAL_MS` (10000), and `STATE_FILE`. Startup verifies that the RPC reports `CHAIN_ID`. The state file records the next fully processed block and is bound to that chain and PublishedData contract, preventing accidental cursor reuse across deployments. Failed recovery or pinning does not advance that block, so restart retries it. IPFS adds use `cid-version=1`, `raw-leaves=true`, and pinning; the returned CID is checked against the on-chain `dataId`.

## Size boundary

The direct `dataId` → raw CID identity is supported only through the IPFS 256 KiB single-block boundary. Larger content is rejected and retried rather than pinned under a misleading CID. A future large-document format needs a content-addressed manifest shared with other mirrors.
