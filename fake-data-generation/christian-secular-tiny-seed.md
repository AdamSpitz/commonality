# Christianity × secular conservatism — tiny seed (working plan)

Status: **in progress.** Update this file as work lands so a later session can resume without the chat.

Canonical wording constraints: [statements are peculiar for good reasons](/specs/product/statements-are-peculiar-for-good-reasons.md). Mediator strategy already in repo: [`services/bridge-creator/config/christian-secular-conservative.example.json`](/services/bridge-creator/config/christian-secular-conservative.example.json) (family-formation / kids-and-tech / religious-liberty / moral-grounding). This seed **replaces** the thin CauseStarter Christianity planks, it does not add a second Christianity.

## Goal

Tiny local seed (`./scripts/data.sh --seed`, i.e. `gen:tiny`) should show two CauseStarter boards and a mediator cluster whose statements actually have the peculiar shape, and whose designed implication arrows the **live** implication attester blesses.

## Decisions (locked)

- **Topics.** Four naturals per camp. Shared: abortion, markets, LGBT unbundling. Unique: Scripture-in-every-language (Christian); colorblind merit / individual equal protection (secular).
- **Patterns.** Abortion = different phrasing, same conclusion (religious vs secular; no 12–16 week deal). Markets = different reasons, same conclusion. LGBT = unbundle gay adults (not enemies; secular also SSM/monogamy) from DQSH, exhibitionist Pride, and the youth medical pipeline. Uniques have **no** triple.
- **Cause boards** hold **natural** planks only (4 + 4). **Modified + commonality** are mediator-authored, not swapped onto the camp boards.
- **Mediator account:** keep **Hardhat #8** (`FUNDED_HARDHAT_DEV_KEYS[8]`), already `CHRISTIAN_MEDIATOR_*` in `seedChristianityCause.ts`. Do not jump to #19 unless we also move CSM (#7) and fund a high band. Humans stay in #0–#6; #9 remains secular-conservatism founder; #0 remains Christianity / local-food owner.
- **Implication direction.** Board for S shows projects aligned with S2 where **S2 implies S**. So a project attested to **modified-Christian** appears on **commonality** (if MC→CG). A secular user who signed **modified-secular** sees it if the UI unions boards of statements they support *including implied CG*. They will not see it on the MS board itself (MC does not imply MS). Include at least one project aligned **only** with a unique plank (negative: other camp must not see it). Include some alignments to **naturals** (should not cross the bridge if natural↛CG).
- **Attester expectations.** Stop only if a **designed yes** is refused. After a bless, still run the **routing check** ([peculiar statements](/specs/product/statements-are-peculiar-for-good-reasons.md) § How to check a pair): modified → CG should feel redundant to sign separately; natural → modified should not.
  - Yes: each modified → its CG (containment / subset).
  - No (not a bug): natural → CG, pole → anything, MC → MS, unique → CG, CG → modified.
- **~10 projects**, not 17. Shared alignments. One unique-only.
- **Personas** as hand-authored JSON driving signs / creates / attests — do not grow random `universe.json` soup for this. Later make that the easy path for more clusters.
- **This becomes tiny.** Drop random 12-statement universe slice from tiny once this cluster + personas exist. Until then, statements live in seed-content JSON and can be blessed without a full reseed.

## Statement source of truth

[`seed-content/christian-secular-bridge.json`](./seed-content/christian-secular-bridge.json)

Each shared group has: `natural-christian`, `natural-secular`, `modified-christian`, `modified-secular`, `commonality`. Unique groups have a single natural.

Containment is a check after drafting, not a method. Do **not** paste commonality sentences into each modified so the attester’s subset rule fires. Draft the modified as that camp’s speech, then check whether it already contains the shared civic claim. The attester **rejects** “concession as implication” when S2’s compromise is not already in S1 (`evaluator.ts`).

## Work log

