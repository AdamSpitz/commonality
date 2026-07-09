# Multi-Domain UI Architecture

The eight UI domains (Commonality, LazyGiving, Aligning, Tally, Content Funding, Civility, Common Sense Majority, Conceptspace) are built from a single codebase but deployed as separate artifacts. For the product-level description of what each site is and why they exist, see [specs/product/ui-domains.md](../product/ui-domains.md).


## Shared codebase, separate builds

All eight sites share:
- SDK code and blockchain interactions
- UI component library and design primitives
- Authentication and wallet infrastructure
- Attestation display components

Each site is a separate build artifact that includes only the routes and features relevant to it. A `VITE_DOMAIN` environment variable selects which domain is built; it defaults to `commonality`.


## Directory shape

This tree shows the important architectural folders, not every helper directory under `ui/src/`; the live source tree is authoritative for incidental folders such as shared domain components or retired compatibility shims.

```
ui/src/
├── shared/                    # Shared SDK, components, hooks, routing, branding helpers
├── conceptspace/              # Statement-signing feature module (used by Tally)
├── lazy-giving/               # Project/funding feature module (used by LazyGiving and funding verticals)
├── delegation/                # Delegation feature module (used by LazyGiving and funding verticals)
├── fundingportals/            # Aligning/cause-board feature module (used by Aligning, Tally, and verticals)
├── content-funding/           # Shared content-funding base
├── mutable-refs/              # Mutable-ref feature module
├── domains/                   # Per-domain manifests, landing pages, route composition
│   ├── commonality/
│   ├── lazy-giving/
│   ├── alignment/
│   ├── tally/
│   ├── content-funding/
│   ├── civility/
│   ├── common-sense-majority/
│   ├── conceptspace/
│   ├── components/            # Shared per-domain landing/shell components
│   └── delegation/            # Legacy compatibility folder; Delegation is not a standalone build
└── main.tsx                   # Selects the active domain build via VITE_DOMAIN
```

Each domain folder under `domains/` contains its manifest (branding, shell/nav config, included feature modules, route table) and landing page. The feature modules under `src/conceptspace`, `src/lazy-giving`, `src/fundingportals`, etc. are shared; the domain manifests compose them.

Naming note: **Aligning** is the product/site name. `alignment` is the historical code identifier for its domain manifest/build output, and `fundingportals` is the shared feature module that implements cause boards and project/cause attestations. **LazyGiving** keeps the legacy `lazyGiving` manifest id / `VITE_DOMAIN` value / build output name, but its source directory is `ui/src/domains/lazy-giving/`.


## Build outputs

```
dist/
├── commonality/
├── lazyGiving/
├── alignment/
├── tally/
├── content-funding/
├── civility/
├── common-sense-majority/
└── conceptspace/
```

Useful build commands (from the `ui/` directory):

```
npm run build              # builds the active domain (VITE_DOMAIN, defaults to commonality)
npm run build:domains      # builds all eight domains in one pass
npm run build:ipfs         # builds active domain in hash-routing mode for IPFS deployment
npm run build:ipfs:domains # builds all eight domains in IPFS mode
```


## Deployment (local docker-compose)

The docker-compose stack includes eight one-shot publisher services, one per domain, that run in parallel:

- `ui-ipfs-publisher-commonality`
- `ui-ipfs-publisher-lazyGiving`
- `ui-ipfs-publisher-alignment`
- `ui-ipfs-publisher-tally`
- `ui-ipfs-publisher-content-funding`
- `ui-ipfs-publisher-civility`
- `ui-ipfs-publisher-common-sense-majority`
- `ui-ipfs-publisher-conceptspace`

Each service builds its domain in IPFS/hash-routing mode, pins the resulting directory to the local IPFS node, and writes its CID, raw gateway URL, and stable local URL to `./data/ui-ipfs/<domain>/`. The `ui-local-gateway` service maps stable local hostnames like `http://commonality.localhost:8088/#/` to the latest local IPFS CIDs, which lets cross-domain links use repeatable URLs instead of per-build CID URLs. Running `./scripts/services.sh --url` prints the stable URLs for all eight domains.


## Route/workflow ownership

| Area | Canonical source(s) |
|---|---|
| LazyGiving: `/projects`, `/projects/:projectAddress`, `/projects/new`; generic assurance-contract browse/detail/backing/refund/withdraw/create flows | [LazyGiving UI spec](subsystems/lazyGiving/ui.md); implementation under [`ui/src/lazy-giving/`](../../ui/src/lazy-giving/) |
| Aligning: `/portal/:statementCid`; cause boards, project/cause attestations, delegation/cause funding visibility | [Aligning UI spec](subsystems/aligning/ui.md); [How Alignment works](../../docs/end-user/alignment/how-alignment-works.md); implementation under [`ui/src/fundingportals/`](../../ui/src/fundingportals/) |
| Aligning `/explore`: Fundable Project Explorer; curated statement map; newcomer cause discovery | [Conceptspace Explorer](subsystems/conceptspace/explorer.md); [new-user experience](../product/new-user-experience.md); implementation reference [`ui/src/fundingportals/pages/ExplorerPage.tsx`](../../ui/src/fundingportals/pages/ExplorerPage.tsx) |
| Content Funding: `/content/:platform`, `/content/:platform/:channelId`, `/content/:platform/:channelId/new`, `/content/dashboard`; channel browsing/claiming/creator contracts | [Content Funding UI spec](subsystems/content-funding/ui.md); [Get your content funded](../../docs/end-user/content-funding/get-your-content-funded.md); implementation under [`ui/src/content-funding/`](../../ui/src/content-funding/) |
| Content-funding contracts as LazyGiving projects; supporter/backing handoff | [Content Funding UI: LazyGiving integration](subsystems/content-funding/ui.md#integration-with-lazygiving-project-detail-page); [LazyGiving Project Detail](subsystems/lazyGiving/ui.md#project-detail-page) |
| Wallet-connection expectations for creator/content flows | [Content Funding claim flow](subsystems/content-funding/ui.md#claim-flow); [channel-claiming rationale](subsystems/content-funding/channel-claiming.md#dont-gate-on-wallet-creation); [Get your content funded: if someone already funded your work](../../docs/end-user/content-funding/get-your-content-funded.md#if-someone-already-funded-your-work) |


## Future direction: per-vertical repo split (decided 2026-06-22)

The intended end state is for each vertical — and each core sub-project (Tally, LazyGiving, etc.) — to live in its **own repo**, consuming the substrate as published packages. This is deliberately **not** a config-only or auto-discovered-registry approach: the central `domainManifests` / `DomainId` / `build:domains` / docker-compose-publisher bookkeeping *goes away* when things are split, rather than being automated.

**What's already fine:** the UI dependency *layering* is clean — shared imports nothing from features/domains, the feature DAG is nearly flat (only `fundingportals` → `delegation`), and verticals are thin consumers.

**The real gap is the *packaging boundary*.** Today the whole UI is one npm package, modules are bounded by folders rather than declared APIs, and consumers reach into deep paths (e.g. `content-funding/pages/X`). The single lever that unlocks every split: give each module a **public-API barrel** with an explicit export surface. The pattern was spiked on `delegation` ([`ui/src/delegation/index.ts`](../../ui/src/delegation/index.ts)).

**Sequencing:** do this in-monorepo first; only publish/extract once the substrate API stabilizes (the trigger is API stability, not a date). Split order: **Civility first** (thinnest and the exemplar), **CSM later** (it composes other verticals). See also the founder-level [role and strategy note](../../workflow/roles/founder.md#adams-role-and-strategy-platform-for-founders-not-direct-end-user-adoption).
