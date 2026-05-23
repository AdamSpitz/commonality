# Big review before deploying to testnet

(Late May 2026.)

The goal here is to do a giant test run reviewing all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

---

## Review results (2026-05-22)

Tested by Claude (cofounder + intelligent-tester) against a local demo-seeded deployment (`./scripts/data.sh --seed=demo`). Used the `dev-browser` tool to drive a real Chromium browser against all 8 domains.

### Overall verdict

**Not yet testnet-ready.** There is one critical bug that will confuse every user (broken delegation links), one missing page (Tally About), and a real deployment risk around browser caching of SPA index.html. Everything else looks solid. Fix these three things and it's ready to test on testnet.

---

### Critical bugs (fix before testnet)

#### 1. Delegation navigation is broken across all domains — fixed 2026-05-22

Every domain's nav bar had a "Delegation" link that pointed to `http://delegation.localhost:8088/#/` (or the testnet equivalent). But the `delegation` domain is no longer deployed — it was folded into the product domains in commit `b9fc6f1`. So clicking "Delegation" anywhere took users to the admin/landing-page fallback instead of any real UI.

Affected: Alignment, Pubstarter, Content Funding, Tally nav bars. Also the "Set up delegation" secondary-nav link on Alignment went to `delegation.localhost:8088/#/notes/new`.

The current source routes delegation through Pubstarter/Content Funding instead of a standalone Delegation domain, and Pubstarter now owns `/delegation`, `/delegation/notes`, `/delegation/notes/new`, and `/delegation/notes/:noteId`. Rebuilt the UI domain bundles so the local `ui/dist` output no longer contains a stale standalone `delegation` build or hard-coded `delegation.localhost` URLs. Focused UI domain tests confirm Pubstarter owns the delegation routes and navigation points at `/delegation`/`/delegation/notes`.

#### 2. Tally "About" nav link is a 404

The Tally nav bar shows "ABOUT" as the first item, linking to `/#/about`. There is no route registered for this path — it shows "Page not found." Either the route needs to be added or the nav link needs to be removed/corrected.

---

### Real but lower-priority issues

#### 3. Browser caching of stale index.html causes blank pages

When the IPFS bundle is updated (e.g. between two demo seeds or between testnet deploys), users whose browsers have cached the old `index.html` will load an old `index-{hash}.js` that references JS chunks with mismatched content hashes. Those chunks are no longer in the new bundle, so lazy-loaded routes silently fail to render (blank page, no error message visible to user).

Confirmed reproduction: the dev-browser daemon persists browser storage between runs. After a demo re-seed, sub-pages on CSM and Tally showed blank screens because the browser had the old `index.html` cached. The gateway correctly sends `cache-control: no-cache` for the root path, but Chromium was still serving cached responses in practice.

Mitigation options:
- Add explicit `cache-control: no-store` (stricter than `no-cache`) for index.html
- Use a service worker to handle cache invalidation
- Accept this and document it as a known "hard reload required after deploys" issue

First-time users (no cache) are unaffected.

#### 4. "USDZZZ" currency label

Projects in Pubstarter show amounts as "0.32 USDZZZ". This is the dev payment token. On testnet you'll want to deploy with the real USDC (or testnet USDC) and confirm the token symbol displays as expected.

---

### What's working well

**Navigation and landing pages:** All 8 domains load correctly. Landing pages for Commonality, Tally, Pubstarter, Alignment, Content Funding, Civility, CSM, and Conceptspace all render cleanly and the pitch text is coherent and well-written.

**Tally statements:** The statements list loads correctly with real seeded data. Sorting (Most Supporters / Newest) is present. Statement detail pages render correctly including support metrics (direct + indirect), funding portal link, and the content submission form.

**Funding portals:** Funding portal pages load correctly from statement detail pages. They show aligned projects with sort/filter controls, though the demo "Quebec" statement portal has no aligned projects yet (expected).

**Pubstarter projects:** Projects list loads with real demo data including funding progress bars, deadlines, and status labels. Project detail pages render correctly. "Connect your wallet to buy tokens" is the correct unauthenticated state. "Create Project" correctly prompts wallet connection.

**Alignment Explore Causes:** The `/explore` page loads correctly with seeded content-funding-related statements, each with SIGN / NAVIGATE / FUNDING PORTAL actions. The layout is clear.

**Content Funding creators:** Twitter creators list loads with `@civicbuilder` (seeded data). Platform tabs (Twitter/YouTube/Substack) present. Creator channel pages appear to work.

**Civility content browse:** Loads correctly with platform navigation.

**CSM pages:** About, Popular Statements, Nudgers, and Organize pages all work correctly when served with a fresh cache. The nudger page correctly explains CSM nudgers and links to Tally for configuration. The Popular Statements page has reasonable placeholder content with a note that it will link to live Tally statements once curated.

**Tally profile and start-signing:** My Profile correctly prompts wallet connection. Start Signing shows a well-designed onboarding page with a clear three-step path for new users.

**Docs on Commonality:** Vision and Strategy, Founder Pitch, Participate, and all doc sub-pages render correctly. Content is well-written. No broken links found in nav or main CTAs.

**No placeholder text:** No "Lorem ipsum", "TODO", "foo", or obvious placeholder text visible in any page's rendered UI.

**No unhandled console errors:** No JavaScript errors visible on any working page.

---

### Things I couldn't test (wallet required)

Everything requiring a connected wallet was blocked:
- Actually signing a statement
- Creating a project on Pubstarter
- Buying tokens on a project
- Setting up a delegatable note
- Making an alignment attestation
- The full delegation flow (notes, intents, spending)
- Mutable refs CRUD
- Content contract creation

These are core user actions and will need to be tested with a wallet before the testnet launch. The "demo" seed data gives a good baseline of existing objects to interact with.

---

### Suggested fix order

1. ✅ **Rebuild UI bundles** — local `ui/dist` was rebuilt from current source; the stale standalone `delegation` build is gone and `delegation.localhost` no longer appears in the built bundles. Redeploy these rebuilt bundles for testnet.
2. ✅ **Fix delegation routing** — delegation routes are integrated into Pubstarter (and Content Funding) under `/delegation`; focused route/navigation tests pass.
3. **Add Tally `/about` route** — either add the page content or remove the nav link.
4. **Address caching** — at minimum, test in a fresh browser profile against testnet to confirm first-time-user experience is clean.
5. **Currency token check** — confirm USDC symbol appears correctly on testnet.
6. **Wallet-connected smoke test** — manually walk through signing a statement, creating a project, and the delegation flow before calling testnet ready.
