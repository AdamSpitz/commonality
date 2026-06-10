# commonality.works setup

This is the operator runbook for making `commonality.works` usable by the Commonality testnet deployment.

## Goal

Cloudflare should be able to serve the public testnet routes for this zone:

- `services.testnet.commonality.works` — Cloudflare Worker gateway to Render services
- UI hostnames under `testnet.commonality.works` — DNSLink/IPFS records written by the deployment scripts

## Required human/operator access

- Access to the DNS registrar or current DNS host for `commonality.works`
- Access to the Cloudflare account that should own/serve the zone
- Permission to create or change DNS records for the zone

## Preferred setup: move DNS to Cloudflare

1. Add `commonality.works` as a zone in Cloudflare.
2. In the domain registrar, replace the domain's nameservers with the two nameservers Cloudflare assigns for the zone.
3. Wait for Cloudflare to mark the zone active.
4. Create or confirm the Cloudflare API credentials used by deployment automation:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ZONE_ID`
5. Put those values in `.env.secrets` on the deployment machine.
6. Deploy the service gateway from `cloudflare-service-gateway/` according to its README/config, then verify:
   ```bash
   curl https://services.testnet.commonality.works/attesters/health
   curl https://services.testnet.commonality.works/workers/health
   curl https://services.testnet.commonality.works/indexer/graphql
   ```
7. Run the UI/IPFS deployment flow in `workflow/deployment.md`; it should create/update the DNSLink records using the Cloudflare credentials.

## If DNS is not yet on Cloudflare

Use the transitional instructions in [hostinger-dns-setup.md](hostinger-dns-setup.md) if the zone is still managed at Hostinger. Prefer migrating to Cloudflare before public launch so Worker routes and DNSLink automation have one source of truth.

## What to report back

Tell the deployment LLM/operator:

- whether Cloudflare is authoritative for `commonality.works`;
- whether `CLOUDFLARE_ZONE_ID` and an appropriately scoped API token are available in `.env.secrets`;
- whether `services.testnet.commonality.works` resolves and reaches the gateway;
- whether any DNSLink records had to be created manually.
