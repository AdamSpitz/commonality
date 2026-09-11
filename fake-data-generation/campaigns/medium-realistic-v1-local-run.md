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

## UI inspection (2026-09-11, Vite `:5174` after restart)

CauseStarter has no global cause directory; campaign boards are reachable only by organizer URL:

`/cause/<owner>/<refName>` from `execution/runtime-bindings.json`. Vite uses path routing (`http://localhost:5174/cause/...`). The IPFS bundle still uses hash routing (`http://causestarter.localhost:8088/#/cause/...`).

A Vite process that had been running since 2026-09-05 still served a Base Sepolia `import.meta.env` (`chainId=84532`, `https://commonality-indexer.onrender.com`). Cause pages showed “Failed to fetch” (CORS). `ui/.env` already had `VITE_CHAIN_ID=31337`; restarting `npm run causestarter:dev` picked it up. Event cache with empty `VITE_EVENT_CACHE_URL` uses `window.location.origin` and Vite’s `/api` proxy to `http://localhost:42069`.

Representative pages (no wallet connected):

| Surface | URL | What showed |
|---|---|---|
| Schools cause board | `/cause/0x29Aad1ae4EC538790a3231c62d84d6840685D613/campaign-medium-realistic-v1-schools-common-ground` | SYNTHETIC TESTNET CAMPAIGN label; 5 statements with mixed 0–8 support; 4 funding projects; raised **3.09 / 8** USDZZZ; organizer checksum |
| Open-source cause board | `/cause/0x29Aad1ae4EC538790a3231c62d84d6840685D613/campaign-medium-realistic-v1-open-source` | Uneven vs schools: 21 signed at least one, 2 signed all; 1 project **0.47 / 2** USDZZZ |
| Bridge statement | `/statement/bafkreihzjxdzmdf7jeaqwkfz5c6agjaqimsd7h6ozrlsux6eilazdpklzu?mode=sign` | Full accepted text; **8 · 4 direct · 7 indirect** |
| Funded project | `/projects/eip155%3A31337%3A0x9bd03768a7dcc129555de410ff8e85528a4f88b5` | **1.15 / 2** USDZZZ, 29d left, contributor table, two statement vouches, giving options 0.1 / 0.05 / 0.01 |
| Delegated funds | `/delegation/notes` | Connect-wallet empty state (expected without a campaign wallet in the browser) |

Product / ops observations (not indexer omissions):

- Boards are labelled synthetic; titles are slug-like (`schools-common-ground`) and project cards repeat long statement text.
- `VITE_DEFAULT_ALIGNMENT_TRUST_ROOT` is empty in the local generated profile, so the cause page warns that the starter vouching network is unavailable. Projects still listed (direct vouches on the cards).
- Coherence badge stayed “not confirmed”.
- Cause-assist on `:3002` was down; Vite logged `/health` 500s. Did not block reads.
- Notes/delegations are not inspectable without connecting a campaign wallet.

## Still optional after item 7

- Make `fund-project` writes use planned persona amounts (would require a wipe/re-execute so totals stay reconcilable).
- Connect a campaign wallet to walk a note/delegate path in the UI.
