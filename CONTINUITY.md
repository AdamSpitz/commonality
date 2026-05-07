# Continuity notes for ephemeral AI instances

## 2026-05-07 — DelegatableNotes purchase shares refactor

- User asked to implement the `DelegatableNotes.sol` TODO: remove parallel delegated-note purchase APIs, remove multi-token delegated-note purchases, and use explicit purchased-output shares instead of proportional payment splitting/remainder checks.
- Implemented `PurchaseShare { noteId, chain, shares }` in `hardhat/contracts/delegation/DelegatableNotes.sol`. `shares` is the exact number of purchased ERC1155 units allocated to that note/chain; delegated-note primary/secondary purchases now require one token ID per transaction and `sum(shares) == count`.
- Removed `purchaseFromPrimaryMarketWithSplits` / `purchaseFromSecondaryMarketWithSplits`; clean Solidity functions are now `purchaseFromPrimaryMarket(PurchaseShare[], primaryMarket, erc1155Contract, tokenId, count)` and `purchaseFromSecondaryMarket(PurchaseShare[], secondaryMarket, saleListingId, tokenCount)`.
- Payment consumed per note is derived as `requiredPayment * shares / count`, with exact-divisibility checks; ERC1155 output notes are created directly with `amount = shares`, so no arbitrary rounding recipient remains.
- Updated SDK wrapper types/calls, regenerated SDK/indexer ABI snapshots, updated UI note-funded purchase flows to send `purchaseShares`, and made Pubstarter note-funded buys reject multiple token types in one transaction.
- Updated hardhat, UI, integration-test, e2e, and fake-data-generation callers/tests.
- Removed the completed `TODO.md` item.
- Checks passed: targeted Hardhat DelegatableNotes audit/purchase tests; `npm run test:fast`; `npm run build`; `npm run lint` (Slither still reports unrelated existing informational findings around ChannelRegistry shadowing, missing inheritance, and unindexed event addresses, but no new divide-before-multiply finding after the final arithmetic tweak).

## 2026-05-06 — Bookmarkable local UI admin page

- User asked for an easy bookmark page with links to all nine stable local domain URLs.
- Renamed/enhanced the local UI gateway root page as a local admin page and documented `http://localhost:8088/admin` in local-development docs and `ui/README.md`.
- The gateway already serves this admin link list for unmatched hosts/paths; domain hosts still proxy to the IPFS bundles.

## 2026-05-06 — Local stable UI gateway for IPFS domain bundles

- User chose the local gateway/reverse-proxy approach first, with the same pattern planned for testnet later.
- Added `scripts/local-ui-gateway.mjs` and a `ui-local-gateway` docker-compose service on port 8088. It maps `http://<domain>.localhost:8088/#/` to the latest CID in `data/ui-ipfs/<domain>/cid.txt` and proxies to the local Kubo gateway.
- Updated IPFS publishing to emit `stable-url.txt`/`metadata.stableUrl` and to default cross-domain `VITE_*_URL` values to the stable local hostnames during local publisher builds.
- Updated `services.sh --url` and local docs to present stable URLs; `TODO.md` now leaves only the testnet version of this strategy.
- Important fix: `ui/vite.config.ts` now includes process env in generated `config.json` (whitelisted keys only), so env passed by publisher containers is captured in runtime config.
- Checks passed: `node --check scripts/local-ui-gateway.mjs`, `node --check scripts/publish-ui-to-ipfs.mjs`, `docker compose config --quiet`, and `npm run ui:build` (existing Rollup/Privy annotation/chunk-size warnings).

## 2026-05-06 — Smart-contract audit fixes implemented

