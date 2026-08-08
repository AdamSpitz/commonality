# PublishedData / browser IPFS cutover plan

Status: **completed for browser writers (2026-08-08)**. See also [PublishedData](subsystems/published-data/README.md), [eliminating IPFS](eliminating-ipfs.md), and the [`published-data-ipfs-mirror`](../../published-data-ipfs-mirror/README.md).

## Direction

PublishedData transaction calldata is the canonical publication path. IPFS is an asynchronous durability and retrieval layer, not a prerequisite for publishing. Browser clients therefore do not need direct write access to a Kubo API for PublishedData-backed content.

The existing `published-data-ipfs-mirror` implements the intended write side: it watches finalized `DataPublished` logs, recovers and hash-verifies transaction calldata, pins the bytes through a Kubo-compatible API, and retries without blocking publication. Commonality can run this worker for the top-level services it operates. Independent cause founders may run the same artifact, use another compatible mirror, or initially rely on calldata retrieval; running a general-purpose indexer does not imply accepting the mirror/operator role.

## Inventory (2026-08-08)

### Removable / already PublishedData (browser)

| Flow | Path | Notes |
| --- | --- | --- |
| Cause launch statements | `causestarter/src/pages/StartCausePage.tsx` | Requires `VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` |
| Conceptspace create | `ui/src/conceptspace/components/CreateStatementForm.tsx` | Requires PublishedData (hard fail if missing) |
| LazyGiving project/token metadata | `ui/src/lazy-giving/pages/CreateProjectPage.tsx` | Requires PublishedData; images are CID-only (no upload) |
| Content-funding metadata | `ui/src/content-funding/pages/CreateContractPage.tsx` | Requires PublishedData |

SDK seam: `createDefaultDocumentStore` → `publishDocumentToPublishedData` → `publishData(bytes)` when clients + contract are supplied. No dual-write.

### Legacy-needed (not browser product writers)

- **Nudger publications** — `services/nudger-core/src/signer.ts` (+ fake-data nudge seed): operator IPFS by design ([eliminating-ipfs.md](eliminating-ipfs.md)).
- **IPFS gateway reads** — historical CIDs + mirror fallback via `createIpfsContentResolver` after calldata.
- **Images** — curated / BYO CID only; no browser `uploadBlobToIPFS`.
- **UI build pinning** — `scripts/publish-ui-to-ipfs.mjs` (ops, server-side `UI_IPFS_API_URL`).
- **Attester explanation uploads** — `services/attester-core` / beat-agent (separate system).

### Test / seed dual-path (non-browser)

Integration tests and some seed helpers may still call `uploadToIPFS` or DocumentStore without PublishedData when addresses are absent. Prefer `publishIntegrationDisplayableDocument` / DocumentStore with PublishedData when present. Not a browser Kubo dependency.

## Cutover work (done)

1. ~~Inventory browser `uploadToIPFS` callers~~ — no required product callers remain.
2. ~~Migrate eligible publishing flows~~ — UI + CauseStarter force PublishedData.
3. ~~Document Commonality + independent operator mirror ops~~ — [`published-data-ipfs-mirror/README.md`](../../published-data-ipfs-mirror/README.md).
4. ~~Verify hash-validating resolver chain~~ — calldata first, IPFS fallback, `ContentUnavailableError` ≠ `not-published` (SDK `createDefaultContentResolver`).
5. ~~Remove browser Kubo write configuration~~ — `getIpfsApiUrl()` empty; CauseStarter `/ipfs-api` Vite/nginx proxy and upstream entrypoint removed; UI compose no longer sets `VITE_IPFS_API`. Gateway env (`VITE_IPFS_GATEWAY`) retained for reads.

## Remaining ops (not code)

- Run and monitor `@commonality/published-data-ipfs-mirror` on Commonality-operated networks (supervisor + state volume + RPC that retains calldata). Config and health checks are in the mirror README.
- Independent founders: optional; runbook is the same README.

## Completion criteria

- [x] No active PublishedData flow uploads from the browser or depends on Kubo availability.
- [x] Independent cause operators have a usable mirror runbook without being required to operate one.
- [x] Remaining direct IPFS writers are explicitly documented legacy exceptions.
- [x] Removing CauseStarter's `/ipfs-api` proxy does not leave product publish paths on browser Kubo.
- [ ] Production mirror process deployed and caught up on each operated network — **ops checklist** in mirror README (environment-specific).
