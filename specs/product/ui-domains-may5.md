# May 5 UI-domain reshuffling plan

This is the historical plan for the May 5 reshuffle. The steady-state result should be summarized in [ui-domains.md](./ui-domains.md), so future readers do not need this file unless they care about why the shape changed.

## Why reshuffle again?

The May 4 shape made **Commonality** carry too much weight: movement manifesto, public-goods funding product, cause-board/delegation product, and ecosystem directory. The founder-level docs and user-facing docs point in a different direction:

- The broad Commonality thesis is real, but it is a **movement / substrate** pitch: better public-goods funding, late aggregation, credible threats, openness, delegation, retroactive funding.
- Ordinary users enter through **concrete jobs**: sign a statement, fund a project, pledge to a cause, become a delegate, get content funded, help connect projects to causes.
- The best user-facing stories are vertical or role-specific. Trying to make one homepage explain all of them makes the site feel like an org chart instead of a product.
- Cross-site disambiguation is useful, but it should not be the hero of every landing page.

So the reshuffle is mostly information architecture: split the funding tools out of Commonality, let each site do one job, and keep Commonality as the movement/founder-facing home.

## Target shape

Eight sites:

1. **Commonality** - movement site for internet-age public-goods funding, plus a secondary founder/organizer pitch.
2. **LazyGiving** - individual assurance contracts: create, browse, pledge, refund, and retroactively fund projects.
3. **Aligning** - ongoing cause-based funding: portals, delegation, delegate/scout workflows, and alignment attestations.
4. **Tally** - user-facing statement signing / polling with direct and implication-derived support counts.
5. **Content Funding** - generic content-funding contracts for arbitrary content criteria.
6. **Civility** — focused vertical for funding bridge-building political content.
7. **Common Sense Majority (CSM)** - movement site for hidden-majority / quiet-middle politics.
8. **Conceptspace** - mostly developer-facing infrastructure: statements, implication graph, trust/attester graph, identity primitives.

No ecosystem-wide product umbrella. The sites can link to one another, but each landing page should be intelligible and motivating on its own.

## Site responsibilities

### Commonality

**Job:** explain the movement: public-goods funding is badly broken, and the new substrate makes better coordination possible.

**Audience:** believers, organizers, founders, charities, community leaders, and people attracted to the civilizational/public-goods thesis.

**Contains:**
- Vision-and-strategy narrative.
- Founder / organizer page: "build a vertical on this substrate."
- Case studies showing LazyGiving, Aligning, Content Funding, Civility, CSM, and Tally as examples.
- Links out to LazyGiving and Aligning for actual funding-tool workflows.

**Does not contain:** project creation, project browsing, pledge flows, cause boards, or delegation UI.

### LazyGiving

**Job:** "Kickstarter for public goods," with refunds if the goal is not met and optional retroactive-funding mechanics.

**Audience:** project creators, one-off pledgers, retroactive funders, and early backers/scouts when the workflow is contract-shaped.

**Contains:**
- Create an assurance contract.
- Browse/search projects and contracts.
- Individual project/contract pages.
- Pledge and refund flows.
- Retroactive funding / buy-and-burn / donation-receipt-token flows.
- Project leaderboards and contribution history.

### Aligning

**Job:** ongoing cause-based funding, where donors can be lazy and route funds through trusted judgment.

**Audience:** recurring donors, delegates, scouts/curators, attesters, orgs, and cause operators.

**Contains:**
- Cause boards organized around statements/causes.
- Create/browse/contribute to portals.
- Delegatable-note creation and management.
- Delegate profiles, pools, track records, sub-delegation.
- Aligning-attestation flows: "this project/content serves this cause."
- Scout/curator activity views where useful.

**Open terminology issue:** "scout" can mean "early token buyer in retroactive funding" or "curator who spots aligned projects." Keep the UI copy precise enough not to blur those roles.

### Tally

Unchanged. Tally owns the user-facing statement-signing experience: write/find/sign statements, view direct and indirect supporter counts, and inspect implication/attester transparency. Other sites should link to Tally statement pages rather than reimplement branded statement pages unless there is a strong reason.

