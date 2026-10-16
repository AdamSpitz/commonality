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
| Beliefs chosen by the persona decision file | Not wired. `network-societies-v1-pilot-decisions.json` is authoring intent. The planner still draws `set-belief`. |
| One shared project contract on several boards | The class-host directory is one statement, published once, and one project. Civic life and home learning boards include that statement. Whether each board page shows the project depends on the product and has not been walked in a browser. |
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

Imani's rejection of the recruiting pause, and Owen's refusal of the midweek notes, are written in the decisions file. They are not yet enforced in `set-belief`.

Pat (`user-021`) delegates notes to Ned (`user-011`). Some delegations are later revoked. The plan does not show Ned spending Pat's note.

No modified-statement bridge is published. A candidate negative pair is in the decisions file and is unevaluated.

## Next unfinished task

Evaluate the candidate pairs with the real implication-attester prompt, or keep them unpublished, then execute this plan on a local chain and walk the boards. Do not add the other eleven families before that.
