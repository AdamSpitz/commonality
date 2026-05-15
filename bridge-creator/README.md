# Bridge Creator

A nudger service that uses AI to synthesize "bridge" statements — modified or common-ground versions of statements designed to make opposing views more compatible.

It is a nudger-strategy implementation on top of [nudger-core](../nudger-core/README.md), and uses the LLM wrapper from [attester-core](../attester-core/README.md).

## What it does

When asked for nudges for a statement S:

1. Finds candidate "opposing" statements that are in tension with S.
2. Uses an LLM to analyze whether the two statements are actually compatible.
3. If not fully compatible, generates a modified version of S that makes any compatibility explicit — language the original author could plausibly sign.
4. Optionally generates a separate "common ground" statement representing a position both sides could accept.
5. Returns these synthesized statements as nudge suggestions.

## Status

Implemented. The service fetches candidate statements from the chain, uses an LLM to analyze compatibility, and generates modified + common-ground statements as nudges. Its LLM prompts are committed as standalone Markdown files in [`prompts/`](./prompts/) so operators and users can inspect the mediation behavior without reading TypeScript. Pre-configured commonality statements (via `BRIDGE_CREATOR_COMMONALITY_STATEMENTS` env var) are also checked against each target statement.

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
| `BRIDGE_CREATOR_COMMONALITY_STATEMENTS` | No | (empty) | Comma-separated list of pre-configured common-ground statement texts to check against each target |