### Content Funding

Content contracts are specialized LazyGiving-style contracts, so Content Funding is now "built on LazyGiving," not "built on Commonality." It remains the generic content surface for creators and funders who want to reward arbitrary content qualities.

### Civility (renamed from Noninflammatory Content)

Unchanged conceptually. It is a focused vertical on top of Content Funding for content that communicates across divides without contempt. It should link lightly to Tally and CSM, but its own front door should stay focused on "fund bridge-building content."

### Common Sense Majority

Unchanged conceptually. CSM is the movement site for revealing hidden common-sense majorities. It uses:
- Civility for bridge-building content.
- Tally for movement-aligned signing.
- Aligning for ongoing movement/cause funding.
- LazyGiving for one-off movement projects.

### Conceptspace

Treat as infrastructure, not a consumer destination. It may have developer docs, schema/API pages, and maybe thin debugging/explorer views, but cold nontechnical users should normally arrive at Tally, LazyGiving, Aligning, or a vertical site instead.

## Migration map

| Old Commonality responsibility | New home |
|---|---|
| Movement thesis, founder docs, public-goods-funding manifesto | Commonality |
| "Start a vertical on this substrate" pitch | Commonality secondary page |
| Assurance contract creation/browsing/pledging | LazyGiving |
| Individual project pages | LazyGiving |
| Refund/progress/leaderboard views for individual contracts | LazyGiving |
| Retroactive funding mechanics | LazyGiving |
| Cause boards | Aligning |
| Delegatable notes | Aligning |
| Delegate profiles and delegation management | Aligning |
| Alignment attestations for projects/causes | Aligning |
| Statement signing / polling | Tally |
| Statement/graph infrastructure | Conceptspace |
| Content contracts | Content Funding, built on LazyGiving |

## User-doc routing

The existing user-level docs already imply the domain split. Surface each role from the site where the user can act:

| User doc / role | Primary site |
|---|---|
| Express what you care about | Tally |
| Fund something you care about | LazyGiving |
| Get your project funded | LazyGiving |
| Pledge funds to a cause | Aligning |
| Become a delegate | Aligning |
| Help connect things | Aligning |
| Get your content funded | Content Funding, with Civility as the focused political-content vertical |

Key-ideas pages can remain shared docs, but each site should introduce only the concepts needed for that site. Do not make every landing page teach the whole system.

## Walkthrough placement

Use stories where they fit instead of using one universal onboarding story:

- **Commonality:** defunding / credible-threat and local-funding-shift stories, because they support the broad movement thesis.
- **LazyGiving:** block-party and research/open-source/investigative-work examples as secondary examples of assurance contracts and retroactive funding.
- **Aligning:** donor-delegates-to-cause, delegate-track-record, and cause-board stories.
- **Tally / CSM:** common-sense-majority story.
- **Civility:** noninflammatory-content story.
- **Content Funding:** creator/channel/content-funded story.

The block-party and research walkthroughs are currently marked as not fully compelling; do not make them the primary Commonality hook until rewritten.

## Landing-page rules after the reshuffle

- Each bare domain gets one primary audience and one primary CTA.
- Hero sections should have at most two CTAs.
- Related-site grids belong in footers, secondary "how these sites fit together" pages, or the Commonality founder page - not above the fold.
- Lead with the user's concrete job, then introduce mechanisms only as needed.
- Avoid crypto jargon on consumer pages. Use "pledges refund if the goal is not met," "public receipts," "nobody controls the ledger," etc.
- Conceptspace should not be marketed to ordinary users as if it were another consumer app.

## Implementation sequence

