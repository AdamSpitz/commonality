# Hostinger DNS setup for `commonality.works`

Manual/operator instructions for Sam (or an AI driving Sam's browser) if `commonality.works` DNS is still hosted at Hostinger.

The long-term deployment model uses Cloudflare as the public edge/naming layer and Render only for compute. This Hostinger document is therefore only useful during a transition period for the IPFS/IPNS UI records. Backend service routing is handled by the Cloudflare Worker in [`cloudflare-service-gateway/`](../cloudflare-service-gateway/), not by Render custom domains.

## Prerequisites

Before editing DNS records:

1. Run the naming setup locally:
   ```bash
   ./scripts/setup-testnet-naming.sh
   ```
2. Confirm it wrote:
   - `.env.secrets` with `IPNS_PRIVATE_KEY_TESTNET_*` values
   - `deployments/testnet-ipns.env` with `IPNS_NAME_TESTNET_*` values

   Keep UI URL defaults in `deployments/base-sepolia.env`; they are not secrets.
3. Create the Render services, but do **not** add per-service Render custom domains. Public backend routing goes through Cloudflare Worker routes such as `services.testnet.commonality.works/*`.

## DNS records to add in Hostinger

In Hostinger's DNS Zone editor for `commonality.works`, add the following records.

Hostinger UIs vary; fields are usually named something like:

- **Type**: `CNAME` or `TXT`
- **Name/Host**: subdomain label, sometimes relative to `commonality.works`
- **Target/Points to/Value**: destination value
- **TTL**: leave default or use the shortest offered value

If Hostinger expects relative names, enter `alignment.testnet`, not `alignment.testnet.commonality.works`. If it expects full names, enter the full hostname.

---

## 1. IPFS/IPNS UI domains

For each UI, create **two records**:

1. CNAME from the UI hostname to an IPFS gateway that supports DNSLink.
2. TXT record at `_dnslink.<ui-hostname>` pointing at that UI's IPNS name.

Use the actual IPNS names from `deployments/testnet-ipns.env`.

| UI | CNAME name | CNAME target | TXT name | TXT value |
| --- | --- | --- | --- | --- |
| Commonality | `commonality.testnet` | `cloudflare-ipfs.com` | `_dnslink.commonality.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_COMMONALITY` |
| LazyGiving | `lazygiving.testnet` | `cloudflare-ipfs.com` | `_dnslink.lazygiving.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_LAZYGIVING` |
| Alignment | `alignment.testnet` | `cloudflare-ipfs.com` | `_dnslink.alignment.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_ALIGNMENT` |
| Tally | `tally.testnet` | `cloudflare-ipfs.com` | `_dnslink.tally.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_TALLY` |
| Content Funding | `content-funding.testnet` | `cloudflare-ipfs.com` | `_dnslink.content-funding.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_CONTENT_FUNDING` |
| Civility | `civility.testnet` | `cloudflare-ipfs.com` | `_dnslink.civility.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_CIVILITY` |
| Common Sense Majority | `common-sense-majority.testnet` | `cloudflare-ipfs.com` | `_dnslink.common-sense-majority.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_COMMON_SENSE_MAJORITY` |
| Conceptspace | `conceptspace.testnet` | `cloudflare-ipfs.com` | `_dnslink.conceptspace.testnet` | `dnslink=/ipns/$IPNS_NAME_TESTNET_CONCEPTSPACE` |

Notes:

- Do **not** put quotes around TXT values unless Hostinger explicitly requires it.
- If Hostinger auto-appends `.commonality.works`, do not type the domain twice.
- These DNSLink records are stable across testnet UI releases. Future deploys publish new IPFS CIDs to the same IPNS names, so DNS does not need to change.

## 2. Backend service gateway

Do **not** create Hostinger DNS records or Render custom domains for individual backend services. The public service hostname is a Cloudflare Worker route:

```text
services.testnet.commonality.works/*
```

Deploy it from [`cloudflare-service-gateway/`](../cloudflare-service-gateway/). It proxies to the Render `*.onrender.com` service origins and routes by path:

| Public prefix | Render service |
| --- | --- |
| `/indexer/*` | `commonality-indexer` |
| `/platform-api/*` | `commonality-platform-api` |
| `/attesters/*` | `commonality-service-host-attesters` |
| `/workers/*` | `commonality-service-host-workers` |

Configure deployment env vars to use the gateway URL:

```env
EVENT_CACHE_URL=https://services.testnet.commonality.works/indexer
PLATFORM_API_URL=https://services.testnet.commonality.works/platform-api
```

The attester service URL is used by worker configuration, e.g.:

```env
CONTENT_FINDER_ATTESTER_URL=https://services.testnet.commonality.works/attesters/content-attester
IMPLICATION_FINDER_ATTESTER_URL=https://services.testnet.commonality.works/attesters/implication-attester
```

## 3. CORS

The platform API accepts either `*` or an explicit comma-separated list of bare origins. It does **not** currently accept wildcard subdomain patterns like `https://*.testnet.commonality.works`.

For first testnet, use the explicit allowlist below. It includes all eight `commonality.works` UI origins plus the corresponding ENS gateway origins, because testnet should be reachable through both naming paths:

```env
CORS_ALLOWED_ORIGINS=https://commonality.testnet.commonality.works,https://lazygiving.testnet.commonality.works,https://alignment.testnet.commonality.works,https://tally.testnet.commonality.works,https://content-funding.testnet.commonality.works,https://civility.testnet.commonality.works,https://common-sense-majority.testnet.commonality.works,https://conceptspace.testnet.commonality.works,https://commonality.testnet.commonality.eth.limo,https://lazygiving.testnet.commonality.eth.limo,https://alignment.testnet.commonality.eth.limo,https://tally.testnet.commonality.eth.limo,https://content-funding.testnet.commonality.eth.limo,https://civility.testnet.commonality.eth.limo,https://common-sense-majority.testnet.commonality.eth.limo,https://conceptspace.testnet.commonality.eth.limo
```

For a throwaway/debug deployment, `CORS_ALLOWED_ORIGINS=*` is still acceptable, but do not try a partial wildcard pattern.

## 4. Verification commands

After DNS propagation and Cloudflare Worker deployment:

```bash
curl -I https://alignment.testnet.commonality.works
curl https://services.testnet.commonality.works/indexer/graphql
curl https://services.testnet.commonality.works/platform-api/health
curl https://services.testnet.commonality.works/attesters/health
curl https://services.testnet.commonality.works/workers/health
```

## ENS via DNS name: `commonality.works`

ENS supports importing DNS names into ENS using DNSSEC-based ownership proof: <https://docs.ens.domains/learn/dns/>. That would let `commonality.works` itself be used as an ENS name, instead of relying only on `commonality.eth`.

This is a separate setup track from ordinary DNS records above.

Before committing to it, verify:

1. Hostinger supports enabling **DNSSEC** for `commonality.works`.
2. The registrar/registry path for `.works` publishes DS records correctly.
3. ENS's DNS import flow accepts `.works` names.
4. Whoever controls DNS can create the required TXT proof records.
5. We are comfortable with the operational model: DNS control becomes relevant to ENS name control for the imported DNS name.

Possible deployment model:

- Keep `commonality.eth` as the project-owned ENS root we already control.
- Also import `commonality.works` into ENS once DNSSEC is working.
- Use `*.testnet.commonality.works` for normal browser URLs.
- Optionally set ENS resolver/contenthash/text records for `commonality.works` or subnames after import.

Open question: whether we want DNS-imported ENS to be the canonical naming scheme, or only an additional convenience. For first testnet, the ordinary DNS records above are enough; DNSSEC/ENS import can be done later unless we specifically want `commonality.works` to resolve as an ENS name from day one.
