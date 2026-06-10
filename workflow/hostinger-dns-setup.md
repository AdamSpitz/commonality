# Hostinger DNS setup (transitional)

Use this only if `commonality.works` has not yet been moved to Cloudflare DNS. The preferred long-term setup is [commonality-works-setup.md](commonality-works-setup.md), because Cloudflare can host both the Worker gateway and the DNSLink records used by deployment automation.

## Goal

Create the public testnet DNS records needed by the deployed services and IPFS-hosted UI while the zone is still managed in Hostinger.

## Required human/operator access

- Hostinger DNS management access for `commonality.works`
- The target hostname(s) produced by the Cloudflare Worker gateway and UI/IPFS deployment scripts
- Any DNSLink TXT values emitted by `scripts/deploy-testnet.sh` / `scripts/deploy-ui.sh`

## Steps

1. Open Hostinger's DNS zone editor for `commonality.works`.
2. For the service gateway hostname, create the CNAME or other record specified by the Cloudflare Worker gateway deployment output. The intended public hostname is:
   - `services.testnet.commonality.works`
3. For each UI hostname emitted by the deployment script, create/update the DNSLink TXT record exactly as printed by the script. DNSLink records are usually TXT records of the form:
   ```text
   dnslink=/ipfs/<cid>
   ```
4. Keep TTLs low during testnet iteration if Hostinger allows it.
5. Verify externally after propagation:
   ```bash
   dig services.testnet.commonality.works
   curl https://services.testnet.commonality.works/attesters/health
   ```
6. Record any manually-created hostnames and TXT values in the deployment notes so the next deployment can compare them against script output.

## Caveats

- Hostinger-managed DNS is a stopgap. Cloudflare Worker routing and automated DNSLink updates are easier when Cloudflare is authoritative for the whole zone.
- Do not commit DNS tokens or dashboard credentials. Put automation credentials only in `.env.secrets`.
