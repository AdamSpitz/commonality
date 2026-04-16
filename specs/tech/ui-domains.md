# Multi-Domain UI Architecture

The four user-facing sites (Commonality, Content Funding, Noninflammatory Content, Common Sense Majority) are built from a single codebase but deployed as separate artifacts. For the product-level description of what each site is and why they exist, see [specs/product/ui-domains.md](../product/ui-domains.md).


## Shared codebase, separate builds

All four sites share:
- SDK code and blockchain interactions
- UI component library and design primitives
- Authentication and wallet infrastructure
- Attestation display components

Each site is a separate build artifact that includes only the routes and features relevant to it. A `VITE_DOMAIN` environment variable selects which domain is built; it defaults to `commonality`.


## Directory shape

```
ui/src/
├── shared/                    # Shared SDK, components, hooks, routing, branding helpers
├── conceptspace/              # Commonality feature module
├── pubstarter/                # Commonality feature module
├── delegation/                # Commonality feature module
├── fundingportal/             # Commonality feature module
├── content-funding/           # Shared content-funding base
├── domains/                   # Per-domain manifests, landing pages, route composition
│   ├── commonality/
│   ├── content-funding/
│   ├── noninflammatory/
│   └── movement/
└── main.tsx                   # Selects the active domain build via VITE_DOMAIN
```

Each domain folder under `domains/` contains its manifest (branding, shell/nav config, included feature modules, route table) and landing page. The feature modules under `src/conceptspace`, `src/pubstarter`, etc. are shared; the domain manifests compose them.


## Build outputs

```
dist/
├── commonality/
├── content-funding/
├── noninflammatory/
└── movement/
```

Useful build commands (from the `ui/` directory):

```
npm run build              # builds the active domain (VITE_DOMAIN, defaults to commonality)
npm run build:domains      # builds all four domains in one pass
npm run build:ipfs         # builds active domain in hash-routing mode for IPFS deployment
npm run build:ipfs:domains # builds all four domains in IPFS mode
```


## Deployment (local docker-compose)

The docker-compose stack includes four one-shot publisher services, one per domain, that run in parallel:

- `ui-ipfs-publisher-commonality`
- `ui-ipfs-publisher-content-funding`
- `ui-ipfs-publisher-noninflammatory`
- `ui-ipfs-publisher-movement`

Each service builds its domain in IPFS/hash-routing mode, pins the resulting directory to the local IPFS node, and writes its CID and gateway URL to `./data/ui-ipfs/<domain>/`. Running `./services.sh --url` prints the gateway URLs for all four domains.