- User asked to implement fixes from `workflow/reviews/smart-contract-audit-2026-05-06.md`, with the one discussion-needed item moved to `TODO.md`.
- Implemented H-01 by gating third-party content-funding success: `CancellableCondition` now consults `ChannelRegistry.canThirdPartyContractSucceed(channelId)`, which only becomes true after the creator has taken channel control and the veto window has elapsed. This lets creators veto during the window even if the funding threshold was reached earlier.
- Implemented M-01 mitigations: `CreatorAssuranceContractFactory` now has `thirdPartyMaxDuration` (default 7 days) and rejects third-party deadlines beyond it; docs now call out meaningful `thirdPartyMinPurchase` configuration and standard-token assumptions.
- Implemented L-01: `AlignmentRevoked` now includes `topicStatementId`; updated hardhat tests and SDK/indexer ABI snapshots.
- Implemented part of L-02: `verifyChannel` rejects zero-address claimants. I did not require caller == claimant; `_msgSender()` only becomes meta-tx-aware if the contract opts into an ERC2771-style context, so this should be decided deliberately before disabling relayed/third-party proof submission.
- Added `TODO.md` item for M-02 DelegatableNotes scarce ERC1155 output allocation, per user request.
- Checks passed: `npm run test --workspace=hardhat`; `npm run build` (with existing UI Rollup/Privy annotation and chunk-size warnings); `npm run lint --workspace=hardhat` (Slither reported existing-style informational findings but exited successfully).

## 2026-05-06 — Pre-testnet review fixes/TODO triage

- User asked to read `workflow/reviews/before-testnet.md` and either implement fixes or write TODOs.
- Implemented three small UI/code fixes:
  - Pubstarter SDK queries now read assurance-contract/marketplace `paymentToken()` plus ERC-20 `symbol()`/`decimals()` when a public client is available, so project/token/contribution/secondary-market currency display is no longer hardcoded to ETH (falls back to ETH if chain reads are unavailable).
  - Threshold-zero / open-ended projects now display “No minimum” and omit the misleading 0% progress bar in project cards, headers, and aligned-project cards.
  - Project headers truncate recipient addresses and add a copy-recipient button.
- Also switched several Content Funding read-only funding displays to use the project funding currency when available.
- Added TODOs for larger pre-testnet work: stable cross-domain URL strategy, Explorer/Alignment curated fixtures, seed alignment attestations, and remaining form-label currency cleanup.
- Checks passed: `npm run build --workspace=sdk`; targeted UI Vitest for changed components/pages; `npm run build --workspace=ui` (with existing Rollup/Privy pure-annotation and chunk-size warnings).


## 2026-05-06 — Landing-page links made non-placeholder

- User asked to go through landing-page links and make sure each one goes somewhere, implementing small missing pages/features where reasonable.
- Removed `#` placeholder links from landing pages.
- Added small destination pages/routes:
  - Commonality `/participate` for “How can I participate?”
  - Alignment `/explore` for “Explore causes”
  - Content Funding `/content/new` and `/explore` for starting content contracts / exploring content criteria
  - Civility `/filters`, `/popular-statements`, and `/nominate`
  - CSM `/popular-statements`
  - Delegation `/supported-sites` as a fallback destination for supported-site links
- Updated Conceptspace landing repo actions to real GitLab monorepo subdirectory URLs.
- Updated landing/domain route smoke tests, including an assertion that landing-page links are no longer `#` placeholders.
- Checks passed: targeted Vitest (`CrossDomainSmoke`, `domainRoutes`, and landing tests before the final test tightening), targeted Vitest re-run for `CrossDomainSmoke` + `domainRoutes`, and `npm run build --workspace=ui` (with existing Rollup/Privy annotation and chunk-size warnings).


## 2026-05-06 — Landing pages synced to UI-domain product copy

