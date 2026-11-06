# commonality.works setup

Operator notes for the `commonality.works` zone. The from-scratch move is done. Do not add the zone again, and do not put Cloudflare tokens in `.env.secrets`.

## Current state

- Cloudflare is authoritative. Nameservers: `garret.ns.cloudflare.com`, `gigi.ns.cloudflare.com`.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` live in `~/.secrets/commonality/operator.env` (or `COMMONALITY_OPERATOR_SECRETS_FILE`). That is what `./scripts/setup-testnet-naming.sh --dns` reads. `.env.secrets` is service runtime, not operator DNS.
- Render does not need those two variables to serve traffic.
- The service gateway is deployed. These return 200:
  - `https://services.testnet.commonality.works/attesters/health`
  - `https://services.testnet.commonality.works/workers/health`
  - `https://services.testnet.commonality.works/indexer/graphql`
  - `https://services.testnet.commonality.works/platform-api/health`
- `/cause-assist` is not in the live Worker route table (404). `VITE_CAUSE_ASSIST_URL` still points at the Render host until that route is deployed.
- DNSLink is partial. `./scripts/setup-testnet-naming.sh --dns` is the way to finish it. Do not create those records by hand.

[hostinger-dns-setup.md](hostinger-dns-setup.md) is historical. The zone is not on Hostinger.

## If the zone ever has to be recreated

1. In the Cloudflare dashboard, **Domains → Onboard a domain**, apex `commonality.works` only, Free plan.
2. At the registrar, replace nameservers with the two Cloudflare assigns. Turn DNSSEC off at the registrar first.
3. Put a zone-scoped DNS Edit token and the zone ID in `~/.secrets/commonality/operator.env`, not `.env.secrets`.
4. Deploy `cloudflare-service-gateway/` per its README, then run `./scripts/setup-testnet-naming.sh --dns`.
