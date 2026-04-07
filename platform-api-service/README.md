# Content-Funding Platform API Service

Backend service for the content-funding system's platform-dependent work:

1. Resolve creator handles to stable channel IDs
2. Resolve content URLs to canonical content IDs and validate ownership
3. Issue and confirm Twitter-based channel-claim verification challenges

## Current scope

This workspace implements the service described in [the spec](../specs/subsystems/content-funding/platform-api-service.md) as a real monorepo artifact with:

- Express API
- strict shared canonicalization via `@commonality/sdk`
- in-memory caches for channel resolution, content lookups, and pending verification challenges
- Twitter/X and YouTube resolution clients built on plain `fetch`
- optional on-chain submission for `ChannelRegistry.verifyChannel(...)`

## Important limitation

The repo's current content-funding contracts do **not** yet include the signature-verifying on-chain verifier described in the spec. `ChannelRegistry` still trusts a verifier contract, not a verifier EOA directly.

That means:

- `POST /verify/confirm` can sign a proof today
- `POST /verify/confirm` can optionally submit `verifyChannel(...)` if you configure a compatible verifier contract on-chain
- this workspace does **not** by itself make channel verification end-to-end live on the current local deployment

## Configuration

All configuration is via environment variables.

### Core

- `PORT` default `3001`
- `COMMONALITY_TWITTER_HANDLE` default `@commonality`
- `CLAIM_PAGE_BASE_URL` optional public base URL used in challenge tweet templates

### Twitter/X

- `X_API_BEARER_TOKEN` optional, required for Twitter channel resolution, content validation, and verification
- `X_API_BASE_URL` default `https://api.x.com`

### YouTube

- `YOUTUBE_API_KEY` optional, required for YouTube channel resolution and content validation
- `YOUTUBE_API_BASE_URL` default `https://www.googleapis.com/youtube/v3`

### Verification / Ethereum

- `VERIFIER_PRIVATE_KEY` optional, required for `POST /verify/confirm`
- `ETHEREUM_RPC_URL` optional, required only if on-chain submission is enabled
- `CHANNEL_REGISTRY_ADDRESS` optional, required only if on-chain submission is enabled
- `SUBMIT_VERIFICATION_TX` default `false`

### Caching and rate limits

- `CHALLENGE_TTL_SECONDS` default `1800`
- `CONTENT_CACHE_TTL_SECONDS` default `3600`
- `RESOLVE_RATE_LIMIT_WINDOW_MS` default `60000`
- `RESOLVE_RATE_LIMIT_MAX_REQUESTS` default `60`
- `VERIFY_RATE_LIMIT_WINDOW_MS` default `60000`
- `VERIFY_RATE_LIMIT_MAX_REQUESTS` default `5`

## Running

```bash
npm run dev --workspace=@commonality/platform-api-service
```

For production:

```bash
npm run build --workspace=@commonality/platform-api-service
npm run start --workspace=@commonality/platform-api-service
```

## Endpoints

### `POST /resolve/channel`

Request:

```json
{
  "platform": "twitter",
  "handle": "@alice"
}
```

Response:

```json
{
  "channelId": "twitter:uid:12345678",
  "handle": "@alice",
  "displayName": "Alice"
}
```

### `POST /resolve/content`

Request:

```json
{
  "url": "https://x.com/alice/status/18347"
}
```

Response:

```json
{
  "platform": "twitter",
  "channelId": "twitter:uid:12345678",
  "contentSuffix": "18347",
  "canonicalId": "twitter:uid:12345678:18347",
  "metadata": {
    "authorHandle": "@alice",
    "text": "..."
  }
}
```

### `POST /verify/challenge`

Currently supports `platform: "twitter"` only.

### `POST /verify/confirm`

Confirms the verification post, signs the proof, and optionally submits the on-chain transaction if configured.

### `GET /health`

Returns service health plus whether each provider is configured.