- User asked to reread `specs/product/ui-domains.md` and update the nine domain landing pages to match the current title/description/spotlight/section/action wording.
- Updated landing pages for Commonality, Pubstarter, Alignment, Delegation, Content Funding, Civility (`noninflammatory`), CSM, and Conceptspace. Tally already matched the spec copy and has no concrete action in the spec yet.
- Added/updated hero actions where the product spec listed actions; cross-domain actions use `getDomainUrl(..., { fallbackHref: '#' })` where the destination lives on another domain or is not wired yet.
- Updated domain smoke and landing-page tests to assert the current product-spec wording/actions.
- Checks passed: targeted Vitest (`npm run test:vitest --workspace=ui -- src/domains/commonality/LandingPage.test.tsx src/domains/noninflammatory/LandingPage.test.tsx src/domains/content-funding/LandingPage.test.tsx src/domains/csm/LandingPage.test.tsx src/domains/CrossDomainSmoke.test.tsx`) and `npm run build --workspace=ui` (with existing Rollup/Privy annotation and chunk-size warnings).


## 2026-05-05 — Delegation UI domain split complete

- User asked to split delegation-system UI out of Alignment into its own `Delegation` UI domain, based on `specs/product/ui-domains.md`.
- Product/spec/docs updates made:
  - `specs/product/ui-domains.md` now treats Delegation as its own site and removes delegation-management ownership from Alignment/Conceptspace wording.
  - `specs/tech/ui-domains.md`, `specs/tech/README.md`, `ui/README.md`, `workflow/local-development.md`, `workflow/BUILD.md`, `workflow/deployment.md`, `TODO.md`, and `docs/common-sense-majority/README.md` updated from eight/six to nine domains where relevant.
  - Historical `specs/product/ui-domains-may5.md` was adjusted to say Delegation was later split out, rather than rewriting the whole historical note.
  - User-facing delegate docs now direct people to Delegation instead of telling them to open Alignment's old My Notes routes; subsystem UI docs note that note-detail links are cross-domain.
- UI implementation made:
  - Added `ui/src/domains/delegation/` with `LandingPage.tsx` and `manifest.tsx`; owns `/notes`, `/notes/new`, `/notes/:noteId` and has delegation feature flag true.
  - Removed `/notes*` routes from Alignment; Alignment now owns root + `/portal/:statementCid` routes and links to Delegation for donor-delegate setup.
  - Added `delegation` to `DomainId`, domain registry, domain URL helper/runtime config (`VITE_DELEGATION_URL`), Vite domain resolver, build-domain script, deploy script, publish script, Docker build planner, docker-compose publisher service, and `scripts/services.sh` domain loops/service lists.
  - Updated Commonality compatibility `/notes/*` target to Delegation; added cross-links from Commonality/Pubstarter/Content Funding where appropriate.
  - Updated funding portal and Pubstarter components so cross-domain delegation links use `getDomainUrl('delegation', ...)` instead of assuming local Alignment `/notes*` routes.
  - Updated domain smoke/route/url tests and affected component tests.
- Checks run and passed:
  - Targeted Vitest: `npm run test:vitest --workspace=ui -- src/domains/CrossDomainSmoke.test.tsx src/domains/domainRoutes.test.tsx src/domains/domainUrls.test.ts src/domains/commonality/LandingPage.test.tsx src/delegation/components/AvailableDelegatableFunding.test.tsx src/fundingportal/components/DelegatableNotesSection.test.tsx src/pubstarter/components/BuyTokensSection.test.tsx` (passed; expected stderr from tests that intentionally exercise error paths).
  - `npm run typecheck --workspace=ui` passed.
  - `bash -n scripts/services.sh`, `bash -n scripts/deploy-ui.sh`, `node scripts/docker-build-plan.mjs list ui-ipfs-publisher-delegation`, and `docker compose config --services | grep -x ui-ipfs-publisher-delegation` passed.
  - `VITE_DOMAIN=delegation npm run build --workspace=ui` passed with existing Rollup pure-annotation/chunk-size warnings.
  - `npm run build:domains --workspace=ui` passed with the same existing Rollup warnings.
