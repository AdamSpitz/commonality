# Big review before deploying to testnet

(May 2026.)

The goal here is to do a giant test run reviewing all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

---

## Cofounder / Intelligent Tester Review — 2026-05-07

**Tested against:** local demo deployment (`./scripts/data.sh --seed=demo`), all 9 IPFS-hosted domains at `http://<domain>.localhost:8088/#/`.

**Testing method:** Used `dev-browser` (headless Chromium) to visit each domain, navigate inner pages, capture screenshots, and check console errors and page content.

---

## Summary verdict

**Not ready for testnet yet.** There are two significant functional bugs that need to be fixed:

1. **Amount display regression** — funded amounts shown on Pubstarter are completely wrong (e.g. "96000000000.096 USDZZZ" instead of "0.096 USDZZZ"). This is a regression in the current IPFS build, likely introduced by the recent payment-token decimals refactor.

2. **Alignment attestations not showing in UI** — on-chain data confirms multiple `AlignmentAttestation` events exist (seeded correctly), but ALL project detail pages show "No alignment attestations yet." This means a core platform feature (cause → project discovery via portals) is silently broken.

Both bugs need to be fixed before testnet. The rest of the app looks surprisingly good.

---

## What works well

- **All 9 domains load** — Commonality, Pubstarter, Alignment, Delegation, Tally, Content Funding, Civility, CSM, Conceptspace all render their landing pages correctly with appropriate H1s and copy.

- **Navigation is correct** — nav items route to the right pages; cross-domain links (e.g. "Statements on Tally", "Open Pubstarter") point to the right local URLs.

- **Tally Browse Statements** — displays real seeded statement data. 200+ statement cards with supporter counts, sorted by most supporters. Clicking a card navigates correctly to the individual statement page.

- **Tally statement detail** — shows statement text, "3 supporters / 3 signers / 0 indirect supporters" metrics, funding portal link, high-profile supporters section. Clean and functional.

- **Tally funding portal** — `/portal/:cid` loads correctly with the statement text, funding summary, and sort/filter controls. Shows "No aligned projects" when none exist. "VIEW LEADERBOARD" button works.

- **Pubstarter project list** — shows real seeded projects with sort by newest/deadline/most funded/closest to goal and status filters. Projects have correct status labels (Funding, Succeeded, Ended).

- **Pubstarter project detail** — contributor leaderboard, project description, recipient address with copy button, channel/content info all display correctly (when amounts are correct — see bug below).

- **Alignment /explore** — shows seeded Explorer/Nudger curated content organized by topic area (Content Funding, etc.) with real statements and SIGN / NAVIGATE / FUNDING PORTAL actions. Looks good.

- **Content Funding browse** — lists content channels and contracts correctly.

- **Delegation landing** — clean, sensible copy, correct nav.

- **All landing pages** — no `#` placeholder links (all links go somewhere), no Lorem Ipsum, no "TODO" text visible.

- **Alignment portal (fresh load)** — works correctly when loaded without browser cache issues.

---

## Bug 1 (Significant): Amount display regression — wrong funded amounts

**Symptom:** Project list and project detail pages show corrupted amounts: "96000000000.096 USDZZZ / 1 USDZZZ" instead of "0.096 USDZZZ / 1 USDZZZ". Progress percentages are similarly wrong: "9600000000010%" instead of "9%".

**Scope:** Affects all projects with non-zero contributions. Projects with 0 raised show correct amounts. The contributor leaderboard on the same page shows correct values (0.048 USDZZZ per contributor).

**Pattern:** The displayed amount looks like the raw 6-decimal integer value concatenated with the properly-formatted decimal string: `96000` + `000000` + `.096` = `96000000000.096`. This suggests a double-conversion or string-concatenation bug in how the total raised is formatted.

**Root cause hypothesis:** Likely introduced in the 2026-05-07 "Demo seed payment-token funding fix" that switched fake-data to use `PAYMENT_TOKEN_DECIMALS` (6 decimals). Something in the UI's payment-token amount reading path (`usePaymentTokenCurrency`, `formatErc20TokenAmount`, or the project fold state) is mishandling 6-decimal tokens.

**What worked before:** The stale browser-cached version of the Pubstarter build (built before this change) showed correct amounts: "0.096 USDZZZ / 1 USDZZZ — 10%". So this is definitely a regression.

**Evidence screenshot:** `pubstarter-browse-direct.png` (in dev-browser tmp).

---

## Bug 2 (Significant): Alignment attestations invisible in UI

