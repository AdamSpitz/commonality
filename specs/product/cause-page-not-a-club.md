# The organizer publication is a board, not a club

**Status: copy sweep started 2026-08-24.** Adam agreed with this framing on 2026-08-23
and refined the nouns on 2026-08-24. Glossary, high-traffic CauseStarter copy,
Aligning/fundable-projects UI strings, and end-user docs were updated in this
pass. Identifiers, routes, and leftover “cause page” / “funding portal” still lag.
It does **not** reverse [ADR 0009](../decisions/0009-causes-are-publications-over-statements.md):
the object model (immutable statements; a mutable, shareable publication over a
roster of them; verticals as a separate operator role) stays. This note is about
**what we call that publication** and **how important it should feel**.

Related: [causes-as-publications.md](./causes-as-publications.md),
[how-to-convey-this.md](./how-to-convey-this.md),
[glossary](../glossary.md),
[the jobs](/docs/end-user/causestarter/the-jobs.md),
[start a cause](/docs/end-user/causestarter/start-a-cause.md).

## The problem

CauseStarter names the organizer-owned roster a **cause**, on a site named
CauseStarter. That makes the roster feel like *the* thing you join or support.

That is the wrong instinct. The protocol atoms are statements, implications,
alignment vouches, projects, and notes. People sign statements. Projects attach
to statements. Mediators operate at the statement (and plank-pair) level. The
roster is a **named view**: a title, a mix of independent claims, and the union
of work and wording that sits on those claims. Forking the mix is success, not
a schism.

Calling that view “a cause” trains early aggregation: swallow the bundle, join
the movement. The rest of the system exists to avoid that.

## Three things currently named “cause”

| Sense | What it actually is | Keep calling it “cause”? |
|---|---|---|
| Ordinary English | The worldly thing you care about (clean water, the block party, not being defunded) | **Yes** — motivation, not an entity |
| Glossary Part 1 | A **statement** in its role as a funding anchor (`causeCid` is a statement CID) | **Yes** as a *role*, not a separate ID |
| CauseStarter roster | Versioned publication `(owner, slug)` → title, summary, ordered planks | **No** — this is the over-weighted one |

The rename below is meant to **shift “cause” toward the first two senses**. A
cause board can be for **multiple** causes (several statements-as-anchors, or
several worldly aims on one page). It is not rigidly “one cause object.”

## Two-step rename (do this in order)

**Today (glossary, 2026-06-12):** **cause board** = the fundable-projects
dashboard (heading **Fundable Projects**), including leftover “funding portal”
copy. Code still says `fundingportal*`.

**Step 1 — free the name.** Rename that surface to **fundable-projects
board** (hyphenate in running text the same way: fundable-projects board).
Identifiers, routes, and directories may lag (`fundingportal*` stays until a
later code pass). Heading can stay **Fundable Projects**.

**Step 2 — reuse “cause board” for the organizer publication.** The thing at
`/cause/:owner/:slug` (today often “cause page” / “a cause”) becomes the
**cause board**: the shareable mix — title, planks, bridges, pledges, and a
**fundable-projects board** as the centerpiece (inlined summary and/or a
link to the full list).

Do not go overboard replacing leftover **cause page**. That phrase is fine as
a synonym for the same URL. Prefer **cause board** in new copy.

There isn’t a huge visual difference: the fundable-projects board is already
the centerpiece of the cause board, and the cause board already links to it
(and may summarize it). The cause board also includes other jobs — especially
**bridges** — so the two names are not interchangeable.

Do **not** call either surface a **dashboard**. That word stays reserved for a
future personal view (“projects aligned with statements I signed”).

## What to call the surfaces

| Surface | Job | Noun (after the sweep) |
|---|---|---|
| Statement / plank | The thing you sign; projects attach here | **statement** / **claim** / **plank**. A statement *plays the cause role* when it is a funding anchor |
| Fundable-projects list | Aligned work you might fund | **fundable-projects board** (today still “cause board” in many files) |
| Organizer publication | Shareable mix + centerpiece list + bridges etc.; flyer URL | **cause board** (fine leftover: **cause page**) |
| Personal view | Projects aligned with *my* signed statements | **dashboard** / **my board** — [personal-dashboard.md](./personal-dashboard.md) |

User-facing verbs for the publication: *publish a board*, *start a board*,
*look at this board* — or keep *start a cause* in the English sense (“start
funding this worldly aim”) without implying membership. Never *join a cause*,
*members of this cause*, *support this cause* as if the mix were the funding
target.

Do **not** rename the product off CauseStarter in the same pass. “Starter” can
mean “you start funding toward a cause (English)” without implying the roster
is the movement.

## Thin ontologically, not thin for adoption

The board is not protocol-fundamental. It **is** go-to-market-fundamental.

Founder-first ([ADR 0005](../decisions/0005-founder-first-verticals.md)) makes
the organizer the customer. Almost everyone arrives via a circulated link;
there is no directory. The cause board is the **distribution handle**: title,
curated planks, mediator blurb, a stable URL. Organizers still do real
editorial work (retrieval, rejecting bad hits, publishing exact CIDs,
circulating, inviting bridges). Call it a board so it is a watch/fund
surface — not a club, and not a bookmark folder.

Late aggregation still needs **attention** aggregation. It must not aggregate
**identity**. The board is a frame for attention.

Analogy: Spotify playlists vs your library. Playlists are how music spreads;
you do not join a playlist. The personal dashboard is the returning-user loop;
organizer cause boards remain the acquisition surface.

## Personalized dashboard

A “projects on statements I signed” surface is the likely everyday home. It
does not replace organizer cause boards. You encounter a mix, sign the planks
you mean, then live on your own union. That personal surface can also span
**multiple causes** (several statements you signed). Spec and first slice:
[personal-dashboard.md](./personal-dashboard.md). Do not implement it as an
unpublished cause board.

## What not to do

- Do not rename the publication **dashboard**. That is a private updating
  screen; it does not explain a shareable URL or organizer authorship; it
  collides with the personal surface.
- Do not demote the board so hard that organizers think they are making a
  bookmark folder, or that attention needs no frame.
- Do not reverse ADR 0009’s split (statement vs publication vs vertical).
  Only stop using bare “cause” as the *name of the publication* in copy.
- Do not sweep **cause page** → **cause board** everywhere; prefer the new
  term going forward.
- Do not skip step 1. If you call the publication a cause board while the
  fundable-projects list is still called a cause board, the glossary is worse
  than today.

## Sweep status (copy 2026-08-24; identifiers later)

1. **Fundable-projects board:** done in UI copy, end-user docs, glossary Part 1
   and Part 2 §5. Code `fundingportal*` / `/portal/:statementCid` still lag.
2. **Cause board** = organizer publication: done in glossary, CauseStarter home /
   list / editor chrome (“Cause boards”, “Start a cause board”, bookmarked
   boards), and high-traffic docs. Leftover “cause page” in comments and
   incidental copy left on purpose. Identifiers (`/causes`) still lag.
3. Later: identifiers (`/cause/:owner/:slug` can lag). Contract names stay.
   Bridge-cluster terms (natural / modified / bridge cause) still mean
   *publications* in the compound; separate pass.

New copy should keep following this note: if you must name the fundable-projects
list, say **fundable-projects board**; if you must name the organizer URL,
prefer **cause board**.
