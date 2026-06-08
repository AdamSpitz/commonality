# CSM bridges page

A public, browsable page in the Common Sense Majority (CSM) UI that makes the [hidden-majority patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) *visible*: a gallery of "bridges," each showing two opposed-sounding positions and the common ground they both actually accept. The goal is the "aha" — *you expected these two people to be enemies, and here's the thing they both already agree on.*

This spec is high-level on purpose. The implementer owns the component details; the constraints below are what matter.

## Where it lives

- New page in `ui/src/domains/common-sense-majority/`, e.g. `CsmBridgesPage` (either a new file or added to `CsmPages.tsx` alongside the existing pages).
- Register a route in `ui/src/domains/common-sense-majority/manifest.tsx` (follow the existing `lazyRoute` pattern), e.g. `/bridges`, and add a `primaryNavigation` entry (e.g. label "Bridges").
- MUI components, matching the style already used in `CsmPages.tsx` (`Box`/`Paper`/`Stack`/`Typography`/`Button`). Cross-product links use `getDomainUrl(...)` from `../domainUrls`.

## Data source

Each bridge is a **cluster** of anchor records sharing a `cluster_id`, with one record per `role` (`moderate-left`, `moderate-right`, `common-ground`). Record shape (`BridgeAnchorRecord` in `bridge-creator/src/anchors.ts`): `{ id, cluster_id, role, text, topic_tag, rationale, status, featured, tally_cid, created_at, last_reviewed_at }`.

The page must consume the **featured display set**, NOT all active anchors. Two ways to get it (implementer chooses; **start static**):

- **Static (recommended first):** snapshot `bridge-creator/data/seed-anchors.json` at build time and filter to `status === 'active' && featured === true`. Always renders, no service dependency. This is the right default for a landing/exploration page.
- **Dynamic (later):** `GET {bridge-creator}/anchors?featured=true`, which already returns exactly the active+featured set. Needs the service URL wired in and graceful loading/empty/error states.

Why featured-only: the `active` set is a quality gate that grows unboundedly and accumulates multiple overlapping bridges per topic over time; `featured` is the curated, operator-controlled display set. See the "Featured anchors" section of [bridge-creator.md](./bridge-creator.md).

## Rendering rules

- **Group flat records by `cluster_id`** into bridges. Do not assume the list is pre-grouped or ordered.
- **Guard incomplete clusters:** a cluster may be missing a role (reflection can propose a lone common-ground). A card needs at least the two sides + common ground to make sense; skip or gracefully degrade clusters that aren't complete triples rather than rendering a broken card.
- **Bridge card** is the core component. It should stage the reveal, not just stack three statements:
  - The two side statements (`moderate-left`, `moderate-right`) shown in visual opposition (two columns / left-right cues).
  - The `common-ground` statement as the visual punchline below — emphasized (larger, bordered), the thing the eye lands on.
  - The topic (`topic_tag`) labeled on the card.
  - A call-to-action linking to Tally to sign: `getDomainUrl('tally', '/statements', { fallbackHref: '#' })`.
- **Topic filter:** chips/tabs across the top to filter by `topic_tag` (Abortion / Immigration / Guns / Drugs today). Derive the list from the data, don't hardcode.
- **Honesty framing (required):** these are AI-*synthesized suggested* bridges, not poll results or claims about what any individual believes. A short line near the top should say so and invite signing the version that's actually true for the reader on Tally. The patterns doc is explicit that "putting words in their mouths" must be handled carefully — the page reads as an *invitation*, not an assertion.

## Optional enhancement (nice-to-have, not required)

A **reveal interaction**: each card initially shows only the two opposed side statements with a button like "Find the common ground"; clicking animates in the common-ground statement. This re-enacts the aha (read two opponents → watch the bridge appear). Works fine on static data. Ship the static gallery first; add this if time allows.

## Out of scope

- Live signing counts / indirect-support numbers (Tally owns those; just link out).
- Ordering/ranking among featured clusters (no `display_rank` exists yet; sort by topic or `created_at`).
- Pattern-type taxonomy grouping (anchors carry no `pattern` field yet).
- Any change to the bridge-creator service or anchor schema — the `featured` flag and `?featured=true` endpoint already exist.

## Done when

- A `/bridges` route renders a topic-filtered gallery of bridge cards from the featured anchor set (static snapshot is acceptable).
- Incomplete clusters don't produce broken cards.
- Each card links to Tally to sign, and the page carries the "these are suggested bridges" framing.
- A nav entry points to it. Tests follow the existing `CsmPages.test.tsx` style (render, topic filter, card content, incomplete-cluster guard).