- Completion pass:
  - Inspected status/diff for overreach.
  - Searched active docs/code for stale “eight domains” / “six domains” / “Alignment owns delegation” wording; remaining matches are historical notes or intended cross-domain references.
  - Task is complete; no known blockers.

## 2026-05-05 — May 5 UI-domain reshuffle completion pass

- Completed the May 5 UI-domain reshuffle checklist in `specs/product/ui-domains-may5.md` after re-reading founder-level docs, user-level docs, `specs/README.md`, and `specs/product/ui-domains.md`.
- Product/copy fixes: reduced overstuffed hero CTAs on Tally and the CSM organizing page to the two-CTA rule; fixed stale Content Funding copy that still described escrow/payout mechanics as “Commonality” rather than Pubstarter-style content contracts; updated affected landing-page tests.
- Verified active docs/UI no longer use “built on Commonality” for specific downstream dependencies; only historical reshuffling notes still contain that language.
- Checks passed: targeted domain Vitest (`CrossDomainSmoke`, `domainRoutes`, `domainUrls`, Commonality/Content Funding/Noninflammatory/CSM landing tests), `npm run typecheck --workspace=ui`, `npm run build:domains --workspace=ui`, and `npm run build:ipfs:domains --workspace=ui` (with existing Rollup dependency annotation/chunk-size warnings).
- Manual/static smoke checks: used temporary Playwright scripts (removed afterward) to visit all eight local Vite domain roots and all eight static IPFS/hash-router build roots, checking H1s, nonblank links, and console/page errors.
- Updated `TODO.md` to mark the UI-domain split item done.

## 2026-05-04 — Per-site docs task 3: Conceptspace developer docs route

- Completed TODO.md per-site docs item 3.
- Added `docs/conceptspace.md`, a developer-facing Conceptspace docs entry point linking to the existing subsystem specs, SDK API docs, contract docs, and implementation package READMEs.
- Wired Conceptspace `/docs` to redirect to `/docs/conceptspace`, added `/docs/*` via the shared `DocsPage`, enabled `features.docs`, and added `Developer Docs` to the Conceptspace primary nav.
- Updated the Conceptspace landing-page docs CTAs and the relevant DocsPage, domain route, and cross-domain smoke tests.
- Marked TODO.md item 3 as done.
- Verification: `npm run test:vitest --workspace=ui -- src/domains/domainRoutes.test.tsx src/domains/CrossDomainSmoke.test.tsx src/docs/DocsPage.test.tsx` passed; `npm run build --workspace=ui` passed (with existing Rollup/Privy annotation and chunk-size warnings). An earlier attempted `npm run test --workspace=ui -- --run ...` ran the Vitest suite successfully but then failed in Playwright because those arguments were not E2E test files.

## 2026-05-04 — UI domains reshuffle task 11: documentation/spec cleanup

- Completed Task 11 (the final task) from `ui-domains-reshuffling.md`.
- Updated `specs/product/ui-domains.md`: changed the status section from "mid-reorganization" to "reorganization complete"; updated the explanatory text accordingly.
- Marked Task 11 as ✅ Done in `ui-domains-reshuffling.md`.
- All other doc files (`specs/tech/ui-domains.md`, `ui/README.md`, `workflow/local-development.md`, `workflow/deployment.md`, `workflow/BUILD.md`, `README.md`) were already up to date from previous tasks (Tasks 9 and 10 updated them).
- No stale "four domains" or `movement` domain-ID references found anywhere.
- Verified with `npm run lint --workspace=ui` (clean).
- The full ui-domains-reshuffling.md plan is now complete. All 11 tasks are marked done.

## 2026-05-04 — UI domains reshuffle task 10: deployment docs/scripts for final domain list