**Symptom:** Every checked project shows "No alignment attestations yet" under "Project Endorsements". Funding portals consistently show "0 Aligned Projects".

**Chain data says otherwise:** The Ponder indexer contains multiple `AlignmentAttestation` events for real project addresses. For example, project `0xD79aE87F2c003Ec925fB7e9C11585709bfe41473` ("Community Mental Health Access Fund") has a corresponding on-chain attestation event, but its detail page says "No alignment attestations yet."

**Impact:** This breaks the most important user-facing flow in the platform:
  1. User wants to fund a cause → goes to Alignment Explore → clicks "Funding Portal" → sees 0 projects
  2. Project creator attests alignment with a cause → doesn't appear on the portal
  3. The core value proposition (cause-aligned crowdfunding with transparent attestation) is invisible

**Root cause hypothesis:** The client-side fold (SDK) is likely not correctly decoding or matching the `AlignmentAttestation` events. Possibly a mismatch between how statement CIDs are stored on-chain (as topic3 bytes32 hash) and how the SDK looks them up. Could also be related to the recent `AlignmentRevoked` event change (L-01 fix added `topicStatementId`) that may have shifted the ABI or event layout.

---

## Bug 3 (Minor): Browser cache / immutable headers on index.html

**Symptom:** The local IPFS gateway serves `index.html` with `cache-control: public, max-age=29030400, immutable`. After a rebuild, browsers with cached old `index.html` (referencing old chunk filenames) get 404s on all dynamically-imported chunks, resulting in a blank white page.

**Observed:** The dev-browser had cached a stale `index.html` for the Alignment domain; navigating to `/portal/...` rendered an empty page with 23 failed chunk requests.

**Testnet concern:** This will affect real users. Any rebuild after the initial testnet deploy will break the experience for anyone who visited before, until their cache expires (~337 days). Standard fix is to serve `index.html` with `cache-control: no-cache` or a short `max-age`, while keeping `immutable` for the asset files (which are content-addressed and truly immutable).

---

## Minor observations

- **"0 ETH" labels on funding portals** — The portal header shows "Total Funding Raised: 0 ETH / Funds from Delegates: 0 ETH" even on Alignment which uses USDZZZ. Should probably use the payment token symbol or just show the number.

- **Statement detail H1 is "Statement"** — The page heading is just "Statement" (generic); the actual statement text is in a card below. Not wrong, but feels slightly impersonal. Minor.

- **Seed statement quality** — The top-sorted statement "I support either 'Campaign donations are free speech...' or 'If rehabilitation programs actually reduce recidivism...'" looks like an odd OR-statement. May be a seed data artifact rather than a real user statement pattern. Worth reviewing the seeded statement corpus for quality.

- **Tally /about URL** — The nav link label is "About" but it routes to `#/docs`, not `#/about`. There's no `#/about` route. This is technically fine (About = Docs is a reasonable mapping) but slightly unexpected.

- **Pubstarter Start a Project page** — Correctly shows "Connect your wallet to create a project." for unauthenticated users. Good first-run behavior.

- **All project descriptions appear to be seed content** — "Seed content-funding contract for Smart Writer", "Seed content-funding contract for Practical Policy Lab", etc. These are clearly dev/seed labels. For testnet demo purposes this is probably fine but worth noting.

---

## Flows not tested (limitations)

- **Wallet connection and signing** — Could not test because no real wallet available in dev-browser. The entire signed-in experience (signing statements, buying tokens, creating projects, setting up delegation) is untested here.
- **Delegation flow** — Could not test creating/managing delegatable notes without a wallet.
- **Content creator verification flows** — Twitter/YouTube/Substack channel verification requires real credentials.
- **Secondary market** — Could not test token resale without a connected wallet.
- **Trust network / Subjectiv** — Requires signed-in users to set trust scores.
- **Explorer "Navigate" button** — Clicking "Navigate" on Alignment Explore items was not tested end-to-end.

---

## Before testnet: recommended action items

**Must fix:**
1. Fix the amount display regression in the payment token formatting code (Bug 1)
2. Fix alignment attestations not appearing in the UI (Bug 2)

**Should fix:**
3. Serve `index.html` with `no-cache` header from the local IPFS gateway (and plan this for testnet hosting too)
4. Replace "0 ETH" with the actual payment token symbol in portal funding summary

**Nice to have:**
5. Review seeded statement corpus — some statements look like OR-statements or odd phrasing
6. Add a real wallet-connected test run (even manually by the founder) before testnet launch
