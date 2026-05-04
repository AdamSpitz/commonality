# Continuity notes for ephemeral AI instances

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
