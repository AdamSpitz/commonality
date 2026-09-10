# Content-Funding Platform API Service

Backend service for the content-funding system's platform-dependent work.

## Role in the AI-service ecosystem

- **Family:** Platform/context service, not an AI judgment service.
- **Primary UI domains:** Content Funding, Civility, and CSM.
- **Trust boundary:** UIs and content services rely on it for canonical identity/content mapping, verification challenges, submission queues, and local context.
- **Output:** Canonical channel/content IDs, verification proofs/transactions when configured, content-submission queue entries, and local context for content evaluators.
- **Related services:** `content-finder` consumes its submission queue and canonicalization endpoints; `content-attester` and `beat-agent` depend on its resolved content/context.

The platform-dependent work is:

1. Resolve creator handles to stable channel IDs
2. Resolve content URLs to canonical content IDs and validate ownership
3. Fetch local context around a content URL for contextual/beat-agent evaluation
4. Issue and confirm social-channel and website beneficiary verification challenges
5. Accept and serve queued content-attester submissions

## Current scope

This workspace implements the service described in [the spec](../specs/tech/subsystems/content-funding/platform-api-service.md) as a real monorepo artifact with:

- Express API
- strict shared canonicalization via `@commonality/sdk`
- in-memory caches for channel resolution, content lookups, and pending verification challenges
- Twitter/X and YouTube resolution clients built on plain `fetch`
- optional on-chain submission for `BeneficiaryRegistry.verifyBeneficiary(...)`

## Verification model

The repo's current content-funding contracts include a real signature-verifying `BeneficiaryVerifier` contract. `BeneficiaryRegistry` still trusts a verifier contract, not a verifier EOA directly, and that verifier contract in turn trusts a specific signer address.

That means:

- `POST /verify/confirm` signs the exact proof payload that the on-chain `BeneficiaryVerifier` checks
- `POST /verify/confirm` can optionally submit `verifyBeneficiary(...)` if `ETHEREUM_RPC_URL`, `BENEFICIARY_REGISTRY_ADDRESS`, and `SUBMIT_VERIFICATION_TX=true` are configured
- end-to-end verification works on the local deployment as long as `VERIFIER_PRIVATE_KEY` corresponds to the verifier contract's configured `trustedVerifier`

## Configuration

All configuration is via environment variables.

### Core

- `PORT` default `3001`
- `CORS_ALLOWED_ORIGINS` default `*`; either `*` for wildcard CORS or a comma-separated list of bare origins like `https://app.example.com,http://localhost:5173`
- `COMMONALITY_TWITTER_HANDLE` default `@commonality`
- `CLAIM_PAGE_BASE_URL` optional public base URL used in challenge tweet templates
- `CONTENT_SUBMISSIONS_FILE_PATH` default `./platform-api-content-submissions.json`
- `POLICY_BUNDLE_URL` and `POLICY_CONTENT_GATEWAY_URL` optionally enable the operator-scoped
  `GET /policy-content/:cid` gateway. They must be configured together. Startup activates the
  resolved bundle before accepting traffic; listed CIDs return 451 and every response reports the
  enforced policy status/digest. Point a Civility deployment's IPFS retrieval at this route instead
  of applying its policy to the neutral shared pointer index. `POLICY_CONTENT_MAX_BYTES` (8 MiB),
  `POLICY_CONTENT_TIMEOUT_MS` (10 seconds), `POLICY_CONTENT_RATE_LIMIT_WINDOW_MS` (60 seconds), and
  `POLICY_CONTENT_RATE_LIMIT_MAX_REQUESTS` (60) bound public proxy resource use.

### Twitter/X

- `X_API_BEARER_TOKEN` optional, required for Twitter channel resolution, content validation, and verification
- `X_API_BASE_URL` default `https://api.x.com`

### YouTube

- `YOUTUBE_API_KEY` optional, required for YouTube channel resolution and content validation
- `YOUTUBE_API_BASE_URL` default `https://www.googleapis.com/youtube/v3`

### Verification / Ethereum

