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
   the middle (canonical left/right abortion or immigration — reuse
   [hidden-majority-patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md),
   do not fork a second abortion wording); costly unbundling; fact-conditionals;
   different-problems-same-solution with first-person limits, not mediator-meta.
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

**Geographic (and topical) parents.** To put every “CSA in X, Ontario”
project on one board, do **not** mint an `any` combinator over known
counties (closed set; a new X never joins). Use the existing implication
rule: the board for S lists projects aligned with any S2 that **implies**
S. Emit the place-specific want *and* the weaker parents you want boards
for:

| Child (strong / nested) | Parent (weak / container) | Rule |
|---|---|---|
| CSA in Grey County, Ontario | CSA in Ontario | narrower geography → broader |
| CSA in Grey County, Ontario | CSA (no place) | conjunction → topical parent |
| CSA in Ontario | CSA (no place) | same |

Wording: child names the nested place **and** the containing region
(“Grey County, Ontario”). Parent is the same want with the nested place
dropped — a location container (“in Ontario”), not “throughout Ontario”
or “every county.” Designed-yes: child → parent. Designed-no: parent →
child. Non-transitive: a Canada board needs Grey → Canada as its own
edge. See
[shaping your cause’s statements](/docs/founder/shaping-your-cause-statements.md)
(inbound arrows populate the board) and the implication-attester
hierarchy / conjunction rules.

**Open (Ask — do not paper over in seed).** Live attester on
`npm run gen:seed:simple-causes-implications`: CSA `more … in Grey` →
`more … in Ontario` blesses; the same shape with farmers' markets
**flips** (hierarchy vs “you did not commit to markets in the rest of
the province”). Seed currently drops `more` on the farmers-market
Ontario parent (`I want farmers' markets in Ontario`) so the check
passes. That is a **workaround**, not the protocol.

Discussed and **not** adopted:

- Teach the attester that `in REGION` always means a container (unless
  S2 says throughout / every). Might be right; not decided.
- Make the attester *more* finicky and prescribe `somewhere in REGION`
  (or drop `more` only on parents). Rejected: `somewhere` marks a *role*
  (parent). Nested geography is a *path* — Grey is both child of Ontario
  and parent of Chatsworth — so a parent-only dialect does not nest.
  Sibling counties (Grey vs Durham) are two children of Ontario, not two
  `somewhere`s on one plank.
- `any` combinator over known counties. Closed set; new X never joins;
  reminting is a new CID. `all` has the wrong arrows for boards
  (outbound, not inbound). Do not use combinators for a location ladder.

Until Adam picks: do not treat the farmers-market existence parent as
the template to copy; do not change the attester prompt; do not mint
geo `any`s. Recheck script: `evaluateSimpleCauses.ts`. Handoff:
[`continuity/2026-08-27-statement-generation.md`](../continuity/2026-08-27-statement-generation.md).

## Gold set

A few dozen hand-accepted examples that the loop must keep passing. New
generation that fails gold is a prompt/process bug, not “more seed.”

Gold for **simple-cause shape** is the current texts in
[`statement-generation-exercises/01-simple-causes.json`](./statement-generation-exercises/01-simple-causes.json)
(Adam, 2026-08-27: viable to sign and to attest alignment; list not complete
for every variation). Live copy: [`seed-content/simple-causes.json`](./seed-content/simple-causes.json).
`loadSeedCollections` still does not read the exercises directory.
Tiny-seed uniques (scripture-in-every-language; colorblind merit) remain a
style target for camp uniques. Designed Grey → Ontario / topical pairs:
`npm run gen:seed:simple-causes-implications`.

## Volume

A few dozen *good* statements still matches the seed-content rationale.
Hundreds of uniques on simple causes is cheap once step 1 works. Do not
mass-generate triples until **one** compromise-in-the-middle cluster survives
attester + routing + “read aloud as a signature” without prose wordsmithing.

## Wiring to production

Mass seed and user-facing cause-assist must share this pipeline so production
cannot drift from what we bless in seed. Next engineering (not this exercise):
refuse to show `/atomize` / `/sharpen-plank` / `/critique-triple` output that
failed the same checks.

## Exercises

| # | Status | What |
|---|---|---|
| 1 | **In `seed-content/simple-causes.json`** (copied 2026-08-27). Gold set still in the exercises file. List not complete. **Geo rollup still open** (see Open section). | Simple causes: wants, earmark grain (kind + place), geographic parents. Designed Grey → Ontario pairs: `npm run gen:seed:simple-causes-implications`. Handoff: [`continuity/2026-08-27-statement-generation.md`](../continuity/2026-08-27-statement-generation.md). |
| 2 | Not started | One left/right abortion or immigration triple through the full loop, compared to the patterns-page canonical wording. |
| 3 | Not started | Gate cause-assist suggestions on the same checks. |
