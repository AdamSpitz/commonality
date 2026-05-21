# Bridge Creator

A nudger service that uses AI to synthesize "bridge" statements — modified or common-ground versions of statements designed to make opposing views more compatible.

It is a nudger-strategy implementation on top of [nudger-core](../nudger-core/README.md), and uses the LLM wrapper from [attester-core](../attester-core/README.md).

## Role in the AI-service ecosystem

- **Family:** Nudger / bridge-building suggestion service.
- **Primary UI domain:** Common Sense Majority (CSM).
- **Consumption surface:** Tally, where users see/sign statement suggestions.
- **Infrastructure substrate:** Conceptspace statements and nudger publications.
- **Trust boundary:** Users are trusting this service for mediation/bridge-building taste, not for canonical truth. Its nudges are suggestions; they do not themselves become durable support unless a user chooses to sign.
- **Related services:** `implication-graph-nudger` suggests existing graph-adjacent statements; `explorer-curator` surfaces existing statement areas; `bridge-creator` synthesizes new or modified common-ground statements.

## What it does

When asked for nudges for a statement S:

1. Finds candidate "opposing" statements that are in tension with S.
2. Uses an LLM to analyze whether the two statements are actually compatible.
3. If not fully compatible, generates a modified version of S that makes any compatibility explicit — language the original author could plausibly sign.
4. Optionally generates a separate "common ground" statement representing a position both sides could accept.
5. Returns these synthesized statements as nudge suggestions.

## Status

In redesign. The old request-time nudger still exists while the rewrite is underway, but the package is being moved toward the CSM mediator architecture in [`specs/product/bridge-creator-redesign.md`](../specs/product/bridge-creator-redesign.md): trusted CSM beat-agent context sources, a live anchor set, synthesizer-only bridge generation, and reusable publication/implication submission seams.

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
| `BRIDGE_CREATOR_COMMONALITY_STATEMENTS` | No | (empty) | Legacy comma-separated list of pre-configured common-ground statement texts to check against each target |
| `BRIDGE_CREATOR_CSM_CONTEXT_SOURCES` | No | `[]` | JSON array of trusted CSM beat-agent context sources, e.g. `[{"service_url":"http://localhost:3004","expected_signer_address":"0x..."}]` |
| `BRIDGE_CREATOR_ANCHOR_STORE_PATH` | No | `bridge-creator/data/seed-anchors.json` | JSON anchor-store file exposed by `GET /anchors` |
| `BRIDGE_CREATOR_STRATEGY_PROMPT_URL` | No | `/strategy-prompt` | URL advertised in `.well-known/nudger.json` for the current strategy prompt |
| `BRIDGE_CREATOR_PUBLIC_BASE_URL` | No | (empty) | Public service base URL used to turn relative discovery links into absolute URLs |
| `BRIDGE_CREATOR_CONTACT` | No | (empty) | Optional contact field advertised in `.well-known/nudger.json` |

## Redesign scaffolding endpoints

- `GET /anchors` returns the active anchor records from the configured anchor store. Proposed and retired anchors stay in storage but are not advertised as current anchors.
- `GET /strategy-prompt` serves the default CSM mediator strategy prompt as Markdown. `.well-known/nudger.json` advertises this endpoint by default via `strategy_prompt_url`.
- `GET /.well-known/nudger.json` now follows the generic nudger-discovery shape from the redesign: signer address, strategy/anchor links, trusted CSM context sources, and a `warming`/`ready` status derived from upstream context readiness.
- `src/synthesizer.ts` contains the new synthesis LLM seam: strategy prompt + trusted CSM context snapshots + active anchors in, normalized `{ modifiedLeft, modifiedRight, commonGround, rationale }` triples out. Publication wiring is still pending.