- Completed Task 10 from `ui-domains-reshuffling.md`.
- `deploy-ui.sh` already had all six domains; no script changes needed.
- Updated `workflow/deployment.md`: "four branded SPAs" → "six branded SPAs"; example updated to `tally`; supported domain list updated to `commonality, tally, content-funding, noninflammatory, csm, conceptspace`.
- Rewrote `specs/tech/ui-domains.md`: updated all "four" → "six" counts, replaced `movement` with `csm` and added `tally`/`conceptspace` throughout directory shape, build outputs, and docker-compose publisher list.
- Updated `specs/tech/README.md`: "four sites" → "six sites".
- Verified with `npm run lint --workspace=ui`.
- Note for next task: Task 11 is documentation/spec cleanup (check for any remaining stale "four domains" claims).

## 2026-05-04 — UI domains reshuffle task 9: local IPFS/docker publishing for all six domains

- Completed Task 9 from `ui-domains-reshuffling.md`.
- Added `ui-ipfs-publisher-tally` and `ui-ipfs-publisher-conceptspace` services to `docker-compose.yml` (same pattern as the existing four).
- Updated the "four services" comment in docker-compose.yml to "six services".
- Updated `scripts/services.sh`: added `tally` and `conceptspace` to the domain loops in `print_spa_urls`, `wait_for_spa_gateway`, `wait_for_ui_ipfs_publish`, and `start_services` (both `compose_services` and `buildable_services` arrays and the `mkdir -p` pre-create block).
- Updated `scripts/docker-build-plan.mjs`: replaced stale `ui-ipfs-publisher-movement` alias with `ui-ipfs-publisher-csm`, and added `ui-ipfs-publisher-tally` and `ui-ipfs-publisher-conceptspace` aliases (all share the same `ui-ipfs-publisher-commonality` build config).
- Updated `workflow/BUILD.md`: "all four" → "all six" (two occurrences).
- Updated `workflow/local-development.md`: rewrote the one-liner to name all six domains.
- Updated `ui/README.md`: replaced the "being reshuffled incrementally" note with the final six-domain description.
- Verified with `bash -n scripts/services.sh`, `node scripts/docker-build-plan.mjs list ...` (new service names accepted), and `npm run lint --workspace=ui`.
- Note for next task: Task 10 is updating deployment docs/scripts for the final domain list.



## 2026-05-04 — UI domains reshuffle task 8: rework E2E test domain assumptions

- Completed Task 8 from `ui-domains-reshuffling.md`.
- `ui/playwright.config.ts` now launches three dev servers (tally:5173, commonality:5174, content-funding:5175) and three matching Playwright projects, each with `testMatch` routing tests to the domain that owns the routes they exercise.
- Added `/portal/:statementCid` and `/portal/:statementCid/leaderboard` routes to the tally manifest (and set `fundingportal: true`) so the subjectiv-flow test runs against tally.
- Updated `CrossDomainSmoke.test.tsx` to reflect tally's new `fundingportal: true` and extended tally route list.
- `delegation-flow.spec.ts`: replaced `goto('/start')` + tally assertion with `goto('/')` + direct primary-nav link click (runs under commonality).
- `pubstarter-flow.spec.ts`: replaced `goto('/start')` + tally assertion with `goto('/projects')` or `goto(\`/projects/...\`)` (runs under commonality).
- `content-funding-flow.spec.ts`: replaced `goto('/start')` + tally assertion with `goto('/content')` (runs under content-funding).
- `subjectiv-flow.spec.ts`: updated "My Trust Network" nav label to "Trust & Nudger Settings" to match tally's secondaryNavigation (runs under tally).
- `negative-paths.spec.ts`: split into two `describe` blocks — statement-route tests run under the tally project (default), project-route tests override `baseURL` to `http://localhost:5174` via `test.use({ baseURL })`.
- Verified with `npm run test:vitest --workspace=ui` (87 files / 1581 tests), `npm run lint --workspace=ui`, `npm run typecheck --workspace=ui`, and `VITE_DOMAIN=tally npm run build --workspace=ui`.
- Note for next task: Task 9 is updating local IPFS/docker publishing for the final six-domain list.

