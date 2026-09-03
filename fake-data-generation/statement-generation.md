# Generating viable statements (process)

The process is the product. Seed volume is how we prove it. Cause-assist
suggestions only work if they run the same loop, not a nicer prompt.

Wording constraints: [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md).
Checker verbs already live in cause-assist (`/atomize`, `/sharpen-plank`,
`/critique-triple`, `/check-implications`) and the live implication attester.
Do not invent a second prompt stack for bulk seed.

Christianity × secular-conservatism is a real alliance type (same civic
conclusion, different *why*). It is a **weak** first exercise of modifieds /
attester / nudges. Keep those boards as “two nearby camps.” Do not use that
pairing to train generation. Tiny-seed history:
[`christian-secular-tiny-seed.md`](./christian-secular-tiny-seed.md).

Exercises awaiting a human veto live in
[`statement-generation-exercises/`](./statement-generation-exercises/). They are
**not** loaded by `loadSeedCollections` until accepted into
`seed-content/*.json`.

## Split the jobs

| Job | What “good” means | Checker |
|---|---|---|
| **Cause planks (no bridge)** | A person would sign it; a project could be aligned with it; specific enough that implication can fire later | Signability + not-a-slogan + optional plank→weaker-generalization attester |
| **Naturals** | How people actually talk | Signability only. Do not force them to contain the deal |
| **Modified → commonality** | Smallest extra *belief* that still gets a conservative bless *and* a routing “I already said that” | Live attester **and** routing. Bless alone is not enough |

Do not mix “populate CauseStarter boards” and “demonstrate the implication
system” in one cluster.

## Curriculum

Generate in this order. Do not skip ahead to mass triples.

1. **Simple public-goods causes, no bridging.** Mass-generation and the main
   cause-assist path. Topics that already want funding: open-source maintainer
   time, scientific replication / open data, local food, literacy, disease
   research, civic infrastructure. Output: independent planks, no triples.
2. **Easy implication inside one camp.** Close / medium / distant variants
   (`gen:proliferation`). Locks the attester, not bridges.
3. **Real-gap bridges, one hidden-majority pattern at a time.** Compromise in
   the middle (canonical left/right abortion and immigration are accepted, plus crime and LGBT-schools fact-conditionals;
   remaining optional: LGB-vs-T unbundling — reuse
   [hidden-majority-patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md),
   do not fork a second wording of an accepted topic); costly unbundling; fact-conditionals;
   different-problems-same-solution with first-person limits, not mediator-meta.
   Remaining work: [`PLAN.md`](./PLAN.md).
4. **Non-political public-goods bridges** only after 1–3 work. Copyleft vs
   permissive; replication vs novel discovery; privacy vs open data.

Human role: pick **topics and patterns**, not sentences. Reject a cluster when
the gap is “same conclusion, different metaphysics” unless that weaker pattern
is the explicit goal.

## Loop (containment is a check, not a method)

1. Name the gap / pattern, or “no gap — unique plank.”
2. Write naturals as speech (skip for a simple cause).
3. Write modifieds as that person, smallest belief change.
4. Write commonality last; camp *whys* stripped by **omission**.
5. **Attester:** designed-yes must bless; designed-no must refuse.
6. **Routing:** modified→CG should annoy as a suggestion; natural→modified should not.
7. **Shape:** `/critique-triple` (routing, shape, justification leak). Refuse
   subset-by-concatenation, mediator voice, tighter civic restatement as CG.
8. Fail → rewrite the **wrong role** (usually thicken modified, or rewrite CG).
   Never paste CG sentences into modifieds to buy a bless.

Simple causes use `/atomize` → `/sharpen-plank` → optional
`/check-implications` for intended parent/child. Drop meta planks (text about
attestation, the graph, or “a project can be attested as…”).

**Want the outcome, do not classify it.** Exercise 1 failed first-pass because
atomize/sharpen produced “X is a public good” / “material support is a legitimate
way…” — taxonomy, not a signature. Prefer “I want more X”. That is both signable
and a useful alignment target for project P.

**Do not plank the funding mechanism.** “I want people who do X to get paid” /
unpaid nights-and-weekends / “material support for maintainers” is the point of
the system. A project that pays a docs writer aligns with “I want this library
documented,” not with a statement that labor should be paid. Cause-assist
`STATEMENT_QUALITY_GUIDANCE` now says both; if generation still classifies or
asks for pay, the prompt is wrong.

**Earmark grain.** A category want is useful for (a) general support, (b)
advocacy work, (c) delegating $X/month to someone who follows many projects.
Most fire-and-forget money wants something more specific. Grain is a ladder
on **more than one axis**; the useful axis depends on the cause:

- **Kind** (software, and sometimes food): OSS → Linux → Linux desktop;
  Ethereum → Ethereum-based gaming; gardens / CSA / farmers' markets.
- **Place** (especially local public goods): “I want more CSA in Grey
  County, Ontario.” For food this is often the earmark that actually
  directs money.

Atomize should emit the general plank *and* several wants at more than one
grain, including place when the cause is local. Do not treat “Linux” /
“CSA” as the tightest allowed. Seed that is only category-level will look
empty of places to put money.

**Place-specific wants are signable planks, not board queries.** “I want
more CSA in Grey County, Ontario” is a belief someone signs. “I want more
CSA in Ontario” is a different belief, for people who actually hold a
province-wide goal. Do not emit the second as a *parent role* so the first
can roll up onto it.