Progress notes (2026-05-05 session):
- Read founder-level docs (`docs/end-user/commonality/vision-and-strategy/` plus `specs/README.md`) and user-level docs (`docs/end-user/shared/roles/`, `docs/end-user/shared/use-case-walkthroughs/`, `docs/end-user/shared/key-ideas/`).
- `ui-domains.md` reflected the eight-site shape at the time; it has since been updated to the nine-site shape with Delegation split out.
- Added `lazyGiving` and `alignment` UI domain manifests, landing pages, domain URL/runtime config keys, Vite/build-domain support, and Playwright project split.
- Moved Commonality away from owning product routes: it now has `/`, `/founders`, `/docs*`, and compatibility pages for old `/projects*`, `/notes*`, and `/portal*` routes. At the time LazyGiving owned `/projects*` and Aligning owned `/notes*` plus `/portal*`; `/notes*` later moved to Delegation.
- Rewrote Commonality landing as movement/thesis-first and added a founder/organizer page. Created LazyGiving and Aligning landings.
- Updated some downstream copy: Content Funding says "built on LazyGiving"; CSM "how pieces fit" mentions Aligning/LazyGiving; Civility hero says it is a focused vertical on Content Funding.
- Checks run: `npm run typecheck --workspace=ui` passed. Targeted Vitest passed after one test fix: `npm run test:vitest --workspace=ui -- src/domains/CrossDomainSmoke.test.tsx src/domains/domainRoutes.test.tsx src/domains/domainUrls.test.ts src/domains/commonality/LandingPage.test.tsx`.
- Natural handoff point: code type-checks and targeted domain tests pass, but the reshuffle is not complete. Next LLM should continue with the remaining checklist below, especially Docker/IPFS publisher services and docs/link audit.

Progress notes (continued, later 2026-05-05 session):
- Re-read founder-level docs and user-level docs before continuing.
- Added LazyGiving and Aligning local IPFS publisher services to `docker-compose.yml`, `scripts/services.sh`, `scripts/docker-build-plan.mjs`, and the UI publish-domain validator; updated local/build/UI docs from six to eight domains.
- Started docs/link audit: role docs now route users to Tally/LazyGiving/Aligning/Content Funding instead of generic Commonality entry points; fixed broken relative links in the defunding walkthrough and product docs discovered by a markdown-link checker.
- Checks run in this continuation: `docker compose config --services` saw the new publisher services; `node scripts/docker-build-plan.mjs list ui-ipfs-publisher-lazyGiving ui-ipfs-publisher-alignment` accepted the new services; `npm run typecheck --workspace=ui` passed; targeted domain Vitest passed (`CrossDomainSmoke`, `domainRoutes`, `domainUrls`, Commonality landing); `npm run build:domains --workspace=ui` passed with existing Rollup annotation/chunk-size warnings from dependencies.
- Good stopping point for a fresh LLM: Docker/IPFS wiring and docs/link audit have a coherent first pass, and checks above pass. Next session should avoid rereading everything broadly; start from this file, inspect the current diff/status, then do manual domain click-through and remaining copy/product review.

Progress notes (continued, current 2026-05-05 session):
- Re-read founder-level docs, user-level docs, `specs/README.md`, `ui-domains.md`, and this reshuffling plan before editing.
- Started final product/copy audit with focus on landing-page CTA discipline, stale dependency language, and manual domain click-through readiness.
- Tightened landing CTA discipline where the audit found hero sections above the two-CTA rule (Tally landing and CSM organizing page), and fixed stale Content Funding copy that still said it used Commonality for escrow/payout mechanics instead of LazyGiving-style content contracts.
- Updated stale landing-page tests and re-ran targeted domain Vitest; it passes: `npm run test:vitest --workspace=ui -- src/domains/CrossDomainSmoke.test.tsx src/domains/domainRoutes.test.tsx src/domains/domainUrls.test.ts src/domains/commonality/LandingPage.test.tsx src/domains/content-funding/LandingPage.test.tsx src/domains/noninflammatory/LandingPage.test.tsx src/domains/csm/LandingPage.test.tsx`.
- Ran a Playwright/Vite smoke click-through of all eight domain entry points (`commonality`, `lazyGiving`, `alignment`, `tally`, `content-funding`, `noninflammatory`, `csm`, `conceptspace`) by starting each domain locally, visiting `/`, checking the expected H1, checking links are present/nonblank, and watching for console/page errors; all eight passed. Temporary script was removed.
- Ran `npm run typecheck --workspace=ui`, `npm run build:domains --workspace=ui`, and `npm run build:ipfs:domains --workspace=ui`; all passed with the same existing Rollup pure-annotation/chunk-size warnings from dependencies.
- Ran a second static-artifact smoke click-through against the IPFS/hash-router domain builds by serving each `ui/dist/<domain>` directory locally and visiting `/#/`; all eight H1/link/console checks passed. Temporary script was removed.
- Re-ran a stale dependency-language search; only historical reshuffling docs now contain "built on Commonality" language, while active docs/UI no longer do.
- Natural stopping point: the May 5 reshuffle now appears complete against the checklist and acceptance criteria below. Remaining items are product naming/open-question followups, not blockers for the reshuffle.

