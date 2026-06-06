# Setting up `commonality.works` for the Commonality testnet

Instructions for an AI/browser operator helping the domain owner set up real DNS and Cloudflare routing for the first public Base Sepolia testnet.

## Goal

Make these URLs work:

- UI apps: `https://alignment.testnet.commonality.works`, `https://tally.testnet.commonality.works`, etc.
- Backend gateway: `https://services.testnet.commonality.works/indexer/graphql`, `/platform-api/health`, `/attesters/health`, `/workers/health`

Do **not** spend mainnet gas or change ENS while doing this. ENS/eth.limo is not the blocker: nested `*.testnet.commonality.eth.limo` currently fails TLS, so the intended browser URLs are `*.testnet.commonality.works`.

## Current state (as of 2026-06-05)

**Already done:**

- `commonality.works` is on Cloudflare (nameservers updated at Network Solutions). Adam manages the Cloudflare account.
- All 16 DNS records for the 8 UI subdomains exist in Cloudflare (CNAME + TXT pairs). CNAMEs are **proxied** and point to `brown-racial-sailfish-957.mypinata.cloud` (Pinata dedicated gateway).
- A proxied placeholder A record exists for `services.testnet.commonality.works` (required for the Worker route to work).
- Advanced Certificate for `*.testnet.commonality.works` is active (Let's Encrypt, ordered via Cloudflare dashboard — required because the default cert only covers one subdomain level).
- Backend service Worker (`cloudflare-service-gateway/`) is deployed and all 4 health endpoints pass.
- UI gateway Worker (`cloudflare-ui-gateway/`) is deployed. It resolves IPNS names via `name.web3.storage`, caches IPNS→CID in Cloudflare KV, fetches immutable CID paths through IPFS gateways, and caches successful CID responses at the Cloudflare edge. `gateway.pinata.cloud` is configured first, with public CID gateways as fallbacks because Pinata's public gateway can rate-limit or refuse HTML.
- All 8 UI roots were verified returning `200` on 2026-06-06.
- Render platform API, attesters, and workers are live through `services.testnet.commonality.works`; the indexer direct Render origin was returning 502 during the 2026-06-06 check, so do not switch backend envs to the gateway until the indexer is healthy again.

**Still needed:**

- Test the UI in a real browser (curl confirms HTML/assets, but wallet/runtime config should be sanity-checked interactively).
- Once the direct Render indexer is healthy again, switch `deployments/base-sepolia.env` / `render.yaml.template` backend URLs from direct Render to `services.testnet.commonality.works/*`.

## Safety rules

- Do not reveal or paste private keys into browser forms or chat.
- Do not run ENS scripts (`update-ens.sh`, `create-ens-subdomains.sh`) unless explicitly asked later.
- Do not add Render custom domains for each service. Render remains compute; Cloudflare is the public edge.
- If Cloudflare asks to import existing DNS records, preserve any unrelated existing records for `commonality.works`.

## Architecture: why a Worker proxy instead of DNSLink

The UI subdomains use a Cloudflare Worker (`cloudflare-ui-gateway/`) rather than plain DNSLink CNAMEs. Reason: our IPNS names are w3name keys (not Pinata-native), so they can only be resolved by Pinata's infrastructure or the w3name API. Public gateways like `ipfs.io` cannot resolve them. The Cloudflare-hosted IPFS gateways (`cloudflare-ipfs.com`, `*.mypinata.cloud`) trigger error 1014/1016 due to Cloudflare's cross-account restrictions. The Worker sidesteps all of this by:

1. Calling `name.web3.storage/name/{ipns-key}` to resolve the IPNS name to a CID.
2. Caching `IPNS name → CID` in Cloudflare KV for 5 minutes (plus a best-effort per-isolate memory cache).
3. Fetching `/ipfs/{cid}/...` from the configured IPFS gateways. Pinata is tried first; public CID gateways such as `ipfs.io`/`w3s.link` are fallbacks.
4. Caching successful immutable CID responses in Cloudflare's Cache API, keyed by CID path.
5. Returning the response to the browser under the clean `*.testnet.commonality.works` URL.

Per-deploy work remains a single `w3name` publish — no DNS or Wrangler redeployment needed. The 5-minute CID cache controls how quickly a new IPNS publish is noticed; cached asset responses are keyed by CID, so new publishes use new cache keys.

## Step 1 — Add `commonality.works` to Cloudflare

*(Already done. Kept here for reference if starting from scratch.)*

1. Log in to the domain owner's Cloudflare account.
2. Add site: `commonality.works`.
3. Use the Free plan unless the owner says otherwise.
4. Let Cloudflare scan/import existing DNS records.
5. Cloudflare will show two assigned nameservers. Record them exactly.
6. Log in to Network Solutions and replace the domain's nameservers with Cloudflare's.
7. Wait for Cloudflare to show the zone as active.

Verification:
```bash
dig +short NS commonality.works
```

## Step 2 — Create UI DNS records and placeholder A record

*(Already done. Kept here for reference.)*

For each UI app: one proxied CNAME → `brown-racial-sailfish-957.mypinata.cloud` and one TXT `_dnslink.*` record. See `deployments/testnet-ipns.env` for IPNS names.

Also add a proxied A record for `services.testnet.commonality.works` pointing to `192.0.2.1` (dummy IP — the Worker intercepts all traffic before it reaches the origin).

Order an **Advanced Certificate** in Cloudflare SSL/TLS → Edge Certificates covering `*.testnet.commonality.works` (and `commonality.works`, `*.commonality.works`). Use Let's Encrypt. The default cert only covers one subdomain level and will cause TLS failures for `*.testnet.*` subdomains.

## Step 3 — Deploy the backend Cloudflare Worker gateway

```bash
npm install
npx wrangler login
npx wrangler deploy -c cloudflare-service-gateway/wrangler.testnet.toml
```

Verification:
```bash
curl https://services.testnet.commonality.works/platform-api/health
curl https://services.testnet.commonality.works/attesters/health
curl https://services.testnet.commonality.works/workers/health
curl https://services.testnet.commonality.works/indexer/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"{ _meta { status } }"}'
```

## Step 4 — Deploy the UI Cloudflare Worker gateway

The IPNS names, gateway origins, and KV binding are in `cloudflare-ui-gateway/wrangler.testnet.toml`. The Pinata gateway key must be set as a Wrangler secret (not in the toml):

```bash
source .env.secrets
echo "$PINATA_GATEWAY_KEY" | npx wrangler secret put PINATA_GATEWAY_KEY \
  -c cloudflare-ui-gateway/wrangler.testnet.toml
npx wrangler deploy -c cloudflare-ui-gateway/wrangler.testnet.toml
```

Verification:
```bash
curl -I https://alignment.testnet.commonality.works
curl -I https://tally.testnet.commonality.works
```

If Pinata returns 429/403, the Worker should fall back to public CID gateways and then cache successful responses. If all gateways fail, inspect `wrangler tail commonality-ui-gateway-testnet` for the per-gateway status log.

If you get a 401/403 from Pinata: the gateway key is missing or wrong. Check `PINATA_GATEWAY_KEY` in `.env.secrets` and re-run the `wrangler secret put` command.

## Step 5 — Switch backend env from direct Render URLs to gateway URLs

Once the backend Worker is verified, update `deployments/base-sepolia.env` and `render.yaml.template` to use `https://services.testnet.commonality.works/...` instead of direct `*.onrender.com` URLs, then regenerate `render.yaml`:

```bash
node scripts/generate-render-yaml.mjs
```

## Optional later work — do not block first testnet on this

- DNSSEC-import `commonality.works` into ENS if we decide we want DNS names to also be ENS names.
- Pinata host origins in Access Controls currently list all 8 subdomains manually (no wildcard on Picnic plan). If we add more UI subdomains, add them there too.