- `VERIFIER_PRIVATE_KEY` optional, required for `POST /verify/confirm`
- `ETHEREUM_RPC_URL` optional, required only if on-chain submission is enabled
- `BENEFICIARY_REGISTRY_ADDRESS` optional, required for domain challenges and on-chain submission
- `CHAIN_ID` required for signing proofs and domain challenges
- `SUBMIT_VERIFICATION_TX` default `false`

### Coinbase Onramp / USDC arrival detection

- `COINBASE_CDP_API_KEY_ID` and `COINBASE_CDP_API_KEY_SECRET` optional, required for `POST /onramp/coinbase/session`
- `BASE_RPC_URL` optional Base mainnet RPC override for `GET /onramp/base-usdc-balance`; defaults to `https://mainnet.base.org`

### Caching and rate limits

- `CHALLENGE_TTL_SECONDS` default `1800`
- `CONTENT_CACHE_TTL_SECONDS` default `3600`
- `RESOLVE_RATE_LIMIT_WINDOW_MS` default `60000`
- `RESOLVE_RATE_LIMIT_MAX_REQUESTS` default `60`
- `VERIFY_RATE_LIMIT_WINDOW_MS` default `60000`
- `VERIFY_RATE_LIMIT_MAX_REQUESTS` default `5`
- `SUBMISSION_RATE_LIMIT_WINDOW_MS` default `60000`
- `SUBMISSION_RATE_LIMIT_MAX_REQUESTS` default `10`
- `ONRAMP_RATE_LIMIT_WINDOW_MS` default `60000`
- `ONRAMP_RATE_LIMIT_MAX_REQUESTS` default `10`

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

### `POST /onramp/coinbase/session`

Creates a short-lived Coinbase Onramp URL that buys Base USDC into the donor's own wallet address. The service only mints the session token; Coinbase handles fiat/KYC/card processing and Commonality never touches funds.

Request:

```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "presetFiatAmount": "50",
  "fiatCurrency": "USD"
}
```

Response:

```json
{
  "destinationAddress": "0x1234567890123456789012345678901234567890",
  "url": "https://pay.coinbase.com/buy/select-asset?..."
}
```

### `GET /onramp/base-usdc-balance?address=0x…`

Polls native USDC on Base mainnet for a donor wallet address and reports whether the address has deployed code yet. This is the arrival-detection leg for the no-custody on-ramp path.

Response:

```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "rawBalance": "50000000",
  "formattedBalance": "50",
  "addressDeployed": false
}
```

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

### `POST /resolve/website-beneficiary`

Normalizes a website identity for project creation. Apex and `www` are the same
beneficiary. A live homepage may hop within that registrable domain; a hop to a
different registrable domain is refused (`invalid_domain_redirect`). An
unreachable site is still accepted (`reachable: false`) because create-time
only refuses observed redirects.

```json
{
  "domain": "https://www.example.org/"
}
```

```json
{
  "namespace": "dns",
  "canonicalIdentifier": "example.org",
  "reachable": true
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

Fetches mechanically retrievable local context around content for beat agents or richer content attesters. Callers may pass either a URL or a canonical content ID:

```json
{
  "url": "https://x.com/alice/status/18347",
  "authorRecentLimit": 10,
  "threadLimit": 10,
  "repliesLimit": 10
}
```

```json
{
  "canonicalId": "twitter:uid:12345678:18347",
  "authorRecentLimit": 10
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

Supports `platform: "twitter"`, `"youtube"`, `"substack"`, and `"dns"`. For `dns`,
`handle` may be an apex domain or its `https://www.` URL. The response's
`verificationPostTemplate` is the exact JSON document to publish at
`https://<domain>/.well-known/commonality-claim.json`; it binds the domain, claimant,
chain, registry, nonce, and expiry. Subdomains and path-scoped identities are rejected.

### `POST /verify/confirm`

Confirms the verification post or well-known domain document, signs the proof, and
optionally submits the on-chain transaction if configured. A domain claim may redirect
within the same registrable domain, but not to a different one.

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
