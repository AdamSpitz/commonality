# UI Domains Reshuffling Plan

This plan is for implementing the transition described in [`specs/product/ui-domains.md`](specs/product/ui-domains.md). The current codebase has four UI domains; the target shape splits statement-signing into Tally, makes Commonality a movement + funding-tools site, keeps CSM as its own movement site, and may add thin Conceptspace/docs surfaces.

The goal of this file is to make the work doable incrementally by fresh LLMs. Each section below should be small enough to hand to a new agent as one task. Do not try to do the whole reshuffle at once.

## Current implementation snapshot

Current UI domain architecture already exists and is mostly manifest-driven:

- Domain manifests live under `ui/src/domains/*/manifest.tsx`.
- Domain IDs are wired through:
  - `ui/src/domains/types.ts`
  - `ui/src/domains/index.ts`
  - `ui/vite.config.ts`
  - `ui/scripts/build-domains.mjs`
  - `scripts/publish-ui-to-ipfs.mjs`
  - `scripts/deploy-ui.sh`
  - `scripts/services.sh`
  - `docker-compose.yml`
- Current domains:
  - `commonality`
  - `content-funding`
  - `noninflammatory`
  - `movement` — this is actually Common Sense Majority.

The existing code is already close to the right architecture: a shared React/Vite codebase with feature modules and per-domain route manifests. This reshuffle is mostly route/copy/build-script/test work, not a smart-contract/SDK/indexer change.

## Target product shape

From [`specs/product/ui-domains.md`](specs/product/ui-domains.md):

- **Commonality**: movement site for internet-age coordination / better public-goods funding, plus funding infrastructure.
- **Tally**: consumer statement-signing / polling site.
- **Content Funding**: content-funding contracts, general criteria.
- **Noninflammatory Content**: content funding focused on noninflammatory political content.
- **Common Sense Majority**: quiet-middle / hidden-majority movement site.
- **Conceptspace**: mostly developer-facing infrastructure layer for statements, implication graph, signing primitives, trust, attesters, nudgers, identity/account/delegations.
- **Docs site?** The product spec says “six surfaces in total: four product sites, one infrastructure site, and one docs site,” but then numbers six items without docs. Before implementing a separate docs domain, confirm whether docs is an additional seventh build artifact or folded into Commonality/Conceptspace.

## Recommended ordering

Do these in order. Earlier tasks create the structure; later tasks remove old behavior and tighten tests.

---

## Task 1: Add the `tally` domain without removing anything yet ✅ Done 2026-05-04

Purpose: introduce the new consumer statement-signing site while keeping existing domains working.

Implementation shape:

1. Add `ui/src/domains/tally/manifest.tsx`.
2. Add `ui/src/domains/tally/LandingPage.tsx`.
3. Reuse the existing `ui/src/conceptspace/*` pages for Tally routes:
   - `/`
   - `/start`
   - `/explore`
   - `/statements`
   - `/statement/:statementCid`
   - `/profile`
   - `/user/:address`
   - `/settings` if trust/nudger settings are still user-facing here.
4. Add `tally` to:
   - `DomainId` in `ui/src/domains/types.ts`
   - `domainManifests` and env resolution in `ui/src/domains/index.ts`
   - `resolveDomain()` in `ui/vite.config.ts`
   - `domains` in `ui/scripts/build-domains.mjs`
   - `resolveDomain()` in `scripts/publish-ui-to-ipfs.mjs`
   - allowed domains in `scripts/deploy-ui.sh`
5. Add/update unit tests for domain manifest resolution and cross-domain smoke coverage.

Keep this task additive. Do not remove statement routes from Commonality yet.

Validation:

- `npm run test:vitest --workspace=ui`
- `VITE_DOMAIN=tally npm run build --workspace=ui`

---

## Task 2: Rename/reframe the current `movement` domain as Common Sense Majority ✅ Done 2026-05-04

Purpose: remove ambiguity. The current `movement` domain already represents CSM, but the new spec says Commonality is also a movement site.

