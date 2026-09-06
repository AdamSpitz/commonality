# Handoff: testnet indexer catch-up (10k logs + Alchemy budget) — DONE

Item 2 of [workflow/testnet-working-plan.md](../workflow/testnet-working-plan.md) is done. Next session: **item 3** (full read-only `./scripts/verifier-testnet.sh`). Do not bump `START_BLOCK` / schema without Ask. Do not point RPC at `https://sepolia.base.org`.

## Outcome (2026-09-05 ~16:42 UTC)

- Adam raised Alchemy monthly usage limit to **$30**.
- Indexer resumed; accidental `master` resume deploy canceled; live API deploy **`dep-dae48qgou94c73976610`** commit **`53417ecc`**, env range **10000**.
- `_meta` jumped 46349669 → **46429137**; Alchemy head same; lag **0**.
- `npx verifier-run testnet.indexer` **pass**.

## Pointers

- Service `srv-d8ctfd6k1jcs73a71d2g`. Render key: gitignored `.env.render`.
- If GraphQL 502s again with `sepolia.base.org` / pruned history, that is the old public-RPC bug, not this catch-up.
- If logs show `[commonality-indexer] eth_getLogs failed because the RPC rejected the block range`, drop range to 1000 then 10.
