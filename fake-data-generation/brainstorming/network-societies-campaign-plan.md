# Network societies fake-data campaign

## Adam's description of what we're doing here (don't edit this)

The rest of this file was AI-generated (with my input, but I still don't feel like I trust it), so I want to try to describe what I'm after, and then you can amend the plan and the content to make sure we're doing what I want.

In fake-data-generation/brainstorming/README.md I wrote a list of some ideas for "network societies" that I personally would be interested in supporting. (Some are more compelling than others; we've done some and decided to defer some.) I want us to flesh them out into fake-data campaigns (with statements, bridges from multiple plausible constituencies who all might agree, fake users who fall into various constituencies or don't agree at all, and fake usage data from those fake users).

The hope is that this becomes useful for demoing the system, in a couple of ways.
  - I show it to people who share some of my opinions and they find some of the examples compelling in the sense of "yeah, I can see how that *kind* of project is something that we have trouble funding in other ways. (The fact that they share my political opinions isn't important - the point isn't exactly "do exactly these things that align with my political beliefs" - but if the example causes aren't things they'd consider good, they'll be turned off.)
  - It demonstrates the various roles, too: different people participate in different ways, and each is simple and the UI has a streamlined way to participate in just that role.

So I'm imagining that for the fake-data campaign we're working on, there'll be an admin page where I can choose to log in as a particular fake user; that way I can have specific fake users with particular interests/roles (including some that would be similar to various friends of mine), and so I can demo the system through their eyes.

Basically I just want to show this to my friends and have them understand it. :P





## Current high-level status

Partial local campaign, updated 2026-10-19. The nine families that already have campaign content are enough for now. Six named families still have no fake content, and we are not authoring them yet. This document does not generate data or authorize a remote deployment. The live ids are `network-societies-v1-pilot` and `network-societies-v1-b2`, not one `network-societies-v1` manifest.

## Where the work stands

Two local campaigns exist. Neither is the finished fifteen-family world, and neither has been published to testnet.

**Pilot** ([`network-societies-v1-pilot.md`](../campaigns/network-societies-v1-pilot.md)). Four families: Owen Sound checkout, Grey County civic life, Christian teaching, home learning. About 40 users, 40 statements, 20 projects. A local run on 2026-10-16 mined and reconciled 207/207. No implication edges. The class-host directory is one statement on two boards. Pat delegates a note to Ned; the adapter can revoke a delegation. Persona belief choices in the pilot decisions file are pinned the same way as batch 2. The mined pilot output is the plan from before those pins. Do not regenerate into `output/campaigns/network-societies-v1-pilot/`.

**Batch 2** ([`network-societies-v1-b2.md`](../campaigns/network-societies-v1-b2.md)). Keeps those four families and adds the accepted abortion settlement, the accepted schools-and-pushing bridge, an Owen Sound voting trial, six draft bridges (assimilation sessions, dual-count poll, checkout trial, minors' medicine, ordinary opinions and employment, Canada–US ties), and a plain AI-pause board. Canada–US is past the five-statement draft: five work planks, a boycott, and a narrower-ties sentence sit on the commonality board. The current manifest is 72 users, 124 statements, and 62 projects. Twenty-one modified-to-commonality arrows are allowed: four accepted bridge pairs and seventeen live attester blesses, including five AI-pause modifieds. The Canada–US boycott and narrower sentence were refused and stay unpublished. Designed-negative pairs stay unpublished. The other five draft clusters and the AI-pause board are not accepted seed. Canada–US is not accepted seed either. A local run on 2026-10-16 mined and reconciled 446/446 into `output/campaigns/network-societies-v1-b2/`. That output is the plan from before the belief pins and before the AI-pause arrows. Do not regenerate into it. Do not regenerate into `output/campaigns/network-societies-v1-b2-ai-pause/`. The current plan lives in `output/campaigns/network-societies-v1-b2-canada-us/` and was mined locally on 2026-10-19.

The planner now pins batch-2 `signs` and `rejects` from the decisions file. Eli's only planned belief on the abortion commonality is `disbelieve`. Unsigned is still not a rejection.

**Local run, 2026-10-19.** `campaigns/network-societies-v1-b2.json` was identical to `output/campaigns/network-societies-v1-b2-canada-us/manifest.json` before execution. That directory's 523 writes mined 523/523 and reconciled 523/523 (indexer lag 0, head 1427). The first pass left 17 `create-project` writes failed for insufficient ETH; those wallets were topped up with `hardhat_setBalance` and the run resumed. Do not regenerate that directory. Do not execute it over `output/campaigns/network-societies-v1-b2/`, `output/campaigns/network-societies-v1-b2-ai-pause/`, or the pilot directory. Test-data run id `20261019T194718789Z`. Open it from the local admin bookmark; do not commit the capability key. Eli (`user-052`, `0x232a…6895`) believes the abortion natural-right sentence and disbelieves the commonality and both modifieds. No project title is shared across causes. The graph has 8 `delegate-note` writes and 3 `revoke-delegation` writes, and zero retroactive `fund-project` writes. Nothing spends a delegated note.

**Decided out of this campaign for now.** A recurring monthly pledge. Pat already delegates a note, and revocation is a real action. The one-time spend is a separate mined copy, not this 523-write graph. The "$20/month" filter is still a product gap.

**Deferred, 2026-10-19.** Six of the fifteen rows below still have no campaign content: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation. Leave them. The nine that already have statements, boards, or projects are enough for now: crypto-friendly checkout, Grey County civic life, Christian teaching, home learning, the abortion settlement, schools and pushing, the Owen Sound voting trial, US-friendly Canadians, and the AI-pause board. Do not open a content batch for the six empty rows.

US-friendly Canadians is in batch 2 past the five-statement draft. AI safety is a plain board in batch 2 (`ai-pause`): a shared pause-treaty sentence, milder wordings that contain it, naturals that do not, a full-stop refusal, and an accelerationist refusal. A 2026-10-16 attester pass blessed the five modified-to-commonality pairs and refused the designed negatives. Those five arrows are in the allowance list. Home learning and Grey County civic life stop at the pilot planks. Do not force a new triple onto an overlap that already shares a concrete want. The campaign note already treats several of these as overlaps.

**Journeys.** Direct shared agreement and one reused statement on two boards are in the pilot. Eli's declined abortion bridge and the verified implication writes are in the 2026-10-19 mined output. A browser pass that day connected as Ruth, Eli, Pat, and Ned. Early-risk reimbursement is not on the batch 2 manifest or in the 523-write graph. The copy `network-societies-v1-b2-reimburse.json` mined it on 2026-10-19, and that project page was walked the same day. A friend spending a delegated note was mined on 2026-10-20 from `network-societies-v1-b2-note-spend.json` and walked the same day. One project contract on the civic, Christian teaching, and home-learning boards was walked on 2026-10-20. A recorded alignment decline is not part of this campaign. Adam decided on 2026-10-20 not to add negative alignment attestations; a missing yes is enough. A recurring monthly pledge stays a product gap.

## Inventory against the family minimum

Counted from `network-societies-v1-b2-statements.json`, `network-societies-v1-b2-projects.json`, and the cause list on 2026-10-19. "Planks" is the number of statements in that group's file. Accepted abortion and schools wording lives in `seed-content/`, so those two rows also have five accepted sentences that are not in the campaign file. A family clears the written minimum at 6–10 planks, at least two incompatible positions, and at least five projects. Draft bridges are extra boards, not extra families.

| Family | Planks in the campaign file | Projects | Against the minimum |
| --- | --- | --- | --- |
| Crypto-friendly checkout | 10 | 6 | Meets it. Includes a refusal of crypto payments. One project is aligned to the bank-blocking sentence. |
| Grey County civic life | 10, plus a 5-statement assimilation draft | 5 on the main board, 2 on the draft | Main board meets it. The draft is not a second family. |
| Christian teaching | 4, plus the class-host sentence and the plain-text notice on the board | 5 | Good enough for now (2026-10-20). Adam asked for fewer, broader wants. |
| Home learning | 3 | 5 | Good enough for now (2026-10-21). Materials wants are not local. The staffed-schools sentence is. |
| Abortion settlement | 6 on the Michigan authority board, plus the accepted five | 5 on the settlement, 2 on the forum | Good enough for now (2026-10-21). Wording unchanged. Eli refuses the settlement. |
| Schools and pushing | the accepted five only | 3 in Grand Rapids, 3 in Grey County | Accepted wording kept. The Grey County conduct sentences were deleted on 2026-10-21. The new Grey County projects are not mined. |
| Owen Sound voting trial | 7, plus a 5-statement dual-count draft | 5 on the trial, 2 on the draft | Main board meets it. |
| US-friendly Canadians | 12 | 7 | Meets it. Boycott and narrower-ties sentences are refused as arrows. |
| AI pause | 17 | 5 | Meets it. Five modified-to-commonality arrows are allowed. |
| Low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, less regulation | none | none | Deferred. |

One statement, the class-host directory, is on the civic-life, Christian teaching, and home-learning boards. One statement, the moderator checklist, is on the Michigan authority board and the Owen Sound voting board. The class-host directory project is one contract aligned to that shared statement, so those three boards list the same raise. It is not aligned to a Christian-teaching sentence or to the staffed-schools sentence. Two more single-statement projects are now in the batch 2 source: Printed moderator checklist, aligned only to the checklist already on the Michigan forum and the Owen Sound voting board, and Plain-text Grey County notice, aligned only to a new sentence on the civic and Christian teaching boards. They are not in the mined output directories.

## Journeys the frozen plan can and cannot show

These are properties of the 523-write graph, not of a chain run. A browser walkthrough still has to happen after execution.

| Journey | In the frozen plan |
| --- | --- |
| 1. Founder sees an ecosystem | Mined. As Ruth (`0xf39F…2266`), the Owen Sound checkout board showed base and organizing work, 0.08 USDZZZ raised and 5.92 still needed, and the not-yet-funded tab listing 3 projects. She is that board's organizer, so the page opened in the organizer view. |
| 2. Alliance without merger | Mined, and walked in the browser on 2026-10-19. Direct shared project: June (`0x8A6a…BdF6`) and Imani (`0x3C44…93BC`) both have a receipt on [Six-shop refundable checkout trial](http://127.0.0.1:5199/projects/0x7688482c92F3b60ee2c761f724F5Fd372ddC147a). June also signs the midweek class transcription. Imani signs the refundable-checkout sentence and a sentence that shops should refuse crypto-only payments. The project page, as June, showed 0.07 of 2 USDZZZ raised, founder Len, and a fake-data label. The implication half is not this pair. No two funders of one project split into "signed the commonality" and "signed only the modified." The closest disagreement is Wes (`0x68E6…b1Ee`) and Fake user 023 (`0x9D19…f99b`) on [Owen Sound association poll](http://127.0.0.1:5199/projects/0xad385917d545a7b1b7307654Aa5D7F6c1946d6A1). As Wes the page showed 0.03 of 2 USDZZZ raised and said the poll does not change a municipal election. Wes signs the direct ranked-poll sentence and wants Owen Sound elections to keep first-past-the-post. Fake user 023 signs the modified-right sentence, which has a live attester arrow to the dual-count commonality, and does not fund that commonality project. |
| 3. A bridge is declined | Mined. Eli's profile lists "Late-term abortion is horrific." and does not list the settlement sentence. The settlement statement page still offers him Sign. |
| 4. Early risk and later reimbursement | Mined, reconciled, and walked on 2026-10-19 in `output/campaigns/network-societies-v1-b2-reimburse/`, not in the 523-write graph. As Ruth, [Six-shop refundable checkout trial](http://127.0.0.1:5199/projects/0x4251D15D9Ee936d6F489C5aF9646084dB23EE3DE) showed 2.04 of 2 USDZZZ raised, status Succeeded, and "Early contributors are still out 1.04 USDZZZ." Ruth's row is 1.01 USDZZZ net; Imani's is 1.00. A third row, `0x5eF7…6f74`, is 0.02. Len is the founder and the recipient, and he is not one of those rows. Ruth's scout reimbursement showed 0.495098 USDZZZ available now and 0.514901 future. The page says no success attestations yet. Crossing the threshold is not evidence that the fictional work was delivered. |
| 5. Limited delegation | Delegate and revoke are mined. Pat's note to Ned was revoked, so the live page shows the note back with Pat. Walked 2026-10-19. The one-time spend is mined in `output/campaigns/network-societies-v1-b2-note-spend/`: June's payment-token note stays with Willa, who buys one 0.01 receipt. Walked 2026-10-20. A recurring monthly pledge stays a product gap. |
| 6. Same project, different boards | Mined in the 523-write graph and in the later copies, and walked on 2026-10-20 from `output/campaigns/network-societies-v1-b2-note-spend/`. [Grey County class-host directory](http://127.0.0.1:5199/projects/0x4be59d6F5BC7e4D4b215CCEa1252522C1A307115) is one contract. Christian teaching and home learning both link it as `/projects/eip155:31337:0x4be59d6F5BC7e4D4b215CCEa1252522C1A307115`. Civic life lists the same title at 0.01 of 2 USDZZZ. The alignment is the shared class-host sentence, not a Christian-teaching sentence and not the staffed-schools sentence. |
| 7. Independent judgment | Dropped 2026-10-20. A reviewer withholds a yes from a superficially relevant project. That is the judgment. Do not add a negative alignment attestation to make the refusal louder. |

## Purpose

Build a substantial, believable synthetic world around the network-society areas in [the brainstorming notes](./README.md). The notes name fifteen. Nine already have fake content, and that set is the campaign for now. A prospective cause founder should see concrete work worth organizing, the people needed to do it, and how Commonality can bring together funding that would otherwise remain fragmented.

The central story is overlapping constituencies funding particular outcomes without joining one organization. Show separate organizers, competing publications, practical disagreements, independent judgment, and people who decline to participate. Preserve the author's selection of causes and interest in bridges; do not replace it with a generic politically balanced charity catalog. Give dissenters plausible beliefs, rather than making them foils who inevitably convert.

This is a realistic demonstration, not evidence of adoption, a prediction about public opinion, or a stress test. All people, organizations, activity, and claimed deliverables must be visibly synthetic. “Campaign” here names this data-generation run, not a new product object.

## Read first, then reuse

The implementing model should read the project README and relevant role guidance, then:

- [Fake-data README](../README.md): commands, artifacts, environment boundaries, existing runner.
- [Statement-generation process](../statement-generation.md), [statement wording constraints](../../specs/product/statements-are-peculiar-for-good-reasons.md), and [bridge creator](../../specs/product/bridge-creator.md): reuse their authoring and checking process.
- [Network-society vision](../../docs/end-user/commonality/vision-and-strategy/credible-solution/network-societies.md): especially the distinction between base work, organizing work, and private benefits.
- [V2 manifest](../campaigns/medium-realistic-v2.json), [project stories](../campaignProjectStories.ts), and [step-14 run report](../campaigns/medium-realistic-v2-step14-run.md): the closest implementation precedent.
- [Glossary](../../specs/glossary.md): especially cause board, contribution, recurring pledge, and retroactive donation.

Use the existing campaign planner, executor, provisioning, runtime bindings, reconciliation, and generated-run viewer. Add campaign-local content alongside existing manifests; keep authored source in version control and execution output/secrets in the established ignored locations. Give this campaign its own output directory. Do not overwrite existing executed runs or turn campaign drafts into accepted `seed-content`.

Some older summaries are stale: the October step-14 report and current adapter already support varied receipt purchases, cross-camp contributions, and retroactive donations. Inspect current code before treating these as missing features.

## Scope and scale

The original full-catalog aim was **240 users, roughly 150–210 unique statements, and 75–90 projects** across fifteen topic families. That scale waits with the six deferred families. Batch 2 is already 72 users, 124 statements, and 62 projects, and that is enough content to keep working from. These figures are authoring targets, not reasons to manufacture weak statements or meaningless transactions. Count unique statements/projects separately from their appearances on multiple boards.

Each family should have:

- A few signable wants, at the grain of a kind of thing and a place, plus real refusals. Not one plank per project. A headcount, a duration, a host kit, a checklist, or a directory belongs in the project outcome. See the earmark-grain note in [statement-generation.md](../statement-generation.md).
- 2–4 genuinely incompatible or limiting positions, with people who hold them. Neutrality and disinterest are separate from disagreement.
- At least five projects: three base-level deliverables and two organizing/maintenance deliverables. More developed families can have six.
- At least two constituencies with different motivations, plus people who reject part or all of the proposed program.
- A named organizer, credible project founders, contributors, an independent reviewer, and a plausible funding director. People can hold several roles, but no single person should fill every role on their own project.

The full catalog would use 20–30 editorial cause boards across the fifteen families, including alternative organizers and a few shared boards. Stay inside the nine families that already have content. Families are authoring categories, not compulsory membership organizations or single canonical statements. Pilot/full scale must be explicit configuration, not a collection of hard-coded exceptions.

## Content map

These are project briefs and constituency suggestions, not finished statement wording. The six rows with no campaign content yet — low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation — stay briefs. Do not expand them until someone decides to resume those families. For a family that is in the campaign, make deliverables bounded and inspectable: a named place, duration, artifact or service, budget, completion criterion, and responsible fictional person.

| Family | Base-level projects to develop | Organizing work | Coalition and disagreement to portray |
| --- | --- | --- | --- |
| Crypto-friendly communities | Open-source checkout integration with refunds; ten-merchant trial with published costs/failures; independent security review | Maintained merchant directory; quarterly deployment clinics and reusable host kit | Crypto enthusiasts, fee-conscious merchants, civil-liberties advocates; skeptics of volatility or privacy claims who may still want a fair trial |
| Assimilation and shared civic life | Twelve practical language sessions with childcare; reusable civics pack; mixed newcomer/resident park-repair season | Tutor/venue directory with independent checking; local organizer handoff kit | Immigration restrictionists, pro-immigration integration advocates, newcomers seeking belonging; disagreement about language-service limits and cultural expectations |
| Better voting systems | Open-source ranked/approval ballot demo; non-binding local comparison poll with methods/data; auditable counting toolkit | Local pilot organizer guide; maintained directory of trial groups | Left/right FPTP critics and independents; disagreement between alternatives and defenders of the status quo |
| Abortion settlement | Clearly fictional policy-options comparison; moderated deliberation series with published outputs; accessible explanation of the proposed compromise | Maintained resource page; facilitator training and handoff | Reuse accepted compromise texts; include people on both sides who reject the compromise. State-level authority is a separate proposition, not implied by agreement on a cutoff |
| Low-carb communities | Open recipe/menu collection; reproducible restaurant menu audit; eight-week community cooking series | Independently checked venue directory; host kit and calendar | People seeking a low-carb food environment for different reasons; people who favor dietary choice but reject an enclave. Avoid invented health-effect claims |
| Cancel-proof support | Public corrections/appeals toolkit; documented fictional case-review method; resilient publishing tools | Independently reviewed support-provider directory; bounded intake/triage service | Conservatives, older free-speech liberals, civil-liberties advocates; disagreement about which sanctions are justified. Direct aid to one person is not the public-good showcase |
| Common sense about gender | Source-comparison methods and evidence-literacy materials; facilitated school-policy discussion kit; practical anti-harassment resources | Resource maintenance; facilitator directory and training | Different views about youth interventions, adult autonomy, schools, and respectful conduct. Reuse relevant accepted school statements without pretending they settle all these questions |
| Unwoke | Open due-process policy templates; viewpoint-neutral selection-rubric pilot; audit of a fictional institution's complaint process | Editorial front door covering selected planks; independent review digest | Overlap with cancellation/gender causes, but users can support one plank and reject another. Include a liberal due-process supporter who refuses the umbrella label |
| Democracy 2.0 | Open civic issue explorer; non-binding participatory allocation experiment; independent evaluation of the experiment | Local facilitator network; public methods/history archive | Voting reformers, decentralists, civic technologists; skeptics of online participation. Do not claim a binding election or verified population census |
| AI safety before capabilities races | Open evaluation tooling; independent replication of a safety result; public comparison of hypothetical verification mechanisms | Research digest; workshop and contributor onboarding kit | Safety researchers, cautious technologists, concerned citizens; accelerationists and people who dispute proposed restrictions. No invented technical success claims |
| US-friendly Canadians | Shared cross-border cultural archive; public guide to maintaining civic/business ties; joint community event with reusable materials | Maintained exchange directory; local host succession | Conservatives, apolitical families, businesspeople, anti-Trump internationalists; people who favor a boycott or narrower ties |
| Christianity | Open teaching materials; accessibility/transcription of shared resources; regional substitute-preacher coordination pilot | Independently checked resource directory; inter-church organizer/host kit | Different denominations, secular collaborators on specific civic work, nonparticipants; doctrinal agreement is not inferred from shared project funding |
| Islamic reform | Open discussion/study materials by fictional reform-minded authors; moderated interpretation forum with published materials; reusable civic-coexistence workshop | Maintained resource library; facilitator training | Reform-minded Muslims, secular civil-liberties allies, traditionalist dissenters; specify actual propositions rather than treating Muslims as one position |
| Less regulation | Open dataset of burdens in one fictional permitting process; reproducible comparison of alternative procedures; small-business application guide | Maintained reform-project tracker; independent methodology review | Entrepreneurs, libertarians, frustrated residents; safety-minded reformers and defenders of particular rules. An experimental medical zone remains a hypothetical policy proposal |
| Home-schooling | Open curriculum unit; accessible shared field-trip materials; reusable science activity kits | Local meetup season with succession; independently checked tutor/resource directory | Religious/secular home-schoolers and school-system families borrowing resources; disagreement on pedagogy, oversight, and religious content |

Use determinate geography: for example, Grey County, Ontario, Canada for Canadian local projects and a separately identified US setting for US policy examples. Do not blur jurisdictions. Synthetic policy proposals and evidence-research projects do not need assertions about current law or clinical truth; any such assertions that are included require sources checked at authoring time.

Shared projects are particularly valuable. A civil-liberties toolkit can appear on cancel-proof, unwoke, and Democracy 2.0 boards; an open teaching resource can cross Christian and home-schooling boards. Publish one project and multiple justified alignments, not three copies. Give at least three cross-family projects this treatment.

## Statements and bridges: the quality gate

Author ordinary signable wants first. Avoid slogans, statements about how the funding platform works, and “people doing X deserve payment.” Produce granularity along topic and place axes. Geographic inclusion on a board is not a belief implication.

Distinguish two legitimate stories:

1. **Existing overlap:** different motivations already support the same concrete outcome. Crypto checkout testing and shared teaching resources are good candidates. This does not need a manufactured compromise triple.
2. **A real belief gap:** the natural statements do not imply agreement. A mediator proposes modified statements containing a real concession; some personas accept and others decline. Only accepted modified statements may support the commonality through implication.

Target four well-developed bridge stories: reuse the accepted abortion cluster; develop voting reform, crypto merchant trials, and assimilation/shared civic work as candidate alliances. Determine their actual pattern before writing. The accepted immigration cluster concerns a different proposition and must not be relabeled as assimilation. Likewise the accepted LGBT-schools cluster does not establish a position on medical interventions. Add more bridges only after these work; every family needs coalition possibilities, not a compulsory formal triple.

For every proposed implication edge:

- Evaluate the exact ordered pair with the **real implication-attester system prompt**, using the shared evaluator or existing generation machinery. A simulation attester identity is fine; invented evaluations are not.
- Store statement-text hashes, prompt fingerprint, model/settings, decision, rationale, and evaluation status. Cache identical inputs; invalidate when text or prompt changes. Record refusals as well as approvals.
- Require an actual successful model evaluation and an affirmative decision before publishing. `cause-assist/src/implicationCheck.ts` can return `implies: true` with `source: heuristic` after missing credentials or failures; **that is not evidence**. Errors, malformed output, stale caches, and heuristic fallbacks leave the edge unevaluated and unpublished.
- Check designed-negative pairs: naturals to compromise, reverse arrows, incompatible claims, and nested-place rollups. If a designed-negative pair passes, investigate the wording/evaluation rather than silently publishing it.
- Run routing and shape critique too: modified → commonality should feel already said; natural → modified should be a meaningful optional change. Reject pasted-in commonality sentences, mediator narration, and camp justifications leaking into the shared statement.

Do not evaluate every possible pair in the whole catalog. Evaluate a bounded candidate graph, including its negative controls. Limit revision attempts per cluster (initially three); retain failed candidates in authoring reports and move to other work. Report any missing required bridge honestly.

## People and behavior

Create about 30 named spotlight people with short bios and explicit decisions; derive the rest deterministically from richer persona templates. Suggested primary-role distribution for 240 people: 20 organizers, 35 project doers, 85 contributors, 25 funding directors, 25 reviewers/attesters/mediators, and 50 sign-only or mostly inactive people. Secondary roles overlap.

For each person record topic interests, issue-specific beliefs, budget, risk tolerance, locality, trusted people, and explicit exclusions. Avoid a single left/right score that determines everything. A Christian home-schooler can dislike crypto; a liberal merchant can support low fees and cancellation due process while rejecting “unwoke”; a newcomer can favor language integration while rejecting immigration restrictions.

Separate **interest in a family**, **signing a statement**, **accepting a modified statement**, **trusting an attester**, and **funding a project**. None automatically entails the next. Beliefs should select actions; actions should not randomly determine beliefs afterward. Distinguish leaving a statement unsigned from explicitly rejecting it.

Reserve a small authored timeline for spotlight users: initial signatures, offered bridge, accept/decline, project discovery, contribution or delegation, later evidence, optional reimbursement donation or revocation. Ensure signatures of the modified statements are explicit persona choices. Other users can have sparse, uneven histories rather than all performing every action.

Funding must respect available balances and preferences. Seed a few well-supported projects, many with partial momentum, some unfunded, and differing contributor concentration. Have risk-tolerant people contribute early and other people donate retroactively. Keep real synthetic token amounts consistent with displayed amounts; if demonstration budgets are scaled, document one explicit conversion and never display the unscaled number as money actually raised.

## Required demonstration journeys

Each journey needs named actors, stable IDs, expected balances/relationships, and a short browser walkthrough with actual generated links.

1. **Founder sees an ecosystem:** a cause board contains base work and organizing work, with three projects at visibly different funding stages. The founder can see which role is still missing.
2. **Alliance without merger:** two differently motivated people contribute to the same project while retaining conflicting beliefs elsewhere. At least one journey uses a verified implication path; another uses direct shared agreement.
3. **A bridge is declined:** one person accepts a modified statement, another keeps the natural position and refuses it. The latter must not appear as a supporter of the compromise through a fabricated arrow.
4. **Early risk and later reimbursement:** early contributors reach a real contract threshold; later donors reimburse them through the existing waterfall. Separately identify funding success and fictional evidence of delivered work—crossing the threshold is not proof of delivery.
5. **Trust someone with a limited budget:** a donor delegates to a named friend for particular work, and the friend's supported spending path is exercised. Another donor revokes. Merely creating a delegation is not evidence that delegated spending happened.
6. **Same project, different boards:** one shared artifact appears on multiple justified boards without duplicate funding contracts or double-counted totals. Contradictory planks do not become implied endorsements.
7. **Independent judgment:** dropped 2026-10-20. The original ask was a recorded decline of one project beside a yes for another. Alignment stays positive-only. A project that nobody you trust has vouched for stays off your board because there is no yes. Do not add negative alignment attestations for this demo. If a louder "this does not belong here" is needed later, decide it then.

The brainstorming's “$20/month, fire-and-forget” and “delivered but not reimbursed” filter are goals to inspect against current implementation. Record whether each is supported, requires a small campaign adapter extension, or remains a product gap. If only a one-time delegated deposit works, label that exact demonstration and leave recurring execution unfulfilled. Do not simulate unsupported UI/contract behavior with prose and call it complete.

## Implementation sequence

Steps 1–3 are done for the pilot, and step 3 is also done for batch 2 on the pre-pin plan. Step 4 has the six draft bridges and the AI-pause board in the manifest. Six families are still unauthored, and on 2026-10-19 they were deferred: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation. Step 5 is a local demonstration of the nine families we have, not a wait for those six. The notes under each step stay as the original instructions.

### 1. Make a capability and content inventory

Inspect current runner/schema and record reusable paths versus missing wiring. Known issues to address: `campaignSchema.ts` currently caps the catalog at 70 statement references and requires at least eight causes, while the pilot below has four; it also treats statement references across causes as unique. The planner's implication evidence currently uses accepted bridge-role pairs, which is insufficient for new evaluated campaign statements. Existing project/story and cross-camp funding selection may contain campaign-specific assumptions.

Generalize those constraints with explicit campaign configuration and tests while preserving historical manifests. Keep unique catalog identity separate from board reuse. Add evidence references for evaluated edges. Inspect actual recurring-payment, delegated-spending, success-attestation, and trust APIs before promising them. Prefer small extensions to existing adapters; do not build a second simulator or a new platform subsystem for this demo.

Deliverable: proposed artifact layout and a short supported/extension/gap table. This is implementation preparation, not another open-ended planning exercise.

### 2. Author and validate a four-family pilot

Use crypto-friendly communities, assimilation, Christianity, and home-schooling: about 40 users, 20 projects, and 40–60 statements. This tests different motivations, local work, religious/secular overlap, and reusable organizing goods. Include at least one candidate implication-backed alliance and negative controls.

Store structured campaign-local content: statements, project briefs, personas/decisions, board definitions, candidate implication pairs, evaluation results, and journey expectations. These can be separate files or existing schema extensions; prefer readable data over new bespoke TypeScript story modules.

Run authoring checks and freeze content/evaluation fingerprints before planning actions. Generate a plan into a fresh output path. Validate referential integrity, actor prerequisites, funding budgets, dissent consistency, and planned journey outcomes before submitting transactions.

### 3. Execute locally and prove the stories

Use the established local runner and reconciliation. Wipe local data only if useful; keep the old campaign's files intact. Verify real indexed/SDK-derived results and walk the pilot in the browser. Record what an ordinary viewer sees, not just transaction success.

Fix failures before scaling. The first executed pilot is the point to discover that a beautiful bridge does not route, or that a donor cannot perform the intended action.

### 4. Expand in bounded content batches

The original instruction was to add the remaining families in batches of three or four, reuse accepted statements where they mean exactly what is needed, then generate new campaign-local planks and validate new edges. The accepted abortion bridge is already in batch 2. Do not add the six families that still have no content. The nine we have are the campaign for now.

Scale to the target population with deterministic generation around authored constraints. Review a content matrix showing family, statements, dissenters, projects, organizers, funding stages, and shared projects. Uneven activity is desirable; an accidentally empty family is not.

### 5. Deliver a reproducible local demonstration

Run the full campaign, reconcile it, and perform every required journey. Save the committed source manifest/content and concise run report; retain execution evidence and secrets in their established ignored locations. Provide exact reproduction commands, seed/fingerprints, generated run-viewer access instructions, spotlight users, project/board links, and known gaps. Update `fake-data-generation/PLAN.md` and README with a pointer once implementation lands.

Remote/testnet publication is a separate later step using existing preflight, budgets, and mutation controls. Local completion should not depend on it.

## Acceptance and handoff checklist

- Each of the nine families already in the campaign has several signable planks, incompatible positions, substantive projects, and people whose actions match their stated preferences. The six deferred families are not part of this checklist.
- Organizing work has concrete outputs and a term; no generic “fund our movement” pots. Each project explains the coordination problem it addresses: fragmented constituencies, threshold risk, maintenance nobody owns, discovery, or independent verification. Ordinary crowdfunding could still fund some projects; do not claim Commonality is uniquely necessary for every one.
- Every published implication has fresh, affirmative model evidence from the actual attester prompt. Negative controls, failed candidates, and routing/shape decisions remain inspectable.
- New campaign text stays outside the accepted real-statement catalog. Reused canonical bridge wording is referenced rather than silently rewritten.
- Automated checks cover beliefs/actions consistency, missing/invalid evidence, shared-project identity, budget accounting, execution prerequisites, and reconciliation. Run relevant existing campaign tests and workspace checks when code changes; test these failure modes rather than only snapshotting the generated prose.
- Required journeys have reconciled state and browser observations. Unsupported behaviors are listed as specific gaps, never counted as demonstrated; the full demo is not called complete while a required journey is silently missing.
- The report identifies synthetic users/activity/deliverables, actual amounts and outcomes, exact reproduction steps, and the next unfinished task if work spans sessions.

**Journey 2 walk, 2026-10-19.** The two project URLs are in the journey table. The published bundle at `commonality.localhost:8088` is an older IPFS snapshot: `/projects/…` and `/admin/test-data/…` are not in it. The walk used the current `ui/dist/commonality` build on `http://127.0.0.1:5199`, with `/test-data` read from `fake-data-generation/output/test-data` and the indexer proxied from port 42069. Connect from run `20261019T194718789Z`. A full page load drops the in-memory wallet, so profile and project clicks have to stay inside the app. Do not commit the capability key.

**Journey 5 walk, 2026-10-19.** Same server and run as journey 2 (`http://127.0.0.1:5199`, run `20261019T194718789Z`). Pat is `user-021` (`0x6cb5…9296`). Ned is `user-011` (`0x4A04…86bA`). The note is [Fund #25](http://127.0.0.1:5199/delegation/notes/0x8a791620dd6260079bf849dc5567adc3f2fdc318%3A25) (`note-0001`). Pat delegated 1500 base units to Ned and then revoked that same note (`action-00513`, `action-00521`).

As Pat, [My Delegated Funds](http://127.0.0.1:5199/delegation/notes) lists Fund #25 as undelegated, current owner Pat, with Delegate and Reclaim. The detail page shows a 1-wei ETH deposit on 19/10/2026 15:46:48 and no delegation event. As Ned, that URL says he has no actions on the note, and his list does not include Fund #25. Ned is acting as delegate on three other notes: #16, #29, and #31, each 1 wei, with Hand back. His own Fund #18 is controlled by someone else. Neither wallet shows a monthly pledge. Nothing on these pages is a spend of a delegated note.

**Create-project gas quote, 2026-10-19.** The 62 mined receipts in `output/campaigns/network-societies-v1-b2-canada-us/` used 4,073,876–4,073,924 gas. `SOLO_GAS_UNITS['create-project']` was 3,000,000, so the 25% buffer still stopped short of the balance the transaction required. The quote is now 4,500,000. That does not change the mined graph. Do not regenerate the four output directories named below.

## Journeys 4–7 to flesh out

Adam decided on 2026-10-19 to flesh these out. Nothing about the demo says they should stay out. The 523-write graph does not contain them because the planner never emits them for this campaign. Do not edit the mined output directories. A plan that includes these actions goes in a fresh directory and is executed locally.

**Journey 4. Early fund, later reimbursement.** The medium-realistic v2 planner already emits four retroactive `fund-project` writes, and only on that campaign's abortion bridge project, behind `useStories`. Batch 2 still does not set `reimbursement`, so the 523-write graph has zero retroactive funds. The copy [`network-societies-v1-b2-reimburse.json`](../campaigns/network-societies-v1-b2-reimburse.json) sets it on "Six-shop refundable checkout trial" (20 early 0.10 receipts, then 4 retroactive donations) and raises the fund-project target from 70 to 74. Campaign id is `ns-v1-b2-reimburse` so board slugs stay under 64 characters. The seed is unchanged. A local run on 2026-10-19 mined 527/527 and reconciled 527/527 into `output/campaigns/network-societies-v1-b2-reimburse/` (indexer lag 0, head 2011). The first pass left 11 writes failed for insufficient ETH; those wallets were topped up with `hardhat_setBalance` and the run resumed with `--skip-provision`. Test-data run id `20261019T224446171Z`. Do not regenerate that directory. Ruth (`user-001`, `0xf39F…2266`) and Imani (`user-003`, `0x3C44…93BC`) are the named early funders. Len (`user-005`, `0x15d3…6A65`) is the founder and does not fund it. The project contract is `0x4251D15D9Ee936d6F489C5aF9646084dB23EE3DE`. Crossing the threshold is not evidence that the fictional work was delivered.

**Journey 4 walk, 2026-10-19.** Same static server shape as journey 2: current `ui/dist/commonality` on `http://127.0.0.1:5199`, `/test-data` from `fake-data-generation/output/test-data`, and `/graphql` plus `/api` proxied to the indexer on port 42069. Without the `/api` proxy the project page shows "We couldn't load this project" because the event cache falls back to the page origin. Connect from run `20261019T224446171Z` as Ruth, then open the project with an in-app link. A full page load drops the in-memory wallet. As Ruth the page showed the fake-data sentence, founder Len, recipient `0x15d3…6A65`, Succeeded, 2.04 of 2 USDZZZ raised, and the close-the-loop line that early contributors are still out 1.04 USDZZZ. Her reimbursement panel showed 0.495098 USDZZZ available now and 0.514901 future. The contributor table listed Ruth 1.01, Imani 1.00, and `0x5eF7…6f74` 0.02. Len was not in those rows. "No success attestations yet" stayed on the page next to the funding success. A later `./scripts/services.sh --start` tried to redeploy contracts, reused the addresses this page reads, then reverted at block 2018 on a call to a newly deployed `CreatorAssuranceContractFactory`. That failure is outside this walk. Do not regenerate the reimburse directory to repair it.

**Journey 5. A friend spends a delegated note.** Delegate and revoke already run. Pat (`user-021`) delegated note `note-0001` to Ned (`user-011`) and then revoked that same note, so that pair cannot also show a spend. The copy [`network-societies-v1-b2-note-spend.json`](../campaigns/network-societies-v1-b2-note-spend.json) plans a different pair: June deposits one payment-token note, Willa keeps the delegation, and Willa spends it on one 0.01 receipt for the six-shop checkout trial. The action type is `spend-delegated-note`. It was mined on 2026-10-20. A recurring monthly pledge is still not an action type. Leave that as a product gap. Do not invent pledge transactions.

**Journey 6. One project on two boards.** Done for one project. `project-015` has one `causeId` (`christian-teaching`) and one alignment, to the class-host sentence. That sentence is also on the civic and home-learning boards, so those boards list the same contract. Publishing a second contract would double-count the raise. No Christian-teaching sentence is an alignment of this project, and the staffed-schools sentence is not either. The other two are in the batch 2 source as of 2026-10-20: Printed moderator checklist (only `moderator-checklist`) and Plain-text Grey County notice (only `plain-text-notice`). Neither has been mined.

**Journey 7. Independent judgment.** Dropped on 2026-10-20. The contract records a yes or a later revoke of that same yes. Adam decided not to add a decline. A missing attestation is the refusal. Do not treat this as unfinished campaign work, and do not add a negative alignment type so the journey can be walked.

**Journey 5 plan, 2026-10-19.** The copy [`network-societies-v1-b2-note-spend.json`](../campaigns/network-societies-v1-b2-note-spend.json) adds one `spend-delegated-note` write. June (`user-016`) deposits a payment-token note sized to one 0.01 receipt. Willa (`user-012`) receives that note and buys one cheap receipt on "Six-shop refundable checkout trial". That note is not revoked. Pat still delegates to Ned and that note is still revoked. A recurring monthly pledge is still not an action type. A local run on 2026-10-20 mined 524/524 and reconciled 524/524 into `output/campaigns/network-societies-v1-b2-note-spend/` (indexer lag 0, head 2603). The first pass left three writes failed for insufficient ETH (`action-00235`, `action-00491`, `action-00499`). Those three accounts were topped up with `hardhat_setBalance` and the run resumed with `--skip-provision`. Test-data run id `20261020T130207000Z`. Do not regenerate that directory. Do not execute it over the five earlier output directories. Spending the whole note closes it, so the derived check treats a final `spend-delegated-note` as inactive.

**Journey 5 walk, 2026-10-20.** Same static server shape as journey 4: current `ui/dist/commonality` on `http://127.0.0.1:5199`, `/test-data` from `fake-data-generation/output/test-data`, and `/graphql` plus `/api` proxied to the indexer on port 42069. Connect from run `20261020T130207000Z` as Willa, then open the project with an in-app link. A full page load drops the in-memory wallet. June is `user-016` (`0x3a4d…13a8`). Willa is `user-012` (`0xaf14…1382`). The note is Fund #56 (`note-0008`, on-chain id 56). The project is [Six-shop refundable checkout trial](http://127.0.0.1:5199/projects/0x9efb18eA8944146C2054d6f1B33d1D16aEb668dB). As Willa the project showed 0.04 of 2 USDZZZ raised and a contributor row of 0.01 USDZZZ through `0x8a79…c318`, via June to Willa. [Fund #56](http://127.0.0.1:5199/delegation/notes/0x8a791620dd6260079bf849dc5567adc3f2fdc318%3A56) showed Inactive, Delegated, created by June, current owner Willa, token balance 0 USDZZZ, with Hand back. The page does not name the checkout trial. A recurring monthly pledge is still not on the page.

**Journey 6 walk, 2026-10-20.** Same static server as journey 5: `http://127.0.0.1:5199`, indexer head 2603, run `20261020T130207000Z`. The project is `project-015`, contract `0x4be59d6F5BC7e4D4b215CCEa1252522C1A307115`, founder Nadia, 0.01 of 2 USDZZZ raised, one alignment to `statement-shared-goods-class-host-directory`. Christian teaching (`/cause/0x7099…79C8/campaign-ns-v1-b2-note-spend-christian-teaching`) and home learning (`/cause/0x90F7…b906/campaign-ns-v1-b2-note-spend-home-learning`) both list that contract under Fundable Projects, each as Direct, 0.01 / 2 USDZZZ. Grey County civic life lists the same title and the same 0.01 / 2. The home board's fundable list appears after the signer counts finish. The staffed-schools statement page does not list this project. A second alignment to a contradictory plank was not added.

**Next task:** Adam is reviewing the generated sentences one board at a time, in fresh sessions. Crypto, Grey County civic life, Christian teaching, home learning, and the abortion settlement (the accepted five and the Michigan authority sentences) are good enough for now. The next board is schools and pushing. Adam likes the accepted five and the Grand Rapids projects. The Grey County conduct board was deleted on 2026-10-21. Three Grey County projects now sit on the schools board, aligned only to the accepted statements. Those three are waiting for his look. Do not mine another copy. Implication attestations for the accepted boards are listed under the review and wait until the wording sessions are done. Do not mine another copy. After that, Printed moderator checklist and Plain-text Grey County notice still need a fresh local plan and run. Journeys 4, 5, and 6 have been walked, and journey 7 is dropped. The three cross-family projects are in the batch 2 source. Do not regenerate `output/campaigns/network-societies-v1-b2-note-spend/`, `output/campaigns/network-societies-v1-b2-reimburse/`, `output/campaigns/network-societies-v1-b2-canada-us/`, `output/campaigns/network-societies-v1-pilot/`, `output/campaigns/network-societies-v1-b2/`, or `output/campaigns/network-societies-v1-b2-ai-pause/`. Do not author low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, or less regulation. Do not start a bulk random run. Remote publication is a separate step. `fake-data-generation/PLAN.md` items 4–8 are not this chunk.


NOTE FROM ADAM: Now that we've generated a bunch of fake data, I want to go through it myself and see whether it looks reasonable to me; I don't trust our LLM-generated stuff yet to be good without supervision. So let's make a list here of what I've approved and what still needs to be looked at.

## Wording grain, 2026-10-20

Adam rejected the project-shaped sentences (a six-shop, three-month trial as the statement). The campaign files now keep a want and its refusals, and the old deliverable sentences are project outcomes. Two draft bridges whose commonality was that deliverable, Grey County assimilation sessions and the Owen Sound checkout trial, no longer have published implication arrows. The stored attester pass was for the old wording. Do not treat it as a bless of the new sentences. The other live arrows were left in place because those sentences did not change.

The mined output directories still contain the old sentences. Do not regenerate them to catch up. A fresh plan is a later run.

The review list that used to sit here described the old sentences. Adam is reading the new ones one board at a time.

## How to rewrite a board Adam says is too specific

Do what the Grey County civic rewrite did in `ef5aad57`, in the same session as the new sentences.

- Delete the old statement ids. Remove them from the statement files, every cause `statementRefs` list, project alignments, persona pins, and the statement-count targets (`scale` and `publish-statement`).
- Do not leave the old sentences in the file. Mined output directories are frozen. They do not need the old ids to keep resolving.
- Do not keep an old id and only change its text. A new want gets a new id.
- A limit that makes the want usable belongs inside that want. Naming assumptions, naming a confession, or stating qualifications is not a second sentence.
- A real refusal of the want can stay as its own sentence.
- Show Adam the new board. Leave it unchecked until he says it is good enough.

## Adam's review list (2026-10-20)

Source of the sentences and project titles: `fake-data-generation/campaigns/network-societies-v1-b2-statements.json` and `network-societies-v1-b2-projects.json`. A box is checked only when Adam has said the item is fine. Nothing in the generated campaign text is checked yet.

### Decisions already made

These are scope calls, not a pass on the wording.

- [x] Nine families are enough for now. Do not author low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, or less regulation (2026-10-19).
- [x] Do not add a negative alignment attestation. A missing yes is the refusal (2026-10-20).
- [x] A recurring monthly pledge stays a product gap. Do not invent pledge transactions.
- [x] Do not regenerate the mined output directories named in the next-task note above.
- [x] Reuse the accepted abortion and schools-and-pushing sentences unchanged. They are not new campaign text.

### Already accepted seed (wording lives in `seed-content/`, not in the campaign file)

Skip these unless you want to re-read them. (ADAM: No, don't skip them; I want to reread them and make sure they're suitable for the current campaign's purposes.) The campaign boards only point at them.

- [x] Abortion cutoff bridge: the accepted five (`compromise-abortion`). Good enough for now (2026-10-21). Reused unchanged.
- [ ] Schools and pushing: the accepted five (`lgbt-schools`). The campaign does not treat those five as a position on drugs, surgery, or classroom names.

### Still needs a look

Read the current sentences in `network-societies-v1-b2-statements.json`. Adam is reviewing them one board at a time, starting with crypto. Projects stayed; their alignments now point at the surviving want.

(ADAM: Let's go through one by one, starting with looking at the crypto one again, now that we've significantly changed it.)

- [x] Crypto board sentences, 2026-10-20. Adam said they look pretty decent. Projects on the refundable-checkout sentence stayed. Added "Blocked-customer sale record," aligned only to bank-blocking. Imani and June sign that sentence, reject a ban on crypto payments, and each fund the five checkout projects plus the new record. Not mined.

- [x] Grey County civic life, 2026-10-20. Good enough for now. The board is the assimilation want, two constituencies that already say it, a milder English sentence that does not, and a refusal. The five civic projects align only to `assimilate`. No implication arrow. The earlier class, park, and office sentences are deleted. The Grey County assimilation-sessions draft still has the old session wording and is not this board. Not mined.

### Implication attestations still to run

Do this after the wording pass, not during it. A stored attester result is only evidence for the sentences that were evaluated. The 2026-10-16 pass does not bless a sentence we rewrote.

The boards Adam has already called good enough publish **no** implication arrows:

- [ ] Crypto (`refundable-checkout`, `bank-blocking`, `refuse-crypto-payments`). The checkout-trial bridge arrows were dropped when that wording changed.
- [ ] Grey County civic life. `some-immigration` and `fewer-newcomers` contain the assimilation sentence, so they are the candidates. `english-around-here` is a designed no. `keep-own-ways` is a refusal.
- [ ] Christian teaching (`shared-teaching-notes`, `independent-church-help`, `keep-notes-inside`, `civic-transcription-only`). No candidate pair has been chosen. Do not evaluate during a wording session.
- [ ] Home learning (`reusable-home-materials`, `materials-without-religion`, `taught-in-staffed-schools`). No candidate pair. `taught-in-staffed-schools` is a refusal. Do not evaluate during the wording session.
- [ ] Abortion settlement. The accepted pair already has live arrows (`modified-left` and `modified-right` to `commonality`). The wording did not change on 2026-10-21, so those arrows stay. Do not re-evaluate them in a wording session. The Michigan sentences are separate wants and have no bridge roles.

Boards that still have live arrows, and have not had this wording review: the accepted schools pair, the dual-count poll, minors' medicine, employment, Canada–US (boycott and narrower-ties stay refused), and AI pause. Re-check those arrows only if a sentence on that board changes.

- [x] Christian teaching, 2026-10-20. Good enough for now. Two wants: freely available notes, with the confession named and no joint doctrine; independent-church help, with qualifications and doctrine stated. Two refusals: notes stay inside the church, and civic transcription excludes church teaching. Notes projects align only to `shared-teaching-notes`. The rota and the host kit align only to `independent-church-help`. No implication arrow. Not mined.

- [x] Home learning, 2026-10-21. Good enough for now. `reusable-home-materials` is unscoped and includes the method and school-family use. `materials-without-religion` is the further want with no religious claims. `taught-in-staffed-schools` is the Grey County refusal. The science unit aligns only to `materials-without-religion`. The other four home-learning projects align only to `reusable-home-materials`. The class-host sentence stays on the board. No implication arrow. Not mined.

- [x] Abortion settlement, 2026-10-21. Good enough for now. The accepted five stay as written. The Michigan board stays as written: legislature versus one federal statute, keep campaigning, a ban from the start of pregnancy, a labeled comparison of three proposals, and the moderator checklist. Settlement projects stay aligned as they are. The authority brief and the from-the-start page stay on the forum. Not mined.

The schools board is in review. The accepted five and the Grand Rapids projects are liked. Three new Grey County projects are waiting for a look. The conduct sentences are gone.