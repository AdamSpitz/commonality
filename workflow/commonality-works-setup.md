# Setting up `commonality.works` for the Commonality testnet

Instructions for an AI/browser operator helping the domain owner set up real DNS and Cloudflare routing for the first public Base Sepolia testnet.

## Goal

Make these URLs work:

- UI apps: `https://alignment.testnet.commonality.works`, `https://tally.testnet.commonality.works`, etc.
- Backend gateway: `https://services.testnet.commonality.works/indexer/graphql`, `/platform-api/health`, `/attesters/health`, `/workers/health`

Do **not** spend mainnet gas or change ENS while doing this. ENS/eth.limo is not the blocker: nested `*.testnet.commonality.eth.limo` currently fails TLS, so the intended browser URLs are `*.testnet.commonality.works`.

## Current state to expect

As of 2026-06-04:

- `commonality.works` is not on Cloudflare yet. Public NS records are `ns65.worldnic.com` / `ns66.worldnic.com`.
- Render services are already live on direct fallback URLs:
  - `https://commonality-indexer.onrender.com`
  - `https://commonality-platform-api.onrender.com`
  - `https://commonality-service-host-attesters.onrender.com`
  - `https://commonality-service-host-workers.onrender.com`
- Stable IPNS names for UI DNSLink are committed in `deployments/testnet-ipns.env`.

## Safety rules

- Do not reveal or paste private keys into browser forms or chat.
- Do not run ENS scripts (`update-ens.sh`, `create-ens-subdomains.sh`) unless explicitly asked later.
- Do not add Render custom domains for each service. Render remains compute; Cloudflare is the public edge.
- If Cloudflare asks to import existing DNS records, preserve any unrelated existing records for `commonality.works`.

## Step 1 — Add `commonality.works` to Cloudflare

1. Log in to the domain owner's Cloudflare account.
2. Add site: `commonality.works`.
3. Use the Free plan unless the owner says otherwise.
4. Let Cloudflare scan/import existing DNS records.
5. Cloudflare will show two assigned nameservers. Record them exactly.
6. Log in to the current registrar/DNS host for `commonality.works` — public NS suggests Network Solutions / WorldNIC.
7. Replace the domain's authoritative nameservers with Cloudflare's assigned nameservers.
8. Wait for Cloudflare to show the zone as active. This can take minutes to hours.

Verification from a terminal:

```bash
dig +short NS commonality.works
```

This should eventually show Cloudflare nameservers, not `worldnic.com`.

## Step 2 — Create UI DNSLink records

For each UI app, create one CNAME and one TXT record in Cloudflare DNS.

Recommended Cloudflare setting for the CNAMEs: **Proxied** if Cloudflare allows it; otherwise DNS-only and then test TLS carefully. The TXT records are DNS-only by nature.

Use the actual IPNS names from `deployments/testnet-ipns.env`:

| UI | CNAME name | CNAME target | TXT name | TXT value |
| --- | --- | --- | --- | --- |
| Commonality | `commonality.testnet` | `cloudflare-ipfs.com` | `_dnslink.commonality.testnet` | `dnslink=/ipns/k51qzi5uqu5dj1p5np3vfbukxamutsoz9kwjrbci61044cturb8gvpcdkfltrn` |
| LazyGiving | `lazygiving.testnet` | `cloudflare-ipfs.com` | `_dnslink.lazygiving.testnet` | `dnslink=/ipns/k51qzi5uqu5djmziq6wtuctjo2wsw51brxevb2l96ma0yw703i46ezbwrhvshi` |
| Alignment | `alignment.testnet` | `cloudflare-ipfs.com` | `_dnslink.alignment.testnet` | `dnslink=/ipns/k51qzi5uqu5dgvr67vrtjpjg7x54uqmfgf8zkv83zyju33eqnff6hrledwxhz1` |
| Tally | `tally.testnet` | `cloudflare-ipfs.com` | `_dnslink.tally.testnet` | `dnslink=/ipns/k51qzi5uqu5dgm9tq0p2bn8rmkxfjrtn4x3f8pf5g5sr1guh9vu5916nitl4j6` |
| Content Funding | `content-funding.testnet` | `cloudflare-ipfs.com` | `_dnslink.content-funding.testnet` | `dnslink=/ipns/k51qzi5uqu5dhs0gm5bpwcvhpwbf2owzeyzxtw7z0z2bxp6ofgvwfg4a1j8x3j` |
| Civility | `civility.testnet` | `cloudflare-ipfs.com` | `_dnslink.civility.testnet` | `dnslink=/ipns/k51qzi5uqu5dhgz78ohaapa2smas1zov4v2z2m2qymf8iny3ol10t3csnpja27` |
| Common Sense Majority | `common-sense-majority.testnet` | `cloudflare-ipfs.com` | `_dnslink.common-sense-majority.testnet` | `dnslink=/ipns/k51qzi5uqu5dihr9y1wyezno0gsemnkhd42g750dmcky06aimty47aobfjzdms` |
| Conceptspace | `conceptspace.testnet` | `cloudflare-ipfs.com` | `_dnslink.conceptspace.testnet` | `dnslink=/ipns/k51qzi5uqu5dm14sc2ig40xkr800wll03zxxjqch4tdu5i5cum5q7nza40mdjg` |

Quick DNS verification:

```bash
dig +short CNAME alignment.testnet.commonality.works
dig +short TXT _dnslink.alignment.testnet.commonality.works
curl -I https://alignment.testnet.commonality.works
```

## Step 3 — Deploy the backend Cloudflare Worker gateway

From a checkout of the repo, with Node/npm installed:

```bash
npm install
npx wrangler login
npx wrangler deploy -c cloudflare-service-gateway/wrangler.testnet.toml
```

The Worker config is already set to route:

```text
services.testnet.commonality.works/*
```

to the four live Render services.

If Wrangler says the route/zone is unavailable, confirm:

1. The zone is active in this Cloudflare account.
2. `cloudflare-service-gateway/wrangler.testnet.toml` has `zone_name = "commonality.works"`.
3. The logged-in Cloudflare user has Workers and DNS/zone permissions.

Verification:

```bash
curl https://services.testnet.commonality.works/platform-api/health
curl https://services.testnet.commonality.works/attesters/health
curl https://services.testnet.commonality.works/workers/health
curl https://services.testnet.commonality.works/indexer/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"{ _meta { status } }"}'
```

## Step 4 — Report back

Report:

- The Cloudflare nameservers assigned and whether the registrar was updated.
- Whether all eight UI CNAME/TXT DNSLink records were created.
- Whether `curl -I https://alignment.testnet.commonality.works` returns an HTTP response instead of DNS/TLS failure.
- Whether all four `services.testnet.commonality.works/...` health checks pass.
- Any Cloudflare dashboard errors or screenshots/messages.

## Optional later work — do not block first testnet on this

- DNSSEC-import `commonality.works` into ENS if we decide we want DNS names to also be ENS names.
- Switch repo deployment config from direct Render fallback URLs to the Cloudflare gateway URLs and republish the UI. This should happen after the gateway is verified.
