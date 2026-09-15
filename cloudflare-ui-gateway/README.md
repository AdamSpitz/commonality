# Cloudflare UI gateway

Serves the Commonality UI apps (`*.testnet.commonality.works`), including CauseStarter, via a Cloudflare Worker that proxies IPFS content from Pinata.

## Why a Worker instead of plain DNSLink

The IPNS names are w3name keys (Protocol Labs). Public gateways like `ipfs.io` cannot resolve those IPNS names directly, but they can serve immutable `/ipfs/{cid}` paths once the Worker has resolved the current CID. Cloudflare's cross-account restrictions (errors 1014/1016) prevent proxied CNAMEs to `cloudflare-ipfs.com` or `*.mypinata.cloud`. The Worker sidesteps this by resolving IPNS → CID via the w3name API, then fetching the CID through IPFS gateways under our own hostname.

## How it works

1. Browser requests `alignment.testnet.commonality.works/some/path`.
2. Worker extracts the subdomain (`alignment`), looks up the IPNS key from its env vars.
3. Calls `https://name.web3.storage/name/{ipns-key}` → gets `/ipfs/{cid}`.
4. Caches the IPNS→CID mapping in Cloudflare KV for 5 minutes.
5. Fetches `/ipfs/{cid}/some/path` from the configured gateways. Pinata is tried first, with public CID gateways (`ipfs.io`, `w3s.link`) as fallbacks.
6. Paths under `/test-data/` resolve `IPNS_TEST_DATA` instead of the UI bundle, so the encrypted registry is same-origin.
7. Caches successful immutable CID responses in Cloudflare's Cache API and returns them under the original browser URL.

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
| `causestarter.testnet.commonality.works` | `IPNS_CAUSESTARTER` |
| `*.testnet.commonality.works/test-data/*` | `IPNS_TEST_DATA` |

IPNS key values are in `wrangler.testnet.toml` (sourced from `deployments/testnet-ipns.env`).

## Deploy

Prerequisites:
1. `commonality.works` zone is active in Cloudflare.
2. All UI subdomains have proxied CNAMEs in Cloudflare DNS (target doesn't matter — the Worker intercepts).
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

The Pinata dedicated gateway (`brown-racial-sailfish-957.mypinata.cloud`) has the `*.testnet.commonality.works` hostnames listed under Access Controls → Host Origins. If you add a new UI subdomain, add it there too. (Wildcards are not supported on the Picnic plan.)

The Worker fetches Pinata first using `PINATA_GATEWAY_ORIGIN` plus `PINATA_GATEWAY_KEY`. Pinata will not serve HTML from `gateway.pinata.cloud` or `*.mypinata.cloud`; testnet uses the grey-cloud custom domain `ipfs-origin.testnet.commonality.works` (CNAME to `brown-racial-sailfish-957.mypinata.cloud`). Each upstream fetch is capped at a few seconds so a stalled `ipfs.io` lookup cannot 504 the Worker. Public CID gateways remain fallbacks. Successful responses are cached at Cloudflare.