Decision needed before implementation:

- Preferred domain ID: `csm` or `common-sense-majority`.
- If unsure, use `csm` for brevity in scripts/artifacts.

Implementation shape:

1. Rename `ui/src/domains/movement/` to `ui/src/domains/csm/` or equivalent.
2. Rename manifest exports from `movementManifest` to `csmManifest`.
3. Replace build/deploy/local script domain ID `movement` with the new ID.
4. Update copy only where it says “movement” as a domain identity; keep product copy about organizing a movement where appropriate.
5. Update tests:
   - `ui/src/domains/CrossDomainSmoke.test.tsx`
   - `ui/src/domains/domainRoutes.test.tsx`
   - `ui/src/domains/movement/*` tests after rename.
6. Update docs mentioning local IPFS domains and supported deployment domains.

Validation:

- `npm run test:vitest --workspace=ui`
- `VITE_DOMAIN=<new-csm-id> npm run build --workspace=ui`

---

## Task 3: Add a thin `conceptspace` domain ✅ Done 2026-05-04

Purpose: represent Conceptspace as the infrastructure layer, not the consumer statement destination.

Implementation shape:

1. Add `ui/src/domains/conceptspace/manifest.tsx`.
2. Add `ui/src/domains/conceptspace/LandingPage.tsx`.
3. Keep this site thin and developer/infrastructure-facing:
   - what Conceptspace is
   - statement/implication/signing/trust primitives
   - attester/nudger graph overview
   - links to API docs or technical docs if available
   - prominent link to Tally for actual user-facing statement signing
4. Consider whether to expose any existing conceptspace routes locally. Recommended initial version:
   - `/` landing page only, plus maybe `/docs` if docs are included here later.
   - Do not make this the main consumer statement browser.
5. Wire the domain through the same files as Task 1.

Validation:

- `npm run test:vitest --workspace=ui`
- `VITE_DOMAIN=conceptspace npm run build --workspace=ui`

---

## Task 4: Decide and implement docs-domain strategy ✅ Done 2026-05-04

Decision: **Option B** — docs stay inside Commonality and Conceptspace. No separate docs domain.

- Vision/strategy narrative and `pitches.md` → Commonality.
- API docs, schema, developer reference → Conceptspace.

The product spec's enumeration already lists exactly six surfaces without a separate docs artifact. A separate domain would add build/deploy complexity for content that has a natural home. The phrase “one docs site” in the spec referred to Conceptspace's developer-facing role, not a seventh artifact.

Action taken: clarified `specs/product/ui-domains.md` to remove the ambiguous phrasing.

---

## Task 5: Introduce cross-domain link support ✅ Done 2026-05-04

Purpose: downstream sites need to link to Tally/Commonality/Content Funding rather than embedding each other’s routes.

Current issue:

- `DomainLandingPage` and app navigation assume internal React Router links.
- Once domains are separate deployments, links like “Statements” from Noninflammatory should go to Tally, not to a local `/statements` route.

Implementation shape:

1. Extend navigation/action types to support external links, e.g.:
   - internal: `{ label, path }`
   - external: `{ label, href }`
2. Update `AppShell` and `DomainLandingPage` to render external links with normal anchors.
3. Add runtime/env URL helpers for known domains, probably via Vite/runtime config:
   - `VITE_COMMONALITY_URL`
   - `VITE_TALLY_URL`
   - `VITE_CONTENT_FUNDING_URL`
   - `VITE_NONINFLAMMATORY_URL`
   - `VITE_CSM_URL`
   - `VITE_CONCEPTSPACE_URL`
   - maybe `VITE_DOCS_URL`
4. For local development, default missing URLs to internal paths or `#` links so builds do not break.
5. Think carefully about local IPFS: `scripts/services.sh --url` currently prints per-domain CIDs after publishing. Fully automatic cross-linking between freshly generated CIDs may require a second publishing pass or accepting configured/static links. Keep the first implementation simple.

Validation:

- Unit tests for internal and external nav/action rendering.
- Existing domain landing tests updated to check correct external/internal behavior.

---

## Task 6: Reshape Commonality routes and copy ✅ Done 2026-05-04

Purpose: Commonality becomes movement + funding tools, not the full foundation site or statement-signing destination.

Action taken: Commonality landing and shell copy now frame it as the internet-age coordination / public-goods funding movement. Commonality routes now expose docs, projects, funding portals, and delegated funds only; consumer statement/profile/settings/refs routes and local content-funding routes were removed. Landing CTAs link to Tally, Content Funding, and Conceptspace via the cross-domain URL helper with `#` local fallbacks. Domain feature flags and smoke/route tests now reflect the funding-focused shape.

Implementation shape:

1. Update Commonality landing page copy:
   - movement for internet-age coordination / better public-goods funding
   - public-goods funding infrastructure as the concrete instrument
   - no ecosystem-wide “foundation” framing
2. Keep Commonality routes focused on funding infrastructure:
   - `/projects`
   - `/projects/new`
   - `/projects/:projectAddress`
   - `/portal/:statementCid`
   - `/portal/:statementCid/leaderboard`
   - `/notes`, `/notes/new`, `/notes/:noteId` if funding delegation belongs here
   - docs/vision narrative depending on Task 4 decision
3. Remove or redirect/de-emphasize consumer statement routes:
   - `/start`
   - `/explore`
   - `/statements`
   - `/statement/:statementCid`
   - `/profile`
   - `/settings`
   - `/refs`
4. Replace statement links with cross-domain links to Tally.
5. Remove content-funding routes from Commonality unless there is a specific “funding infra umbrella” reason to keep them. Prefer linking to Content Funding.
6. Update `commonalityManifest.features` to match the new shape. Note: feature flags currently appear to be test-only, so this is mostly documentation/test clarity.

Validation:

- `npm run test:vitest --workspace=ui`
- `VITE_DOMAIN=commonality npm run build --workspace=ui`

E2E impact:

- Existing E2E tests currently assume default Commonality has `/start` and `/statements`. After this task, many E2E tests must either run with `VITE_DOMAIN=tally` or be updated to navigate to the correct domain.

---

## Task 7: Strip statement UX from Content Funding / Noninflammatory / CSM ✅ Done 2026-05-04

Purpose: these sites should not host the full statement-signing UI. They should link to Tally when users need statement exploration/signing.

Action taken: Content Funding, Noninflammatory, and CSM no longer expose local `/statements`, `/statement/:statementCid`, `/profile`, or `/user/:address` routes. Their navigation and landing/about/organizing links now point to Tally via the cross-domain URL helper with `#` fallback. Copy now describes Content Funding as built on Commonality's funding infrastructure, Noninflammatory as built on Content Funding with Tally for statement signing, and CSM as using Noninflammatory Content, Tally, and Commonality. Route/landing/domain smoke tests were updated.

Implementation shape:

1. Content Funding:
   - Remove local `/statements`, `/statement/:cid`, `/profile`, `/user/:address` routes unless strictly needed.
   - Replace “Statements” nav/action links with external Tally links.
   - Copy: “built on Commonality’s funding infrastructure” and/or “uses Conceptspace statement primitives,” not “built on Commonality” generically.
2. Noninflammatory:
   - Remove local statement/profile routes.
   - Link to Tally for statement exploration/signing.
   - Copy: built on Content Funding; related to CSM; links to Tally.
3. CSM:
   - Remove local statement/profile routes if possible.
   - Link to Tally for movement-aligned statement signing.
   - Copy: uses Noninflammatory Content, Tally, and Commonality.
4. Update landing/page tests that currently expect local `/statements` links.
5. Update route smoke tests that currently assert all domains expose statement routes.

Validation:

- `npm run test:vitest --workspace=ui`
- Build each affected domain.

---

## Task 8: Rework E2E test domain assumptions ✅ Done 2026-05-04

Purpose: tests should use the domain that owns the feature.

