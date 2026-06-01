# Cloudflare service gateway

Commonality uses Cloudflare as the public edge/naming layer and Render as compute. The UI domains are static IPFS/DNSLink names; backend services are exposed through one gateway hostname per environment:

- Testnet: `https://services.testnet.commonality.works`
- Mainnet: `https://services.commonality.works`

The Worker strips the first path segment and proxies to the corresponding Render service:

| Public URL | Render upstream |
| --- | --- |
| `/indexer/*` | `INDEXER_ORIGIN/*` |
| `/platform-api/*` | `PLATFORM_API_ORIGIN/*` |
| `/attesters/*` | `ATTESTERS_ORIGIN/*` |
| `/workers/*` | `WORKERS_ORIGIN/*` |

Examples:

```text
https://services.testnet.commonality.works/indexer/graphql
https://services.testnet.commonality.works/platform-api/health
https://services.testnet.commonality.works/attesters/content-attester
https://services.testnet.commonality.works/workers/health
```

## Direct Render fallback

The `*.onrender.com` service URLs remain usable as a temporary bypass if the Cloudflare Worker route is not ready or needs to be disabled. Use these direct origins in deployment/runtime config:

```env
EVENT_CACHE_URL=https://commonality-indexer.onrender.com
PLATFORM_API_URL=https://commonality-platform-api.onrender.com
CONTENT_FINDER_PLATFORM_API_URL=https://commonality-platform-api.onrender.com
CONTENT_FINDER_SUBMISSIONS_API_URL=https://commonality-platform-api.onrender.com/content-submission
CONTENT_FINDER_ATTESTER_URL=https://commonality-service-host-attesters.onrender.com/content-attester
IMPLICATION_FINDER_ATTESTER_URL=https://commonality-service-host-attesters.onrender.com/implication-attester
BEAT_AGENT_FINDER_ATTESTER_URL=https://commonality-service-host-attesters.onrender.com/beat-agent/evaluate-content
BEAT_AGENT_PLATFORM_API_URL=https://commonality-platform-api.onrender.com
```

This is an operational fallback, not automatic client-side failover: already-published IPFS UI builds keep using the URL in their published `config.json` until a new config/build is published.

## Deploy

Prerequisites:

1. Move `commonality.works` DNS to Cloudflare, or otherwise configure a Cloudflare route for the zone.
2. Confirm the Render upstream URLs in `wrangler.testnet.toml` / `wrangler.mainnet.toml`. Render service names are expected to produce `*.onrender.com` origins, but use the actual dashboard URL if Render chooses a different hostname.
3. Authenticate Wrangler: `npx wrangler login`.

Deploy testnet:

```bash
npx wrangler deploy -c cloudflare-service-gateway/wrangler.testnet.toml
```

Deploy mainnet:

```bash
npx wrangler deploy -c cloudflare-service-gateway/wrangler.mainnet.toml
```

## Local test

```bash
npm run cloudflare-gateway:test
```