Nested-place **board** membership is a factual inclusion rule, not
implication. A project publishes **relevant areas** (specific-to-broad
paths such as `Grey County, Ontario, Canada`). A cause board may add
optional `within` (for example `Ontario, Canada`). Matching is suffix
containment; see
[belief implication, board inclusion, and discovery](/specs/product/belief-implication-board-inclusion-and-discovery.md).
Implication still fills boards when S2 genuinely implies S. Geography is
the extra rule so a Grey CSA project can appear on an Ontario CSA **view**
without counting Grey signers as Ontario-wide supporters.

Do **not**:

- Teach or gold-set `more X in nested place` → `more X in containing place`.
- Drop `more` on a wide-place plank to buy a bless (the old farmers-market
  workaround).
- Prescribe `somewhere in REGION` as a parent-only dialect.
- Mint an `any` combinator over known counties (closed set; a new X never
  joins). `all` has the wrong arrows anyway.

Ontario-wide (or unscoped topical) planks stay when they are genuine
wants. They are siblings of the county plank, not machines to pull nested
projects onto a CID. Recheck script: `evaluateSimpleCauses.ts` (designed
**no** for nested-place → containing-place and the reverse). The attester
prompt rejects nested-place rollup; do not treat a bless of Grey → Ontario
as gold, and do not paper over a bless by changing seed wording.

## Gold set

A few dozen hand-accepted examples that the loop must keep passing. New
generation that fails gold is a prompt/process bug, not “more seed.”

Gold for **simple-cause shape** is the current texts in
[`statement-generation-exercises/01-simple-causes.json`](./statement-generation-exercises/01-simple-causes.json)
(Adam, 2026-08-27: viable to sign and to attest alignment; list not complete
for every variation). Live copy: [`seed-content/simple-causes.json`](./seed-content/simple-causes.json).
`loadSeedCollections` still does not read the exercises directory.
Tiny-seed uniques (scripture-in-every-language; colorblind merit) remain a
style target for camp uniques. Nested-place pairs are designed-no:
`npm run gen:seed:simple-causes-implications`.

## Volume

A few dozen *good* statements still matches the seed-content rationale.
Hundreds of uniques on simple causes is cheap once step 1 works. Do not
mass-generate triples until **one** compromise-in-the-middle cluster survives
attester + routing + “read aloud as a signature” without prose wordsmithing.

## Wiring to production

Mass seed and user-facing cause-assist must share this pipeline so production
cannot drift from what we bless in seed. **Gated (2026-08-31):** `/atomize`
drops taxonomy / pay-the-work / slogan / heuristic-safety planks;
`/sharpen-plank` withholds a reword that fails those checks; `/critique-triple`
adds live-attester refusals on modified→bridge as `routing:` objections. See
`cause-assist/src/statementQualityGate.ts`.

## Exercises

| # | Status | What |
|---|---|---|
| 1 | **In `seed-content/simple-causes.json`**. Gold set still in the exercises file. List not complete. Nested-place rollup is board inclusion (settled). | Simple causes: wants, earmark grain (kind + place). Ontario-wide planks are genuine wants, not implication parents. `npm run gen:seed:simple-causes-implications`. |
| 2 | **In [`seed-content/compromise-abortion.json`](./seed-content/compromise-abortion.json)** after Adam accepted it on 2026-08-30. Gold copy remains in the exercises file; canonical wording remains on hidden-majority-patterns.md. Live check (2026-08-28, deepseek-v3.2): both designed-yes arrows bless and all eight designed-no arrows refuse with high confidence; `/critique-triple` returns no objections or leak warnings. Production-default v4-flash stalled rather than returning JSON. | One left/right abortion compromise-in-the-middle triple. Do not fork wording. Not yet the featured tiny-seed cluster. |
| 3 | Done 2026-08-31 | Gate cause-assist suggestions on the same checks (`statementQualityGate.ts`). |
| 4 | **In [`seed-content/compromise-immigration.json`](./seed-content/compromise-immigration.json)** after Adam accepted it on 2026-08-31. Gold copy remains in the exercises file; canonical wording remains on hidden-majority-patterns.md. Live attester (deepseek-v3.2): both designed-yes modified → commonality arrows bless and all eight designed-no arrows refuse with high confidence. | Left/right immigration compromise-in-the-middle triple. Do not fork wording. Not a tiny-seed cluster. |
| 5 | **In [`seed-content/crime-repeat-offenders.json`](./seed-content/crime-repeat-offenders.json)** after Adam accepted it on 2026-08-31. Gold copy remains in the exercises file; canonical wording remains on hidden-majority-patterns.md. Live attester (deepseek-v3.2): both designed-yes modified → commonality arrows bless and all eight designed-no arrows refuse with high confidence. | Left/right crime fact-conditional (repeat-offender concentration). Do not fork wording. Not a tiny-seed cluster. |
| 6 | **In [`seed-content/lgbt-schools.json`](./seed-content/lgbt-schools.json)** after Adam accepted it on 2026-08-31 (commonality wording is his clarification). Gold copy remains in the exercises file; canonical wording remains on hidden-majority-patterns.md. Live attester after the reword (deepseek-v3.2): both designed-yes arrows bless and all eight designed-no arrows refuse with high confidence. | Left/right LGBT schools fact-conditional. Not the Christian×secular unbundle. Do not fork wording. Not a tiny-seed cluster. |
| 7+ | Not started | Optional later: LGB-vs-T coalition unbundling as its own exercise file. |
