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

```
ui/src/
├── shared/                    # Shared SDK, components, hooks, routing, branding helpers
├── conceptspace/              # Statement-signing feature module (used by Tally)
├── lazyGiving/                # Project/funding feature module (used by LazyGiving and funding verticals)
├── delegation/                # Delegation feature module (used by LazyGiving and funding verticals)
├── fundingportal/             # Aligning/cause-board feature module (used by Aligning, Tally, and verticals)
├── content-funding/           # Shared content-funding base
├── domains/                   # Per-domain manifests, landing pages, route composition
│   ├── commonality/
│   ├── lazyGiving/
│   ├── alignment/
│   ├── tally/
│   ├── content-funding/
│   ├── civility/
│   ├── common-sense-majority/
│   └── conceptspace/
└── main.tsx                   # Selects the active domain build via VITE_DOMAIN
```

Each domain folder under `domains/` contains its manifest (branding, shell/nav config, included feature modules, route table) and landing page. The feature modules under `src/conceptspace`, `src/lazyGiving`, etc. are shared; the domain manifests compose them.

Naming note: **Aligning** is the product/site name. `alignment` is the historical code identifier for its domain manifest/build output, and `fundingportal` is the shared feature module that implements cause boards and project/cause attestations.


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
| LazyGiving: `/projects`, `/projects/:projectAddress`, `/projects/new`; generic assurance-contract browse/detail/backing/refund/withdraw/create flows | [LazyGiving UI spec](subsystems/lazyGiving/ui.md); implementation under [`ui/src/lazyGiving/`](../../ui/src/lazyGiving/) |
| Aligning: `/portal/:statementCid`; cause boards, project/cause attestations, delegation/cause funding visibility | [Aligning UI spec](subsystems/aligning/ui.md); [How Alignment works](../../docs/end-user/alignment/how-alignment-works.md); implementation under [`ui/src/fundingportal/`](../../ui/src/fundingportal/) |
| Aligning `/explore`: Fundable Project Explorer; curated statement map; newcomer cause discovery | [Conceptspace Explorer](subsystems/conceptspace/explorer.md); [new-user experience](../product/new-user-experience.md); implementation reference [`ui/src/fundingportal/pages/ExplorerPage.tsx`](../../ui/src/fundingportal/pages/ExplorerPage.tsx) |
| Content Funding: `/content/:platform`, `/content/:platform/:channelId`, `/content/:platform/:channelId/new`, `/content/dashboard`; channel browsing/claiming/creator contracts | [Content Funding UI spec](subsystems/content-funding/ui.md); [Get your content funded](../../docs/end-user/content-funding/get-your-content-funded.md); implementation under [`ui/src/content-funding/`](../../ui/src/content-funding/) |
| Content-funding contracts as LazyGiving projects; supporter/backing handoff | [Content Funding UI: LazyGiving integration](subsystems/content-funding/ui.md#integration-with-lazygiving-project-detail-page); [LazyGiving Project Detail](subsystems/lazyGiving/ui.md#project-detail-page) |
| Wallet-connection expectations for creator/content flows | [Content Funding claim flow](subsystems/content-funding/ui.md#claim-flow); [channel-claiming rationale](subsystems/content-funding/channel-claiming.md#dont-gate-on-wallet-creation); [Get your content funded: if someone already funded your work](../../docs/end-user/content-funding/get-your-content-funded.md#if-someone-already-funded-your-work) |
