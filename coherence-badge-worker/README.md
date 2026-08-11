# CauseStarter coherence badge worker

Trusted background worker for operator-authored roster coherence badges. It polls `MutableRefUpdater.RefUpdated`, resolves the new tip as a published document, and only considers schema-v1 documents whose `extras.kind` is `causestarter.roster`. Empty tips, shared reserved ref names, and all non-roster documents are ignored.

The worker loads title, summary, ordered plank CIDs, and mediator blurb from the resolved roster—not from a browser request—then reuses cause-assist's binding path. That path recomputes the roster CID, loads plank texts by CID, requires an LLM coherence verdict, and calls the positive-only `AlignmentAttestations` writer. Existing attestations return `already_attested`, so rescans and same-tip rewrites are harmless. Roster and plank content are retried briefly together; if content is still missing the poller advances past that tip so one stuck CID cannot block later rosters. The process **refuses to start** without an LLM API key and a fully configured operator attester, and **refuses to advance the cursor** on `judgment_unavailable` / `attester_not_configured` so a misconfiguration cannot permanently skip tips.

## Security boundary

This worker uses the **preferred direct-helper design**: it imports pure cause-assist helpers and exclusively holds `CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY`. The browser-facing cause-assist HTTP service has no chain-write endpoint and does not receive the key. Its `/check-coherence` route remains preview-only. The public operator address may be supplied to cause-assist as `CAUSE_ASSIST_COHERENCE_ATTESTER_ADDRESS` so the SPA can read badges.

## Configuration

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `RPC_URL` | yes | — | Ethereum JSON-RPC URL. |
| `CHAIN_ID` | yes | — | Expected RPC chain ID. |
| `MUTABLE_REF_UPDATER_CONTRACT_ADDRESS` | yes | — | Contract emitting `RefUpdated`. |
| `START_BLOCK` | yes | — | Initial scan block when no cursor exists. |
| `ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS` | for writes | — | Badge contract. |
| `PUBLISHED_DATA_CONTRACT_ADDRESS` | for RPC reads | — | PublishedData deployment. |
| `CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY` | for writes | — | Operator hot key; worker only. |
| `XAI_API_KEY` / `OPENROUTER_API_KEY` | for judgments | — | LLM provider key. Heuristics never mint. |
| `CAUSE_ASSIST_COHERENCE_MODEL` | no | provider default | Dedicated coherence model. |
| `CAUSE_ASSIST_IPFS_GATEWAY_URL` | no | — | Read-only IPFS gateway. |
| `EVENT_CACHE_URL` | no | — | PublishedData event-cache URL. |
| `STATE_FILE` | no | `./data/coherence-badge-worker.json` | Durable block + log-index cursor. |
| `CONFIRMATIONS` | no | `12` | Finality lag. |
| `BLOCK_RANGE` | no | `1000` | Log scan batch size. |
| `POLL_INTERVAL_MS` | no | `10000` | Idle poll interval. |
| `CONTENT_RETRY_COUNT` | no | `3` | Additional content-resolution attempts. |
| `CONTENT_RETRY_DELAY_MS` | no | `2000` | Delay between content attempts. |

Local Compose starts the worker automatically and persists its cursor under `${COMMONALITY_DATA_DIR:-./data}/coherence-badge-worker`. The cursor is bound to chain ID and MutableRefUpdater address.

```sh
npm run build --workspace=@commonality/coherence-badge-worker
npm run test --workspace=@commonality/coherence-badge-worker
```
