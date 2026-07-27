# Koinonia — Christian vertical (throwaway sketch)

A **standalone, self-contained** landing-page sketch for a hypothetical Christian "vertical" built on Commonality, deliberately *not* wired into the multi-domain UI.

- **What it is:** one static HTML file (`index.html`), no build step. Open it directly in a browser.
- **Why it exists:** to show a Christian friend and see whether he goes "huh, that actually seems like it could be useful." See the analysis and framing in [`docs/founder/christian-pitch.md`](../docs/founder/christian-pitch.md).

## The one design rule: examples first, minimum viable explanation

The page is **a list of concrete fundable works, plus just enough context to make sense of it.** Nothing else. Its structure:

1. Short hero — four concrete works and the question *"who has to say yes, today?"* No thesis.
2. **The board: 16 rows in 4 groups of 4** (Build / Serve / Reach people outside the church / Protect what's being lost). One sentence each, plus a plain-English **"why it's stuck today"** line. This is ~70% of the page.
3. Three short points on what the rows have in common.
4. Five steps of mechanism (conditional pledge, delegation, open ledger).
5. One honest block: what's *not* on the list, plus the crypto/AI question and the "this is a sketch" caveats.

**Voice:** recognition over persuasion (per the [CSM copy-voice principle](../docs/founder/csm/)).

## What was deliberately cut — please don't re-add

Earlier drafts of this page failed by being too much at once. Each of these was removed on purpose; the rationale is in [the founder doc](../docs/founder/christian-pitch.md#the-landing-page).

- **The facet tags** (`[scope · deliverable · …]`) — internal generator machinery, never shown to a reader.
- **The Scripture wall** (six verse cards) and the *"listen and engage" vs. "love them"* essay. Good material, preserved in the founder doc's [appendix](../docs/founder/christian-pitch.md#appendix-the-persuade-column-and-civility) — but on the page it swamped the board and made a broad giving pitch look like a narrow [Civility](../docs/end-user/civility/index.md) pitch. The page keeps exactly two verses, as framing, top and bottom.
- **The three-cities section** — founder-facing evidence that the cause generator produces real variation; reads as filler to a first-time reader.
- **The "why it fits the church" feature grid** — its two best points (delegation, open ledger) survive as steps in "how it works."
- **The movement-plumbing rows** (bridge-finder, delegate, auditor), re-entry support, apologetics translation. Cut to hold the board at 16: too meta to picture, or a pure transfer that demonstrates nothing about the mechanism, or a near-duplicate of a stronger row.

**Name:** *Koinonia* (κοινωνία — the NT word for the believers' fellowship *and* their sharing of material goods; shares the root *koinos*, "common," with *Commonality*). Placeholder; a real builder should rename it.

## If it earns a real home

To make it a true vertical, add a domain under `ui/src/domains/` mirroring `common-sense-majority/`: a `manifest.tsx` + `LandingPage.tsx`, then register it in `ui/src/domains/index.ts`, `types.ts` (the `DomainId` union + env switch), and `domainUrls.ts`. Expect to update the cross-domain smoke tests that enumerate domains.
