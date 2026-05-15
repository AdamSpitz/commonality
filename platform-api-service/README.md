# Content-Funding Platform API Service

Backend service for the content-funding system's platform-dependent work:

1. Resolve creator handles to stable channel IDs
2. Resolve content URLs to canonical content IDs and validate ownership
3. Fetch local context around a content URL for contextual/beat-agent evaluation
4. Issue and confirm Twitter-based channel-claim verification challenges
5. Accept and serve queued content-attester submissions

## Current scope

This workspace implements the service described in [the spec](../specs/subsystems/content-funding/platform-api-service.md) as a real monorepo artifact with:

- Express API
- strict shared canonicalization via `@commonality/sdk`
- in-memory caches for channel resolution, content lookups, and pending verification challenges
- Twitter/X and YouTube resolution clients built on plain `fetch`
- optional on-chain submission for `ChannelRegistry.verifyChannel(...)`

## Verification model

The repo's current content-funding contracts include a real signature-verifying `ChannelVerifier` contract. `ChannelRegistry` still trusts a verifier contract, not a verifier EOA directly, and that verifier contract in turn trusts a specific signer address.

That means:

- `POST /verify/confirm` signs the exact proof payload that the on-chain `ChannelVerifier` checks
- `POST /verify/confirm` can optionally submit `verifyChannel(...)` if `ETHEREUM_RPC_URL`, `CHANNEL_REGISTRY_ADDRESS`, and `SUBMIT_VERIFICATION_TX=true` are configured
- end-to-end verification works on the local deployment as long as `VERIFIER_PRIVATE_KEY` corresponds to the verifier contract's configured `trustedVerifier`

## Configuration

All configuration is via environment variables.

### Core

- `PORT` default `3001`
- `CORS_ALLOWED_ORIGINS` default `*`; either `*` for wildcard CORS or a comma-separated list of bare origins like `https://app.example.com,http://localhost:5173`
- `COMMONALITY_TWITTER_HANDLE` default `@commonality`
- `CLAIM_PAGE_BASE_URL` optional public base URL used in challenge tweet templates
- `CONTENT_SUBMISSIONS_FILE_PATH` default `./platform-api-content-submissions.json`

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
- `SUBMISSION_RATE_LIMIT_WINDOW_MS` default `60000`
- `SUBMISSION_RATE_LIMIT_MAX_REQUESTS` default `10`

## Running

```bash
npm run dev --workspace=@commonality/platform-api-service
```

Cross-origin browser requests are enabled by default. Set `CORS_ALLOWED_ORIGINS` to a comma-separated allowlist if you want the service to echo only specific origins instead of `*`.

The local docker-compose stack also starts this service and exposes it at `http://localhost:3001`:

```bash
./scripts/services.sh --start
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
  "displayName": "Alice",
  "followerCount": 12345
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

### `POST /context/local`

Fetches mechanically retrievable local context around a content URL for beat agents or richer content attesters:

```json
{
  "url": "https://x.com/alice/status/18347",
  "authorRecentLimit": 10,
  "threadLimit": 10,
  "repliesLimit": 10
}
```

Response shape:

```json
{
  "target": { "platform": "twitter", "canonicalId": "twitter:uid:12345678:18347", "relationship": "target" },
  "parentPosts": [],
  "quotedPosts": [],
  "thread": [],
  "replies": [],
  "authorRecentPosts": []
}
```

Twitter/X currently fills the target, replied-to parent, quoted post, and author-recent fields. YouTube and Substack return a minimal target-only context for now.

### `POST /verify/challenge`

Currently supports `platform: "twitter"`, `"youtube"`, and `"substack"`.

### `POST /verify/confirm`

Confirms the verification post, signs the proof, and optionally submits the on-chain transaction if configured.

### `GET /content-submission`

Returns the current queued content submissions as JSON.

### `POST /content-submission`

Queues a content item for the content finder to process:

```json
{
  "contentUrl": "https://x.com/alice/status/18347",
  "statementCid": "bafy...",
  "declaredPerspective": "optional perspective string"
}
```

The service validates the URL/CID pair, deduplicates exact repeats, persists the queue to `CONTENT_SUBMISSIONS_FILE_PATH`, and returns `201 Created`.

### `GET /health`

Returns service health plus whether each provider is configured.
