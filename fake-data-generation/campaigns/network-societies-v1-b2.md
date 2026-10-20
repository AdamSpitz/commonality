# Network societies batch 2

Campaign id: `network-societies-v1-b2`. Synthetic users and deliverables. This is not evidence of adoption.

Keeps the four pilot families (Owen Sound checkout, Grey County civic life, Christian teaching, home learning). Adds three families:

- Abortion settlement, using the accepted `compromise-abortion` wording unchanged, plus a separate Michigan authority board.
- Schools and pushing, using the accepted `lgbt-schools` wording unchanged, plus a separate Grey County conduct board. The schools statements do not settle drugs, surgery, or classroom names.
- An Owen Sound non-binding voting trial.

The other families in the brainstorming plan are not in this manifest, except an AI-pause board and the Canada–US family past its five-statement draft. The AI-pause board is plain: every sentence stays visible. Five milder modified sentences contain one shared pause-treaty sentence and each keeps a reason the shared sentence leaves out. Naturals do not name the treaty. Hal wants a full stop and rejects the pause. Vic rejects the pause because other labs will not stop. Five modified-to-commonality arrows are allowed. Naturals, poles, and reverse arrows are not.

Canada–US stays a bridge. The shared sentence is still ordinary purchases and family visits, with the administration question left out. The archive, the Owen Sound guide, the evening, the Grey County directory, and the host handoff are separate planks on that same commonality board. Greta wants a boycott and rejects the shared sentence. Neil wants family visits without a general call to keep buying from US businesses, and he rejects the sentence that asks for both. Those two pairs were refused by the attester and are not arrows. Fern signs the five work planks and leaves the shared sentence unsigned. Adele signs the anti-Trump natural and the guide, and has not signed the shared sentence.

## What the plan publishes

A plan written on 2026-10-16 has 72 users, 124 statements, 62 projects, and 523 writes, in `output/campaigns/network-societies-v1-b2-canada-us/`. On 2026-10-20 the source sentences were cut back to signable wants. The current manifest is 89 statements and 64 projects. That is not the mined graph. The Grey County assimilation bridge and the checkout-trial bridge no longer publish implication arrows, because their wording changed after the attester pass. On 2026-10-19 that directory mined 523/523 and reconciled 523/523. Do not regenerate it. The earlier mined run was 60 users, 100 statements, and 52 projects. The AI-pause plan, before the Canada–US planks, was 67 users, 117 statements, and 57 projects. Seed: `commonality-network-societies-v1-b2-2026-10-16`. Regenerate the plan before quoting a write count. The old 356-write figure was for 70 statements and 40 projects.

The abortion cause and the schools cause are bridge-shaped. Each main board lists only the accepted commonality sentence. The natural and modified sentences are on the side boards. The Michigan authority board and the Grey County conduct board are ordinary boards, so their own sentences stay visible there.

Six more causes are also bridge-shaped, from `statement-generation-exercises/06-network-society-alliances.json`: Grey County assimilation sessions, the Owen Sound dual-count poll, the Owen Sound checkout trial, minors' medicine and courtesy, ordinary opinions and employment, and ordinary Canada–US ties.

Twenty-one implication actions are planned. Four are the accepted abortion and schools pairs, labeled `accepted-bridge-role-pair`. Seventeen are modified-to-commonality pairs, labeled `live-attester-modified-to-commonality`: twelve from the draft bridges and five from the AI-pause board. The live record is `network-societies-v1-b2-implication-evaluations.json` (deepseek/deepseek-v3.2, prompt fingerprint `2f61d4d61235214eceee97e9a364da48b8a6833f509089941cb758728302e891`, 82 pairs). The draft bridges blessed every designed-yes and refused every designed-no after one rewrite. Employment modifieds now name a camp priority the commonality does not contain (on-the-clock campaigning; churches and private clubs). The Canada commonality no longer says "I'd be okay with saying that," and each modified keeps a priority the commonality omits. The AI-pause pass matched on the first wording: each modified implies the shared pause sentence, and the naturals, poles, and reverse arrows do not. Naturals, reverse arrows, cross-modified arrows, and the assimilation cluster against the accepted immigration statements stay unpublished. Those refusals are in the decisions file. A later pass refused the Canada–US boycott and the narrower sentence, both ways that were checked, at high confidence on the first wording. No new arrow was added. The five remaining draft clusters, the expanded Canada–US board, and the AI-pause board are still not accepted seed.