- [x] This plan file.
- [x] Author seed JSON (8 naturals + 3 triples).
- [x] Rewrite seed JSON off subset-concatenation (2026-08-25): naturals as speech; modifieds keep *why* + limiting principle; commonality last. Live attester: all 6 designed **yes** blessed (high / subset); all 6 designed **no** refused. Script: `npm run gen:seed:christian-secular-implications`. CIDs changed — tiny reseed still needed for the running chain.
- [x] Point `CHRISTIANITY_PLANKS` / `SECULAR_CONSERVATIVE_PLANKS` at the naturals; publish modified+CG as mediator (#8) statements.
- [x] Persona JSON (`data/christian-secular-personas.json`) + driver in `seedChristianityCause.ts`: persona-based signs, 10 projects, mixed natural vs modified alignments, unique-only scripture + colorblind negatives.
- [x] Make `gen:tiny` skip the 12 random `universe.json` statements (`--statement-limit=0`; Christianity/secular + local-food still seed).
- [x] `seedMetadata.test.ts` plank counts 4/4 and 10 projects. Common Table retargeted to `scripture/natural-christian`.
- [x] Nudge batches: Hardhat #8 publishes 6 parent-natural → modified suggestions (`NATURAL_TO_MODIFIED_NUDGES`).
- [x] On-chain implications: local implication attester replays 6 blessed modified→CG arrows (`BLESSED_MODIFIED_TO_COMMONALITY`).
- [x] CauseStarter click-through on the 2026-08-25 tiny seed (no reseed this pass).
- [ ] Optional: align bridge-creator example anchors with these texts later; do not fork a second abortion triple in hidden-majority-patterns.
- [x] CauseStarter **bridge cluster** under #8 (`christian-secular`): two modified rosters + bridge roster + cluster document. Tiny seed publishes it; `--cluster-only` resolves statement CIDs via IPFS (same content as an existing seed) and only republishes the cluster documents.
- [x] Prospective-round content scenario: `Failed to find ProspectiveRoundCreated` was a call to a **no-bytecode** factory address left in `.env` after a chain that never deployed `ProspectiveContentRoundFactory` (empty-account txs succeed with no logs). Seed now skips when `getCode` is empty; SDK `createProspectiveRound` reports missing bytecode instead of a missing event. Local config sync requires `PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS`. 2026-08-25 tiny reseed: open YouTube round `0x147D1dB74c2878E08a6Ac648818421b3d77e90E3`; materialized Substack `0xEa26F3615fd3A84eB5dD24a00E7B4bEc06D63206` → `0xF8ADc47E258b9a56a8E0A717572dB3F1Cb1b4cc4`.

## Still open (resume here)

Optional: align bridge-creator example anchors later. Prospective-round seed is fixed.

**This pairing is a weak first exercise of the implication system (2026-08-25).** Christian × secular-conservative is a real alliance type (groups already close; they agree on the *policy*; they mistrust each other’s *why*). For that pattern the honest commonality *is* just the policy. That is why the prose kept collapsing: slogan-glue, then “I don’t need your reasons,” then “we come from different places,” then the policy twice. Nothing left to peculiar-ize. Fine as a CauseStarter demo of two nearby camps. **Bad as the tiny seed’s only test of modifieds, nudges, and the attester**, which exist to handle a deal one side would not write on their own (overlap-zone compromise, bilateral assurance, unbundling that costs something, a conditional on a fact fight). Locked topic list above mixed those jobs. Do not keep polishing this triple as if more wording will make it a compromise-in-the-middle. Next: either (a) keep Christianity / secular boards and add a *second* cluster that is actually a policy gap (canonical left/right abortion/immigration — reuse hidden-majority-patterns, do not fork a second abortion *wording*), or (b) replace the featured tiny-seed bridge with that gap and keep this pairing as optional later. Uniques (scripture, colorblind) stay useful either way.

**Prose rewrite (2026-08-25).** Draft-order rewrite, then drop coalition-narration. Commonality is the civic conclusion only. Live attester 6 yes / 6 no. CIDs change — tiny reseed still needed if this JSON is what you publish.

**Checker loop for later clusters (and LLM bulk seed).** Do not optimize only for attester bless. For each pair: (1) designed-yes/no vs live attester, (2) routing — would a reasonable signer of S1 be annoyed at being asked to sign S2? If yes and designed implication, good (attester still must bless). If yes but S2 adds a claim another reasonable person would see, that is unreasonable annoyance — keep it a nudge, or put the extra into a modified. If no and you wanted implication, thicken S1. Generate → attester → routing; iterate. Cause-assist `POST /critique-triple` is told to emit `routing:` objections on that test.

## Bridge cluster (2026-08-25)

Hardhat #8 refs:

- Cluster: `/bridge/0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f/christian-secular`
- Modified Christianity: `/cause/0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f/christian-secular-christianity-modified` (3 modified-christian planks)
- Modified secular: `/cause/0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f/christian-secular-secular-conservatism-modified`
- Bridge cause: `/cause/0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f/christian-secular-bridge` (3 commonality planks)
- Six recorded pairs, all `modified-to-bridge` (same as `BLESSED_MODIFIED_TO_COMMONALITY`). Uniques are not in the cluster.

Natural parent pages list the cluster **after this client has opened the cluster URL** (ADR 0011: remember opened citations; no crawl). Fresh browsers still say “No bridges yet” on Christianity/secular until that visit.

`BridgeClusterPage` used to refetch forever (`routeRef` object identity in the load effect). Memoize `parseClusterRouteParams` on `owner`/`slugPart`. Docker/IPFS CauseStarter (`:8090`, `:8088`) still has the old bundle until republished; Vite (`npm run causestarter:dev`) shows the page.

## CauseStarter UI walk (2026-08-25, existing local seed)

CauseStarter at `http://causestarter.localhost:8088/#/`. Hardhat picker works.

**Camp boards (naturals only)**

- Christianity (`#0` / `christianity`): 4 natural planks. Fundable: Common Table, Parish winter warming, Parish marriage-prep, New-language Scripture draft, Campus chaplaincy. **No** first-trimester clinic, **no** colorblind amicus.
- Secular conservatism (`#9` / `secular-conservatism`): 4 natural planks. Fundable: **only** Colorblind admissions amicus. **No** scripture draft, **no** modified-aligned bridge projects. Natural abortion/markets/lgbt planks show 0 projects (alignments sit on modified, not naturals).

**Commonality crossing (modified → CG arrows live; attester `0x021b3C90931CAdDa12C0dCaB0407A622d717b02C` is trusted)**

- Abortion CG (`bafybeihku3omeh5tkiwyvlmvy36ec6fr2vasgw3ld4qqtxtij2oqqydzum`): First-trimester decision clinic **and** Late-term restriction legal brief, both **Indirect**. Signers: 2 indirect (the two modified signers).
- Markets CG: Trade apprenticeship match fund + Local charity effectiveness audit, Indirect.
- LGBT CG: Minors: exploratory care, not a pipeline, Indirect.
- Modified-christian abortion board: clinic **Direct** only (not the secular brief).
- Modified-secular abortion board: late-term brief **Direct** only (not the clinic). MC does not imply MS.

**Unique-only (must not cross)**

- Scripture natural board: Common Table, Scripture draft, Campus chaplaincy. Not on the secular cause board. Hardhat #5 (secular nudge-taker) fundable list has no scripture project. Seed buys/pledges are keyed by project `id` / plank id so secular accounts do not buy scripture-unique work.
- Colorblind amicus: only on the secular unique plank / secular cause. Not on Christianity.

**Persona dashboards**

- Hardhat #1 (christian, takesModified): 8 fundable = camp naturals + MC-aligned bridge projects. No colorblind, no MS-only late-term brief.
- Hardhat #5 (secular, takesModified): 4 fundable = colorblind + MS-aligned + dual LGBT. No scripture unique, no MC-only clinic. Personal “fundable” is the union of **signed** statement boards (direct), not an extra union of implied CG. Crossing for the other camp’s modified-aligned project is on the **CG statement page**, which is the locked implication-direction rule.

**Nudges.** Dashboard still shows no suggestions for subscribers of `#0`. Mediator `#8` published the parent→modified batch; the home “Suggesters” strip is subscribed to `#0`, not `#8`. Not a seed-content bug.

## Resume hints

- Implication evaluator: `@commonality/implication-attester` `evaluateImplicationWithLLM`, needs `OPENROUTER_API_KEY`. Re-run: `npm run gen:seed:christian-secular-implications`.
- Existing Christianity seed: `seedChristianityCause.ts`, `npm run gen:seed:christianity`.
- Plank counts in tests: 4 Christian naturals, 4 secular naturals, 10 persona projects (`test/seedMetadata.test.ts`).
- Content contract: `generateChristianContentScenario` aligned to `scripture/natural-christian`.
