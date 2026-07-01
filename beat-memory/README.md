# Beat Memory

`@commonality/beat-memory` is the purpose-guided follower/context substrate for beat agents. It owns the expensive standing work of following a beat, extracting ambient discourse observations, maintaining decayed memory, and serving cited context to ordinary consumers such as the beat-aware attester, finder workflows, and bridge/context services.

It is intentionally **not** a content attester. Consumers should read its memory through the exported library helpers or HTTP context API and keep their own attestation, discovery, or bridge-synthesis responsibilities outside this package.

## Responsibilities

This package owns:

- beat definitions and memory-purpose configuration;
- ingestion state, source cursors, deduplication, and platform source adapters;
- JSON-backed beat memory, observation extraction, compaction, and retrieval;
- purpose summary snapshots and advisory source-management reports;
- the long-running worker loop used by `service-host`;
- a small HTTP API for retrieving cited ambient context.

This package should not own:

- `/evaluate-content` or payment/attestation behavior (`beat-agent` / `attester-core`);
- final bridge-statement synthesis (`bridge-creator`);
- generic explicit-submission queue processing (`content-finder`);
- compatibility shims for the pre-split `beat-agent` package.

## Configuration

All runtime configuration uses `BEAT_MEMORY_*` environment variables. The important ones are:

| Variable | Purpose |
|---|---|
| `BEAT_MEMORY_BEAT_ID` | Logical beat ID. Defaults to the configured beat-definition ID or `default-beat`. |
| `BEAT_MEMORY_PURPOSES` | Comma-separated memory purposes such as `general_beat_context`, `civility_context`, `bridge_opportunity_context`, and `source_management`. |
| `BEAT_MEMORY_BEAT_DEFINITION_FILE` | JSON beat-definition file containing `beatId`, optional `purposes`, and `sources`. |
| `BEAT_MEMORY_INGESTION_STATE_FILE` | JSON file for ingested items, source cursors, skips, and failures. |
| `BEAT_MEMORY_MEMORY_FILE` | JSON file for observations, compacted summaries, purpose snapshots, and source-management reports. |
| `BEAT_MEMORY_METRICS_LOG_FILE` | Optional JSONL metrics log written by worker ticks. |
| `BEAT_MEMORY_WORKER_POLL_INTERVAL_MS` | Delay between supervised worker ticks. Defaults to 60 seconds. |
| `BEAT_MEMORY_LLM_EXTRACTION_ENABLED` | Enables LLM-backed observation extraction, purpose snapshots, and source-management reports. Defaults to `false`. |
| `BEAT_MEMORY_OPENROUTER_API_KEY` | OpenRouter key for LLM-backed extraction/reporting. Falls back to `OPENROUTER_API_KEY`. |
| `BEAT_MEMORY_OPENROUTER_MODEL` | Model for LLM-backed extraction/reporting. Falls back to `OPENROUTER_MODEL`. |

See `beat-memory/config/us-political-csm.example.json` for a small local rehearsal beat definition.

## Worker usage

The package entry point loads configuration from the environment and starts the supervised worker plus HTTP app:

```bash
BEAT_MEMORY_BEAT_ID=us-political-csm \
BEAT_MEMORY_PURPOSES=general_beat_context \
BEAT_MEMORY_BEAT_DEFINITION_FILE=beat-memory/config/us-political-csm.example.json \
BEAT_MEMORY_INGESTION_STATE_FILE=beat-memory/data/us-political-csm.ingestion.json \
BEAT_MEMORY_MEMORY_FILE=beat-memory/data/us-political-csm.memory.json \
npm run dev --workspace=@commonality/beat-memory
```

For test/operator scripts, import `runBeatMemoryWorkerOnce(config)` to execute a single ingestion/extraction/compaction/snapshot/reporting tick.

## HTTP API

`createBeatMemoryApp` exposes a minimal context API:

```text
GET /health
GET /metadata
GET /context?topic=<query>&purpose=<optional-memory-purpose>&limit=<optional-number>
```

`/context` returns cited ambient observations with aggregate support metadata such as source-author count, time span, and diversity score. Purpose snapshots may orient consumers, but attestation decisions should still rely on specific citeable observations for load-bearing claims.

## Source adapters

Current concrete adapters include:

- Twitter/X account, query, and list sources via `createTwitterBeatSourceAdapters`;
- Commonality/Tally indexer activity via `createTallyIndexerBeatSourceAdapter`.

Add new platform adapters only when a real beat needs them. Keep adapter output in the shared `IngestedBeatItem` shape so memory extraction and consumers remain platform-independent.

## Development

```bash
npm run typecheck --workspace=@commonality/beat-memory
npm run test --workspace=@commonality/beat-memory
npm run lint --workspace=@commonality/beat-memory
```

When changing the substrate/consumer boundary, also update `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` so the implementation-status notes remain accurate.
