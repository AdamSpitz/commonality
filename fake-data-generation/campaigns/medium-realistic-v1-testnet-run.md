# Medium realistic v1 — Base Sepolia stages 10, 25, and 100

Operator notes for the 2026-09-29 remote campaign. Per-stage execution files, wallet secrets, and reconciliation JSON stay gitignored under `output/campaigns/medium-realistic-v1/`. This page records the measurements those files support. The run is synthetic activity on accepted seed statements. It is not a capacity or adoption claim.

Chain 84532. Campaign sends used the public RPC `https://sepolia.base.org`. The hosted indexer stayed on its existing Alchemy URL at `https://commonality-indexer.onrender.com`. `DATABASE_SCHEMA` was not renamed.

## What reconciled

| Stage | Actions | Transactions | Reconciliation | Indexer lag |
| --- | --- | --- | --- | --- |
| 10 | 85 mined | 43 | 85/85 verified at indexer/chain head 47471231 | 0 |
| 25 | 154 mined | 98 | 154/154 verified at indexer/chain head 47471743 | 0 |
| 100 | 1932 mined | 1329 | 1932/1932 verified at indexer head 47485501 (chain head 47485502) | 1 |

Gas and native cost below count each transaction hash once. The execution log copies the full receipt `gasUsed` and `nativeCost` onto every batched action, so a per-action sum overstates the stage.

| Stage | Gas (unique hashes) | Native cost (unique hashes) | Native provisioned into wallets | USDZZZ units transferred |
| --- | --- | --- | --- | --- |
| 10 | 19,655,692 | 0.00010954 ETH | 0.0065512 ETH across 14 wallets | 220,000 (0.22 USDZZZ) |
| 25 | 50,896,786 | 0.00029836 ETH | 0.028481225 ETH across 9 wallets | 520,000 (0.52 USDZZZ) |
| 100 | 217,193,120 | 0.00123235 ETH | deployer balance fell 0.00731448 ETH (quote 0.010790525 ETH; 75 of 100 wallets topped up) | 8,610,000 transferred (8.61 USDZZZ) |

Stage 10 preflight quoted 0.00660745 ETH. Stage 25 preflight quoted 0.0310106625 ETH. Both quotes include the per-active-wallet gas buffer, which is why provisioned ETH is much larger than receipt cost. Stage 10 had retries (attempts up to 6 on a few actions) while the indexer was behind and allowance was short. Stage 25 had 19 actions that needed a second attempt; the mined rows were kept.

## Stage 100

The first read-only preflight on 2026-09-29 quoted **1.706790525 ETH** for 145 delegatable notes. That figure parsed the planner's persona integer (`max(100, fundingWeight * 500) * 1..3`, divided by 100,000) as ETH. `DelegatableNotes` only requires `msg.value > 0` for an ETH note. Provisioning and `depositETH` / full-note delegation now use one shared amount, `CAMPAIGN_NOTE_WEI` = 1 wei. Stages 10 and 25 were already mined and were not replayed.

Re-quote on 2026-09-30 UTC (`stage-100/reports/remote-canary-preflight.md`):

- 100 users, 1932 writes
- gas-price snapshot 6,000,000 wei
- native quoted **0.010790525 ETH**
- payment-token units 8,850,000 (8.85 USDZZZ)
- indexer lag 1
- bytecode gates passed

Deployer `0xFC0054CAA8417b946666a0093521B57efC5e5E4a` held **0.051338 ETH** before the run and **0.044023 ETH** after, a drop of **0.00731448 ETH**. That is under the gross quote because 25 wallets already held enough ETH from earlier stages; 75 were topped up. Token provisioning transferred 8.61 USDZZZ, skipped 3 wallets that already held enough, and left 37 wallets with no payment-token need. Every action mined on the first attempt.

`./scripts/verifier-testnet.sh` passed DNS, HTTP, RPC, indexer (0 blocks behind at that check), contracts, app shell, and policy enforcement. `testnet.app-config` still failed because the official attester has no publications. That gap is a follow-up, not a reason this stage was skipped.

Reconciliation is 1932/1932. The chain head was one block ahead of the indexer at the end of the check (47485502 vs 47485501); every planned action already had its indexed event and its SDK fold matched. The first reconcile attempt opened a full event-history download per action and the indexer connection dropped. The rerun loads each event name once and checks actions a few at a time. Identical implication or alignment writes that share one transaction are paired with one log each, in log order.

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