Current issue:

- Playwright dev server defaults to `VITE_DOMAIN=commonality`.
- Many tests navigate to `/start`, `/statements`, `/statement/:cid` and expect conceptspace UI.
- After reshuffling, that should be Tally.

Implementation shape:

1. Decide whether to split Playwright projects by domain or run separate commands with `VITE_DOMAIN` set.
2. Suggested ownership:
   - statement creation/browsing/belief/profile/settings tests → `tally`
   - pubstarter/delegation/funding portal tests → `commonality`
   - content funding tests → `content-funding`
   - noninflammatory-specific tests if any → `noninflammatory`
   - CSM-specific tests if any → `csm`
3. Update `ui/playwright.config.ts` or add helper scripts to launch Vite with the desired `VITE_DOMAIN`.
4. Keep blockchain/indexer setup shared but avoid interleaving conflicting tests across domains.

Validation:

- Run at least the relevant Playwright subset for each changed domain.

---

## Task 9: Update local IPFS/docker publishing for the final domain list ✅ Done 2026-05-04

Purpose: local dev should publish and print all active domain URLs.

Implementation shape:

1. Update `docker-compose.yml` publisher services for the final domain list.
2. Update `scripts/services.sh` loops and artifact directories.
3. Update `scripts/docker-build-plan.mjs` aliases.
4. Ensure `./scripts/services.sh --url` prints all expected domains.
5. Update local docs:
   - `workflow/local-development.md`
   - `workflow/BUILD.md`
   - `ui/README.md`

Validation:

- `./scripts/services.sh --start`
- `./scripts/services.sh --url`
- Verify each printed gateway URL loads.

This task can be postponed until after normal Vite builds work for all domains.

---

## Task 10: Update deployment docs/scripts for the final domain list

Purpose: testnet/mainnet deployment should know about all domains.

Implementation shape:

1. Update `scripts/deploy-ui.sh` supported domain list.
2. Update `workflow/deployment.md` examples and supported domains.
3. Consider whether each domain gets a separate ENS/IPFS name.
4. If cross-domain URLs are configured by env, document how to set them for deployed environments.

Validation:

- Dry-run or build-only each domain.
- Actual Pinata deployment can be done later when credentials are available.

---

## Task 11: Documentation/spec cleanup

Purpose: make the repository describe the new shape accurately.

Files likely needing updates:

- `specs/tech/ui-domains.md`
- `ui/README.md`
- `workflow/local-development.md`
- `workflow/deployment.md`
- `workflow/BUILD.md`
- maybe `README.md` artifact list if it mentions “four branded surfaces”

Content to update:

- domain list
- route ownership
- build outputs under `ui/dist/<domain>/`
- local IPFS publisher services
- `VITE_DOMAIN` supported values
- whether docs is separate or folded into another site

Validation:

- Docs links resolve.
- No stale “four domains” claims remain, unless explicitly historical.

---

## What this does not require

This reshuffle should not require changes to:

- smart contracts
- SDK core folding logic
- indexer schema/business logic
- attester/finder/nudger services
- content-funding contract mechanics

The main exception is if product decisions around Conceptspace identity/delegations imply new account/delegation features. Do not infer that from this reshuffle alone.

## Main risks

1. **Broken links between domains.** Mitigate by adding explicit cross-domain link support before removing routes.
2. **E2E tests assuming Commonality owns everything.** Mitigate by moving tests to domain-specific runs.
3. **Local IPFS cross-links.** Separate CIDs make automatic cross-linking awkward. Start with configured/static links or simple placeholders; improve later.
4. **Docs-domain ambiguity.** Resolve before doing major docs routing work.
5. **Over-removing routes too early.** Add Tally first, then move links, then remove old routes.

## Scope estimate

This is a medium reshuffle, not a huge rewrite.

- Existing domain-manifest architecture makes adding/rebranding domains straightforward.
- Most work is copy, route manifests, build/deploy script domain lists, and tests.
- Core platform logic should remain unchanged.
