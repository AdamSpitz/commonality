# Medium realistic v1 — local 100-user run notes

Operator notes from the first full local execute/reconcile (2026-09-11). Artifacts under `output/campaigns/medium-realistic-v1/` are gitignored.

## Execution

- Command: `npm run gen:campaign:execute -- --mode local --concurrency 4 --skip-provision` from `fake-data-generation/` (wallets already funded).
- Resume: previous state had 3 mined / 1929 planned; runner finished the rest.
- Result: **1932 mined, 0 failed**, wall clock **~196s** at concurrency 4, pacing 0.
- Chain / indexer after settle: head **3044**, lag **0**.
- Gas used (sum of receipts): **252,914,126**. Native cost at recorded gas price: **~0.253 ETH**.
- Funding: local Hardhat keys for the first slots plus generated wallets; payment-token buys used **0.01** of the 6-decimal token per `fund-project` write (885 buys), not the planner’s persona-sized integer amounts.

## Reconciliation

First pass reported `derived-mismatch` for every `fund-project` and note action (777/1932 verified). Causes:

1. SDK funding checks summed planner `amount` values; the adapter always buys `CAMPAIGN_FUND_PROJECT_TOKEN` (`0.01`). Checks now use that cost times write count.
2. Note folds key notes as `<contract.toLowerCase()>:<id>`; lookups used the checksummed address and missed.

After those harness fixes, `npm run gen:campaign:reconcile` reported **1932/1932 verified**, no missing/duplicate indexed events.

## UI inspection

CauseStarter has no global cause directory; campaign boards are reachable only by organizer URL:

`/cause/<owner>/<refName>` from `execution/runtime-bindings.json` (example: schools-common-ground owner `0x29Aad1ae4EC538790a3231c62d84d6840685D613`, ref `campaign-medium-realistic-v1-schools-common-ground`).

On this machine the Vite app (`:5174`) and the published IPFS bundle (`http://causestarter.localhost:8088/#/`) both requested `chainId=84532` at `https://commonality-indexer.onrender.com`. Cause pages showed “Failed to fetch” (CORS). That is the root `.env` / `causestarter/.env` pointing at Base Sepolia, not a campaign indexing omission. Re-inspect after pointing the UI at chain 31337 and `http://localhost:42069`.

## Still open for plan item 7

- Browser pass against a local-chain UI (cause board, a funded project, a statement, a note/delegate path).
- Optional: make `fund-project` writes use planned persona amounts (would require a wipe/re-execute so totals stay reconcilable).
