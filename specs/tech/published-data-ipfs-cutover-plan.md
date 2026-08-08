# PublishedData / browser IPFS cutover plan

Status: follow-up plan. See also [PublishedData](subsystems/published-data/README.md), [eliminating IPFS](eliminating-ipfs.md), and the [`published-data-ipfs-mirror`](../../published-data-ipfs-mirror/README.md).

## Direction

PublishedData transaction calldata is the canonical publication path. IPFS is an asynchronous durability and retrieval layer, not a prerequisite for publishing. Browser clients should therefore not need direct write access to a Kubo API for PublishedData-backed content.

The existing `published-data-ipfs-mirror` already implements the intended write side: it watches finalized `DataPublished` logs, recovers and hash-verifies transaction calldata, pins the bytes through a Kubo-compatible API, and retries without blocking publication. Commonality can run this worker for the top-level services it operates. Independent cause founders may run the same artifact, use another compatible mirror, or initially rely on calldata retrieval; running a general-purpose indexer does not imply accepting the mirror/operator role.

## Temporary boundary

CauseStarter currently retains its same-origin `/ipfs-api` proxy for legacy browser-upload paths. Shared UI code may use that proxy only when hosted by CauseStarter. Other UI domains keep their explicit `VITE_IPFS_API` value and must not be silently redirected to `/ipfs-api`, because their Vite server and local UI gateway do not expose that route.

This is intentionally expedient. Do not expand browser-facing Kubo proxy infrastructure without identifying a concrete remaining workflow that needs it.

## Cutover work

1. Inventory every browser-reachable `uploadToIPFS` call and classify it as:
   - already PublishedData-backed and removable;
   - eligible to migrate to PublishedData;
   - a legacy read/write compatibility path that still genuinely needs direct IPFS; or
   - a different publication system requiring a separate decision.
2. Migrate eligible publishing flows to `publishData(bytes)` and the existing PublishedData document/resolver seams. Publication success must never wait for IPFS.
3. Deploy and monitor `@commonality/published-data-ipfs-mirror` for Commonality-operated networks. Document its RPC, contract, start-block, Kubo, retry/state-file, confirmation, and 256 KiB boundary configuration.
4. Package the same mirror artifact and operating instructions for independent cause operators. Make clear that mirroring is optional infrastructure and a deliberate content-retention role.
5. Verify reads use the hash-validating resolver chain (calldata first, IPFS fallback) and clearly report content as unavailable rather than not-published when retrieval temporarily fails.
6. Once the inventory has no required browser writers, remove browser `VITE_IPFS_API` write configuration, CauseStarter's `/ipfs-api` proxy, and obsolete upload code/tests. Preserve IPFS gateway reads while historical content still requires them.

## Completion criteria

- No active PublishedData flow uploads from the browser or depends on Kubo availability.
- The production mirror is deployed, monitored, restart-safe, and caught up.
- Independent cause operators have a usable mirror runbook without being required to operate one.
- Remaining direct IPFS writers are explicitly documented legacy exceptions.
- Removing CauseStarter's `/ipfs-api` proxy does not break browser journeys or publication tests.
