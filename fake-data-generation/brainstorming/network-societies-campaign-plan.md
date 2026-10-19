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

**Decided out of this campaign for now.** Delegated spending and a recurring monthly pledge. Pat already delegates a note, and revocation is a real action. Nothing spends a delegated note or repeats a pledge. Journey 5 below is therefore only partly demonstrated, and the "$20/month" filter is still a product gap.

**Deferred, 2026-10-19.** Six of the fifteen rows below still have no campaign content: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation. Leave them. The nine that already have statements, boards, or projects are enough for now: crypto-friendly checkout, Grey County civic life, Christian teaching, home learning, the abortion settlement, schools and conduct, the Owen Sound voting trial, US-friendly Canadians, and the AI-pause board. Do not open a content batch for the six empty rows.

US-friendly Canadians is in batch 2 past the five-statement draft. AI safety is a plain board in batch 2 (`ai-pause`): a shared pause-treaty sentence, milder wordings that contain it, naturals that do not, a full-stop refusal, and an accelerationist refusal. A 2026-10-16 attester pass blessed the five modified-to-commonality pairs and refused the designed negatives. Those five arrows are in the allowance list. Home learning and Grey County civic life stop at the pilot planks. Do not force a new triple onto an overlap that already shares a concrete want. The campaign note already treats several of these as overlaps.

**Journeys.** Direct shared agreement and one reused statement on two boards are in the pilot. Eli's declined abortion bridge and the verified implication writes are in the 2026-10-19 mined output. A browser pass that day connected as Ruth, Eli, Pat, and Ned. Early-risk reimbursement, a friend actually spending a delegated note, recurring pledges, and the independent-reviewer walkthrough are not campaign demonstrations yet.

## Inventory against the family minimum

Counted from `network-societies-v1-b2-statements.json`, `network-societies-v1-b2-projects.json`, and the cause list on 2026-10-19. "Planks" is the number of statements in that group's file. Accepted abortion and schools wording lives in `seed-content/`, so those two rows also have five accepted sentences that are not in the campaign file. A family clears the written minimum at 6–10 planks, at least two incompatible positions, and at least five projects. Draft bridges are extra boards, not extra families.

| Family | Planks in the campaign file | Projects | Against the minimum |
| --- | --- | --- | --- |
| Crypto-friendly checkout | 10 | 5 | Meets it. Includes a refusal of crypto payments. |
| Grey County civic life | 10, plus a 5-statement assimilation draft | 5 on the main board, 2 on the draft | Main board meets it. The draft is not a second family. |
| Christian teaching | 9 | 5 | Meets it. |
| Home learning | 10 | 5 | Meets it. |
| Abortion settlement | 6 on the Michigan authority board, plus the accepted five | 5 on the settlement, 2 on the forum | Meets it. Eli refuses the settlement. |
| Schools and conduct | 7 on Grey County conduct, plus the accepted five | 3 on the schools cause, 5 on conduct | The family meets it. The schools cause alone has three projects. |
| Owen Sound voting trial | 7, plus a 5-statement dual-count draft | 5 on the trial, 2 on the draft | Main board meets it. |
| US-friendly Canadians | 12 | 7 | Meets it. Boycott and narrower-ties sentences are refused as arrows. |
| AI pause | 17 | 5 | Meets it. Five modified-to-commonality arrows are allowed. |
| Low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, less regulation | none | none | Deferred. |

One statement, the class-host directory, is on the Christian teaching board and the home-learning board. One statement, the moderator checklist, is on the Michigan authority board and the Owen Sound voting board. No project is one contract aligned to two boards. The three cross-family projects the scope section asks for are still missing.

## Journeys the frozen plan can and cannot show

These are properties of the 523-write graph, not of a chain run. A browser walkthrough still has to happen after execution.

| Journey | In the frozen plan |
| --- | --- |
| 1. Founder sees an ecosystem | Mined. As Ruth (`0xf39F…2266`), the Owen Sound checkout board showed base and organizing work, 0.08 USDZZZ raised and 5.92 still needed, and the not-yet-funded tab listing 3 projects. She is that board's organizer, so the page opened in the organizer view. |
| 2. Alliance without merger | Mined, and walked in the browser on 2026-10-19. Direct shared project: June (`0x8A6a…BdF6`) and Imani (`0x3C44…93BC`) both have a receipt on [Six-shop refundable checkout trial](http://127.0.0.1:5199/projects/0x7688482c92F3b60ee2c761f724F5Fd372ddC147a). June also signs the midweek class transcription. Imani signs the refundable-checkout sentence and a sentence that shops should refuse crypto-only payments. The project page, as June, showed 0.07 of 2 USDZZZ raised, founder Len, and a fake-data label. The implication half is not this pair. No two funders of one project split into "signed the commonality" and "signed only the modified." The closest disagreement is Wes (`0x68E6…b1Ee`) and Fake user 023 (`0x9D19…f99b`) on [Owen Sound association poll](http://127.0.0.1:5199/projects/0xad385917d545a7b1b7307654Aa5D7F6c1946d6A1). As Wes the page showed 0.03 of 2 USDZZZ raised and said the poll does not change a municipal election. Wes signs the direct ranked-poll sentence and wants Owen Sound elections to keep first-past-the-post. Fake user 023 signs the modified-right sentence, which has a live attester arrow to the dual-count commonality, and does not fund that commonality project. |
| 3. A bridge is declined | Mined. Eli's profile lists "Late-term abortion is horrific." and does not list the settlement sentence. The settlement statement page still offers him Sign. |
| 4. Early risk and later reimbursement | No retroactive `fund-project` write. The v2 planner emits those only for its own bridge project. This campaign does not. |
| 5. Limited delegation | Pat's note to Ned was revoked in the same graph, so the live page shows the note back with Pat. Walked 2026-10-19. No action spends a delegated note. Recurring monthly pledges are not an action type here. |
| 6. Same project, different boards | No. Two statements sit on two boards. Projects do not. |
| 7. Independent judgment | June is described as a reviewer who refuses a superficial alignment. The graph's 62 alignment writes are all `supports-described-outcome`. A decline is not planned. |

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

- 6–10 useful cause planks at different grains, including concrete local goals where appropriate.
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
7. **Independent judgment:** a reviewer declines alignment for a superficially relevant project; another project earns it. Where existing trust filtering supports it, two viewers see the expected difference.

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

**Next task:** the create-project gas quote that left 17 wallets short of ETH on the first pass of this run. Fix that before another execution. Do not regenerate the four output directories named below. Do not treat journey 5 as delegated spending. Journeys 4, 6, and 7 are still absent from this graph.

Do not regenerate `output/campaigns/network-societies-v1-b2-canada-us/`, `output/campaigns/network-societies-v1-pilot/`, `output/campaigns/network-societies-v1-b2/`, or `output/campaigns/network-societies-v1-b2-ai-pause/`. Do not author low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, or less regulation. Do not start a bulk random run. Do not extend the planner in this chunk. Journeys 4, 6, and 7 are absent from the graph: no retroactive fund, no shared project contract, and no declined alignment. Journey 5 stops at delegate and revoke. The create-project gas quote underfunded 17 wallets on the first pass; leave that until the next execution. Remote publication is a separate step. `fake-data-generation/PLAN.md` items 4–8 are not this chunk.
