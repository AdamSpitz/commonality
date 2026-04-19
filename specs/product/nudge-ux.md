# Nudge UX

How nudges surface in the UI, and how we keep them from becoming annoying. This applies to all users, not just new ones.

For the technical architecture of nudgers (batches, smart contracts, trust model), see the [nudger spec](../tech/subsystems/nudger/README.md). This document is about the product/UX side: what the user sees and how they control it.

## The core problem

Nudgers suggest statements: "you signed S1, you might also want to sign S2." This is genuinely useful — it helps users discover relevant content and consolidate around popular versions of statements. But nudges touch on *beliefs*, which means being pushy feels manipulative rather than just annoying. The UX has to respect that.

## Principles

1. **Never interrupt.** Nudges live in places the user has to look to find. They never pop up, never block a flow, never appear as notifications.
2. **Budget the surface area.** Hard caps on how many nudges are visible at once. The user should never feel flooded.
3. **Dismissal is sacred.** If the user dismisses a nudge, it's gone. Permanently.
4. **The user controls intensity.** Default to subtle. Let users turn it up if they want.

## Graduated visibility based on user state

Rather than a binary on/off, scale nudge visibility by how established the user is:

| User state | What they see |
|---|---|
| New (0 signatures) | No nudges. The [explorer](new-user-experience.md) is the entry point instead. |
| Early (1-5 signatures) | A few contextual nudges appear on statement pages the user is already viewing. |
| Established (5+ signatures) | Nudges appear in a dedicated suggestions area, not interrupting other flows. |
| Veteran | Nudges are available but never intrusive. The user knows where to find them if they want them. |

## Surface area budget

Hard caps on how many nudges are visible at once:

- **Per-statement cap:** When viewing a statement you've signed, show at most 3-5 nudge suggestions. Rank by confidence; prefer nudges from different directions rather than 5 minor variations.
- **Global cap:** If there's a "Suggestions for you" page, cap it (e.g., 10 items). The user can ask for more.
- **Staleness decay:** A nudge the user has seen and not acted on should fade in priority over time. Don't keep showing the same suggestion session after session.
- **Dismissal is permanent:** If the user explicitly dismisses a nudge, that specific `(target, suggested)` pair never comes back from that nudger. This is the most important anti-annoyance feature — it gives the user a ratchet to control what they see.

## User controls

The trust model (users choose which nudgers to trust in Settings) is the foundation. On top of that:

- **Nudge intensity preference:** A setting that controls how prominently nudges appear. Default to subtle.
  - Low: only show nudges on statement detail pages, tucked below the fold.
  - Medium: also show a small suggestions panel on the dashboard.
  - High: proactive suggestions, nudge counts in nav.
- **Per-nudger mute:** "Stop showing me suggestions from this nudger" without fully removing trust (maybe you want to re-enable it later).
- **Topic filtering:** "I don't want nudges about topic X." Prevents the system from pushing the user into topics they're not interested in.

## Filtering strategy

Most nudge filtering should be **deterministic and client-side**, not AI-based:

- Don't suggest statements the user has already signed.
- Don't suggest statements very similar to ones the user has already signed or dismissed.
- Prefer nudges toward statements with higher support (the "popular" direction).
- Limit exploration depth (don't suggest things more than 2 implication hops from the user's signed statements).
- Cap per-topic density (don't flood the user with 10 nudges about the same narrow subtopic).

If AI-based filtering is needed, do it at the nudger level (when generating batches), not at the client level. The nudger can be smart about what it publishes; the client applies simple caps and filters.

## What exists vs. what needs to be built

| Component | Status |
|---|---|
| Nudger service framework | Implemented (`nudger-core`) |
| Nudge display in UI | Not built |
| Nudge dismissal / "seen" tracking | Not built |
| Nudge intensity settings | Not built |
| Client-side nudge filtering | Not built |