1. **Update the product spec.** Keep [ui-domains.md](./ui-domains.md) as the clean steady-state summary. - Done before this session; later updated again to the nine-site Delegation split.
2. **Add LazyGiving and Aligning as first-class domains** in the UI domain registry/config. - Done; UI code, domain builds, local IPFS/Docker/deployment-doc wiring, typecheck, domain builds, IPFS builds, and local/static click-through checks pass.
3. **Move route ownership out of Commonality:** - Done in domain manifests/routes; compatibility pages added.
   - assurance-contract/project routes to LazyGiving;
   - portal/alignment routes to Aligning; delegation routes were later split to Delegation.
4. **Rewrite the Commonality landing page** as movement-first, with a secondary founder/organizer page and lightweight links to the product sites. - Done and product-reviewed; product links are below-fold examples/wayfinding, not the hero.
5. **Create LazyGiving and Aligning landing pages** that explain their specific jobs and link to the relevant role docs. - Done and product-reviewed.
6. **Update downstream copy:** - Done for active docs/UI; stale dependency-language search only finds historical reshuffling notes.
   - Content Funding: "built on LazyGiving."
   - CSM: funding via Aligning/LazyGiving, signing via Tally.
   - Civility: focused vertical on Content Funding, with light links to Tally/CSM.
7. **Demote ecosystem-directory UI** to footer/nav or a dedicated "how these sites fit together" page. - Done enough for the reshuffle: Commonality retains below-fold product-site examples and the founder page carries the fuller ecosystem map.
8. **Add redirects or compatibility links** for old Commonality funding/tool routes. - Compatibility pages added, not true redirects.
9. **Audit docs and links** for stale "built on Commonality" language and broken relative links. - Done for the reshuffle scope: role routing and known broken relative links were fixed earlier; current session fixed stale product copy and confirmed active docs/UI no longer use "built on Commonality" for specific dependencies.
10. **Run the normal UI checks** and manually click through the new domain entry points. - Done: UI typecheck, targeted domain Vitest, `build:domains`, `build:ipfs:domains`, local Vite entrypoint smoke, and static IPFS/hash-router artifact smoke all pass.

## Open questions

- **Name of LazyGiving.** Keep as working name for now. It is descriptive and sticky, but not obviously final.
- **Whether delegation deserves its own site later.** Resolved after this reshuffle: Delegation is now its own UI domain.
- **How much long-tail marketplace browsing to expose before there is real activity.** Avoid pretending LazyGiving/Aligning are bustling marketplaces if seed data is thin; make early-state pages honest.
- **Where the shared "how these sites fit together" explainer lives.** Likely Commonality or shared docs, linked from footers.

## Acceptance criteria

The reshuffle is done when:

- Commonality no longer feels like a product chooser for the entire ecosystem.
- A user who wants to create or fund one project lands on LazyGiving and it makes sense.
- A user who wants recurring cause-based giving lands on Aligning and it makes sense; a user who wants delegation lands on Delegation.
- A user who wants to sign or inspect statements lands on Tally and it makes sense.
- Content Funding, Civility, and CSM no longer describe themselves as vaguely "built on Commonality" when a more specific dependency is meant.
- Each landing page can be understood without reading the entire ecosystem map.
