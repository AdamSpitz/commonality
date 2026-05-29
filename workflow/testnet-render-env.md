# Testnet Render environment values

Copy these non-secret values into Render `sync: false` fields when the dashboard asks for them. Secrets/private keys still come from `.env.secrets` and `deployments/wallets.env`.

## Platform API (`commonality-platform-api`)

```env
CORS_ALLOWED_ORIGINS=https://commonality.testnet.commonality.works,https://lazygiving.testnet.commonality.works,https://alignment.testnet.commonality.works,https://tally.testnet.commonality.works,https://content-funding.testnet.commonality.works,https://civility.testnet.commonality.works,https://common-sense-majority.testnet.commonality.works,https://conceptspace.testnet.commonality.works,https://commonality.testnet.commonality.eth.limo,https://lazygiving.testnet.commonality.eth.limo,https://alignment.testnet.commonality.eth.limo,https://tally.testnet.commonality.eth.limo,https://content-funding.testnet.commonality.eth.limo,https://civility.testnet.commonality.eth.limo,https://common-sense-majority.testnet.commonality.eth.limo,https://conceptspace.testnet.commonality.eth.limo
CLAIM_PAGE_BASE_URL=https://content-funding.testnet.commonality.works/#/claim
```

`CORS_ALLOWED_ORIGINS` must be either `*` or explicit bare origins. The current platform API parser does not support `https://*.testnet.commonality.works`.

## Worker service (`commonality-service-host-workers`)

These are already set as non-secret defaults in `render.yaml`, but keep them here for verification:

```env
INDEXER_URL=https://indexer.testnet.commonality.works
EVENT_CACHE_URL=https://indexer.testnet.commonality.works
PLATFORM_API_URL=https://platform-api.testnet.commonality.works
CONTENT_FINDER_PLATFORM_API_URL=https://platform-api.testnet.commonality.works
CONTENT_FINDER_SUBMISSIONS_API_URL=https://platform-api.testnet.commonality.works/content-submission
CONTENT_FINDER_ATTESTER_URL=https://attesters.testnet.commonality.works/content-attester
IMPLICATION_FINDER_ATTESTER_URL=https://attesters.testnet.commonality.works/implication-attester
```

## UI build / local deployment env

These have been written to `.env.secrets` for `scripts/setup-env.sh` and `scripts/deploy-testnet.sh`:

```env
EVENT_CACHE_URL=https://indexer.testnet.commonality.works
PLATFORM_API_URL=https://platform-api.testnet.commonality.works
CORS_ALLOWED_ORIGINS=https://commonality.testnet.commonality.works,https://lazygiving.testnet.commonality.works,https://alignment.testnet.commonality.works,https://tally.testnet.commonality.works,https://content-funding.testnet.commonality.works,https://civility.testnet.commonality.works,https://common-sense-majority.testnet.commonality.works,https://conceptspace.testnet.commonality.works,https://commonality.testnet.commonality.eth.limo,https://lazygiving.testnet.commonality.eth.limo,https://alignment.testnet.commonality.eth.limo,https://tally.testnet.commonality.eth.limo,https://content-funding.testnet.commonality.eth.limo,https://civility.testnet.commonality.eth.limo,https://common-sense-majority.testnet.commonality.eth.limo,https://conceptspace.testnet.commonality.eth.limo
CLAIM_PAGE_BASE_URL=https://content-funding.testnet.commonality.works/#/claim
```
