# Testnet Render environment values

Copy these non-secret values into Render `sync: false` fields when the dashboard asks for them. Secrets/private keys still come from `.env.secrets` and `deployments/wallets.env`.

## Platform API (`commonality-platform-api`)

```env
CORS_ALLOWED_ORIGINS=https://commonality.testnet.commonality.works,https://lazygiving.testnet.commonality.works,https://alignment.testnet.commonality.works,https://tally.testnet.commonality.works,https://content-funding.testnet.commonality.works,https://civility.testnet.commonality.works,https://common-sense-majority.testnet.commonality.works,https://conceptspace.testnet.commonality.works,https://commonality.testnet.commonality.eth.limo,https://lazygiving.testnet.commonality.eth.limo,https://alignment.testnet.commonality.eth.limo,https://tally.testnet.commonality.eth.limo,https://content-funding.testnet.commonality.eth.limo,https://civility.testnet.commonality.eth.limo,https://common-sense-majority.testnet.commonality.eth.limo,https://conceptspace.testnet.commonality.eth.limo
CLAIM_PAGE_BASE_URL=https://content-funding.testnet.commonality.works/#/claim
```

`CORS_ALLOWED_ORIGINS` must be either `*` or explicit bare origins. The current platform API parser does not support `https://*.testnet.commonality.works`.

The nested `*.testnet.commonality.eth.limo` origins are retained here as harmless allowlist entries only. As of 2026-06-01 they are not operational browser URLs because eth.limo fails TLS handshakes for our nested testnet ENS names even with valid resolver/contenthash records; see `workflow/deployment.md` before spending mainnet gas re-testing this.

## Attester service (`commonality-service-host-attesters`)

Generate most copy-paste values with:

```bash
./scripts/setup-testnet-ai-policy.mjs --alignment-topic-statement-cid=<CID>
```

Then copy these from `.env.secrets` / `deployments/wallets.env` into Render sync:false fields:

```env
ALIGNMENT_TOPIC_STATEMENT_CID=...
CONTENT_ATTESTER_NAME=noninflammatory-neutral
CONTENT_ATTESTER_PROMPT_TEMPLATE=...
BEAT_AGENT_PRIVATE_KEY=...
BEAT_AGENT_PAYMENT_ADDRESS=...
BEAT_AGENT_TRUSTED_FINDER_KEY=...
BEAT_AGENT_BEAT_DEFINITION_JSON=...
BEAT_AGENT_PROMPT_TEMPLATE=...
X_API_BEARER_TOKEN=...
```

The remaining beat-agent US-politics rehearsal defaults are in `render.yaml`.

## Worker service (`commonality-service-host-workers`)

These are already set as non-secret defaults in `render.yaml`, but keep them here for verification:

```env
INDEXER_URL=https://commonality-indexer.onrender.com
EVENT_CACHE_URL=https://commonality-indexer.onrender.com
PLATFORM_API_URL=https://commonality-platform-api.onrender.com
CONTENT_FINDER_PLATFORM_API_URL=https://commonality-platform-api.onrender.com
CONTENT_FINDER_SUBMISSIONS_API_URL=https://commonality-platform-api.onrender.com/content-submission
CONTENT_FINDER_ATTESTER_URL=https://commonality-service-host-attesters.onrender.com/content-attester
IMPLICATION_FINDER_ATTESTER_URL=https://commonality-service-host-attesters.onrender.com/implication-attester
```

## UI build / local deployment env

These have been written to `.env.secrets` for `scripts/setup-env.sh` and `scripts/deploy-testnet.sh`:

```env
EVENT_CACHE_URL=https://commonality-indexer.onrender.com
PLATFORM_API_URL=https://commonality-platform-api.onrender.com
CORS_ALLOWED_ORIGINS=https://commonality.testnet.commonality.works,https://lazygiving.testnet.commonality.works,https://alignment.testnet.commonality.works,https://tally.testnet.commonality.works,https://content-funding.testnet.commonality.works,https://civility.testnet.commonality.works,https://common-sense-majority.testnet.commonality.works,https://conceptspace.testnet.commonality.works,https://commonality.testnet.commonality.eth.limo,https://lazygiving.testnet.commonality.eth.limo,https://alignment.testnet.commonality.eth.limo,https://tally.testnet.commonality.eth.limo,https://content-funding.testnet.commonality.eth.limo,https://civility.testnet.commonality.eth.limo,https://common-sense-majority.testnet.commonality.eth.limo,https://conceptspace.testnet.commonality.eth.limo
CLAIM_PAGE_BASE_URL=https://content-funding.testnet.commonality.works/#/claim
```