## 2026-05-04 — UI domains reshuffle task 7: strip downstream statement UX

- Completed Task 7 from `ui-domains-reshuffling.md`: Content Funding, Noninflammatory, and CSM no longer host local statement browsing/detail/profile routes.
- Removed `/statements`, `/statement/:statementCid`, `/profile`, and `/user/:address` from `ui/src/domains/content-funding/manifest.tsx`, `ui/src/domains/noninflammatory/manifest.tsx`, and `ui/src/domains/csm/manifest.tsx`.
- Replaced downstream statement/profile navigation and landing/about/organizing links with Tally cross-domain anchors via `getDomainUrl('tally', '/statements', { fallbackHref: '#' })`.
- Updated product copy so Content Funding is built on Commonality's funding infrastructure, Noninflammatory is built on Content Funding and links to Tally, and CSM uses Noninflammatory Content, Tally, and Commonality.
- Updated the domain smoke/route/landing/page tests and the shared not-found statement action to point statement browsing at Tally.
- Verified with targeted domain tests, full `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, `npm run typecheck --workspace=ui`, and builds for `VITE_DOMAIN=content-funding`, `VITE_DOMAIN=noninflammatory`, and `VITE_DOMAIN=csm`.
- Note for next task: Task 8 should move E2E statement/signing/profile assumptions to the `tally` domain and keep funding/content tests on their owning domains.

## 2026-05-04 — UI domains reshuffle task 6: reshape Commonality

- Completed Task 6 from `ui-domains-reshuffling.md`: Commonality is now framed as the internet-age coordination / better public-goods funding movement, not the full foundation site or statement-signing destination.
- Updated `ui/src/domains/commonality/LandingPage.tsx` to focus on movement thesis, projects/funding portals, and delegated funds; related product links point to Tally, Content Funding, and Conceptspace through `getDomainUrl(..., { fallbackHref: '#' })`.
- Trimmed `ui/src/domains/commonality/manifest.tsx` to docs, projects, funding portals, and notes routes only. Removed local `/start`, `/explore`, `/statements`, `/statement/:statementCid`, `/profile`, `/user/:address`, `/settings`, `/refs`, and `/content*` routes from Commonality.
- Updated Commonality navigation/footer/feature flags and the relevant domain smoke/route/landing tests.
- Verified with `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, and `VITE_DOMAIN=commonality npm run build --workspace=ui`.
- Note for next task: Task 7 should strip remaining statement UX from Content Funding, Noninflammatory, and CSM, replacing their local statement/profile links with cross-domain Tally links.

## 2026-05-04 — UI domains reshuffle task 5: cross-domain links

- Completed Task 5 from `ui-domains-reshuffling.md`: introduced internal/external link target support for domain navigation and landing-page actions/cards.
- Added shared link target helpers in `ui/src/shared/linkTypes.ts` and domain URL helpers in `ui/src/domains/domainUrls.ts`.
- Added runtime/build-time config keys for `VITE_COMMONALITY_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, and `VITE_CONCEPTSPACE_URL`; documented them in `ui/README.md`.
- Updated `AppShell` and `DomainLandingPage` to render external links as normal anchors while preserving React Router links for internal paths. Landing page action/card props now use `path` for internal links instead of `to`.
- Updated Conceptspace's "Open Tally" CTA to use the new Tally URL helper with `#` fallback.
- Verified with `npm run test:vitest --workspace=ui`, targeted link tests, `npm run lint --workspace=ui`, and `VITE_DOMAIN=tally npm run build --workspace=ui`.
- Note for next task: Task 6 should use the new link support when replacing Commonality's statement/content-funding links with Tally/Content Funding cross-domain anchors.

## 2026-05-04 — UI domains reshuffle task 3: add Conceptspace

