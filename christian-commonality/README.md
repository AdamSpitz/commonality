# Koinonia — Christian vertical (throwaway sketch)

A **standalone, self-contained** landing-page sketch for a hypothetical Christian "vertical" built on Commonality, deliberately *not* wired into the multi-domain UI.

- **What it is:** one static HTML file (`index.html`), no build step. Open it directly in a browser.
- **Why it exists:** to show a Christian friend and see whether he goes "huh, that actually seems like it could be useful." See the analysis and framing in [`docs/founder/christian-pitch.md`](../docs/founder/christian-pitch.md).

## The design rules

**One: say what it is, then show the mechanism, before the list.** The reader arrives
asking "what is this and what are you asking of me?" — not "who has to say yes today?",
which is the founder's framing device, not his question.

**Two: one example told properly beats sixteen skimmed.** The worked example (the 1889
church, the organ, the four thousand people who can't find each other) does the
argument. The board is corroboration.

**Three: recognition over persuasion** — per the
[CSM copy-voice principle](../docs/founder/csm/pitching-reference.md).

Structure:

1. **Hero** — the gap ("too big for one church, too small for an institution"), then the
   conditional pledge in the reader's own voice: *"I'll put in $200 — if enough others do."*
2. **One worked example**, ~150 words, landing on *"Nobody said no. There was just never
   a way to say yes together."*
3. **How it works** — three steps, plus two asides (delegation; "nobody agrees to
   anything but the work").
4. **The board: ten rows in four groups**, one sentence each plus a **"why it's stuck"**
   line, closing with a callback to the organ.
5. **The honest block** — what's *not* on the list, the crypto/AI question, three caveats.
6. Close on 2 Cor 8:14 and Paul's collection.

## What was deliberately cut — please don't re-add

Every draft of this page has failed by being too much at once. The rationale for each cut
is in [the founder doc](../docs/founder/christian-pitch.md#the-landing-page).

- **Rows 11 through 16.** The board was 16; past about ten near-identical cards the
  reader stops reading and starts skimming, and the sixteen "why it's stuck" lines were
  sixteen restatements of two ideas. Rows that ship are marked 🟢
  [in the founder doc](../docs/founder/christian-pitch.md#what-would-actually-be-on-the-board).
- **The facet tags** (`[scope · deliverable · …]`) — internal generator machinery, never
  shown to a reader.
- **The Scripture wall** (six verse cards) and the *"listen and engage" vs. "love them"*
  essay. Good material, preserved in the founder doc's
  [appendix](../docs/founder/christian-pitch.md#appendix-the-persuade-column-and-civility)
  — but on the page it swamped the board and made a broad giving pitch look like a narrow
  [Civility](../docs/end-user/civility/index.md) pitch. The page keeps exactly two verses,
  top and bottom.
- **The three-cities section** — founder-facing evidence that the cause generator
  produces real variation; reads as filler to a first-time reader.
- **The "why it fits the church" feature grid** and the three-point "what they have in
  common" section — their content is now carried by the worked example and the two asides
  under "how it works."
- **Founder-speak and in-jokes**: "read it as a menu of shapes, not a plan," "the
  Areopagus, crowdfunded."

**Name:** *Koinonia* (κοινωνία — the NT word for the believers' fellowship *and* their sharing of material goods; shares the root *koinos*, "common," with *Commonality*). Placeholder; a real builder should rename it.

## If it earns a real home

To make it a true vertical, add a domain under `ui/src/domains/` mirroring `common-sense-majority/`: a `manifest.tsx` + `LandingPage.tsx`, then register it in `ui/src/domains/index.ts`, `types.ts` (the `DomainId` union + env switch), and `domainUrls.ts`. Expect to update the cross-domain smoke tests that enumerate domains.
