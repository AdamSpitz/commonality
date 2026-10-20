# Network societies pilot

Campaign id: `network-societies-v1-pilot`. Synthetic users, shops, churches, and deliverables. This is not evidence of adoption.

Families in this pilot: Owen Sound checkout trial, Grey County civic life, Grey County Christian teaching, Grey County home learning. The other eleven families in the brainstorming plan are not in this manifest.

## Capability table

| Need | Status |
| --- | --- |
| Campaign manifest, planner, local executor, reconciler, run viewer | Reused |
| Cause count below 8, statement count outside 30–70, same statement on more than one board | Supported by optional `scale` on the manifest. Omitted scale keeps the old caps. |
| Curated projects without a new TypeScript story module | Supported by `projectStories`, a JSON file beside the manifest |
| Accepted-bridge implication evidence | Still the only evidence the planner will publish. Heuristic `implies: true` is not accepted. |
| Fresh attester evaluation for new campaign pairs | Not run. The pilot stores candidates and publishes zero implication edges. |
| Beliefs chosen by the persona decision file | Wired. Each `signs` entry is one `believe` and each `rejects` entry is one `disbelieve`. Unsigned stays unpinned. The mined 2026-10-16 run is the plan from before these pins. Do not regenerate into `output/campaigns/network-societies-v1-pilot/`. |
| One shared project contract on several boards | The class-host directory is one statement, published once, and one project (`project-015`). Civic life, Christian teaching, and home learning all list it under Fundable Projects once the alignment-trust bootstrap has admitted the campaign attesters. The project page renders: title, fake-data outcome, founder Nadia, and "0 of 2 USDZZZ raised." |
| Early funding then retroactive reimbursement | Supported for v2's accepted abortion bridge. Not planned in this pilot. |
| Delegated spending of a note | Deposit, delegate, and revoke exist. Spending through the delegation does not. Pat's note to Ned is a delegation, not a spent note. |
| Recurring "$20/month" pledge | Not a campaign action. Do not describe a one-time deposit as that pledge. |
| "Delivered but not reimbursed" filter | Not demonstrated. Crossing a funding threshold is not evidence the fictional work was delivered. |

## Reproduce the plan

From `fake-data-generation/`:

```bash
npm run gen:campaign:plan -- campaigns/network-societies-v1-pilot.json output/campaigns/network-societies-v1-pilot
```

Seed: `commonality-network-societies-v1-pilot-2026-10-16`. A plan written on 2026-10-16 has 40 users, 40 statements, 20 projects, and 207 writes. Output stays under `output/`, which is gitignored. Do not write this plan over `medium-realistic-v2`.

## Journeys this plan can and cannot show

Ruth and Len can both be on the checkout board while the dissent plank "shops refuse crypto" is a separate statement. That overlap does not use an implication arrow.

Imani's rejection of the recruiting pause, and Owen's refusal of the shared teaching-notes sentence, are pinned `set-belief` actions. Owen leaves `staffed-schools` unsigned, so that file does not disbelieve it.

Pat (`user-021`) delegates notes to Ned (`user-011`). Some delegations are later revoked. The plan does not show Ned spending Pat's note.

No modified-statement bridge is published. A candidate negative pair is in the decisions file and is unevaluated.

## Local run (2026-10-16)

Clean localhost chain after `./scripts/data.sh --wipe` and `./scripts/services.sh --start`. Plan: 40 users, 40 statements, 20 projects, 207 writes. Execute mined 206, then one `fund-project` (`action-00157`, `user-031`, `0x7efF913d73fEc32ef2765A28824412617bBE1baC`) failed with insufficient ETH for gas. After a 1 ETH top-up from Hardhat account #0 and resetting that action to `planned`, the resume mined 207/207. Reconciliation: 207/207, chain and indexer both at block 295, lag 0.

Boards:

- Civic life: `http://commonality.localhost:8088/#/cause/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC/campaign-network-societies-v1-pilot-civic-assimilation`
- Christian teaching: `http://commonality.localhost:8088/#/cause/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/campaign-network-societies-v1-pilot-christian-teaching`
- Home learning: `http://commonality.localhost:8088/#/cause/0x90F79bf6EB2c4f870365E785982E1f101E93b906/campaign-network-societies-v1-pilot-home-learning`
- Class-host directory project: `http://commonality.localhost:8088/#/projects/0x8744b336FC44395Da72850AD9f6220CF6Ea34962`

Test-data run `20261016T181546620Z`. Admin: `http://commonality.localhost:8088/#/admin/test-data?key=` plus the key in `output/test-data/.admin-capability`.

## Next unfinished task

Do not add further families to this pilot manifest. Batch 2 is a separate campaign: [`network-societies-v1-b2.md`](./network-societies-v1-b2.md). Implication candidates in this pilot's decisions file stay unpublished.

A wiped local chain leaves the generated alignment-trust bootstrap key with no ETH. Until `scripts/fund-local-service-wallets.mjs` tops it up, that worker crash-loops, the starter trust set stays empty, and cause pages hide every campaign vouch. The funder script now includes `ALIGNMENT_TRUST_BOOTSTRAP_PRIVATE_KEY`. On 2026-10-16 the wallet was topped up by hand, the worker admitted 8 attesters, and the directory project showed on the Christian teaching, civic life, and home learning boards.
