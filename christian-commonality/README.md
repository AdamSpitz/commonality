# Koinonia — Christian vertical (throwaway sketch)

A **standalone, self-contained** landing-page sketch for a hypothetical Christian "vertical" built on Commonality — a Christian front door to [Civility](../docs/end-user/civility/index.md) / [Common Sense Majority](../docs/end-user/common-sense-majority/index.md), deliberately *not* wired into the multi-domain UI.

- **What it is:** one static HTML file (`index.html`), no build step. Open it directly in a browser.
- **Why it exists:** to show a Christian friend and see whether he goes "huh, I bet I could shape this into something cool." See the analysis and framing in [`docs/founder/christian-pitch.md`](../docs/founder/christian-pitch.md) — this page tracks the **second draft** there.
- **Lead idea:** the behavior Civility funds (make your case to people who disagree with you, *with gentleness and respect*, so they can hear it) is something the New Testament already commands — "speaking the truth in love." The page leads with that scriptural grounding and the "listen and engage" vs. "love them" seam; the cross-church coordination idea is demoted to a secondary section.
- **Voice:** recognition over persuasion (per the [CSM copy-voice principle](../docs/founder/csm/)). It assumes the reader already holds the disposition and names the verses that prove it, rather than arguing them into caring.
- **Name:** *Koinonia* (κοινωνία — the NT word for the believers' fellowship *and* their sharing of material goods; shares the root *koinos*, "common," with *Commonality*). Placeholder; a real builder should rename it.

## If it earns a real home

To make it a true vertical, add a domain under `ui/src/domains/` mirroring `common-sense-majority/`: a `manifest.tsx` + `LandingPage.tsx`, then register it in `ui/src/domains/index.ts`, `types.ts` (the `DomainId` union + env switch), and `domainUrls.ts`. Expect to update the cross-domain smoke tests that enumerate domains.
