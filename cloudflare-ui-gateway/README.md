# Cloudflare UI gateway

Serves the eight Commonality UI apps (`*.testnet.commonality.works`) via a Cloudflare Worker that proxies IPFS content from Pinata.

## Why a Worker instead of plain DNSLink

The IPNS names are w3name keys (Protocol Labs). Public gateways like `ipfs.io` cannot resolve those IPNS names directly, but they can serve immutable `/ipfs/{cid}` paths once the Worker has resolved the current CID. Cloudflare's cross-account restrictions (errors 1014/1016) prevent proxied CNAMEs to `cloudflare-ipfs.com` or `*.mypinata.cloud`. The Worker sidesteps this by resolving IPNS → CID via the w3name API, then fetching the CID through IPFS gateways under our own hostname.

## How it works

1. Browser requests `alignment.testnet.commonality.works/some/path`.
2. Worker extracts the subdomain (`alignment`), looks up the IPNS key from its env vars.
3. Calls `https://name.web3.storage/name/{ipns-key}` → gets `/ipfs/{cid}`.
4. Caches the IPNS→CID mapping in Cloudflare KV for 5 minutes.
5. Fetches `/ipfs/{cid}/some/path` from the configured gateways. Pinata is tried first, with public CID gateways (`ipfs.io`, `w3s.link`) as fallbacks.
6. Caches successful immutable CID responses in Cloudflare's Cache API and returns them under the original browser URL.

The browser URL stays `alignment.testnet.commonality.works` throughout.

## Subdomain → IPNS mapping

| URL | IPNS key (env var) |
| --- | --- |
| `commonality.testnet.commonality.works` | `IPNS_COMMONALITY` |
| `lazygiving.testnet.commonality.works` | `IPNS_LAZYGIVING` |
| `alignment.testnet.commonality.works` | `IPNS_ALIGNMENT` |
| `tally.testnet.commonality.works` | `IPNS_TALLY` |
| `content-funding.testnet.commonality.works` | `IPNS_CONTENT_FUNDING` |
| `civility.testnet.commonality.works` | `IPNS_CIVILITY` |
| `common-sense-majority.testnet.commonality.works` | `IPNS_COMMON_SENSE_MAJORITY` |
| `conceptspace.testnet.commonality.works` | `IPNS_CONCEPTSPACE` |

IPNS key values are in `wrangler.testnet.toml` (sourced from `deployments/testnet-ipns.env`).

## Deploy

Prerequisites:
1. `commonality.works` zone is active in Cloudflare.
2. All 8 UI subdomains have proxied CNAMEs in Cloudflare DNS (target doesn't matter — the Worker intercepts).
3. An Advanced Certificate covers `*.testnet.commonality.works` (Cloudflare SSL/TLS → Edge Certificates).
4. The `CID_CACHE` KV namespace binding is present in the Wrangler config.
5. Pinata gateway key is in `.env.secrets` as `PINATA_GATEWAY_KEY`.
6. Wrangler is authenticated: `npx wrangler login`.

Deploy testnet:
```bash
source .env.secrets
echo "$PINATA_GATEWAY_KEY" | npx wrangler secret put PINATA_GATEWAY_KEY \
  -c cloudflare-ui-gateway/wrangler.testnet.toml
npx wrangler deploy -c cloudflare-ui-gateway/wrangler.testnet.toml
```

Deploy mainnet (fill in IPNS names in `wrangler.mainnet.toml` first):
```bash
source .env.secrets
echo "$PINATA_GATEWAY_KEY" | npx wrangler secret put PINATA_GATEWAY_KEY \
  -c cloudflare-ui-gateway/wrangler.mainnet.toml
npx wrangler deploy -c cloudflare-ui-gateway/wrangler.mainnet.toml
```

## Per-deploy workflow

After publishing a new UI build (`scripts/deploy-ui.sh`), run `w3name` publish to update the IPNS pointer. No Wrangler redeployment or DNS change needed — the Worker picks up the new CID automatically within 5 minutes (CID cache TTL).

## Pinata Access Controls

The Pinata dedicated gateway (`brown-racial-sailfish-957.mypinata.cloud`) has all 8 `*.testnet.commonality.works` hostnames listed under Access Controls → Host Origins. If you add a new UI subdomain, add it there too. (Wildcards are not supported on the Picnic plan.)

The public Pinata gateway (`gateway.pinata.cloud`) used by the Worker does not require host origin configuration — it uses the gateway key header instead. Pinata's public gateway may still rate-limit or refuse HTML responses, so the Worker falls back to public CID gateways and caches successful responses at Cloudflare.
