# Handoff: testnet indexer catch-up (10k logs + Alchemy budget)

**For a fresh LLM:** read [workflow/testnet-working-plan.md](../workflow/testnet-working-plan.md) (item 2), then do the unstick plan below. Do not start items 3–8, mainnet, or mass fake activity. Do not bump `START_BLOCK` / schema without Ask. Do not point RPC at `https://sepolia.base.org`.

**Next session goal:** finish the 10k `eth_getLogs` deploy, let Adam add a little Alchemy spend cap, get `_meta` near head so `testnet.indexer` passes.

## Suggested skills

None required. Ops only: Render API + `./scripts/verifier-testnet.sh`. If you write a long-running watch, read the long-running-background-tasks skill first.

## Where things are

| Thing | Value |
|---|---|
| Branch | `misc` (pushed). Render **autoDeploy tracks `master`**; indexer was deployed by API `commitId`, not a master merge |
| Commits | `7afa8c1d` RPC as URL string (rate limiter). `53417ecc` range **10000** + fetch-wrap hint |
| Indexer | `commonality-indexer` `srv-d8ctfd6k1jcs73a71d2g`, owner `tea-d8croucp3tds73el9abg` |
| 10k deploy | `dep-dae448m7bikc7380vo6g` was **build_in_progress** when this was written. Confirm it is **live** and commit is `53417ecc` |
| Live before that | `dep-dae3bsv40ujc73dktq6g` on `7afa8c1d` still at **range 10** — that process burned the CU cap |
| GraphQL | `https://commonality-indexer.onrender.com/graphql` **200**, `_meta` **46349669**, progress **79.7%** |
| Render env | `PONDER_ETH_GET_LOGS_BLOCK_RANGE` PUT to **10000** (needs a **deploy**, not restart). RPC is Alchemy `BASE_SEPOLIA_RPC_URL` (`sync: false`) |
| Secrets | gitignored `.env.render` (`RENDER_API_KEY`). Never print it. Docs: [workflow/deployment.md](../workflow/deployment.md) |

Ad-hoc scripts (do not commit): `tmp/render-indexer-*.sh`, `tmp/watch-indexer-*.sh`, `tmp/render-indexer-set-range-and-deploy.sh`.

## What went wrong (do not re-diagnose unless facts change)

1. **502 crash loop** — public `sepolia.base.org` prune vs `START_BLOCK=42768673`. **Fixed.** Ignore unless logs say `sepolia.base.org` / `pruned history` again.
2. **Not user traffic.** Historical backfill ~3.66M blocks, ~24 Ponder contracts, `eth_getLogs` split per address/topic.
3. Alchemy is already **PAYG** (10k CU/s). Peak ~11.6k CU/s. Account **usage limit $20 = 44,444,444 CU**. Dashboard hit **44.50M / 44.44M** while the **range-10** process was still live. Retries **cost CU**. That is a **spend fuse**, not “need a new plan.”
4. This key **already accepts 10k-block** `eth_getLogs` (probed). Range 10 was leftover caution and is what made catch-up millions of calls.
5. viem `http()` transport = Ponder `custom_transport` + bad 429 handling. Keep **RPC as a URL string**.

## Unstick plan (do this)

1. **Confirm 10k deploy is live** — service deploy `53417ecc`, env range **10000**. If still building, wait. If it landed on the old commit, POST deploy with `commitId=53417ecc` (see `tmp/render-indexer-deploy-commit.sh`).
2. **Adam adds money on Alchemy** — raise the **monthly usage limit** a little (another ~$5–10 is the intended amount, not a plan upgrade). Do **not** do this while a range-10 process is the live indexer (that just funds retries). After 10k is live, the cap being blown **will** block RPC until the limit is raised or the billing period resets.
3. **Watch `_meta`**, not HTTP 200. Success: lag ≤ 300 on `./scripts/verifier-testnet.sh` (`testnet.indexer` pass). Then check off item 2 and continue item 3 in the working plan.
4. **If range 10k is too wide:** logs contain one-shot `[commonality-indexer] eth_getLogs failed because the RPC rejected the block range or response size` ([indexer/src/rpc/ethGetLogsRangeGuard.ts](../indexer/src/rpc/ethGetLogsRangeGuard.ts)). Then PUT range **1000**, deploy, not 10 unless 1000 also fails.

CUPS 429s after 10k+budget: wait/retry; do not go back to public RPC.

## Out of scope this handoff

CauseStarter hostname (item 5, Ask). Mutation canary (item 6, needs funded verifier key). Raising `START_BLOCK`. Rewriting Ponder.