- Completed Task 3 from `ui-domains-reshuffling.md`: added a thin `conceptspace` domain as the infrastructure-facing surface.
- Added `ui/src/domains/conceptspace/` with a root-only landing page explaining statements, implication graph, signing/trust primitives, attesters, and nudgers; the Tally CTA uses `VITE_TALLY_URL` when configured and a placeholder otherwise.
- Wired `conceptspace` into domain IDs/manifests, Vite domain resolution, all-domain build script, local IPFS publish domain resolver, and deploy domain allowlist.
- Updated domain smoke/route tests for Conceptspace's root-only route ownership and added AppShell support for domains with no secondary navigation.
- Updated `ui/README.md` build-output list to include `csm` and `conceptspace`.
- Verified with `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, and `VITE_DOMAIN=conceptspace npm run build --workspace=ui`.
- Note for next task: Task 4 is the docs-domain strategy decision; do not broadly rewire docs until the product decision is made.

## 2026-05-04 — UI domains reshuffle task 2: rename movement → csm

- Completed Task 2 from `ui-domains-reshuffling.md`: renamed domain ID `movement` → `csm` throughout.
- Created `ui/src/domains/csm/` with renamed exports (`CsmLandingPage`, `Csm*Pages`, `csmManifest`), deleted `ui/src/domains/movement/`.
- Updated `DomainId` type, `domainManifests`, `getDomainIdFromEnv()`, `vite.config.ts`, `build-domains.mjs`, `deploy-ui.sh`, `publish-ui-to-ipfs.mjs`, `services.sh`, and `docker-compose.yml`.
- Updated `CrossDomainSmoke.test.tsx` and `domainRoutes.test.tsx` to use `csm`.
- Verified with `npm run test:vitest --workspace=ui` (86 files / 1587 tests all pass), `npm run lint --workspace=ui`, and `VITE_DOMAIN=csm npm run build --workspace=ui`.
- Product copy about "organizing a movement" kept unchanged; only the domain ID/manifest identifier changed.
- Note for next task: Task 3 is to add a thin `conceptspace` domain.

## 2026-05-04 — UI domains reshuffle task 1: add Tally

- Completed Task 1 from `ui-domains-reshuffling.md`: added the additive `tally` domain without removing existing Commonality statement routes.
- Added `ui/src/domains/tally/` with a Tally landing page and routes to the existing conceptspace statement/signing/profile/settings pages.
- Wired `tally` into domain IDs/manifests, Vite domain resolution, domain build script, local IPFS publish domain resolver, and deploy domain allowlist.
- Updated cross-domain smoke/route tests and light README copy for the new five-domain interim state.
- Verified with `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, and `VITE_DOMAIN=tally npm run build --workspace=ui`.
- Note for next task: local Docker/IPFS publisher services still list the older four domains; that is intentionally deferred to the later local-IPFS task in `ui-domains-reshuffling.md`.

## 2026-05-01 — data seeding existing-indexer guard

- Changed `scripts/data.sh --seed` to fail when the Ponder indexer already has events, unless `--allow-seed-on-existing-data` is passed.
- Documented the override in `workflow/local-development.md` and `workflow/BUILD.md`.
- Verified with `bash -n scripts/data.sh`.

## 2026-05-01 — before-testnet review fixes 1-3

- Removed developer-facing statement metadata, unknown fields, and successful-render CID footers from `ui/src/conceptspace/components/StatementRenderer.tsx`; error/not-found states still show the CID for troubleshooting.
- Updated Browse Statements to suppress excerpts that normalize to the same text as the statement title, avoiding duplicate statement text on cards.
- Added local-dev stale-Ponder guardrails: `scripts/services.sh --start` clears Ponder data when no saved local chain state exists, `scripts/data.sh --seed` warns if the indexer already contains events, and `workflow/local-development.md` documents the clean reset flow.
- Verified with targeted Vitest (`StatementRenderer`, `BrowseStatementsPage`), shell syntax checks for scripts, and `npm run build --workspace=ui`.
