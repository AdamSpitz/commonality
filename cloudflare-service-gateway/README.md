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
