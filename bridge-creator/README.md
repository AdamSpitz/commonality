# Bridge Creator

A nudger service that uses AI to synthesize "bridge" statements — modified or common-ground versions of statements designed to make opposing views more compatible.

It publishes nudge batches through [nudger-core](../nudger-core/README.md), and uses the LLM wrapper from [attester-core](../attester-core/README.md).

## Role in the AI-service ecosystem

- **Family:** Nudger / bridge-building suggestion service.
- **Primary UI domain:** Common Sense Majority (CSM).
- **Consumption surface:** Tally, where users see/sign statement suggestions.
- **Infrastructure substrate:** Conceptspace statements and nudger publications.
- **Trust boundary:** Users are trusting this service for mediation/bridge-building taste, not for canonical truth. Its nudges are suggestions; they do not themselves become durable support unless a user chooses to sign.
- **Related services:** `implication-graph-nudger` suggests existing graph-adjacent statements; `explorer-curator` surfaces existing statement areas; `bridge-creator` synthesizes new or modified common-ground statements.

## What it does

On each scheduled tick:

1. Fetches context summaries from trusted CSM beat agents.
2. Loads the current CSM strategy prompt and active anchor set.
3. Uses an LLM to synthesize moderate-left, moderate-right, and common-ground bridge triples.
4. Publishes generated statements, publishes a public nudge batch, and optionally submits modified→common-ground implications.
5. Skips publication when upstream context/anchors have not meaningfully changed since the previous tick.

## Status

The legacy request-time `/nudges` strategy has been removed. The package now follows the CSM mediator architecture in [`specs/product/bridge-creator.md`](../specs/product/bridge-creator.md): trusted CSM beat-agent context sources, a live anchor set, synthesizer-only bridge generation, and reusable publication/implication submission seams.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | — | API key for OpenRouter LLM calls |
| `BRIDGE_CREATOR_PRIVATE_KEY` | Yes | — | Ethereum private key for signing nudge messages |
| `BRIDGE_CREATOR_ETHEREUM_RPC_URL` / `ETHEREUM_RPC_URL` | Yes | — | RPC URL for blockchain access |
| `BRIDGE_CREATOR_INDEXER_URL` / `INDEXER_URL` | No | `http://localhost:3001` | URL of the Ponder event cache |
| `BRIDGE_CREATOR_IPFS_API` / `IPFS_API` | No | `http://localhost:5001` | IPFS API URL |
| `BRIDGE_CREATOR_IPFS_GATEWAY` / `IPFS_GATEWAY` | No | `http://localhost:8080` | IPFS gateway URL |
| `BRIDGE_CREATOR_OPENROUTER_MODEL` / `OPENROUTER_MODEL` | No | `anthropic/claude-3.5-haiku` | Model to use |
| `BRIDGE_CREATOR_NAME` | No | `Bridge Creator` | Display name for nudger metadata |
| `BRIDGE_CREATOR_DESCRIPTION` | No | `Creates synthesized bridge statements from moderate positions` | Description for nudger metadata |
| `BRIDGE_CREATOR_SOURCE_TYPE` | No | `bridge-creator` | Source type for nudge messages |
| `BRIDGE_CREATOR_VERSION` | No | `0.1.0` | Service metadata version |
| `PORT` | No | `3003` | HTTP server port |
| `BRIDGE_CREATOR_CSM_CONTEXT_SOURCES` | No | `[]` | JSON array of trusted CSM beat-agent context sources, e.g. `[{"service_url":"http://localhost:3004","expected_signer_address":"0x..."}]`; entries may override staleness with `max_staleness_ms` |
| `BRIDGE_CREATOR_CONTEXT_MAX_AGE_MS` | No | `86400000` | Default maximum age for trusted CSM `/context` snapshots before rejecting them as stale |
| `BRIDGE_CREATOR_ANCHOR_STORE_PATH` | No | `bridge-creator/data/seed-anchors.json` | JSON anchor-store file exposed by `GET /anchors` |
| `BRIDGE_CREATOR_STRATEGY_PROMPT_URL` | No | `/strategy-prompt` | URL advertised in `.well-known/nudger.json` for the current strategy prompt |
| `BRIDGE_CREATOR_PUBLIC_BASE_URL` | No | (empty) | Public service base URL used to turn relative discovery links into absolute URLs |
| `BRIDGE_CREATOR_PUBLICATION_DEDUP_STATE_PATH` | No | `bridge-creator/data/publication-dedup-state.json` | JSON state file storing the last published input hash and summary so repeated ticks can skip duplicate publications |
| `BRIDGE_CREATOR_TICK_INTERVAL_MS` | No | `3600000` | Interval for the long-running synthesizer/publication loop |
| `BRIDGE_CREATOR_ANCHOR_REFLECTION_INTERVAL_MS` | No | `86400000` | Interval for the advisory anchor-reflection job that appends proposed anchor records for operator review |
| `BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH` | No | (empty) | Optional text/Markdown file of signing/ignore outcome notes from prior bridge publications; included in the anchor-reflection LLM prompt |
| `IMPLICATIONS_CONTRACT_ADDRESS` | No | (empty) | If set, the long-running loop submits modified→common-ground implications after publishing each batch |
| `BRIDGE_CREATOR_CONTACT` | No | (empty) | Optional contact field advertised in `.well-known/nudger.json` |

## Anchor review CLI

Reflection is advisory-only in v1: `src/anchorReflection.ts` can ask an LLM to propose new anchor records from trusted CSM context, the previous publication summary, and an optional signing/ignore outcome summary file. Proposed anchor changes stay in the JSON anchor store until an operator reviews them. Use the package script to inspect and apply those changes:

```bash
npm run anchors --workspace=@commonality/bridge-creator -- list-proposed
npm run anchors --workspace=@commonality/bridge-creator -- approve <anchor-id>
npm run anchors --workspace=@commonality/bridge-creator -- retire <anchor-id>
npm run anchors --workspace=@commonality/bridge-creator -- delete <anchor-id>
```

Pass `--store path/to/anchors.json` before the command to review a non-default store.

## HTTP endpoints

- `GET /anchors` returns the active anchor records from the configured anchor store. Proposed and retired anchors stay in storage but are not advertised as current anchors.
- `GET /strategy-prompt` serves the default CSM mediator strategy prompt as Markdown. `.well-known/nudger.json` advertises this endpoint by default via `strategy_prompt_url`.
- `GET /.well-known/nudger.json` now follows the generic nudger-discovery shape from the redesign: signer address, strategy/anchor links, trusted CSM context sources, and a `warming`/`ready` status derived from upstream context readiness.
- `src/synthesizer.ts` contains the new synthesis LLM seam: strategy prompt + trusted CSM context snapshots + active anchors in, normalized `{ modifiedLeft, modifiedRight, commonGround, rationale }` triples out.
- `src/runner.ts` contains the tick-level orchestration: skip while context is warming, load active anchors and strategy prompt, synthesize triples, skip duplicate input hashes using the publication dedup state, publish the generated statements and nudge batch, and optionally submit modified→common-ground implications.
- `run(...)` starts that tick once immediately and then repeats it on `BRIDGE_CREATOR_TICK_INTERVAL_MS`, using the configured SDK/IPFS machinery and an implication submitter when `IMPLICATIONS_CONTRACT_ADDRESS` is present. It also runs the advisory anchor-reflection job immediately and on `BRIDGE_CREATOR_ANCHOR_REFLECTION_INTERVAL_MS`; proposals are appended with `status: proposed` for CLI review, never activated automatically.
