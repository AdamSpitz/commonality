# Medium realistic v1 — Base Sepolia stages 10 and 25

Operator notes for the 2026-09-29 remote campaign. Per-stage execution files, wallet secrets, and reconciliation JSON stay gitignored under `output/campaigns/medium-realistic-v1/`. This page records the measurements those files support. The run is synthetic activity on accepted seed statements. It is not a capacity or adoption claim.

Chain 84532. Campaign sends used the public RPC `https://sepolia.base.org`. The hosted indexer stayed on its existing Alchemy URL at `https://commonality-indexer.onrender.com`. `DATABASE_SCHEMA` was not renamed.

## What reconciled

| Stage | Actions | Transactions | Reconciliation | Indexer lag |
| --- | --- | --- | --- | --- |
| 10 | 85 mined | 43 | 85/85 verified at indexer/chain head 47471231 | 0 |
| 25 | 154 mined | 98 | 154/154 verified at indexer/chain head 47471743 | 0 |
| 100 | not started | — | — | preflight lag 0 |

Gas and native cost below count each transaction hash once. The execution log copies the full receipt `gasUsed` and `nativeCost` onto every batched action, so a per-action sum overstates the stage.

| Stage | Gas (unique hashes) | Native cost (unique hashes) | Native provisioned into wallets | USDZZZ units transferred |
| --- | --- | --- | --- | --- |
| 10 | 19,655,692 | 0.00010954 ETH | 0.0065512 ETH across 14 wallets | 220,000 (0.22 USDZZZ) |
| 25 | 50,896,786 | 0.00029836 ETH | 0.028481225 ETH across 9 wallets | 520,000 (0.52 USDZZZ) |

Stage 10 preflight quoted 0.00660745 ETH. Stage 25 preflight quoted 0.0310106625 ETH. Both quotes include the per-active-wallet gas buffer, which is why provisioned ETH is much larger than receipt cost. Stage 10 had retries (attempts up to 6 on a few actions) while the indexer was behind and allowance was short. Stage 25 had 19 actions that needed a second attempt; the mined rows were kept.

## Stage 100 stopped before any send

Read-only preflight (`stage-100/reports/remote-canary-preflight.md`) on 2026-09-29:

- 100 users, 1932 writes
- gas-price snapshot 6,000,000 wei
- native quoted **1.706790525 ETH**
- payment-token units 8,850,000 (8.85 USDZZZ)
- indexer lag 0
- bytecode gates passed

Deployer `0xFC0054CAA8417b946666a0093521B57efC5e5E4a` held **0.051338 ETH** on the public RPC at that check. The quote is mostly delegatable-note principal (`deposit-note` amounts converted to ETH), not the gas buffer. The runner refuses when the funder cannot cover provisioning, so the 100-user stage was not started and nothing was reset. `./scripts/verifier-testnet.sh` passed DNS, HTTP, RPC, indexer (2 blocks behind), and contracts. `testnet.app-config` failed on the then-live UI bundle missing `PublishedData` `0xC4074f563DA9E2b9751629e9A3213eB02099513e`, and on the official attester still having no publications. The attester gap is a follow-up, not a reason this stage was skipped.

## Provider and approval notes

The public RPC rejects `wallet_sendCalls`. Funding uses an ordinary ERC20 `approve` plus three confirmations, with an allowance large enough for repeated 0.01 USDZZZ purchases. Those approval transactions are not rows in `actions.jsonl`, so their gas is not in the table above. Stage 25 needed a few approval retries before the fund transactions mined. Do not replay a mined action; reset only a failed row after diagnosing it.

An earlier Alchemy send hit `replacement transaction underpriced` on the deployer nonce. Campaign sends stayed on the public RPC after that. The hosted indexer was not pointed at the public RPC. It recovered on its own and advanced past the campaign blocks without an env or schema change.

## Product findings

Checked on a local Commonality app pointed at this deployment and the live indexer, before the public bundle was republished:

- A funded project showed **0.06 USDZZZ** raised, a contributor table, and a statement funding board.
- A project-vouch link went to `/portal/:cid`. The branch now routes that link to `/statement/:cid`.
- Project title and description repeat a very long statement.
- The statement page reported that the noninflammatory meta-statement is unconfigured.
- Official-attester implications are still absent. That slice is not part of this campaign.

## Public UI republish

`DOMAINS=commonality ./scripts/deploy-testnet.sh` pinned Commonality to `QmYr3CkCFqnPd1AJ71cs6fJf3YzRQyRGkZnFUyDPCmXczN` and published IPNS sequence 15 for `k51qzi5uqu5dj1p5np3vfbukxamutsoz9kwjrbci61044cturb8gvpcdkfltrn`. w3name resolves that name to the new CID. The deploy script restored the localhost env profile afterward (`CHAIN_ID=31337`, empty `VITE_EVENT_CACHE_URL` in `ui/.env`).

A fresh browser load of `https://testnet.commonality.works` served entry script `assets/index-D3p1LkpC.js`. Project `0x847B3d4e…` showed metadata (the long statement as the title), **0.06 of 2 USDZZZ** raised, and the contributor row. Its vouch link opened `#/statement/bafybeidp4jh…`, which still says the noninflammatory meta-statement is not configured. The schools cause board showed the synthetic-campaign label, supporter counts, and a funding board. A cached tab kept the previous entry script `index-XB5BL6P3.js`, where the same vouch opened `#/portal/…` and landed on “Page not found,” and project metadata failed to load.
