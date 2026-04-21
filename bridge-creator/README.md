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

Implemented. The service fetches candidate statements from the chain, uses an LLM to analyze compatibility, and generates modified + common-ground statements as nudges. Pre-configured commonality statements (via `COMMONALITY_STATEMENTS` env var) are also checked against each target statement.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | — | API key for OpenRouter LLM calls |
| `OPENROUTER_MODEL` | No | `anthropic/claude-3.5-haiku` | Model to use |
| `NUDGER_PRIVATE_KEY` | Yes | — | Ethereum private key for signing nudge messages |
| `ETHEREUM_RPC_URL` | Yes | — | RPC URL for blockchain access |
| `INDEXER_URL` | No | `http://localhost:3001` | URL of the Ponder event cache |
| `PORT` | No | `3002` | HTTP server port |
| `COMMONALITY_STATEMENTS` | No | (empty) | Comma-separated list of pre-configured common-ground statement texts to check against each target |
