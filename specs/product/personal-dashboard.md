# Personal dashboard (projects on statements you signed)

**Status: first slice specified and implemented 2026-08-24** (CauseStarter home
hero). Starring / named subsets remain out of scope.
This is the surface reserved by [cause-page-not-a-club.md](./cause-page-not-a-club.md)
under the names **dashboard** / **my board**. It does **not** reverse
[ADR 0005](../decisions/0005-founder-first-verticals.md) or
[ADR 0009](../decisions/0009-causes-are-publications-over-statements.md).

Related: [composability.md](./composability.md) (the *portfolio* of reserved
capital is a different object — do not conflate), [the jobs](/docs/end-user/causestarter/the-jobs.md),
glossary **Cause board** / **Dashboard**.

## What it is

A derived **fundable-projects board**: the union of projects vouched as
advancing any statement the connected wallet has signed. Same list component
and trust gear as a cause board’s Fundable Projects, keyed by
`signedStatementCids` instead of a roster.

It is the likely **everyday home** for a returning signer. Organizer **cause
boards** remain the acquisition surface (circulated links; no directory).
Spotify analogy from the parent note: playlists vs library.

Copy: “Projects on statements you’ve signed.” Not membership. Not a private
cause. Not a publication.

## What it is not

- **Not a cause board.** No title, slug, ordered planks, Publish, bridges, or
  share-as-flyer URL. Unpublished cause-board drafts stay the organizer
  compose-then-publish path (device `localStorage`). Do not reuse “owner can
  view unpublished, others see nothing” as the personal home.
- **Not the money portfolio** in [composability.md](./composability.md). This
  is landscape (work on claims you already made), not allocation policy over
  reserved capital.
- **Not a privacy product.** Signed statements are already public. The union
  of aligned projects is reconstructable. Do not invent a private roster.
  Optional later filters (pin/hide) may use a wallet MutableRef in the same
  family as `bookmarked-causes`.

## First slice (build this)

1. CauseStarter **home**, when the wallet is connected **or** this device
   already has cause boards: hero is the personal fundable-projects board.
   Organizer drafts and bookmarks stay below (existing **Cause boards**
   section). First-visit **Welcome** remains when disconnected and there are
   no local/bookmarked boards.
2. Reuse `CauseBoard` with `statementCids` = this wallet’s direct beliefs.
   Same starter-network / personal trust filter as other CauseStarter lists.
3. Empty: not connected → connect hint. Connected, no signatures → short
   empty copy (sign from a cause board or statement). Do not mount the list
   on an empty CID set.
4. No new publication, no starring, no named subsets, no dedicated
   `/dashboard` URL unless home embedding becomes too long (then a same-query
   full page is fine; still not a roster).

## Later (do not build yet)

- **Stars / pin-hide** as a *filter on the derived list*, not a new mix
  object. Persist with MutableRef if needed.
- **Named subsets you title and share** are cause boards. Point people at
  **Start a cause board** instead of a third object.
- Overwhelm: first honest answers are trust-gear tightness and/or publishing
  a cause board for the mix you actually watch.

## Home vs cause board

| | Cause board | Dashboard |
|---|---|---|
| Author | Organizer | Derived from wallet signatures |
| Job | Circulate a mix; acquire attention | Return and watch work you already claimed |
| Storage | Roster `(owner, slug)` + CID | None (query). Filters later optional |
| Visibility | Public URL | Reconstructable from public signatures; treat as personal chrome, not a secret |

Founder-first still holds: organizers are the customer for distribution.
Signers stop treating the organizer URL as home.