`moderator-checklist` is one statement. It is on the Michigan authority board and the Owen Sound voting board. One project, "Moderator checklist card", references it.

The manifest points `beliefDecisions` at that file. Each `signs` entry is one `believe` write and each `rejects` entry is one `disbelieve` write. Those pairs are not drawn again, so Eli never believes the abortion commonality. Unsigned statements stay unpinned.

A recurring monthly pledge stays out of this manifest. Pat already delegates a note to Ned, and the adapter can revoke a delegation. No action in this file spends a delegated note. The one-time spend is on the copy [`network-societies-v1-b2-note-spend.json`](./network-societies-v1-b2-note-spend.json): June deposits a payment-token note, Willa keeps it, and Willa buys one 0.01 receipt. That copy mined 524/524 on 2026-10-20 into `output/campaigns/network-societies-v1-b2-note-spend/`. Do not regenerate that directory. Early funding and later reimbursement are on the copy [`network-societies-v1-b2-reimburse.json`](./network-societies-v1-b2-reimburse.json), not here.

## Reproduce the plan

From `fake-data-generation/`:

```bash
npm run gen:campaign:plan -- campaigns/network-societies-v1-b2.json output/campaigns/network-societies-v1-b2-canada-us
```

Do not write this plan over `output/campaigns/network-societies-v1-b2/`. That directory is the mined run from before the belief pins and the AI-pause arrows. Do not write it over `output/campaigns/network-societies-v1-b2-ai-pause/`. That directory is the plan from before the Canada–US planks. Do not write it over `network-societies-v1-pilot` or `medium-realistic-v2`. Pilot statement texts in `network-societies-v1-b2-statements.json` are a copy so the loader can see them. The accepted bridge sentences are referenced from `seed-content/`, not copied.

## Local execution

A plan written after the attester pass has 446 writes. On 2026-10-16 the local chain mined 446/446 and reconciliation matched 446/446. The first pass left 14 actions failed for insufficient ETH; those wallets were topped up and the run resumed. Output is `output/campaigns/network-societies-v1-b2/`. Pilot and medium-realistic-v2 outputs were not overwritten.

The shortfall was the funder, not the chain. `computeCampaignFundingNeeds` priced a belief write at 90_000 gas and a publish at 180_000. The executor asks viem for `40_000 + 80_000 * n` on `setBeliefsInBatch` (280_000 for three) and leaves `publishDataBatch` to viem, which estimated about 4_000_000 on the large publishes. Funding now uses those figures, with 500_000 extra gas per publish after the first in a batch. A later local run should not need a manual `hardhat_setBalance`.

OpenCode Go DeepSeek ids (`deepseek-v4-flash`, `deepseek-v4.1-flash`, `deepseek-v4-pro`) return HTTP 400 on this workspace until privacy is set to Global. `opencode-go/qwen3.8-flash` returned parseable JSON and matched the v3.2 decision on the short dual-count natural-to-commonality refusal and the long Grey County modified-left-to-commonality bless. Verifier `clear-communication` leaves use that model. Other verifier leaves stay on `xai/grok-4.7`. Production `PRODUCTION_OPENROUTER_MODEL` stays `deepseek/deepseek-v4-flash-0731`.

The Grey County assimilation commonality board is `http://commonality.localhost:8088/#/cause/0xEe6a18208ca061e2Eddd4A6fA7E4E4d4927eF352/network-societies-v1-b2-grey-assimilation-bridge`. Its statement page shows "Arriving through other statements." Direct and indirect counts were 0 on that load because the visible sentence had no signers yet.

A plan built after the belief pins is not the 446-write run. `output/campaigns/network-societies-v1-b2/` keeps that earlier executed run. The belief-pin plan mined on 2026-10-19 into `output/campaigns/network-societies-v1-b2-canada-us/` (test-data run `20261019T194718789Z`). The first pass failed 17 project creates for insufficient ETH; `hardhat_setBalance` topped the 72 campaign wallets up to 1 ETH and a `--skip-provision` resume finished the graph. Checkout board: `http://commonality.localhost:8088/#/cause/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/campaign-network-societies-v1-b2-crypto-merchants`. Abortion commonality: `http://commonality.localhost:8088/#/cause/0xEEdFeD616b245E18E29009556F2a21c18eE7c803/network-societies-v1-b2-abortion-bridge`. Delegated spending and a monthly pledge stay out. The six clusters are not accepted seed. The remaining brainstorm families stay unauthored where they already share a concrete want with a published board.
